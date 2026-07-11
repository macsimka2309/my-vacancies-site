import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSessionFromRequest,
  hashPassword,
  verifyPassword,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";

const MIN_PASSWORD_LENGTH = 4;

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=required"),
      303,
    );
  }

  const formData = await request.formData();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.redirect(getRedirectUrl(request, "/admin?password=short"), 303);
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?password=mismatch"),
      303,
    );
  }

  const user = await db.adminUser.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      passwordHash: true,
    },
  });

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?password=invalid"),
      303,
    );
  }

  await db.adminUser.update({
    where: {
      id: session.userId,
    },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  });

  return NextResponse.redirect(getRedirectUrl(request, "/admin?password=changed"), 303);
}
