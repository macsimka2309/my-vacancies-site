import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pingIndexNow } from "@/lib/indexnow";
import { site } from "@/lib/site";

describe("ключ IndexNow", () => {
  // Поисковик признаёт уведомление, только если по адресу /<ключ>.txt лежит
  // файл с этим же значением. Разъедутся — уведомления начнут отбиваться
  // с 403, и молча: на сайте это никак не проявится.
  it("совпадает с файлом в public/", () => {
    const keyFile = join(process.cwd(), "public", `${site.indexNowKey}.txt`);

    expect(readFileSync(keyFile, "utf8").trim()).toBe(site.indexNowKey);
  });

  it("подходит протоколу по формату", () => {
    expect(site.indexNowKey).toMatch(/^[a-zA-Z0-9-]{8,128}$/);
  });
});

describe("pingIndexNow", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // Локальная правка не должна просить поисковик переобойти прод.
  it("молчит вне продакшена", async () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(await pingIndexNow(["/vacancies/test"])).toEqual({
      sent: false,
      reason: "выключено вне продакшена",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("отправляет абсолютные адреса и ключ", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = await pingIndexNow(["/vacancies/kurer-tver", "/"]);

    expect(result).toEqual({ sent: true, status: 200, urls: 2 });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(String(options?.body));

    expect(body).toMatchObject({
      host: "my-dream-vacancy.ru",
      key: site.indexNowKey,
      keyLocation: `${site.url}/${site.indexNowKey}.txt`,
      urlList: [
        "https://my-dream-vacancy.ru/vacancies/kurer-tver",
        "https://my-dream-vacancy.ru/",
      ],
    });
  });

  it("не отправляет один адрес дважды", async () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(await pingIndexNow(["/", "/", "/"])).toMatchObject({ urls: 1 });
  });

  it("ничего не отправляет по пустому списку", async () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(await pingIndexNow([])).toEqual({
      sent: false,
      reason: "нечего отправлять",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  // Правка вакансии в админке не должна падать из-за стороннего сервиса.
  it("не бросает исключение, когда поисковик недоступен", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    expect(await pingIndexNow(["/"])).toEqual({
      sent: false,
      reason: "network down",
    });
  });

  it("переживает отказ поисковика без исключения", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );

    expect(await pingIndexNow(["/"])).toMatchObject({
      sent: true,
      status: 403,
    });
  });
});
