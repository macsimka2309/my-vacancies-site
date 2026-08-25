import { NextRequest, NextResponse } from "next/server";
import {
  canManageApplications,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { ANONYMOUS_NAME } from "@/lib/application-details";
import { maybePurgeOldAuditLogs } from "@/lib/audit-retention";
import { getCitySlug } from "@/lib/cities";
import { db } from "@/lib/db";
import { isLeadStatus } from "@/lib/lead-status";
import { getRedirectUrl } from "@/lib/redirect-url";

const COMMENT_LIMIT = 2000;
const NAME_LIMIT = 120;

type UpdateRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Правка отклика: статус, примечание, имя и город.
 *
 * **Телефона здесь нет намеренно.** `normalizedPhone` — ключ проверки дублей
 * и результат нормализации номеров СНГ (п. 18). Тихая правка номера рвёт
 * связь с уже найденными дублями и может как склеить двух разных людей, так
 * и развести одного на две записи. Если это когда-нибудь понадобится — это
 * отдельная задача, с повторной нормализацией и повторной проверкой.
 *
 * Отвечает и JSON (так сохраняет таблица откликов), и редиректом — обычная
 * отправка формы остаётся рабочей.
 */
export async function POST(request: NextRequest, { params }: UpdateRouteProps) {
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const { id } = await params;
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return respond(request, wantsJson, 401, "login=required", "/admin?login=required");
  }

  if (!canManageApplications(session)) {
    return respond(
      request,
      wantsJson,
      403,
      "applications=forbidden",
      "/admin?applications=forbidden",
    );
  }

  const input = wantsJson ? await readJson(request) : await readForm(request);

  if (!isLeadStatus(input.status)) {
    return respond(request, wantsJson, 400, "status=invalid", "/admin?status=invalid");
  }

  if (input.managerComment && input.managerComment.length > COMMENT_LIMIT) {
    return respond(request, wantsJson, 400, "note=too-long", "/admin?note=too-long");
  }

  if (input.candidateName.length > NAME_LIMIT) {
    return respond(request, wantsJson, 400, "name=too-long", "/admin?name=too-long");
  }

  // Город берём только из справочника: свободный ввод даст «СПб», «Спб» и
  // «Санкт-Петербург» в одной колонке, и отчёт п. 16 разложит один город
  // на три. Пустое значение допустимо — город известен не всегда.
  if (input.city && getCitySlug(input.city) === null) {
    return respond(request, wantsJson, 400, "city=unknown", "/admin?city=unknown");
  }

  const application = await db.application.findUnique({
    where: { id },
    select: {
      candidateName: true,
      city: true,
      managerComment: true,
      status: true,
    },
  });

  if (!application) {
    return respond(
      request,
      wantsJson,
      404,
      "application=missing",
      "/admin?application=missing",
    );
  }

  // Пустое имя — не значение, а заглушка: сайт пишет туда «Без имени», когда
  // человек не дошёл до второго шага формы. Возвращаем ту же заглушку, иначе
  // в таблице появятся две разные «пустоты».
  const candidateName = input.candidateName || ANONYMOUS_NAME;
  const city = input.city || null;

  const changed = {
    city: application.city !== city,
    comment: application.managerComment !== input.managerComment,
    name: application.candidateName !== candidateName,
    status: application.status !== input.status,
  };
  const anyChange = Object.values(changed).some(Boolean);

  if (anyChange) {
    await db.$transaction([
      db.application.update({
        where: { id },
        data: {
          candidateName,
          city,
          managerComment: input.managerComment,
          status: input.status,
        },
      }),
      db.applicationAuditLog.create({
        data: {
          actorUsername: session.username,
          adminUserId: session.userId,
          applicationId: id,
          newCandidateName: changed.name ? candidateName : null,
          newCity: changed.city ? city : null,
          newManagerComment: changed.comment ? input.managerComment : null,
          newStatus: changed.status ? input.status : null,
          previousCandidateName: changed.name ? application.candidateName : null,
          previousCity: changed.city ? application.city : null,
          previousManagerComment: changed.comment
            ? application.managerComment
            : null,
          previousStatus: changed.status ? application.status : null,
        },
      }),
    ]);
    await maybePurgeOldAuditLogs();
  }

  if (wantsJson) {
    return NextResponse.json({ ok: true, changed: anyChange, candidateName });
  }

  return NextResponse.redirect(getRedirectUrl(request, "/admin?updated=1"), 303);
}

async function readJson(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    return {
      candidateName: String(body.candidateName ?? "").trim(),
      city: String(body.city ?? "").trim(),
      managerComment: normalizeComment(String(body.managerComment ?? "")),
      status: String(body.status ?? ""),
    };
  } catch {
    return { candidateName: "", city: "", managerComment: null, status: "" };
  }
}

async function readForm(request: NextRequest) {
  const formData = await request.formData();

  return {
    candidateName: String(formData.get("candidateName") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    managerComment: normalizeComment(String(formData.get("managerComment") ?? "")),
    status: String(formData.get("status") ?? ""),
  };
}

function respond(
  request: NextRequest,
  wantsJson: boolean | undefined,
  code: number,
  error: string,
  location: string,
) {
  if (wantsJson) {
    return NextResponse.json({ ok: false, error }, { status: code });
  }

  return NextResponse.redirect(getRedirectUrl(request, location), 303);
}

function normalizeComment(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue || null;
}
