"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { localeHref } from "@/lib/paths";
import type { Locale } from "@/dictionaries/types";

/**
 * Shared masthead. Deliberately thin and neutral: the paint is the only thing
 * on any of these pages allowed to carry colour, apart from the single sun
 * chip in the wordmark.
 */
export function SiteNav({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const basePath = pathname.startsWith("/ne") ? pathname.slice(3) || "/" : pathname;
  const otherLocale: Locale = locale === "en" ? "ne" : "en";
  const switchHref = localeHref(otherLocale, basePath);

  return (
    <header className="border-b border-hairline-strong/70">
      <nav className="mx-auto flex max-w-shell items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link
          href={localeHref(locale, "/")}
          className="group flex items-center gap-2.5 font-display text-[0.95rem] font-extrabold uppercase tracking-tightest text-graphite"
        >
          <span className="h-3.5 w-3.5 bg-sun transition-transform duration-300 group-hover:rotate-45" />
          {dict.nav.wordmark}
        </Link>
        <div className="label-mono flex items-center gap-5 text-graphite/70">
          <Link href={localeHref(locale, "/studio")} className="transition-colors hover:text-graphite">
            {dict.nav.studioLink}
          </Link>
          <Link href={localeHref(locale, "/colors")} className="transition-colors hover:text-graphite">
            {dict.nav.colorsLink}
          </Link>
          <Link href={switchHref} className="transition-colors hover:text-graphite">
            {dict.nav.switchLanguageLabel}
          </Link>
        </div>
      </nav>
    </header>
  );
}
