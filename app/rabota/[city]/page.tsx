import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ContactButtons } from "@/components/vacancies/ContactButtons";
import { VacancyList } from "@/components/vacancies/VacancyList";
import { joinProjects } from "@/lib/city-context";
import { buildCityFaq, describePay, money } from "@/lib/city-page";
import {
  buildCityPageDescription,
  buildCityPageTitle,
  describeCityWork,
  formatVacancies,
} from "@/lib/meta";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  buildVacancyListJsonLd,
} from "@/lib/site-jsonld";
import { getCityPageBySlug } from "@/lib/vacancies";

// Тот же режим, что у карточек вакансий (п. 36): страница не зависит от
// параметров запроса, поэтому живёт в ISR-кэше. Пустой список параметров —
// сознательно: на сборке нет доступа к базе.
export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

const loadCityPage = cache((slug: string) => getCityPageBySlug(slug));

type CityPageProps = {
  params: Promise<{
    city: string;
  }>;
};

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { city } = await params;
  const page = await loadCityPage(city);

  if (!page) {
    return { title: "Город не найден" };
  }

  const title = buildCityPageTitle(page);
  const description = buildCityPageDescription(page);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/rabota/${page.slug}` },
    // Города ниже порога остаются для человека, но поиску не отдаются:
    // одна-две вакансии — это копия карточки, а не страница города.
    // `follow` — чтобы робот всё равно прошёл по ссылкам на вакансии.
    robots: page.indexable ? undefined : { index: false, follow: true },
    openGraph: { type: "website", title, description },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { city } = await params;
  const page = await loadCityPage(city);

  if (!page) {
    notFound();
  }

  const where = page.cityIn ? `в ${page.cityIn}` : `— ${page.city}`;
  const faq = buildCityFaq(page);
  const vacancies = page.professions.flatMap(
    (profession) => profession.vacancies,
  );

  return (
    <>
      <SiteHeader />
      <main className="page-shell city-layout">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildVacancyListJsonLd(
                vacancies.map((vacancy) => ({
                  slug: vacancy.slug,
                  title: vacancy.title,
                  city: vacancy.city,
                })),
              ),
            ),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildBreadcrumbJsonLd([
                { name: "Вакансии", path: "/" },
                { name: `Работа ${where}`, path: `/rabota/${page.slug}` },
              ]),
            ),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildFaqJsonLd(faq)),
          }}
        />

        <Link className="back-link" href="/">
          Все города
        </Link>

        <section className="detail-hero">
          <p className="eyebrow">
            {page.region ?? "Россия"}
          </p>
          {/* H1 с профессиями, а не просто «Работа в Твери»: тот же урок,
              что и с карточками (п. 42) — заголовок первого уровня весит в
              поиске больше всего, и слова, которые ищут, должны быть в нём. */}
          <h1>
            Работа {describeCityWork(page.professions)} {where}
          </h1>
          {/* Первый абзац — прямой ответ на запрос, цифры только из базы.
              Он же — то, что может процитировать поиск или ассистент. */}
          <p className="city-page__lead">
            {page.cityIn ? `В ${page.cityIn}` : `В городе ${page.city}`}{" "}
            {formatVacancies(page.total)}
            {page.projects.length > 1
              ? `, работодатели — ${joinProjects(page.projects)}`
              : `, работодатель — ${page.projects[0]}`}
            .{" "}
            {page.to !== null
              ? `Верхняя ставка смены — ${money(page.to)} ₽.`
              : ""}{" "}
            Опыт не нужен, выплаты еженедельные.
            {page.noTransportProfession ? (
              <>
                {" "}
                Свой транспорт нужен не везде: «{page.noTransportProfession}» —
                работа на одной точке, внутри магазина.
              </>
            ) : null}
          </p>
          <div className="detail-actions">
            <ContactButtons />
          </div>
        </section>

        {page.professions.map((profession) => (
          <section className="detail-section" key={profession.title}>
            <h2>
              {profession.title} {where}
            </h2>
            {/* Свод по профессии — только когда вакансий несколько. При
                одной он дословно повторяет строку под ним. */}
            {profession.count > 1 ? (
              <p className="city-page__pay">{describePay(profession)}</p>
            ) : null}
            {/* Карточки, а не ссылки: до 31.08 городская страница не умела
                принимать отклик вовсе — человек из поиска был обязан сначала
                перейти в вакансию. Это лишний шаг ровно для того трафика,
                ради которого страница и делалась. Сравнение по профессиям
                при этом остаётся: оно в заголовке секции и своде над списком. */}
            <VacancyList vacancies={profession.vacancies} />
          </section>
        ))}

        {faq.length > 0 ? (
          <section className="detail-section">
            <h2>Частые вопросы</h2>
            <dl className="city-page__faq">
              {faq.map((item) => (
                <div key={item.question}>
                  <dt>{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {page.regionCities.length > 0 ? (
          <section className="detail-section">
            <h2>{page.region ?? "Рядом"}</h2>
            <ul className="city-page__cities">
              {page.regionCities.map((item) => (
                <li key={item.slug}>
                  <Link href={`/rabota/${item.slug}`}>
                    {item.city} <span className="muted">({item.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      {/* Липкой панели здесь нет намеренно: форма отклика теперь в каждой
          карточке списка, и якорь к «той самой» форме указать не на что —
          их на странице несколько. Кому нужен звонок, телефон закреплён
          в шапке, и он размечен целью. */}
      <SiteFooter />
    </>
  );
}
