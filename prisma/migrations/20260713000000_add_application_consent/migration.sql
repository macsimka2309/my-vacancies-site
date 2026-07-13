-- Фиксируем факт согласия на обработку персональных данных (152-ФЗ).
ALTER TABLE "applications"
  ADD COLUMN "personal_data_consent_at" TIMESTAMP(3);
