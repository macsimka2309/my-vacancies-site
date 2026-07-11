import { redirect } from "next/navigation";
import {
  VacancyForm,
  VacancyFormMessage,
} from "@/components/admin/VacancyForm";
import { canManageVacancies, getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type NewVacancyPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewVacancyPage({
  searchParams,
}: NewVacancyPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin?login=required");
  }

  if (!canManageVacancies(session)) {
    redirect("/admin?vacancies=forbidden");
  }

  const params = searchParams ? await searchParams : {};

  return (
    <main className="admin-shell admin-form-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Вакансии</p>
          <h1>Новая вакансия</h1>
          <p className="muted">
            Сохраните как черновик или сразу опубликуйте на сайте.
          </p>
        </div>
      </header>
      <VacancyFormMessage result={getSingleParam(params.result)} />
      <section className="admin-panel">
        <VacancyForm
          action="/admin/vacancies/create"
          submitLabel="Создать вакансию"
        />
      </section>
    </main>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
