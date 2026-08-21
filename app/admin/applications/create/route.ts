import { NextRequest, NextResponse } from "next/server";
import {
  canManageApplications,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { parseManualApplicationForm } from "@/lib/application-form";
import {
  checkDuplicateByPhone,
  getInitialStatus,
} from "@/lib/application-duplicate";
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
  // вакансию, — но заводим со статусом «Дубль» и говорим об этом менеджеру.
  // Правило то же, что для откликов с сайта: один модуль на оба пути.
  const duplicate = await checkDuplicateByPhone(parsed.data.normalizedPhone);

  const application = await db.application.create({
    data: {
      candidateComment: parsed.data.candidateComment,
      candidateName: parsed.data.candidateName,
      status: getInitialStatus(duplicate),
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
      newStatus: getInitialStatus(duplicate),
    },
  });

  return NextResponse.redirect(
    getRedirectUrl(
      request,
      duplicate.isDuplicate
        ? "/admin?created=duplicate"
        : "/admin?created=1",
    ),
    303,
  );
}
