import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

function uniqueKey(prefix: string) {
  return `test-${prefix}-${Math.random().toString(36).slice(2)}`;
}

// Окна лежат в базе (п. 24), поэтому проверяем на настоящей: пересказ
// той же логики на JS разошёлся бы с SQL при первой же правке.
describe("rateLimit", () => {
  afterAll(async () => {
    await db.$executeRaw`DELETE FROM "rate_limits" WHERE "key" LIKE 'test-%'`;
  });

  it("пропускает до лимита, затем блокирует в пределах окна", async () => {
    const key = uniqueKey("limit");

    for (let i = 0; i < 3; i += 1) {
      expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    }

    const blocked = await rateLimit(key, 3, 60_000);

    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("считает лимиты по каждому ключу независимо", async () => {
    const a = uniqueKey("a");
    const b = uniqueKey("b");

    expect((await rateLimit(a, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    // Другой ключ не затронут.
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });

  it("сбрасывает счётчик после истечения окна", async () => {
    const key = uniqueKey("window");
    // Окно берём заметно длиннее, чем round-trip до базы: с окном в
    // единицы миллисекунд оно истекает прямо между двумя вызовами.
    const windowMs = 400;

    expect((await rateLimit(key, 1, windowMs)).ok).toBe(true);
    expect((await rateLimit(key, 1, windowMs)).ok).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 100));

    expect((await rateLimit(key, 1, windowMs)).ok).toBe(true);
  });

  // Ради этого всё и переезжало из памяти: раньше счётчик обнулялся при
  // каждом перезапуске процесса, а реплики считали каждая своё.
  it("окно переживает перезапуск процесса — оно в базе", async () => {
    const key = uniqueKey("shared");

    await rateLimit(key, 1, 60_000);

    const stored = await db.rateLimit.findUnique({ where: { key } });

    expect(stored?.count).toBe(1);
    expect(stored!.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("одновременные запросы не теряют счёт", async () => {
    const key = uniqueKey("race");

    const results = await Promise.all(
      Array.from({ length: 10 }, () => rateLimit(key, 4, 60_000)),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(4);
  });
});

describe("getClientIp", () => {
  it("берёт первый IP из x-forwarded-for", () => {
    const request = new Request("http://example.test", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("падает на x-real-ip, если нет x-forwarded-for", () => {
    const request = new Request("http://example.test", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(request)).toBe("9.9.9.9");
  });

  it("возвращает 'unknown' без заголовков", () => {
    expect(getClientIp(new Request("http://example.test"))).toBe("unknown");
  });
});
