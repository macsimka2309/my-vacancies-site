import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CityGate } from "@/components/vacancies/CityGate";
import { VacancyList } from "@/components/vacancies/VacancyList";
import { getCityIn, matchKnownCity } from "@/lib/cities";
import { getIntent, INTENT_SLUGS } from "@/lib/intents";
import { formatUpdatedDate } from "@/lib/meta";
import { site } from "@/lib/site";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildVacancyListJsonLd,
  buildWebPageJsonLd,
} from "@/lib/site-jsonld";
import { buildIntentStats, getIntentVacancies } from "@/lib/vacancies";

// force-dynamic, а не ISR: страница теперь читает `searchParams` (город
// квиза, п. 14) — Next не даёт делать это в статически оптимизируемом
// роуте (DYNAMIC_SERVER_USAGE). Кэш всё равно на уровне данных —
// `getIntentVacancies` завёрнут в unstable_cache на 300 секунд, как и
// раньше, так каждый запрос не бьёт по базе.
export const dynamic = "force-dynamic";

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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// Один запрос на рендер: generateMetadata и сама страница берут из кэша.
// Без city — тем счёт под метаданные не зависит от адреса, только от слага.
const loadPage = cache(async (slug: string) => {
  const intent = getIntent(slug);

  if (!intent) {
    return null;
  }

  const vacancies = await getIntentVacancies(intent.match);

  return { intent, vacancies, stats: buildIntentStats(vacancies) };
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

export default async function IntentPage({
  params,
  searchParams,
}: IntentPageProps) {
  const { intent: slug } = await params;
  const page = await loadPage(slug);

  if (!page) {
    notFound();
  }

  const { intent } = page;
  const cityParam = searchParams ? (await searchParams).city : undefined;
  const cityCandidate = Array.isArray(cityParam) ? cityParam[0] : cityParam;
  // Как на главной: город из ссылки может не совпасть со справочником
  // (опечатка, чужой регистр) — тогда его тихо игнорируем, а не показываем
  // пустой список.
  const knownCities = [...new Set(page.vacancies.map((item) => item.city))];
  const selectedCity = matchKnownCity(cityCandidate, knownCities);
  const vacancies = selectedCity
    ? page.vacancies.filter((item) => item.city === selectedCity)
    : page.vacancies;
  // Второй вопрос квиза (п. 14) уже отвечен адресом страницы — здесь
  // остаётся только первый, город, той же виджетом, что и на главной.
  const cityCounts = knownCities
    .map((city) => ({
      city,
      count: page.vacancies.filter((item) => item.city === city).length,
    }))
    .sort((a, b) => b.count - a.count);
  const stats = selectedCity ? buildIntentStats(vacancies) : page.stats;
  const cityIn = selectedCity ? getCityIn(selectedCity) : null;
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
              // dateModified — только когда есть хоть одна вакансия: без
              // неё нет и данных, дату которых можно было бы честно назвать.
              ...(stats.updatedAt
                ? [buildWebPageJsonLd(`/${intent.slug}`, stats.updatedAt)]
                : []),
            ]),
          }}
        />
        <Link className="back-link" href="/">
          Все вакансии
        </Link>

        <section className="page-header">
          <p className="eyebrow">{site.tagline}</p>
          <h1>
            {intent.h1}
            {cityIn ? ` в ${cityIn}` : ""}
          </h1>
          {/* Прямой ответ первым абзацем: его читает человек за первые
              секунды, и его же цитируют поиск и ассистенты. */}
          <p className="intent-lead">{intent.lead(stats)}</p>
          {stats.updatedAt ? (
            <p className="city-page__updated muted">
              Обновлено {formatUpdatedDate(stats.updatedAt)}
            </p>
          ) : null}
        </section>

        {/* Второй вопрос квиза (п. 14) уже отвечен адресом страницы —
            здесь остаётся только город, тем же виджетом, что на главной.
            Не гейт: список ниже виден независимо от выбора (п. 6). */}
        {selectedCity ? (
          <p className="muted">
            <Link href={`/${intent.slug}`}>Все города</Link>
          </p>
        ) : (
          <CityGate cityCounts={cityCounts} intentSlug={intent.slug} />
        )}

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
          ) : selectedCity ? (
            // Отличаем от «такой работы нет вообще» (intent.emptyText):
            // подборка есть, просто не в этом городе — выдуманного текста
            // тут не нужно, достаточно предложить снять фильтр.
            <div className="empty-state">
              <h3>В этом городе таких вакансий пока нет.</h3>
              <Link className="button-link" href={`/${intent.slug}`}>
                Посмотреть все города
              </Link>
            </div>
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
