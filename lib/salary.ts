/**
 * Разбор витринной строки зарплаты в числа.
 *
 * Зарплату вводят и показывают строкой («до 5000 ₽ за смену · от 90 000 ₽/мес»),
 * но фильтр, микроразметка и фид агрегаторов работают с числами. Раньше каждый
 * из них разбирал строку по-своему, и «2650–5300 ₽ за смену» уходило в разметку
 * как «2650 ₽ в месяц». Теперь разбор один, а его результат лежит в базе.
 */

/** Период, за который назван совокупный доход. Смена считается отдельно. */
export type SalaryPeriod = "MONTH" | "VAHTA";

/** По какой сумме фильтруем: за смену или за период целиком. */
export type SalaryBasis = "shift" | "period";

export type StructuredSalary = {
  /** Ставка за час: не зависит от длины смены, поэтому сравнима всегда. */
  salaryHour?: number | null;
  salaryShiftMin: number | null;
  salaryShiftMax: number | null;
  salaryPeriodMin: number | null;
  salaryPeriodMax: number | null;
  salaryPeriod: SalaryPeriod | null;
};

export const EMPTY_SALARY: StructuredSalary = {
  salaryShiftMin: null,
  salaryShiftMax: null,
  salaryPeriodMin: null,
  salaryPeriodMax: null,
  salaryPeriod: null,
};

// Строка состоит из независимых частей, разделённых «·»: одна про смену,
// вторая про месяц или вахту. Разбираем каждую отдельно.
const SEGMENT_SEPARATOR = /[·;\n]/;

export function parseSalaryText(
  value: string | null | undefined,
): StructuredSalary {
  const salary: StructuredSalary = { ...EMPTY_SALARY };

  if (!value) {
    return salary;
  }

  for (const segment of value.split(SEGMENT_SEPARATOR)) {
    const unit = detectUnit(segment);
    const bounds = unit ? parseBounds(segment) : null;

    if (!unit || !bounds) {
      continue;
    }

    if (unit === "SHIFT") {
      salary.salaryShiftMin = bounds.min;
      salary.salaryShiftMax = bounds.max;
    } else {
      salary.salaryPeriod = unit;
      salary.salaryPeriodMin = bounds.min;
      salary.salaryPeriodMax = bounds.max;
    }
  }

  return salary;
}

/**
 * Верхняя названная сумма — по ней работает фильтр «зарплата от».
 * Человек, который просит «от 5000 за смену», ждёт в выдаче «до 6000 ₽».
 */
export function getSalaryCeiling(
  salary: StructuredSalary,
  basis: SalaryBasis,
): number | null {
  return basis === "shift"
    ? (salary.salaryShiftMax ?? salary.salaryShiftMin)
    : (salary.salaryPeriodMax ?? salary.salaryPeriodMin);
}

export type JsonLdSalary = {
  unitText: "HOUR" | "DAY" | "MONTH";
  min: number | null;
  max: number | null;
};

/**
 * Что отдавать в `baseSalary` микроразметки. Вахту как MONTH не отдаём:
 * вахта длится 30–60 дней и месячной ставкой не является — для таких
 * вакансий в разметку идёт ставка за смену.
 */
export function toJsonLdSalary(salary: StructuredSalary): JsonLdSalary | null {
  // Час — самая точная единица из тех, что у нас есть: она не зависит
  // от длины смены, поэтому в разметку идёт первой.
  if (salary.salaryHour) {
    return { unitText: "HOUR", min: salary.salaryHour, max: salary.salaryHour };
  }

  if (
    salary.salaryPeriod === "MONTH" &&
    (salary.salaryPeriodMin !== null || salary.salaryPeriodMax !== null)
  ) {
    return {
      unitText: "MONTH",
      min: salary.salaryPeriodMin,
      max: salary.salaryPeriodMax,
    };
  }

  if (salary.salaryShiftMin !== null || salary.salaryShiftMax !== null) {
    return {
      unitText: "DAY",
      min: salary.salaryShiftMin,
      max: salary.salaryShiftMax,
    };
  }

  return null;
}

/**
 * Человекочитаемый итог разбора — показываем редактору в админке, чтобы
 * непонятая строка не осталась незамеченной.
 */
export function describeStructuredSalary(salary: StructuredSalary): string {
  const parts = [
    salary.salaryHour ? `час ${formatRate(salary.salaryHour)} ₽` : "",
    formatBounds("смена", salary.salaryShiftMin, salary.salaryShiftMax),
    formatBounds(
      salary.salaryPeriod === "VAHTA" ? "вахта" : "месяц",
      salary.salaryPeriodMin,
      salary.salaryPeriodMax,
    ),
  ].filter(Boolean);

  return parts.length
    ? `Разобрано: ${parts.join(" · ")}`
    : "Разобрать не удалось — вакансия не попадёт в фильтр по зарплате и в разметку.";
}

function formatBounds(label: string, min: number | null, max: number | null) {
  if (min !== null && max !== null) {
    return min === max
      ? `${label} — ${formatAmount(min)} ₽`
      : `${label} — ${formatAmount(min)}–${formatAmount(max)} ₽`;
  }

  if (max !== null) {
    return `${label} — до ${formatAmount(max)} ₽`;
  }

  if (min !== null) {
    return `${label} — от ${formatAmount(min)} ₽`;
  }

  return "";
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function detectUnit(segment: string): "SHIFT" | SalaryPeriod | null {
  if (/смен/i.test(segment)) {
    return "SHIFT";
  }

  if (/вахт/i.test(segment)) {
    return "VAHTA";
  }

  if (/мес/i.test(segment)) {
    return "MONTH";
  }

  return null;
}

// Две суммы — вилка; одна — граница, и какая именно, говорит слово «до».
function parseBounds(segment: string) {
  const amounts = (segment.match(/\d[\d\s]*/g) ?? [])
    .map((amount) => Number(amount.replace(/\s/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (!amounts.length) {
    return null;
  }

  if (amounts.length === 1) {
    return /до\s+\d/.test(segment)
      ? { min: null, max: amounts[0] }
      : { min: amounts[0], max: null };
  }

  return { min: Math.min(...amounts), max: Math.max(...amounts) };
}

/**
 * «112.5» → «112,5», «117» → «117». Дробная часть есть у части ставок,
 * и округлять её нельзя: это тариф, а не наша оценка.
 */
export function formatRate(value: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(
    value,
  );
}

/**
 * Витринная подпись ставки: «117 ₽/час».
 *
 * Копейки округляем **вниз**, а не по правилам арифметики. У четырёх вакансий
 * тариф партнёра дробный — 209,23 · 195,2 · 112,5 · 104,8 ₽/час, — и в
 * заголовке выдачи копейки читаются как ошибка, а не как точность.
 *
 * Вниз, потому что заголовок — это обещание: 104 при тарифе 104,8 человек
 * получит, 105 — нет. Разница в 10 ₽ за смену ничего не решает, а
 * несовпадение обещанного с расчётным листом решает всё.
 *
 * В админке (`describeStructuredSalary`) и в базе значение остаётся точным.
 */
export function formatHourlyRate(value: number | null | undefined) {
  return value ? `${formatRate(Math.floor(value))} ₽/час` : null;
}
