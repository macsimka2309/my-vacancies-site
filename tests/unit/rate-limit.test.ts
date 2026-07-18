import { describe, expect, it } from "vitest";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

function uniqueKey(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

describe("rateLimit", () => {
  it("пропускает до лимита, затем блокирует в пределах окна", () => {
    const key = uniqueKey("limit");

    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }

    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("считает лимиты по каждому ключу независимо", () => {
    const a = uniqueKey("a");
    const b = uniqueKey("b");

    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    // Другой ключ не затронут.
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });

  it("сбрасывает счётчик после истечения окна", async () => {
    const key = uniqueKey("window");

    expect(rateLimit(key, 1, 1).ok).toBe(true);
    expect(rateLimit(key, 1, 1).ok).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(rateLimit(key, 1, 1).ok).toBe(true);
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
