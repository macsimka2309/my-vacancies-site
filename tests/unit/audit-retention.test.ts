import { describe, expect, it } from "vitest";
import {
  AUDIT_RETENTION_DAYS,
  getAuditCutoff,
} from "@/lib/audit-retention";

describe("getAuditCutoff", () => {
  it("отсекает ровно по сроку хранения", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");

    expect(getAuditCutoff(now).toISOString()).toBe("2026-07-26T12:00:00.000Z");
  });

  // Срок задан владельцем 25.08. Тест фиксирует именно его, чтобы правка
  // константы была осознанной, а не побочным эффектом рефакторинга.
  it("хранит месяц", () => {
    expect(AUDIT_RETENTION_DAYS).toBe(30);
  });

  it("запись вчерашнего дня под чистку не попадает", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    const yesterday = new Date("2026-08-24T12:00:00.000Z");

    expect(yesterday.getTime()).toBeGreaterThan(getAuditCutoff(now).getTime());
  });

  it("запись месячной давности попадает", () => {
    const now = new Date("2026-08-25T12:00:00.000Z");
    const old = new Date("2026-07-20T12:00:00.000Z");

    expect(old.getTime()).toBeLessThan(getAuditCutoff(now).getTime());
  });
});
