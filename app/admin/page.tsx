import { AdminMenu } from "@/components/admin/AdminMenu";
import { ApplicationFilters } from "@/components/admin/ApplicationFilters";
import { ApplicationRow } from "@/components/admin/ApplicationRow";
import {
  buildApplicationWhere,
  matchesSource,
  parseApplicationFilters,
} from "@/lib/application-filters";
import { getTrafficSourceLabel } from "@/lib/application-source";
import {
  type AdminRole,
  canManageApplications,
  canManageAdminUsers,
  canManageVacancies,
  getAdminSession,
  getAdminRolesLabel,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getLeadStatusLabel } from "@/lib/lead-status";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type AdminUserRow = {
  fullName: string | null;
  id: string;
  username: string;
  roles: AdminRole[];
  isActive: boolean;
  lastLoginAt: Date | null;
};

type StatusMessage = {
  tone: "success" | "error";
  text: string;
};

type ApplicationSearchRow = {
  createdAt: Date;
  status: string;
  telegramError: string | null;
  telegramSentAt: Date | null;
  trafficSource: string | null;
  [key: string]: unknown;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await getAdminSession();

  if (!session) {
    const loginParam = getSingleParam(params.login);
    return (
      <AdminLogin
        variant={
          loginParam === "throttled"
            ? "throttled"
            : loginParam === "error"
              ? "error"
              : "none"
        }
      />
    );
  }

  if (!canManageApplications(session)) {
    return <AdminAccessDenied />;
  }

  const canManageUsers = canManageAdminUsers(session);
  const hasVacancyAccess = canManageVacancies(session);
  const filters = parseApplicationFilters(params);
  const where = buildApplicationWhere(filters);
  const [rows, statusCounts, total, vacancies, users] = await Promise.all([
    // Фильтрация ушла в SQL: до этого страница читала все отклики без
    // ограничения и разбирала их в памяти. На четырнадцати записях разницы
    // нет, но комбинировать пять условий в JS — тот же код, который всё
    // равно пришлось бы переписать.
    db.application.findMany({ where, orderBy: [{ createdAt: "desc" }] }),
    db.application.groupBy({ by: ["status"], _count: { _all: true } }),
    db.application.count(),
    db.vacancy.findMany({
      orderBy: [{ city: "asc" }, { title: "asc" }],
      select: { city: true, id: true, project: true, title: true },
    }),
    canManageUsers
      ? db.adminUser.findMany({
          orderBy: [{ createdAt: "asc" }],
          select: {
            fullName: true,
            id: true,
            username: true,
            roles: true,
            isActive: true,
            lastLoginAt: true,
          },
        })
      : Promise.resolve([] as AdminUserRow[]),
  ]);
  // Источник — не колонка, а вычисляемая корзина, поэтому он и поиск
  // применяются уже над выборкой.
  const normalizedQuery = filters.query.toLocaleLowerCase("ru-RU");
  const applications = rows
    .filter((application) => matchesSource(application, filters.source))
    .filter(
      (application) =>
        !normalizedQuery ||
        applicationMatchesQuery(application, normalizedQuery),
    );
  const countByStatus = (status: string) =>
    statusCounts.find((item) => item.status === status)?._count._all ?? 0;
  const cityOptions = uniqueOptions(vacancies.map((item) => item.city));
  const projectOptions = uniqueOptions(vacancies.map((item) => item.project));
  const vacancyOptions = vacancies.map((item) => ({
    label: `${item.title} — ${item.city}`,
    value: item.id,
  }));

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Отклики</h1>
        </div>
        <AdminMenu
          canManageVacancies={hasVacancyAccess}
          canManageUsers={canManageUsers}
          fullName={session.fullName}
          passwordMessage={getPasswordMessage(
            getSingleParam(params.password),
          )}
          rolesLabel={getAdminRolesLabel(session.roles)}
          username={session.username}
          userMessage={getUserMessage(getSingleParam(params.users))}
          users={users.map((user) => ({
            fullName: user.fullName,
            id: user.id,
            isActive: user.isActive,
            lastLoginLabel: formatOptionalDate(user.lastLoginAt),
            roles: user.roles,
            username: user.username,
          }))}
        />
      </header>

      {/* Сводка намеренно считает всю базу, а не отфильтрованный список:
          рядом с включённым фильтром «в работе: 8» при пяти строках читается
          как противоречие, поэтому подпись говорит об этом прямо. */}
      <section className="admin-summary" aria-label="Сводка по всей базе">
        <SummaryItem label="Всего в базе" value={total} />
        <SummaryItem label="Новые" value={countByStatus("NEW")} />
        <SummaryItem label="В работе" value={countByStatus("IN_PROGRESS")} />
      </section>

      <section
        className="admin-applications-panel"
        aria-label="Поиск и список откликов"
      >
        <ApplicationFilters
          cities={cityOptions}
          filters={filters}
          found={applications.length}
          projects={projectOptions}
          total={total}
          vacancies={vacancyOptions}
        />

        <AdminResultMessage params={params} />

        {total === 0 ? (
          <div className="empty-state">
            <h2>Откликов пока нет</h2>
            <p className="muted">
              Когда кандидат отправит форму, заявка появится на этой странице.
            </p>
          </div>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <h2>Ничего не найдено</h2>
            <p className="muted">
              Попробуйте изменить условия или сбросить фильтры.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Кандидат</th>
                <th>Вакансия</th>
                <th>Город</th>
                <th>Источник</th>
                <th>Статус</th>
                <th>Примечание</th>
                <th>Telegram</th>
                <th>Создан</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <ApplicationRow
                  candidateName={application.candidateName}
                  cities={cityOptions.map((option) => option.value)}
                  city={application.city ?? ""}
                  createdLabel={formatDate(application.createdAt)}
                  id={application.id}
                  key={application.id}
                  managerComment={application.managerComment ?? ""}
                  phone={application.normalizedPhone}
                  project={application.projectSnapshot}
                  sourceLabel={getTrafficSourceLabel(application.trafficSource)}
                  status={application.status}
                  telegramLabel={getTelegramStatus(application)}
                  vacancyTitle={application.vacancyTitleSnapshot}
                />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminAccessDenied() {
  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <p className="eyebrow">Админка</p>
        <h1>Нет доступа</h1>
        <p className="muted">Для этой учётной записи не назначена рабочая роль.</p>
        <form action="/admin/logout" method="post">
          <button className="button-link" type="submit">
            Выйти
          </button>
        </form>
      </section>
    </main>
  );
}

function AdminLogin({
  variant,
}: {
  variant: "none" | "error" | "throttled";
}) {
  return (
    <main className="admin-login-shell">
      <section className="admin-login-panel">
        <p className="eyebrow">Админка</p>
        <h1>Вход</h1>
        <p className="muted">Введите логин и пароль.</p>
        <form action="/admin/login" className="admin-login-form" method="post">
          <label className="apply-field">
            <span>Логин</span>
            <input autoComplete="username" name="username" required />
          </label>
          <label className="apply-field">
            <span>Пароль</span>
            <input
              autoComplete="current-password"
              name="password"
              required
              type="password"
            />
          </label>
          {variant === "error" ? (
            <p className="form-message form-message--error">
              Неверный логин или пароль.
            </p>
          ) : null}
          {variant === "throttled" ? (
            <p className="form-message form-message--error">
              Слишком много попыток входа. Подождите пару минут и попробуйте
              снова.
            </p>
          ) : null}
          <button className="button-link" type="submit">
            Войти
          </button>
        </form>
      </section>
    </main>
  );
}

function AdminResultMessage({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  let message: StatusMessage | null = null;

  if (getSingleParam(params.updated) === "1") {
    message = {
      text: "Изменения сохранены.",
      tone: "success",
    };
  } else if (getSingleParam(params.created) === "1") {
    message = {
      text: "Отклик создан.",
      tone: "success",
    };
  } else if (getSingleParam(params.created) === "duplicate") {
    message = {
      text: "Отклик создан. Такой номер уже был в базе — проверьте, не дубль ли это.",
      tone: "error",
    };
  } else if (getSingleParam(params.note) === "too-long") {
    message = {
      text: "Примечание не должно быть длиннее 2000 символов.",
      tone: "error",
    };
  } else if (getSingleParam(params.application) === "missing") {
    message = {
      text: "Отклик не найден. Возможно, он был удалён.",
      tone: "error",
    };
  } else if (getSingleParam(params.logs) === "forbidden") {
    message = {
      text: "Просматривать логи может только администратор.",
      tone: "error",
    };
  }

  return message ? (
    <p className={`admin-result form-message form-message--${message.tone}`}>
      {message.text}
    </p>
  ) : null;
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function applicationMatchesQuery(
  application: ApplicationSearchRow,
  query: string,
) {
  const searchableValues = [
    ...Object.values(application),
    getLeadStatusLabel(application.status),
    // Ищем и по подписи источника: в базе лежит «manual:telegram»,
    // а менеджер набирает «telegram» или «вручную».
    getTrafficSourceLabel(application.trafficSource),
    getTelegramStatus(application),
    formatDate(application.createdAt),
  ];

  return searchableValues.some((value) =>
    getSearchValue(value).includes(query),
  );
}

function getSearchValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return `${value.toISOString()} ${formatDate(value)}`.toLocaleLowerCase(
      "ru-RU",
    );
  }

  return String(value).toLocaleLowerCase("ru-RU");
}

function getTelegramStatus(application: {
  telegramError: string | null;
  telegramSentAt: Date | null;
}) {
  if (application.telegramError) {
    return "Ошибка";
  }

  if (application.telegramSentAt) {
    return "Отправлен";
  }

  return "Ожидает";
}

function getPasswordMessage(status: string | undefined): StatusMessage | null {
  if (status === "changed") {
    return {
      text: "Пароль изменен.",
      tone: "success",
    };
  }

  if (status === "invalid") {
    return {
      text: "Текущий пароль указан неверно.",
      tone: "error",
    };
  }

  if (status === "mismatch") {
    return {
      text: "Новые пароли не совпадают.",
      tone: "error",
    };
  }

  if (status === "short") {
    return {
      text: "Пароль слишком короткий.",
      tone: "error",
    };
  }

  return null;
}

function getUserMessage(status: string | undefined): StatusMessage | null {
  if (status === "created") {
    return {
      text: "Пользователь создан.",
      tone: "success",
    };
  }

  if (status === "updated") {
    return {
      text: "Данные сотрудника сохранены.",
      tone: "success",
    };
  }

  if (status === "exists") {
    return {
      text: "Такой логин уже есть.",
      tone: "error",
    };
  }

  if (status === "forbidden") {
    return {
      text: "Недостаточно прав.",
      tone: "error",
    };
  }

  if (status === "invalid") {
    return {
      text: "Проверьте логин, пароль и роль.",
      tone: "error",
    };
  }

  if (status === "self") {
    return {
      text: "Нельзя отключить свою учётную запись или снять с себя роль администратора.",
      tone: "error",
    };
  }

  if (status === "missing") {
    return {
      text: "Сотрудник не найден.",
      tone: "error",
    };
  }

  return null;
}

// Контейнер живёт в UTC, и без явной зоны админка показывала время на три
// часа назад: отклик, пришедший в 14:50 по Москве, значился как 11:50.
// Варианты фильтра берём из каталога вакансий: список городов и проектов
// должен совпадать с тем, что реально можно выбрать в отклике.
function uniqueOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ru"))
    .map((value) => ({ label: value, value }));
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
    year: "numeric",
  }).format(value);
}

function formatOptionalDate(value: Date | null) {
  return value ? formatDate(value) : "Еще не входил";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
