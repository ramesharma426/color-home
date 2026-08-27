import { en } from "@/dictionaries/en";
import { ne } from "@/dictionaries/ne";
import type { Dictionary, Locale } from "@/dictionaries/types";

const dictionaries: Partial<Record<Locale, Dictionary>> = { en, ne };

export function getDictionary(locale: Locale): Dictionary {
  const dict = dictionaries[locale];
  if (!dict) {
    throw new Error(`No dictionary registered for locale "${locale}"`);
  }
  return dict;
}
