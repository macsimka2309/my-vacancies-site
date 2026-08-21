import { revalidatePath, revalidateTag } from "next/cache";
import { pingIndexNow } from "./indexnow";
import { VACANCIES_CACHE_TAG } from "./vacancies";

/**
 * Сбрасывает кэш витрины после правки вакансий в админке и сообщает об
 * изменении поисковикам.
 *
 * Без сброса кэша изменения ждали бы истечения revalidate (5 минут),
 * без уведомления — ближайшего обхода роботом (недели).
 */
export async function revalidateVacancies(slug?: string) {
  // В Next 16 второй аргумент обязателен: профиль времени жизни кэша.
  // «max» — сбросить запись независимо от того, когда она истекала бы сама.
  revalidateTag(VACANCIES_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  if (slug) {
    revalidatePath(`/vacancies/${slug}`);
  } else {
    revalidatePath("/vacancies/[slug]", "page");
  }

  // Снятая с публикации вакансия отдаёт 404 — её адрес отправляем тоже:
  // так поисковик быстрее уберёт мёртвую ссылку из выдачи.
  await pingIndexNow(slug ? [`/vacancies/${slug}`, "/"] : ["/"]);
}
