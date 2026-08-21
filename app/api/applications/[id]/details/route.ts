import { NextResponse } from "next/server";
import { buildDetailsUpdate } from "@/lib/application-details";
import { db } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Второй шаг отклика: имя и удобный канал связи с экрана «Спасибо».
// Ограничения и их причины — в lib/application-details.ts.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;

type DetailsRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: DetailsRouteProps) {
  const ip = getClientIp(request);

  if (!(await rateLimit(`details:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)).ok) {
    return NextResponse.json({ ok: true });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: true });
  }

  const application = await db.application.findUnique({
    where: {
      id,
    },
    select: {
      candidateName: true,
      createdAt: true,
      preferredContact: true,
      telegramUsername: true,
    },
  });

  // Ответ всегда одинаковый: по нему нельзя перебором узнать, существует ли
  // отклик с таким id. Для кандидата это ничего не меняет — заявка принята.
  if (!application) {
    return NextResponse.json({ ok: true });
  }

  const result = buildDetailsUpdate(body, application);

  if ("error" in result) {
    return NextResponse.json({ ok: true });
  }

  await db.application.update({
    where: {
      id,
    },
    data: result.update,
  });

  return NextResponse.json({ ok: true });
}
