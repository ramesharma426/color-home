import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Color Home",
  description: "Preview paint colors on your own home before you buy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
