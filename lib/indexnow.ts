import { site } from "./site";

/**
 * IndexNow — уведомление поисковика о том, что страница изменилась.
 *
 * Без него Яндекс узнаёт об изменениях только когда сам зайдёт: для молодого
 * сайта это недели. Снятая с публикации вакансия всё это время висит в выдаче
 * и ведёт на 404, а новая начинает работать через месяц после заливки.
 *
 * Общий эндпоинт рассылает уведомление всем участникам протокола — нам важен
 * Яндекс, Bing идёт бесплатным довеском.
 */
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

// Протокол допускает до 10 000 адресов за раз; столько нам никогда не нужно,
// но обрезать список надо, чтобы случайный вызов не ушёл гигантским телом.
const MAX_URLS = 1_000;

// Ответ поисковика нам ни на что не влияет: если уведомление не дошло,
// страницу всё равно обойдут обычным порядком, просто позже.
const TIMEOUT_MS = 5_000;

export type IndexNowResult =
  | { sent: true; status: number; urls: number }
  | { sent: false; reason: string };

/**
 * Уведомляет поисковики об изменившихся страницах.
 *
 * Никогда не бросает исключение: правка вакансии в админке не должна падать
 * из-за недоступности стороннего сервиса.
 */
export async function pingIndexNow(
  paths: string[],
): Promise<IndexNowResult> {
  const host = new URL(site.url).host;
  const urlList = [
    ...new Set(paths.map((path) => new URL(path, site.url).toString())),
  ].slice(0, MAX_URLS);

  if (!urlList.length) {
    return { sent: false, reason: "нечего отправлять" };
  }

  if (!isEnabled()) {
    return { sent: false, reason: "выключено вне продакшена" };
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: site.indexNowKey,
        keyLocation: `${site.url}/${site.indexNowKey}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // 200 и 202 — принято. Остальное логируем: 403 означает, что поисковик
    // не нашёл или не признал файл ключа, и это надо чинить руками.
    if (!response.ok) {
      console.warn(
        `IndexNow: ${response.status} ${response.statusText} для ${urlList.length} адресов.`,
      );
    }

    return { sent: true, status: response.status, urls: urlList.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.warn(`IndexNow: уведомление не отправлено — ${message}`);

    return { sent: false, reason: message };
  }
}

// Из локальной разработки и с тестового окружения дёргать поисковик нельзя:
// адреса всё равно указывают на прод, и мы бы просили переобойти чужие
// страницы по своим локальным правкам.
function isEnabled() {
  return process.env.NODE_ENV === "production";
}
