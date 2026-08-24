import { getCityIn } from "./cities";
import { buildPositionWithProject } from "./project";

/**
 * Формулы `title` и `description`.
 *
 * Это не «теги для роботов», а текст, который человек читает в выдаче
 * и по которому решает, кликать ли. Поэтому два правила:
 *
 * 1. Заголовок должен помещаться. Поиск показывает около 60 знаков —
 *    у страницы вакансии было 80, и обрезался ровно месячный доход.
 * 2. В описании не должно быть служебных слов и маркеров списка: оно
 *    собиралось из сырого контента и начиналось с «официальный партнёр».
 */
export const TITLE_LIMIT = 60;
export const DESCRIPTION_LIMIT = 160;

type VacancyMetaSource = {
  city: string;
  project: string;
  salary: string | null;
  title: string;
};

export function buildVacancyTitle(vacancy: VacancyMetaSource) {
  // Бренд идёт сразу за профессией — так человек и спрашивает: «лента
  // сборщик заказов вакансии спб». Город после тире и в именительном:
  // иначе в заголовке оказывается два «в» подряд.
  const base = `${buildPositionWithProject(vacancy.title, vacancy.project)} — ${vacancy.city}`;

  // Страховка на случай очень длинной связки. С нынешним каталогом самая
  // длинная — 57 знаков («Курьер на электровелосипеде в Самокате — Великий
  // Новгород»), так что сюда не попадаем. Но связку задаёт база, а не код.
  if (base.length > TITLE_LIMIT) {
    return `${vacancy.title} — ${vacancy.city}`;
  }

  const shiftRate = getShiftRate(vacancy.salary);

  if (!shiftRate) {
    return base;
  }

  // Ставка — самое убедительное, что есть в заголовке, поэтому прежде чем
  // её выбросить, пробуем короткую запись. Три знака решают судьбу
  // Санкт-Петербурга: с «за смену» заголовок 61 знак, с «/смена» — 58.
  for (const rate of [shiftRate, toCompactRate(shiftRate)]) {
    const withRate = `${base}, ${rate}`;

    if (withRate.length <= TITLE_LIMIT) {
      return withRate;
    }
  }

  return base;
}

export function buildVacancyDescription(vacancy: VacancyMetaSource) {
  const cityIn = getCityIn(vacancy.city);
  const where = cityIn ? `в ${cityIn}` : `— ${vacancy.city}`;

  return truncate(
    [
      `${vacancy.title} ${where}, ${vacancy.project}.`,
      vacancy.salary ? `${capitalize(vacancy.salary)}.` : null,
      "Выплаты каждую неделю. Оставьте телефон — перезвоним и расскажем условия.",
    ]
      .filter(Boolean)
      .join(" "),
    DESCRIPTION_LIMIT,
  );
}

type CatalogMetaSource = {
  cities: string[];
  cityCount: number;
  vacancyCount: number;
};

export function buildCatalogTitle(catalog: CatalogMetaSource) {
  if (catalog.cities.length === 1) {
    const cityIn = getCityIn(catalog.cities[0]);

    return cityIn
      ? `Работа курьером в ${cityIn} — ${formatVacancies(catalog.vacancyCount)}`
      : `Работа курьером — ${catalog.cities[0]}`;
  }

  // Раньше здесь стояло «Вакансии — Работа Рядом»: 23 знака и ни одного
  // слова, которое кто-то ищет.
  return `Работа курьером и сборщиком заказов — ${formatVacancies(catalog.vacancyCount)}`;
}

export function buildCatalogDescription(catalog: CatalogMetaSource) {
  const scope =
    catalog.cities.length === 1
      ? `в городе ${catalog.cities[0]}`
      : `в ${catalog.cityCount} городах России`;

  return truncate(
    `${capitalize(formatVacancies(catalog.vacancyCount))} ${scope}: доставка, сборка заказов, вахта. ` +
      "Выплаты каждую неделю, опыт не нужен. Оставьте телефон — перезвоним.",
    DESCRIPTION_LIMIT,
  );
}

// «до 6500 ₽ за смену» → «до 6500 ₽/смена». Запись «₽/мес» уже встречается
// в витринных зарплатах, так что форма для читателя не новая.
function toCompactRate(rate: string) {
  return rate.replace(/\s*за смену$/i, "/смена");
}

// «до 6500 ₽ за смену · от 102 000 ₽/мес» → «до 6500 ₽ за смену».
function getShiftRate(salary: string | null) {
  const shiftPart = (salary ?? "")
    .split("·")
    .map((part) => part.trim())
    .find((part) => /смен/i.test(part));

  return shiftPart || null;
}

function formatVacancies(count: number) {
  const words: Record<string, string> = {
    one: "вакансия",
    few: "вакансии",
    many: "вакансий",
    other: "вакансии",
  };
  const word =
    words[new Intl.PluralRules("ru-RU").select(count)] ?? words.other;

  return `${count} ${word}`;
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1);
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  // Режем по границе слова, чтобы описание не обрывалось на полуслове.
  const cut = value.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
