import { getCitySlug, getRegionByCity } from "./cities";

/**
 * Городской контекст карточки вакансии (п. 35).
 *
 * Замер 24.08: на 169 вакансий приходится 15 уникальных текстов, один и тот
 * же стоит на 69 карточках в 63 городах. Исходный план — писать под каждую
 * точку свой текст — не работает: данных по точкам нет и не будет
 * (`address` заполнен у 10 вакансий из 169, поле «чем отличается» — у одной).
 *
 * Поэтому уникальность берём из того, что уже есть в базе и **действительно**
 * различается по городам: состав вакансий, проекты и ставки. Разброс потолка
 * смены между городами по одной профессии — 2,3–2,9 раза, это не оформление,
 * а факт.
 *
 * Честная граница: пятнадцать шаблонных текстов остаются пятнадцатью
 * шаблонными текстами. Меняется то, что у 136 карточек из 169 появляется
 * собственный, невыдуманный блок. У 33 городов с единственной вакансией
 * сравнивать не с чем — им достаётся только соседство по региону.
 */
export type CityContextVacancy = {
  /** Нужен форме отклика: без него карточку на городской странице не собрать. */
  id: string;
  slug: string;
  title: string;
  project: string;
  city: string;
  workFormat: string;
  schedule: string | null;
  salary: string | null;
  /** Нижняя граница есть редко — у 40 вакансий из 169. */
  salaryShiftMin: number | null;
  salaryShiftMax: number | null;
};

export type CityContext = {
  city: string;
  region: string | null;
  /** Всего вакансий в городе, включая текущую. */
  total: number;
  /** Проекты города — в порядке убывания числа вакансий. */
  projects: string[];
  /** Остальные вакансии города, самые высокие ставки сверху. */
  peers: CityContextVacancy[];
  /**
   * Вариант без своего транспорта — если текущая вакансия его требует.
   * Человека без велосипеда иначе просто теряем: он уходит со страницы,
   * хотя работа для него в этом же городе есть.
   */
  noTransportPeer: CityContextVacancy | null;
  /** Города того же региона, где тоже есть вакансии, — со своими страницами. */
  regionCities: { city: string; slug: string; count: number }[];
};

/** Сколько соседей по региону показываем: список, а не каталог. */
const REGION_CITIES_LIMIT = 4;

// Заявляем только то, что прямо следует из названия. Электровелосипед на
// части проектов выдают в аренду, поэтому про него не утверждаем ничего.
// «Большой багажник» — это «Курьер (большой багажник)» (п. 9: жаргон
// таблицы «Ларгус» из названия убран, здесь заменяем ту же метку).
const NEEDS_OWN_TRANSPORT = /на авто|на велосипеде|на мото|большой багажник/i;
// Сборщик работает внутри магазина — это видно из самих обязанностей.
const NEEDS_NO_TRANSPORT = /^сборщик заказов$/i;

export function buildCityContext(
  current: CityContextVacancy,
  all: CityContextVacancy[],
): CityContext {
  const inCity = all.filter((vacancy) => vacancy.city === current.city);
  const peers = inCity
    .filter((vacancy) => vacancy.slug !== current.slug)
    .sort(byCeilingDesc);

  return {
    city: current.city,
    region: getRegionByCity(current.city),
    total: inCity.length,
    projects: sortedProjects(inCity),
    peers,
    noTransportPeer: NEEDS_OWN_TRANSPORT.test(current.title)
      ? (peers.find((vacancy) => NEEDS_NO_TRANSPORT.test(vacancy.title)) ??
        null)
      : null,
    regionCities: buildRegionCities(current, all),
  };
}

function buildRegionCities(
  current: CityContextVacancy,
  all: CityContextVacancy[],
) {
  const region = getRegionByCity(current.city);

  if (!region) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const vacancy of all) {
    if (
      vacancy.city === current.city ||
      getRegionByCity(vacancy.city) !== region
    ) {
      continue;
    }

    counts.set(vacancy.city, (counts.get(vacancy.city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([city, count]) => ({ city, slug: getCitySlug(city), count }))
    // Без слага ссылку строить некуда: город вне справочника не имеет
    // собственной страницы, а вести на канонизированный `?city=` бессмысленно.
    .filter(
      (item): item is { city: string; slug: string; count: number } =>
        item.slug !== null,
    )
    .sort(
      (left, right) =>
        right.count - left.count || left.city.localeCompare(right.city, "ru"),
    )
    .slice(0, REGION_CITIES_LIMIT);
}

function sortedProjects(vacancies: CityContextVacancy[]) {
  const counts = new Map<string, number>();

  for (const vacancy of vacancies) {
    counts.set(vacancy.project, (counts.get(vacancy.project) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1] || left[0].localeCompare(right[0], "ru"),
    )
    .map(([project]) => project);
}

// Вакансии без разобранной ставки уходят вниз: показывать их первыми —
// значит прятать то, ради чего человек и открыл список.
function byCeilingDesc(left: CityContextVacancy, right: CityContextVacancy) {
  const leftCeiling = left.salaryShiftMax ?? -1;
  const rightCeiling = right.salaryShiftMax ?? -1;

  return (
    rightCeiling - leftCeiling || left.title.localeCompare(right.title, "ru")
  );
}

/**
 * Список через запятую с «и» перед последним: «Лента, Магнит и Самокат».
 * Перечисление через запятую до конца читается как машинный вывод.
 */
export function joinProjects(projects: string[]) {
  if (projects.length < 2) {
    return projects[0] ?? "";
  }

  return `${projects.slice(0, -1).join(", ")} и ${projects.at(-1)}`;
}
