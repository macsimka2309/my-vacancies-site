import { revalidatePath, revalidateTag } from "next/cache";
import { VACANCIES_CACHE_TAG } from "./vacancies";

/**
 * Сбрасывает кэш витрины после правки вакансий в админке.
 * Без этого изменения ждали бы истечения revalidate (5 минут).
 */
export function revalidateVacancies(slug?: string) {
  revalidateTag(VACANCIES_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");

  if (slug) {
    revalidatePath(`/vacancies/${slug}`);
  } else {
    revalidatePath("/vacancies/[slug]", "page");
  }
}
