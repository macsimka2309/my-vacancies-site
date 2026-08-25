-- Журнал изменений хранил только статус и примечание. Правка имени и города
-- (п. 40) без этих колонок не попадала бы в историю вовсе, а город — разрез
-- всей отчётности, и «кто его поменял» должно иметь ответ.
ALTER TABLE "application_audit_logs"
  ADD COLUMN "previous_candidate_name" TEXT,
  ADD COLUMN "new_candidate_name" TEXT,
  ADD COLUMN "previous_city" TEXT,
  ADD COLUMN "new_city" TEXT;
