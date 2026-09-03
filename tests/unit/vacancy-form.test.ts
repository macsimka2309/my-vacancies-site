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

  // Пустое поле — не «срока нет», а «считается от updatedAt автоматически».
  it("пустой срок действия — это null", () => {
    expect(parseVacancyForm(buildForm({ validThrough: "" }))).toMatchObject({
      data: { validThrough: null },
    });
  });

  it("принимает дату срока действия", () => {
    const parsed = parseVacancyForm(buildForm({ validThrough: nextMonth() }));

    expect(parsed).toMatchObject({
      data: { validThrough: new Date(`${nextMonth()}T00:00:00.000Z`) },
    });
  });

  it("отвергает срок в прошлом и дальше года", () => {
    for (const value of ["2020-01-01", "2199-01-01", "не дата", "2026-13-45"]) {
      expect(parseVacancyForm(buildForm({ validThrough: value }))).toEqual({
        error: "invalid",
      });
    }
  });
});

function nextMonth() {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + 30);

  return date.toISOString().slice(0, 10);
}

describe("верхняя граница возраста", () => {
  // Ст. 25 Закона о занятости запрещает возрастные ограничения в объявлении,
  // ст. 13.11.1 КоАП даёт штраф за каждое. 26.08 такие формулировки убраны
  // из 32 вакансий — проверка держит границу, чтобы они не вернулись.
  it("не пропускает «18–45» и «18-50» в требованиях", () => {
    for (const text of [
      "Возраст 18–45 лет.",
      "Возраст 18-50 лет.",
      "Требуется человек от 18 до 45",
      "Возраст до 50 лет",
    ]) {
      const parsed = parseVacancyForm(buildForm({ requirements: text }));

      expect("error" in parsed && parsed.error).toBe("age-limit");
    }
  });

  it("не пропускает границу и в условиях с обязанностями", () => {
    expect(
      parseVacancyForm(buildForm({ conditions: "Возраст 18–45 лет." })),
    ).toEqual({ error: "age-limit" });
    expect(
      parseVacancyForm(buildForm({ responsibilities: "от 18 до 50" })),
    ).toEqual({ error: "age-limit" });
  });

  // Нижняя граница законна и остаётся: ограничение по совершеннолетию
  // прямо предусмотрено трудовым законодательством.
  it("пропускает «от 18 лет» без верхней границы", () => {
    const parsed = parseVacancyForm(
      buildForm({ requirements: "Возраст от 18 лет, опыт не требуется — обучим." }),
    );

    expect("data" in parsed).toBe(true);
  });
});
