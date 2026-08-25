import { NextRequest, NextResponse } from "next/server";
import {
  canManageApplications,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { maybePurgeOldAuditLogs } from "@/lib/audit-retention";
import { db } from "@/lib/db";
import { isLeadStatus } from "@/lib/lead-status";
import { getRedirectUrl } from "@/lib/redirect-url";

const COMMENT_LIMIT = 2000;

type UpdateStatusRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Правка статуса и примечания.
 *
 * Отвечает двумя способами. Таблица откликов сохраняет поля сама, по выходу
 * из поля, и ждёт JSON. Обычная отправка формы — как было, с редиректом:
 * этот путь остаётся рабочим и не зависит от скриптов.
 */
export async function POST(
  request: NextRequest,
  { params }: UpdateStatusRouteProps,
) {
  const wantsJson = request.headers
    .get("accept")
    ?.includes("application/json");
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

  const input = wantsJson
    ? await readJson(request)
    : await readForm(request);

  if (!isLeadStatus(input.status)) {
    return respond(request, wantsJson, 400, "status=invalid", getAdminRedirect("status=invalid", input.searchQuery));
  }

  if (input.managerComment && input.managerComment.length > COMMENT_LIMIT) {
    return respond(request, wantsJson, 400, "note=too-long", getAdminRedirect("note=too-long", input.searchQuery));
  }

  const application = await db.application.findUnique({
    where: {
      id,
    },
    select: {
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
      getAdminRedirect("application=missing", input.searchQuery),
    );
  }

  const statusChanged = application.status !== input.status;
  const commentChanged = application.managerComment !== input.managerComment;

  if (statusChanged || commentChanged) {
    await db.$transaction([
      db.application.update({
        where: {
          id,
        },
        data: {
          managerComment: input.managerComment,
          status: input.status,
        },
      }),
      db.applicationAuditLog.create({
        data: {
          actorUsername: session.username,
          adminUserId: session.userId,
          applicationId: id,
          newManagerComment: commentChanged ? input.managerComment : null,
          newStatus: statusChanged ? input.status : null,
          previousManagerComment: commentChanged
            ? application.managerComment
            : null,
          previousStatus: statusChanged ? application.status : null,
        },
      }),
    ]);
    await maybePurgeOldAuditLogs();
  }

  if (wantsJson) {
    return NextResponse.json({ ok: true, changed: statusChanged || commentChanged });
  }

  return NextResponse.redirect(
    getRedirectUrl(request, getAdminRedirect("updated=1", input.searchQuery)),
    303,
  );
}

async function readJson(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    return {
      status: String(body.status ?? ""),
      managerComment: normalizeComment(String(body.managerComment ?? "")),
      searchQuery: "",
    };
  } catch {
    return { status: "", managerComment: null, searchQuery: "" };
  }
}

async function readForm(request: NextRequest) {
  const formData = await request.formData();

  return {
    status: String(formData.get("status") ?? ""),
    managerComment: normalizeComment(String(formData.get("managerComment") ?? "")),
    searchQuery: String(formData.get("searchQuery") ?? "").trim(),
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

function getAdminRedirect(result: string, searchQuery: string) {
  const params = new URLSearchParams(result);

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  return `/admin?${params.toString()}`;
}
