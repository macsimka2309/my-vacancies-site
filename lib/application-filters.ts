import {
  getSourceBucket,
  isSourceBucket,
  type SourceBucket,
} from "./application-source";
import { isLeadStatus, type LeadStatusValue } from "./lead-status";

/**
 * Фильтры списка откликов (п. 41).
 *
 * Каждый фильтр — набор, а не одно значение. Одиночный выбор отвечал только
 * на вопрос «покажи мне X», но не на «покажи всё, до чего ещё не дошли руки»:
 * это «Новый ИЛИ Недозвон ИЛИ В работе», и одним значением так не спросишь.
 */
export type ApplicationFilters = {
  statuses: LeadStatusValue[];
  sources: SourceBucket[];
  /** Может содержать `CITY_NOT_SET` наряду с обычными городами. */
  cities: string[];
  projects: string[];
  vacancyIds: string[];
  query: string;
};

/**
 * Город у отклика может быть пуст, и после п. 40 его ещё и правят руками.
 * Без явного варианта такие отклики просто исчезали бы из всех городских
 * выборок, а суммы по городам перестали бы сходиться с общим числом.
 */
export const CITY_NOT_SET = "__none__";

export const EMPTY_FILTERS: ApplicationFilters = {
  cities: [],
  projects: [],
  query: "",
  sources: [],
  statuses: [],
  vacancyIds: [],
};

export function parseApplicationFilters(
  params: Record<string, string | string[] | undefined>,
): ApplicationFilters {
  return {
    cities: many(params.city),
    projects: many(params.project),
    query: (many(params.q)[0] ?? "").trim(),
    sources: many(params.source).filter(isSourceBucket),
    statuses: many(params.status).filter(isLeadStatus),
    vacancyIds: many(params.vacancyId),
  };
}

export function hasActiveFilters(filters: ApplicationFilters) {
  return Boolean(
    filters.statuses.length ||
      filters.sources.length ||
      filters.cities.length ||
      filters.projects.length ||
      filters.vacancyIds.length,
  );
}

/**
 * Условие для запроса в базу. Источник сюда не попадает: он не колонка,
 * а вычисляемая корзина (`yandex`, `yandex.ru` и `alice.yandex.ru` — один
 * Яндекс), и разбирается уже над выборкой.
 */
export function buildApplicationWhere(filters: ApplicationFilters) {
  const where: Record<string, unknown> = {};

  if (filters.statuses.length) {
    where.status = { in: filters.statuses };
  }

  if (filters.projects.length) {
    where.projectSnapshot = { in: filters.projects };
  }

  if (filters.vacancyIds.length) {
    where.vacancyId = { in: filters.vacancyIds };
  }

  if (filters.cities.length) {
    const named = filters.cities.filter((city) => city !== CITY_NOT_SET);
    const wantsEmpty = filters.cities.includes(CITY_NOT_SET);
    const conditions: unknown[] = [];

    if (named.length) {
      conditions.push({ city: { in: named } });
    }

    if (wantsEmpty) {
      conditions.push({ city: null }, { city: "" });
    }

    where.OR = conditions;
  }

  return where;
}

type SourceRow = { trafficSource: string | null; utmSource: string | null };

export function matchesSource(row: SourceRow, sources: SourceBucket[]) {
  return (
    sources.length === 0 ||
    sources.includes(getSourceBucket(row.trafficSource, row.utmSource))
  );
}

/** Адрес с текущим набором фильтров — им же пользуется форма при отборе. */
export function buildAdminUrl(filters: ApplicationFilters) {
  const params = new URLSearchParams();

  for (const status of filters.statuses) params.append("status", status);
  for (const source of filters.sources) params.append("source", source);
  for (const city of filters.cities) params.append("city", city);
  for (const project of filters.projects) params.append("project", project);
  for (const id of filters.vacancyIds) params.append("vacancyId", id);
  if (filters.query) params.set("q", filters.query);

  const search = params.toString();

  return search ? `/admin?${search}` : "/admin";
}

/** Добавляет или убирает значение из набора — на этом держатся все фишки. */
export function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function many(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}
