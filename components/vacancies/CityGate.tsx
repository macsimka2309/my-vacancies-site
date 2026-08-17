"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const TOP_CITIES_LIMIT = 12;

type CityGateProps = {
  cityCounts: Array<{ city: string; count: number }>;
};

// Первый экран для посетителя без выбранного города: реклама ведёт на общий
// список, и человек не находит свой город среди десятков других. Здесь он
// выбирает город в один тап и сразу видит только свои вакансии.
export function CityGate({ cityCounts }: CityGateProps) {
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
    router.push(`/?city=${encodeURIComponent(city)}`, { scroll: false });
  }

  return (
    <section className="city-gate" aria-labelledby="city-gate-title">
      <h2 id="city-gate-title">В каком городе ищете работу?</h2>
      <p className="muted">
        Выберите город — покажем только те вакансии, куда можно выйти рядом с
        домом.
      </p>
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
