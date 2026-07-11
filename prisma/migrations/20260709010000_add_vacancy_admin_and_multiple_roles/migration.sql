ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'VACANCY_ADMIN';

ALTER TABLE "admin_users"
  ADD COLUMN "full_name" TEXT,
  ADD COLUMN "roles" "AdminRole"[] NOT NULL
    DEFAULT ARRAY['MANAGER']::"AdminRole"[];

UPDATE "admin_users"
SET "roles" = ARRAY["role"]::"AdminRole"[];

DROP INDEX IF EXISTS "admin_users_role_idx";

ALTER TABLE "admin_users"
  DROP COLUMN "role";
