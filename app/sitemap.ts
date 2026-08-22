import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { INTENT_SLUGS } from "@/lib/intents";
import { site } from "@/lib/site";

// Генерируем на каждый запрос: на сборке нет доступа к БД, и при revalidate
// sitemap пререндерится пустым (остаются только статические маршруты).
// Сам запрос в базу при этом кэширован в loadActiveVacancies.
export const dynamic = "force-dynamic";

// Дата последней правки политики. Меняется руками вместе с текстом.
const PRIVACY_UPDATED_AT = new Date("2026-08-19T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const buildStaticRoutes = (homeUpdatedAt: Date): MetadataRoute.Sitemap => [
    {
      url: site.url,
      lastModified: homeUpdatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site.url}/privacy`,
      lastModified: PRIVACY_UPDATED_AT,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // Лендинги под интенты (п. 13). Дата берётся от главной: их содержимое
    // считается из каталога и меняется вместе с ним.
    ...INTENT_SLUGS.map((slug) => ({
      url: `${site.url}/${slug}`,
      lastModified: homeUpdatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  try {
    const vacancies = await db.vacancy.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const vacancyRoutes: MetadataRoute.Sitemap = vacancies.map((vacancy) => ({
      url: `${site.url}/vacancies/${vacancy.slug}`,
      lastModified: vacancy.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // Главная — это витрина вакансий, поэтому её дата изменения — дата
    // последней правки каталога. Раньше здесь стояло время генерации ответа:
    // страница на каждый запрос сообщала «только что изменилась», и такому
    // сигналу робот перестаёт верить.
    const latestVacancyUpdate = vacancies.reduce<Date | null>(
      (latest, vacancy) =>
        !latest || vacancy.updatedAt > latest ? vacancy.updatedAt : latest,
      null,
    );

    return [
      ...buildStaticRoutes(latestVacancyUpdate ?? PRIVACY_UPDATED_AT),
      ...vacancyRoutes,
    ];
  } catch {
    // Если БД недоступна — отдаём хотя бы статические маршруты.
    return buildStaticRoutes(PRIVACY_UPDATED_AT);
  }
}
