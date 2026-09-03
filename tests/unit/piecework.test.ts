import { describe, expect, it } from "vitest";
import {
  formatPartValue,
  formatPayPerOrder,
  getPayPerOrder,
  parsePiecework,
} from "@/lib/piecework";

// Настоящие строки из таблицы партнёра на 03.09.2026.
const LENTA_TVER =
  "час 0р/заказ 148р перевес свыше 20 кг-60р, перевес свыше 40 кг-104р, " +
  "перевес свыше 75 кг-148р,  перепробег-11,2 р, Мин смена - 12 ч / 10 з-184,80р";

const LENTA_MOSKVA =
  "МСК: час 0р/заказ 271,54р перевес свыше 20 кг-74,62р, перевес свыше 40 кг-130,77р, " +
  "перевес свыше 75 кг-202,31р, заказ КГТ- 702,31, перепробег-23,85р, " +
  "Мин смена - 12 ч / 10 з-258,46р";

const MAGNIT_CHELYABINSK = [
  "Км в пути от М до ТТ - 19",
  "Км в пути от ТТ до К - 19",
  "Бонус: тяжелый заказ - 25",
  "Повышающий коэффициент - 1",
  "Повышенное взятие - 68",
  "Повышенное вручение - 42",
  "Гарант доход в час - 0",
  "Минималка за 12 часов - 0",
  "Пороги минималки - 0/0/0",
  "Доход в день - 7100",
  "Доход в час - 591,67 ",
  "Доход в месяц - 184600 ",
  "Выплаты 1 раз в неделю",
].join("\n");

describe("parsePiecework", () => {
  // Строка Ленты идёт без разделителей между составляющими: «заказ 148р»
  // и «перевес свыше 20 кг-60р» разделены пробелом. Разбор идёт от сумм,
  // иначе метка с числом внутри распадается на части.
  it("разбирает строку Ленты со всеми составляющими", () => {
    expect(parsePiecework(LENTA_TVER)).toEqual([
      { key: "order", label: "за заказ", value: 148 },
      { key: "heavy", label: "за вес свыше 20 кг", value: 60 },
      { key: "heavy", label: "за вес свыше 40 кг", value: 104 },
      { key: "heavy", label: "за вес свыше 75 кг", value: 148 },
      { key: "overrun", label: "за километр сверх маршрута", value: 11.2 },
    ]);
  });

  // «заказ КГТ- 702,31,» обрывается запятой, без рубля. Пока сумма не
  // распознавалась, её подпись прилипала к следующей составляющей и
  // перепробег терялся вместе с ней.
  it("находит сумму, за которой не стоит рубль", () => {
    const parts = parsePiecework(LENTA_MOSKVA);

    expect(parts).toContainEqual({
      key: "oversize",
      label: "за крупногабаритный заказ",
      value: 702.31,
    });
    expect(parts).toContainEqual({
      key: "overrun",
      label: "за километр сверх маршрута",
      value: 23.85,
    });
  });

  it("разбирает список пар у Магнита", () => {
    expect(parsePiecework(MAGNIT_CHELYABINSK)).toEqual([
      { key: "kmToStore", label: "за километр до магазина", value: 19 },
      { key: "kmToClient", label: "за километр до клиента", value: 19 },
      { key: "heavy", label: "за тяжёлый заказ", value: 25 },
      { key: "pickup", label: "за сбор заказа", value: 68 },
      { key: "handover", label: "за вручение заказа", value: 42 },
    ]);
  });

  // «Доход в час — 591,67» это «Доход в день» ÷ 12-часовую смену, а не тариф.
  // Показать его как составляющую оплаты — обещать несуществующую гарантию.
  it("не принимает производные доходы за составляющие оплаты", () => {
    const labels = parsePiecework(MAGNIT_CHELYABINSK).map((part) => part.label);

    expect(labels.join(" ")).not.toMatch(/доход/i);
  });

  // Ноль означает «такой составляющей нет»: у Магнита «Гарант доход в час — 0»
  // это отсутствие гарантии, а не гарантия нулевого размера.
  it("пропускает нулевые и единичные служебные поля", () => {
    const labels = parsePiecework(MAGNIT_CHELYABINSK).map((part) => part.label);

    expect(labels).not.toContain("гарантия за час");
    expect(labels).not.toContain("минимум за 12-часовую смену");
    expect(labels.join(" ")).not.toMatch(/коэффициент|пороги/i);
  });

  // «Мин смена - 12 ч» и «10 з-184,80р» — служебные строки расчёта, а не
  // то, что кандидат получает на руки.
  it("не принимает служебные хвосты Ленты за оплату", () => {
    const labels = parsePiecework(LENTA_TVER).map((part) => part.label);

    expect(labels.join(" ")).not.toMatch(/смена|10 з/i);
  });

  // Региональные тарифы в одной ячейке («МСК: час 0р … МО: час 0р») —
  // это часовая часть, её ведёт lib/salary.ts, и она здесь ни при чём.
  it("не принимает региональную пометку за составляющую", () => {
    const labels = parsePiecework(LENTA_MOSKVA).map((part) => part.label);

    expect(labels.join(" ")).not.toMatch(/мск|мо\b|час/i);
  });

  it("молчит на пустом тарифе", () => {
    expect(parsePiecework(null)).toEqual([]);
    expect(parsePiecework(undefined)).toEqual([]);
    expect(parsePiecework("   ")).toEqual([]);
    expect(parsePiecework("Выплаты 1 раз в неделю")).toEqual([]);
  });
});

describe("getPayPerOrder", () => {
  it("берёт цену заказа, когда таблица называет её прямо", () => {
    expect(getPayPerOrder(parsePiecework(LENTA_TVER))).toBe(148);
  });

  // У Магнита цены заказа нет: есть «взятие» и «вручение» по отдельности.
  // Что курьер получает и то и другое за каждый заказ, таблица не говорит,
  // а складывать за партнёра — значит опубликовать свою цифру под его именем.
  it("не складывает взятие и вручение у Магнита", () => {
    expect(getPayPerOrder(parsePiecework(MAGNIT_CHELYABINSK))).toBeNull();
  });
});

describe("formatPayPerOrder", () => {
  it("подписывает цену заказа для карточки", () => {
    expect(formatPayPerOrder(148)).toBe("за заказ 148 ₽");
  });

  // Копейки убираем вниз — по той же причине, что и у часовой ставки:
  // названная сумма это обещание.
  it("убирает копейки округлением вниз", () => {
    expect(formatPayPerOrder(271.54)).toBe("за заказ 271 ₽");
    expect(formatPartValue(11.2)).toBe("11 ₽");
  });

  it("молчит там, где цены заказа нет", () => {
    expect(formatPayPerOrder(null)).toBeNull();
    expect(formatPayPerOrder(0)).toBeNull();
  });
});
