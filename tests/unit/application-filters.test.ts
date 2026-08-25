import { describe, expect, it } from "vitest";
import {
  buildApplicationWhere,
  CITY_NOT_SET,
  hasActiveFilters,
  matchesSource,
  parseApplicationFilters,
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
      status: "NEW",
      vacancyId: "clv0vacancy0001",
    });

    expect(filters).toEqual({
      city: "Тверь",
      project: "Лента",
      query: "Иван",
      source: "ads",
      status: "NEW",
      vacancyId: "clv0vacancy0001",
    });
  });

  // Значение из адреса приходит от человека, а не от нас: мусор должен
  // отбрасываться, а не превращаться в запрос с несуществующим статусом.
  it("отбрасывает несуществующие статус и источник", () => {
    const filters = parseApplicationFilters({
      source: "выдумка",
      status: "ВЫДУМКА",
    });

    expect(filters.status).toBeNull();
    expect(filters.source).toBeNull();
  });

  it("пустые параметры не считаются фильтром", () => {
    expect(hasActiveFilters(parseApplicationFilters({}))).toBe(false);
    expect(hasActiveFilters(parseApplicationFilters({ q: "Иван" }))).toBe(false);
    expect(hasActiveFilters(parseApplicationFilters({ status: "NEW" }))).toBe(
      true,
    );
  });
});

describe("buildApplicationWhere", () => {
  it("собирает условие для базы", () => {
    const where = buildApplicationWhere(
      parseApplicationFilters({
        project: "Лента",
        status: "NEW",
        vacancyId: "clv0vacancy0001",
      }),
    );

    expect(where).toEqual({
      projectSnapshot: "Лента",
      status: "NEW",
      vacancyId: "clv0vacancy0001",
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

  it("источник в условие не попадает — он не колонка", () => {
    const where = buildApplicationWhere(
      parseApplicationFilters({ source: "ads" }),
    );

    expect(where).toEqual({});
  });
});

describe("matchesSource", () => {
  const row = { trafficSource: "yandex", utmSource: "yandex" };

  it("без выбранного источника пропускает всё", () => {
    expect(matchesSource(row, null)).toBe(true);
  });

  it("отбирает по корзине, а не по строке", () => {
    expect(matchesSource(row, "ads")).toBe(true);
    expect(matchesSource(row, "search")).toBe(false);
    expect(
      matchesSource({ trafficSource: "yandex.ru", utmSource: null }, "search"),
    ).toBe(true);
  });
});
