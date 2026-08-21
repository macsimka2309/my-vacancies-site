import { db } from "./db";
import type { LeadStatusValue } from "./lead-status";

/**
 * Повторный отклик — телефон уже есть в базе.
 *
 * Такие заявки приходят постоянно: человек откликается на несколько вакансий
 * подряд или просто забывает, что уже оставлял телефон. Менеджер узнавал об
 * этом, только когда звонил, — то есть после потраченного звонка.
 *
 * Теперь повторный отклик сразу заводится со статусом «Дубль». Статус можно
 * поменять руками: правило простое (тот же нормализованный телефон) и не
 * знает, откликнулся человек на другую вакансию или продублировал ту же.
 */
export type PreviousApplication = {
  createdAt: Date;
  status: string;
  vacancyTitle: string;
};

export type DuplicateCheck = {
  isDuplicate: boolean;
  previous: PreviousApplication | null;
};

export async function checkDuplicateByPhone(
  normalizedPhone: string,
): Promise<DuplicateCheck> {
  const previous = await db.application.findFirst({
    where: {
      normalizedPhone,
    },
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    select: {
      createdAt: true,
      status: true,
      vacancyTitleSnapshot: true,
    },
  });

  if (!previous) {
    return { isDuplicate: false, previous: null };
  }

  return {
    isDuplicate: true,
    previous: {
      createdAt: previous.createdAt,
      status: previous.status,
      vacancyTitle: previous.vacancyTitleSnapshot,
    },
  };
}

export function getInitialStatus(check: DuplicateCheck): LeadStatusValue {
  return check.isDuplicate ? "DUPLICATE" : "NEW";
}
