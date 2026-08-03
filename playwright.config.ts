import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Нужно для запуска Chromium в контейнерах CI (под root).
        launchOptions: { args: ["--no-sandbox"] },
      },
    },
  ],
  webServer: {
    // Прод-режим: гидратация надёжнее dev, поведение ближе к бою.
    // Сборка (pnpm build) должна быть выполнена заранее (в CI/скрипте).
    command: "pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
