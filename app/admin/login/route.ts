import { NextRequest, NextResponse } from "next/server";
import {
  setAdminLastLoginAt,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getRedirectUrl } from "@/lib/redirect-url";

// Не больше 10 попыток входа с одного IP за 10 минут (защита от перебора).
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (!rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS).ok) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=throttled"),
      303,
    );
  }

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
