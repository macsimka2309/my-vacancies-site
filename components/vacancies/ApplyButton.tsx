"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { site } from "@/lib/site";

type ApplyVacancy = {
  id: string;
  title: string;
  project: string;
  city: string;
};

type ApplyButtonProps = {
  vacancy: ApplyVacancy;
};

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
  const [consent, setConsent] = useState(false);
  // Honeypot — скрытое поле-ловушка для ботов.
  const [company, setCompany] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: "idle",
    message: "",
  });

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

  function openForm() {
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
        vacancyId: vacancy.id,
        consent,
        company,
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

    setName("");
    setPhone("");
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
            aria-labelledby={titleId}
            aria-modal="true"
            className="apply-modal"
            role="dialog"
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
                  {site.callbackPromise}. Держите телефон под рукой.
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
                  <p className="eyebrow">{vacancy.project}</p>
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
                    <span>Имя</span>
                    <input
                      autoComplete="name"
                      minLength={2}
                      name="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label className="apply-field">
                    <span>Телефон</span>
                    <input
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
                  <p className="apply-trust">
                    <span className="apply-trust__dot" aria-hidden="true" />
                    {site.callbackPromise}
                  </p>
                  <label className="apply-consent">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={consent}
                      required
                      onChange={(event) => setConsent(event.target.checked)}
                    />
                    <span>
                      Я даю согласие на обработку моих персональных данных (имени и
                      номера телефона) и соглашаюсь, что мой отклик поступит
                      работодателю через зарубежный сервис Telegram. С{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer">
                        политикой конфиденциальности
                      </a>{" "}
                      ознакомлен(а)
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
