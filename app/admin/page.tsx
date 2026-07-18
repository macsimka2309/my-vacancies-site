import { AdminMenu } from "@/components/admin/AdminMenu";
import {
  type AdminRole,
  canManageApplications,
  canManageAdminUsers,
  canManageVacancies,
  getAdminSession,
  getAdminRolesLabel,
} from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  getLeadStatusLabel,
  LEAD_STATUS_OPTIONS,
} from "@/lib/lead-status";

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
  const searchQuery = getSingleParam(params.q)?.trim() ?? "";
  const [applications, users] = await Promise.all([
    db.application.findMany({
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
    }),
    canManageUsers
      ? db.adminUser.findMany({
          orderBy: [
            {
              createdAt: "asc",
            },
          ],
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
  const normalizedQuery = searchQuery.toLocaleLowerCase("ru-RU");
  const filteredApplications = normalizedQuery
    ? applications.filter((application) =>
        applicationMatchesQuery(application, normalizedQuery),
      )
    : applications;

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

      <section className="admin-summary" aria-label="Сводка по откликам">
        <SummaryItem label="Всего" value={applications.length} />
        <SummaryItem
          label="Новые"
          value={applications.filter((item) => item.status === "NEW").length}
        />
        <SummaryItem
          label="В работе"
          value={
            applications.filter((item) => item.status === "IN_PROGRESS").length
          }
        />
      </section>

      <section
        className="admin-applications-panel"
        aria-label="Поиск и список откликов"
      >
        <div className="admin-search">
          <form action="/admin" method="get">
            <label htmlFor="application-search">Поиск по всем полям</label>
            <div>
              <input
                defaultValue={searchQuery}
                id="application-search"
                name="q"
                placeholder="Имя, телефон, вакансия, город, статус..."
                type="search"
              />
              <button className="admin-save" type="submit">
                Найти
              </button>
              {searchQuery ? (
                <a className="secondary-link" href="/admin">
                  Сбросить
                </a>
              ) : null}
            </div>
          </form>
          <p className="muted">
            Найдено: {filteredApplications.length} из {applications.length}
          </p>
        </div>

        <AdminResultMessage params={params} />

        {applications.length === 0 ? (
          <div className="empty-state">
            <h2>Откликов пока нет</h2>
            <p className="muted">
              Когда кандидат отправит форму, заявка появится на этой странице.
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state">
            <h2>Ничего не найдено</h2>
            <p className="muted">
              Попробуйте изменить запрос или сбросить поиск.
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
                <th>Статус</th>
                <th>Примечание</th>
                <th>Telegram</th>
                <th>Создан</th>
                <th>Действие</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((application) => {
                const formId = `application-${application.id}`;

                return (
                  <tr key={application.id}>
                    <td>
                      <strong>{application.candidateName}</strong>
                      <a href={`tel:${application.normalizedPhone}`}>
                        {application.normalizedPhone}
                      </a>
                    </td>
                    <td>
                      <strong>{application.vacancyTitleSnapshot}</strong>
                      <span>{application.projectSnapshot}</span>
                    </td>
                    <td>{application.city ?? "Не указан"}</td>
                    <td>
                      <select
                        aria-label={`Статус отклика ${application.candidateName}`}
                        defaultValue={application.status}
                        form={formId}
                        name="status"
                      >
                        {LEAD_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        aria-label={`Примечание к отклику ${application.candidateName}`}
                        defaultValue={application.managerComment ?? ""}
                        form={formId}
                        maxLength={2000}
                        name="managerComment"
                        placeholder="Добавить примечание"
                        rows={3}
                      />
                    </td>
                    <td>{getTelegramStatus(application)}</td>
                    <td>{formatDate(application.createdAt)}</td>
                    <td>
                      <form
                        action={`/admin/applications/${application.id}/status`}
                        id={formId}
                        method="post"
                      >
                        <input
                          name="searchQuery"
                          type="hidden"
                          value={searchQuery}
                        />
                        <button className="admin-save" type="submit">
                          Сохранить
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatOptionalDate(value: Date | null) {
  return value ? formatDate(value) : "Еще не входил";
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
