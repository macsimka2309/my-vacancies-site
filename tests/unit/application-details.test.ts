import { describe, expect, it } from "vitest";
import {
  ANONYMOUS_NAME,
  buildDetailsUpdate,
  DETAILS_WINDOW_MS,
} from "@/lib/application-details";

const now = new Date("2026-08-21T12:00:00.000Z");

function buildApplication(overrides: Partial<{
  candidateName: string;
  createdAt: Date;
  preferredContact: string | null;
  telegramUsername: string | null;
}> = {}) {
  return {
    candidateName: ANONYMOUS_NAME,
    createdAt: new Date("2026-08-21T11:55:00.000Z"),
    preferredContact: null,
    telegramUsername: null,
    ...overrides,
  };
}

describe("buildDetailsUpdate", () => {
  it("дописывает имя и канал связи", () => {
    const result = buildDetailsUpdate(
      { name: "Иван", preferredContact: "telegram", telegramUsername: "@ivan" },
      buildApplication(),
      now,
    );

    expect(result).toEqual({
      update: {
        candidateName: "Иван",
        preferredContact: "telegram",
        telegramUsername: "ivan",
      },
    });
  });

  // Ручка открытая: знание чужого id не должно давать права переписать заявку.
  it("не затирает уже заполненные поля", () => {
    const result = buildDetailsUpdate(
      { name: "Пётр", preferredContact: "max", telegramUsername: "@petr" },
      buildApplication({
        candidateName: "Иван Юрьевич",
        preferredContact: "phone",
        telegramUsername: "ivan",
      }),
      now,
    );

    expect(result).toEqual({ error: "nothing" });
  });

  it("отказывает, когда окно после отправки истекло", () => {
    const result = buildDetailsUpdate(
      { name: "Иван" },
      buildApplication({
        createdAt: new Date(now.getTime() - DETAILS_WINDOW_MS - 1000),
      }),
      now,
    );

    expect(result).toEqual({ error: "expired" });
  });

  it("принимает только известные каналы связи", () => {
    expect(
      buildDetailsUpdate({ preferredContact: "whatsapp" }, buildApplication(), now),
    ).toEqual({ error: "nothing" });
  });

  it("игнорирует мусор вместо строк", () => {
    expect(
      buildDetailsUpdate(
        { name: 42, preferredContact: null, telegramUsername: ["x"] },
        buildApplication(),
        now,
      ),
    ).toEqual({ error: "nothing" });
  });

  it("не принимает слишком длинное имя", () => {
    expect(
      buildDetailsUpdate({ name: "и".repeat(81) }, buildApplication(), now),
    ).toEqual({ error: "nothing" });
  });

  it("убирает собачку из ника", () => {
    expect(
      buildDetailsUpdate({ telegramUsername: "@@ivan" }, buildApplication(), now),
    ).toEqual({ update: { telegramUsername: "ivan" } });
  });
});
