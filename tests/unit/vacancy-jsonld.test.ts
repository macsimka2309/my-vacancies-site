import { describe, expect, it } from "vitest";
import { getCityIn, getRegionByCity } from "@/lib/cities";
import { buildJobPostingJsonLd } from "@/lib/vacancy-jsonld";
import { getValidThrough, VALID_THROUGH_DAYS } from "@/lib/vacancy-validity";
import type { VacancyDetails } from "@/lib/vacancies";

function buildVacancy(overrides: Partial<VacancyDetails> = {}): VacancyDetails {
  return {
    id: "clv0vacancy0001",
    slug: "kurer-lenta-belgorod-avto",
    title: "Курьер на авто",
    project: "Лента",
    city: "Белгород",
    workFormat: "Свободный график",
    salary: "до 6500 ₽ за смену · от 102 000 ₽/мес",
    salaryShiftMin: null,
    salaryShiftMax: 6500,
    salaryShiftAvg: null,
    salaryPeriodMin: 102_000,
    salaryPeriodMax: null,
    salaryPeriod: "MONTH",
    validThrough: null,
    schedule: "Полный рабочий день. Графики 7/0, 5/2 или 2/2.",
    responsibilities: "Доставка заказов из магазина клиентам",
    requirements: "Возраст от 18 лет, опыт не требуется — обучим.",
    conditions:
      "• Еженедельные выплаты, для новичков возможны ежедневные\n• Бонус «Приведи друга»",
    address: null,
    contactComment: null,
    isActive: true,
    createdAt: new Date("2026-08-01T10:00:00.000Z"),
    updatedAt: new Date("2026-08-19T10:00:00.000Z"),
    ...overrides,
  } as VacancyDetails;
}

describe("getValidThrough", () => {
  // Объявление без срока агрегаторы отбраковывают при импорте. Проставлять
  // дату руками по всем вакансиям нельзя — протухнут разом и молча.
  it("считает срок от последней правки, когда поле пустое", () => {
    const validThrough = getValidThrough({
      validThrough: null,
      updatedAt: new Date("2026-08-19T10:00:00.000Z"),
    });

    expect(validThrough.toISOString().slice(0, 10)).toBe("2026-10-18");
  });

  it("любая правка вакансии отодвигает срок", () => {
    const before = getValidThrough({
      validThrough: null,
      updatedAt: new Date("2026-08-19T10:00:00.000Z"),
    });
    const after = getValidThrough({
      validThrough: null,
      updatedAt: new Date("2026-09-19T10:00:00.000Z"),
    });

    expect(after.getTime()).toBeGreaterThan(before.getTime());
    expect(VALID_THROUGH_DAYS).toBe(60);
  });

  it("ручная дата побеждает автоматическую", () => {
    const manual = new Date("2026-09-15T00:00:00.000Z");

    expect(
      getValidThrough({ validThrough: manual, updatedAt: new Date() }),
    ).toBe(manual);
  });
});

describe("getRegionByCity", () => {
  it("знает города каталога", () => {
    expect(getRegionByCity("Белгород")).toBe("Белгородская область");
    expect(getRegionByCity("Энгельс")).toBe("Саратовская область");
    expect(getRegionByCity("Ногинск")).toBe("Московская область");
  });

  it("не путается в написании города", () => {
    expect(getRegionByCity("Орёл")).toBe("Орловская область");
    expect(getRegionByCity("орел")).toBe("Орловская область");
    expect(getRegionByCity(" Ростов-на-Дону ")).toBe("Ростовская область");
  });

  // Неверный регион увёл бы вакансию не в ту выдачу — это хуже пустого поля.
  it("молчит про незнакомый город", () => {
    expect(getRegionByCity("Урюпинск")).toBeNull();
    expect(getRegionByCity(null)).toBeNull();
  });
});

describe("buildJobPostingJsonLd", () => {
  it("отдаёт срок действия объявления", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy());

    expect(jsonLd.validThrough).toBe("2026-10-18T10:00:00.000Z");
  });

  // Без постоянного номера повторная выгрузка заводит дубль вместо правки.
  it("отдаёт постоянный идентификатор объявления", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy());

    expect(jsonLd.identifier).toEqual({
      "@type": "PropertyValue",
      name: "Работа Рядом",
      value: "clv0vacancy0001",
    });
  });

  it("добавляет регион к городу", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy()) as {
      jobLocation: { address: Record<string, string> };
    };

    expect(jsonLd.jobLocation.address).toMatchObject({
      addressLocality: "Белгород",
      addressRegion: "Белгородская область",
      addressCountry: "RU",
    });
  });

  it("не подставляет регион для незнакомого города", () => {
    const jsonLd = buildJobPostingJsonLd(
      buildVacancy({ city: "Урюпинск" }),
    ) as { jobLocation: { address: Record<string, string> } };

    expect(jsonLd.jobLocation.address).not.toHaveProperty("addressRegion");
  });

  it("указывает ссылку и логотип работодателя", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy());

    expect(jsonLd.hiringOrganization).toMatchObject({
      name: "Работа Рядом",
      url: "https://my-dream-vacancy.ru",
      logo: "https://my-dream-vacancy.ru/logo-mark.png",
    });
  });

  it("помечает вакансию как не требующую опыта, когда это написано", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy());

    expect(jsonLd.experienceRequirements).toEqual({
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: 0,
    });
  });

  // Молчание о требованиях не означает, что опыт не нужен.
  it("молчит про опыт, когда вакансия о нём не говорит", () => {
    const jsonLd = buildJobPostingJsonLd(
      buildVacancy({
        title: "ВАХТА курьер",
        requirements: "Возраст 18–50 лет. Документы: паспорт, ИНН и СНИЛС.",
        conditions: "• Проживание за счёт компании",
      }),
    );

    expect(jsonLd).not.toHaveProperty("experienceRequirements");
  });

  it("отдаёт условия как jobBenefits без маркеров списка", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy());

    expect(jsonLd.jobBenefits).toBe(
      "Еженедельные выплаты, для новичков возможны ежедневные; Бонус «Приведи друга»",
    );
  });

  it("отдаёт график как workHours", () => {
    const jsonLd = buildJobPostingJsonLd(buildVacancy());

    expect(jsonLd.workHours).toBe(
      "Полный рабочий день. Графики 7/0, 5/2 или 2/2.",
    );
  });

  it("добавляет адрес точки, когда он заполнен", () => {
    const jsonLd = buildJobPostingJsonLd(
      buildVacancy({ address: "ул. Щорса, 45" }),
    ) as { jobLocation: { address: Record<string, string> } };

    expect(jsonLd.jobLocation.address.streetAddress).toBe("ул. Щорса, 45");
  });
});
