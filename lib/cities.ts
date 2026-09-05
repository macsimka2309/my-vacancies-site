/**
 * Справочник городов каталога: регион и предложный падеж.
 *
 * Регион нужен микроразметке (`addressRegion`): в базе у вакансии есть только
 * город, а заметная часть запросов идёт по области.
 *
 * Падеж нужен заголовкам. «Курьер в Белгороде» — это то, как человек ищет
 * и читает; «Курьер — Белгород» выглядит выгрузкой из базы.
 *
 * Справочник намеренно покрывает только города каталога. Незнакомый город —
 * это `null`, а не догадка: неверный регион увёл бы вакансию не в ту выдачу,
 * а неверный падеж читается как неряшливость.
 */
type CityInfo = {
  /** Субъект федерации. */
  region: string;
  /** Предложный падеж: «в <…>». Несклоняемые названия совпадают с обычным. */
  in: string;
  /**
   * Адрес городской страницы `/rabota/<slug>` (п. 12).
   *
   * Слаги не придуманы заново, а взяты из слагов вакансий: там та же
   * транслитерация уже была, и расхождение развело бы `/rabota/sankt-peterburg`
   * с `/vacancies/sborshchik-lenta-sankt-peterburg` на ровном месте.
   */
  slug: string;
};

const CITIES: Record<string, CityInfo> = {
  "альметьевск": {
    region: "Республика Татарстан",
    in: "Альметьевске",
    slug: "almetevsk",
  },
  "анапа": { region: "Краснодарский край", in: "Анапе", slug: "anapa" },
  "астрахань": {
    region: "Астраханская область",
    in: "Астрахани",
    slug: "astrahan",
  },
  "балаково": {
    region: "Саратовская область",
    in: "Балакове",
    slug: "balakovo",
  },
  "белгород": {
    region: "Белгородская область",
    in: "Белгороде",
    slug: "belgorod",
  },
  "братск": { region: "Иркутская область", in: "Братске", slug: "bratsk" },
  "великий новгород": {
    region: "Новгородская область",
    in: "Великом Новгороде",
    slug: "velikiy-novgorod",
  },
  "волгоград": {
    region: "Волгоградская область",
    in: "Волгограде",
    slug: "volgograd",
  },
  "волжский": {
    region: "Волгоградская область",
    in: "Волжском",
    slug: "volzhskiy",
  },
  "вологда": { region: "Вологодская область", in: "Вологде", slug: "vologda" },
  "воронеж": {
    region: "Воронежская область",
    in: "Воронеже",
    slug: "voronezh",
  },
  "димитровград": {
    region: "Ульяновская область",
    in: "Димитровграде",
    slug: "dimitrovgrad",
  },
  "екатеринбург": {
    region: "Свердловская область",
    in: "Екатеринбурге",
    slug: "ekaterinburg",
  },
  "железноводск": {
    region: "Ставропольский край",
    in: "Железноводске",
    slug: "zheleznovodsk",
  },
  "иваново": { region: "Ивановская область", in: "Иванове", slug: "ivanovo" },
  "ижевск": { region: "Удмуртская Республика", in: "Ижевске", slug: "izhevsk" },
  "иркутск": { region: "Иркутская область", in: "Иркутске", slug: "irkutsk" },
  "казань": { region: "Республика Татарстан", in: "Казани", slug: "kazan" },
  "калуга": { region: "Калужская область", in: "Калуге", slug: "kaluga" },
  "каменск-уральский": {
    region: "Свердловская область",
    in: "Каменске-Уральском",
    slug: "kamensk-uralskiy",
  },
  "кемерово": {
    region: "Кемеровская область",
    in: "Кемерове",
    slug: "kemerovo",
  },
  "кострома": {
    region: "Костромская область",
    in: "Костроме",
    slug: "kostroma",
  },
  "краснодар": {
    region: "Краснодарский край",
    in: "Краснодаре",
    slug: "krasnodar",
  },
  "красноярск": {
    region: "Красноярский край",
    in: "Красноярске",
    slug: "krasnoyarsk",
  },
  "курган": { region: "Курганская область", in: "Кургане", slug: "kurgan" },
  "курск": { region: "Курская область", in: "Курске", slug: "kursk" },
  "липецк": { region: "Липецкая область", in: "Липецке", slug: "lipeck" },
  "магнитогорск": {
    region: "Челябинская область",
    in: "Магнитогорске",
    slug: "magnitogorsk",
  },
  "майкоп": { region: "Республика Адыгея", in: "Майкопе", slug: "maykop" },
  "москва": { region: "Москва", in: "Москве", slug: "moskva" },
  "мурманск": {
    region: "Мурманская область",
    in: "Мурманске",
    slug: "murmansk",
  },
  "набережные челны": {
    region: "Республика Татарстан",
    in: "Набережных Челнах",
    slug: "naberezhnye-chelny",
  },
  "нефтеюганск": {
    region: "Ханты-Мансийский автономный округ — Югра",
    in: "Нефтеюганске",
    slug: "nefteyugansk",
  },
  "нижневартовск": {
    region: "Ханты-Мансийский автономный округ — Югра",
    in: "Нижневартовске",
    slug: "nizhnevartovsk",
  },
  "нижнекамск": {
    region: "Республика Татарстан",
    in: "Нижнекамске",
    slug: "nizhnekamsk",
  },
  "нижний новгород": {
    region: "Нижегородская область",
    in: "Нижнем Новгороде",
    slug: "nizhniy-novgorod",
  },
  "нижний тагил": {
    region: "Свердловская область",
    in: "Нижнем Тагиле",
    slug: "nizhniy-tagil",
  },
  "новокузнецк": {
    region: "Кемеровская область",
    in: "Новокузнецке",
    slug: "novokuzneck",
  },
  "новороссийск": {
    region: "Краснодарский край",
    in: "Новороссийске",
    slug: "novorossiysk",
  },
  "новосибирск": {
    region: "Новосибирская область",
    in: "Новосибирске",
    slug: "novosibirsk",
  },
  "новочеркасск": {
    region: "Ростовская область",
    in: "Новочеркасске",
    slug: "novocherkassk",
  },
  "новошахтинск": {
    region: "Ростовская область",
    in: "Новошахтинске",
    slug: "novoshahtinsk",
  },
  "ногинск": { region: "Московская область", in: "Ногинске", slug: "noginsk" },
  "обнинск": { region: "Калужская область", in: "Обнинске", slug: "obninsk" },
  "омск": { region: "Омская область", in: "Омске", slug: "omsk" },
  "орел": { region: "Орловская область", in: "Орле", slug: "orel" },
  "пенза": { region: "Пензенская область", in: "Пензе", slug: "penza" },
  "пермь": { region: "Пермский край", in: "Перми", slug: "perm" },
  "петрозаводск": {
    region: "Республика Карелия",
    in: "Петрозаводске",
    slug: "petrozavodsk",
  },
  "псков": { region: "Псковская область", in: "Пскове", slug: "pskov" },
  "ростов-на-дону": {
    region: "Ростовская область",
    in: "Ростове-на-Дону",
    slug: "rostov-na-donu",
  },
  "рязань": { region: "Рязанская область", in: "Рязани", slug: "ryazan" },
  "самара": { region: "Самарская область", in: "Самаре", slug: "samara" },
  "санкт-петербург": {
    region: "Санкт-Петербург",
    in: "Санкт-Петербурге",
    slug: "sankt-peterburg",
  },
  "саранск": { region: "Республика Мордовия", in: "Саранске", slug: "saransk" },
  "саратов": { region: "Саратовская область", in: "Саратове", slug: "saratov" },
  "смоленск": {
    region: "Смоленская область",
    in: "Смоленске",
    slug: "smolensk",
  },
  "ставрополь": {
    region: "Ставропольский край",
    in: "Ставрополе",
    slug: "stavropol",
  },
  "стерлитамак": {
    region: "Республика Башкортостан",
    in: "Стерлитамаке",
    slug: "sterlitamak",
  },
  "сургут": {
    region: "Ханты-Мансийский автономный округ — Югра",
    in: "Сургуте",
    slug: "surgut",
  },
  "сыктывкар": {
    region: "Республика Коми",
    in: "Сыктывкаре",
    slug: "syktyvkar",
  },
  "таганрог": {
    region: "Ростовская область",
    in: "Таганроге",
    slug: "taganrog",
  },
  "тамбов": { region: "Тамбовская область", in: "Тамбове", slug: "tambov" },
  "тверь": { region: "Тверская область", in: "Твери", slug: "tver" },
  "тобольск": { region: "Тюменская область", in: "Тобольске", slug: "tobolsk" },
  "тольятти": { region: "Самарская область", in: "Тольятти", slug: "tolyatti" },
  "томск": { region: "Томская область", in: "Томске", slug: "tomsk" },
  "тула": { region: "Тульская область", in: "Туле", slug: "tula" },
  "тюмень": { region: "Тюменская область", in: "Тюмени", slug: "tyumen" },
  "улан-удэ": {
    region: "Республика Бурятия",
    in: "Улан-Удэ",
    slug: "ulan-ude",
  },
  "ульяновск": {
    region: "Ульяновская область",
    in: "Ульяновске",
    slug: "ulyanovsk",
  },
  "ханты-мансийск": {
    region: "Ханты-Мансийский автономный округ — Югра",
    in: "Ханты-Мансийске",
    slug: "hanty-mansiysk",
  },
  "чебоксары": {
    region: "Чувашская Республика",
    in: "Чебоксарах",
    slug: "cheboksary",
  },
  "челябинск": {
    region: "Челябинская область",
    in: "Челябинске",
    slug: "chelyabinsk",
  },
  "черкесск": {
    region: "Карачаево-Черкесская Республика",
    in: "Черкесске",
    slug: "cherkessk",
  },
  "шахты": { region: "Ростовская область", in: "Шахтах", slug: "shahty" },
  "энгельс": { region: "Саратовская область", in: "Энгельсе", slug: "engels" },
  "ярославль": {
    region: "Ярославская область",
    in: "Ярославле",
    slug: "yaroslavl",
  },
};

export function getRegionByCity(city: string | null | undefined) {
  return findCity(city)?.region ?? null;
}

/**
 * Город в предложном падеже — для заголовков «Курьер в Белгороде».
 * Незнакомый город возвращает null, и заголовок собирается без предлога.
 */
export function getCityIn(city: string | null | undefined) {
  return findCity(city)?.in ?? null;
}

/** Слаг городской страницы. Незнакомый город — `null`, ссылки не строим. */
export function getCitySlug(city: string | null | undefined) {
  return findCity(city)?.slug ?? null;
}

/**
 * Обратный поиск: из адреса `/rabota/tver` получить город.
 *
 * Возвращает не название из справочника, а совпавший город **каталога**:
 * ключи здесь нормализованы в нижний регистр, а показывать надо то
 * написание, которое лежит в базе.
 */
export function findCityBySlug(slug: string, catalogCities: string[]) {
  return catalogCities.find((city) => getCitySlug(city) === slug) ?? null;
}

function findCity(city: string | null | undefined) {
  if (!city) {
    return null;
  }

  return CITIES[normalizeCityKey(city)] ?? null;
}

// «Орёл» и «Орел» — один город: в каталоге встречались оба написания.
export function normalizeCityKey(city: string) {
  return city.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

/**
 * Сверяет город из ссылки (`?city=…`) со списком городов, которые реально
 * есть в подборке. Незнакомое или неточно набранное значение — `null`,
 * а не догадка: иначе можно молча показать пустой список вместо каталога.
 */
export function matchKnownCity(
  city: string | null | undefined,
  knownCities: string[],
) {
  if (!city) {
    return null;
  }

  const key = normalizeCityKey(city);

  return knownCities.find((known) => normalizeCityKey(known) === key) ?? null;
}
