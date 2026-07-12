import Link from "next/link";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" href="/" aria-label={`${site.name} — на главную`}>
          <span className="site-brand__mark" aria-hidden="true" />
          <span className="site-brand__name">{site.name}</span>
        </Link>
        {site.phone ? (
          <a className="site-header__phone" href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}>
            {site.phone}
          </a>
        ) : null}
      </div>
    </header>
  );
}
