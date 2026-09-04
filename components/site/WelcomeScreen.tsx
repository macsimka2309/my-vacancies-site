import { TrustBlocks } from "./TrustBlocks";

type WelcomeScreenProps = {
  projects: string[];
};

/**
 * Приветственный экран для холодного захода (см. lib/cold-landing.ts).
 *
 * Обычная секция в начале потока, высотой примерно в экран — не модалка
 * и не отдельный маршрут. Пролистывается как любой длинный контент: ниже,
 * без перехода, идёт витрина вакансий (`#vacancies` — якорь ссылки-подсказки
 * на случай, если человек не понял, что можно листать дальше).
 */
export function WelcomeScreen({ projects }: WelcomeScreenProps) {
  return (
    <section className="welcome-screen" aria-label="Добро пожаловать">
      <div className="welcome-screen__intro">
        <p className="eyebrow">Работа Рядом</p>
        <p className="muted">
          Коротко о том, что мы делаем, что нужно, чтобы начать, и что
          будет после того, как вы оставите номер.
        </p>
      </div>
      <TrustBlocks projects={projects} />
      <a className="welcome-screen__scroll-cue" href="#vacancies">
        Смотреть вакансии
        <ScrollCueIcon />
      </a>
    </section>
  );
}

function ScrollCueIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}
