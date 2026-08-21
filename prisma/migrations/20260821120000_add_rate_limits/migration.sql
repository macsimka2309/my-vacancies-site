-- Окна ограничителя частоты запросов переезжают из памяти процесса в базу.
--
-- Раньше счётчики жили в `new Map()` внутри процесса: каждый деплой обнулял
-- их, а при нескольких репликах приложения защита формы исчезала вовсе —
-- у каждой реплики был свой счёт, и лимит умножался на их число.
CREATE TABLE "rate_limits" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "reset_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- Для уборки протухших окон.
CREATE INDEX "rate_limits_reset_at_idx" ON "rate_limits"("reset_at");
