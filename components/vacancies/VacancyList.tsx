import type { VacancyListItem } from "@/lib/vacancies";
import { VacancyCard } from "./VacancyCard";

type VacancyListProps = {
  vacancies: VacancyListItem[];
};

export function VacancyList({ vacancies }: VacancyListProps) {
  if (vacancies.length === 0) {
    return (
      <section className="empty-state">
        <h2>Вакансии скоро появятся</h2>
        <p className="muted">
          Сейчас активных вакансий нет. Мы добавим новые позиции, когда они
          будут готовы к публикации.
        </p>
      </section>
    );
  }

  return (
    <section className="vacancy-list" aria-label="Список вакансий">
      {vacancies.map((vacancy) => (
        <VacancyCard key={vacancy.id} vacancy={vacancy} />
      ))}
    </section>
  );
}
