import { describe, expect, it } from "vitest";
import { getCityIn } from "@/lib/cities";
import {
  buildCatalogDescription,
  buildCatalogTitle,
  buildVacancyDescription,
  buildVacancyTitle,
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
} from "@/lib/meta";

const vacancy = {
  city: "Белгород",
  project: "Лента",
  salary: "до 6500 ₽ за смену · от 102 000 ₽/мес",
  title: "Курьер на авто",
};

describe("getCityIn", () => {
  it("склоняет города каталога", () => {
    expect(getCityIn("Белгород")).toBe("Белгороде");
    expect(getCityIn("Тверь")).toBe("Твери");
    expect(getCityIn("Нижний Новгород")).toBe("Нижнем Новгороде");
    expect(getCityIn("Ростов-на-Дону")).toBe("Ростове-на-Дону");
    expect(getCityIn("Набережные Челны")).toBe("Набережных Челнах");
    expect(getCityIn("Орёл")).toBe("Орле");
  });

  it("оставляет несклоняемые названия как есть", () => {
    expect(getCityIn("Тольятти")).toBe("Тольятти");
    expect(getCityIn("Улан-Удэ")).toBe("Улан-Удэ");
  });

  // Неверный падеж читается как неряшливость — лучше обойтись без предлога.
  it("молчит про незнакомый город", () => {
    expect(getCityIn("Урюпинск")).toBeNull();
  });
});

describe("buildVacancyTitle", () => {
  // Было 80 знаков: «Курьер на авто — Белгород — до 6500 ₽ за смену ·
  // от 102 000 ₽/мес — Работа Рядом». Обрезался именно месячный доход.
  it("помещается в лимит выдачи и называет город в падеже", () => {
    const title = buildVacancyTitle(vacancy);

    expect(title).toBe("Курьер на авто в Белгороде — до 6500 ₽ за смену");
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
  });

  it("жертвует ставкой, если иначе заголовок не помещается", () => {
    const title = buildVacancyTitle({
      ...vacancy,
      title: "Курьер на электровелосипеде",
      city: "Санкт-Петербург",
    });

    expect(title).toBe("Курьер на электровелосипеде в Санкт-Петербурге");
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
  });

  it("обходится без предлога для незнакомого города", () => {
    expect(buildVacancyTitle({ ...vacancy, city: "Урюпинск" })).toBe(
      "Курьер на авто — Урюпинск — до 6500 ₽ за смену",
    );
  });

  it("работает без указанной зарплаты", () => {
    expect(buildVacancyTitle({ ...vacancy, salary: null })).toBe(
      "Курьер на авто в Белгороде",
    );
  });
});

describe("buildVacancyDescription", () => {
  // Раньше описание начиналось с «официальный партнёр Лента ·» и содержало
  // маркер списка «•» — всё это было видно человеку в выдаче.
  it("начинается с профессии, а не со служебных слов", () => {
    const description = buildVacancyDescription(vacancy);

    expect(description).toContain("Курьер на авто в Белгороде, Лента.");
    expect(description).not.toContain("официальный партнёр");
    expect(description).not.toContain("•");
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
  });
});

describe("buildCatalogTitle", () => {
  // Было «Вакансии — Работа Рядом»: 23 знака и ни одного искомого слова.
  it("называет профессии и объём каталога", () => {
    const title = buildCatalogTitle({
      cities: [],
      cityCount: 78,
      vacancyCount: 169,
    });

    expect(title).toBe(
      "Работа курьером и сборщиком заказов — 169 вакансий",
    );
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
  });

  it("склоняет город, когда выбран ровно один", () => {
    expect(
      buildCatalogTitle({ cities: ["Тверь"], cityCount: 78, vacancyCount: 6 }),
    ).toBe("Работа курьером в Твери — 6 вакансий");
  });

  it("согласует число с существительным", () => {
    expect(
      buildCatalogTitle({ cities: ["Рязань"], cityCount: 78, vacancyCount: 2 }),
    ).toBe("Работа курьером в Рязани — 2 вакансии");
    expect(
      buildCatalogTitle({ cities: ["Тула"], cityCount: 78, vacancyCount: 1 }),
    ).toBe("Работа курьером в Туле — 1 вакансия");
  });
});

describe("buildCatalogDescription", () => {
  it("помещается в лимит и не обрывается на полуслове", () => {
    const description = buildCatalogDescription({
      cities: [],
      cityCount: 78,
      vacancyCount: 169,
    });

    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
    expect(description).toContain("169 вакансий в 78 городах России");
  });
});
