import { describe, expect, it } from "vitest";
import { isColdLanding } from "@/lib/cold-landing";

describe("isColdLanding", () => {
  it("холодный заход — пустые параметры", () => {
    expect(isColdLanding({})).toBe(true);
  });

  // Объявление Директа ведёт на `/?city={region}` — у человека уже есть
  // намерение, приветственный экран не должен вставать перед вакансией,
  // которую чинил п. 6.
  it("город в ссылке — не холодный", () => {
    expect(isColdLanding({ city: "Тверь" })).toBe(false);
  });

  it("любая из пяти UTM-меток — не холодный", () => {
    expect(isColdLanding({ utm_source: "yandex" })).toBe(false);
    expect(isColdLanding({ utm_medium: "cpc" })).toBe(false);
    expect(isColdLanding({ utm_campaign: "leto" })).toBe(false);
    expect(isColdLanding({ utm_content: "banner" })).toBe(false);
    expect(isColdLanding({ utm_term: "kurer" })).toBe(false);
  });

  // Шаренный фильтр («вот вакансии сборщика в Ленте») — тоже намерение,
  // не только реклама.
  it("фильтр по вакансии или проекту — не холодный", () => {
    expect(isColdLanding({ title: "Курьер на авто" })).toBe(false);
    expect(isColdLanding({ project: "Лента" })).toBe(false);
    expect(isColdLanding({ salaryBasis: "shift" })).toBe(false);
    expect(isColdLanding({ salaryFrom: "5000" })).toBe(false);
  });

  it("параметр без значения (пустой массив) всё равно засчитывается как намерение", () => {
    expect(isColdLanding({ city: [] })).toBe(false);
  });

  it("посторонний параметр не делает заход тёплым", () => {
    expect(isColdLanding({ ref: "somewhere" })).toBe(true);
  });
});
