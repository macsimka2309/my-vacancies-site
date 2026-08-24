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
  // Замер Вебмастера 24.08: 78 % показов — по запросам с названием бренда,
  // а в заголовке бренда не было. При позициях 5–12 за неделю два клика.
  it("называет бренд сразу за профессией", () => {
    const title = buildVacancyTitle(vacancy);

    expect(title).toBe("Курьер на авто в Ленте — Белгород, до 6500 ₽ за смену");
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
  });

  it("склоняет все три проекта каталога", () => {
    expect(buildVacancyTitle({ ...vacancy, project: "Магнит" })).toContain(
      "в Магните",
    );
    expect(buildVacancyTitle({ ...vacancy, project: "Самокат" })).toContain(
      "в Самокате",
    );
  });

  // Ровно тот случай, ради которого добавлена короткая запись ставки:
  // самая ценная страница каталога по числу показов.
  it("сокращает ставку, но не выбрасывает её ради Санкт-Петербурга", () => {
    const title = buildVacancyTitle({
      ...vacancy,
      title: "Сборщик заказов",
      city: "Санкт-Петербург",
      salary: "до 4500 ₽ за смену",
    });

    expect(title).toBe(
      "Сборщик заказов в Ленте — Санкт-Петербург, до 4500 ₽/смена",
    );
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
  });

  it("жертвует ставкой, когда не помогает и короткая запись", () => {
    const title = buildVacancyTitle({
      ...vacancy,
      title: "Курьер на электровелосипеде",
      project: "Самокат",
      city: "Великий Новгород",
    });

    expect(title).toBe("Курьер на электровелосипеде в Самокате — Великий Новгород");
    expect(title.length).toBeLessThanOrEqual(TITLE_LIMIT);
  });

  // Неверный падеж заметнее, чем запятая, поэтому незнакомый проект не склоняем.
  it("не склоняет незнакомый проект", () => {
    expect(buildVacancyTitle({ ...vacancy, project: "Пятёрочка" })).toBe(
      "Курьер на авто, Пятёрочка — Белгород, до 6500 ₽ за смену",
    );
  });

  it("работает с городом вне справочника и без зарплаты", () => {
    expect(buildVacancyTitle({ ...vacancy, city: "Урюпинск" })).toBe(
      "Курьер на авто в Ленте — Урюпинск, до 6500 ₽ за смену",
    );
    expect(buildVacancyTitle({ ...vacancy, salary: null })).toBe(
      "Курьер на авто в Ленте — Белгород",
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
