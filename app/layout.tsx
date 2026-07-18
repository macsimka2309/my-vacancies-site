import type { Metadata } from "next";
import { AttributionTracker } from "@/components/analytics/AttributionTracker";
import { YandexMetrika } from "@/components/analytics/YandexMetrika";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `Вакансии — ${site.name}`,
    template: `%s — ${site.name}`,
  },
  description:
    "Актуальные вакансии с достойной оплатой. Оставьте отклик — перезвоним и расскажем условия.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: site.name,
    url: site.url,
    title: `Вакансии — ${site.name}`,
    description:
      "Актуальные вакансии с достойной оплатой. Оставьте отклик — перезвоним и расскажем условия.",
  },
  twitter: {
    card: "summary_large_image",
    title: `Вакансии — ${site.name}`,
    description:
      "Актуальные вакансии с достойной оплатой. Оставьте отклик — перезвоним и расскажем условия.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: site.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metrikaId = Number(process.env.METRIKA_ID) || null;

  return (
    <html lang="ru">
      <body>
        <AttributionTracker />
        {metrikaId ? <YandexMetrika counterId={metrikaId} /> : null}
        {children}
      </body>
    </html>
  );
}
