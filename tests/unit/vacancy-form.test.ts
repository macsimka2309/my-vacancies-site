import { describe, expect, it } from "vitest";
import { parseVacancyForm } from "@/lib/vacancy-form";

function buildForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields: Record<string, string> = {
    city: "Тула",
    conditions: "Еженедельные выплаты",
    project: "Самокат",
    requirements: "От 18 лет",
    responsibilities: "Доставка заказов",
    title: "Курьер",
    workFormat: "Свободный график",
    ...overrides,
  };

  for (const [field, value] of Object.entries(fields)) {
    formData.set(field, value);
  }

  return formData;
}

describe("parseVacancyForm", () => {
  // Числа не вводят руками: они выводятся из витринной строки при сохранении,
  // иначе текст на сайте и суммы в фильтре разойдутся.
  it("выводит числа зарплаты из витринной строки", () => {
    const parsed = parseVacancyForm(
      buildForm({ salary: "2650–5300 ₽ за смену · от 106 000 ₽/мес" }),
    );

    expect(parsed).toMatchObject({
      data: {
        salary: "2650–5300 ₽ за смену · от 106 000 ₽/мес",
        salaryShiftMin: 2650,
        salaryShiftMax: 5300,
        salaryPeriodMin: 106_000,
        salaryPeriod: "MONTH",
      },
    });
  });

  it("обнуляет числа, когда зарплату убрали из строки", () => {
    const parsed = parseVacancyForm(buildForm({ salary: "по договорённости" }));

    expect(parsed).toMatchObject({
      data: {
        salaryShiftMin: null,
        salaryShiftMax: null,
        salaryPeriodMin: null,
        salaryPeriodMax: null,
        salaryPeriod: null,
      },
    });
  });

  it("принимает средний доход за смену отдельным полем", () => {
    const parsed = parseVacancyForm(
      buildForm({ salary: "2650–5300 ₽ за смену", salaryShiftAvg: "4200" }),
    );

    expect(parsed).toMatchObject({ data: { salaryShiftAvg: 4200 } });
  });

  it("пустой средний доход — это null, а не ошибка", () => {
    expect(parseVacancyForm(buildForm({ salaryShiftAvg: "" }))).toMatchObject({
      data: { salaryShiftAvg: null },
    });
  });

  // Молча обнулять введённое нельзя: редактор не узнает, что цифра пропала.
  it("отвергает форму, если средний доход введён мусором", () => {
    for (const value of ["4 200 ₽", "-100", "0", "999999", "4200.5"]) {
      expect(parseVacancyForm(buildForm({ salaryShiftAvg: value }))).toEqual({
        error: "invalid",
      });
    }
  });
});
