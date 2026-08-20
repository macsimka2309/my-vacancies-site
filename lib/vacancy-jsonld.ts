import { toJsonLdSalary } from "./salary";
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
    employmentType: detectEmploymentType(vacancy),
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
      },
    };
  }

  const salary = toJsonLdSalary(vacancy);

  // Лучше не указывать зарплату вовсе, чем указать неверную: раньше сюда
  // уходила минимальная сумма из строки с меткой «в месяц», и «2650–5300 ₽
  // за смену» превращалось в агрегаторе в «2650 ₽/мес».
  if (salary) {
    const isRange = salary.min !== null && salary.max !== null && salary.min !== salary.max;

    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "RUB",
      value: {
        "@type": "QuantitativeValue",
        ...(isRange
          ? { minValue: salary.min, maxValue: salary.max }
          : { value: salary.min ?? salary.max }),
        unitText: salary.unitText,
      },
    };
  }

  return jsonLd;
}

// Вахта — полная занятость; смены от 4 часов со свободным графиком —
// частичная. Раньше всем проставлялся FULL_TIME.
function detectEmploymentType(vacancy: VacancyDetails) {
  const haystack =
    `${vacancy.title} ${vacancy.workFormat} ${vacancy.schedule ?? ""}`.toLowerCase();

  if (haystack.includes("вахт")) {
    return "FULL_TIME";
  }

  if (/свободн|гибк|от 4 часов|частичн/.test(haystack)) {
    return "PART_TIME";
  }

  return "FULL_TIME";
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
