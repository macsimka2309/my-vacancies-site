import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CityGate } from "@/components/vacancies/CityGate";
import { VacancyFiltersPanel } from "@/components/vacancies/VacancyFilters";
import { VacancyList } from "@/components/vacancies/VacancyList";
import { site } from "@/lib/site";
import {
  getActiveVacancies,
  getVacancyFilterOptions,
  type VacancyFilters,
} from "@/lib/vacancies";

export const dynamic = "force-dynamic";

// Все комбинации фильтров (?city=…&title=…) склеиваем к главной,
// иначе поисковик увидит сотни почти одинаковых страниц.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// Пока город не выбран, показываем короткую витрину: рендерить весь каталог
// сразу — это мегабайт разметки и десятки экранов прокрутки на мобиле.
const PREVIEW_LIMIT = 8;

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = getFiltersFromSearchParams(params);
  const showAll = getSingleParam(params.all) === "1";

  return <VacancyHome filters={filters} showAll={showAll} />;
}

async function VacancyHome({
  filters: rawFilters,
  showAll,
}: {
  filters: VacancyFilters;
  showAll: boolean;
}) {
  const filterOptions = await getVacancyFilterOptions();
  // Город приходит из рекламы ({region_name} в Директе) и может не совпасть
  // со справочником — тогда игнорируем его и показываем выбор города.
  const filters = withKnownCities(rawFilters, filterOptions.cities);
  const vacancies = await getActiveVacancies(filters);
  const selectedCities = filters.cities ?? [];
  // Сокращаем витрину только когда фильтров нет вовсе: если человек выбрал
  // город или профессию, он ждёт полный список по своему запросу.
  const hasFilters = Boolean(
    selectedCities.length || filters.titles?.length || filters.projects?.length,
  );
  const isTrimmed = !hasFilters && !showAll && vacancies.length > PREVIEW_LIMIT;
  const visibleVacancies = isTrimmed
    ? vacancies.slice(0, PREVIEW_LIMIT)
    : vacancies;

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="page-header">
          <p className="eyebrow">{site.tagline}</p>
          <h1>
            {selectedCities.length
              ? `Вакансии — ${selectedCities.join(", ")}`
              : "Вакансии"}
          </h1>
          <p className="muted">
            {selectedCities.length
              ? "Выберите подходящую позицию и посмотрите подробные условия."
              : "Работа рядом с домом: доставка, сборка заказов, вахта."}
          </p>
        </section>
        {selectedCities.length ? null : (
          <CityGate cityCounts={filterOptions.cityCounts} />
        )}
        <section className="vacancy-layout">
          <VacancyFiltersPanel
            options={filterOptions}
            resultCount={vacancies.length}
            selectedFilters={filters}
          />
          <div className="vacancy-results">
            <VacancyList vacancies={visibleVacancies} />
            {isTrimmed ? (
              <a className="show-all-link" href="/?all=1">
                Показать все {vacancies.length} вакансий
              </a>
            ) : null}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

// Сопоставляет города из ссылки со справочником: без учёта регистра и ё/е.
// Неизвестные значения отбрасываем — иначе посетитель из рекламы увидел бы
// пустую страницу вместо списка вакансий.
function withKnownCities(
  filters: VacancyFilters,
  knownCities: string[],
): VacancyFilters {
  if (!filters.cities?.length) {
    return filters;
  }

  const canonicalByKey = new Map(
    knownCities.map((city) => [normalizeCityKey(city), city]),
  );
  const matched = filters.cities
    .map((city) => canonicalByKey.get(normalizeCityKey(city)))
    .filter((city): city is string => Boolean(city));

  return {
    ...filters,
    cities: matched.length ? [...new Set(matched)] : undefined,
  };
}

function normalizeCityKey(city: string) {
  return city.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function getFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): VacancyFilters {
  return {
    titles: getMultiParam(params.title),
    projects: getMultiParam(params.project),
    cities: getMultiParam(params.city),
    salaryBasis: getSalaryBasisParam(params.salaryBasis),
    salaryFrom: getNumberParam(params.salaryFrom),
  };
}

function getSalaryBasisParam(value: string | string[] | undefined) {
  const param = getSingleParam(value);

  return param === "shift" || param === "vahta" ? param : undefined;
}

function getMultiParam(value: string | string[] | undefined) {
  const values = (Array.isArray(value) ? value : [value])
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  return values.length ? [...new Set(values)] : undefined;
}

function getSingleParam(value: string | string[] | undefined) {
  const param = Array.isArray(value) ? value[0] : value;
  const trimmedParam = param?.trim();

  return trimmedParam || undefined;
}

function getNumberParam(value: string | string[] | undefined) {
  const param = getSingleParam(value);
  const numberParam = param ? Number(param) : 0;

  return Number.isFinite(numberParam) && numberParam > 0
    ? numberParam
    : undefined;
}
