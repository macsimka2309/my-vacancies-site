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

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = getFiltersFromSearchParams(params);

  return <VacancyHome filters={filters} />;
}

async function VacancyHome({ filters }: { filters: VacancyFilters }) {
  const [vacancies, filterOptions] = await Promise.all([
    getActiveVacancies(filters),
    getVacancyFilterOptions(),
  ]);
  const selectedCities = filters.cities ?? [];

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
            <VacancyList vacancies={vacancies} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
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
