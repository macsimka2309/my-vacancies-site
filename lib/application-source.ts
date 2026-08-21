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
