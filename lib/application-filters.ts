import {
  getSourceBucket,
  isSourceBucket,
  type SourceBucket,
} from "./application-source";
import { isLeadStatus, type LeadStatusValue } from "./lead-status";

/**
 * Фильтры списка откликов (п. 41).
 *
 * До этого в админке был только поиск одной строкой по всем полям сразу.
 * Он ищет подстроку и не может сказать, где она встретилась: запрос «Москва»
 * показывал и откликов из Москвы, и вакансии со словом «Москва» в названии,
 * и комментарий, где Москва просто упомянута. Скомбинировать условия было
 * нечем — «новые из Telegram по Самокату» приходилось искать глазами.
 */
export type ApplicationFilters = {
  status: LeadStatusValue | null;
  source: SourceBucket | null;
  /** `CITY_NOT_SET` — отдельное значение, см. ниже. */
  city: string | null;
  project: string | null;
  vacancyId: string | null;
  query: string;
};

/**
 * Город у отклика может быть пуст, и после п. 40 его ещё и правят руками.
 * Без явного варианта такие отклики просто исчезали бы из всех городских
 * выборок, а суммы по городам перестали бы сходиться с общим числом.
 */
export const CITY_NOT_SET = "__none__";

export const EMPTY_FILTERS: ApplicationFilters = {
  city: null,
  project: null,
  query: "",
  source: null,
  status: null,
  vacancyId: null,
};

export function parseApplicationFilters(
  params: Record<string, string | string[] | undefined>,
): ApplicationFilters {
  const status = single(params.status);
  const source = single(params.source);

  return {
    city: single(params.city) || null,
    project: single(params.project) || null,
    query: (single(params.q) ?? "").trim(),
    source: source && isSourceBucket(source) ? source : null,
    status: status && isLeadStatus(status) ? status : null,
    vacancyId: single(params.vacancyId) || null,
  };
}

export function hasActiveFilters(filters: ApplicationFilters) {
  return Boolean(
    filters.status ||
      filters.source ||
      filters.city ||
      filters.project ||
      filters.vacancyId,
  );
}

/**
 * Условие для запроса в базу. Источник сюда не попадает: он не колонка,
 * а вычисляемая корзина (`yandex`, `yandex.ru` и `alice.yandex.ru` — один
 * Яндекс), и разбирается уже над выборкой.
 */
export function buildApplicationWhere(filters: ApplicationFilters) {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.city === CITY_NOT_SET) {
    where.OR = [{ city: null }, { city: "" }];
  } else if (filters.city) {
    where.city = filters.city;
  }

  if (filters.project) {
    where.projectSnapshot = filters.project;
  }

  if (filters.vacancyId) {
    where.vacancyId = filters.vacancyId;
  }

  return where;
}

type SourceRow = { trafficSource: string | null; utmSource: string | null };

export function matchesSource(row: SourceRow, source: SourceBucket | null) {
  return (
    source === null || getSourceBucket(row.trafficSource, row.utmSource) === source
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Ссылка с изменённым набором фильтров — для «Сбросить» и переключений. */
export function buildAdminUrl(
  filters: ApplicationFilters,
  patch: Partial<ApplicationFilters> = {},
) {
  const merged = { ...filters, ...patch };
  const params = new URLSearchParams();

  if (merged.status) params.set("status", merged.status);
  if (merged.source) params.set("source", merged.source);
  if (merged.city) params.set("city", merged.city);
  if (merged.project) params.set("project", merged.project);
  if (merged.vacancyId) params.set("vacancyId", merged.vacancyId);
  if (merged.query) params.set("q", merged.query);

  const search = params.toString();

  return search ? `/admin?${search}` : "/admin";
}
