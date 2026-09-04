import { describe, expect, it } from "vitest";
import {
  buildCityContext,
  joinProjects,
  type CityContextVacancy,
} from "@/lib/city-context";

function vacancy(
  overrides: Partial<CityContextVacancy> & { slug: string },
): CityContextVacancy {
  return {
    id: `id-${overrides.slug}`,
    workFormat: "Свободный график",
    schedule: "Полный рабочий день. Графики 7/0, 5/2 или 2/2.",
    title: "Курьер на авто",
    project: "Лента",
    city: "Тверь",
    salary: "до 6000 ₽ за смену",
    salaryShiftMin: null,
    salaryShiftMax: 6000,
    updatedAt: new Date("2026-08-20T00:00:00.000Z"),
    ...overrides,
  };
}

const tver = [
  vacancy({ slug: "kurer-magnit-tver-avto", project: "Магнит", salaryShiftMax: 7032 }),
  vacancy({ slug: "kurer-lenta-tver-avto" }),
  vacancy({
    slug: "sborshchik-lenta-tver",
    title: "Сборщик заказов",
    salaryShiftMax: 4800,
  }),
];

// Свердловская область — единственный регион каталога, где городов сразу три.
// Справочник lib/cities.ts намеренно знает только города каталога, поэтому
// выдуманный сосед вроде «Ржева» в соседи не попадёт: региона у него нет.
const sverdlovsk = [
  vacancy({ slug: "kurer-lenta-ekb-avto", city: "Екатеринбург" }),
  vacancy({ slug: "sborshchik-lenta-ekb", city: "Екатеринбург", title: "Сборщик заказов" }),
  vacancy({ slug: "kurer-lenta-ekb-velo", city: "Екатеринбург", title: "Курьер на велосипеде" }),
  vacancy({ slug: "kurer-samokat-nt-velo", city: "Нижний Тагил", title: "Курьер на велосипеде" }),
  vacancy({ slug: "kurer-samokat-nt-evelo", city: "Нижний Тагил", title: "Курьер на электровелосипеде" }),
  vacancy({ slug: "kurer-lenta-ku-largus", city: "Каменск-Уральский", title: "Курьер на а/м (универсал)" }),
];

const elsewhere = [
  vacancy({ slug: "kurer-lenta-samara-avto", city: "Самара", salaryShiftMax: 6500 }),
];

describe("buildCityContext", () => {
  it("собирает соседей по городу и ставит дорогие сверху", () => {
    const context = buildCityContext(tver[1], [...tver, ...sverdlovsk]);

    expect(context.total).toBe(3);
    expect(context.peers.map((peer) => peer.slug)).toEqual([
      "kurer-magnit-tver-avto",
      "sborshchik-lenta-tver",
    ]);
    expect(context.projects).toEqual(["Лента", "Магнит"]);
    expect(context.region).toBe("Тверская область");
  });

  // Человека без велосипеда мы теряли молча: работа для него в городе есть.
  it("находит вариант без своего транспорта", () => {
    const context = buildCityContext(tver[1], tver);

    expect(context.noTransportPeer?.slug).toBe("sborshchik-lenta-tver");
  });

  it("не предлагает сборщику искать работу без транспорта", () => {
    const context = buildCityContext(tver[2], tver);

    expect(context.noTransportPeer).toBeNull();
  });

  // Электровелосипед на части проектов выдают в аренду — утверждать,
  // что он «свой», мы не можем, поэтому про такие вакансии молчим.
  it("не делает выводов про электровелосипед", () => {
    const evelo = vacancy({
      slug: "kurer-samokat-tver-evelo",
      title: "Курьер на электровелосипеде",
    });
    const context = buildCityContext(evelo, [...tver, evelo]);

    expect(context.noTransportPeer).toBeNull();
  });

  it("показывает соседние города того же региона, крупные сверху", () => {
    const context = buildCityContext(sverdlovsk[0], [
      ...sverdlovsk,
      ...tver,
      ...elsewhere,
    ]);

    // Слаг нужен, чтобы вести на городскую страницу (п. 12), а не на
    // `?city=`, который канонизируется на главную и ссылкой не считается.
    expect(context.regionCities).toEqual([
      { city: "Нижний Тагил", slug: "nizhniy-tagil", count: 2 },
      { city: "Каменск-Уральский", slug: "kamensk-uralskiy", count: 1 },
    ]);
    // Самара и Тверь — другие регионы, в списке им не место.
    expect(context.regionCities.map((item) => item.city)).not.toContain(
      "Самара",
    );
  });

  // 33 города каталога держат ровно одну вакансию. Пустой блок «Ещё в
  // городе» там был бы хуже, чем его отсутствие, — компонент это учитывает.
  it("честно отдаёт пустоту для единственной вакансии без соседей", () => {
    const alone = vacancy({ slug: "kurer-lenta-magadan-avto", city: "Магадан" });
    const context = buildCityContext(alone, [alone, ...tver]);

    expect(context.total).toBe(1);
    expect(context.peers).toEqual([]);
    expect(context.regionCities).toEqual([]);
  });

  it("не падает на городе вне справочника", () => {
    const unknown = vacancy({ slug: "kurer-lenta-uryupinsk", city: "Урюпинск" });
    const context = buildCityContext(unknown, [unknown, ...tver]);

    expect(context.region).toBeNull();
    expect(context.regionCities).toEqual([]);
  });
});

describe("joinProjects", () => {
  it("перечисляет проекты по-человечески", () => {
    expect(joinProjects(["Лента", "Магнит", "Самокат"])).toBe(
      "Лента, Магнит и Самокат",
    );
    expect(joinProjects(["Лента", "Магнит"])).toBe("Лента и Магнит");
    expect(joinProjects(["Лента"])).toBe("Лента");
    expect(joinProjects([])).toBe("");
  });
});
