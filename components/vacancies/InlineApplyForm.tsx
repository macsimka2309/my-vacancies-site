"use client";

import { FormEvent, useId, useState } from "react";
import { getCallbackPromise } from "@/lib/callback";
import { reachGoal } from "@/lib/metrika";
import { formatPhone } from "@/lib/phone";
import {
  type ApplyVacancy,
  CONTACT_OPTIONS,
  useApplyForm,
} from "./useApplyForm";

type InlineApplyFormProps = {
  vacancy: ApplyVacancy;
  /** compact — для карточек в списке; expanded — на детальной. */
  variant?: "compact" | "expanded";
};

/**
 * Отклик прямо в карточке, без модалки.
 *
 * Было: карточка → кнопка → окно → телефон → галочка → отправить.
 * Стало: телефон → отправить. Согласие и остальное появляются по мере того,
 * как человек втягивается: сначала он видит одно поле, а не форму из пяти.
 */
export function InlineApplyForm({
  vacancy,
  variant = "compact",
}: InlineApplyFormProps) {
  const form = useApplyForm(vacancy);
  const [isEngaged, setIsEngaged] = useState(variant === "expanded");
  const phoneId = useId();
  const callbackPromise = getCallbackPromise();

  // Согласие и обещание звонка показываем, как только человек взялся за поле:
  // до этого они занимают место и отвлекают от единственного нужного действия.
  const showConsent = isEngaged || form.phone.length > 0;

  function engage() {
    if (!isEngaged) {
      reachGoal("application_form_open", {
        vacancy: vacancy.title,
        city: vacancy.city,
      });
      setIsEngaged(true);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await form.submit();
  }

  async function handleDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await form.submitDetails();
  }

  if (form.isSent) {
    return (
      <div className="inline-apply inline-apply--done" data-variant={variant}>
        <p className="inline-apply__done" role="status">
          <span aria-hidden="true">✓</span> Отклик принят. {callbackPromise}.
        </p>
        {form.isDetailsSaved ? (
          <p className="muted inline-apply__hint">
            Держите телефон под рукой.
          </p>
        ) : (
          <form className="inline-apply__details" onSubmit={handleDetails}>
            <p className="muted inline-apply__hint">
              Как к вам обращаться и где удобнее ответить? Необязательно.
            </p>
            <input
              className="ym-disable-keys"
              autoComplete="name"
              aria-label="Имя"
              placeholder="Имя"
              value={form.name}
              onChange={(event) => form.setName(event.target.value)}
            />
            <div className="apply-contact__options">
              {CONTACT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="apply-contact__option"
                  data-active={form.preferredContact === option.value}
                >
                  <input
                    type="radio"
                    name={`contact-${phoneId}`}
                    value={option.value}
                    checked={form.preferredContact === option.value}
                    onChange={() => form.setPreferredContact(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {form.preferredContact === "telegram" ? (
              <input
                className="ym-disable-keys"
                aria-label="Ник в Telegram"
                placeholder="@username"
                value={form.telegramUsername}
                onChange={(event) =>
                  form.setTelegramUsername(event.target.value)
                }
              />
            ) : null}
            <button
              className="secondary-link form-secondary-button"
              disabled={form.isSubmitting}
              type="submit"
            >
              {form.isSubmitting ? "Сохраняем" : "Сохранить"}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <form
      className="inline-apply"
      data-variant={variant}
      onSubmit={handleSubmit}
    >
      {/* Ловушка для ботов. Имя поля намеренно бессмысленное: «company»
          автозаполнение браузеров подставляет из профиля даже при
          autocomplete="off" — из-за этого терялись живые отклики. */}
      <input
        type="text"
        name="hp_ref"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        data-lpignore="true"
        data-1p-ignore="true"
        data-form-type="other"
        value={form.company}
        onChange={(event) => form.setCompany(event.target.value)}
        style={{
          position: "absolute",
          left: "-9999px",
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />
      <div className="inline-apply__row">
        <input
          id={phoneId}
          className="ym-disable-keys inline-apply__phone"
          autoComplete="tel"
          inputMode="tel"
          aria-label={`Телефон для отклика на вакансию ${vacancy.title}, ${vacancy.city}`}
          placeholder="Ваш телефон"
          required
          value={form.phone}
          onFocus={engage}
          onChange={(event) => form.setPhone(formatPhone(event.target.value))}
        />
        <button
          className="button-link inline-apply__submit"
          disabled={form.isSubmitting || (showConsent && !form.consent)}
          type="submit"
        >
          {form.isSubmitting ? "Отправляем" : "Откликнуться"}
        </button>
      </div>
      {showConsent ? (
        <>
          <label className="apply-consent inline-apply__consent">
            <input
              type="checkbox"
              checked={form.consent}
              required
              onChange={(event) => form.setConsent(event.target.checked)}
            />
            {/* Галочка остаётся обязательной: согласие на обработку и на
                передачу через Telegram (зарубежный сервис) по 152-ФЗ должно
                быть явным. Решение по замене сноской — за владельцем (п. 8). */}
            <span>
              Согласен(на) на обработку персональных данных и передачу отклика
              нам через Telegram — зарубежный сервис.{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Подробнее
              </a>
            </span>
          </label>
          <p className="apply-trust inline-apply__trust">
            <span className="apply-trust__dot" aria-hidden="true" />
            {callbackPromise}
          </p>
        </>
      ) : null}
      {form.errorMessage ? (
        <p className="form-message form-message--error">{form.errorMessage}</p>
      ) : null}
    </form>
  );
}
