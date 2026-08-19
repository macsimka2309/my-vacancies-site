// Нормализация телефона к формату E.164 (+код и цифры).
//
// Раньше здесь принимались только российские номера, а клиентская маска
// молча переписывала иностранные под +7 — заявка проходила проверку с чужим
// номером. Теперь российские приводим к +7, остальные принимаем как есть,
// проверяя только правдоподобность длины.

/** Коды стран, откуда к нам реально приходят кандидаты. */
const ALLOWED_COUNTRY_CODES = [
  "7", // Россия, Казахстан
  "375", // Беларусь
  "380", // Украина
  "992", // Таджикистан
  "993", // Туркменистан
  "994", // Азербайджан
  "995", // Грузия
  "996", // Киргизия
  "998", // Узбекистан
  "374", // Армения
  "373", // Молдова
];

export function normalizeRuPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  // Российские формы: 10 цифр без кода, 8XXXXXXXXXX, 7XXXXXXXXXX.
  if (digits.length === 10 && digits.startsWith("9")) {
    return `+7${digits}`;
  }

  if (digits.length === 11 && (digits.startsWith("8") || digits.startsWith("7"))) {
    return `+7${digits.slice(1)}`;
  }

  // Иностранный номер: код страны из списка и правдоподобная длина.
  const countryCode = ALLOWED_COUNTRY_CODES.filter((code) => code !== "7").find(
    (code) => digits.startsWith(code),
  );

  if (countryCode) {
    const national = digits.slice(countryCode.length);

    if (national.length >= 7 && national.length <= 12) {
      return `+${digits}`;
    }
  }

  return null;
}
