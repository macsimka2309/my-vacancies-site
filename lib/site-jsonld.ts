import { site } from "./site";

/**
 * Микроразметка витрины: кто мы и что за список показываем.
 *
 * До этого структурированные данные были только на страницах вакансий.
 * Главная и списки не сообщали поисковику ничего — ни организации,
 * ни того, что страница является перечнем вакансий.
 */
export function buildOrganizationJsonLd() {
  const organization: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "Organization",
    "@id": `${site.url}/#organization`,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}/logo-mark.png`,
    email: site.email,
    taxID: site.inn,
    areaServed: {
      "@type": "Country",
      name: "Россия",
    },
  };

  // Телефон объявляем, только когда он действительно есть: пустой контакт
  // в разметке хуже отсутствующего — см. п. 11 бэклога.
  if (site.phone) {
    organization.telephone = site.phone;
    organization.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: site.phone,
      areaServed: "RU",
      availableLanguage: "Russian",
    };
  }

  return organization;
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org/",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: "ru-RU",
    publisher: {
      "@id": `${site.url}/#organization`,
    },
  };
}

type ListedVacancy = {
  city: string;
  slug: string;
  title: string;
};

/**
 * Перечень вакансий на странице. Сообщает поисковику, что это список
 * из N позиций с такими-то названиями и адресами, а не просто текст.
 */
export function buildVacancyListJsonLd(vacancies: ListedVacancy[]) {
  return {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    numberOfItems: vacancies.length,
    itemListElement: vacancies.map((vacancy, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${vacancy.title} — ${vacancy.city}`,
      url: `${site.url}/vacancies/${vacancy.slug}`,
    })),
  };
}

type Crumb = {
  name: string;
  path: string;
};

/**
 * Хлебные крошки. В результатах поиска заменяют строку адреса читаемым путём.
 *
 * Уровень города появится вместе с городскими страницами (п. 12): сейчас
 * `?city=…` канонизируется на главную, и ссылка на него в крошках
 * означала бы «Главная → Главная → Вакансия».
 */
export function buildBreadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${site.url}${crumb.path}`,
    })),
  };
}
