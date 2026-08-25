import { NextResponse } from "next/server";
import { z } from "zod";
import { ANONYMOUS_NAME } from "@/lib/application-details";
import {
  checkDuplicateByPhone,
  getInitialStatus,
} from "@/lib/application-duplicate";
import { db } from "@/lib/db";
import { getLeadStatusLabel } from "@/lib/lead-status";
import { normalizeRuPhone } from "@/lib/phone";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { sendApplicationTelegramNotification } from "@/lib/telegram";

// Не больше 5 откликов с одного IP за 10 минут.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const applicationSchema = z.object({
  // Имя обязательно с 26.08 по решению владельца. До этого хватало телефона,
  // и каждый второй отклик приходил как «Без имени»: менеджер начинал
  // разговор вслепую, а по базе такие записи не сгруппировать.
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(1).max(40),
  // Необязательно и без значения по умолчанию: первый шаг формы спрашивает
  // только телефон, а канал связи человек выбирает уже на экране «Спасибо».
  // С default("phone") поле выглядело заполненным, и второй шаг его не менял.
  preferredContact: z.enum(["phone", "telegram", "max"]).optional(),
  telegramUsername: z.string().trim().max(80).optional(),
  vacancyId: z.string().trim().min(1),
  consent: z.literal(true),
  // Honeypot: настоящие люди это поле не видят и не заполняют.
  company: z.string().max(200).optional(),
  // Маркетинговая атрибуция (необязательная).
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
  referrer: z.string().max(500).optional(),
  // ClientID Метрики — ключ для выгрузки офлайн-конверсий обратно в Директ.
  ymClientId: z.string().max(64).optional(),
});

function resolveTrafficSource(data: {
  utmSource?: string;
  referrer?: string;
}): string {
  if (data.utmSource) {
    return data.utmSource;
  }

  if (data.referrer) {
    try {
      return new URL(data.referrer).host || "direct";
    } catch {
      return "direct";
    }
  }

  return "direct";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = await rateLimit(`apply:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = await readJsonBody(request);
  const parsedBody = applicationSchema.safeParse(body);

  // Honeypot: раньше такой отклик молча выбрасывался. Автозаполнение браузера
  // подставляло значение живым людям, и отклик терялся навсегда. Теперь
  // сохраняем и помечаем — пусть рекрутёр решит сам, спам это или нет.
  const looksLikeBot = Boolean(parsedBody.success && parsedBody.data.company);

  if (looksLikeBot) {
    console.warn("Honeypot triggered — сохраняем отклик с пометкой.");
  }

  if (!parsedBody.success) {
    const consentFailed = parsedBody.error.issues.some((issue) =>
      issue.path.includes("consent"),
    );

    return NextResponse.json(
      {
        error: consentFailed
          ? "Подтвердите согласие на обработку персональных данных."
          : "Проверьте номер телефона.",
      },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizeRuPhone(parsedBody.data.phone);

  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "Проверьте номер телефона — кажется, он введён не полностью." },
      { status: 400 },
    );
  }

  const preferredContact = parsedBody.data.preferredContact ?? null;
  // Заглушка осталась на два случая: отклики, заведённые менеджером вручную
  // (там имени может не быть), и старые записи до 26.08.
  const candidateName = parsedBody.data.name || ANONYMOUS_NAME;
  // Ник Telegram: убираем ведущий @ и лишние пробелы; нужен только для Telegram.
  const telegramUsername =
    preferredContact === "telegram"
      ? parsedBody.data.telegramUsername?.trim().replace(/^@+/, "")
      : undefined;

  if (preferredContact === "telegram" && !telegramUsername) {
    return NextResponse.json(
      { error: "Укажите ник в Telegram." },
      { status: 400 },
    );
  }

  const vacancy = await db.vacancy.findFirst({
    where: {
      id: parsedBody.data.vacancyId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      project: true,
      city: true,
    },
  });

  if (!vacancy) {
    return NextResponse.json(
      { error: "Вакансия не найдена или уже закрыта." },
      { status: 404 },
    );
  }

  // Повторный отклик заводим сразу как дубль: иначе менеджер узнавал об этом
  // только когда звонил, то есть после потраченного звонка.
  const duplicate = await checkDuplicateByPhone(normalizedPhone);

  const application = await db.application.create({
    data: {
      vacancy: {
        connect: {
          id: vacancy.id,
        },
      },
      vacancyTitleSnapshot: vacancy.title,
      projectSnapshot: vacancy.project,
      status: getInitialStatus(duplicate),
      candidateName,
      candidateComment: looksLikeBot
        ? "⚠️ Сработала антиспам-ловушка. Возможно, автозаполнение браузера — проверьте вручную."
        : undefined,
      phone: parsedBody.data.phone,
      normalizedPhone,
      city: vacancy.city,
      preferredContact,
      telegramUsername,
      personalDataConsentAt: new Date(),
      trafficSource: resolveTrafficSource(parsedBody.data),
      utmSource: parsedBody.data.utmSource,
      utmMedium: parsedBody.data.utmMedium,
      utmCampaign: parsedBody.data.utmCampaign,
      utmContent: parsedBody.data.utmContent,
      utmTerm: parsedBody.data.utmTerm,
      ymClientId: parsedBody.data.ymClientId,
    },
    select: {
      id: true,
    },
  });

  try {
    await sendApplicationTelegramNotification({
      name: candidateName,
      phone: normalizedPhone,
      project: vacancy.project,
      city: vacancy.city,
      vacancyTitle: vacancy.title,
      preferredContact: preferredContact ?? undefined,
      telegramUsername,
      suspectedSpam: looksLikeBot,
      previousApplication: duplicate.previous
        ? {
            createdAt: duplicate.previous.createdAt,
            statusLabel: getLeadStatusLabel(duplicate.previous.status),
            vacancyTitle: duplicate.previous.vacancyTitle,
          }
        : undefined,
    });

    await db.application.update({
      where: {
        id: application.id,
      },
      data: {
        telegramSentAt: new Date(),
        telegramError: null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Telegram notification failed.";

    console.error(message);

    await db.application.update({
      where: {
        id: application.id,
      },
      data: {
        telegramError: message,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    applicationId: application.id,
  });
}

async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
