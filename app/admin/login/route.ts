import { NextRequest, NextResponse } from "next/server";
import {
  setAdminLastLoginAt,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { getRedirectUrl } from "@/lib/redirect-url";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const session = await verifyAdminCredentials(username, password);

  if (!session) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=error"),
      303,
    );
  }

  await setAdminLastLoginAt(session.userId);

  const response = NextResponse.redirect(getRedirectUrl(request, "/admin"), 303);
  setAdminSessionCookie(response, session);

  return response;
}
