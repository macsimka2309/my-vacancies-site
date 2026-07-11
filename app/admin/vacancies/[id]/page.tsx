import { notFound, redirect } from "next/navigation";
import {
  VacancyForm,
  VacancyFormMessage,
} from "@/components/admin/VacancyForm";
import { canManageVacancies, getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type EditVacancyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditVacancyPage({
  params,
  searchParams,
}: EditVacancyPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin?login=required");
  }

  if (!canManageVacancies(session)) {
    redirect("/admin?vacancies=forbidden");
  }

  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const vacancy = await db.vacancy.findUnique({
    where: {
      id,
    },
  });

  if (!vacancy) {
    notFound();
  }

  return (
    <main className="admin-shell admin-form-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Вакансии</p>
          <h1>Редактировать вакансию</h1>
          <p className="muted">
            {vacancy.project} · {vacancy.city}
          </p>
        </div>
      </header>
      <VacancyFormMessage result={getSingleParam(query.result)} />
      <section className="admin-panel">
        <VacancyForm
          action={`/admin/vacancies/${vacancy.id}/update`}
          submitLabel="Сохранить изменения"
          vacancy={vacancy}
        />
      </section>
    </main>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
