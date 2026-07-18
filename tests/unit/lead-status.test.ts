import { describe, expect, it } from "vitest";
import { getLeadStatusLabel, isLeadStatus } from "@/lib/lead-status";

describe("lead-status", () => {
  it("распознаёт валидные статусы", () => {
    expect(isLeadStatus("NEW")).toBe(true);
    expect(isLeadStatus("ACCEPTED")).toBe(true);
    expect(isLeadStatus("DUPLICATE")).toBe(true);
  });

  it("отклоняет неизвестные значения", () => {
    expect(isLeadStatus("UNKNOWN")).toBe(false);
    expect(isLeadStatus("")).toBe(false);
    expect(isLeadStatus("new")).toBe(false);
  });

  it("возвращает подпись для известного статуса и само значение для неизвестного", () => {
    expect(getLeadStatusLabel("NEW")).toBe("Новый");
    expect(getLeadStatusLabel("IN_PROGRESS")).toBe("В работе");
    expect(getLeadStatusLabel("WHATEVER")).toBe("WHATEVER");
  });
});
