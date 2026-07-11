import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";
import { getRedirectUrl } from "@/lib/redirect-url";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(getRedirectUrl(request, "/admin"), 303);
  clearAdminSessionCookie(response);

  return response;
}
