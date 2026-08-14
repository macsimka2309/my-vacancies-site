-- Предпочтительный способ связи и ник в Telegram (если выбран Telegram).
ALTER TABLE "applications" ADD COLUMN "preferred_contact" TEXT;
ALTER TABLE "applications" ADD COLUMN "telegram_username" TEXT;
