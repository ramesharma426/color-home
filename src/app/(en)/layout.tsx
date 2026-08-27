import type { Metadata } from "next";
import "../globals.css";
import { getDictionary } from "@/lib/dictionary";

const dict = getDictionary("en");

export const metadata: Metadata = {
  title: dict.meta.title,
  description: dict.meta.description,
  icons: { icon: "/favicon.svg" },
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={dict.meta.htmlLang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="min-h-screen bg-proof font-sans text-graphite antialiased">
        {children}
      </body>
    </html>
  );
}
