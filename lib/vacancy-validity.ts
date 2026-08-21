/**
 * Срок действия объявления (`validThrough` в микроразметке).
 *
 * Объявление без срока агрегаторы отбраковывают при импорте, а Яндекс убирает
 * из блока вакансий. Проставлять дату руками по всем вакансиям нельзя: через
 * два месяца они протухнут разом и молча.
 *
 * Поэтому срок считается сам — от даты последнего изменения. Любая правка
 * вакансии в админке автоматически его отодвигает: живую вакансию, которую
 * регулярно трогают, не потерять, а забытая честно уходит через два месяца.
 * Ручное поле нужно для случая «эта вакансия точно закрывается 15 сентября».
 */
export const VALID_THROUGH_DAYS = 60;

type VacancyValidity = {
  validThrough: Date | null;
  updatedAt: Date;
};

export function getValidThrough(vacancy: VacancyValidity): Date {
  if (vacancy.validThrough) {
    return vacancy.validThrough;
  }

  const auto = new Date(vacancy.updatedAt);
  auto.setUTCDate(auto.getUTCDate() + VALID_THROUGH_DAYS);

  return auto;
}

/** `YYYY-MM-DD` — формат и для `<input type="date">`, и для микроразметки. */
export function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}
