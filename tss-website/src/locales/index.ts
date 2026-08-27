import en from "./en.json";
import type { Messages } from "./_types";

export type Locale = "pl" | "en" | "de";
export const LOCALES: Locale[] = ["pl", "en", "de"];
export const DEFAULT_LOCALE: Locale = "en";

export type LocaleMessages = Messages;

// Eager import of the canonical EN locale (bundled into the main chunk).
// PL and DE are loaded on demand via dynamic import (each becomes its own
// webpack chunk).
const enMessages = en as unknown as LocaleMessages;

export const messages: Record<Locale, LocaleMessages> = {
  en: enMessages,
  pl: enMessages, // overwritten on first load; placeholder keeps the type happy
  de: enMessages,
};

const loaders: Record<Locale, () => Promise<LocaleMessages>> = {
  en: async () => enMessages,
  pl: () => import("./pl.json").then((m) => m.default as unknown as LocaleMessages),
  de: () => import("./de.json").then((m) => m.default as unknown as LocaleMessages),
};

/**
 * Load a locale's messages. Cached after first load.
 */
export async function loadMessages(locale: Locale): Promise<LocaleMessages> {
  // Skip the cache check for EN since it's already eager.
  if (locale === "en") return enMessages;
  if (messages[locale] !== enMessages) return messages[locale];
  const data = await loaders[locale]();
  messages[locale] = data;
  return data;
}

/**
 * Pre-load a locale in the background (e.g., on hover of language switcher).
 */
export function preloadLocale(locale: Locale): void {
  if (locale === "en") return;
  void loadMessages(locale);
}