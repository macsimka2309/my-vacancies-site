import { NextRequest, NextResponse } from "next/server";
import {
  canManageVacancies,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";

type PublicationRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: PublicationRouteProps,
) {
  const session = await getAdminSessionFromRequest(request);

  if (!session) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?login=required"),
      303,
    );
  }

  if (!canManageVacancies(session)) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin?vacancies=forbidden"),
      303,
    );
  }

  const { id } = await params;
  const formData = await request.formData();
  const isActive = formData.get("isActive") === "true";
  const result = await db.vacancy.updateMany({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });

  return NextResponse.redirect(
    getRedirectUrl(
      request,
      result.count === 0
        ? "/admin/vacancies?result=missing"
        : `/admin/vacancies?result=${isActive ? "published" : "unpublished"}`,
    ),
    303,
  );
}
