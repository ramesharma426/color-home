import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Color Home",
  description: "Preview paint colors on your own home before you buy.",
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;500&family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&display=swap";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
