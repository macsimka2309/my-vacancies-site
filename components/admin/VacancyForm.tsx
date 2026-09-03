import { describeStructuredSalary, type SalaryPeriod } from "@/lib/salary";
import {
  getValidThrough,
  toDateInputValue,
  VALID_THROUGH_DAYS,
} from "@/lib/vacancy-validity";

type VacancyFormValues = {
  address: string | null;
  city: string;
  conditions: string;
  contactComment: string | null;
  isActive: boolean;
  payTariff: string | null;
  project: string;
  requirements: string;
  responsibilities: string;
  salary: string | null;
  salaryShiftMin: number | null;
  salaryShiftMax: number | null;
  salaryShiftAvg: number | null;
  salaryHour: number | null;
  salaryPeriodMin: number | null;
  salaryPeriodMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  validThrough: Date | null;
  updatedAt: Date;
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
          description={
            vacancy?.salary
              ? describeStructuredSalary(vacancy)
              : "Например: «2650–5300 ₽ за смену · от 100 000 ₽/мес»."
          }
          label="Зарплата"
          maxLength={120}
          name="salary"
        />
        <Field
          defaultValue={vacancy?.salaryHour?.toString().replace(".", ",")}
          description="Тариф от партнёра. Единственная сравнимая единица: смены идут от 4 до 16 часов, поэтому сумма «за смену» несравнима, а час сравним всегда. Дробную ставку писать через запятую."
          inputMode="decimal"
          label="Ставка за час, ₽"
          name="salaryHour"
          placeholder="117 или 112,5"
        />
        <Field
          defaultValue={vacancy?.salaryShiftAvg?.toString()}
          description="Только реальная цифра от партнёра — вилку кандидат читает как обман."
          inputMode="numeric"
          label="Средний доход за смену, ₽"
          name="salaryShiftAvg"
          placeholder="4200"
        />
        <Field
          defaultValue={
            vacancy?.validThrough
              ? toDateInputValue(vacancy.validThrough)
              : undefined
          }
          description={describeValidThrough(vacancy)}
          label="Действительна до"
          name="validThrough"
          type="date"
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
        defaultValue={vacancy?.payTariff}
        description="Вставьте тариф из таблицы партнёра как есть — «заказ 148р перевес свыше 20 кг-60р…» или список «Повышенное вручение - 42». Сайт сам разберёт его на составляющие: цена заказа встанет на карточку, остальное — в блок «Из чего складывается оплата». Понятные ему подписи перечислены в lib/piecework.ts; непонятные молча пропускаются."
        label="Сдельный тариф"
        maxLength={2_000}
        name="payTariff"
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

// Поле почти всегда пустое, поэтому подсказка объясняет, что будет без него:
// иначе «пусто» читается как «срока нет», а он есть и считается сам.
function describeValidThrough(vacancy?: VacancyFormValues) {
  if (!vacancy) {
    return `Можно не заполнять: срок посчитается сам — ${VALID_THROUGH_DAYS} дней от последней правки.`;
  }

  if (vacancy.validThrough) {
    return "Задано вручную. Очистите поле, чтобы срок снова продлевался при каждой правке.";
  }

  const until = toDateInputValue(getValidThrough(vacancy));

  return `Сейчас действует до ${until} — ${VALID_THROUGH_DAYS} дней от последней правки. Каждое сохранение продлевает срок.`;
}

export function VacancyFormMessage({ result }: { result?: string }) {
  if (!result) {
    return null;
  }

  const text =
    result === "slug-exists"
      ? "Такой адрес страницы уже используется."
      : result === "age-limit"
        ? "Уберите верхнюю границу возраста из текста: в объявлении о работе она запрещена (ст. 25 Закона о занятости, штраф по ст. 13.11.1 КоАП за каждое объявление). Пишите «Возраст от 18 лет» — ограничение партнёра остаётся у менеджера."
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
  description,
  label,
  ...textareaProps
}: {
  defaultValue?: string | null;
  description?: string;
  label: string;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "defaultValue"
>) {
  return (
    <label className="apply-field">
      <span>{label}</span>
      <textarea defaultValue={defaultValue ?? ""} rows={6} {...textareaProps} />
      {description ? <small>{description}</small> : null}
    </label>
  );
}
