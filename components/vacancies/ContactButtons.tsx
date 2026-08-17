import { site } from "@/lib/site";

type ContactButtonsProps = {
  /** compact — только значки, для карточек в списке. */
  variant?: "default" | "compact";
};

export function ContactButtons({ variant = "default" }: ContactButtonsProps) {
  return (
    <div className="contact-buttons" data-variant={variant}>
      <a
        className="contact-btn"
        href={`https://t.me/${site.telegram}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в Telegram"
        title="Написать в Telegram"
      >
        <TelegramIcon />
        <span>Telegram</span>
      </a>
      <a
        className="contact-btn"
        href={site.max}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в MAX"
        title="Написать в MAX"
      >
        <MaxIcon />
        <span>MAX</span>
      </a>
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg
      className="contact-btn__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill="#29A9EB" />
      <path
        d="M9.83 17.3l.28-4.2 7.62-6.88c.33-.3-.07-.44-.51-.18L7.72 12.1l-4.02-1.25c-.87-.27-.88-.86.19-1.29l15.63-6.02c.72-.28 1.36.17 1.08 1.28l-2.66 12.55c-.18.9-.72 1.12-1.47.7l-4.06-3-1.95 1.9c-.22.21-.4.4-.8.4z"
        fill="#fff"
      />
    </svg>
  );
}

function MaxIcon() {
  return (
    <svg
      className="contact-btn__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="maxGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#38B6F5" />
          <stop offset="0.5" stopColor="#5D6BF0" />
          <stop offset="1" stopColor="#9B45E8" />
        </linearGradient>
        <mask id="maxHole">
          <rect width="24" height="24" fill="#fff" />
          <circle cx="12.3" cy="10.6" r="3.7" fill="#000" />
        </mask>
      </defs>
      <rect width="24" height="24" rx="6.5" fill="url(#maxGrad)" />
      <g fill="#fff" mask="url(#maxHole)">
        <circle cx="12.3" cy="10.6" r="7.2" />
        <path d="M8.3 15.6c-1.7 2.3-2.1 4.2-1 4.6 1.1.4 3.2-.8 4.8-2.6z" />
      </g>
    </svg>
  );
}
