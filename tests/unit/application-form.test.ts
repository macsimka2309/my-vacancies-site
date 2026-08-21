import { describe, expect, it } from "vitest";
import { parseManualApplicationForm } from "@/lib/application-form";
import {
  getTrafficSourceLabel,
  toTrafficSource,
} from "@/lib/application-source";

function buildForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields: Record<string, string> = {
    vacancyId: "clv0vacancy0001",
    phone: "+7 999 123-45-67",
    source: "telegram",
    consent: "on",
    ...overrides,
  };

  for (const [field, value] of Object.entries(fields)) {
    if (value !== "") {
      formData.set(field, value);
    }
  }

  return formData;
}

describe("parseManualApplicationForm", () => {
  it("принимает минимальный набор полей", () => {
    expect(parseManualApplicationForm(buildForm())).toMatchObject({
      data: {
        candidateName: "Без имени",
        normalizedPhone: "+79991234567",
        preferredContact: "phone",
        source: "telegram",
        vacancyId: "clv0vacancy0001",
      },
    });
  });

  // Тот же нормализатор, что и на сайте: иначе один человек попадёт в базу
  // в двух написаниях, и проверка дублей его не поймает.
  it("нормализует телефон так же, как форма сайта", () => {
    expect(
      parseManualApplicationForm(buildForm({ phone: "8 999 123 45 67" })),
    ).toMatchObject({ data: { normalizedPhone: "+79991234567" } });
  });

  it("не переписывает номера стран СНГ под +7", () => {
    expect(
      parseManualApplicationForm(buildForm({ phone: "+998 90 123 45 67" })),
    ).toMatchObject({ data: { normalizedPhone: "+998901234567" } });
  });

  it("отвергает нераспознанный телефон", () => {
    expect(parseManualApplicationForm(buildForm({ phone: "123" }))).toEqual({
      error: "phone",
    });
  });

  // Согласие подтверждает менеджер — подставлять его молча нельзя.
  it("не создаёт отклик без подтверждения согласия", () => {
    const form = buildForm();
    form.delete("consent");

    expect(parseManualApplicationForm(form)).toEqual({ error: "consent" });
  });

  it("требует источник из списка", () => {
    expect(
      parseManualApplicationForm(buildForm({ source: "avito" })),
    ).toEqual({ error: "source" });
  });

  it("требует ник, если связь через Telegram", () => {
    expect(
      parseManualApplicationForm(
        buildForm({ preferredContact: "telegram" }),
      ),
    ).toEqual({ error: "telegram" });
  });

  it("убирает собачку из ника", () => {
    expect(
      parseManualApplicationForm(
        buildForm({ preferredContact: "telegram", telegramUsername: "@ivan" }),
      ),
    ).toMatchObject({ data: { telegramUsername: "ivan" } });
  });

  // Ник от другого способа связи только путал бы менеджера при звонке.
  it("не сохраняет ник, если связь не через Telegram", () => {
    expect(
      parseManualApplicationForm(
        buildForm({ preferredContact: "phone", telegramUsername: "@ivan" }),
      ),
    ).toMatchObject({ data: { telegramUsername: null } });
  });

  it("отвергает слишком длинный комментарий", () => {
    expect(
      parseManualApplicationForm(
        buildForm({ candidateComment: "я".repeat(2001) }),
      ),
    ).toEqual({ error: "invalid" });
  });

  it("требует вакансию", () => {
    const form = buildForm();
    form.delete("vacancyId");

    expect(parseManualApplicationForm(form)).toEqual({ error: "invalid" });
  });
});

describe("источник отклика", () => {
  // Без префикса ручные отклики смешаются с органическими в отчёте
  // по каналам, и первый же вывод будет неверным.
  it("помечает ручные отклики префиксом", () => {
    expect(toTrafficSource("telegram")).toBe("manual:telegram");
  });

  it("показывает ручной источник с пометкой", () => {
    expect(getTrafficSourceLabel("manual:max")).toBe(
      "Написал в MAX · вручную",
    );
  });

  it("не трогает источники с сайта", () => {
    expect(getTrafficSourceLabel("yandex")).toBe("yandex");
    expect(getTrafficSourceLabel(null)).toBe("Не указан");
  });
});
