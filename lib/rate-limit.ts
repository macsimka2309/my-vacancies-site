// Простой in-memory rate limiter (fixed window). Достаточно для одного
// инстанса приложения: защищает форму отклика от спама/ботов по IP.

type Window = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Window>();

export type RateLimitResult = {
  ok: boolean;
  retryAfter: number; // секунды до сброса окна
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Опортунистическая чистка протухших окон, чтобы карта не росла бесконечно.
  if (store.size > 5000) {
    for (const [k, w] of store) {
      if (now > w.resetAt) {
        store.delete(k);
      }
    }
  }

  const current = store.get(key);

  if (!current || now > current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
