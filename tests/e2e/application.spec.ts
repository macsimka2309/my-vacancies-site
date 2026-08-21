import { expect, test } from "@playwright/test";

// Форма отклика встроена в карточку (п. 7): модалки больше нет, первый шаг —
// только телефон, имя и канал связи спрашиваются уже после отправки.
test.describe("Отклик на вакансию", () => {
  test("на главной есть вакансии и поле телефона прямо в карточке", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Вакансии" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Ваш телефон").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Откликнуться" }).first(),
    ).toBeVisible();
  });

  test("согласие появляется, когда человек взялся за телефон", async ({
    page,
  }) => {
    await page.goto("/");

    const form = page.locator("form.inline-apply").first();
    const consent = form.locator('input[type="checkbox"]');

    await expect(consent).toHaveCount(0);

    await form.getByPlaceholder("Ваш телефон").fill("9991234567");

    await expect(consent).toBeVisible();
  });

  test("нельзя отправить без согласия", async ({ page }) => {
    await page.goto("/");

    const form = page.locator("form.inline-apply").first();

    await form.getByPlaceholder("Ваш телефон").fill("9991234567");

    await expect(
      form.getByRole("button", { name: "Откликнуться" }),
    ).toBeDisabled();
  });

  test("успешная отправка, имя спрашивается после", async ({ page }) => {
    await page.goto("/");

    const form = page.locator("form.inline-apply").first();

    await form.getByPlaceholder("Ваш телефон").fill("9991234567");
    await form.locator('input[type="checkbox"]').check();
    await form.getByRole("button", { name: "Откликнуться" }).click();

    const done = page.locator(".inline-apply--done").first();

    await expect(done.getByText("Отклик принят.")).toBeVisible();
    // Имя — второй шаг: до отправки его не спрашивали.
    await expect(done.getByPlaceholder("Имя")).toBeVisible();
  });
});
