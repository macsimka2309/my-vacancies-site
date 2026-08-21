import { db } from "./db";

/**
 * Ограничитель частоты запросов по IP (fixed window).
 *
 * Окна лежат в базе, а не в памяти процесса. В памяти они обнулялись при
 * каждом перезапуске контейнера — то есть при каждом деплое, — а при
 * нескольких репликах приложения защита формы исчезала вовсе: у каждой
 * реплики был свой счёт, и фактический лимит умножался на их число.
 */
export type RateLimitResult = {
  ok: boolean;
  retryAfter: number; // секунды до сброса окна
};

const ALLOWED: RateLimitResult = { ok: true, retryAfter: 0 };

/** Раз в сотню обращений подчищаем протухшие окна, чтобы таблица не росла. */
const CLEANUP_CHANCE = 0.01;

type WindowRow = {
  count: number;
  reset_at: Date;
};

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const resetAt = new Date(Date.now() + windowMs);

  try {
    // Одним запросом: заводим окно, продлеваем протухшее или увеличиваем
    // счётчик. Атомарность нужна, чтобы два одновременных запроса не
    // прочитали одно и то же значение и не записали его дважды.
    const rows = await db.$queryRaw<WindowRow[]>`
      INSERT INTO "rate_limits" ("key", "count", "reset_at")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "rate_limits"."reset_at" <= now() THEN 1
          ELSE "rate_limits"."count" + 1
        END,
        "reset_at" = CASE
          WHEN "rate_limits"."reset_at" <= now() THEN ${resetAt}
          ELSE "rate_limits"."reset_at"
        END
      RETURNING "count", "reset_at"
    `;

    if (Math.random() < CLEANUP_CHANCE) {
      await cleanupExpired();
    }

    const row = rows[0];

    if (!row || row.count <= limit) {
      return ALLOWED;
    }

    const retryAfter = Math.ceil((row.reset_at.getTime() - Date.now()) / 1000);

    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  } catch (error) {
    // Пропускаем. Ограничитель — не главная защита, и падение базы не должно
    // превращаться в отказ обслуживания для живых людей: запрос, ради
    // которого он вызван, всё равно упрётся в ту же недоступную базу.
    console.error(
      "Rate limit недоступен, пропускаем запрос:",
      error instanceof Error ? error.message : error,
    );

    return ALLOWED;
  }
}

async function cleanupExpired() {
  try {
    await db.$executeRaw`
      DELETE FROM "rate_limits" WHERE "reset_at" < now() - interval '1 hour'
    `;
  } catch {
    // Уборка не обязана удаваться: строки протухшие, места занимают мало.
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
