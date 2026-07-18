"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

// Невидимый компонент: при загрузке любой страницы фиксирует UTM/referrer
// в sessionStorage, чтобы метки дожили до отправки отклика.
export function AttributionTracker() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
