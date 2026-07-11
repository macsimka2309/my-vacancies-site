import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyButton } from "@/components/vacancies/ApplyButton";
import { VacancyTextBlock } from "@/components/vacancies/VacancyTextBlock";
import { getVacancyBySlug } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

type VacancyPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function VacancyPage({ params }: VacancyPageProps) {
  const { slug } = await params;
  const vacancy = await getVacancyBySlug(slug);

  if (!vacancy) {
    notFound();
  }

  return (
    <main className="page-shell detail-layout">
      <Link className="back-link" href="/">
        Назад к вакансиям
      </Link>

      <section className="detail-hero">
        <p className="eyebrow">{vacancy.project}</p>
        <h1>{vacancy.title}</h1>
        <dl className="detail-meta" aria-label="Основные условия вакансии">
          <div>
            <dt>Город</dt>
            <dd>{vacancy.city}</dd>
          </div>
          <div>
            <dt>Формат</dt>
            <dd>{vacancy.workFormat}</dd>
          </div>
          {vacancy.salary ? (
            <div>
              <dt>Доход</dt>
              <dd>{vacancy.salary}</dd>
            </div>
          ) : null}
          {vacancy.schedule ? (
            <div>
              <dt>График</dt>
              <dd>{vacancy.schedule}</dd>
            </div>
          ) : null}
          {vacancy.address ? (
            <div>
              <dt>Адрес</dt>
              <dd>{vacancy.address}</dd>
            </div>
          ) : null}
        </dl>
        <div className="detail-actions">
          <ApplyButton vacancy={vacancy} />
        </div>
      </section>

      <VacancyTextBlock title="Обязанности" text={vacancy.responsibilities} />
      <VacancyTextBlock title="Требования" text={vacancy.requirements} />
      <VacancyTextBlock title="Условия" text={vacancy.conditions} />

      {vacancy.contactComment ? (
        <section className="detail-section detail-note">
          <h2>Комментарий</h2>
          <p>{vacancy.contactComment}</p>
        </section>
      ) : null}

      <section className="apply-preview">
        <div>
          <h2>Другие вакансии</h2>
          <p className="muted">
            Вернитесь к списку, чтобы сравнить условия по другим направлениям.
          </p>
        </div>
        <Link className="button-link" href="/">
          Смотреть все вакансии
        </Link>
      </section>
    </main>
  );
}
