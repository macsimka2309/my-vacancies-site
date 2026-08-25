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
type FilterKey = "statuses" | "sources" | "projects" | "cities" | "vacancyIds";

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
 * Всё убрано в одну строку выпадающих кнопок. Развёрнутыми наборами фишек
 * это занимало пять этажей — один статус разворачивался в четыре ряда, —
 * и таблица уезжала за нижний край экрана.
 *
 * Что выбрано, видно и со свёрнутыми списками: число на кнопке и строка
 * фишек под ней. Убрать значение можно, не открывая ничего.
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
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const barRef = useRef<HTMLDivElement>(null);

  // Фильтры могли смениться извне — «Сбросить» или кнопкой «назад».
  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Клик мимо и Escape закрывают открытый список: иначе он висит поверх
  // таблицы и мешает читать то, ради чего фильтровали.
  useEffect(() => {
    if (!openKey) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenKey(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenKey(null);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  function apply(next: Filters, immediate = true) {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => router.push(buildAdminUrl(next)),
      immediate ? 0 : APPLY_DELAY_MS,
    );
  }

  const statusOptions = LEAD_STATUS_OPTIONS.map((item) => ({
    label: item.label,
    value: item.value,
  }));
  const sourceOptions = SOURCE_BUCKETS.map((item) => ({
    label: item.label,
    value: item.value,
  }));
  const cityOptions = [{ label: "Не указан", value: CITY_NOT_SET }, ...cities];

  // Приведение нужно из-за объединения типов: `statuses` и `sources` —
  // массивы своих литералов, и общий элемент у них TypeScript видит как
  // `never`. Значения при этом уже проверены разбором адреса.
  function toggle(key: FilterKey, value: string) {
    apply({
      ...draft,
      [key]: toggleValue(draft[key] as string[], value),
    } as Filters);
  }

  const dropdowns = [
    { key: "statuses" as const, label: "Статус", options: statusOptions, search: false },
    { key: "sources" as const, label: "Источник", options: sourceOptions, search: false },
    { key: "projects" as const, label: "Проект", options: projects, search: false },
    { key: "cities" as const, label: "Город", options: cityOptions, search: true },
    { key: "vacancyIds" as const, label: "Вакансия", options: vacancies, search: true },
  ];

  const chosen = dropdowns.flatMap((item) =>
    item.options
      .filter((option) => (draft[item.key] as string[]).includes(option.value))
      .map((option) => ({ ...option, key: item.key, group: item.label })),
  );
  const active = hasActiveFilters(draft) || Boolean(draft.query);

  return (
    <section aria-label="Фильтры откликов" className="admin-filters">
      <div className="admin-filters__bar" ref={barRef}>
        <input
          aria-label="Поиск по откликам"
          className="admin-filters__search"
          onChange={(event) =>
            apply({ ...draft, query: event.target.value }, false)
          }
          placeholder="Имя, телефон, примечание…"
          type="search"
          value={draft.query}
        />
        {dropdowns.map((item) => (
          <FilterDropdown
            count={draft[item.key].length}
            isOpen={openKey === item.key}
            key={item.key}
            label={item.label}
            onToggle={(value) => toggle(item.key, value)}
            onToggleOpen={() =>
              setOpenKey(openKey === item.key ? null : item.key)
            }
            options={item.options}
            selected={draft[item.key]}
            withSearch={item.search}
          />
        ))}
        <p className="muted admin-filters__count">
          {active ? `Показано ${found} из ${total}` : `Всего: ${total}`}
        </p>
        <a className="admin-save" href="/admin/applications/new">
          Создать отклик
        </a>
      </div>

      {chosen.length > 0 ? (
        <div className="admin-filters__chosen">
          {chosen.map((option) => (
            <span className="city-token" key={`${option.key}:${option.value}`}>
              {option.label}
              <button
                aria-label={`Убрать: ${option.group} — ${option.label}`}
                onClick={() => toggle(option.key, option.value)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          <a className="secondary-link" href="/admin">
            Сбросить всё
          </a>
        </div>
      ) : null}
    </section>
  );
}

function FilterDropdown({
  count,
  isOpen,
  label,
  onToggle,
  onToggleOpen,
  options,
  selected,
  withSearch,
}: {
  count: number;
  isOpen: boolean;
  label: string;
  onToggle: (value: string) => void;
  onToggleOpen: () => void;
  options: Option[];
  selected: string[];
  withSearch: boolean;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("ru-RU");
  const visible = useMemo(() => {
    const matched = options.filter(
      (option) =>
        !query || option.label.toLocaleLowerCase("ru-RU").includes(query),
    );

    // Короткий список показываем целиком: там шесть-семь значений, и
    // обрезать их незачем. Длинный — по частям, иначе 169 вакансий.
    return withSearch ? matched.slice(0, SUGGESTIONS_LIMIT) : matched;
  }, [options, query, withSearch]);

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  return (
    <div className="admin-filters__drop">
      <button
        aria-expanded={isOpen}
        className="admin-filters__trigger"
        data-on={count ? "" : undefined}
        onClick={onToggleOpen}
        type="button"
      >
        {label}
        {count ? <span className="admin-filters__badge">{count}</span> : null}
        <span aria-hidden="true">▾</span>
      </button>
      {isOpen ? (
        <div aria-label={label} className="admin-filters__menu" role="group">
          {withSearch ? (
            <input
              aria-label={`Поиск: ${label}`}
              autoFocus
              className="admin-filters__menu-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Начните вводить…"
              type="search"
              value={search}
            />
          ) : null}
          <div className="filter-chips">
            {visible.length > 0 ? (
              visible.map((option) => {
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
              })
            ) : (
              <p className="filter-chips__empty">Ничего не найдено</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
