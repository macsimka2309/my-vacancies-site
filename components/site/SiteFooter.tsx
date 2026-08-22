import Link from "next/link";
import { getIntent, INTENT_SLUGS } from "@/lib/intents";
import { site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__col">
          <p className="site-footer__name">{site.legalName}</p>
          {site.inn ? <p className="muted">ИНН {site.inn}</p> : null}
        </div>
        {/* Подборки во всех подвалах: без ссылок изнутри сайта поисковик
            добирается до них только через карту сайта. */}
        <nav className="site-footer__links" aria-label="Подборки вакансий">
          {INTENT_SLUGS.map((slug) => (
            <Link key={slug} href={`/${slug}`}>
              {getIntent(slug)!.h1}
            </Link>
          ))}
        </nav>
        <nav className="site-footer__links" aria-label="Правовая информация">
          <Link href="/privacy">Политика конфиденциальности</Link>
          {site.email ? (
            <a href={`mailto:${site.email}`}>{site.email}</a>
          ) : null}
          {site.phone ? (
            <a href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}>{site.phone}</a>
          ) : null}
        </nav>
        <p className="site-footer__copy muted">
          © {year} {site.name}
        </p>
      </div>
    </footer>
  );
}
