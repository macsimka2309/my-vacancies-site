export const LEAD_STATUS_OPTIONS = [
  { value: "NEW", label: "Новый" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "NO_ANSWER", label: "Не дозвонились" },
  { value: "INTERVIEW_DONE", label: "Интервью проведено" },
  { value: "FIT", label: "Подходит" },
  { value: "NOT_FIT", label: "Не подходит" },
  { value: "SENT_TO_CLIENT", label: "Отправлен клиенту" },
  { value: "ACCEPTED", label: "Принят" },
  { value: "CANDIDATE_REFUSED", label: "Кандидат отказался" },
  { value: "DUPLICATE", label: "Дубль" },
] as const;

export type LeadStatusValue = (typeof LEAD_STATUS_OPTIONS)[number]["value"];

export function isLeadStatus(value: string): value is LeadStatusValue {
  return LEAD_STATUS_OPTIONS.some((status) => status.value === value);
}

export function getLeadStatusLabel(value: string) {
  return (
    LEAD_STATUS_OPTIONS.find((status) => status.value === value)?.label ?? value
  );
}
