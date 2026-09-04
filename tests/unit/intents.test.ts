import { describe, expect, it } from "vitest";
import {
  getIntent,
  INTENT_SLUGS,
  type IntentStats,
} from "@/lib/intents";

function buildStats(overrides: Partial<IntentStats> = {}): IntentStats {
  return {
    count: 10,
    cities: 10,
    shiftLow: 2240,
    shiftHigh: 6000,
    periodLow: 62_000,
    periodHigh: 168_000,
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("лендинги под интенты", () => {
  it("все слаги разрешаются в страницу", () => {
    for (const slug of INTENT_SLUGS) {
      expect(getIntent(slug)).not.toBeNull();
    }
  });

  it("неизвестный слаг не открывается", () => {
    expect(getIntent("rabota-mechty")).toBeNull();
    expect(getIntent("")).toBeNull();
  });

  it("заголовки помещаются в выдачу", () => {
    for (const slug of INTENT_SLUGS) {
      const intent = getIntent(slug)!;

      expect(intent.title.length).toBeLessThanOrEqual(60);
      expect(intent.description.length).toBeLessThanOrEqual(160);
    }
  });

  it("у каждой страницы есть вопросы и ответы", () => {
    for (const slug of INTENT_SLUGS) {
      const faq = getIntent(slug)!.faq(buildStats());

      expect(faq.length).toBeGreaterThanOrEqual(3);
      for (const item of faq) {
        expect(item.question.length).toBeGreaterThan(10);
        expect(item.answer.length).toBeGreaterThan(20);
      }
    }
  });

  // «доход до 11 000 ₽» — это верх самой щедрой вакансии набора,
  // и читается он как обещание, которого никто не давал (п. 9).
  it("доход показывается диапазоном, а не одним максимумом", () => {
    // Intl разделяет разряды неразрывным пробелом — сравниваем по смыслу.
    const lead = plain(getIntent("vahta")!.lead(buildStats()));

    expect(lead).toContain("доход от 2 240 до 6 000 ₽ за смену");
    expect(lead).not.toMatch(/доход до /);
  });

  it("одна и та же сумма не превращается в диапазон", () => {
    const lead = plain(
      getIntent("vahta")!.lead(
        buildStats({
          shiftLow: 5000,
          shiftHigh: 5000,
          periodLow: null,
          periodHigh: null,
        }),
      ),
    );

    expect(lead).toContain("доход 5 000 ₽ за смену");
  });

  // Пустые суммы — обычное дело: «по договорённости» есть в каталоге.
  it("молчит про доход, когда сумм нет", () => {
    const lead = getIntent("rabota-na-svoem-avto")!.lead(
      buildStats({ shiftLow: null, shiftHigh: null }),
    );

    expect(lead).not.toContain("₽");
    expect(lead).toContain("права категории B");
  });

  it("согласует числительные с существительными", () => {
    const one = getIntent("vahta")!.lead(buildStats({ cities: 1 }));
    const few = getIntent("vahta")!.lead(buildStats({ cities: 2 }));

    expect(one).toContain("в 1 городе");
    expect(few).toContain("в 2 городах");
  });

  // Лендинг описывает работу, а не наш каталог: «159 из 169» — разговор
  // про внутреннее устройство сайта, человеку он ничего не говорит.
  it("не ссылается на размер каталога", () => {
    for (const slug of INTENT_SLUGS) {
      const intent = getIntent(slug)!;
      const text = [
        intent.lead(buildStats()),
        ...intent.faq(buildStats()).map((item) => item.answer),
      ].join(" ");

      expect(text).not.toMatch(/из \d+/);
      expect(text).not.toContain("каталог");
    }
  });

  // Страница про ежедневные выплаты не должна обещать их всем.
  it("не обещает ежедневные выплаты всем", () => {
    const intent = getIntent("ezhednevnye-vyplaty")!;
    const stats = buildStats();

    expect(intent.lead(stats)).toContain("базовый режим — выплаты раз в неделю");
    expect(intent.faq(stats)[0].answer).toMatch(/^Нет\./);
  });
});

function plain(value: string) {
  return value.replace(/\s/g, " ");
}
