import { getCityIn, getCitySlug, getRegionByCity } from "./cities";
import type { CityContextVacancy } from "./city-context";

/**
 * Городская страница `/rabota/<город>` (п. 12).
 *
 * Порог — три вакансии в городе, и он не произвольный. Распределение
 * каталога на 24.08:
 *
 *   15 городов — 3+ вакансии и 2+ проекта   (71 вакансия)
 *    5 городов — 3+ вакансии, один проект   (15 вакансий)
 *   25 городов — ровно 2 вакансии           (50 вакансий)
 *   33 города  — одна вакансия              (33 вакансии)
 *
 * 58 городов из 78 держат одну-две вакансии: страница для такого города —
 * копия карточки этой вакансии, то есть ровно то, за что поисковики
 * понижают домен целиком.
 *
 * Не проходящие порог города **не отдают 404**: страница остаётся для
 * человека, но получает `noindex, follow` и не попадает в sitemap. 404 на
 * адресе, который мог успеть проиндексироваться, хуже тонкой страницы.
 */
export const CITY_PAGE_MIN_VACANCIES = 3;

/** Сколько соседних городов показываем внизу страницы. */
const REGION_CITIES_LIMIT = 6;

// Сборщик работает внутри магазина — это видно из его обязанностей.
// Про электровелосипед молчим: на части проектов его выдают в аренду.
const NEEDS_NO_TRANSPORT = /^сборщик заказов$/i;

export type CityProfession = {
  title: string;
  count: number;
  projects: string[];
  /** Нижняя граница, если она известна хоть по одной вакансии. */
  from: number | null;
  /** Потолок смены — он есть у 165 вакансий из 169. */
  to: number | null;
  vacancies: CityContextVacancy[];
};

export type CityPage = {
  city: string;
  cityIn: string | null;
  slug: string;
  region: string | null;
  total: number;
  projects: string[];
  professions: CityProfession[];
  from: number | null;
  to: number | null;
  /** Есть ли работа, для которой не нужен свой транспорт. */
  noTransportProfession: string | null;
  /** Порог пройден — страницу можно отдавать поиску. */
  indexable: boolean;
  regionCities: { city: string; slug: string; count: number }[];
  /** Дата последней правки вакансии города — ISO-строка, для «Обновлено» и dateModified (п. 38). */
  lastUpdated: string;
};

export function buildCityPage(
  city: string,
  all: CityContextVacancy[],
): CityPage | null {
  const slug = getCitySlug(city);

  if (!slug) {
    return null;
  }

  const inCity = all.filter((vacancy) => vacancy.city === city);

  if (!inCity.length) {
    return null;
  }

  const professions = groupByProfession(inCity);
  const noTransport = professions.find((profession) =>
    NEEDS_NO_TRANSPORT.test(profession.title),
  );

  return {
    city,
    cityIn: getCityIn(city),
    slug,
    region: getRegionByCity(city),
    total: inCity.length,
    projects: sortedByCount(inCity.map((vacancy) => vacancy.project)),
    professions,
    from: min(professions.map((profession) => profession.from)),
    to: max(professions.map((profession) => profession.to)),
    noTransportProfession: noTransport?.title ?? null,
    indexable: inCity.length >= CITY_PAGE_MIN_VACANCIES,
    regionCities: buildRegionCities(city, all),
    // inCity точно не пуст — проверено строкой выше.
    lastUpdated: latestUpdatedAt(inCity)!,
  };
}

/**
 * Самая свежая `updatedAt` среди вакансий подборки — как в sitemap.ts,
 * это дата реальной правки данных, а не время рендера страницы (п. 38).
 *
 * После unstable_cache Date превращается в ISO-строку (JSON не хранит
 * объекты Date) — `new Date(...)` здесь работает для обоих случаев.
 */
export function latestUpdatedAt(
  vacancies: { updatedAt: Date | string }[],
): string | null {
  const latest = vacancies.reduce<number | null>((latest, vacancy) => {
    const time = new Date(vacancy.updatedAt).getTime();

    return latest === null || time > latest ? time : latest;
  }, null);

  return latest === null ? null : new Date(latest).toISOString();
}

/** Города, чьи страницы можно отдавать поиску — для sitemap. */
export function getIndexableCities(all: CityContextVacancy[]) {
  const counts = new Map<string, number>();

  for (const vacancy of all) {
    counts.set(vacancy.city, (counts.get(vacancy.city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(
      ([city, count]) =>
        count >= CITY_PAGE_MIN_VACANCIES && getCitySlug(city) !== null,
    )
    .map(([city]) => city)
    .sort((left, right) => left.localeCompare(right, "ru"));
}

function groupByProfession(vacancies: CityContextVacancy[]): CityProfession[] {
  const groups = new Map<string, CityContextVacancy[]>();

  for (const vacancy of vacancies) {
    groups.set(vacancy.title, [...(groups.get(vacancy.title) ?? []), vacancy]);
  }

  return [...groups.entries()]
    .map(([title, items]) => ({
      title,
      count: items.length,
      projects: sortedByCount(items.map((item) => item.project)),
      // Нижняя граница известна редко (40 вакансий из 169): у большинства
      // витрина говорит «до N ₽», и придумывать низ мы не будем.
      from: min(items.map((item) => item.salaryShiftMin)),
      to: max(items.map((item) => item.salaryShiftMax)),
      vacancies: [...items].sort(
        (left, right) =>
          (right.salaryShiftMax ?? -1) - (left.salaryShiftMax ?? -1),
      ),
    }))
    .sort((left, right) => (right.to ?? -1) - (left.to ?? -1));
}

function buildRegionCities(city: string, all: CityContextVacancy[]) {
  const region = getRegionByCity(city);

  if (!region) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const vacancy of all) {
    if (vacancy.city === city || getRegionByCity(vacancy.city) !== region) {
      continue;
    }

    counts.set(vacancy.city, (counts.get(vacancy.city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ city: name, slug: getCitySlug(name), count }))
    .filter(
      (item): item is { city: string; slug: string; count: number } =>
        item.slug !== null,
    )
    .sort(
      (left, right) =>
        right.count - left.count || left.city.localeCompare(right.city, "ru"),
    )
    .slice(0, REGION_CITIES_LIMIT);
}

/**
 * Вопросы и ответы строго из данных города (п. 38).
 *
 * Общих вопросов вроде «нужен ли опыт» здесь намеренно нет: одинаковый
 * ответ на двадцати страницах — это то же дублирование, от которого мы
 * и уходим, только теперь ещё и в микроразметке.
 */
export function buildCityFaq(page: CityPage) {
  const faq: { question: string; answer: string }[] = [];
  const where = page.cityIn ? `в ${page.cityIn}` : `в городе ${page.city}`;

  if (page.professions.some((profession) => profession.to !== null)) {
    faq.push({
      question: `Сколько платят ${where}?`,
      answer: `${page.professions
        .filter((profession) => profession.to !== null)
        .map(
          (profession) =>
            `${profession.title} — ${describePay(profession)}`,
        )
        .join("; ")}. Выплаты еженедельные.`,
    });
  }

  faq.push({
    question: `Какая работа есть ${where}?`,
    answer: `${page.total} ${vacancyWord(page.total)}: ${page.professions
      .map((profession) => profession.title.toLocaleLowerCase("ru-RU"))
      .join(", ")}. ${
      page.projects.length > 1 ? "Работодатели" : "Работодатель"
    } — ${page.projects.join(", ")}.`,
  });

  if (page.noTransportProfession) {
    faq.push({
      question: `Есть ли ${where} работа без своего транспорта?`,
      answer: `Да — «${page.noTransportProfession}»: работа на одной точке, внутри магазина, транспорт не нужен.`,
    });
  }

  return faq;
}

export function describePay(profession: CityProfession) {
  if (profession.to === null) {
    return "по договорённости";
  }

  return profession.from !== null
    ? `от ${money(profession.from)} до ${money(profession.to)} ₽ за смену`
    : `до ${money(profession.to)} ₽ за смену`;
}

export function money(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function vacancyWord(count: number) {
  const words: Record<string, string> = {
    one: "вакансия",
    few: "вакансии",
    many: "вакансий",
    other: "вакансии",
  };

  return words[new Intl.PluralRules("ru-RU").select(count)] ?? words.other;
}

function sortedByCount(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0], "ru"),
    )
    .map(([value]) => value);
}

function min(values: (number | null)[]) {
  const filled = values.filter((value): value is number => value !== null);

  return filled.length ? Math.min(...filled) : null;
}

function max(values: (number | null)[]) {
  const filled = values.filter((value): value is number => value !== null);

  return filled.length ? Math.max(...filled) : null;
}
