"use client";

import { reachGoal } from "@/lib/metrika";
import { site } from "@/lib/site";

/**
 * Звонок в шапке.
 *
 * Раньше кнопка «Позвонить» стояла в каждой карточке рядом с формой и
 * перетягивала на себя нажатия: нажать кнопку легче, чем набрать номер.
 * Наверху она никуда не делась для тех, кому проще позвонить, но больше
 * не конкурирует с главным действием.
 */
export function CallButton() {
  if (!site.phone) {
    return null;
  }

  return (
    <a
      className="site-header__phone"
      href={`tel:${site.phone.replace(/[^\d+]/g, "")}`}
      onClick={() => reachGoal("call_click", { place: "header" })}
    >
      <PhoneIcon />
      <span>{site.phone}</span>
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg
      className="site-header__phone-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        d="M17.6 15.4l-2-.9a.9.9 0 0 0-1 .2l-.8.9a7.7 7.7 0 0 1-3.4-3.4l.9-.8a.9.9 0 0 0 .2-1l-.9-2a.9.9 0 0 0-1-.5l-1.7.4a1 1 0 0 0-.8 1c.2 4.6 3.9 8.3 8.5 8.5a1 1 0 0 0 1-.8l.4-1.7a.9.9 0 0 0-.5-1z"
        fill="currentColor"
      />
    </svg>
  );
}
