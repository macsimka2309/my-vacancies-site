import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "salihov-vacancy",
    timestamp: new Date().toISOString(),
  });
}
