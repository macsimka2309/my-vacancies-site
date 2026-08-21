"use client";

import { useState } from "react";
import { getAttribution } from "@/lib/attribution";
import { reachGoal } from "@/lib/metrika";

export type ApplyVacancy = {
  id: string;
  title: string;
  project: string;
  city: string;
};

export type PreferredContact = "phone" | "telegram" | "max";

export const CONTACT_OPTIONS: Array<{
  value: PreferredContact;
  label: string;
}> = [
  { value: "phone", label: "Телефон" },
  { value: "telegram", label: "Telegram" },
  { value: "max", label: "MAX" },
];

/**
 * Общее состояние формы отклика для модалки и встроенной формы.
 *
 * Отклик отправляется в два шага. Первый — только телефон и согласие:
 * это всё, что нужно, чтобы перезвонить. Имя и удобный канал связи
 * спрашиваем уже на экране «Спасибо», когда человек ничем не рискует.
 * Раньше все четыре поля стояли до отправки, и каждое было поводом уйти.
 */
export function useApplyForm(vacancy: ApplyVacancy) {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot — скрытое поле-ловушка для ботов.
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Второй шаг.
  const [name, setName] = useState("");
  const [preferredContact, setPreferredContact] =
    useState<PreferredContact>("phone");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [isDetailsSaved, setIsDetailsSaved] = useState(false);

  const isSent = applicationId !== null;

  function reset() {
    setPhone("");
    setConsent(false);
    setErrorMessage("");
    setApplicationId(null);
    setName("");
    setPreferredContact("phone");
    setTelegramUsername("");
    setIsDetailsSaved(false);
  }

  async function submit() {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          vacancyId: vacancy.id,
          consent,
          company,
          ...getAttribution(),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        applicationId?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        const message = result?.error ?? "Не удалось отправить отклик.";

        // Ошибки формы — самая дешёвая точка потерь: человек уже готов
        // оставить телефон, но что-то не пропускает.
        reachGoal("form_error", { reason: message });
        setErrorMessage(message);
        return false;
      }

      reachGoal("application_submit");
      // Ловушка сработала — отклик всё равно сохранён, но id не вернётся.
      setApplicationId(result?.applicationId ?? "");
      return true;
    } catch {
      const message = "Нет связи с сервером. Попробуйте ещё раз.";

      reachGoal("form_error", { reason: message });
      setErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  /** Второй шаг: имя и удобный канал. Молчаливый — отклик уже принят. */
  async function submitDetails() {
    if (!applicationId) {
      setIsDetailsSaved(true);
      return;
    }

    setIsSubmitting(true);

    try {
      await fetch(`/api/applications/${applicationId}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          preferredContact,
          telegramUsername:
            preferredContact === "telegram" ? telegramUsername : "",
        }),
      });
      reachGoal("application_details");
    } catch {
      // Молча: отклик уже принят, перезвонят и без имени.
    } finally {
      setIsSubmitting(false);
      setIsDetailsSaved(true);
    }
  }

  return {
    company,
    consent,
    errorMessage,
    isDetailsSaved,
    isSent,
    isSubmitting,
    name,
    phone,
    preferredContact,
    reset,
    setCompany,
    setConsent,
    setName,
    setPhone,
    setPreferredContact,
    setTelegramUsername,
    submit,
    submitDetails,
    telegramUsername,
  };
}
