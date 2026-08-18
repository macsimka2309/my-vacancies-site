"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getAttribution } from "@/lib/attribution";
import { reachGoal } from "@/lib/metrika";
import { getCallbackPromise } from "@/lib/callback";
import { formatProject } from "@/lib/project";

type ApplyVacancy = {
  id: string;
  title: string;
  project: string;
  city: string;
};

type ApplyButtonProps = {
  vacancy: ApplyVacancy;
};

type PreferredContact = "phone" | "telegram" | "max";

const CONTACT_OPTIONS: Array<{ value: PreferredContact; label: string }> = [
  { value: "phone", label: "Телефон" },
  { value: "telegram", label: "Telegram" },
  { value: "max", label: "MAX" },
];

type SubmitState =
  | {
      type: "idle";
      message: "";
    }
  | {
      type: "error";
      message: string;
    }
  | {
      type: "success";
      message: "";
    };

export function ApplyButton({ vacancy }: ApplyButtonProps) {
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] =
    useState<PreferredContact>("phone");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot — скрытое поле-ловушка для ботов.
  const [company, setCompany] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: "idle",
    message: "",
  });
  const dialogRef = useRef<HTMLElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  // Модалка рендерится только на клиенте, поэтому расхождения с SSR нет.
  const callbackPromise = getCallbackPromise();

  // Пока модалка открыта — блокируем прокрутку фона.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Доступность модалки: фокус внутрь при открытии, Escape для закрытия,
  // удержание фокуса внутри (focus trap) и возврат фокуса на кнопку при закрытии.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    (phoneInputRef.current ?? dialogRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeForm();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
    // closeForm стабильна в рамках открытого состояния; зависимость только от isOpen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function openForm() {
    reachGoal("application_form_open");
    setIsOpen(true);
    setConsent(false);
    setSubmitState({
      type: "idle",
      message: "",
    });
  }

  function closeForm() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitState({
      type: "idle",
      message: "",
    });

    const response = await fetch("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        preferredContact,
        telegramUsername:
          preferredContact === "telegram" ? telegramUsername : "",
        vacancyId: vacancy.id,
        consent,
        company,
        ...getAttribution(),
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setSubmitState({
        type: "error",
        message: result?.error ?? "Не удалось отправить отклик.",
      });
      return;
    }

    reachGoal("application_submit");
    setName("");
    setPhone("");
    setPreferredContact("phone");
    setTelegramUsername("");
    setConsent(false);
    setSubmitState({
      type: "success",
      message: "",
    });
  }

  return (
    <>
      <button className="button-link apply-button" type="button" onClick={openForm}>
        Откликнуться
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
        <div className="modal-backdrop" role="presentation" onMouseDown={closeForm}>
          <section
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-modal="true"
            className="apply-modal"
            role="dialog"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Закрыть форму"
              className="modal-close"
              type="button"
              onClick={closeForm}
            >
              ×
            </button>
            {submitState.type === "success" ? (
              <div className="apply-success" role="status">
                <span className="apply-success__icon" aria-hidden="true">
                  ✓
                </span>
                <h2 id={titleId}>Спасибо, отклик отправлен!</h2>
                <p className="muted">
                  {callbackPromise}. Держите телефон под рукой.
                </p>
                <button
                  className="button-link"
                  type="button"
                  onClick={closeForm}
                >
                  Хорошо
                </button>
              </div>
            ) : (
              <>
                <div className="apply-modal__header">
                  <p className="eyebrow">{formatProject(vacancy.project)}</p>
                  <h2 id={titleId}>Откликнуться</h2>
                  <p className="muted">
                    {vacancy.title}, {vacancy.city}
                  </p>
                </div>
                <form className="apply-form" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    style={{
                      position: "absolute",
                      left: "-9999px",
                      width: 1,
                      height: 1,
                      opacity: 0,
                    }}
                  />
                  <label className="apply-field">
                    <span>
                      Телефон
                      <span className="apply-field__req" aria-hidden="true">
                        *
                      </span>
                    </span>
                    <input
                      ref={phoneInputRef}
                      className="ym-disable-keys"
                      autoComplete="tel"
                      inputMode="tel"
                      name="phone"
                      placeholder="+7 (999) 999-99-99"
                      required
                      value={phone}
                      onChange={(event) =>
                        setPhone(formatPhone(event.target.value))
                      }
                    />
                  </label>
                  <label className="apply-field">
                    <span>Имя</span>
                    <input
                      className="ym-disable-keys"
                      autoComplete="name"
                      name="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <fieldset className="apply-field apply-contact">
                    <legend>Как удобнее связаться</legend>
                    <div className="apply-contact__options">
                      {CONTACT_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="apply-contact__option"
                          data-active={preferredContact === option.value}
                        >
                          <input
                            type="radio"
                            name="preferredContact"
                            value={option.value}
                            checked={preferredContact === option.value}
                            onChange={() => setPreferredContact(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {preferredContact === "telegram" ? (
                    <label className="apply-field">
                      <span>
                        Ник в Telegram
                        <span className="apply-field__req" aria-hidden="true">
                          *
                        </span>
                      </span>
                      <input
                        className="ym-disable-keys"
                        name="telegramUsername"
                        placeholder="@username"
                        required
                        value={telegramUsername}
                        onChange={(event) =>
                          setTelegramUsername(event.target.value)
                        }
                      />
                    </label>
                  ) : null}
                  <p className="apply-trust">
                    <span className="apply-trust__dot" aria-hidden="true" />
                    {callbackPromise}
                  </p>
                  <p className="apply-required-note">* — обязательное поле</p>
                  <label className="apply-consent">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={consent}
                      required
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    {/* Галочка остаётся обязательной: согласие на обработку и на
                        передачу через Telegram (зарубежный сервис) по 152-ФЗ
                        должно быть явным. Текст сокращён, детали — в политике. */}
                    <span>
                      Согласен(на) на обработку персональных данных и передачу
                      отклика нам через Telegram — зарубежный сервис.{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer">
                        Подробнее
                      </a>
                    </span>
                  </label>
                  {submitState.message ? (
                    <p
                      className={`form-message form-message--${submitState.type}`}
                    >
                      {submitState.message}
                    </p>
                  ) : null}
                  <div className="apply-form__actions">
                    <button
                      className="button-link"
                      disabled={isSubmitting || !consent}
                      type="submit"
                    >
                      {isSubmitting ? "Отправляем" : "Отправить"}
                    </button>
                    <button
                      className="secondary-link form-secondary-button"
                      type="button"
                      onClick={closeForm}
                    >
                      Закрыть
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const nationalDigits = getNationalDigits(digits).slice(0, 10);
  const parts = [
    nationalDigits.slice(0, 3),
    nationalDigits.slice(3, 6),
    nationalDigits.slice(6, 8),
    nationalDigits.slice(8, 10),
  ];

  if (!nationalDigits) {
    return "";
  }

  let formattedPhone = `+7 (${parts[0]}`;

  if (parts[0].length === 3) {
    formattedPhone += ")";
  }

  if (parts[1]) {
    formattedPhone += ` ${parts[1]}`;
  }

  if (parts[2]) {
    formattedPhone += `-${parts[2]}`;
  }

  if (parts[3]) {
    formattedPhone += `-${parts[3]}`;
  }

  return formattedPhone;
}

function getNationalDigits(digits: string) {
  if (digits.startsWith("7") || digits.startsWith("8")) {
    return digits.slice(1);
  }

  return digits;
}
