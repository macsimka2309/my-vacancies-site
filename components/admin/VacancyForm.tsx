type VacancyFormValues = {
  address: string | null;
  city: string;
  conditions: string;
  contactComment: string | null;
  isActive: boolean;
  project: string;
  requirements: string;
  responsibilities: string;
  salary: string | null;
  schedule: string | null;
  slug: string;
  title: string;
  workFormat: string;
};

export function VacancyForm({
  action,
  submitLabel,
  vacancy,
}: {
  action: string;
  submitLabel: string;
  vacancy?: VacancyFormValues;
}) {
  return (
    <form action={action} className="admin-vacancy-form" method="post">
      <div className="admin-vacancy-form-grid">
        <Field
          defaultValue={vacancy?.title}
          label="Название"
          maxLength={200}
          name="title"
          required
        />
        <Field
          defaultValue={vacancy?.project}
          label="Компания / проект"
          maxLength={200}
          name="project"
          required
        />
        <Field
          defaultValue={vacancy?.city}
          label="Город"
          maxLength={120}
          name="city"
          required
        />
        <Field
          defaultValue={vacancy?.workFormat}
          label="Формат работы"
          maxLength={120}
          name="workFormat"
          required
        />
        <Field
          defaultValue={vacancy?.salary}
          label="Зарплата"
          maxLength={120}
          name="salary"
        />
        <Field
          defaultValue={vacancy?.schedule}
          label="График"
          maxLength={200}
          name="schedule"
        />
        <Field
          defaultValue={vacancy?.address}
          label="Адрес / район"
          maxLength={300}
          name="address"
        />
        <Field
          defaultValue={vacancy?.slug}
          description="Можно оставить пустым — адрес сформируется автоматически."
          label="Адрес страницы"
          maxLength={120}
          name="slug"
          placeholder="kurer-moskva"
        />
      </div>

      <TextField
        defaultValue={vacancy?.responsibilities}
        label="Обязанности"
        maxLength={10_000}
        name="responsibilities"
        required
      />
      <TextField
        defaultValue={vacancy?.requirements}
        label="Требования"
        maxLength={10_000}
        name="requirements"
        required
      />
      <TextField
        defaultValue={vacancy?.conditions}
        label="Условия"
        maxLength={10_000}
        name="conditions"
        required
      />
      <TextField
        defaultValue={vacancy?.contactComment}
        label="Контактный комментарий"
        maxLength={2_000}
        name="contactComment"
      />

      <label className="admin-checkbox admin-publication-checkbox">
        <input
          defaultChecked={vacancy?.isActive ?? false}
          name="isActive"
          type="checkbox"
        />
        <span>Опубликовать вакансию на сайте</span>
      </label>

      <div className="admin-form-actions">
        <button className="admin-save" type="submit">
          {submitLabel}
        </button>
        <a className="secondary-link" href="/admin/vacancies">
          Отмена
        </a>
      </div>
    </form>
  );
}

export function VacancyFormMessage({ result }: { result?: string }) {
  if (!result) {
    return null;
  }

  const text =
    result === "slug-exists"
      ? "Такой адрес страницы уже используется."
      : "Проверьте обязательные поля и длину текста.";

  return (
    <p className="form-message form-message--error admin-page-message">{text}</p>
  );
}

function Field({
  defaultValue,
  description,
  label,
  ...inputProps
}: {
  defaultValue?: string | null;
  description?: string;
  label: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue"
>) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <input defaultValue={defaultValue ?? ""} {...inputProps} />
      {description ? <small>{description}</small> : null}
    </label>
  );
}

function TextField({
  defaultValue,
  label,
  ...textareaProps
}: {
  defaultValue?: string | null;
  label: string;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "defaultValue"
>) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <textarea defaultValue={defaultValue ?? ""} rows={6} {...textareaProps} />
    </label>
  );
}
