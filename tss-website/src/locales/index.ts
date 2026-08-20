import pl from "./pl.json";
import type { Messages } from "./_types";

export type Locale = "pl" | "en" | "de";
export const LOCALES: Locale[] = ["pl", "en", "de"];
export const DEFAULT_LOCALE: Locale = "pl";

export type LocaleMessages = Messages;

// Eager import of the canonical PL locale (bundled into the main chunk).
// EN and DE are loaded on demand via dynamic import (each becomes its own
// webpack chunk).
const plMessages = pl as unknown as LocaleMessages;

export const messages: Record<Locale, LocaleMessages> = {
  pl: plMessages,
  en: plMessages, // overwritten on first load; placeholder keeps the type happy
  de: plMessages,
};

const loaders: Record<Locale, () => Promise<LocaleMessages>> = {
  pl: async () => plMessages,
  en: () => import("./en.json").then((m) => m.default as unknown as LocaleMessages),
  de: () => import("./de.json").then((m) => m.default as unknown as LocaleMessages),
};

/**
 * Load a locale's messages. Cached after first load.
 */
export async function loadMessages(locale: Locale): Promise<LocaleMessages> {
  // Skip the cache check for PL since it's already eager.
  if (locale === "pl") return plMessages;
  if (messages[locale] !== plMessages) return messages[locale];
  const data = await loaders[locale]();
  messages[locale] = data;
  return data;
}

/**
 * Pre-load a locale in the background (e.g., on hover of language switcher).
 */
export function preloadLocale(locale: Locale): void {
  if (locale === "pl") return;
  void loadMessages(locale);
}