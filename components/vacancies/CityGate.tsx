"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { reachGoal } from "@/lib/metrika";

/**
 * Шесть, а не двенадцать (п. 6). Замер на 390px: блок выбора города занимал
 * 593 пикселя из 844, из них 356 — список городов. Первая карточка вакансии
 * начиналась на 993px, то есть на 149px ниже экрана: человек за свои
 * средние 25 секунд не видел ни одной вакансии. Кому нужен другой город —
 * есть поиск и полный список в фильтрах.
 */
const TOP_CITIES_LIMIT = 6;

type CityGateProps = {
  cityCounts: Array<{ city: string; count: number }>;
  /**
   * Слаг страницы интента (п. 14), если гейт встроен туда, а не в общую
   * витрину — тогда выбор города сужает уже применённый фильтр «как хотите
   * работать», а не сбрасывает его.
   */
  intentSlug?: string;
};

// Быстрый выбор города для посетителя, пришедшего на общий список. Это
// инструмент сужения, а не пропускной пункт: оффер и вакансии человек видит
// независимо от того, выбрал он город или нет.
export function CityGate({ cityCounts, intentSlug }: CityGateProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) {
      return cityCounts.slice(0, TOP_CITIES_LIMIT);
    }

    return cityCounts
      .filter((item) => item.city.toLowerCase().includes(query))
      .slice(0, TOP_CITIES_LIMIT);
  }, [cityCounts, query]);

  function selectCity(city: string) {
    reachGoal("city_select", { city, intent: intentSlug ?? "" });
    // Здесь прокрутка вверх нужна, в отличие от фильтров: человек мог уйти
    // вниз, разыскивая свой город в списке, и после выбора остался бы
    // где-то посреди результатов. Наверху его встретит заголовок с городом
    // и сразу под ним — вакансии.
    const href = intentSlug
      ? `/${intentSlug}?city=${encodeURIComponent(city)}`
      : `/?city=${encodeURIComponent(city)}`;
    router.push(href);
  }

  return (
    <section className="city-gate" aria-labelledby="city-gate-title">
      {/* Не вопрос, а подпись: вопросом это было первым, что видел человек
          после клика по объявлению, — вместо оффера. */}
      <h2 id="city-gate-title">Ваш город</h2>
      <input
        className="city-gate__search"
        type="search"
        inputMode="search"
        placeholder="Начните вводить город…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Поиск города"
      />
      {matches.length > 0 ? (
        <ul className="city-gate__list">
          {matches.map((item) => (
            <li key={item.city}>
              <button
                type="button"
                className="city-gate__city"
                onClick={() => selectCity(item.city)}
              >
                <span className="city-gate__name">{item.city}</span>
                <span className="city-gate__count">{item.count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="city-gate__empty">
          В этом городе вакансий пока нет. Попробуйте соседний или посмотрите
          все ниже.
        </p>
      )}
    </section>
  );
}
