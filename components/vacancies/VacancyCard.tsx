import Link from "next/link";
import type { VacancyListItem } from "@/lib/vacancies";
import { ApplyButton } from "./ApplyButton";

type VacancyCardProps = {
  vacancy: VacancyListItem;
};

export function VacancyCard({ vacancy }: VacancyCardProps) {
  return (
    <article className="vacancy-card">
      <div className="vacancy-card__body">
        <p className="eyebrow">{vacancy.project}</p>
        <h2>{vacancy.title}</h2>
        {vacancy.salary ? (
          <p className="vacancy-salary">{vacancy.salary}</p>
        ) : null}
        <dl className="vacancy-meta" aria-label="Краткая информация о вакансии">
          <div>
            <dt>Город</dt>
            <dd>{vacancy.city}</dd>
          </div>
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
      </div>
      <div className="vacancy-card__actions">
        <ApplyButton vacancy={vacancy} />
        <Link className="secondary-link" href={`/vacancies/${vacancy.slug}`}>
          Подробнее
        </Link>
      </div>
    </article>
  );
}
