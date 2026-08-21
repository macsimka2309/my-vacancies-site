import { isManualSource, type ManualSource } from "./application-source";
import { normalizeRuPhone } from "./phone";

export const PREFERRED_CONTACTS = ["phone", "telegram", "max"] as const;

export type PreferredContact = (typeof PREFERRED_CONTACTS)[number];

export type ManualApplicationData = {
  candidateComment: string | null;
  candidateName: string;
  normalizedPhone: string;
  phone: string;
  preferredContact: PreferredContact;
  source: ManualSource;
  telegramUsername: string | null;
  vacancyId: string;
};

export type ManualApplicationError =
  | "invalid"
  | "phone"
  | "source"
  | "consent"
  | "telegram";

/**
 * Разбор формы «Создать отклик» в админке.
 *
 * Телефон нормализуем тем же кодом, что и форма на сайте: иначе один и тот же
 * человек попадёт в базу в двух написаниях, и проверка дублей его не поймает.
 */
export function parseManualApplicationForm(
  formData: FormData,
): { data: ManualApplicationData } | { error: ManualApplicationError } {
  const vacancyId = readField(formData, "vacancyId", 200);
  const rawPhone = readField(formData, "phone", 40);
  const source = readField(formData, "source", 40);

  if (!vacancyId || !rawPhone) {
    return { error: "invalid" };
  }

  if (!isManualSource(source)) {
    return { error: "source" };
  }

  const normalizedPhone = normalizeRuPhone(rawPhone);

  if (!normalizedPhone) {
    return { error: "phone" };
  }

  // Согласие подтверждает менеджер, а не кандидат: подставлять его молча
  // нельзя — это ровно та запись, которую попросят предъявить.
  if (formData.get("consent") !== "on") {
    return { error: "consent" };
  }

  const preferredContact = readField(formData, "preferredContact", 20);
  const contact: PreferredContact = PREFERRED_CONTACTS.includes(
    preferredContact as PreferredContact,
  )
    ? (preferredContact as PreferredContact)
    : "phone";

  const rawTelegram = readField(formData, "telegramUsername", 80);

  if (rawTelegram === undefined) {
    return { error: "invalid" };
  }

  const telegramUsername = rawTelegram?.replace(/^@+/, "") || null;

  if (contact === "telegram" && !telegramUsername) {
    return { error: "telegram" };
  }

  const candidateComment = readField(formData, "candidateComment", 2_000);

  if (candidateComment === undefined) {
    return { error: "invalid" };
  }

  return {
    data: {
      candidateComment: candidateComment ?? null,
      // Имя необязательно, как и в форме на сайте: телефона достаточно.
      candidateName: readField(formData, "candidateName", 80) || "Без имени",
      normalizedPhone,
      phone: rawPhone,
      preferredContact: contact,
      source,
      telegramUsername: contact === "telegram" ? telegramUsername : null,
      vacancyId,
    },
  };
}

// Пусто — null, слишком длинно — undefined (ошибка формы).
function readField(formData: FormData, field: string, maxLength: number) {
  const value = String(formData.get(field) ?? "").trim();

  if (value.length > maxLength) {
    return undefined;
  }

  return value || null;
}
