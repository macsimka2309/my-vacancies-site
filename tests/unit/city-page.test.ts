import { describe, expect, it } from "vitest";
import type { CityContextVacancy } from "@/lib/city-context";
import {
  buildCityFaq,
  buildCityPage,
  CITY_PAGE_MIN_VACANCIES,
  getIndexableCities,
} from "@/lib/city-page";
import {
  buildCityPageDescription,
  buildCityPageTitle,
  DESCRIPTION_LIMIT,
  TITLE_LIMIT,
} from "@/lib/meta";

function vacancy(
  overrides: Partial<CityContextVacancy> & { slug: string },
): CityContextVacancy {
  return {
    title: "Курьер на авто",
    project: "Лента",
    city: "Тверь",
    salary: "до 6000 ₽ за смену",
    salaryShiftMin: null,
    salaryShiftMax: 6000,
    ...overrides,
  };
}

const catalog = [
  vacancy({ slug: "kurer-magnit-tver-avto", project: "Магнит", salaryShiftMax: 7032 }),
  vacancy({ slug: "kurer-lenta-tver-avto" }),
  vacancy({
    slug: "kurer-samokat-tver-velo",
    project: "Самокат",
    title: "Курьер на велосипеде",
    salary: "1500–4800 ₽ за смену",
    salaryShiftMin: 1500,
    salaryShiftMax: 4800,
  }),
  vacancy({
    slug: "sborshchik-lenta-tver",
    title: "Сборщик заказов",
    salaryShiftMax: 4500,
  }),
  // Один город с единственной вакансией и один — с двумя: оба ниже порога.
  vacancy({ slug: "kurer-lenta-belgorod-avto", city: "Белгород" }),
  vacancy({ slug: "kurer-lenta-omsk-avto", city: "Омск" }),
  vacancy({ slug: "sborshchik-lenta-omsk", city: "Омск", title: "Сборщик заказов" }),
];

describe("buildCityPage", () => {
  it("группирует вакансии по профессиям, дорогие сверху", () => {
    const page = buildCityPage("Тверь", catalog);

    expect(page?.total).toBe(4);
    expect(page?.professions.map((item) => item.title)).toEqual([
      "Курьер на авто",
      "Курьер на велосипеде",
      "Сборщик заказов",
    ]);
    expect(page?.professions[0].count).toBe(2);
    expect(page?.professions[0].to).toBe(7032);
    expect(page?.projects).toEqual(["Лента", "Магнит", "Самокат"]);
    expect(page?.slug).toBe("tver");
  });

  // Нижняя граница известна у 40 вакансий из 169 — где её нет, не выдумываем.
  it("берёт нижнюю границу только там, где она есть", () => {
    const page = buildCityPage("Тверь", catalog);
    const [avto, velo] = page!.professions;

    expect(avto.from).toBeNull();
    expect(velo.from).toBe(1500);
  });

  it("находит работу без своего транспорта", () => {
    expect(buildCityPage("Тверь", catalog)?.noTransportProfession).toBe(
      "Сборщик заказов",
    );
    expect(buildCityPage("Белгород", catalog)?.noTransportProfession).toBeNull();
  });

  // 58 городов из 78 держат одну-две вакансии: страница такого города —
  // копия карточки, и поиску её отдавать нельзя.
  it("отмечает города ниже порога как непригодные для индекса", () => {
    expect(buildCityPage("Тверь", catalog)?.indexable).toBe(true);
    expect(buildCityPage("Омск", catalog)?.indexable).toBe(false);
    expect(buildCityPage("Белгород", catalog)?.indexable).toBe(false);
    expect(CITY_PAGE_MIN_VACANCIES).toBe(3);
  });

  it("не строит страницу для города вне каталога и вне справочника", () => {
    expect(buildCityPage("Тула", catalog)).toBeNull();
    expect(buildCityPage("Урюпинск", catalog)).toBeNull();
  });

  it("в sitemap отдаёт только города выше порога", () => {
    expect(getIndexableCities(catalog)).toEqual(["Тверь"]);
  });
});

// Intl.NumberFormat разделяет разряды неразрывным пробелом, а не обычным —
// сравнивать строки в лоб бесполезно.
const plain = (value: string) => value.replace(/\s/g, " ");

describe("buildCityFaq", () => {
  it("строит вопросы только из данных города", () => {
    const faq = buildCityFaq(buildCityPage("Тверь", catalog)!);

    expect(faq.map((item) => item.question)).toEqual([
      "Сколько платят в Твери?",
      "Какая работа есть в Твери?",
      "Есть ли в Твери работа без своего транспорта?",
    ]);
    expect(plain(faq[0].answer)).toContain(
      "Курьер на велосипеде — от 1 500 до 4 800 ₽",
    );
    expect(plain(faq[0].answer)).toContain("Курьер на авто — до 7 032 ₽");
  });

  it("не спрашивает про транспорт там, где ответа нет", () => {
    const faq = buildCityFaq(buildCityPage("Белгород", catalog)!);

    expect(faq.map((item) => item.question)).not.toContain(
      "Есть ли в Белгороде работа без своего транспорта?",
    );
  });
});

describe("заголовки городской страницы", () => {
  it("называет профессии, которые в городе действительно есть", () => {
    const tver = buildCityPage("Тверь", catalog)!;
    const belgorod = buildCityPage("Белгород", catalog)!;

    expect(buildCityPageTitle(tver)).toBe(
      "Работа курьером и сборщиком заказов в Твери — 4 вакансии",
    );
    expect(buildCityPageTitle(belgorod)).toBe(
      "Работа курьером в Белгороде — 1 вакансия",
    );
  });

  // У Санкт-Петербурга полная формула выходит за 60 знаков — заголовок
  // должен ужаться сам, а не обрезаться в выдаче на полуслове.
  it("ужимается под лимит выдачи", () => {
    const spb = buildCityPageTitle({
      city: "Санкт-Петербург",
      cityIn: "Санкт-Петербурге",
      total: 8,
      professions: [{ title: "Курьер на авто" }, { title: "Сборщик заказов" }],
      to: 9500,
    });

    expect(spb.length).toBeLessThanOrEqual(TITLE_LIMIT);
    expect(spb).toContain("Санкт-Петербурге");
  });

  it("описание перечисляет профессии и не выходит за лимит", () => {
    const description = buildCityPageDescription(buildCityPage("Тверь", catalog)!);

    expect(description).toContain("курьер на авто");
    expect(plain(description)).toContain("7 032 ₽ за смену");
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
  });
});
