import { describe, expect, it } from "vitest";
import {
  describeStructuredSalary,
  getSalaryCeiling,
  parseSalaryText,
  toJsonLdSalary,
} from "@/lib/salary";

describe("parseSalaryText", () => {
  it("разбирает вилку за смену", () => {
    expect(parseSalaryText("2650–5300 ₽ за смену")).toMatchObject({
      salaryShiftMin: 2650,
      salaryShiftMax: 5300,
      salaryPeriod: null,
    });
  });

  it("понимает «до N» как верхнюю границу, а не как точную сумму", () => {
    expect(parseSalaryText("до 4300 ₽ за смену")).toMatchObject({
      salaryShiftMin: null,
      salaryShiftMax: 4300,
    });
  });

  it("понимает «от N» как нижнюю границу", () => {
    expect(parseSalaryText("от 4200 ₽ за смену")).toMatchObject({
      salaryShiftMin: 4200,
      salaryShiftMax: null,
    });
  });

  it("разбирает смену и месяц из одной строки", () => {
    expect(parseSalaryText("до 6000 ₽ за смену · от 100 000 ₽/мес")).toEqual({
      salaryShiftMin: null,
      salaryShiftMax: 6000,
      salaryPeriodMin: 100_000,
      salaryPeriodMax: null,
      salaryPeriod: "MONTH",
    });
  });

  it("отличает вахту от месяца", () => {
    expect(
      parseSalaryText("4000–6000 ₽ за смену · от 110 000 ₽ за вахту"),
    ).toEqual({
      salaryShiftMin: 4000,
      salaryShiftMax: 6000,
      salaryPeriodMin: 110_000,
      salaryPeriodMax: null,
      salaryPeriod: "VAHTA",
    });
  });

  it("разбирает вилку за вахту", () => {
    expect(
      parseSalaryText("2240–4780 ₽ за смену · 62 000–125 000 ₽ за вахту"),
    ).toMatchObject({
      salaryPeriodMin: 62_000,
      salaryPeriodMax: 125_000,
      salaryPeriod: "VAHTA",
    });
  });

  it("понимает форму «руб. в месяц» из сида", () => {
    expect(parseSalaryText("до 120 000 руб. в месяц")).toMatchObject({
      salaryPeriodMin: null,
      salaryPeriodMax: 120_000,
      salaryPeriod: "MONTH",
    });
  });

  it("ничего не выдумывает, когда период не назван", () => {
    for (const value of ["по договорённости", "", null, undefined, "5000 ₽"]) {
      expect(parseSalaryText(value)).toEqual({
        salaryShiftMin: null,
        salaryShiftMax: null,
        salaryPeriodMin: null,
        salaryPeriodMax: null,
        salaryPeriod: null,
      });
    }
  });
});

describe("getSalaryCeiling", () => {
  // Фильтр «от 5000 за смену» должен показывать «до 6000 ₽ за смену».
  it("берёт верхнюю названную сумму по каждому основанию", () => {
    const salary = parseSalaryText("до 6000 ₽ за смену · от 100 000 ₽/мес");

    expect(getSalaryCeiling(salary, "shift")).toBe(6000);
    expect(getSalaryCeiling(salary, "period")).toBe(100_000);
  });

  it("возвращает null, если по этому основанию сумма не названа", () => {
    const salary = parseSalaryText("до 4300 ₽ за смену");

    expect(getSalaryCeiling(salary, "period")).toBeNull();
  });
});

describe("toJsonLdSalary", () => {
  // Раньше сюда уходила минимальная сумма с меткой «в месяц»:
  // «2650–5300 ₽ за смену» превращалось в агрегаторе в «2650 ₽/мес».
  it("отдаёт месячный доход как MONTH, когда он известен", () => {
    expect(
      toJsonLdSalary(parseSalaryText("до 6000 ₽ за смену · от 100 000 ₽/мес")),
    ).toEqual({ unitText: "MONTH", min: 100_000, max: null });
  });

  it("отдаёт ставку за смену как DAY", () => {
    expect(toJsonLdSalary(parseSalaryText("2650–5300 ₽ за смену"))).toEqual({
      unitText: "DAY",
      min: 2650,
      max: 5300,
    });
  });

  it("не выдаёт вахту за месячный оклад — отдаёт смену", () => {
    expect(
      toJsonLdSalary(
        parseSalaryText("4000–6000 ₽ за смену · от 110 000 ₽ за вахту"),
      ),
    ).toEqual({ unitText: "DAY", min: 4000, max: 6000 });
  });

  it("молчит, когда период неизвестен", () => {
    expect(toJsonLdSalary(parseSalaryText("по договорённости"))).toBeNull();
  });
});

describe("describeStructuredSalary", () => {
  it("показывает разобранные суммы", () => {
    const described = describeStructuredSalary(
      parseSalaryText("до 6000 ₽ за смену · от 100 000 ₽/мес"),
    );

    // Intl разделяет разряды неразрывным пробелом — сравниваем по смыслу.
    expect(described.replace(/\s/g, " ")).toBe(
      "Разобрано: смена — до 6 000 ₽ · месяц — от 100 000 ₽",
    );
  });

  it("предупреждает, когда строку разобрать не удалось", () => {
    expect(describeStructuredSalary(parseSalaryText("по договорённости"))).toContain(
      "Разобрать не удалось",
    );
  });
});
