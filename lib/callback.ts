import { site } from "./site";

// Час по Москве. Считаем явно в Europe/Moscow, чтобы серверный и клиентский
// рендер совпали независимо от часового пояса посетителя.
function moscowHour(now: Date) {
  const hour = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "numeric",
    hour12: false,
  }).format(now);

  return Number(hour);
}

/**
 * Обещание обратной связи под текущее время: днём — быстрый звонок,
 * ночью — звонок утром. Обещать ночной звонок нечестно, а невыполненное
 * обещание бьёт по доверию сильнее, чем осторожная формулировка.
 */
export function getCallbackPromise(now: Date = new Date()) {
  const hour = moscowHour(now);
  const isWorkingHours =
    hour >= site.callback.fromHour && hour < site.callback.toHour;

  return isWorkingHours
    ? site.callback.duringHours
    : site.callback.afterHours;
}
