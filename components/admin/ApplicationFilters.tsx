"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAdminUrl,
  CITY_NOT_SET,
  hasActiveFilters,
  toggleValue,
  type ApplicationFilters as Filters,
} from "@/lib/application-filters";
import { SOURCE_BUCKETS } from "@/lib/application-source";
import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

/** Столько вариантов показываем в списке под поиском. */
const SUGGESTIONS_LIMIT = 12;
/** Пауза перед переходом: набирающий в поиске не должен ждать после каждой буквы. */
const APPLY_DELAY_MS = 400;

type Option = { value: string; label: string };

type ApplicationFiltersProps = {
  cities: Option[];
  filters: Filters;
  found: number;
  projects: Option[];
  total: number;
  vacancies: Option[];
};

/**
 * Фильтры списка откликов (п. 41).
 *
 * Каждый фильтр — набор значений: «покажи всё, до чего не дошли руки» это
 * «Новый ИЛИ Недозвон ИЛИ В работе», и одним значением так не спросишь.
 *
 * Короткие списки — статус, источник, проект — набором фишек: вариантов
 * шесть-семь, и они все видны сразу. Город и вакансия — с поиском: их 78
 * и 169, листать такое нечем.
 *
 * Условия живут в адресе, поэтому отобранный список можно переслать
 * и открыть заново. Кнопки «Применить» нет: переход происходит сам,
 * с паузой, чтобы не дёргать страницу на каждую букву.
 */
export function ApplicationFilters({
  cities,
  filters,
  found,
  projects,
  total,
  vacancies,
}: ApplicationFiltersProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(filters);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Фильтры могли смениться извне — «Сбросить» или кнопкой «назад».
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(next: Filters, immediate = true) {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => router.push(buildAdminUrl(next)),
      immediate ? 0 : APPLY_DELAY_MS,
    );
  }

  const active = hasActiveFilters(draft) || Boolean(draft.query);

  return (
    <section aria-label="Фильтры откликов" className="admin-filters">
      <div className="admin-filters__row">
        <label className="admin-filters__field">
          <span>Поиск</span>
          <input
            onChange={(event) =>
              apply({ ...draft, query: event.target.value }, false)
            }
            placeholder="Имя, телефон, примечание…"
            type="search"
            value={draft.query}
          />
        </label>
        <ChipFilter
          label="Статус"
          onToggle={(value) =>
            apply({
              ...draft,
              statuses: toggleValue(draft.statuses, value) as Filters["statuses"],
            })
          }
          options={LEAD_STATUS_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          selected={draft.statuses}
        />
        <ChipFilter
          label="Источник"
          onToggle={(value) =>
            apply({
              ...draft,
              sources: toggleValue(draft.sources, value) as Filters["sources"],
            })
          }
          options={SOURCE_BUCKETS.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          selected={draft.sources}
        />
        <ChipFilter
          label="Проект"
          onToggle={(value) =>
            apply({ ...draft, projects: toggleValue(draft.projects, value) })
          }
          options={projects}
          selected={draft.projects}
        />
      </div>

      <div className="admin-filters__row admin-filters__row--wide">
        <SearchFilter
          label="Город"
          noun="город"
          onToggle={(value) =>
            apply({ ...draft, cities: toggleValue(draft.cities, value) })
          }
          options={[{ label: "Не указан", value: CITY_NOT_SET }, ...cities]}
          selected={draft.cities}
        />
        <SearchFilter
          label="Вакансия"
          noun="вакансия"
          onToggle={(value) =>
            apply({ ...draft, vacancyIds: toggleValue(draft.vacancyIds, value) })
          }
          options={vacancies}
          selected={draft.vacancyIds}
        />
      </div>

      <div className="admin-filters__actions">
        <p className="muted">
          {active ? `Показано ${found} из ${total}` : `Всего откликов: ${total}`}
        </p>
        {active ? (
          <a className="secondary-link" href="/admin">
            Сбросить всё
          </a>
        ) : null}
        <a className="admin-save" href="/admin/applications/new">
          Создать отклик
        </a>
      </div>
    </section>
  );
}

/** Короткий список: все варианты видны сразу, выбранные подсвечены. */
function ChipFilter({
  label,
  onToggle,
  options,
  selected,
}: {
  label: string;
  onToggle: (value: string) => void;
  options: Option[];
  selected: string[];
}) {
  return (
    <div className="admin-filters__field">
      <span>{label}</span>
      <div className="filter-chips" role="group" aria-label={label}>
        {options.map((option) => {
          const isOn = selected.includes(option.value);

          return (
            <button
              aria-pressed={isOn}
              className="filter-chip"
              data-on={isOn ? "" : undefined}
              key={option.value}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Длинный список: сначала поиск, потом варианты. Выбранное — фишками сверху. */
function SearchFilter({
  label,
  noun,
  onToggle,
  options,
  selected,
}: {
  label: string;
  noun: string;
  onToggle: (value: string) => void;
  options: Option[];
  selected: string[];
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("ru-RU");
  const available = useMemo(
    () =>
      options
        .filter((option) => !selected.includes(option.value))
        .filter(
          (option) =>
            !query || option.label.toLocaleLowerCase("ru-RU").includes(query),
        )
        .slice(0, SUGGESTIONS_LIMIT),
    [options, query, selected],
  );
  const chosen = options.filter((option) => selected.includes(option.value));

  return (
    <div className="admin-filters__field">
      <span>{label}</span>
      <div className="city-select">
        {chosen.map((option) => (
          <span className="city-token" key={option.value}>
            {option.label}
            <button
              aria-label={`Убрать: ${option.label}`}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              ×
            </button>
          </span>
        ))}
        <input
          aria-label={`Поиск: ${label}`}
          className="city-select__input"
          inputMode="search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={chosen.length ? "Ещё…" : `Поиск: ${noun}…`}
          type="search"
          value={search}
        />
      </div>
      <div
        aria-label={`Доступные значения: ${label}`}
        className="filter-chips"
        role="group"
      >
        {available.length > 0 ? (
          available.map((option) => (
            <button
              className="filter-chip"
              key={option.value}
              onClick={() => {
                onToggle(option.value);
                setSearch("");
              }}
              type="button"
            >
              {option.label}
            </button>
          ))
        ) : (
          <p className="filter-chips__empty">
            {query ? "Ничего не найдено" : "Все значения выбраны"}
          </p>
        )}
      </div>
    </div>
  );
}
