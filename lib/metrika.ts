// Клиентский хелпер для отправки целей в Яндекс.Метрику.
// Счётчик инициализируется компонентом YandexMetrika и кладёт свой id в window.

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
    __ymCounterId?: number;
  }
}

export function reachGoal(goal: string) {
  if (typeof window !== "undefined" && window.ym && window.__ymCounterId) {
    window.ym(window.__ymCounterId, "reachGoal", goal);
  }
}
