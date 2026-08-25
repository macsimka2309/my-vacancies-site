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
 * Стало: имя, телефон → отправить. Согласие появляется, как только человек
 * взялся за поля, а канал связи — уже на экране «Спасибо».
 *
 * Имя обязательно с 26.08 по решению владельца. Это осознанный размен:
 * каждое поле до отправки — повод уйти, но менеджеру нужно знать, к кому
 * он обращается. Смотреть надо на долю `application_form_open` →
 * `application_submit`.
 */
export function InlineApplyForm({
  vacancy,
  variant = "compact",
}: InlineApplyFormProps) {
  const form = useApplyForm(vacancy);
  const [isEngaged, setIsEngaged] = useState(variant === "expanded");
  const nameId = useId();
  const phoneId = useId();
  const callbackPromise = getCallbackPromise();

  // Согласие и обещание звонка показываем, как только человек взялся за поле:
  // до этого они занимают место и отвлекают от единственного нужного действия.
  const showConsent = isEngaged || form.phone.length > 0 || form.name.length > 0;

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
            {/* Имя теперь спрашиваем до отправки, здесь остаётся только
                канал связи: он ни на что не влияет до звонка. */}
            <p className="muted inline-apply__hint">
              Где удобнее ответить? Необязательно.
            </p>
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
      <input
        className="ym-disable-keys inline-apply__name"
        autoComplete="name"
        aria-label={`Имя для отклика на вакансию ${vacancy.title}, ${vacancy.city}`}
        id={nameId}
        maxLength={80}
        minLength={2}
        placeholder="Как вас зовут"
        required
        value={form.name}
        onFocus={engage}
        onChange={(event) => form.setName(event.target.value)}
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
        {/* Кнопку не гасим из-за неотмеченного согласия: на детальной
            странице согласие видно сразу, и главная кнопка выглядела
            сломанной ещё до того, как человек что-то сделал. Пустое поле
            и неотмеченную галочку отсекает штатная проверка браузера. */}
        <button
          className="button-link inline-apply__submit"
          disabled={form.isSubmitting}
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
