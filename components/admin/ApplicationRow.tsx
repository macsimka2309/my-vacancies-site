"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

const COMMENT_LIMIT = 2000;
const NAME_LIMIT = 120;
/** Сколько держим отметку «Сохранено», прежде чем убрать её с глаз. */
const SAVED_BADGE_MS = 2000;

type SaveState = "idle" | "saving" | "saved" | "error";

type Editable = {
  candidateName: string;
  city: string;
  managerComment: string;
  status: string;
};

type ApplicationRowProps = Editable & {
  id: string;
  cities: string[];
  createdLabel: string;
  phone: string;
  project: string;
  sourceLabel: string;
  telegramLabel: string;
  vacancyTitle: string;
};

/**
 * Строка отклика целиком: часть полей правится прямо здесь и сохраняется
 * сама, по выходу из поля.
 *
 * Почему строка клиентская целиком, а не отдельные ячейки: правятся имя,
 * город, статус и примечание — то есть четыре ячейки из восьми, и они не
 * идут подряд. Разрезать это на два компонента с общим состоянием дороже,
 * чем отдать строку целиком.
 *
 * Телефон показан, но не редактируется — см. комментарий в маршруте
 * `update/route.ts`: это ключ проверки дублей.
 */
export function ApplicationRow({
  candidateName: initialName,
  cities,
  city: initialCity,
  createdLabel,
  id,
  managerComment: initialComment,
  phone,
  project,
  sourceLabel,
  status: initialStatus,
  telegramLabel,
  vacancyTitle,
}: ApplicationRowProps) {
  const router = useRouter();
  const [fields, setFields] = useState<Editable>({
    candidateName: initialName,
    city: initialCity,
    managerComment: initialComment,
    status: initialStatus,
  });
  const [state, setState] = useState<SaveState>("idle");
  // Что уже лежит в базе. Сравниваем с этим, чтобы уход из нетронутого
  // поля не порождал запрос и запись в журнале изменений.
  const saved = useRef<Editable>({
    candidateName: initialName,
    city: initialCity,
    managerComment: initialComment,
    status: initialStatus,
  });
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

  async function save(next: Editable) {
    const unchanged = (Object.keys(next) as Array<keyof Editable>).every(
      (key) => next[key] === saved.current[key],
    );

    if (unchanged) {
      return;
    }

    setState("saving");

    try {
      const response = await fetch(`/admin/applications/${id}/update`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      const result = (await response.json()) as { candidateName?: string };
      // Очищенное имя сервер возвращает как «Без имени» — показываем то,
      // что действительно сохранилось, а не пустое поле.
      const stored = { ...next, candidateName: result.candidateName ?? next.candidateName };

      saved.current = stored;

      if (!alive.current) {
        return;
      }

      setFields(stored);
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

  function update(patch: Partial<Editable>, saveNow = false) {
    const next = { ...fields, ...patch };

    setFields(next);

    if (saveNow) {
      save(next);
    }
  }

  return (
    <tr>
      <td>
        <input
          aria-label="Имя кандидата"
          className="admin-row__name"
          maxLength={NAME_LIMIT}
          onBlur={() => save(fields)}
          onChange={(event) => update({ candidateName: event.target.value })}
          placeholder="Без имени"
          type="text"
          value={fields.candidateName}
        />
        <a href={`tel:${phone}`}>{phone}</a>
      </td>
      <td>
        <strong>{vacancyTitle}</strong>
        <span>{project}</span>
      </td>
      <td>
        <select
          aria-label="Город кандидата"
          onBlur={() => save(fields)}
          onChange={(event) => update({ city: event.target.value }, true)}
          value={fields.city}
        >
          <option value="">Не указан</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </td>
      <td>{sourceLabel}</td>
      <td>
        <select
          aria-label="Статус отклика"
          onBlur={() => save(fields)}
          onChange={(event) => update({ status: event.target.value }, true)}
          value={fields.status}
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
            aria-label="Примечание к отклику"
            maxLength={COMMENT_LIMIT}
            onBlur={() => save(fields)}
            onChange={(event) => update({ managerComment: event.target.value })}
            placeholder="Добавить примечание"
            rows={2}
            value={fields.managerComment}
          />
          <SaveBadge state={state} />
        </div>
      </td>
      <td>{telegramLabel}</td>
      <td>{createdLabel}</td>
    </tr>
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
