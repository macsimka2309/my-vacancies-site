type ApplicationTelegramPayload = {
  name: string;
  phone: string;
  project: string;
  city: string;
  vacancyTitle: string;
  preferredContact?: "phone" | "telegram" | "max";
  telegramUsername?: string;
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

function formatApplicationTelegramMessage(payload: ApplicationTelegramPayload) {
  const lines = [
    "🟢 <b>Новый отклик</b>",
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

  return lines.join("\n");
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
