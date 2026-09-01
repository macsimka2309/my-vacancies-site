import Link from "next/link";
import { formatProject } from "@/lib/project";
import { formatHourlyRate } from "@/lib/salary";

/**
 * Ровно те поля, которые карточка читает. Раньше стоял полный тип витрины,
 * и из-за него городская страница не могла показать карточку: её вакансии
 * несут меньше полей, хотя всё нужное у них есть.
 */
export type VacancyCardItem = {
  id: string;
  slug: string;
  title: string;
  project: string;
  city: string;
  workFormat: string;
  schedule: string | null;
  salary: string | null;
  /** Ставка за час — не зависит от длины смены, в отличие от «за смену». */
  salaryHour?: number | null;
};
import { InlineApplyForm } from "./InlineApplyForm";
import { ContactButtons } from "./ContactButtons";

type VacancyCardProps = {
  vacancy: VacancyCardItem;
};

export function VacancyCard({ vacancy }: VacancyCardProps) {
  const hourly = formatHourlyRate(vacancy.salaryHour);

  return (
    <article className="vacancy-card">
      <div className="vacancy-card__body">
        <p className="eyebrow">{formatProject(vacancy.project)}</p>
        <h2>
          {vacancy.title} — {vacancy.city}
        </h2>
        {vacancy.salary ? (
          <p className="vacancy-salary">{vacancy.salary}</p>
        ) : null}
        {/* Час впереди смены: смены идут от 4 до 16 часов, и сумма «за смену»
            сама по себе несравнима — час сравним всегда. */}
        {hourly ? <p className="vacancy-rate">{hourly}</p> : null}
        {/* «Подробнее» стоит в одном ряду с форматом и графиком: это такая
            же справочная информация о вакансии, а не действие наравне
            с откликом. */}
        <div className="vacancy-card__facts">
          <dl className="vacancy-meta" aria-label="Краткая информация о вакансии">
            <div>
              <dt>Формат</dt>
              <dd>{vacancy.workFormat}</dd>
            </div>
            {vacancy.schedule ? (
              <div>
                <dt>График</dt>
                <dd>{vacancy.schedule}</dd>
              </div>
            ) : null}
          </dl>
          <Link className="vacancy-card__more" href={`/vacancies/${vacancy.slug}`}>
            Подробнее
          </Link>
        </div>
      </div>
      <div className="vacancy-card__actions">
        <InlineApplyForm
          vacancy={{
            id: vacancy.id,
            title: vacancy.title,
            project: vacancy.project,
            city: vacancy.city,
          }}
        />
        <ContactButtons
          variant="compact"
          vacancy={{ title: vacancy.title, city: vacancy.city }}
        />
      </div>
    </article>
  );
}
