// Захват маркетинговой атрибуции (UTM + referrer) на клиенте и хранение в
// пределах сессии, чтобы метки, с которыми пользователь пришёл на лендинг,
// дожили до отправки отклика (даже после переходов между страницами).

export type Attribution = {
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

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
