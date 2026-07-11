import { NextRequest, NextResponse } from "next/server";
import {
  canManageApplications,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { isLeadStatus } from "@/lib/lead-status";
import { getRedirectUrl } from "@/lib/redirect-url";

type UpdateStatusRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, { params }: UpdateStatusRouteProps) {
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

  const { id } = await params;
  const formData = await request.formData();
  const status = String(formData.get("status") ?? "");
  const managerComment = normalizeComment(
    String(formData.get("managerComment") ?? ""),
  );
  const searchQuery = String(formData.get("searchQuery") ?? "").trim();

  if (!isLeadStatus(status)) {
    return NextResponse.redirect(
      getRedirectUrl(request, getAdminRedirect("status=invalid", searchQuery)),
      303,
    );
  }

  if (managerComment && managerComment.length > 2000) {
    return NextResponse.redirect(
      getRedirectUrl(request, getAdminRedirect("note=too-long", searchQuery)),
      303,
    );
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
    return NextResponse.redirect(
      getRedirectUrl(request, getAdminRedirect("application=missing", searchQuery)),
      303,
    );
  }

  const statusChanged = application.status !== status;
  const commentChanged = application.managerComment !== managerComment;

  if (statusChanged || commentChanged) {
    await db.$transaction([
      db.application.update({
        where: {
          id,
        },
        data: {
          managerComment,
          status,
        },
      }),
      db.applicationAuditLog.create({
        data: {
          actorUsername: session.username,
          adminUserId: session.userId,
          applicationId: id,
          newManagerComment: commentChanged ? managerComment : null,
          newStatus: statusChanged ? status : null,
          previousManagerComment: commentChanged
            ? application.managerComment
            : null,
          previousStatus: statusChanged ? application.status : null,
        },
      }),
    ]);
  }

  return NextResponse.redirect(
    getRedirectUrl(request, getAdminRedirect("updated=1", searchQuery)),
    303,
  );
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
