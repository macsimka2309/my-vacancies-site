-- Замена набора статусов (решение владельца 26.08).
--
-- Перенос старых значений в новые. Три случая, где соответствия нет один
-- в один, и решение принято осознанно:
--   NEW              -> IN_PROGRESS   отдельного «нового» больше нет
--   NO_ANSWER        -> IN_PROGRESS   не дозвонились — лид живой, просто не дошли
--   INTERVIEW_DONE   -> IN_PROGRESS   промежуточный этап, в новом наборе не выделен
--
-- Остальные ложатся естественно:
--   FIT, SENT_TO_CLIENT -> TO_INTERNSHIP
--   ACCEPTED            -> INTERNSHIP_STARTED
--   NOT_FIT, CANDIDATE_REFUSED -> REJECTED
--   DUPLICATE           -> DUPLICATE
--
-- Тип меняется во всех трёх колонках: статус отклика и обе колонки журнала
-- изменений. Если пропустить журнал, старый тип не удалится, а история
-- останется со значениями, которых больше нет в коде.

CREATE TYPE "LeadStatus_new" AS ENUM (
  'IN_PROGRESS',
  'INTERVIEW_MOVED',
  'RESERVE',
  'REJECTED',
  'TO_INTERNSHIP',
  'INTERNSHIP_STARTED',
  'DEAL_CLOSED',
  'DUPLICATE'
);

-- Значение по умолчанию ссылается на старый тип и мешает смене.
ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "applications"
  ALTER COLUMN "status" TYPE "LeadStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'IN_PROGRESS'
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
      WHEN 'NO_ANSWER' THEN 'IN_PROGRESS'
      WHEN 'INTERVIEW_DONE' THEN 'IN_PROGRESS'
      WHEN 'FIT' THEN 'TO_INTERNSHIP'
      WHEN 'SENT_TO_CLIENT' THEN 'TO_INTERNSHIP'
      WHEN 'ACCEPTED' THEN 'INTERNSHIP_STARTED'
      WHEN 'NOT_FIT' THEN 'REJECTED'
      WHEN 'CANDIDATE_REFUSED' THEN 'REJECTED'
      WHEN 'DUPLICATE' THEN 'DUPLICATE'
    END
  )::"LeadStatus_new";

-- NULL проходит через CASE как NULL — обе колонки журнала необязательные.
ALTER TABLE "application_audit_logs"
  ALTER COLUMN "previous_status" TYPE "LeadStatus_new"
  USING (
    CASE "previous_status"::text
      WHEN 'NEW' THEN 'IN_PROGRESS'
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
      WHEN 'NO_ANSWER' THEN 'IN_PROGRESS'
      WHEN 'INTERVIEW_DONE' THEN 'IN_PROGRESS'
      WHEN 'FIT' THEN 'TO_INTERNSHIP'
      WHEN 'SENT_TO_CLIENT' THEN 'TO_INTERNSHIP'
      WHEN 'ACCEPTED' THEN 'INTERNSHIP_STARTED'
      WHEN 'NOT_FIT' THEN 'REJECTED'
      WHEN 'CANDIDATE_REFUSED' THEN 'REJECTED'
      WHEN 'DUPLICATE' THEN 'DUPLICATE'
    END
  )::"LeadStatus_new";

ALTER TABLE "application_audit_logs"
  ALTER COLUMN "new_status" TYPE "LeadStatus_new"
  USING (
    CASE "new_status"::text
      WHEN 'NEW' THEN 'IN_PROGRESS'
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
      WHEN 'NO_ANSWER' THEN 'IN_PROGRESS'
      WHEN 'INTERVIEW_DONE' THEN 'IN_PROGRESS'
      WHEN 'FIT' THEN 'TO_INTERNSHIP'
      WHEN 'SENT_TO_CLIENT' THEN 'TO_INTERNSHIP'
      WHEN 'ACCEPTED' THEN 'INTERNSHIP_STARTED'
      WHEN 'NOT_FIT' THEN 'REJECTED'
      WHEN 'CANDIDATE_REFUSED' THEN 'REJECTED'
      WHEN 'DUPLICATE' THEN 'DUPLICATE'
    END
  )::"LeadStatus_new";

ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "LeadStatus_old";

ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
