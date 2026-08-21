import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ApplyButton } from "@/components/vacancies/ApplyButton";
import { ContactButtons } from "@/components/vacancies/ContactButtons";
import { VacancyTextBlock } from "@/components/vacancies/VacancyTextBlock";
import { buildVacancyDescription, buildVacancyTitle } from "@/lib/meta";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildJobPostingJsonLd } from "@/lib/vacancy-jsonld";
import { formatProject } from "@/lib/project";
import { getVacancyBySlug } from "@/lib/vacancies";

// Страница вакансии не зависит от параметров запроса, поэтому её можно
// отдавать из кэша и обновлять раз в 5 минут. При правке из админки кэш
// сбрасывается принудительно (revalidatePath).
export const revalidate = 300;

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
    // absolute — чтобы к заголовку не приклеивался шаблон «— Работа Рядом»:
    // с ним строка выходила за 60 знаков, и обрезался месячный доход.
    title: { absolute: title },
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
  // Уровень города появится вместе с городскими страницами (п. 12):
  // сейчас `?city=…` канонизируется на главную.
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Вакансии", path: "/" },
    {
      name: `${vacancy.title} — ${vacancy.city}`,
      path: `/vacancies/${vacancy.slug}`,
    },
  ]);

  return (
    <>
      <SiteHeader />
      <main className="page-shell detail-layout">
        {/* Микроразметка вакансии для поисковиков (Яндекс/Google Jobs). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <Link className="back-link" href="/">
          Назад к вакансиям
        </Link>

      <section className="detail-hero">
        <p className="eyebrow">{formatProject(vacancy.project)}</p>
        <h1>
          {vacancy.title} — {vacancy.city}
        </h1>
        <dl className="detail-meta" aria-label="Основные условия вакансии">
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
        </dl>
        <div className="detail-actions">
          <ApplyButton
            vacancy={{
              id: vacancy.id,
              title: vacancy.title,
              project: vacancy.project,
              city: vacancy.city,
            }}
          />
          <ContactButtons
            vacancy={{ title: vacancy.title, city: vacancy.city }}
          />
        </div>
        <ul className="trust-points">
          <li>{formatProject(vacancy.project)}</li>
          <li>Еженедельные выплаты</li>
          <li>Без опыта — обучим</li>
        </ul>
      </section>

      <VacancyTextBlock title="Обязанности" text={vacancy.responsibilities} />
      <VacancyTextBlock title="Требования" text={vacancy.requirements} />
      <VacancyTextBlock title="Условия" text={vacancy.conditions} />
      </main>
      {/* Липкая панель отклика — только на мобиле (см. globals.css). */}
      <div className="sticky-cta">
        <ApplyButton
          vacancy={{
            id: vacancy.id,
            title: vacancy.title,
            project: vacancy.project,
            city: vacancy.city,
          }}
        />
        <ContactButtons
          variant="compact"
          vacancy={{ title: vacancy.title, city: vacancy.city }}
        />
      </div>
      <SiteFooter />
    </>
  );
}

