// Захват маркетинговой атрибуции (UTM + referrer) на клиенте и хранение в
// пределах сессии, чтобы метки, с которыми пользователь пришёл на лендинг,
// дожили до отправки отклика (даже после переходов между страницами).

export type Attribution = {
  /**
   * ClientID Яндекс.Метрики. Нужен, чтобы потом выгрузить обратно офлайн-
   * конверсии («вышел на смену», «отработал 70 часов») и научить Директ
   * оптимизироваться по деньгам, а не по числу заявок.
   */
  ymClientId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
};

const STORAGE_KEY = "vac_attribution";

export function captureAttribution() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const utm = {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
  };
  const hasUtm = Object.values(utm).some(Boolean);

  const next: Attribution = { ...getAttribution() };

  // Last-touch: свежие UTM из URL перекрывают сохранённые.
  if (hasUtm) {
    Object.assign(next, utm);
  }

  // First-touch referrer: сохраняем только внешний реферер и только один раз.
  if (!next.referrer && document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.host && ref.host !== window.location.host) {
        next.referrer = ref.href;
      }
    } catch {
      // невалидный referrer — игнорируем
    }
  }

  save(next);
  captureYmClientId();
}

// ClientID отдаётся Метрикой асинхронно и только после загрузки счётчика.
// Счётчик подключается стратегией afterInteractive, поэтому на момент
// монтирования его может ещё не быть — пробуем несколько раз.
function captureYmClientId(attempt = 0) {
  const counterId = window.__ymCounterId;

  if (getAttribution().ymClientId) {
    return;
  }

  if (!counterId || typeof window.ym !== "function") {
    if (attempt < 10) {
      window.setTimeout(() => captureYmClientId(attempt + 1), 1000);
    }

    return;
  }

  try {
    window.ym(counterId, "getClientID", (clientId: string) => {
      if (clientId) {
        save({ ...getAttribution(), ymClientId: clientId });
      }
    });
  } catch {
    // счётчик не готов или заблокирован — отклик всё равно отправится
  }
}

function save(attribution: Attribution) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // sessionStorage недоступен (приватный режим и т.п.) — молча пропускаем
  }
}

export function getAttribution(): Attribution {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Attribution;
  } catch {
    return {};
  }
}
