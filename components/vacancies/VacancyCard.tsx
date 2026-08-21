import Link from "next/link";
import { formatProject } from "@/lib/project";
import type { VacancyListItem } from "@/lib/vacancies";
import { InlineApplyForm } from "./InlineApplyForm";
import { ContactButtons } from "./ContactButtons";

type VacancyCardProps = {
  vacancy: VacancyListItem;
};

export function VacancyCard({ vacancy }: VacancyCardProps) {
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
