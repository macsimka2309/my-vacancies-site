import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

// Генерируем на каждый запрос (иначе на сборке нет доступа к БД).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site.url}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
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

    return [...staticRoutes, ...vacancyRoutes];
  } catch {
    // Если БД недоступна — отдаём хотя бы статические маршруты.
    return staticRoutes;
  }
}
