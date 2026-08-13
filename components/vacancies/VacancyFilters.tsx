"use client";

import Link from "next/link";
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
  const [citySearch, setCitySearch] = useState("");
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

    if (next.title) {
      params.set("title", next.title);
    }

    if (next.project) {
      params.set("project", next.project);
    }

    for (const city of next.cities ?? []) {
      params.append("city", city);
    }

    if (next.salaryFrom) {
      params.set("salaryFrom", String(next.salaryFrom));
      params.set("salaryBasis", next.salaryBasis ?? "shift");
    }

    const query = params.toString();

    router.push(query ? `/?${query}` : "/");
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
    router.push("/");
  }

  function toggleCity(city: string) {
    const current = selectedFilters.cities ?? [];
    const next = current.includes(city)
      ? current.filter((value) => value !== city)
      : [...current, city];

    applyFilters({ ...selectedFilters, cities: next.length ? next : undefined });
  }

  const selectedCities = selectedFilters.cities ?? [];
  const cityQuery = citySearch.trim().toLowerCase();
  const visibleCities = cityQuery
    ? options.cities.filter(
        (city) =>
          selectedCities.includes(city) ||
          city.toLowerCase().includes(cityQuery),
      )
    : options.cities;
  const hasActiveFilters = Boolean(
    selectedFilters.title ||
      selectedFilters.project ||
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
        <div className="filter-field">
          <span>Город</span>
          {options.cities.length > 12 ? (
            <input
              className="city-search"
              type="search"
              inputMode="search"
              placeholder="Поиск города…"
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              aria-label="Поиск города"
            />
          ) : null}
          <div className="filter-chips" role="group" aria-label="Города">
            {visibleCities.length > 0 ? (
              visibleCities.map((city) => {
                const active = selectedCities.includes(city);

                return (
                  <button
                    key={city}
                    type="button"
                    className="filter-chip"
                    data-active={active}
                    aria-pressed={active}
                    onClick={() => toggleCity(city)}
                  >
                    {city}
                  </button>
                );
              })
            ) : (
              <p className="filter-chips__empty">Город не найден</p>
            )}
          </div>
        </div>
        <FilterSelect
          label="Вакансия"
          placeholder="Все вакансии"
          options={options.titles}
          value={selectedFilters.title ?? ""}
          onChange={(value) =>
            applyFilters({ ...selectedFilters, title: value || undefined })
          }
        />
        <FilterSelect
          label="Проект"
          placeholder="Все проекты"
          options={options.projects}
          value={selectedFilters.project ?? ""}
          onChange={(value) =>
            applyFilters({ ...selectedFilters, project: value || undefined })
          }
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

type FilterSelectProps = {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

function FilterSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
