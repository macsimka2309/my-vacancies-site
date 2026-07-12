import { site } from "./site";
import type { VacancyDetails } from "./vacancies";

// Собирает объект schema.org/JobPosting для микроразметки вакансии.
// Помогает попаданию в блок «Вакансии» Яндекса и Google Jobs.
export function buildJobPostingJsonLd(vacancy: VacancyDetails) {
  const description = buildDescriptionHtml(vacancy);
  const isRemote = detectRemote(vacancy);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: vacancy.title,
    description,
    datePosted: vacancy.createdAt.toISOString(),
    employmentType: "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: site.name,
      sameAs: site.url,
    },
    directApply: true,
  };

  if (isRemote) {
    jsonLd.jobLocationType = "TELECOMMUTE";
    jsonLd.applicantLocationRequirements = {
      "@type": "Country",
      name: "Россия",
    };
  } else {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: vacancy.city,
        addressCountry: "RU",
        ...(vacancy.address ? { streetAddress: vacancy.address } : {}),
      },
    };
  }

  const salaryValue = parseMinSalary(vacancy.salary);

  if (salaryValue !== null) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "RUB",
      value: {
        "@type": "QuantitativeValue",
        value: salaryValue,
        unitText: "MONTH",
      },
    };
  }

  return jsonLd;
}

function buildDescriptionHtml(vacancy: VacancyDetails) {
  const sections: Array<[string, string]> = [
    ["Обязанности", vacancy.responsibilities],
    ["Требования", vacancy.requirements],
    ["Условия", vacancy.conditions],
  ];

  return sections
    .map(([heading, text]) => {
      const items = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");

      return items ? `<p><b>${heading}</b></p><ul>${items}</ul>` : "";
    })
    .filter(Boolean)
    .join("");
}

function detectRemote(vacancy: VacancyDetails) {
  const haystack = `${vacancy.workFormat} ${vacancy.address ?? ""}`.toLowerCase();

  return haystack.includes("удал") || haystack.includes("remote");
}

// Достаёт минимальную зарплату-число из строки вида «от 55 000 руб. в месяц».
function parseMinSalary(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const amounts = value
    .match(/\d[\d\s]*/g)
    ?.map((amount) => Number(amount.replace(/\D/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  if (!amounts?.length) {
    return null;
  }

  return Math.min(...amounts);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
