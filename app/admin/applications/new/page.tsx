import { redirect } from "next/navigation";
import {
  ApplicationForm,
  ApplicationFormMessage,
} from "@/components/admin/ApplicationForm";
import { canManageApplications, getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type NewApplicationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewApplicationPage({
  searchParams,
}: NewApplicationPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin?login=required");
  }

  if (!canManageApplications(session)) {
    redirect("/admin?applications=forbidden");
  }

  const query = searchParams ? await searchParams : {};
  const vacancies = await db.vacancy.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ city: "asc" }, { title: "asc" }],
    select: {
      city: true,
      id: true,
      project: true,
      title: true,
    },
  });

  return (
    <main className="admin-shell admin-form-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Отклики</p>
          <h1>Создать отклик</h1>
          <p className="muted">
            Для тех, кто написал напрямую в Telegram или MAX — иначе такой
            кандидат не попадёт ни в воронку, ни в отчёты.
          </p>
        </div>
      </header>
      <ApplicationFormMessage result={getSingleParam(query.result)} />
      <section className="admin-panel">
        {vacancies.length ? (
          <ApplicationForm vacancies={vacancies} />
        ) : (
          <div className="empty-state">
            <h2>Нет опубликованных вакансий</h2>
            <p className="muted">
              Отклик привязывается к вакансии — сначала опубликуйте хотя бы одну.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
