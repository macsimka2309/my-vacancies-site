import type { Metadata } from "next";
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
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
