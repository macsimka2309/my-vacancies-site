import { site } from "@/lib/site";

export function ContactButtons() {
  return (
    <div className="contact-buttons">
      <a
        className="contact-btn"
        href={`https://t.me/${site.telegram}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в Telegram"
      >
        <TelegramIcon />
        <span>Telegram</span>
      </a>
      <a
        className="contact-btn"
        href={`https://max.ru/${site.max}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать в MAX"
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
        <linearGradient id="maxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3D8BFF" />
          <stop offset="1" stopColor="#7A4DFF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill="url(#maxGrad)" />
      <path
        d="M6.4 16.8V7.6l5.6 6 5.6-6v9.2"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
