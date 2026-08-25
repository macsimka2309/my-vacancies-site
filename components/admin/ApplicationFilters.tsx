import { SOURCE_BUCKETS } from "@/lib/application-source";
import {
  CITY_NOT_SET,
  hasActiveFilters,
  type ApplicationFilters as Filters,
} from "@/lib/application-filters";
import { LEAD_STATUS_OPTIONS } from "@/lib/lead-status";

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
 * Обычная GET-форма без единой строчки скриптов: фильтры должны жить в
 * адресе. Иначе отобранный список нельзя ни переслать, ни открыть заново —
 * а список откликов смотрят именно чтобы кому-то что-то показать.
 *
 * Вакансия в отдельном списке, а не текстом: снимок названия существует
 * ровно потому, что названия меняются, и фильтр по тексту после
 * переименования разложил бы одну вакансию на две.
 */
export function ApplicationFilters({
  cities,
  filters,
  found,
  projects,
  total,
  vacancies,
}: ApplicationFiltersProps) {
  return (
    <form action="/admin" className="admin-filters" method="get">
      <div className="admin-filters__row">
        <label className="admin-filters__field">
          <span>Поиск</span>
          <input
            defaultValue={filters.query}
            name="q"
            placeholder="Имя, телефон, примечание…"
            type="search"
          />
        </label>
        <Select
          label="Статус"
          name="status"
          options={LEAD_STATUS_OPTIONS.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          value={filters.status ?? ""}
        />
        <Select
          label="Источник"
          name="source"
          options={SOURCE_BUCKETS.map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          value={filters.source ?? ""}
        />
        <Select
          label="Город"
          name="city"
          options={[{ label: "Не указан", value: CITY_NOT_SET }, ...cities]}
          value={filters.city ?? ""}
        />
        <Select
          label="Проект"
          name="project"
          options={projects}
          value={filters.project ?? ""}
        />
        <Select
          label="Вакансия"
          name="vacancyId"
          options={vacancies}
          value={filters.vacancyId ?? ""}
        />
      </div>
      <div className="admin-filters__actions">
        <button className="admin-save" type="submit">
          Применить
        </button>
        {hasActiveFilters(filters) || filters.query ? (
          <a className="secondary-link" href="/admin">
            Сбросить
          </a>
        ) : null}
        <p className="muted">
          {hasActiveFilters(filters) || filters.query
            ? `Показано ${found} из ${total}`
            : `Всего откликов: ${total}`}
        </p>
        <a className="admin-save" href="/admin/applications/new">
          Создать отклик
        </a>
      </div>
    </form>
  );
}

function Select({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: Option[];
  value: string;
}) {
  return (
    <label className="admin-filters__field">
      <span>{label}</span>
      <select defaultValue={value} name={name}>
        <option value="">Любой</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
