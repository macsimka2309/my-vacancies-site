import { getRegionByCity } from "./cities";
import { toJsonLdSalary } from "./salary";
import { site } from "./site";
import type { VacancyDetails } from "./vacancies";
import { getValidThrough } from "./vacancy-validity";

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
    // Без срока объявление отбраковывается при импорте в агрегаторы
    // и выпадает из блока вакансий. Подробности — в vacancy-validity.ts.
    validThrough: getValidThrough(vacancy).toISOString(),
    // Постоянный номер объявления. Без него агрегатор не сможет сопоставить
    // повторную выгрузку с уже загруженным и заведёт дубль вместо правки.
    identifier: {
      "@type": "PropertyValue",
      name: site.name,
      value: vacancy.id,
    },
    employmentType: detectEmploymentType(vacancy),
    hiringOrganization: {
      "@type": "Organization",
      name: site.name,
      sameAs: site.url,
      url: site.url,
      logo: `${site.url}/logo-mark.png`,
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
    const addressRegion = getRegionByCity(vacancy.city);

    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: vacancy.city,
        // Регион знаем не для всякого города; выдумывать его нельзя —
        // неверный увёл бы вакансию не в ту региональную выдачу.
        ...(addressRegion ? { addressRegion } : {}),
        ...(vacancy.address ? { streetAddress: vacancy.address } : {}),
        addressCountry: "RU",
      },
    };
  }

  // «Опыт не требуется» — наш сильнейший оффер, и у агрегаторов под него есть
  // отдельный фильтр. Ставим только там, где это написано в самой вакансии:
  // молчание о требованиях не означает, что опыт не нужен.
  if (detectNoExperienceRequired(vacancy)) {
    jsonLd.experienceRequirements = {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: 0,
    };
  }

  if (vacancy.schedule) {
    jsonLd.workHours = vacancy.schedule;
  }

  const jobBenefits = buildJobBenefits(vacancy);

  if (jobBenefits) {
    jsonLd.jobBenefits = jobBenefits;
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

// В блоке «Условия» лежит ровно то, что schema.org называет jobBenefits:
// еженедельные выплаты, бонусы, возмещение налога. Отдаём как есть, без
// маркеров списка — придумывать за вакансию нечего.
function buildJobBenefits(vacancy: VacancyDetails) {
  return vacancy.conditions
    .split("\n")
    .map((line) => line.replace(/^[•\-–—*]\s*/, "").trim())
    .filter(Boolean)
    .join("; ");
}

function detectNoExperienceRequired(vacancy: VacancyDetails) {
  const haystack =
    `${vacancy.title} ${vacancy.requirements} ${vacancy.conditions}`.toLowerCase();

  return /опыт не требуется|без опыта|не требуется опыт|опыта не требует|обучим/.test(
    haystack,
  );
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
