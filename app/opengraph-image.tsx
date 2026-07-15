import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `Вакансии — ${site.name}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#21A038",
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 700, color: "#333F48" }}>
            {site.name}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: "#21A038",
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            {site.tagline}
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, color: "#333F48" }}>
            Вакансии с достойной оплатой
          </div>
          <div style={{ fontSize: 34, color: "#5b6770" }}>
            Оставьте отклик — {site.callbackPromise.toLowerCase()}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
