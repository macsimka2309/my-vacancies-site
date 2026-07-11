import { NextRequest, NextResponse } from "next/server";
import {
  AdminRole,
  canManageAdminUsers,
  getAdminSessionFromRequest,
  isAdminRole,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";

type UpdateUserRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: UpdateUserRouteProps,
) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=required"),
      303,
    );
  }

  if (!canManageAdminUsers(session)) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?users=forbidden"),
      303,
    );
  }

  const { id } = await params;
  const formData = await request.formData();
  const fullName = normalizeFullName(String(formData.get("fullName") ?? ""));
  const roles = getAdminRoles(formData);
  const isActive = formData.get("isActive") === "on";

  if (fullName === undefined || roles.length === 0) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?users=invalid"),
      303,
    );
  }

  if (
    id === session.userId &&
    (!isActive || !roles.includes("ADMIN"))
  ) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?users=self"),
      303,
    );
  }

  const result = await db.adminUser.updateMany({
    where: {
      id,
    },
    data: {
      fullName,
      isActive,
      roles,
    },
  });

  return NextResponse.redirect(
    getRedirectUrl(
      request,
      result.count === 0 ? "/admin?users=missing" : "/admin?users=updated",
    ),
    303,
  );
}

function getAdminRoles(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("roles")
        .map(String)
        .filter(isAdminRole),
    ),
  ] as AdminRole[];
}

function normalizeFullName(value: string) {
  const fullName = value.trim().replace(/\s+/g, " ");

  if (fullName.length > 200) {
    return undefined;
  }

  return fullName || null;
}
