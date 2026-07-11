import { NextRequest, NextResponse } from "next/server";
import {
  canManageVacancies,
  getAdminSessionFromRequest,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getRedirectUrl } from "@/lib/redirect-url";
import { parseVacancyForm } from "@/lib/vacancy-form";

export async function POST(request: NextRequest) {
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

  const parsed = parseVacancyForm(await request.formData());

  if ("error" in parsed) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin/vacancies/new?result=invalid"),
      303,
    );
  }

  const existingVacancy = await db.vacancy.findUnique({
    where: {
      slug: parsed.data.slug,
    },
    select: {
      id: true,
    },
  });

  if (existingVacancy) {
    return NextResponse.redirect(
      getRedirectUrl(request, "/admin/vacancies/new?result=slug-exists"),
      303,
    );
  }

  await db.vacancy.create({
    data: parsed.data,
  });

  return NextResponse.redirect(
    getRedirectUrl(request, "/admin/vacancies?result=created"),
    303,
  );
}
