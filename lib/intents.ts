/**
 * Лендинги под интенты (п. 13).
 *
 * Люди ищут не «вакансии», а «работа вахтой», «работа без опыта», «курьером
 * на своём авто». В каталоге эти срезы есть, но собственного адреса у них не
 * было — запрос уходил конкурентам.
 *
 * Важно: это не размножение страниц по шаблону (п. 35). Четыре страницы,
 * у каждой свой текст и свои факты, и все факты берутся из самих вакансий —
 * ничего не выдумано. Цифры в тексте считаются из каталога на лету, поэтому
 * не расходятся с тем, что человек видит в списке ниже.
 */
export const INTENT_SLUGS = [
  "vahta",
  "bez-opyta",
  "rabota-na-svoem-avto",
  "ezhednevnye-vyplaty",
] as const;

export type IntentSlug = (typeof INTENT_SLUGS)[number];

/** Как отбирать вакансии — разбирается в lib/vacancies.ts. */
export type IntentMatch =
  | "vahta"
  | "noExperience"
  | "ownCar"
  | "dailyPayout";

export type IntentStats = {
  count: number;
  total: number;
  cities: number;
  shiftLow: number | null;
  shiftHigh: number | null;
  periodLow: number | null;
  periodHigh: number | null;
};

export type IntentFaq = {
  question: string;
  answer: string;
};

export type Intent = {
  slug: IntentSlug;
  match: IntentMatch;
  h1: string;
  title: string;
  description: string;
  /** Прямой ответ первым абзацем — его же цитирует поиск и ассистенты. */
  lead: (stats: IntentStats) => string;
  faq: (stats: IntentStats) => IntentFaq[];
  /** Что показать, если по срезу вдруг не осталось вакансий. */
  emptyText: string;
};

export function getIntent(slug: string): Intent | null {
  return INTENTS.find((intent) => intent.slug === slug) ?? null;
}

const INTENTS: Intent[] = [
  {
    slug: "vahta",
    match: "vahta",
    h1: "Работа вахтой курьером",
    title: "Работа вахтой курьером — проживание за счёт компании",
    description:
      "Вахта курьером с бесплатным проживанием и компенсацией проезда. Выплаты еженедельно, авансы по средам. Опыт не нужен, оформим медкнижку.",
    lead: (stats) =>
      `Вахта — это работа сменами в другом городе, где компания берёт на себя жильё и дорогу. ` +
      `${vacancyCount(stats.count)} в ${cityCount(stats.cities)}` +
      `${formatShift(stats)}${formatPeriod(stats)}.`,
    faq: () => [
      {
        question: "Что оплачивает компания?",
        answer:
          "Проживание в хостеле, аренду электровелосипеда при выработке от 72 часов в неделю, проезд до вахты — до 5 000 ₽ — и промокод на продукты 1 800 ₽ в неделю при выработке от 60 часов.",
      },
      {
        question: "Сколько платят и когда?",
        answer:
          "117 ₽ в час плюс доплаты за вес заказа, погоду, вечерние и утренние часы и работу в выходные. Выплаты еженедельные, авансы по средам.",
      },
      {
        question: "Сколько часов в неделю?",
        answer:
          "Слоты гарантированные, от 72 часов в неделю. Радиус работы — до 3 км.",
      },
      {
        question: "Какие нужны документы?",
        answer:
          "Гражданам РФ: паспорт, ИНН, СНИЛС и медицинская книжка — если её нет, поможем оформить. Гражданам СНГ дополнительно: регистрация, миграционная карта, патент или РВП либо ВНЖ и перевод паспорта.",
      },
      {
        question: "Есть ли ограничения по возрасту?",
        answer: "На вахтовых вакансиях — от 18 до 50 лет.",
      },
    ],
    emptyText: "Сейчас вахтовых вакансий нет — посмотрите остальные.",
  },
  {
    slug: "bez-opyta",
    match: "noExperience",
    h1: "Работа без опыта",
    title: "Работа без опыта — обучение на месте",
    description:
      "Вакансии курьера и сборщика заказов, где опыт не требуется: учат на месте. Возраст от 18 лет, выплаты каждую неделю.",
    lead: (stats) =>
      `Опыт не нужен: ${vacancyCount(stats.count)} из ${stats.total} прямо указывают, что научат на месте. ` +
      `Нужны возраст от 18 лет, смартфон и документы${formatShift(stats)}.`,
    faq: (stats) => [
      {
        question: "Правда берут совсем без опыта?",
        answer: `Да. ${capitalize(vacancyCount(stats.count))} из ${stats.total} в каталоге прямо указывают, что опыт не требуется — обучение проходит на месте.`,
      },
      {
        question: "Что нужно, кроме желания работать?",
        answer:
          "Возраст от 18 лет, смартфон и документы. На части вакансий дополнительно нужен свой транспорт: велосипед, электровелосипед или автомобиль с правами категории B.",
      },
      {
        question: "Нужна ли медицинская книжка?",
        answer:
          "На части вакансий нужна. В таких случаях с её оформлением помогают — приходить с готовой книжкой не обязательно.",
      },
      {
        question: "Как часто платят?",
        answer:
          "Выплаты еженедельные. На части вакансий новичкам доступны ежедневные — уточните это при звонке.",
      },
    ],
    emptyText: "Сейчас таких вакансий нет — посмотрите остальные.",
  },
  {
    slug: "rabota-na-svoem-avto",
    match: "ownCar",
    h1: "Работа курьером на своём авто",
    title: "Работа курьером на своём авто — доплаты за пробег",
    description:
      "Вакансии курьера с личным автомобилем: права категории B, опыт не нужен. Доплаты за перепробег и вес, возмещение налога самозанятым.",
    lead: (stats) =>
      `Нужны права категории B и личный автомобиль — опыт работы курьером не требуется. ` +
      `${vacancyCount(stats.count)} в ${cityCount(stats.cities)}${formatShift(stats)}.`,
    faq: () => [
      {
        question: "Какие требования к автомобилю?",
        answer:
          "Права категории B и личный автомобиль. На части вакансий нужен большой багажник — например, универсал вроде Лады Ларгус.",
      },
      {
        question: "Компенсируют ли расходы на машину?",
        answer:
          "Оплата складывается из часов и заказов, к ней идут доплаты за перепробег и за вес заказа.",
      },
      {
        question: "Как оформляют и что с налогами?",
        answer:
          "Для самозанятых предусмотрено возмещение налога. Точный порядок оформления зависит от проекта — расскажем при звонке.",
      },
      {
        question: "Что ещё понадобится?",
        answer:
          "Смартфон на Android и навигатор — 2ГИС или Яндекс Карты.",
      },
    ],
    emptyText:
      "Сейчас вакансий с личным автомобилем нет — посмотрите остальные.",
  },
  {
    slug: "ezhednevnye-vyplaty",
    match: "dailyPayout",
    h1: "Работа с ежедневными выплатами",
    title: "Работа с ежедневными выплатами для новичков",
    description:
      "Вакансии, где новичкам доступны ежедневные выплаты. Базовый режим — еженедельный. Опыт не нужен, возраст от 18 лет.",
    lead: (stats) =>
      `Сразу честно: базовый режим — выплаты раз в неделю. Ежедневные доступны новичкам, ` +
      `и таких вакансий ${stats.count} из ${stats.total}${formatShift(stats)}. ` +
      `Условия по конкретной вакансии подтвердим при звонке.`,
    faq: (stats) => [
      {
        question: "Всем ли платят каждый день?",
        answer: `Нет. Базовый режим — еженедельные выплаты. Ежедневные возможны для новичков, и об этом сказано в ${stats.count} вакансиях из ${stats.total}.`,
      },
      {
        question: "Нужна ли самозанятость?",
        answer:
          "На части вакансий да. Там, где она нужна, налог возмещают.",
      },
      {
        question: "Нужен ли опыт?",
        answer:
          "Нет. Практически везде в каталоге опыт не требуется — обучают на месте.",
      },
    ],
    emptyText:
      "Сейчас вакансий с ежедневными выплатами нет — посмотрите остальные.",
  },
];

function vacancyCount(count: number) {
  const words: Record<string, string> = {
    one: "вакансия",
    few: "вакансии",
    many: "вакансий",
    other: "вакансии",
  };

  return `${count} ${words[new Intl.PluralRules("ru-RU").select(count)] ?? words.other}`;
}

function cityCount(count: number) {
  const words: Record<string, string> = {
    one: "городе",
    few: "городах",
    many: "городах",
    other: "городах",
  };

  return `${count} ${words[new Intl.PluralRules("ru-RU").select(count)] ?? words.other}`;
}

// Диапазон, а не максимум: «доход до 11 000 ₽» — это верх самой щедрой
// вакансии набора, и читается он как обещание, которого никто не давал.
function formatShift(stats: IntentStats) {
  return formatRange(stats.shiftLow, stats.shiftHigh, ", доход", "за смену");
}

function formatPeriod(stats: IntentStats) {
  return formatRange(stats.periodLow, stats.periodHigh, " и", "за вахту");
}

function formatRange(
  low: number | null,
  high: number | null,
  prefix: string,
  suffix: string,
) {
  if (low === null || high === null) {
    return "";
  }

  return low === high
    ? `${prefix} ${format(low)} ₽ ${suffix}`
    : `${prefix} от ${format(low)} до ${format(high)} ₽ ${suffix}`;
}

function format(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("ru-RU") + value.slice(1);
}
