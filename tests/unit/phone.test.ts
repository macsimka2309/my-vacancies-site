import { describe, expect, it } from "vitest";
import { normalizeRuPhone } from "@/lib/phone";

describe("normalizeRuPhone", () => {
  it("нормализует 10 цифр в +7…", () => {
    expect(normalizeRuPhone("9991234567")).toBe("+79991234567");
  });

  it("приводит 11 цифр с ведущей 8 к +7…", () => {
    expect(normalizeRuPhone("89991234567")).toBe("+79991234567");
  });

  it("приводит 11 цифр с ведущей 7 к +7…", () => {
    expect(normalizeRuPhone("79991234567")).toBe("+79991234567");
  });

  it("игнорирует форматирование (скобки, пробелы, дефисы, плюс)", () => {
    expect(normalizeRuPhone("+7 (999) 123-45-67")).toBe("+79991234567");
    expect(normalizeRuPhone("8 999 123 45 67")).toBe("+79991234567");
  });

  it("отклоняет слишком короткие/длинные и невалидные номера", () => {
    expect(normalizeRuPhone("")).toBeNull();
    expect(normalizeRuPhone("123")).toBeNull();
    expect(normalizeRuPhone("999123456")).toBeNull(); // 9 цифр
    expect(normalizeRuPhone("199912345678")).toBeNull(); // 12 цифр
    expect(normalizeRuPhone("59991234567")).toBeNull(); // 11 цифр не с 7/8
  });

  // Раньше маска на клиенте переписывала иностранный номер под +7:
  // «+998 90 123 45 67» превращался в «+7 (998) 901-23-45» — валидный,
  // но чужой номер, и рекрутёр звонил не туда.
  it("принимает номера стран СНГ и не переписывает их под +7", () => {
    expect(normalizeRuPhone("+998 90 123 45 67")).toBe("+998901234567");
    expect(normalizeRuPhone("+996 555 12 34 56")).toBe("+996555123456");
    expect(normalizeRuPhone("+375 29 123 45 67")).toBe("+375291234567");
    expect(normalizeRuPhone("+992 90 123 45 67")).toBe("+992901234567");
  });

  it("не путает казахстанский +7 с российским", () => {
    expect(normalizeRuPhone("+7 701 234 56 78")).toBe("+77012345678");
  });

  it("отклоняет неизвестный код страны", () => {
    expect(normalizeRuPhone("+441234567890")).toBeNull();
  });
});
