/**
 * Статусы отклика — заменены 26.08 по решению владельца.
 *
 * Прежний набор описывал воронку найма вообще («Интервью проведено»,
 * «Подходит», «Отправлен клиенту»). Этот описывает нашу: человека ведут
 * до выхода на стажировку, и деньги приходят за выход, а не за отклик.
 *
 * Отдельного «Нового» больше нет: отклик с сайта сразу попадает в работу.
 * Признак «ещё не трогали» теперь не в статусе, а в журнале изменений —
 * у нетронутой записи там нет ни одной строки.
 */
export const LEAD_STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "INTERVIEW_MOVED", label: "Дату собеседования перенесли" },
  { value: "RESERVE", label: "Резерв" },
  { value: "REJECTED", label: "Отказ" },
  { value: "TO_INTERNSHIP", label: "На стажировку" },
  { value: "INTERNSHIP_STARTED", label: "Вышел на стажировку" },
  { value: "DEAL_CLOSED", label: "Сделка завершена" },
  { value: "DUPLICATE", label: "Дубль" },
] as const;

export type LeadStatusValue = (typeof LEAD_STATUS_OPTIONS)[number]["value"];

/** Статус нового отклика с сайта. */
export const DEFAULT_LEAD_STATUS: LeadStatusValue = "IN_PROGRESS";

export function isLeadStatus(value: string): value is LeadStatusValue {
  return LEAD_STATUS_OPTIONS.some((status) => status.value === value);
}

export function getLeadStatusLabel(value: string) {
  return (
    LEAD_STATUS_OPTIONS.find((status) => status.value === value)?.label ?? value
  );
}
