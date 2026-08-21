import { describe, expect, it } from "vitest";
import { formatApplicationTelegramMessage } from "@/lib/telegram";

const base = {
  name: "Иван",
  phone: "+79991234567",
  project: "Лента",
  city: "Тверь",
  vacancyTitle: "Курьер на авто",
};

const previous = {
  createdAt: new Date("2026-08-19T07:30:00.000Z"),
  statusLabel: "Не дозвонились",
  vacancyTitle: "Курьер на велосипеде",
};

describe("formatApplicationTelegramMessage", () => {
  it("обычный отклик помечает зелёным", () => {
    const message = formatApplicationTelegramMessage(base);

    expect(message).toContain("🟢 <b>Новый отклик</b>");
    expect(message).not.toContain("Прошлый отклик");
  });

  // Менеджер узнавал о повторе, только когда звонил, — то есть после
  // потраченного звонка.
  it("повторный отклик помечает и показывает прошлый", () => {
    const message = formatApplicationTelegramMessage({
      ...base,
      previousApplication: previous,
    });

    expect(message).toContain("🔁 <b>Повторный отклик</b>");
    expect(message).toContain("заведён как дубль");
    expect(message).toContain("Курьер на велосипеде");
    expect(message).toContain("Не дозвонились");
    // Время московское: 07:30 UTC → 10:30.
    expect(message).toContain("19.08, 10:30");
  });

  // Ловушка тревожнее дубля: её и показываем.
  it("антиспам-ловушка важнее пометки о дубле", () => {
    const message = formatApplicationTelegramMessage({
      ...base,
      suspectedSpam: true,
      previousApplication: previous,
    });

    expect(message).toContain("🟡 <b>Новый отклик</b>");
    expect(message).not.toContain("🔁");
    // Прошлый отклик всё равно показываем — он полезен и здесь.
    expect(message).toContain("Прошлый отклик");
  });

  it("экранирует разметку в данных кандидата", () => {
    const message = formatApplicationTelegramMessage({
      ...base,
      name: "<b>Иван</b>",
    });

    expect(message).toContain("&lt;b&gt;Иван&lt;/b&gt;");
  });
});
