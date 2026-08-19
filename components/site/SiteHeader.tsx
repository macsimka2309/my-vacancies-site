import Link from "next/link";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-brand" href="/" aria-label={`${site.name} — на главную`}>
          {/* WebP для современных браузеров, PNG — запасной вариант.
              Оба в 3x под ретину: показывается 34×42. */}
          <picture>
            <source srcSet="/logo-mark.webp" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="site-brand__logo"
              src="/logo-mark.png"
              alt=""
              width={34}
              height={42}
            />
          </picture>
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
