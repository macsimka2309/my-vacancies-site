import { describe, expect, it } from "vitest";
import {
  buildAdminUrl,
  buildApplicationWhere,
  CITY_NOT_SET,
  EMPTY_FILTERS,
  hasActiveFilters,
  matchesSource,
  parseApplicationFilters,
  toggleValue,
} from "@/lib/application-filters";
import { getSourceBucket } from "@/lib/application-source";

describe("getSourceBucket", () => {
  // Настоящие значения из боевой базы на 25.08: три написания одного Яндекса
  // и один ВК. Именно поэтому фильтр работает по корзинам, а не по строкам.
  it("сводит три написания Яндекса в один источник", () => {
    expect(getSourceBucket("yandex", "yandex")).toBe("ads");
    expect(getSourceBucket("yandex.ru", null)).toBe("search");
    expect(getSourceBucket("alice.yandex.ru", null)).toBe("search");
  });

  it("отличает рекламу от органики по метке, а не по домену", () => {
    // Один и тот же домен: с utm — реклама, без неё — поиск.
    expect(getSourceBucket("yandex.ru", "yandex")).toBe("ads");
    expect(getSourceBucket("yandex.ru", null)).toBe("search");
  });

  it("узнаёт соцсети", () => {
    expect(getSourceBucket("away.vk.ru", null)).toBe("social");
    expect(getSourceBucket("t.me", null)).toBe("social");
  });

  it("ручные отклики отделены от органических", () => {
    expect(getSourceBucket("manual:telegram", null)).toBe("manual");
    expect(getSourceBucket("manual:call", null)).toBe("manual");
  });

  it("пустой источник — прямой заход", () => {
    expect(getSourceBucket(null, null)).toBe("direct");
    expect(getSourceBucket("direct", null)).toBe("direct");
  });

  it("незнакомый хост не выдаёт себя за поиск", () => {
    expect(getSourceBucket("example.com", null)).toBe("other");
  });
});

describe("parseApplicationFilters", () => {
  it("разбирает все пять условий", () => {
    const filters = parseApplicationFilters({
      city: "Тверь",
      project: "Лента",
      q: "  Иван  ",
      source: "ads",
      status: "IN_PROGRESS",
      vacancyId: "clv0vacancy0001",
    });

    expect(filters).toEqual({
      cities: ["Тверь"],
      projects: ["Лента"],
      query: "Иван",
      sources: ["ads"],
      statuses: ["IN_PROGRESS"],
      vacancyIds: ["clv0vacancy0001"],
    });
  });

  // «Покажи всё, до чего не дошли руки» — это несколько статусов сразу,
  // одним значением так не спросишь.
  it("принимает несколько значений одного фильтра", () => {
    const filters = parseApplicationFilters({
      status: ["IN_PROGRESS", "RESERVE"],
      city: ["Москва", "Тверь"],
    });

    expect(filters.statuses).toEqual(["IN_PROGRESS", "RESERVE"]);
    expect(filters.cities).toEqual(["Москва", "Тверь"]);
  });

  // Значение из адреса приходит от человека, а не от нас: мусор должен
  // отбрасываться, а не превращаться в запрос с несуществующим статусом.
  it("отбрасывает несуществующие статус и источник", () => {
    const filters = parseApplicationFilters({
      source: ["ads", "выдумка"],
      status: ["ВЫДУМКА", "IN_PROGRESS"],
    });

    expect(filters.statuses).toEqual(["IN_PROGRESS"]);
    expect(filters.sources).toEqual(["ads"]);
  });

  it("пустые параметры не считаются фильтром", () => {
    expect(hasActiveFilters(parseApplicationFilters({}))).toBe(false);
    expect(hasActiveFilters(parseApplicationFilters({ q: "Иван" }))).toBe(false);
    expect(hasActiveFilters(parseApplicationFilters({ status: "IN_PROGRESS" }))).toBe(
      true,
    );
  });
});

describe("buildApplicationWhere", () => {
  it("собирает условие для базы", () => {
    const where = buildApplicationWhere(
      parseApplicationFilters({
        project: "Лента",
        status: "IN_PROGRESS",
        vacancyId: "clv0vacancy0001",
      }),
    );

    expect(where).toEqual({
      projectSnapshot: { in: ["Лента"] },
      status: { in: ["IN_PROGRESS"] },
      vacancyId: { in: ["clv0vacancy0001"] },
    });
  });

  // Город бывает пуст. Без явного варианта такие отклики исчезали бы из
  // всех городских выборок, и суммы перестали бы сходиться с общим числом.
  it("ищет отклики без города", () => {
    const where = buildApplicationWhere(
      parseApplicationFilters({ city: CITY_NOT_SET }),
    );

    expect(where).toEqual({ OR: [{ city: null }, { city: "" }] });
  });

  // «Москва плюс те, у кого город не проставлен» — одно условие, а не два
  // прохода по списку.
  it("совмещает выбранные города с «не указан»", () => {
    const where = buildApplicationWhere(
      parseApplicationFilters({ city: ["Москва", CITY_NOT_SET] }),
    );

    expect(where).toEqual({
      OR: [{ city: { in: ["Москва"] } }, { city: null }, { city: "" }],
    });
  });

  it("источник в условие не попадает — он не колонка", () => {
    const where = buildApplicationWhere(
      parseApplicationFilters({ source: "ads" }),
    );

    expect(where).toEqual({});
  });
});

describe("matchesSource", () => {
  const row = { trafficSource: "yandex", utmSource: "yandex" };

  it("пустой набор пропускает всё", () => {
    expect(matchesSource(row, [])).toBe(true);
  });

  it("отбирает по корзине, а не по строке", () => {
    expect(matchesSource(row, ["ads"])).toBe(true);
    expect(matchesSource(row, ["search"])).toBe(false);
    expect(
      matchesSource({ trafficSource: "yandex.ru", utmSource: null }, ["search"]),
    ).toBe(true);
  });

  it("несколько корзин работают как «или»", () => {
    expect(matchesSource(row, ["search", "ads"])).toBe(true);
    expect(matchesSource(row, ["search", "social"])).toBe(false);
  });
});

describe("toggleValue", () => {
  it("добавляет и убирает значение", () => {
    expect(toggleValue([], "RESERVE")).toEqual(["RESERVE"]);
    expect(toggleValue(["RESERVE"], "IN_PROGRESS")).toEqual([
      "RESERVE",
      "IN_PROGRESS",
    ]);
    expect(toggleValue(["RESERVE", "IN_PROGRESS"], "RESERVE")).toEqual([
      "IN_PROGRESS",
    ]);
  });
});

describe("buildAdminUrl", () => {
  it("складывает набор в повторяющиеся параметры", () => {
    const url = buildAdminUrl({
      ...EMPTY_FILTERS,
      statuses: ["IN_PROGRESS", "RESERVE"],
      cities: ["Москва"],
    });

    expect(url).toBe(
      "/admin?status=IN_PROGRESS&status=RESERVE&city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0",
    );
  });

  it("без фильтров даёт чистый адрес", () => {
    expect(buildAdminUrl(EMPTY_FILTERS)).toBe("/admin");
  });
});
