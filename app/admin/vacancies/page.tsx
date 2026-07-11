import { redirect } from "next/navigation";
import {
  canManageVacancies,
  getAdminDisplayName,
  getAdminSession,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type VacanciesAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VacanciesAdminPage({
  searchParams,
}: VacanciesAdminPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin?login=required");
  }

  if (!canManageVacancies(session)) {
    redirect("/admin?vacancies=forbidden");
  }

  const params = searchParams ? await searchParams : {};
  const vacancies = await db.vacancy.findMany({
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  const activeCount = vacancies.filter((vacancy) => vacancy.isActive).length;

  return (
    <main className="admin-shell">
      <header className="admin-header admin-section-header">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Вакансии</h1>
          <p className="muted">
            {getAdminDisplayName(session)} · опубликовано {activeCount} из{" "}
            {vacancies.length}
          </p>
        </div>
        <nav className="admin-header-actions" aria-label="Навигация">
          <a className="secondary-link" href="/admin">
            К откликам
          </a>
          <a className="admin-save admin-menu-link" href="/admin/vacancies/new">
            Создать вакансию
          </a>
        </nav>
      </header>

      <VacancyResultMessage result={getSingleParam(params.result)} />

      {vacancies.length === 0 ? (
        <section className="empty-state">
          <h2>Вакансий пока нет</h2>
          <p className="muted">Создайте первую вакансию и опубликуйте её.</p>
        </section>
      ) : (
        <section className="admin-vacancy-list" aria-label="Список вакансий">
          {vacancies.map((vacancy) => (
            <article className="admin-vacancy-card" key={vacancy.id}>
              <div>
                <div className="admin-vacancy-card-title">
                  <h2>{vacancy.title}</h2>
                  <span
                    className={`status-pill ${
                      vacancy.isActive ? "" : "status-pill--muted"
                    }`}
                  >
                    {vacancy.isActive ? "Опубликована" : "Черновик"}
                  </span>
                </div>
                <p>
                  {vacancy.project} · {vacancy.city} · {vacancy.workFormat}
                </p>
                <p className="muted">
                  Откликов: {vacancy._count.applications} · Обновлена{" "}
                  {formatDate(vacancy.updatedAt)}
                </p>
              </div>
              <div className="admin-vacancy-actions">
                {vacancy.isActive ? (
                  <a
                    className="secondary-link"
                    href={`/vacancies/${vacancy.slug}`}
                    target="_blank"
                  >
                    Открыть
                  </a>
                ) : null}
                <a
                  className="secondary-link"
                  href={`/admin/vacancies/${vacancy.id}`}
                >
                  Редактировать
                </a>
                <form
                  action={`/admin/vacancies/${vacancy.id}/publication`}
                  method="post"
                >
                  <input
                    name="isActive"
                    type="hidden"
                    value={vacancy.isActive ? "false" : "true"}
                  />
                  <button className="admin-save" type="submit">
                    {vacancy.isActive ? "Снять с публикации" : "Опубликовать"}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function VacancyResultMessage({ result }: { result?: string }) {
  const messages: Record<string, { text: string; tone: "success" | "error" }> = {
    created: { text: "Вакансия создана.", tone: "success" },
    missing: { text: "Вакансия не найдена.", tone: "error" },
    published: { text: "Вакансия опубликована.", tone: "success" },
    unpublished: { text: "Вакансия снята с публикации.", tone: "success" },
    updated: { text: "Вакансия обновлена.", tone: "success" },
  };
  const message = result ? messages[result] : null;

  return message ? (
    <p className={`form-message form-message--${message.tone} admin-page-message`}>
      {message.text}
    </p>
  ) : null;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
