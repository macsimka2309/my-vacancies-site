/**
 * «Холодный» заход на главную (п. 59) — открыл «/» без города, без
 * фильтра и без рекламной метки. Такому человеку ничего конкретного не
 * обещано ни ссылкой, ни объявлением, и приветственный экран можно
 * поставить первым, не отнимая карточку вакансии у того, кто уже пришёл
 * с намерением.
 *
 * Гейт перед каталогом для остального трафика в бэклоге отклонён явно:
 * реклама ведёт на `/?city={region}` и `?utm_*`, шаренный фильтр — на
 * `/?title=…` — вставлять между кликом и вакансиями ещё одну секцию
 * для них нельзя, это ровно то, что чинил п. 6 (см.
 * docs/conversion-backlog.md).
 */
const INTENT_PARAMS = [
  "city",
  "title",
  "project",
  "salaryBasis",
  "salaryFrom",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export function isColdLanding(
  params: Record<string, string | string[] | undefined>,
) {
  return !INTENT_PARAMS.some((key) => params[key] !== undefined);
}
