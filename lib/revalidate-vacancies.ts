import { revalidatePath, revalidateTag } from "next/cache";
import { VACANCIES_CACHE_TAG } from "./vacancies";

/**
 * Сбрасывает кэш витрины после правки вакансий в админке.
 * Без этого изменения ждали бы истечения revalidate (5 минут).
 */
export function revalidateVacancies(slug?: string) {
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
}
