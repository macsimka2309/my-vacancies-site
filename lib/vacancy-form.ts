const REQUIRED_LIMITS = {
  city: 120,
  conditions: 10_000,
  project: 200,
  requirements: 10_000,
  responsibilities: 10_000,
  title: 200,
  workFormat: 120,
} as const;

const OPTIONAL_LIMITS = {
  address: 300,
  contactComment: 2_000,
  salary: 120,
  schedule: 200,
} as const;

export type VacancyFormData = {
  address: string | null;
  city: string;
  conditions: string;
  contactComment: string | null;
  isActive: boolean;
  project: string;
  requirements: string;
  responsibilities: string;
  salary: string | null;
  schedule: string | null;
  slug: string;
  title: string;
  workFormat: string;
};

export function parseVacancyForm(
  formData: FormData,
): { data: VacancyFormData } | { error: "invalid" } {
  const required = Object.fromEntries(
    Object.entries(REQUIRED_LIMITS).map(([field, limit]) => [
      field,
      normalizeRequired(formData, field, limit),
    ]),
  ) as Record<keyof typeof REQUIRED_LIMITS, string | null>;

  if (Object.values(required).some((value) => value === null)) {
    return { error: "invalid" };
  }

  const optional = Object.fromEntries(
    Object.entries(OPTIONAL_LIMITS).map(([field, limit]) => [
      field,
      normalizeOptional(formData, field, limit),
    ]),
  ) as Record<keyof typeof OPTIONAL_LIMITS, string | null | undefined>;

  if (Object.values(optional).some((value) => value === undefined)) {
    return { error: "invalid" };
  }

  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(
    requestedSlug ||
      `${required.title}-${required.project}-${required.city}`,
  );

  if (!slug || slug.length > 120) {
    return { error: "invalid" };
  }

  return {
    data: {
      address: optional.address ?? null,
      city: required.city!,
      conditions: required.conditions!,
      contactComment: optional.contactComment ?? null,
      isActive: formData.get("isActive") === "on",
      project: required.project!,
      requirements: required.requirements!,
      responsibilities: required.responsibilities!,
      salary: optional.salary ?? null,
      schedule: optional.schedule ?? null,
      slug,
      title: required.title!,
      workFormat: required.workFormat!,
    },
  };
}

function normalizeRequired(
  formData: FormData,
  field: string,
  maxLength: number,
) {
  const value = String(formData.get(field) ?? "").trim();

  return value && value.length <= maxLength ? value : null;
}

function normalizeOptional(
  formData: FormData,
  field: string,
  maxLength: number,
) {
  const value = String(formData.get(field) ?? "").trim();

  if (value.length > maxLength) {
    return undefined;
  }

  return value || null;
}

function slugify(value: string) {
  const transliteration: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLocaleLowerCase("ru-RU")
    .split("")
    .map((character) => transliteration[character] ?? character)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
