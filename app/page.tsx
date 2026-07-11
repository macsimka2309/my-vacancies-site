import { VacancyFiltersPanel } from "@/components/vacancies/VacancyFilters";
import { VacancyList } from "@/components/vacancies/VacancyList";
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

  return (
    <main className="page-shell">
      <section className="page-header">
        <p className="eyebrow">Работа в стабильной компании</p>
        <h1>Вакансии</h1>
        <p className="muted">
          Выберите подходящую позицию и посмотрите подробные условия.
        </p>
      </section>
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
  );
}

function getFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): VacancyFilters {
  return {
    title: getSingleParam(params.title),
    project: getSingleParam(params.project),
    salaryTo: getNumberParam(params.salaryTo),
  };
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
