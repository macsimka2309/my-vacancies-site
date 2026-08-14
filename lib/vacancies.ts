import { db } from "./db";

export type SalaryBasis = "shift" | "vahta";

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
  // Верхняя граница «зарплата от» отдельно по каждому типу.
  salaryMax: Record<SalaryBasis, number>;
};

export async function getActiveVacancies(filters: VacancyFilters = {}) {
  const vacancies = await db.vacancy.findMany({
    where: {
      isActive: true,
      ...(filters.titles?.length ? { title: { in: filters.titles } } : {}),
      ...(filters.projects?.length ? { project: { in: filters.projects } } : {}),
      ...(filters.cities?.length ? { city: { in: filters.cities } } : {}),
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

  if (!filters.salaryFrom || !filters.salaryBasis) {
    return vacancies;
  }

  const basis = filters.salaryBasis;

  return vacancies.filter((vacancy) => {
    const amount = parseSalary(vacancy.salary)[basis];

    return amount !== null && amount >= filters.salaryFrom!;
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
      city: true,
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
    cities: uniqueSorted(vacancies.map((vacancy) => vacancy.city)),
    salaryMax: getSalaryMax(vacancies.map((vacancy) => vacancy.salary)),
  };
}

const SALARY_ROUND: Record<SalaryBasis, number> = { shift: 500, vahta: 5000 };

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

// Верхняя граница «зарплата от» по каждому типу: максимум по подборке,
// округлённый вверх (смена — до 500, вахта — до 5000). 0 — если тип нигде не указан.
function getSalaryMax(
  values: Array<string | null | undefined>,
): Record<SalaryBasis, number> {
  const result: Record<SalaryBasis, number> = { shift: 0, vahta: 0 };

  for (const basis of ["shift", "vahta"] as const) {
    const amounts = values
      .map((value) => parseSalary(value)[basis])
      .filter((value): value is number => value !== null);

    if (amounts.length > 0) {
      const step = SALARY_ROUND[basis];
      result[basis] = Math.ceil(Math.max(...amounts) / step) * step;
    }
  }

  return result;
}

// Разбор строки зарплаты вида «4000–6000 ₽ за смену · от 110 000 ₽ за вахту»
// на максимальную сумму по каждому типу (смена / вахта).
function parseSalary(
  value: string | null | undefined,
): Record<SalaryBasis, number | null> {
  const result: Record<SalaryBasis, number | null> = {
    shift: null,
    vahta: null,
  };

  if (!value) {
    return result;
  }

  for (const segment of value.split(/[·;\n]/)) {
    const amounts = segment
      .match(/\d[\d\s]*/g)
      ?.map((amount) => Number(amount.replace(/\D/g, "")))
      .filter((amount) => Number.isFinite(amount) && amount > 0);

    if (!amounts?.length) {
      continue;
    }

    const amount = Math.max(...amounts);

    if (/смен/i.test(segment)) {
      result.shift = amount;
    } else if (/вахт/i.test(segment)) {
      result.vahta = amount;
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
