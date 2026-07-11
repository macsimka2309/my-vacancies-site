import { NextRequest, NextResponse } from "next/server";
import {
  canManageVacancies,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";
import { parseVacancyForm } from "@/lib/vacancy-form";

type UpdateVacancyRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: UpdateVacancyRouteProps,
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
  const parsed = parseVacancyForm(await request.formData());

  if ("error" in parsed) {
    return NextResponse.redirect(
      getRedirectUrl(request, `/admin/vacancies/${id}?result=invalid`),
      303,
    );
  }

  const duplicateSlug = await db.vacancy.findFirst({
    where: {
      id: {
        not: id,
      },
      slug: parsed.data.slug,
    },
    select: {
      id: true,
    },
  });

  if (duplicateSlug) {
    return NextResponse.redirect(
      getRedirectUrl(request, `/admin/vacancies/${id}?result=slug-exists`),
      303,
    );
  }

  const result = await db.vacancy.updateMany({
    where: {
      id,
    },
    data: parsed.data,
  });

  return NextResponse.redirect(
    getRedirectUrl(
      request,
      result.count === 0
        ? "/admin/vacancies?result=missing"
        : "/admin/vacancies?result=updated",
    ),
    303,
  );
}
