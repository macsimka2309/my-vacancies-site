import { describe, expect, it } from "vitest";
import { buildWebPageJsonLd } from "@/lib/site-jsonld";
import { site } from "@/lib/site";

describe("buildWebPageJsonLd", () => {
  it("собирает абсолютный url и dateModified из даты правки данных", () => {
    const jsonLd = buildWebPageJsonLd(
      "/rabota/tver",
      new Date("2026-08-25T09:30:00.000Z"),
    );

    expect(jsonLd.url).toBe(`${site.url}/rabota/tver`);
    expect(jsonLd["@id"]).toBe(`${site.url}/rabota/tver#webpage`);
    expect(jsonLd.dateModified).toBe("2026-08-25T09:30:00.000Z");
  });

  it("принимает дату строкой — так она приходит после unstable_cache", () => {
    const jsonLd = buildWebPageJsonLd(
      "/vahta",
      "2026-08-20T00:00:00.000Z",
    );

    expect(jsonLd.dateModified).toBe("2026-08-20T00:00:00.000Z");
  });
});
