CREATE TYPE "LeadStatus" AS ENUM (
  'NEW',
  'IN_PROGRESS',
  'NO_ANSWER',
  'INTERVIEW_DONE',
  'FIT',
  'NOT_FIT',
  'SENT_TO_CLIENT',
  'ACCEPTED',
  'CANDIDATE_REFUSED',
  'DUPLICATE'
);

CREATE TABLE "vacancies" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "project" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "work_format" TEXT NOT NULL,
  "salary" TEXT,
  "schedule" TEXT,
  "responsibilities" TEXT NOT NULL,
  "requirements" TEXT NOT NULL,
  "conditions" TEXT NOT NULL,
  "address" TEXT,
  "contact_comment" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "vacancies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applications" (
  "id" TEXT NOT NULL,
  "vacancy_id" TEXT NOT NULL,
  "vacancy_title_snapshot" TEXT NOT NULL,
  "project_snapshot" TEXT NOT NULL,
  "candidate_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "normalized_phone" TEXT NOT NULL,
  "city" TEXT,
  "age" INTEGER,
  "candidate_comment" TEXT,
  "traffic_source" TEXT,
  "utm_source" TEXT,
  "utm_medium" TEXT,
  "utm_campaign" TEXT,
  "utm_content" TEXT,
  "utm_term" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "responsible_manager" TEXT,
  "manager_comment" TEXT,
  "telegram_sent_at" TIMESTAMP(3),
  "telegram_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vacancies_slug_key" ON "vacancies"("slug");
CREATE INDEX "vacancies_city_idx" ON "vacancies"("city");
CREATE INDEX "vacancies_is_active_idx" ON "vacancies"("is_active");
CREATE INDEX "applications_created_at_idx" ON "applications"("created_at");
CREATE INDEX "applications_normalized_phone_idx" ON "applications"("normalized_phone");
CREATE INDEX "applications_status_idx" ON "applications"("status");
CREATE INDEX "applications_vacancy_id_idx" ON "applications"("vacancy_id");

ALTER TABLE "applications"
  ADD CONSTRAINT "applications_vacancy_id_fkey"
  FOREIGN KEY ("vacancy_id")
  REFERENCES "vacancies"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
