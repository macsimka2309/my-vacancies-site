import { NextRequest, NextResponse } from "next/server";
import {
  canManageApplications,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { parseManualApplicationForm } from "@/lib/application-form";
import { toTrafficSource } from "@/lib/application-source";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=required"),
      303,
    );
  }

  if (!canManageApplications(session)) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?applications=forbidden"),
      303,
    );
  }

  const parsed = parseManualApplicationForm(await request.formData());

  if ("error" in parsed) {
    return NextResponse.redirect(
      getRedirectUrl(request, `/admin/applications/new?result=${parsed.error}`),
      303,
    );
  }

  const vacancy = await db.vacancy.findFirst({
    where: {
      id: parsed.data.vacancyId,
      isActive: true,
    },
    select: {
      city: true,
      id: true,
      project: true,
      title: true,
    },
  });

  if (!vacancy) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin/applications/new?result=vacancy"),
      303,
    );
  }

  // Дубль не блокируем — человек может откликнуться повторно на другую
  // вакансию, — но показываем менеджеру, что такой номер уже есть.
  const duplicate = await db.application.findFirst({
    where: {
      normalizedPhone: parsed.data.normalizedPhone,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
    },
  });

  const application = await db.application.create({
    data: {
      candidateComment: parsed.data.candidateComment,
      candidateName: parsed.data.candidateName,
      city: vacancy.city,
      normalizedPhone: parsed.data.normalizedPhone,
      // Согласие подтвердил менеджер — момент подтверждения и фиксируем.
      personalDataConsentAt: new Date(),
      phone: parsed.data.phone,
      preferredContact: parsed.data.preferredContact,
      projectSnapshot: vacancy.project,
      telegramUsername: parsed.data.telegramUsername,
      trafficSource: toTrafficSource(parsed.data.source),
      vacancy: {
        connect: {
          id: vacancy.id,
        },
      },
      vacancyTitleSnapshot: vacancy.title,
    },
    select: {
      id: true,
    },
  });

  // Уведомление в бот не отправляем: менеджер сам завёл эту запись и уже
  // в разговоре с кандидатом — сообщение самому себе только зашумит канал.
  await db.applicationAuditLog.create({
    data: {
      actorUsername: session.username,
      adminUserId: session.userId,
      applicationId: application.id,
      newManagerComment: `Отклик заведён вручную. Источник: ${parsed.data.source}.`,
      newStatus: "NEW",
    },
  });

  return NextResponse.redirect(
    getRedirectUrl(
      request,
      duplicate
        ? "/admin?created=duplicate"
        : "/admin?created=1",
    ),
    303,
  );
}
