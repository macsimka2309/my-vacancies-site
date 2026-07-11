import { NextRequest } from "next/server";

export function getRedirectUrl(request: NextRequest, path: string) {
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;

  return new URL(path, `${proto}://${host}`);
}
