"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

const COMMENT_LIMIT = 2000;
/** Сколько держим отметку «Сохранено», прежде чем убрать её с глаз. */
const SAVED_BADGE_MS = 2000;

type SaveState = "idle" | "saving" | "saved" | "error";

type ApplicationRowFieldsProps = {
  id: string;
  candidateName: string;
  status: string;
  managerComment: string;
};

/**
 * Статус и примечание, которые сохраняются сами.
 *
 * Раньше в каждой строке была кнопка «Сохранить» в последней колонке. При
 * девяти колонках до неё приходилось доезжать вбок, и это на каждую правку.
 * Теперь запись уходит по выходу из поля: у списка статусов — сразу при
 * выборе, у примечания — когда из него уходит фокус.
 *
 * Отдельно про отметку справа: без неё автосохранение пугает. Человек не
 * нажимал кнопку и не знает, дошло ли. Поэтому состояние показывается
 * всегда, а ошибка не исчезает сама — с ней надо что-то сделать.
 */
export function ApplicationRowFields({
  id,
  candidateName,
  status: initialStatus,
  managerComment: initialComment,
}: ApplicationRowFieldsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [comment, setComment] = useState(initialComment);
  const [state, setState] = useState<SaveState>("idle");
  // Что уже лежит в базе. Сравниваем с этим, чтобы уход из нетронутого
  // поля не порождал запрос и запись в журнале изменений.
  const saved = useRef({ status: initialStatus, comment: initialComment });
  const alive = useRef(true);

  useEffect(() => {
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (state !== "saved") {
      return;
    }

    const timer = setTimeout(() => {
      if (alive.current) {
        setState("idle");
      }
    }, SAVED_BADGE_MS);

    return () => clearTimeout(timer);
  }, [state]);

  async function save(next: { status: string; comment: string }) {
    if (
      next.status === saved.current.status &&
      next.comment === saved.current.comment
    ) {
      return;
    }

    setState("saving");

    try {
      const response = await fetch(`/admin/applications/${id}/status`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: next.status,
          managerComment: next.comment,
        }),
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      saved.current = next;

      if (!alive.current) {
        return;
      }

      setState("saved");
      // Сводка сверху считает статусы по всей базе — без обновления она
      // разошлась бы с тем, что человек только что поменял в строке.
      router.refresh();
    } catch {
      if (alive.current) {
        setState("error");
      }
    }
  }

  return (
    <>
      <td>
        <select
          aria-label={`Статус отклика ${candidateName}`}
          name="status"
          onBlur={() => save({ status, comment })}
          onChange={(event) => {
            setStatus(event.target.value);
            save({ status: event.target.value, comment });
          }}
          value={status}
        >
          {LEAD_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="admin-autosave">
          <textarea
            aria-label={`Примечание к отклику ${candidateName}`}
            maxLength={COMMENT_LIMIT}
            name="managerComment"
            onBlur={() => save({ status, comment })}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Добавить примечание"
            rows={2}
            value={comment}
          />
          <SaveBadge state={state} />
        </div>
      </td>
    </>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "idle") {
    return null;
  }

  const labels: Record<Exclude<SaveState, "idle">, string> = {
    error: "Не сохранилось — проверьте связь",
    saved: "Сохранено",
    saving: "Сохраняю…",
  };

  return (
    <p className="admin-autosave__state" data-state={state} role="status">
      {labels[state]}
    </p>
  );
}
