"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { VacancyFilterOptions, VacancyFilters } from "@/lib/vacancies";

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
  const formId = useId();

  // Любое изменение фильтра сразу перестраивает список (без кнопки «Показать»).
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

  const hasActiveFilters = Boolean(
    selectedFilters.title ||
      selectedFilters.project ||
      selectedFilters.salaryFrom,
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
        {options.salaryPresets.length > 0 ? (
          <div className="filter-field">
            <span>Зарплата от</span>
            <div className="salary-chips" role="group" aria-label="Зарплата от">
              <SalaryChip
                active={!selectedFilters.salaryFrom}
                label="Любая"
                onClick={() =>
                  applyFilters({ ...selectedFilters, salaryFrom: undefined })
                }
              />
              {options.salaryPresets.map((preset) => (
                <SalaryChip
                  key={preset}
                  active={selectedFilters.salaryFrom === preset}
                  label={`от ${formatSalary(preset)}`}
                  onClick={() =>
                    applyFilters({ ...selectedFilters, salaryFrom: preset })
                  }
                />
              ))}
            </div>
          </div>
        ) : null}
        {hasActiveFilters ? (
          <div className="filter-actions">
            <Link className="secondary-link" href="/">
              Сбросить
            </Link>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function formatSalary(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
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

type SalaryChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function SalaryChip({ active, label, onClick }: SalaryChipProps) {
  return (
    <button
      type="button"
      className="salary-chip"
      data-active={active}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
