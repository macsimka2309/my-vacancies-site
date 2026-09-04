import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { TrustBlocks } from "@/components/site/TrustBlocks";
import { WelcomeScreen } from "@/components/site/WelcomeScreen";
import { CityGate } from "@/components/vacancies/CityGate";
import { VacancyFiltersPanel } from "@/components/vacancies/VacancyFilters";
import { VacancyList } from "@/components/vacancies/VacancyList";
import { getCityIn } from "@/lib/cities";
import { joinProjects } from "@/lib/city-context";
import { isColdLanding } from "@/lib/cold-landing";
import { money } from "@/lib/city-page";
import {
  buildCatalogDescription,
  buildCatalogTitle,
  describeCityWork,
  formatVacancies,
} from "@/lib/meta";
import { site } from "@/lib/site";
import {
  buildOrganizationJsonLd,
  buildVacancyListJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/site-jsonld";
import {
  getActiveVacancies,
  summarizeVacancies,
  getVacancyFilterOptions,
  type VacancyFilters,
} from "@/lib/vacancies";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: HomePageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const filterOptions = await getVacancyFilterOptions();
  const filters = withKnownCities(
    getFiltersFromSearchParams(params),
    filterOptions.cities,
  );
  const vacancies = await getActiveVacancies(filters);
  const catalog = {
    cities: filters.cities ?? [],
    cityCount: filterOptions.cities.length,
    vacancyCount: vacancies.length,
  };

  return {
    // absolute — заголовок сам называет бренд там, где это уместно;
    // шаблон «— Работа Рядом» съедал бы знаки у ключевых слов.
    title: { absolute: buildCatalogTitle(catalog) },
    description: buildCatalogDescription(catalog),
    // Все комбинации фильтров (?city=…&title=…) склеиваем к главной,
    // иначе поисковик увидит сотни почти одинаковых страниц.
    alternates: { canonical: "/" },
  };
}

// Пока город не выбран, показываем короткую витрину: рендерить весь каталог
// сразу — это мегабайт разметки и десятки экранов прокрутки на мобиле.
const PREVIEW_LIMIT = 8;

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = getFiltersFromSearchParams(params);
  const showAll = getSingleParam(params.all) === "1";
  // Приветственный экран (п. 59) — только холодному заходу: без города,
  // фильтра и рекламной метки. У остального трафика уже есть намерение,
  // которое эта секция не должна задерживать (см. lib/cold-landing.ts,
  // почему гейт перед каталогом для него отклонён — п. 6).
  const coldLanding = isColdLanding(params);

  return (
    <VacancyHome coldLanding={coldLanding} filters={filters} showAll={showAll} />
  );
}

async function VacancyHome({
  coldLanding,
  filters: rawFilters,
  showAll,
}: {
  coldLanding: boolean;
  filters: VacancyFilters;
  showAll: boolean;
}) {
  const filterOptions = await getVacancyFilterOptions();
  // Город приходит из рекламы ({region_name} в Директе) и может не совпасть
  // со справочником — тогда игнорируем его и показываем выбор города.
  const filters = withKnownCities(rawFilters, filterOptions.cities);
  const vacancies = await getActiveVacancies(filters);
  const selectedCities = filters.cities ?? [];
  // Сокращаем витрину только когда фильтров нет вовсе: если человек выбрал
  // город или профессию, он ждёт полный список по своему запросу.
  const hasFilters = Boolean(
    selectedCities.length || filters.titles?.length || filters.projects?.length,
  );
  const cityIn =
    selectedCities.length === 1 ? getCityIn(selectedCities[0]) : null;
  // Оффер описывает то, что человек увидит под ним, а не весь каталог.
  const summary = summarizeVacancies(vacancies);
  const isTrimmed = !hasFilters && !showAll && vacancies.length > PREVIEW_LIMIT;
  const visibleVacancies = isTrimmed
    ? vacancies.slice(0, PREVIEW_LIMIT)
    : vacancies;

  return (
    <>
      <SiteHeader />
      <main className="page-shell">
        {/* Кто мы и что за список показываем — до этого витрина не сообщала
            поисковику ни организации, ни того, что это перечень вакансий. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              buildOrganizationJsonLd(),
              buildWebSiteJsonLd(),
              buildVacancyListJsonLd(visibleVacancies),
            ]),
          }}
        />
        {/* Приветственный экран — только холодному заходу, перед оффером,
            не вместо него. Якорь оффера ниже (id="vacancies") — на него
            ведёт ссылка-подсказка внутри экрана. */}
        {coldLanding ? (
          <WelcomeScreen projects={filterOptions.projects} />
        ) : null}
        {/* Оффер, а не вопрос (п. 6). Сюда приходит весь платный трафик —
            400 визитов за четыре дня, все на «/», среднее время 25 секунд.
            Заголовком было одно слово «Вакансии», а первое, что видел
            человек после клика по объявлению «до 8 000 ₽ за смену», —
            вопрос «В каком городе ищете работу?». Все цифры ниже считаются
            из каталога: выдуманного в оффере нет ничего. */}
        <section className="page-header" id="vacancies">
          {/* Холодному заходу эйбрау, H1 и подпись с цифрами визуально не
              нужны — то же самое (партнёры, условия) человек уже прочитал
              в блоках доверия несколькими секундами раньше (замечание
              владельца 04.09). Но не display:none/visibility:hidden: они
              убирают элемент и из дерева доступности, и robots увидели бы
              страницу без единственного H1 и без описательного текста,
              с которым построен title/description. .visually-hidden прячет
              только от глаз — текст остаётся в DOM для SEO и скринридеров. */}
          <div className={coldLanding ? "visually-hidden" : undefined}>
            <p className="eyebrow">{site.tagline}</p>
            <h1>
              Работа {describeCityWork(summary.professions)}
              {cityIn ? ` в ${cityIn}` : ""}
            </h1>
            <p className="muted">
              {formatVacancies(summary.count)}
              {selectedCities.length ? "" : ` в ${summary.cities} городах России`}.{" "}
              {summary.shiftLow !== null && summary.shiftHigh !== null
                ? `Смена — от ${money(summary.shiftLow)} до ${money(summary.shiftHigh)} ₽${
                    selectedCities.length
                      ? " в зависимости от транспорта и числа часов."
                      : " в зависимости от города, транспорта и числа часов."
                  }`
                : ""}
            </p>
          </div>
          {/* Три факта, верные для всего каталога — проверено запросом:
              еженедельные выплаты и возраст от 18 указаны у всех 169 вакансий.
              «Опыт не нужен» сюда не попал: он верен для 159 из 169, и как
              обещание на первом экране это было бы неправдой.

              Холодному заходу эти же три факта уже показаны в блоках
              доверия выше (выплаты — в таймлайне, возраст — в чек-листе,
              партнёры — в «кто мы»); повторять их здесь — то самое
              дублирование, на которое указал владелец 04.09. Тёплому и
              городскому трафику, которые welcome-экран не видят, плашки
              нужны — это первое, что они видят на странице. */}
          {coldLanding ? null : (
            <ul className="offer-facts">
              <li>Выплаты каждую неделю</li>
              <li>От 18 лет</li>
              <li>{joinProjects(summary.projects)}</li>
            </ul>
          )}
        </section>
        {selectedCities.length ? null : (
          <CityGate cityCounts={filterOptions.cityCounts} />
        )}
        <section className="vacancy-layout">
          <VacancyFiltersPanel
            options={filterOptions}
            resultCount={vacancies.length}
            selectedFilters={filters}
          />
          <div className="vacancy-results">
            <VacancyList vacancies={visibleVacancies} />
            {isTrimmed ? (
              <a className="show-all-link" href="/?all=1">
                Показать все {vacancies.length} вакансий
              </a>
            ) : null}
          </div>
        </section>
        {/* Тёплому заходу — тот же блок доверия, но ниже списка, а не
            выше: список вакансий уже главное действие первого экрана
            (п. 6), и приветственный экран для этого трафика не показан
            (см. coldLanding выше), поэтому дублировать блок незачем,
            только показать его один раз в другом месте. */}
        {coldLanding ? null : (
          <TrustBlocks projects={filterOptions.projects} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

// Сопоставляет города из ссылки со справочником: без учёта регистра и ё/е.
// Неизвестные значения отбрасываем — иначе посетитель из рекламы увидел бы
// пустую страницу вместо списка вакансий.
function withKnownCities(
  filters: VacancyFilters,
  knownCities: string[],
): VacancyFilters {
  if (!filters.cities?.length) {
    return filters;
  }

  const canonicalByKey = new Map(
    knownCities.map((city) => [normalizeCityKey(city), city]),
  );
  const matched = filters.cities
    .map((city) => canonicalByKey.get(normalizeCityKey(city)))
    .filter((city): city is string => Boolean(city));

  return {
    ...filters,
    cities: matched.length ? [...new Set(matched)] : undefined,
  };
}

function normalizeCityKey(city: string) {
  return city.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function getFiltersFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): VacancyFilters {
  return {
    titles: getMultiParam(params.title),
    projects: getMultiParam(params.project),
    cities: getMultiParam(params.city),
    salaryBasis: getSalaryBasisParam(params.salaryBasis),
    salaryFrom: getNumberParam(params.salaryFrom),
  };
}

function getSalaryBasisParam(value: string | string[] | undefined) {
  const param = getSingleParam(value);

  if (param === "shift" || param === "period") {
    return param;
  }

  // Пока фильтр «за период» считал только вахту, ссылки писались как
  // salaryBasis=vahta — сохранённые и расшаренные ссылки должны работать.
  return param === "vahta" ? "period" : undefined;
}

function getMultiParam(value: string | string[] | undefined) {
  const values = (Array.isArray(value) ? value : [value])
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item));

  return values.length ? [...new Set(values)] : undefined;
}

function getSingleParam(value: string | string[] | undefined) {
  const param = Array.isArray(value) ? value[0] : value;
  const trimmedParam = param?.trim();

  return trimmedParam || undefined;
}

function getNumberParam(value: string | string[] | undefined) {
  const param = getSingleParam(value);
  const numberParam = param ? Number(param) : 0;

  return Number.isFinite(numberParam) && numberParam > 0
    ? numberParam
    : undefined;
}
