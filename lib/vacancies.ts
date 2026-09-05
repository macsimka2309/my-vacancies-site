import { unstable_cache } from "next/cache";
import { findCityBySlug } from "./cities";
import { buildCityContext, type CityContextVacancy } from "./city-context";
import { buildCityPage, getIndexableCities, latestUpdatedAt } from "./city-page";
import { db } from "./db";
import type { IntentMatch, IntentStats } from "./intents";
import { getSalaryCeiling, type SalaryBasis, type StructuredSalary } from "./salary";

/** Тег для сброса кэша вакансий из админки. */
export const VACANCIES_CACHE_TAG = "vacancies";

export type { SalaryBasis } from "./salary";

export type VacancyFilters = {
  titles?: string[];
  projects?: string[];
  cities?: string[];
  salaryBasis?: SalaryBasis;
  salaryFrom?: number;
};

export type VacancyFilterOptions = {
  titles: string[];
  projects: string[];
  cities: string[];
  // Города с числом вакансий, по убыванию — для выбора города на главной.
  cityCounts: Array<{ city: string; count: number }>;
  // Верхняя граница «зарплата от» отдельно по каждому типу.
  salaryMax: Record<SalaryBasis, number>;
};

// Активных вакансий меньше двух сотен, а фильтры комбинируются десятками
// способов. Дешевле прочитать список один раз и фильтровать в памяти, чем
// ходить в базу на каждый заход с каждой комбинацией фильтров.
// createdAt намеренно не выбираем: он нужен только на детальной странице,
// а в кэше даты пришлось бы восстанавливать из строк.
// updatedAt, наоборот, выбираем: это единственный правдивый источник даты
// для «Обновлено» и `dateModified` на городских и интент-страницах (п. 38).
// После unstable_cache он приходит строкой — везде, где нужна дата,
// оборачиваем в `new Date(...)` заново (см. latestUpdatedAt в lib/city-page.ts).
const loadActiveVacancies = unstable_cache(
  async () =>
    db.vacancy.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        project: true,
        city: true,
        workFormat: true,
        salary: true,
        salaryHour: true,
        payTariff: true,
        salaryShiftMin: true,
        salaryShiftMax: true,
        salaryShiftAvg: true,
        salaryPeriodMin: true,
        salaryPeriodMax: true,
        salaryPeriod: true,
        schedule: true,
        address: true,
        updatedAt: true,
      },
    }),
  ["active-vacancies"],
  { tags: [VACANCIES_CACHE_TAG], revalidate: 300 },
);

export async function getActiveVacancies(filters: VacancyFilters = {}) {
  const all = await loadActiveVacancies();
  const vacancies = all.filter(
    (vacancy) =>
      (!filters.titles?.length || filters.titles.includes(vacancy.title)) &&
      (!filters.projects?.length ||
        filters.projects.includes(vacancy.project)) &&
      (!filters.cities?.length || filters.cities.includes(vacancy.city)),
  );

  if (!filters.salaryFrom || !filters.salaryBasis) {
    return vacancies;
  }

  const basis = filters.salaryBasis;
  const threshold = filters.salaryFrom;

  return vacancies.filter((vacancy) => {
    const amount = getSalaryCeiling(vacancy, basis);

    return amount !== null && amount >= threshold;
  });
}

export async function getVacancyFilterOptions(): Promise<VacancyFilterOptions> {
  // Тот же кэшированный список, что и в getActiveVacancies — второй запрос
  // в базу за теми же данными не нужен.
  const vacancies = await loadActiveVacancies();

  return {
    titles: uniqueSorted(vacancies.map((vacancy) => vacancy.title)),
    projects: uniqueSorted(vacancies.map((vacancy) => vacancy.project)),
    cities: uniqueSorted(vacancies.map((vacancy) => vacancy.city)),
    cityCounts: countByCity(vacancies.map((vacancy) => vacancy.city)),
    salaryMax: getSalaryMax(vacancies),
  };
}

// Города по числу вакансий (убывание), при равенстве — по алфавиту.
function countByCity(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const city = value?.trim();

    if (city) {
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.city.localeCompare(right.city, "ru"),
    );
}

const SALARY_ROUND: Record<SalaryBasis, number> = { shift: 500, period: 5000 };

export async function getVacancyBySlug(slug: string) {
  return db.vacancy.findFirst({
    where: {
      slug,
      isActive: true,
    },
  });
}

export async function getActiveVacancySlugs() {
  const vacancies = await loadActiveVacancies();

  return vacancies.map((vacancy) => vacancy.slug);
}

/**
 * Городской контекст для карточки вакансии (п. 35).
 *
 * Читает тот же кэшированный список, что и каталог, — отдельного запроса
 * в базу не делает. Иначе каждая карточка ходила бы в базу за соседями,
 * а мы только что научили её кэшироваться (п. 36).
 */
export async function getCityContext(current: CityContextVacancy) {
  const vacancies = await loadActiveVacancies();

  return buildCityContext(current, vacancies);
}

/**
 * Цифры для оффера на первом экране (п. 6).
 *
 * Считается по **уже отфильтрованному** списку, а не по всему каталогу.
 * Иначе на `?city=Тверь` заголовок обещал «работу сборщиком заказов»,
 * которой в Твери нет, а ставку называл общекаталожную — 1 000–11 000 ₽
 * вместо тверских. Оффер, который не сходится с тем, что под ним, хуже
 * отсутствующего.
 *
 * Диапазон берёт тот же `bounds`, что и лендинги интентов: если главная
 * скажет одно, а `/vahta` — другое по пересекающимся наборам, это
 * противоречие увидит и человек, и ассистент.
 */
export function summarizeVacancies(
  vacancies: Array<
    StructuredSalary & { title: string; project: string; city: string }
  >,
) {
  return {
    count: vacancies.length,
    cities: new Set(vacancies.map((vacancy) => vacancy.city)).size,
    professions: uniqueSorted(vacancies.map((vacancy) => vacancy.title)).map(
      (title) => ({ title }),
    ),
    projects: uniqueSorted(vacancies.map((vacancy) => vacancy.project)),
    ...bounds(
      vacancies.map((vacancy) => [
        vacancy.salaryShiftMin,
        vacancy.salaryShiftMax,
      ]),
      "shift",
    ),
  };
}

/** Городская страница по её адресу. Незнакомый слаг — `null`, дальше 404. */
export async function getCityPageBySlug(slug: string) {
  const vacancies = await loadActiveVacancies();
  const city = findCityBySlug(
    slug,
    uniqueSorted(vacancies.map((vacancy) => vacancy.city)),
  );

  return city ? buildCityPage(city, vacancies) : null;
}

/** Города, чьи страницы попадают в sitemap — порог см. в lib/city-page.ts. */
export async function getIndexableCityPages() {
  const vacancies = await loadActiveVacancies();

  return getIndexableCities(vacancies)
    .map((city) => buildCityPage(city, vacancies))
    .filter((page): page is NonNullable<typeof page> => page !== null);
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const filledValues = values.filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return [...new Set(filledValues)].sort((left, right) =>
    left.localeCompare(right, "ru"),
  );
}

// Верхняя граница «зарплата от» по каждому основанию: максимум по подборке,
// округлённый вверх (смена — до 500, период — до 5000). 0 — если по этому
// основанию сумм нет вовсе, тогда фильтр скрывается.
function getSalaryMax(
  vacancies: StructuredSalary[],
): Record<SalaryBasis, number> {
  const result: Record<SalaryBasis, number> = { shift: 0, period: 0 };

  for (const basis of ["shift", "period"] as const) {
    const amounts = vacancies
      .map((vacancy) => getSalaryCeiling(vacancy, basis))
      .filter((value): value is number => value !== null);

    if (amounts.length > 0) {
      const step = SALARY_ROUND[basis];
      result[basis] = Math.ceil(Math.max(...amounts) / step) * step;
    }
  }

  return result;
}

export type VacancyListItem = Awaited<
  ReturnType<typeof getActiveVacancies>
>[number];

export type VacancyDetails = NonNullable<
  Awaited<ReturnType<typeof getVacancyBySlug>>
>;

// Отбор под лендинги интентов (п. 13). Фильтруем в базе, а не в общем
// кэшированном списке: под «без опыта» и «ежедневные выплаты» нужны тексты
// требований и условий, а тянуть их в список витрины ради этого дорого.
const INTENT_WHERE: Record<IntentMatch, object> = {
  vahta: { title: { contains: "вахт", mode: "insensitive" } },
  noExperience: {
    OR: [
      { requirements: { contains: "опыт не требуется", mode: "insensitive" } },
      { requirements: { contains: "без опыта", mode: "insensitive" } },
      { conditions: { contains: "обучим", mode: "insensitive" } },
      { requirements: { contains: "обучим", mode: "insensitive" } },
    ],
  },
  ownCar: {
    OR: [
      { requirements: { contains: "личный автомобиль", mode: "insensitive" } },
      {
        requirements: {
          contains: "автомобиль с большим багажником",
          mode: "insensitive",
        },
      },
    ],
  },
  dailyPayout: { conditions: { contains: "ежедневн", mode: "insensitive" } },
  // Свой транспорт не нужен в двух случаях, и они разные: сборщик работает
  // внутри магазина, вахтовику технику выдают в аренду. Оба честно попадают
  // в «без своего транспорта», но в тексте лендинга разведены.
  noTransport: {
    OR: [
      { title: { contains: "сборщик", mode: "insensitive" } },
      { title: { contains: "вахт", mode: "insensitive" } },
    ],
  },
  // Подработка — это про длину смены и свободу графика, а не про слово
  // «подработка» в тексте: его в вакансиях нет ни разу. Берём короткие
  // и гибкие смены из `schedule`.
  partTime: {
    OR: [
      { schedule: { contains: "Свободный график", mode: "insensitive" } },
      { schedule: { contains: "Смены от 6 часов", mode: "insensitive" } },
    ],
  },
};

const loadIntentVacancies = unstable_cache(
  async (match: IntentMatch) =>
    db.vacancy.findMany({
      where: {
        isActive: true,
        ...INTENT_WHERE[match],
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        project: true,
        city: true,
        workFormat: true,
        salary: true,
        salaryHour: true,
        payTariff: true,
        salaryShiftMin: true,
        salaryShiftMax: true,
        salaryShiftAvg: true,
        salaryPeriodMin: true,
        salaryPeriodMax: true,
        salaryPeriod: true,
        schedule: true,
        address: true,
        updatedAt: true,
      },
    }),
  ["intent-vacancies"],
  { tags: [VACANCIES_CACHE_TAG], revalidate: 300 },
);

export async function getIntentVacancies(match: IntentMatch) {
  return loadIntentVacancies(match);
}

export type IntentVacancyRow = Awaited<
  ReturnType<typeof loadIntentVacancies>
>[number];

/**
 * Цифры для текста лендинга. Вынесено из `getIntentStats`, чтобы страница
 * могла честно посчитать их же для среза по городу (п. 14) — не запрашивая
 * подборку заново, а пересчитав по уже отфильтрованному списку.
 */
export function buildIntentStats(vacancies: IntentVacancyRow[]): IntentStats {
  return {
    count: vacancies.length,
    cities: new Set(vacancies.map((item) => item.city)).size,
    ...bounds(
      vacancies.map((item) => [item.salaryShiftMin, item.salaryShiftMax]),
      "shift",
    ),
    ...bounds(
      vacancies.map((item) => [item.salaryPeriodMin, item.salaryPeriodMax]),
      "period",
    ),
    // Как в sitemap.ts: дата реальной правки данных, а не время рендера —
    // иначе страница на каждый заход сообщала бы «обновлено только что»,
    // и такому сигналу поисковик и ассистент перестают доверять (п. 38).
    updatedAt: latestUpdatedAt(vacancies),
  };
}

/**
 * Цифры для текста лендинга. Считаются из той же подборки, что показана
 * ниже на странице, — иначе текст и список разошлись бы.
 */
export async function getIntentStats(
  match: IntentMatch,
): Promise<IntentStats> {
  return buildIntentStats(await loadIntentVacancies(match));
}

/**
 * Границы дохода по подборке.
 *
 * Берём именно диапазон, а не максимум: «доход до 11 000 ₽» — это верх
 * самой щедрой вакансии в наборе, и читается он как обещание, которого
 * никто не давал. Там, где у вакансии названа только верхняя сумма
 * («до 5 000 ₽»), она же считается её нижней границей.
 */
function bounds<K extends "shift" | "period">(
  pairs: Array<[number | null, number | null]>,
  key: K,
) {
  const lows = pairs
    .map(([min, max]) => min ?? max)
    .filter((value): value is number => value !== null);
  const highs = pairs
    .map(([min, max]) => max ?? min)
    .filter((value): value is number => value !== null);

  return {
    [`${key}Low`]: lows.length ? Math.min(...lows) : null,
    [`${key}High`]: highs.length ? Math.max(...highs) : null,
  } as Record<`${K}Low` | `${K}High`, number | null>;
}
