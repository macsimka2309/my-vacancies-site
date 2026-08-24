import Link from "next/link";
import { getCityIn } from "@/lib/cities";
import { joinProjects, type CityContext as CityContextData } from "@/lib/city-context";
import { formatVacancies } from "@/lib/meta";

/**
 * Что ещё есть в этом же городе.
 *
 * Две задачи сразу. Для человека — не терять того, кому не подошла именно
 * эта вакансия: у половины городов есть и другой транспорт, и работа
 * без транспорта вовсе. Для поиска — собственный, невыдуманный блок
 * на карточке вместо пятнадцати текстов на 169 страниц (п. 35), плюс
 * связи между вакансиями одного города: с главной их ведёт только восемь.
 */
export function CityContext({ context }: { context: CityContextData }) {
  const hasPeers = context.peers.length > 0;
  const hasRegion = context.regionCities.length > 0;

  // Единственная вакансия в городе, и в регионе больше ничего нет —
  // писать нечего. Пустая рубрика «Ещё в городе» хуже её отсутствия.
  if (!hasPeers && !hasRegion) {
    return null;
  }

  const cityIn = getCityIn(context.city);
  const where = cityIn ? `в ${cityIn}` : `— ${context.city}`;

  return (
    <section
      className="detail-section city-context"
      aria-labelledby="city-context-title"
    >
      <h2 id="city-context-title">
        {hasPeers ? `Ещё ${where}` : `Рядом ${where}`}
      </h2>

      {hasPeers ? (
        <>
          <p className="city-context__lead">
            {/* Двоеточие, а не «от»: названия проектов лежат в базе в
                именительном падеже, и «от Лента и Самокат» — это то, что
                получится, если попытаться пристроить к ним предлог. */}
            {cityIn ? `В ${cityIn}` : `В городе ${context.city}`}{" "}
            {formatVacancies(context.total)}: {joinProjects(context.projects)}.
            {context.noTransportPeer ? (
              <>
                {" "}
                Если своего транспорта нет, посмотрите «
                {context.noTransportPeer.title}»: работа на одной точке,
                внутри магазина.
              </>
            ) : null}
          </p>

          <ul className="city-context__list">
            {context.peers.map((peer) => (
              <li key={peer.slug}>
                <Link href={`/vacancies/${peer.slug}`}>
                  <span className="city-context__position">
                    {peer.title}
                    <span className="city-context__project">
                      {peer.project}
                    </span>
                  </span>
                  {peer.salary ? (
                    <span className="city-context__salary">{peer.salary}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {hasRegion ? (
        <p className="city-context__region">
          {context.region ? `${context.region}, другие города:` : "Рядом:"}{" "}
          {context.regionCities.map((item, index) => (
            <span key={item.city}>
              {index > 0 ? ", " : ""}
              <Link href={`/?city=${encodeURIComponent(item.city)}`}>
                {item.city}
              </Link>{" "}
              <span className="muted">({item.count})</span>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
