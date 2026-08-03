import { expect, test } from "@playwright/test";

test.describe("Отклик на вакансию", () => {
  test("на главной есть вакансии и кнопка отклика", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Вакансии" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Откликнуться" }).first(),
    ).toBeVisible();
  });

  test("успешная отправка отклика", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Откликнуться" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator('input[name="name"]').fill("Тест Тестов");
    await dialog.locator('input[name="phone"]').fill("9991234567");
    await dialog.locator('input[name="consent"]').check();
    await dialog.getByRole("button", { name: "Отправить" }).click();

    await expect(dialog.getByText("Спасибо, отклик отправлен!")).toBeVisible();
  });

  test("нельзя отправить без согласия", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Откликнуться" }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator('input[name="name"]').fill("Тест");
    await dialog.locator('input[name="phone"]').fill("9991234567");

    await expect(
      dialog.getByRole("button", { name: "Отправить" }),
    ).toBeDisabled();
  });
});
