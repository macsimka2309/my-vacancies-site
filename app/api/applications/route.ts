import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeRuPhone } from "@/lib/phone";
import { sendApplicationTelegramNotification } from "@/lib/telegram";

const applicationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(1).max(40),
  vacancyId: z.string().trim().min(1),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsedBody = applicationSchema.safeParse(body);

  if (!parsedBody.success) {
    const consentFailed = parsedBody.error.issues.some((issue) =>
      issue.path.includes("consent"),
    );

    return NextResponse.json(
      {
        error: consentFailed
          ? "Подтвердите согласие на обработку персональных данных."
          : "Проверьте имя и телефон.",
      },
      { status: 400 },
    );
  }

  const normalizedPhone = normalizeRuPhone(parsedBody.data.phone);

  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "Введите телефон в формате +7 (999) 999-99-99." },
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

  const application = await db.application.create({
    data: {
      vacancy: {
        connect: {
          id: vacancy.id,
        },
      },
      vacancyTitleSnapshot: vacancy.title,
      projectSnapshot: vacancy.project,
      candidateName: parsedBody.data.name,
      phone: parsedBody.data.phone,
      normalizedPhone,
      city: vacancy.city,
      personalDataConsentAt: new Date(),
      trafficSource: "site",
    },
    select: {
      id: true,
    },
  });

  try {
    await sendApplicationTelegramNotification({
      name: parsedBody.data.name,
      phone: normalizedPhone,
      project: vacancy.project,
      city: vacancy.city,
      vacancyTitle: vacancy.title,
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
