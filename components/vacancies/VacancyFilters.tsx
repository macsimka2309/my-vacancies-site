"use client";

import Link from "next/link";
import { useState } from "react";
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
  const initialSalaryTo = selectedFilters.salaryTo ?? options.salaryRange.max;
  const [salaryTo, setSalaryTo] = useState(initialSalaryTo);
  const hasSalaryRange = options.salaryRange.max > options.salaryRange.min;

  return (
    <aside className="filters-panel" aria-label="Фильтры вакансий">
      <div className="filters-heading">
        <h2>Фильтры</h2>
        <p>{formatVacancyCount(resultCount)}</p>
      </div>
      <form className="filters-form" action="/">
        <FilterSelect
          label="Вакансия"
          name="title"
          placeholder="Все вакансии"
          options={options.titles}
          value={selectedFilters.title}
        />
        <FilterSelect
          label="Проект"
          name="project"
          placeholder="Все проекты"
          options={options.projects}
          value={selectedFilters.project}
        />
        <label className="filter-field range-field">
          <span>Оплата до</span>
          <strong className="range-value">
            {salaryTo < options.salaryRange.max
              ? formatSalary(salaryTo)
              : "Любая оплата"}
          </strong>
          <input
            type="range"
            name="salaryTo"
            min={options.salaryRange.min}
            max={options.salaryRange.max}
            step={options.salaryRange.step}
            value={salaryTo}
            disabled={!hasSalaryRange}
            onChange={(event) => setSalaryTo(Number(event.target.value))}
          />
        </label>
        <div className="filter-actions">
          <button className="button-link filter-submit" type="submit">
            Показать
          </button>
          <Link className="secondary-link" href="/">
            Сбросить
          </Link>
        </div>
      </form>
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
  name: keyof VacancyFilters;
  placeholder: string;
  options: string[];
  value?: string;
};

function FilterSelect({
  label,
  name,
  placeholder,
  options,
  value = "",
}: FilterSelectProps) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select name={name} defaultValue={value}>
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
