import { parseSalaryText, type SalaryPeriod } from "./salary";

// Средний доход за смену вводят руками; всё, что выше, — опечатка.
const MAX_SHIFT_AVG = 100_000;

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

/**
 * `age-limit` — отдельная ошибка, а не общий `invalid`: менеджер должен
 * увидеть, что именно не так, иначе он трижды переправит текст наугад.
 */
export type VacancyFormError = "invalid" | "age-limit";

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
  salaryShiftMin: number | null;
  salaryShiftMax: number | null;
  salaryShiftAvg: number | null;
  salaryHour: number | null;
  salaryPeriodMin: number | null;
  salaryPeriodMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  validThrough: Date | null;
  schedule: string | null;
  slug: string;
  title: string;
  workFormat: string;
};

export function parseVacancyForm(
  formData: FormData,
): { data: VacancyFormData } | { error: VacancyFormError } {
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

  const salaryShiftAvg = normalizeAmount(formData, "salaryShiftAvg");

  if (salaryShiftAvg === undefined) {
    return { error: "invalid" };
  }

  const salaryHour = normalizeRate(formData, "salaryHour");

  if (salaryHour === undefined) {
    return { error: "invalid" };
  }

  const validThrough = normalizeDate(formData, "validThrough");

  if (validThrough === undefined) {
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

  // Верхняя граница возраста в тексте объявления запрещена ст. 25 Закона
  // о занятости, а ст. 13.11.1 КоАП даёт штраф за каждое объявление.
  // 26.08 такие формулировки убраны из 32 вакансий; проверка нужна, чтобы
  // они не вернулись при следующей правке. Отбор кандидатов это не
  // ограничивает — требование партнёра остаётся у менеджера, но не в тексте.
  if (
    hasAgeCeiling(required.requirements) ||
    hasAgeCeiling(required.conditions) ||
    hasAgeCeiling(required.responsibilities)
  ) {
    return { error: "age-limit" };
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
      // Числа выводим из витринной строки, чтобы текст и числа не разошлись:
      // редактор правит одно поле, а фильтр и разметка получают суммы.
      ...parseSalaryText(optional.salary),
      salaryShiftAvg,
      salaryHour,
      validThrough,
      schedule: optional.schedule ?? null,
      slug,
      title: required.title!,
      workFormat: required.workFormat!,
    },
  };
}

/** «18–45», «18-50», «до 50 лет», «от 18 до 45» — все формы верхней границы. */
const AGE_CEILING =
  /\b18\s*[–—-]\s*\d{2}\s*лет|от\s*18\s*до\s*\d{2}|до\s*\d{2}\s*лет/i;

function hasAgeCeiling(value: string | null | undefined) {
  return AGE_CEILING.test(value ?? "");
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

// Пустое поле — это null, мусор — ошибка формы: молча обнулять введённое
// нельзя, иначе редактор не узнает, что цифра не сохранилась.
/**
 * Ставка за час: дробная у части вакансий (112,5 ₽/час), поэтому целым
 * числом её не принять. Запятая как разделитель — так её и вводят.
 */
const MAX_HOUR_RATE = 5000;

function normalizeRate(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!value) {
    return null;
  }

  const rate = Number(value);

  return Number.isFinite(rate) && rate > 0 && rate <= MAX_HOUR_RATE
    ? rate
    : undefined;
}

function normalizeAmount(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").replace(/\s/g, "");

  if (!value) {
    return null;
  }

  const amount = Number(value);

  return Number.isInteger(amount) && amount > 0 && amount <= MAX_SHIFT_AVG
    ? amount
    : undefined;
}

// Пустое поле — срок считается от updatedAt автоматически. Дата в прошлом
// или дальше года — почти наверняка опечатка: закрытую вакансию снимают
// с публикации, а не датируют задним числом.
function normalizeDate(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setUTCFullYear(limit.getUTCFullYear() + 1);

  return date >= today && date <= limit ? date : undefined;
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
