import { describe, expect, it } from "vitest";
import {
  buildLeadReport,
  formatShare,
  REPORT_CITY_NOT_SET,
  type ReportSourceRow,
} from "@/lib/application-report";

function row(overrides: Partial<ReportSourceRow>): ReportSourceRow {
  return {
    city: "Тверь",
    projectSnapshot: "Лента",
    status: "IN_PROGRESS",
    trafficSource: "yandex",
    utmSource: "yandex",
    ...overrides,
  };
}

describe("buildLeadReport", () => {
  it("группирует по городу, проекту и корзине источника — не по вакансии", () => {
    const rows = buildLeadReport([
      row({}),
      row({}),
      row({ projectSnapshot: "Магнит" }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({ city: "Тверь", project: "Лента", channel: "ads", total: 2 }),
      expect.objectContaining({ city: "Тверь", project: "Магнит", channel: "ads", total: 1 }),
    ]);
  });

  // Человек из Telegram, откликнувшийся на вакансию в соседнем городе,
  // должен попасть в отчёт по своему городу, а не по городу вакансии —
  // поэтому источник группировки: Application.city, а не вакансия.
  it("пустой город уходит в отдельную корзину, а не пропадает", () => {
    const rows = buildLeadReport([row({ city: null }), row({ city: "  " })]);

    expect(rows).toEqual([
      expect.objectContaining({ city: REPORT_CITY_NOT_SET, total: 2 }),
    ]);
  });

  // Тот же разбор, что у фильтра (п. 41): три написания одного источника
  // не должны разложить один канал на три строки отчёта.
  it("сводит разные написания источника в одну корзину", () => {
    const rows = buildLeadReport([
      row({ trafficSource: "yandex.ru", utmSource: null }),
      row({ trafficSource: "alice.yandex.ru", utmSource: null }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({ channel: "search", total: 2 }),
    ]);
  });

  it("считает дошедших до стажировки отдельно от реально вышедших", () => {
    const rows = buildLeadReport([
      row({ status: "IN_PROGRESS" }),
      row({ status: "TO_INTERNSHIP" }),
      row({ status: "INTERNSHIP_STARTED" }),
      row({ status: "DEAL_CLOSED" }),
    ]);

    expect(rows[0]).toMatchObject({
      total: 4,
      // TO_INTERNSHIP, INTERNSHIP_STARTED и DEAL_CLOSED — все дошли хотя бы
      // до стажировки.
      reachedInternship: 3,
      // Реально вышли — только последние два.
      startedShift: 2,
      startedShare: 0.5,
    });
  });

  it("не выдаёт долю там, где лидов нет", () => {
    expect(buildLeadReport([])).toEqual([]);
  });

  it("сортирует по числу лидов, при равенстве — по городу", () => {
    const rows = buildLeadReport([
      row({ city: "Омск" }),
      row({ city: "Тверь" }),
      row({ city: "Тверь" }),
    ]);

    expect(rows.map((item) => item.city)).toEqual(["Тверь", "Омск"]);
  });
});

describe("formatShare", () => {
  it("форматирует долю в проценты", () => {
    expect(formatShare(0.5)).toBe("50 %");
    expect(formatShare(0.333)).toBe("33,3 %");
  });

  // Отсутствие лидов — не «0 %»: это не тот же факт, что «никто не вышел
  // из пришедших».
  it("отдаёт прочерк, когда доля неизвестна", () => {
    expect(formatShare(null)).toBe("—");
  });
});
