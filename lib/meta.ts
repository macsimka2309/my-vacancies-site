import { getCityIn } from "./cities";
import { buildPositionWithProject } from "./project";
import { formatHourlyRate } from "./salary";

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
  /** Заполнен у всех 169 вакансий, но до 31.08 нигде не показывался. */
  schedule?: string | null;
  requirements?: string | null;
  /** Ставка за час — её же спрашивают в поиске: «зп в час», «179 р в час». */
  salaryHour?: number | null;
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

  // Час впереди смены: он сравним независимо от её длины, и именно его
  // набирают в поиске — «ставка за час сборщика», «сборщик лента зп в час».
  const hourly = formatHourlyRate(vacancy.salaryHour);

  if (hourly && `${base}, ${hourly}`.length <= TITLE_LIMIT) {
    return `${base}, ${hourly}`;
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

/**
 * Описание — это сниппет в выдаче, а не место для призыва.
 *
 * Замер 31.08: 191 страница в индексе, 74 показа, **один клик**. Охват есть,
 * выбора нет. При этом треть описания занимала фраза «Оставьте телефон —
 * перезвоним и расскажем условия»: мы обещали рассказать условия человеку,
 * который в этот момент ищет именно условия. Запросы недели — «ставка за час
 * сборщика заказов ленты в ростове на дону», «сборщик заказов график»,
 * «работа оплата ежедневно».
 *
 * Теперь вместо призыва идут факты, и `schedule` наконец попадает в сниппет:
 * поле заполнено у всех 169 вакансий и не использовалось нигде.
 */
export function buildVacancyDescription(vacancy: VacancyMetaSource) {
  const base = `${buildPositionWithProject(vacancy.title, vacancy.project)} — ${vacancy.city}.`;
  const hourly = formatHourlyRate(vacancy.salaryHour);
  const money = vacancy.salary
    ? `${capitalize(vacancy.salary)}, выплаты каждую неделю.`
    : "Выплаты каждую неделю.";

  return fillWithin(DESCRIPTION_LIMIT, [
    [base],
    hourly ? [`${capitalize(hourly)}.`] : [],
    [money],
    // «Опыт не нужен» короче графика и отвечает на частый вопрос, поэтому
    // идёт раньше. Утверждаем только там, где это написано в самой вакансии.
    hasNoExperience(vacancy.requirements) ? ["Опыт не нужен."] : [],
    // Полный график, если влезает; иначе первое предложение — там суть.
    vacancy.schedule ? [vacancy.schedule, firstSentence(vacancy.schedule)] : [],
  ]);
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

type CityPageMetaSource = {
  city: string;
  cityIn: string | null;
  total: number;
  professions: { title: string }[];
  to: number | null;
  projects: string[];
};

/**
 * Заголовок городской страницы (п. 12).
 *
 * Профессии называем те, что в городе действительно есть: «работа курьером
 * и сборщиком заказов» в городе, где сборщика нет, — обещание, которого мы
 * не выполним, и посетитель уйдёт с первой же строки.
 */
export function buildCityPageTitle(page: CityPageMetaSource) {
  const where = page.cityIn ? `в ${page.cityIn}` : `— ${page.city}`;
  const count = formatVacancies(page.total);
  const work = describeCityWork(page.professions);

  // От самого содержательного к тому, что заведомо поместится: у длинных
  // названий вроде Санкт-Петербурга полная формула выходит за 60 знаков.
  const variants = [
    `Работа ${work} ${where} — ${count}`,
    `Работа ${work} ${where}`,
    `Работа ${where} — ${count}`,
    `Работа ${where}`,
  ];

  return variants.find((variant) => variant.length <= TITLE_LIMIT) ?? variants[3];
}

export function buildCityPageDescription(page: CityPageMetaSource) {
  const where = page.cityIn ? `в ${page.cityIn}` : `— ${page.city}`;
  const professions = page.professions
    .map((profession) => profession.title.toLocaleLowerCase("ru-RU"))
    .join(", ");

  // Тот же разбор, что и у карточки: призыв уступил место фактам. Раньше
  // он вдобавок обрезался на полуслове — «Оставьте телефон —…».
  return fillWithin(DESCRIPTION_LIMIT, [
    [`${capitalize(formatVacancies(page.total))} ${where}: ${professions}.`],
    [
      page.to !== null
        ? `До ${new Intl.NumberFormat("ru-RU").format(page.to)} ₽ за смену, выплаты каждую неделю.`
        : "Выплаты каждую неделю.",
    ],
    page.projects.length
      ? [`Работодатели — ${joinList(page.projects)}.`]
      : [],
  ]);
}

/** «курьером», «сборщиком заказов» или обоими — по составу города. */
export function describeCityWork(professions: { title: string }[]) {
  const hasCourier = professions.some((item) => /курьер/i.test(item.title));
  const hasPicker = professions.some((item) => /сборщик/i.test(item.title));

  if (hasCourier && hasPicker) {
    return "курьером и сборщиком заказов";
  }

  return hasPicker ? "сборщиком заказов" : "курьером";
}

/**
 * Собирает строку из частей, добавляя каждую только если она помещается.
 * У части может быть запасной, более короткий вариант — берём первый
 * подходящий. Обрезать по лимиту нельзя: сниппет, оборванный на полуслове,
 * хуже короткого.
 */
function fillWithin(limit: number, parts: string[][]) {
  let result = "";

  for (const variants of parts) {
    for (const variant of variants) {
      const candidate = result ? `${result} ${variant}` : variant;

      if (candidate.length <= limit) {
        result = candidate;
        break;
      }
    }
  }

  return result;
}

/**
 * «Опыт не нужен» — только там, где это написано в самой вакансии: верно
 * для 159 из 169, и как общее обещание было бы неправдой.
 */
function hasNoExperience(requirements: string | null | undefined) {
  return /опыт не тр|без опыта|обучим/i.test(requirements ?? "");
}

function firstSentence(value: string) {
  const [sentence] = value.split(/(?<=\.)\s/);

  return sentence ?? value;
}

/** «Магнит, Самокат и Лента» — перечисление до конца читается машинным. */
function joinList(values: string[]) {
  if (values.length < 2) {
    return values[0] ?? "";
  }

  return `${values.slice(0, -1).join(", ")} и ${values.at(-1)}`;
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

export function formatVacancies(count: number) {
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
