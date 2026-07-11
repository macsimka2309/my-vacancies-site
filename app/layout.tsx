import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Вакансии",
  description: "Работа в стабильной компании рядом с домом.",
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
