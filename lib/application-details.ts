import { PREFERRED_CONTACTS, type PreferredContact } from "./application-form";

/**
 * Второй шаг отклика: имя и удобный канал связи, которые человек оставляет
 * уже на экране «Спасибо».
 *
 * Ручка открытая — её дёргает браузер кандидата сразу после отправки, сессии
 * тут нет. Поэтому три ограничения, без которых знание чужого id отклика
 * позволяло бы переписывать заявки:
 *
 * 1. только в течение окна после создания;
 * 2. только те поля, которые ещё не заполнены, — дописываем, а не заменяем;
 * 3. телефон и вакансию отсюда не поменять вовсе.
 */
export const DETAILS_WINDOW_MS = 30 * 60 * 1000;

export const ANONYMOUS_NAME = "Без имени";

type DetailsInput = {
  name?: unknown;
  preferredContact?: unknown;
  telegramUsername?: unknown;
};

type ExistingApplication = {
  candidateName: string;
  createdAt: Date;
  preferredContact: string | null;
  telegramUsername: string | null;
};

export type DetailsUpdate = {
  candidateName?: string;
  preferredContact?: PreferredContact;
  telegramUsername?: string;
};

export type DetailsResult =
  | { update: DetailsUpdate }
  | { error: "expired" | "nothing" };

export function buildDetailsUpdate(
  input: DetailsInput,
  application: ExistingApplication,
  now: Date = new Date(),
): DetailsResult {
  if (now.getTime() - application.createdAt.getTime() > DETAILS_WINDOW_MS) {
    return { error: "expired" };
  }

  const update: DetailsUpdate = {};
  const name = readText(input.name, 80);

  // Дописываем только пустое: если менеджер уже успел поправить имя руками,
  // второй шаг не должен затирать его правку.
  if (name && application.candidateName === ANONYMOUS_NAME) {
    update.candidateName = name;
  }

  const contact = readText(input.preferredContact, 20);

  if (
    contact &&
    !application.preferredContact &&
    PREFERRED_CONTACTS.includes(contact as PreferredContact)
  ) {
    update.preferredContact = contact as PreferredContact;
  }

  const telegram = readText(input.telegramUsername, 80)?.replace(/^@+/, "");

  if (telegram && !application.telegramUsername) {
    update.telegramUsername = telegram;
  }

  return Object.keys(update).length ? { update } : { error: "nothing" };
}

function readText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}
