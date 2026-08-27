import type { Locale } from "@/dictionaries/types";

export function localeHref(locale: Locale, path: string): string {
  return locale === "ne" ? `/ne${path}` : path;
}
