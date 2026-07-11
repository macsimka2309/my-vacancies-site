import { NextRequest, NextResponse } from "next/server";
import {
  AdminRole,
  canManageAdminUsers,
  getAdminSessionFromRequest,
  hashPassword,
  isAdminRole,
  normalizeUsername,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 4;

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=required"),
      303,
    );
  }

  if (!canManageAdminUsers(session)) {
    return NextResponse.redirect(getRedirectUrl(request, "/admin?users=forbidden"), 303);
  }

  const formData = await request.formData();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const fullName = normalizeFullName(String(formData.get("fullName") ?? ""));
  const password = String(formData.get("password") ?? "");
  const roles = getAdminRoles(formData);

  if (
    !USERNAME_PATTERN.test(username) ||
    password.length < MIN_PASSWORD_LENGTH ||
    fullName === undefined ||
    roles.length === 0
  ) {
    return NextResponse.redirect(getRedirectUrl(request, "/admin?users=invalid"), 303);
  }

  const existingUser = await db.adminUser.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.redirect(getRedirectUrl(request, "/admin?users=exists"), 303);
  }

  await db.adminUser.create({
    data: {
      fullName,
      passwordHash: await hashPassword(password),
      roles,
      username,
    },
  });

  return NextResponse.redirect(getRedirectUrl(request, "/admin?users=created"), 303);
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
