import { formatPartValue, parsePiecework } from "@/lib/piecework";

type PieceworkBreakdownProps = {
  tariff: string | null | undefined;
  /** Есть ли у вакансии часовая ставка — от этого зависит объяснение. */
  hasHourlyRate: boolean;
};

/**
 * Роспись сдельной оплаты на детальной странице (п. 9).
 *
 * На карточке списка стоит одно число — цена заказа. Здесь всё остальное:
 * километры, вес, крупногабарит. В списке это шесть строк мелкого текста
 * на каждую вакансию, сквозь которые не видно самой вакансии; на детальной
 * это ровно то, ради чего человек её открыл.
 */
export function PieceworkBreakdown({
  tariff,
  hasHourlyRate,
}: PieceworkBreakdownProps) {
  const parts = parsePiecework(tariff);

  if (!parts.length) {
    return null;
  }

  return (
    <section className="detail-section">
      <h2>Из чего складывается оплата</h2>
      <div className="text-block">
        <p className="text-block__para">
          {hasHourlyRate
            ? "Кроме ставки за час платят за каждое действие в смене:"
            : "Оплата сдельная: фиксированной ставки за час нет, платят за каждое действие в смене."}
        </p>
        <dl className="pay-parts">
          {parts.map((part) => (
            <div key={`${part.key}:${part.label}`} style={{ display: "contents" }}>
              <dt>{part.label}</dt>
              <dd>{formatPartValue(part.value)}</dd>
            </div>
          ))}
        </dl>
        {/* Итог смены зависит от числа заказов, и обещать его мы не можем.
            Сказать об этом прямо честнее, чем промолчать и оставить человека
            умножать самому. */}
        <p className="text-block__para">
          Сколько выйдет за смену, зависит от числа заказов и маршрута.
        </p>
      </div>
    </section>
  );
}
