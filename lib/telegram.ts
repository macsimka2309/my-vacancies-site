type ApplicationTelegramPayload = {
  name: string;
  phone: string;
  project: string;
  city: string;
  vacancyTitle: string;
  preferredContact?: "phone" | "telegram" | "max";
  telegramUsername?: string;
  /** Сработала антиспам-ловушка — отклик всё равно доставляем, но помечаем. */
  suspectedSpam?: boolean;
  /** Телефон уже был в базе. Показываем прошлый отклик, чтобы менеджер
      не звонил второй раз вслепую. */
  previousApplication?: {
    createdAt: Date;
    statusLabel: string;
    vacancyTitle: string;
  };
};

const CONTACT_LABEL: Record<
  NonNullable<ApplicationTelegramPayload["preferredContact"]>,
  string
> = {
  phone: "Телефон",
  telegram: "Telegram",
  max: "MAX",
};

export async function sendApplicationTelegramNotification(
  payload: ApplicationTelegramPayload,
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Telegram credentials are not configured.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      parse_mode: "HTML",
      text: formatApplicationTelegramMessage(payload),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(`Telegram request failed: ${response.status} ${responseText}`);
  }
}

export function formatApplicationTelegramMessage(
  payload: ApplicationTelegramPayload,
) {
  const lines = [
    buildHeadline(payload),
    `👤 Имя: ${escapeTelegramHtml(payload.name)}`,
    `📞 Телефон: ${escapeTelegramHtml(payload.phone)}`,
  ];

  if (payload.preferredContact) {
    lines.push(
      `💬 Способ связи: ${CONTACT_LABEL[payload.preferredContact]}`,
    );
  }

  if (payload.preferredContact === "telegram" && payload.telegramUsername) {
    lines.push(`✈️ Telegram: @${escapeTelegramHtml(payload.telegramUsername)}`);
  }

  lines.push(
    `🏢 Проект: ${escapeTelegramHtml(payload.project)}`,
    `📍 Город: ${escapeTelegramHtml(payload.city)}`,
    `💼 Вакансия: ${escapeTelegramHtml(payload.vacancyTitle)}`,
  );

  if (payload.previousApplication) {
    const previous = payload.previousApplication;

    lines.push(
      `↩️ Прошлый отклик: ${formatDate(previous.createdAt)} · ` +
        `${escapeTelegramHtml(previous.vacancyTitle)} · ` +
        `${escapeTelegramHtml(previous.statusLabel)}`,
    );
  }

  return lines.join("\n");
}

// Ловушка тревожнее дубля, поэтому при совпадении показываем её.
function buildHeadline(payload: ApplicationTelegramPayload) {
  if (payload.suspectedSpam) {
    return "🟡 <b>Новый отклик</b> — сработала антиспам-ловушка, проверьте вручную";
  }

  if (payload.previousApplication) {
    return "🔁 <b>Повторный отклик</b> — телефон уже есть в базе, заведён как дубль";
  }

  return "🟢 <b>Новый отклик</b>";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(value);
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
