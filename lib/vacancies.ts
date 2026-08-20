import { unstable_cache } from "next/cache";
import { db } from "./db";
import { getSalaryCeiling, type SalaryBasis, type StructuredSalary } from "./salary";

/** Тег для сброса кэша вакансий из админки. */
export const VACANCIES_CACHE_TAG = "vacancies";

export type { SalaryBasis } from "./salary";

export type VacancyFilters = {
  titles?: string[];
  projects?: string[];
  cities?: string[];
  salaryBasis?: SalaryBasis;
  salaryFrom?: number;
};

export type VacancyFilterOptions = {
  titles: string[];
  projects: string[];
  cities: string[];
  // Города с числом вакансий, по убыванию — для выбора города на главной.
  cityCounts: Array<{ city: string; count: number }>;
  // Верхняя граница «зарплата от» отдельно по каждому типу.
  salaryMax: Record<SalaryBasis, number>;
};

// Активных вакансий меньше двух сотен, а фильтры комбинируются десятками
// способов. Дешевле прочитать список один раз и фильтровать в памяти, чем
// ходить в базу на каждый заход с каждой комбинацией фильтров.
// createdAt намеренно не выбираем: он нужен только на детальной странице,
// а в кэше даты пришлось бы восстанавливать из строк.
const loadActiveVacancies = unstable_cache(
  async () =>
    db.vacancy.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        slug: true,
        title: true,
        project: true,
        city: true,
        workFormat: true,
        salary: true,
        salaryShiftMin: true,
        salaryShiftMax: true,
        salaryShiftAvg: true,
        salaryPeriodMin: true,
        salaryPeriodMax: true,
        salaryPeriod: true,
        schedule: true,
        address: true,
      },
    }),
  ["active-vacancies"],
  { tags: [VACANCIES_CACHE_TAG], revalidate: 300 },
);

export async function getActiveVacancies(filters: VacancyFilters = {}) {
  const all = await loadActiveVacancies();
  const vacancies = all.filter(
    (vacancy) =>
      (!filters.titles?.length || filters.titles.includes(vacancy.title)) &&
      (!filters.projects?.length ||
        filters.projects.includes(vacancy.project)) &&
      (!filters.cities?.length || filters.cities.includes(vacancy.city)),
  );

  if (!filters.salaryFrom || !filters.salaryBasis) {
    return vacancies;
  }

  const basis = filters.salaryBasis;
  const threshold = filters.salaryFrom;

  return vacancies.filter((vacancy) => {
    const amount = getSalaryCeiling(vacancy, basis);

    return amount !== null && amount >= threshold;
  });
}

export async function getVacancyFilterOptions(): Promise<VacancyFilterOptions> {
  // Тот же кэшированный список, что и в getActiveVacancies — второй запрос
  // в базу за теми же данными не нужен.
  const vacancies = await loadActiveVacancies();

  return {
    titles: uniqueSorted(vacancies.map((vacancy) => vacancy.title)),
    projects: uniqueSorted(vacancies.map((vacancy) => vacancy.project)),
    cities: uniqueSorted(vacancies.map((vacancy) => vacancy.city)),
    cityCounts: countByCity(vacancies.map((vacancy) => vacancy.city)),
    salaryMax: getSalaryMax(vacancies),
  };
}

// Города по числу вакансий (убывание), при равенстве — по алфавиту.
function countByCity(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const city = value?.trim();

    if (city) {
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.city.localeCompare(right.city, "ru"),
    );
}

const SALARY_ROUND: Record<SalaryBasis, number> = { shift: 500, period: 5000 };

export async function getVacancyBySlug(slug: string) {
  return db.vacancy.findFirst({
    where: {
      slug,
      isActive: true,
    },
  });
}

export async function getActiveVacancySlugs() {
  const vacancies = await loadActiveVacancies();

  return vacancies.map((vacancy) => vacancy.slug);
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const filledValues = values.filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return [...new Set(filledValues)].sort((left, right) =>
    left.localeCompare(right, "ru"),
  );
}

// Верхняя граница «зарплата от» по каждому основанию: максимум по подборке,
// округлённый вверх (смена — до 500, период — до 5000). 0 — если по этому
// основанию сумм нет вовсе, тогда фильтр скрывается.
function getSalaryMax(
  vacancies: StructuredSalary[],
): Record<SalaryBasis, number> {
  const result: Record<SalaryBasis, number> = { shift: 0, period: 0 };

  for (const basis of ["shift", "period"] as const) {
    const amounts = vacancies
      .map((vacancy) => getSalaryCeiling(vacancy, basis))
      .filter((value): value is number => value !== null);

    if (amounts.length > 0) {
      const step = SALARY_ROUND[basis];
      result[basis] = Math.ceil(Math.max(...amounts) / step) * step;
    }
  }

  return result;
}

export type VacancyListItem = Awaited<
  ReturnType<typeof getActiveVacancies>
>[number];

export type VacancyDetails = NonNullable<
  Awaited<ReturnType<typeof getVacancyBySlug>>
>;
