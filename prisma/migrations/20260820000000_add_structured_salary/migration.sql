-- Структурные поля зарплаты. Раньше сумма жила только строкой («до 5000 ₽
-- за смену · от 90 000 ₽/мес»), и каждый потребитель разбирал её по-своему:
-- в микроразметку уходила минимальная сумма с меткой «в месяц», а фильтр
-- «за вахту» не видел вакансии с месячным доходом. Строка остаётся витринной,
-- числа становятся источником для фильтра, разметки и выгрузки в агрегаторы.

CREATE TYPE "SalaryPeriod" AS ENUM ('MONTH', 'VAHTA');

ALTER TABLE "vacancies" ADD COLUMN "salary_shift_min" INTEGER;
ALTER TABLE "vacancies" ADD COLUMN "salary_shift_max" INTEGER;
ALTER TABLE "vacancies" ADD COLUMN "salary_shift_avg" INTEGER;
ALTER TABLE "vacancies" ADD COLUMN "salary_period_min" INTEGER;
ALTER TABLE "vacancies" ADD COLUMN "salary_period_max" INTEGER;
ALTER TABLE "vacancies" ADD COLUMN "salary_period" "SalaryPeriod";

-- Разовое заполнение уже существующих вакансий из витринной строки.
-- Дальше числа пересчитываются при каждом сохранении вакансии в админке
-- (lib/salary.ts), поэтому эта логика здесь нужна ровно один раз.
--
-- Формы, которые встречаются в данных:
--   «2650–5300 ₽ за смену»            → вилка
--   «до 4300 ₽ за смену»              → только верхняя граница
--   «от 4200 ₽ за смену»              → только нижняя граница
--   «от 100 000 ₽/мес»                → совокупный доход за месяц
--   «62 000–125 000 ₽ за вахту»       → совокупный доход за вахту
--   «по договорённости»               → период не назван, оставляем NULL
UPDATE "vacancies"
SET
  "salary_shift_min" = COALESCE(
    NULLIF(replace((regexp_match("salary", '(\d[\d ]*\d|\d) *– *(\d[\d ]*\d|\d) *(?:₽|руб\.?) *за смену'))[1], ' ', ''), '')::int,
    NULLIF(replace((regexp_match("salary", 'от +(\d[\d ]*\d|\d) *(?:₽|руб\.?) *за смену'))[1], ' ', ''), '')::int
  ),
  "salary_shift_max" = COALESCE(
    NULLIF(replace((regexp_match("salary", '(\d[\d ]*\d|\d) *– *(\d[\d ]*\d|\d) *(?:₽|руб\.?) *за смену'))[2], ' ', ''), '')::int,
    NULLIF(replace((regexp_match("salary", 'до +(\d[\d ]*\d|\d) *(?:₽|руб\.?) *за смену'))[1], ' ', ''), '')::int
  ),
  "salary_period_min" = COALESCE(
    NULLIF(replace((regexp_match("salary", '(\d[\d ]*\d|\d) *– *(\d[\d ]*\d|\d) *(?:₽|руб\.?) *(?:/ *мес|в +мес|за вахту)'))[1], ' ', ''), '')::int,
    NULLIF(replace((regexp_match("salary", 'от +(\d[\d ]*\d|\d) *(?:₽|руб\.?) *(?:/ *мес|в +мес|за вахту)'))[1], ' ', ''), '')::int
  ),
  "salary_period_max" = COALESCE(
    NULLIF(replace((regexp_match("salary", '(\d[\d ]*\d|\d) *– *(\d[\d ]*\d|\d) *(?:₽|руб\.?) *(?:/ *мес|в +мес|за вахту)'))[2], ' ', ''), '')::int,
    NULLIF(replace((regexp_match("salary", 'до +(\d[\d ]*\d|\d) *(?:₽|руб\.?) *(?:/ *мес|в +мес|за вахту)'))[1], ' ', ''), '')::int
  ),
  "salary_period" = CASE
    WHEN "salary" ~ 'за вахту' THEN 'VAHTA'::"SalaryPeriod"
    WHEN "salary" ~ 'мес' THEN 'MONTH'::"SalaryPeriod"
  END
WHERE "salary" IS NOT NULL;

-- Период без суммы (и наоборот) смысла не имеет.
UPDATE "vacancies"
SET "salary_period" = NULL
WHERE "salary_period_min" IS NULL AND "salary_period_max" IS NULL;
