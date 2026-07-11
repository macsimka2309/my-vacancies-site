import { redirect } from "next/navigation";
import { canViewAuditLogs, getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getLeadStatusLabel } from "@/lib/lead-status";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin?login=required");
  }

  if (!canViewAuditLogs(session)) {
    redirect("/admin?logs=forbidden");
  }

  const logs = await db.applicationAuditLog.findMany({
    include: {
      application: {
        select: {
          candidateName: true,
          normalizedPhone: true,
          vacancyTitleSnapshot: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="admin-shell admin-logs-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Логи изменений</h1>
          <p className="muted">
            История статусов и примечаний по откликам.
          </p>
        </div>
        <a className="secondary-link" href="/admin">
          К откликам
        </a>
      </header>

      {logs.length === 0 ? (
        <section className="empty-state">
          <h2>Логов пока нет</h2>
          <p className="muted">
            Первая запись появится после изменения статуса или примечания.
          </p>
        </section>
      ) : (
        <section className="admin-table-wrap" aria-label="Логи изменений">
          <table className="admin-table admin-logs-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Пользователь</th>
                <th>Отклик</th>
                <th>Изменения</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    <strong>{log.actorUsername}</strong>
                  </td>
                  <td>
                    <strong>{log.application.candidateName}</strong>
                    <span>{log.application.normalizedPhone}</span>
                    <span>{log.application.vacancyTitleSnapshot}</span>
                  </td>
                  <td>
                    <LogChanges log={log} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}

function LogChanges({
  log,
}: {
  log: {
    previousStatus: string | null;
    newStatus: string | null;
    previousManagerComment: string | null;
    newManagerComment: string | null;
  };
}) {
  const statusChanged = Boolean(log.previousStatus || log.newStatus);
  const commentChanged =
    log.previousManagerComment !== null || log.newManagerComment !== null;

  return (
    <div className="log-changes">
      {statusChanged ? (
        <p>
          <strong>Статус:</strong>{" "}
          {getLeadStatusLabel(log.previousStatus ?? "")} →{" "}
          {getLeadStatusLabel(log.newStatus ?? "")}
        </p>
      ) : null}
      {commentChanged ? (
        <p>
          <strong>Примечание:</strong>{" "}
          <span>{formatComment(log.previousManagerComment)}</span> →{" "}
          <span>{formatComment(log.newManagerComment)}</span>
        </p>
      ) : null}
    </div>
  );
}

function formatComment(value: string | null) {
  return value || "Без примечания";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    year: "numeric",
  }).format(value);
}
