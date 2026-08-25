/**
 * Откуда пришёл отклик.
 *
 * У откликов с сайта источник вычисляется из UTM и referrer. Но человек
 * может написать напрямую в Telegram или MAX — такой отклик заводит менеджер
 * руками, и источник надо указать явно.
 *
 * Ручные источники помечаются префиксом: без него они смешаются с
 * органическими в отчёте по каналам, и первый же вывод будет неверным.
 */
export const MANUAL_SOURCE_PREFIX = "manual:";

export const MANUAL_SOURCE_OPTIONS = [
  { value: "telegram", label: "Написал в Telegram" },
  { value: "max", label: "Написал в MAX" },
  { value: "call", label: "Позвонил сам" },
  { value: "referral", label: "Пришёл по рекомендации" },
  { value: "other", label: "Другое" },
] as const;

export type ManualSource = (typeof MANUAL_SOURCE_OPTIONS)[number]["value"];

export function isManualSource(value: unknown): value is ManualSource {
  return MANUAL_SOURCE_OPTIONS.some((option) => option.value === value);
}

/** `telegram` → `manual:telegram` — то, что уходит в `trafficSource`. */
export function toTrafficSource(source: ManualSource) {
  return `${MANUAL_SOURCE_PREFIX}${source}`;
}

/**
 * Корзины источников для фильтра и отчётности (п. 41).
 *
 * `trafficSource` — не перечисление. У откликов с сайта туда попадает либо
 * `utm_source` как есть, либо хост реферера, либо `direct`. На боевой базе
 * это видно сразу: `yandex`, `yandex.ru` и `alice.yandex.ru` — три значения
 * про один Яндекс, плюс `away.vk.ru`.
 *
 * Поэтому фильтр работает по корзинам, а не по сырым значениям. И живёт это
 * здесь, а не в странице админки: **тем же разбором будет считать отчёт
 * п. 16.** Если фильтр и отчёт нормализуют источник по-разному, они дадут
 * разные числа по одним данным, и доверия не будет ни к одному.
 */
export const SOURCE_BUCKETS = [
  { value: "manual", label: "Заведён вручную" },
  { value: "ads", label: "Реклама" },
  { value: "search", label: "Поиск" },
  { value: "social", label: "Соцсети" },
  { value: "direct", label: "Прямые заходы" },
  { value: "other", label: "Другое" },
] as const;

export type SourceBucket = (typeof SOURCE_BUCKETS)[number]["value"];

export function isSourceBucket(value: unknown): value is SourceBucket {
  return SOURCE_BUCKETS.some((bucket) => bucket.value === value);
}

// Реклама узнаётся по метке, а не по хосту: органический переход из Яндекса
// и клик по объявлению приходят с одного и того же домена.
const AD_UTM = /^(yandex|direct|google|vk|telegram|tg)$/i;
const SEARCH_HOSTS = /(^|\.)(yandex|google|bing|mail|rambler|duckduckgo)\./i;
const SOCIAL_HOSTS = /(^|\.)(vk|ok|t|telegram|instagram|facebook|youtube)\./i;

export function getSourceBucket(
  trafficSource: string | null,
  utmSource?: string | null,
): SourceBucket {
  if (trafficSource?.startsWith(MANUAL_SOURCE_PREFIX)) {
    return "manual";
  }

  if (utmSource && AD_UTM.test(utmSource)) {
    return "ads";
  }

  if (!trafficSource || trafficSource === "direct") {
    return "direct";
  }

  // `utm_source=yandex` без хоста — тоже реклама: так его пишет Директ.
  if (AD_UTM.test(trafficSource) && !trafficSource.includes(".")) {
    return "ads";
  }

  if (SOCIAL_HOSTS.test(trafficSource)) {
    return "social";
  }

  if (SEARCH_HOSTS.test(trafficSource)) {
    return "search";
  }

  return "other";
}

export function getSourceBucketLabel(bucket: SourceBucket) {
  return (
    SOURCE_BUCKETS.find((item) => item.value === bucket)?.label ?? "Другое"
  );
}

/**
 * Подпись источника для админки. Ручные отмечаем словом «вручную»:
 * менеджер должен видеть, что этот отклик не пришёл с сайта сам.
 */
export function getTrafficSourceLabel(trafficSource: string | null) {
  if (!trafficSource) {
    return "Не указан";
  }

  if (!trafficSource.startsWith(MANUAL_SOURCE_PREFIX)) {
    return trafficSource;
  }

  const value = trafficSource.slice(MANUAL_SOURCE_PREFIX.length);
  const option = MANUAL_SOURCE_OPTIONS.find((item) => item.value === value);

  return `${option?.label ?? value} · вручную`;
}
