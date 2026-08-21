import { MANUAL_SOURCE_OPTIONS } from "@/lib/application-source";

type VacancyOption = {
  city: string;
  id: string;
  project: string;
  title: string;
};

export function ApplicationForm({ vacancies }: { vacancies: VacancyOption[] }) {
  return (
    <form
      action="/admin/applications/create"
      className="admin-vacancy-form"
      method="post"
    >
      <div className="admin-vacancy-form-grid">
        <label className="apply-field">
          <span>Вакансия *</span>
          <select defaultValue="" name="vacancyId" required>
            <option disabled value="">
              Выберите вакансию
            </option>
            {vacancies.map((vacancy) => (
              <option key={vacancy.id} value={vacancy.id}>
                {vacancy.title} · {vacancy.project} · {vacancy.city}
              </option>
            ))}
          </select>
          <small>Город и проект подставятся из вакансии.</small>
        </label>

        <label className="apply-field">
          <span>Откуда пришёл отклик *</span>
          <select defaultValue="telegram" name="source" required>
            {MANUAL_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small>
            Такие отклики помечаются как заведённые вручную и не смешиваются
            в отчётах с пришедшими через форму сайта.
          </small>
        </label>

        <label className="apply-field">
          <span>Телефон *</span>
          <input
            inputMode="tel"
            maxLength={40}
            name="phone"
            placeholder="+7 999 123-45-67"
            required
            type="tel"
          />
          <small>Номера стран СНГ принимаются как есть, без подмены на +7.</small>
        </label>

        <label className="apply-field">
          <span>Имя</span>
          <input maxLength={80} name="candidateName" placeholder="Необязательно" />
        </label>

        <label className="apply-field">
          <span>Предпочтительная связь</span>
          <select defaultValue="phone" name="preferredContact">
            <option value="phone">Телефон</option>
            <option value="telegram">Telegram</option>
            <option value="max">MAX</option>
          </select>
        </label>

        <label className="apply-field">
          <span>Ник в Telegram</span>
          <input maxLength={80} name="telegramUsername" placeholder="@nickname" />
          <small>Обязателен, если выбрана связь через Telegram.</small>
        </label>
      </div>

      <label className="apply-field">
        <span>Комментарий</span>
        <textarea
          maxLength={2000}
          name="candidateComment"
          placeholder="О чём договорились в переписке: удобное время звонка, свой транспорт, вопросы кандидата."
          rows={5}
        />
      </label>

      <label className="admin-checkbox admin-publication-checkbox">
        <input name="consent" required type="checkbox" />
        <span>
          Кандидат дал согласие на обработку персональных данных — подтверждаю *
        </span>
      </label>

      <div className="admin-form-actions">
        <button className="admin-save" type="submit">
          Создать отклик
        </button>
        <a className="secondary-link" href="/admin">
          Отмена
        </a>
      </div>
    </form>
  );
}

export function ApplicationFormMessage({ result }: { result?: string }) {
  const text = getMessageText(result);

  return text ? (
    <p className="form-message form-message--error admin-page-message">{text}</p>
  ) : null;
}

function getMessageText(result?: string) {
  if (result === "phone") {
    return "Проверьте телефон: номер не распознан.";
  }

  if (result === "consent") {
    return "Без подтверждения согласия отклик создать нельзя.";
  }

  if (result === "telegram") {
    return "Для связи через Telegram нужен ник кандидата.";
  }

  if (result === "source") {
    return "Выберите, откуда пришёл отклик.";
  }

  if (result === "vacancy") {
    return "Вакансия не найдена или снята с публикации.";
  }

  if (result === "invalid") {
    return "Проверьте обязательные поля и длину текста.";
  }

  return null;
}
