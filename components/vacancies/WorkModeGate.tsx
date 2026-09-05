"use client";

import { useRouter } from "next/navigation";
import { reachGoal } from "@/lib/metrika";

export type WorkModeOption = {
  slug: string;
  label: string;
  count: number;
};

type WorkModeGateProps = {
  options: WorkModeOption[];
};

/**
 * Квиз-подбор вместо каталога (п. 14, решение владельца 05.09 — без A/B).
 *
 * Второй вопрос квиза, рядом с CityGate: не «какой город», а «на чём я могу
 * работать». Ведёт на готовые страницы интентов (п. 13/50) — та же
 * подборка, тот же счётчик, что и по прямой ссылке.
 *
 * Не гейт: список вакансий ниже виден сразу и без ответа на этот вопрос —
 * блокирующий вопрос перед списком уже проверен и дал 37% отказов (п. 6).
 */
export function WorkModeGate({ options }: WorkModeGateProps) {
  const router = useRouter();

  if (!options.length) {
    return null;
  }

  return (
    <section className="city-gate" aria-labelledby="work-mode-gate-title">
      <h2 id="work-mode-gate-title">Как хотите работать</h2>
      <ul className="city-gate__list">
        {options.map((option) => (
          <li key={option.slug}>
            <button
              type="button"
              className="city-gate__city"
              onClick={() => {
                reachGoal("work_mode_select", { mode: option.slug });
                router.push(`/${option.slug}`);
              }}
            >
              <span className="city-gate__name">{option.label}</span>
              <span className="city-gate__count">{option.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
