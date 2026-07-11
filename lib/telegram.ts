type ApplicationTelegramPayload = {
  name: string;
  phone: string;
  project: string;
  city: string;
  vacancyTitle: string;
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
  return [
    "🟢 <b>Новый отклик</b>",
    `👤 Имя: ${escapeTelegramHtml(payload.name)}`,
    `📞 Телефон: ${escapeTelegramHtml(payload.phone)}`,
    `🏢 Проект: ${escapeTelegramHtml(payload.project)}`,
    `📍 Город: ${escapeTelegramHtml(payload.city)}`,
    `💼 Вакансия: ${escapeTelegramHtml(payload.vacancyTitle)}`,
  ].join("\n");
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
