import { db } from "./db";

export type VacancyFilters = {
  title?: string;
  project?: string;
  salaryTo?: number;
};

export type VacancyFilterOptions = {
  titles: string[];
  projects: string[];
  salaryRange: {
    min: number;
    max: number;
    step: number;
  };
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

  if (!filters.salaryTo) {
    return vacancies;
  }

  return vacancies.filter((vacancy) => {
    const salaryAmount = getSalaryAmount(vacancy.salary);

    return salaryAmount !== null && salaryAmount <= filters.salaryTo!;
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
    salaryRange: getSalaryRange(vacancies.map((vacancy) => vacancy.salary)),
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

function getSalaryRange(values: Array<string | null | undefined>) {
  const salaryAmounts = values
    .map(getSalaryAmount)
    .filter((value): value is number => value !== null);

  if (salaryAmounts.length === 0) {
    return {
      min: 0,
      max: 0,
      step: 5000,
    };
  }

  const maxSalary = Math.max(...salaryAmounts);

  return {
    min: 0,
    max: Math.ceil(maxSalary / 5000) * 5000,
    step: 5000,
  };
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
