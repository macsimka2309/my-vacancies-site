import { expect, test } from "@playwright/test";

test.describe("Админка: вход", () => {
  test("показывает форму входа", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Вход" })).toBeVisible();
    await expect(page.getByLabel("Логин")).toBeVisible();
    await expect(page.getByLabel("Пароль")).toBeVisible();
  });

  test("отклоняет неверные логин/пароль", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Логин").fill("nobody");
    await page.getByLabel("Пароль").fill("wrong-password");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page.getByText("Неверный логин или пароль.")).toBeVisible();
  });
});
