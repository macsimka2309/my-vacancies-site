"use client";

import { FormEvent, useId, useState } from "react";
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
    };

export function ApplyButton({ vacancy }: ApplyButtonProps) {
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    type: "idle",
    message: "",
  });

  function openForm() {
    setIsOpen(true);
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
    setSubmitState({
      type: "idle",
      message: "",
    });
    setIsOpen(false);
  }

  return (
    <>
      <button className="button-link apply-button" type="button" onClick={openForm}>
        Откликнуться
      </button>

      {isOpen ? (
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
            <div className="apply-modal__header">
              <p className="eyebrow">{vacancy.project}</p>
              <h2 id={titleId}>Откликнуться</h2>
              <p className="muted">
                {vacancy.title}, {vacancy.city}
              </p>
            </div>
            <form className="apply-form" onSubmit={handleSubmit}>
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
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                />
              </label>
              <p className="apply-trust">
                <span className="apply-trust__dot" aria-hidden="true" />
                {site.callbackPromise}
              </p>
              {submitState.message ? (
                <p className={`form-message form-message--${submitState.type}`}>
                  {submitState.message}
                </p>
              ) : null}
              <div className="apply-form__actions">
                <button
                  className="button-link"
                  disabled={isSubmitting}
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
          </section>
        </div>
      ) : null}
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
