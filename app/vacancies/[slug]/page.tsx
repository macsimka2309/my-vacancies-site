import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ApplyButton } from "@/components/vacancies/ApplyButton";
import { VacancyTextBlock } from "@/components/vacancies/VacancyTextBlock";
import { buildJobPostingJsonLd } from "@/lib/vacancy-jsonld";
import { getVacancyBySlug, type VacancyDetails } from "@/lib/vacancies";

export const dynamic = "force-dynamic";

// Один запрос на рендер: и generateMetadata, и сама страница берут из кэша.
const loadVacancy = cache((slug: string) => getVacancyBySlug(slug));

type VacancyPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: VacancyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const vacancy = await loadVacancy(slug);

  if (!vacancy) {
    return { title: "Вакансия не найдена" };
  }

  const title = buildVacancyTitle(vacancy);
  const description = buildVacancyDescription(vacancy);

  return {
    title,
    description,
    alternates: { canonical: `/vacancies/${vacancy.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/vacancies/${vacancy.slug}`,
    },
  };
}

export default async function VacancyPage({ params }: VacancyPageProps) {
  const { slug } = await params;
  const vacancy = await loadVacancy(slug);

  if (!vacancy) {
    notFound();
  }

  const jobPostingJsonLd = buildJobPostingJsonLd(vacancy);

  return (
    <>
      <SiteHeader />
      <main className="page-shell detail-layout">
        {/* Микроразметка вакансии для поисковиков (Яндекс/Google Jobs). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
        />
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
      <SiteFooter />
    </>
  );
}

function buildVacancyTitle(vacancy: VacancyDetails) {
  const parts = [vacancy.title, vacancy.city];

  if (vacancy.salary) {
    parts.push(vacancy.salary);
  }

  return parts.join(" — ");
}

function buildVacancyDescription(vacancy: VacancyDetails) {
  const firstResponsibility = vacancy.responsibilities
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0];

  const lead = [vacancy.project, vacancy.city, vacancy.salary]
    .filter(Boolean)
    .join(" · ");

  const description = [lead, firstResponsibility].filter(Boolean).join(". ");

  return description.length > 300
    ? `${description.slice(0, 297)}...`
    : description;
}
