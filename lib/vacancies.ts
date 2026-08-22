import { unstable_cache } from "next/cache";
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
        salaryShiftMin: true,
        salaryShiftMax: true,
        salaryShiftAvg: true,
        salaryPeriodMin: true,
        salaryPeriodMax: true,
        salaryPeriod: true,
        schedule: true,
        address: true,
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
        salaryShiftMin: true,
        salaryShiftMax: true,
        salaryShiftAvg: true,
        salaryPeriodMin: true,
        salaryPeriodMax: true,
        salaryPeriod: true,
        schedule: true,
        address: true,
      },
    }),
  ["intent-vacancies"],
  { tags: [VACANCIES_CACHE_TAG], revalidate: 300 },
);

export async function getIntentVacancies(match: IntentMatch) {
  return loadIntentVacancies(match);
}

/**
 * Цифры для текста лендинга. Считаются из той же подборки, что показана
 * ниже на странице, — иначе текст и список разошлись бы.
 */
export async function getIntentStats(
  match: IntentMatch,
): Promise<IntentStats> {
  const [vacancies, all] = await Promise.all([
    loadIntentVacancies(match),
    loadActiveVacancies(),
  ]);

  return {
    count: vacancies.length,
    total: all.length,
    cities: new Set(vacancies.map((item) => item.city)).size,
    ...bounds(
      vacancies.map((item) => [item.salaryShiftMin, item.salaryShiftMax]),
      "shift",
    ),
    ...bounds(
      vacancies.map((item) => [item.salaryPeriodMin, item.salaryPeriodMax]),
      "period",
    ),
  };
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
