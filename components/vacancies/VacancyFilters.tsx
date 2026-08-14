"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type {
  SalaryBasis,
  VacancyFilterOptions,
  VacancyFilters,
} from "@/lib/vacancies";

const SALARY_STEP: Record<SalaryBasis, number> = { shift: 500, vahta: 5000 };
const SALARY_BASIS_LABEL: Record<SalaryBasis, string> = {
  shift: "За смену",
  vahta: "За вахту",
};
const SALARY_SUFFIX: Record<SalaryBasis, string> = {
  shift: "₽/смена",
  vahta: "₽/вахта",
};
const APPLY_DELAY_MS = 400;

type VacancyFiltersProps = {
  options: VacancyFilterOptions;
  resultCount: number;
  selectedFilters: VacancyFilters;
};

export function VacancyFiltersPanel({
  options,
  resultCount,
  selectedFilters,
}: VacancyFiltersProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [salaryFrom, setSalaryFrom] = useState(selectedFilters.salaryFrom ?? 0);
  const [salaryBasis, setSalaryBasis] = useState<SalaryBasis>(
    selectedFilters.salaryBasis ?? "shift",
  );
  const applyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const formId = useId();

  // Синхронизируем локальные значения зарплаты, если фильтр сменился извне
  // (например, кнопкой «Сбросить» или навигацией назад).
  useEffect(() => {
    setSalaryFrom(selectedFilters.salaryFrom ?? 0);
  }, [selectedFilters.salaryFrom]);

  useEffect(() => {
    if (selectedFilters.salaryBasis) {
      setSalaryBasis(selectedFilters.salaryBasis);
    }
  }, [selectedFilters.salaryBasis]);

  useEffect(() => () => clearTimeout(applyTimer.current), []);

  function applyFilters(next: VacancyFilters) {
    const params = new URLSearchParams();

    for (const title of next.titles ?? []) {
      params.append("title", title);
    }

    for (const project of next.projects ?? []) {
      params.append("project", project);
    }

    for (const city of next.cities ?? []) {
      params.append("city", city);
    }

    if (next.salaryFrom) {
      params.set("salaryFrom", String(next.salaryFrom));
      params.set("salaryBasis", next.salaryBasis ?? "shift");
    }

    const query = params.toString();

    // scroll: false — иначе Next.js прокручивает страницу наверх при каждом
    // изменении фильтра (особенно заметно в мобильной версии).
    router.push(query ? `/?${query}` : "/", { scroll: false });
  }

  // Поле и слайдер меняют значение мгновенно, а навигацию откладываем,
  // чтобы не дёргать список на каждый символ/тик слайдера.
  function changeSalary(value: number) {
    const clamped = Math.max(0, Math.min(value, options.salaryMax[salaryBasis]));

    setSalaryFrom(clamped);
    clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(() => {
      applyFilters({
        ...selectedFilters,
        salaryBasis,
        salaryFrom: clamped || undefined,
      });
    }, APPLY_DELAY_MS);
  }

  // Смена типа зарплаты: шкала другая, поэтому сбрасываем порог.
  function changeSalaryBasis(basis: SalaryBasis) {
    if (basis === salaryBasis) {
      return;
    }

    clearTimeout(applyTimer.current);
    setSalaryBasis(basis);
    setSalaryFrom(0);

    if (selectedFilters.salaryFrom) {
      applyFilters({
        ...selectedFilters,
        salaryBasis: basis,
        salaryFrom: undefined,
      });
    }
  }

  function resetFilters() {
    clearTimeout(applyTimer.current);
    setSalaryFrom(0);
    router.push("/", { scroll: false });
  }

  function toggleValue(
    key: "titles" | "projects" | "cities",
    value: string,
  ) {
    const current = selectedFilters[key] ?? [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

    applyFilters({ ...selectedFilters, [key]: next.length ? next : undefined });
  }

  const selectedTitles = selectedFilters.titles ?? [];
  const selectedProjects = selectedFilters.projects ?? [];
  const selectedCities = selectedFilters.cities ?? [];
  const hasActiveFilters = Boolean(
    selectedTitles.length ||
      selectedProjects.length ||
      selectedCities.length ||
      salaryFrom,
  );

  return (
    <aside className="filters-panel" aria-label="Фильтры вакансий">
      <div className="filters-heading">
        <div className="filters-heading__row">
          <h2>Фильтры</h2>
          <button
            type="button"
            className="filters-toggle"
            aria-expanded={isOpen}
            aria-controls={formId}
            onClick={() => setIsOpen((value) => !value)}
          >
            {isOpen ? "Скрыть" : "Показать"}
          </button>
        </div>
        <p>{formatVacancyCount(resultCount)}</p>
      </div>
      <div id={formId} className="filters-form" data-open={isOpen}>
        <MultiSelectField
          label="Город"
          noun="город"
          options={options.cities}
          selected={selectedCities}
          onToggle={(value) => toggleValue("cities", value)}
        />
        <MultiSelectField
          label="Вакансия"
          noun="вакансию"
          options={options.titles}
          selected={selectedTitles}
          onToggle={(value) => toggleValue("titles", value)}
        />
        <MultiSelectField
          label="Проект"
          noun="проект"
          options={options.projects}
          selected={selectedProjects}
          onToggle={(value) => toggleValue("projects", value)}
        />
        {options.salaryMax.shift > 0 || options.salaryMax.vahta > 0 ? (
          <div className="filter-field salary-filter">
            <span>Зарплата от</span>
            <div className="salary-basis" role="group" aria-label="Тип зарплаты">
              {(["shift", "vahta"] as const).map((basis) => (
                <button
                  key={basis}
                  type="button"
                  className="salary-basis__option"
                  data-active={salaryBasis === basis}
                  aria-pressed={salaryBasis === basis}
                  onClick={() => changeSalaryBasis(basis)}
                >
                  {SALARY_BASIS_LABEL[basis]}
                </button>
              ))}
            </div>
            <div className="salary-input-wrap">
              <input
                className="salary-input"
                inputMode="numeric"
                aria-label={`Зарплата от, ${SALARY_BASIS_LABEL[
                  salaryBasis
                ].toLowerCase()}`}
                placeholder="Любая"
                value={salaryFrom ? formatNumber(salaryFrom) : ""}
                onChange={(event) =>
                  changeSalary(parseDigits(event.target.value))
                }
              />
              <span className="salary-input-suffix">
                {SALARY_SUFFIX[salaryBasis]}
              </span>
            </div>
            <input
              className="salary-range"
              type="range"
              min={0}
              max={options.salaryMax[salaryBasis]}
              step={SALARY_STEP[salaryBasis]}
              value={salaryFrom}
              aria-label="Зарплата от"
              onChange={(event) => changeSalary(Number(event.target.value))}
            />
          </div>
        ) : null}
        {hasActiveFilters ? (
          <div className="filter-actions">
            <button
              type="button"
              className="secondary-link"
              onClick={resetFilters}
            >
              Сбросить
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function parseDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits ? Number(digits) : 0;
}

function formatVacancyCount(count: number) {
  const pluralRules = new Intl.PluralRules("ru-RU");
  const words: Record<string, string> = {
    zero: "вакансий",
    one: "вакансия",
    two: "вакансии",
    few: "вакансии",
    many: "вакансий",
    other: "вакансии",
  };

  const word = words[pluralRules.select(count)] ?? words.other;

  return `Найдено ${count} ${word}`;
}

type MultiSelectFieldProps = {
  label: string;
  /** Существительное в винительном падеже для плейсхолдеров («город», «вакансию»). */
  noun: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

// Токен-поле с множественным выбором: выбранные значения — чипами в строке
// поиска, доступные — прокручиваемым списком чипов под ней.
function MultiSelectField({
  label,
  noun,
  options,
  selected,
  onToggle,
}: MultiSelectFieldProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const available = options.filter(
    (option) =>
      !selected.includes(option) &&
      (query ? option.toLowerCase().includes(query) : true),
  );

  return (
    <div className="filter-field">
      <span>{label}</span>
      <div className="city-select">
        {selected.map((value) => (
          <span className="city-token" key={value}>
            {value}
            <button
              type="button"
              aria-label={`Убрать: ${value}`}
              onClick={() => onToggle(value)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="city-select__input"
          type="search"
          inputMode="search"
          placeholder={selected.length ? "Ещё…" : `Поиск: ${noun}…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={`Поиск: ${label}`}
        />
      </div>
      <div
        className="filter-chips"
        role="group"
        aria-label={`Доступные значения: ${label}`}
      >
        {available.length > 0 ? (
          available.map((value) => (
            <button
              key={value}
              type="button"
              className="filter-chip"
              onClick={() => onToggle(value)}
            >
              {value}
            </button>
          ))
        ) : (
          <p className="filter-chips__empty">
            {search ? "Ничего не найдено" : "Все значения выбраны"}
          </p>
        )}
      </div>
    </div>
  );
}
