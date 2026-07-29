import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Страница не найдена",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        <section className="detail-hero">
          <p className="eyebrow">Ошибка 404</p>
          <h1>Страница не найдена</h1>
          <p className="muted">
            Возможно, вакансия уже закрыта или ссылка устарела. Вернитесь к
            списку — там актуальные вакансии.
          </p>
          <div className="detail-actions">
            <Link className="button-link" href="/">
              К списку вакансий
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
