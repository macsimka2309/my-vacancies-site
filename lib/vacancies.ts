import { db } from "./db";

export type VacancyFilters = {
  title?: string;
  project?: string;
  salaryFrom?: number;
};

export type VacancyFilterOptions = {
  titles: string[];
  projects: string[];
  salaryPresets: number[];
};

export async function getActiveVacancies(filters: VacancyFilters = {}) {
  const vacancies = await db.vacancy.findMany({
    where: {
      isActive: true,
      ...(filters.title ? { title: filters.title } : {}),
      ...(filters.project ? { project: filters.project } : {}),
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
      schedule: true,
      address: true,
      createdAt: true,
    },
  });

  if (!filters.salaryFrom) {
    return vacancies;
  }

  return vacancies.filter((vacancy) => {
    const salaryAmount = getSalaryAmount(vacancy.salary);

    return salaryAmount !== null && salaryAmount >= filters.salaryFrom!;
  });
}

export async function getVacancyFilterOptions(): Promise<VacancyFilterOptions> {
  const vacancies = await db.vacancy.findMany({
    where: {
      isActive: true,
    },
    select: {
      title: true,
      project: true,
      salary: true,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

  return {
    titles: uniqueSorted(vacancies.map((vacancy) => vacancy.title)),
    projects: uniqueSorted(vacancies.map((vacancy) => vacancy.project)),
    salaryPresets: getSalaryPresets(vacancies.map((vacancy) => vacancy.salary)),
  };
}

export async function getVacancyBySlug(slug: string) {
  return db.vacancy.findFirst({
    where: {
      slug,
      isActive: true,
    },
  });
}

export async function getActiveVacancySlugs() {
  const vacancies = await db.vacancy.findMany({
    where: {
      isActive: true,
    },
    select: {
      slug: true,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
  });

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

// Пресеты «зарплата от» для чипсов: берём круглые пороги, которые не выше
// максимальной зарплаты в подборке (иначе чип не даёт ни одной вакансии).
function getSalaryPresets(values: Array<string | null | undefined>) {
  const salaryAmounts = values
    .map(getSalaryAmount)
    .filter((value): value is number => value !== null);

  if (salaryAmounts.length === 0) {
    return [];
  }

  const maxSalary = Math.max(...salaryAmounts);
  const candidates = [50000, 80000, 100000, 150000, 200000, 300000];

  return candidates.filter((candidate) => candidate <= maxSalary);
}

function getSalaryAmount(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const amounts = value
    .match(/\d[\d\s]*/g)
    ?.map((amount) => Number(amount.replace(/\D/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (!amounts?.length) {
    return null;
  }

  return Math.max(...amounts);
}

export type VacancyListItem = Awaited<
  ReturnType<typeof getActiveVacancies>
>[number];

export type VacancyDetails = NonNullable<
  Awaited<ReturnType<typeof getVacancyBySlug>>
>;
