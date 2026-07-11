CREATE TYPE "AdminRole" AS ENUM (
  'ADMIN',
  'MANAGER'
);

CREATE TABLE "admin_users" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'MANAGER',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");
CREATE INDEX "admin_users_role_idx" ON "admin_users"("role");
CREATE INDEX "admin_users_is_active_idx" ON "admin_users"("is_active");

INSERT INTO "admin_users" (
  "id",
  "username",
  "password_hash",
  "role",
  "is_active",
  "created_at",
  "updated_at"
) VALUES (
  'admin_seed_user',
  'admin',
  'scrypt:v1:16384:8:1:iRVvGg5fhkmC-AFO_atc7g:kyiLl_xMKa_rO77KhZxnccvt8JsQ3fyrzdw5pLBKp3rlz_uolau2W9DGhvYro6AHg4eX0uNxLuOqMmi-Ih-0vQ',
  'ADMIN',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("username") DO NOTHING;
