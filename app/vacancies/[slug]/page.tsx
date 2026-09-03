import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { InlineApplyForm } from "@/components/vacancies/InlineApplyForm";
import { CityContext } from "@/components/vacancies/CityContext";
import { ContactButtons } from "@/components/vacancies/ContactButtons";
import { PieceworkBreakdown } from "@/components/vacancies/PieceworkBreakdown";
import { VacancyTextBlock } from "@/components/vacancies/VacancyTextBlock";
import { getCitySlug } from "@/lib/cities";
import { buildVacancyDescription, buildVacancyTitle } from "@/lib/meta";
import { buildBreadcrumbJsonLd } from "@/lib/site-jsonld";
import { buildJobPostingJsonLd } from "@/lib/vacancy-jsonld";
import { buildPositionWithProject, formatProject } from "@/lib/project";
import { getCityContext, getVacancyBySlug } from "@/lib/vacancies";

// Страница вакансии не зависит от параметров запроса, поэтому её можно
// отдавать из кэша и обновлять раз в 5 минут. При правке из админки кэш
// сбрасывается принудительно (revalidatePath).
export const revalidate = 300;

// Пустой список — сознательно: на сборке нет доступа к базе, перечислить
// адреса заранее нельзя (на этом уже обожглись с sitemap). Но без самой
// функции Next считает маршрут полностью динамическим и отдаёт `no-store`
// вопреки `revalidate` выше: страницы рендерились заново на каждый запрос,
// включая каждый обход роботом. С ней страницы генерируются по первому
// запросу и дальше живут в ISR-кэше.
export async function generateStaticParams() {
  return [];
}

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

  const cityContext = await getCityContext(vacancy);
  const jobPostingJsonLd = buildJobPostingJsonLd(vacancy);
  const citySlug = getCitySlug(vacancy.city);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Вакансии", path: "/" },
    // Уровень города — только если у города есть своя страница (п. 12).
    ...(citySlug
      ? [{ name: `Работа — ${vacancy.city}`, path: `/rabota/${citySlug}` }]
      : []),
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
        {/* Бренд в H1, а не только в надзаголовке: заголовок первого уровня
            весит в поиске больше всего, а «Лента» — головное слово запроса. */}
        <h1>
          {buildPositionWithProject(vacancy.title, vacancy.project)} —{" "}
          {vacancy.city}
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
        <div className="detail-actions" id="apply">
          <InlineApplyForm
            variant="expanded"
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

      {/* Оплата — первое, что ищут в вакансии, поэтому идёт перед
          обязанностями, а не в конце «Условий». */}
      <PieceworkBreakdown
        hasHourlyRate={Boolean(vacancy.salaryHour)}
        tariff={vacancy.payTariff}
      />
      <VacancyTextBlock title="Обязанности" text={vacancy.responsibilities} />
      <VacancyTextBlock title="Требования" text={vacancy.requirements} />
      <VacancyTextBlock title="Условия" text={vacancy.conditions} />
      {/* Городской контекст — под условиями, а не рядом с формой: он не должен
          конкурировать с главным действием, но должен успеть поймать того,
          кто уже дочитал и понял, что эта вакансия ему не подходит. */}
      <CityContext context={cityContext} />
      </main>
      {/* Липкая панель отклика — только на мобиле (см. globals.css). */}
      <div className="sticky-cta">
        {/* Не форма, а якорь к ней: поле с согласием растянуло бы липкую
            панель на треть экрана ровно в момент прокрутки. */}
        <a className="button-link apply-button" href="#apply">
          Откликнуться
        </a>
        <ContactButtons
          variant="compact"
          vacancy={{ title: vacancy.title, city: vacancy.city }}
        />
      </div>
      <SiteFooter />
    </>
  );
}

