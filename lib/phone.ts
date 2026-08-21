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

/**
 * Маска телефона. Российский номер приводим к читаемому виду, иностранный
 * оставляем как ввели: раньше маска молча переписывала «+998 90 …» в
 * валидный, но чужой российский номер (п. 18).
 */
export function formatPhone(value: string) {
  const hasPlus = value.trimStart().startsWith("+");
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (!isRussianNumber(digits, hasPlus)) {
    // Иностранный номер не переписываем — оставляем как ввёл человек.
    return `+${digits.slice(0, 15)}`;
  }

  const nationalDigits = getNationalDigits(digits).slice(0, 10);
  const parts = [
    nationalDigits.slice(0, 3),
    nationalDigits.slice(3, 6),
    nationalDigits.slice(6, 8),
    nationalDigits.slice(8, 10),
  ];

  if (!nationalDigits) {
    return "";
  }

  let formattedPhone = `+7 (${parts[0]}`;

  if (parts[0].length === 3) {
    formattedPhone += ")";
  }

  if (parts[1]) {
    formattedPhone += ` ${parts[1]}`;
  }

  if (parts[2]) {
    formattedPhone += `-${parts[2]}`;
  }

  if (parts[3]) {
    formattedPhone += `-${parts[3]}`;
  }

  return formattedPhone;
}

function getNationalDigits(digits: string) {
  if (digits.startsWith("7") || digits.startsWith("8")) {
    return digits.slice(1);
  }

  return digits;
}

function isRussianNumber(digits: string, hasPlus: boolean) {
  if (digits.startsWith("7") || digits.startsWith("8")) {
    return true;
  }

  return !hasPlus && digits.startsWith("9") && digits.length <= 10;
}
