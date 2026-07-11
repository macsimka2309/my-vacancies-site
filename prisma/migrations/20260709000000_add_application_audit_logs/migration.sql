CREATE TABLE "application_audit_logs" (
  "id" TEXT NOT NULL,
  "application_id" TEXT NOT NULL,
  "admin_user_id" TEXT NOT NULL,
  "actor_username" TEXT NOT NULL,
  "previous_status" "LeadStatus",
  "new_status" "LeadStatus",
  "previous_manager_comment" TEXT,
  "new_manager_comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "application_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_audit_logs_application_id_idx"
  ON "application_audit_logs"("application_id");
CREATE INDEX "application_audit_logs_admin_user_id_idx"
  ON "application_audit_logs"("admin_user_id");
CREATE INDEX "application_audit_logs_created_at_idx"
  ON "application_audit_logs"("created_at");

ALTER TABLE "application_audit_logs"
  ADD CONSTRAINT "application_audit_logs_application_id_fkey"
  FOREIGN KEY ("application_id")
  REFERENCES "applications"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "application_audit_logs"
  ADD CONSTRAINT "application_audit_logs_admin_user_id_fkey"
  FOREIGN KEY ("admin_user_id")
  REFERENCES "admin_users"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
