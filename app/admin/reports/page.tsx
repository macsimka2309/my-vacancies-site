import { redirect } from "next/navigation";
import { canManageApplications, getAdminSession } from "@/lib/admin-auth";
import {
  buildLeadReport,
  formatShare,
  REPORT_CITY_NOT_SET,
} from "@/lib/application-report";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PERIODS = [
  { value: "7", label: "7 дней", days: 7 },
  { value: "30", label: "30 дней", days: 30 },
  { value: "all", label: "Всё время", days: null },
] as const;

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsAdminPage({
  searchParams,
}: ReportsPageProps) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin?login=required");
  }

  if (!canManageApplications(session)) {
    redirect("/admin?reports=forbidden");
  }

  const params = searchParams ? await searchParams : {};
  const periodParam = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = PERIODS.find((item) => item.value === periodParam) ?? PERIODS[1];

  const applications = await db.application.findMany({
    where: period.days
      ? { createdAt: { gte: new Date(Date.now() - period.days * 24 * 60 * 60 * 1000) } }
      : {},
    select: {
      city: true,
      projectSnapshot: true,
      status: true,
      trafficSource: true,
      utmSource: true,
    },
  });

  const rows = buildLeadReport(applications);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const started = rows.reduce((sum, row) => sum + row.startedShift, 0);

  return (
    <main className="admin-shell">
      <header className="admin-header admin-section-header">
        <div>
          <p className="eyebrow">Админка</p>
          <h1>Город × проект × канал</h1>
          <p className="muted">
            {total} {declineLead(total)} за период, из них {started}{" "}
            вышли на смену ({formatShare(total ? started / total : null)})
          </p>
        </div>
        <nav className="admin-header-actions" aria-label="Навигация">
          <a className="secondary-link" href="/admin">
            К откликам
          </a>
        </nav>
      </header>

      <p className="muted">
        CPL и CPA за выход здесь не считаются — для них нужен расход
        Директа за период, а этих денег в базе нет: сумма рекламного
        бюджета вводится только снаружи. «% дозвона» тоже нет — восемь
        статусов лида не различают «дозвонились и отказал» от «не
        дозвонились».
      </p>

      <nav className="admin-filters__bar" aria-label="Период отчёта">
        {PERIODS.map((item) => (
          <a
            className={
              item.value === period.value ? "admin-save" : "secondary-link"
            }
            href={`/admin/reports?period=${item.value}`}
            key={item.value}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="muted">За этот период откликов нет.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Город</th>
                <th>Проект</th>
                <th>Канал</th>
                <th>Лидов</th>
                <th>Дошли до стажировки</th>
                <th>Вышли на смену</th>
                <th>% выхода</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.city} ${row.project} ${row.channel}`}>
                  <td>
                    {row.city === REPORT_CITY_NOT_SET ? (
                      <span className="muted">Не указан</span>
                    ) : (
                      row.city
                    )}
                  </td>
                  <td>{row.project}</td>
                  <td>{row.channelLabel}</td>
                  <td>{row.total}</td>
                  <td>{row.reachedInternship}</td>
                  <td>{row.startedShift}</td>
                  <td>{formatShare(row.startedShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function declineLead(count: number) {
  const words: Record<string, string> = {
    one: "лид",
    few: "лида",
    many: "лидов",
    other: "лида",
  };

  return words[new Intl.PluralRules("ru-RU").select(count)] ?? words.other;
}
