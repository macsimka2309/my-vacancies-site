"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { VacancyFilterOptions, VacancyFilters } from "@/lib/vacancies";

const SALARY_STEP = 5000;
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
  const applyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const formId = useId();

  // Синхронизируем локальное значение зарплаты, если фильтр сменился извне
  // (например, кнопкой «Сбросить» или навигацией назад).
  useEffect(() => {
    setSalaryFrom(selectedFilters.salaryFrom ?? 0);
  }, [selectedFilters.salaryFrom]);

  useEffect(() => () => clearTimeout(applyTimer.current), []);

  function applyFilters(next: VacancyFilters) {
    const params = new URLSearchParams();

    if (next.title) {
      params.set("title", next.title);
    }

    if (next.project) {
      params.set("project", next.project);
    }

    if (next.salaryFrom) {
      params.set("salaryFrom", String(next.salaryFrom));
    }

    const query = params.toString();

    router.push(query ? `/?${query}` : "/");
  }

  // Поле и слайдер меняют значение мгновенно, а навигацию откладываем,
  // чтобы не дёргать список на каждый символ/тик слайдера.
  function changeSalary(value: number) {
    const clamped = Math.max(0, Math.min(value, options.salaryMax));

    setSalaryFrom(clamped);
    clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(() => {
      applyFilters({ ...selectedFilters, salaryFrom: clamped || undefined });
    }, APPLY_DELAY_MS);
  }

  function resetFilters() {
    clearTimeout(applyTimer.current);
    setSalaryFrom(0);
    router.push("/");
  }

  const hasActiveFilters = Boolean(
    selectedFilters.title || selectedFilters.project || salaryFrom,
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
        {options.salaryMax > 0 ? (
          <div className="filter-field salary-filter">
            <span>Зарплата от</span>
            <div className="salary-input-wrap">
              <input
                className="salary-input"
                inputMode="numeric"
                aria-label="Зарплата от, рублей в месяц"
                placeholder="Любая"
                value={salaryFrom ? formatNumber(salaryFrom) : ""}
                onChange={(event) =>
                  changeSalary(parseDigits(event.target.value))
                }
              />
              <span className="salary-input-suffix">₽/мес</span>
            </div>
            <input
              className="salary-range"
              type="range"
              min={0}
              max={options.salaryMax}
              step={SALARY_STEP}
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
