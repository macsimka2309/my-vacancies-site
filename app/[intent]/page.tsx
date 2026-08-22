import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { VacancyList } from "@/components/vacancies/VacancyList";
import { getIntent, INTENT_SLUGS } from "@/lib/intents";
import { site } from "@/lib/site";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildVacancyListJsonLd,
} from "@/lib/site-jsonld";
import { getIntentStats, getIntentVacancies } from "@/lib/vacancies";

// Как и на странице вакансии: кэшируем ISR, но не пререндерим на сборке —
// там нет доступа к базе. Неизвестный адрес отдаёт 404 ниже по коду.
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

// Столько же, сколько на главной, и по той же причине: /bez-opyta подходит
// почти всему каталогу, и без ограничения страница весила мегабайт —
// ровно та проблема, которую чинили в P0.
const PREVIEW_LIMIT = 12;

type IntentPageProps = {
  params: Promise<{
    intent: string;
  }>;
};

// Один запрос на рендер: generateMetadata и сама страница берут из кэша.
const loadPage = cache(async (slug: string) => {
  const intent = getIntent(slug);

  if (!intent) {
    return null;
  }

  const [vacancies, stats] = await Promise.all([
    getIntentVacancies(intent.match),
    getIntentStats(intent.match),
  ]);

  return { intent, vacancies, stats };
});

export async function generateMetadata({
  params,
}: IntentPageProps): Promise<Metadata> {
  const { intent: slug } = await params;
  const page = await loadPage(slug);

  if (!page) {
    return { title: "Страница не найдена" };
  }

  return {
    title: { absolute: page.intent.title },
    description: page.intent.description,
    alternates: { canonical: `/${page.intent.slug}` },
    openGraph: {
      type: "website",
      title: page.intent.title,
      description: page.intent.description,
      url: `/${page.intent.slug}`,
    },
  };
}

export default async function IntentPage({ params }: IntentPageProps) {
  const { intent: slug } = await params;
  const page = await loadPage(slug);

  if (!page) {
    notFound();
  }

  const { intent, vacancies, stats } = page;
  const faq = intent.faq(stats);
  const visibleVacancies = vacancies.slice(0, PREVIEW_LIMIT);
  const isTrimmed = vacancies.length > PREVIEW_LIMIT;

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              buildBreadcrumbJsonLd([
                { name: "Вакансии", path: "/" },
                { name: intent.h1, path: `/${intent.slug}` },
              ]),
              buildFaqJsonLd(faq),
              buildVacancyListJsonLd(visibleVacancies),
            ]),
          }}
        />
        <Link className="back-link" href="/">
          Все вакансии
        </Link>

        <section className="page-header">
          <p className="eyebrow">{site.tagline}</p>
          <h1>{intent.h1}</h1>
          {/* Прямой ответ первым абзацем: его читает человек за первые
              секунды, и его же цитируют поиск и ассистенты. */}
          <p className="intent-lead">{intent.lead(stats)}</p>
        </section>

        <section className="intent-faq" aria-label="Частые вопросы">
          <h2>Частые вопросы</h2>
          <dl>
            {faq.map((item) => (
              <div key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Подходящие вакансии">
          <h2 className="intent-list-heading">Подходящие вакансии</h2>
          {vacancies.length ? (
            <>
              <VacancyList vacancies={visibleVacancies} />
              {isTrimmed ? (
                <a className="show-all-link" href="/?all=1">
                  Посмотреть все вакансии
                </a>
              ) : null}
            </>
          ) : (
            <div className="empty-state">
              <h3>{intent.emptyText}</h3>
              <Link className="button-link" href="/">
                К списку вакансий
              </Link>
            </div>
          )}
        </section>

        <nav className="intent-links" aria-label="Другие подборки">
          {INTENT_SLUGS.filter((other) => other !== intent.slug).map((other) => {
            const link = getIntent(other)!;

            return (
              <Link key={other} href={`/${other}`}>
                {link.h1}
              </Link>
            );
          })}
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}
