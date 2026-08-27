import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAD_STATUS,
  getLeadStatusLabel,
  isLeadStatus,
  LEAD_STATUS_OPTIONS,
} from "@/lib/lead-status";

describe("isLeadStatus", () => {
  it("узнаёт статусы набора", () => {
    expect(isLeadStatus("IN_PROGRESS")).toBe(true);
    expect(isLeadStatus("INTERNSHIP_STARTED")).toBe(true);
    expect(isLeadStatus("DUPLICATE")).toBe(true);
  });

  // Набор заменён 26.08. Тест держит границу: если старое значение где-то
  // осталось, оно не должно молча проходить проверку.
  it("не принимает статусы прежнего набора", () => {
    for (const old of [
      "NEW",
      "NO_ANSWER",
      "INTERVIEW_DONE",
      "FIT",
      "NOT_FIT",
      "SENT_TO_CLIENT",
      "ACCEPTED",
      "CANDIDATE_REFUSED",
    ]) {
      expect(isLeadStatus(old)).toBe(false);
    }
  });

  it("не принимает мусор", () => {
    expect(isLeadStatus("")).toBe(false);
    expect(isLeadStatus("ВЫДУМКА")).toBe(false);
  });
});

describe("getLeadStatusLabel", () => {
  it("переводит все восемь статусов", () => {
    expect(LEAD_STATUS_OPTIONS).toHaveLength(8);
    expect(getLeadStatusLabel("IN_PROGRESS")).toBe("В работе");
    expect(getLeadStatusLabel("INTERVIEW_MOVED")).toBe(
      "Дату собеседования перенесли",
    );
    expect(getLeadStatusLabel("RESERVE")).toBe("Резерв");
    expect(getLeadStatusLabel("REJECTED")).toBe("Отказ");
    expect(getLeadStatusLabel("TO_INTERNSHIP")).toBe("На стажировку");
    expect(getLeadStatusLabel("INTERNSHIP_STARTED")).toBe(
      "Вышел на стажировку",
    );
    expect(getLeadStatusLabel("DEAL_CLOSED")).toBe("Сделка завершена");
    expect(getLeadStatusLabel("DUPLICATE")).toBe("Дубль");
  });

  // Незнакомое значение отдаём как есть: в таблице лучше увидеть код
  // статуса, чем пустую ячейку.
  it("незнакомое значение возвращает как есть", () => {
    expect(getLeadStatusLabel("NEW")).toBe("NEW");
  });
});

describe("DEFAULT_LEAD_STATUS", () => {
  // Отдельного «Нового» в наборе нет — отклик с сайта сразу в работе.
  it("отклик с сайта попадает в работу", () => {
    expect(DEFAULT_LEAD_STATUS).toBe("IN_PROGRESS");
    expect(isLeadStatus(DEFAULT_LEAD_STATUS)).toBe(true);
  });
});
