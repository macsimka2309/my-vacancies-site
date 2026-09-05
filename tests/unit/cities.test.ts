import { describe, expect, it } from "vitest";
import { matchKnownCity } from "@/lib/cities";

describe("matchKnownCity", () => {
  const known = ["Тверь", "Орёл", "Санкт-Петербург"];

  it("точное совпадение", () => {
    expect(matchKnownCity("Тверь", known)).toBe("Тверь");
  });

  it("не зависит от регистра", () => {
    expect(matchKnownCity("тверь", known)).toBe("Тверь");
  });

  // «Орёл» и «Орел» — один город: в ссылке может прийти любое написание.
  it("ё и е — одно и то же", () => {
    expect(matchKnownCity("Орел", known)).toBe("Орёл");
  });

  it("незнакомый город — null, а не догадка", () => {
    expect(matchKnownCity("Мурманск", known)).toBe(null);
  });

  it("пустое значение — null", () => {
    expect(matchKnownCity(undefined, known)).toBe(null);
    expect(matchKnownCity("", known)).toBe(null);
  });

  it("возвращает написание из каталога, а не из ссылки", () => {
    expect(matchKnownCity("  САНКТ-ПЕТЕРБУРГ  ", known)).toBe(
      "Санкт-Петербург",
    );
  });
});
