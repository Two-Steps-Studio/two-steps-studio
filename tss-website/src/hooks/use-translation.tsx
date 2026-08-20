"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALES,
  loadMessages,
  type Locale,
  type LocaleMessages,
} from "@/locales";

const STORAGE_KEY = "tss-i18n-locale";

/**
 * Hybrid `t` — Proxy-backed object that also works as a dot-path function.
 *  - `t.settings.title`            // object access (legacy, keeps working)
 *  - `t("settings.theme.dark")`    // dot-path function (preferred for new code)
 */
export type TranslationT = LocaleMessages & ((path: string) => string);

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];

  // Back-compat aliases for the previous `useLanguage` API. Existing consumers
  // destructure `language`, `setLanguage`, `availableLanguages`. These keep
  // working unchanged so the rename is purely additive.
  language: Locale;
  setLanguage: (locale: Locale) => void;
  availableLanguages: Locale[];

  t: TranslationT;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * Resolve a dot-path against a nested object. Returns undefined if any segment is missing.
 */
function lookupPath(obj: unknown, path: string): string | undefined {
  const segments = path.split(".");
  let current: unknown = obj;
  for (const seg of segments) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return typeof current === "string" ? current : undefined;
}

/**
 * Build the hybrid `t`. The proxy delegates property access to the messages
 * object (recursively wrapping nested objects) and is also callable as a
 * dot-path function.
 */
function buildHybridT(messages: LocaleMessages): TranslationT {
  const callable = ((path: string) => {
    const value = lookupPath(messages, path);
    if (value === undefined) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] Missing key: ${path}`);
      }
      return path;
    }
    return value;
  }) as TranslationT;

  const proxy = new Proxy(messages, {
    get(target, prop, receiver) {
      // Skip symbols (React DevTools, JSON.stringify checks, etc.).
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      const value = Reflect.get(target, prop, receiver);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return buildHybridT(value as LocaleMessages);
      }
      return value;
    },
  });

  return new Proxy(callable, {
    get(_target, prop) {
      if (typeof prop === "symbol") return undefined;
      return (proxy as unknown as Record<PropertyKey, unknown>)[prop];
    },
  }) as TranslationT;
}

const noopT = new Proxy(
  ((path: string) => path) as unknown as TranslationT,
  { get: () => noopT }
);

const fallbackValue: TranslationContextValue = {
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  availableLocales: LOCALES,
  language: DEFAULT_LOCALE,
  setLanguage: () => {},
  availableLanguages: LOCALES,
  t: noopT,
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<LocaleMessages | null>(null);

  // Initial load: synchronously serve PL (already eager), then hydrate from
  // localStorage and switch if necessary.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved =
        typeof window !== "undefined"
          ? (localStorage.getItem(STORAGE_KEY) as Locale | null)
          : null;
      const initial: Locale =
        saved && (LOCALES as readonly string[]).includes(saved) ? saved : DEFAULT_LOCALE;
      const data = await loadMessages(initial);
      if (cancelled) return;
      setLocaleState(initial);
      setMessages(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    setLocaleState(next);
    void loadMessages(next).then((data) => {
      setMessages(data);
    });
  }, []);

  const value = useMemo<TranslationContextValue | null>(() => {
    if (!messages) return null;
    return {
      locale,
      setLocale,
      availableLocales: LOCALES,
      // Back-compat aliases
      language: locale,
      setLanguage: setLocale,
      availableLanguages: LOCALES,
      t: buildHybridT(messages),
    };
  }, [locale, setLocale, messages]);

  // Render even before messages load — the fallback returns the key string
  // for any dot-path access, so consumers don't throw. Once messages load,
  // a re-render swaps in real values.
  return (
    <TranslationContext.Provider value={value ?? fallbackValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(TranslationContext);
  if (!ctx) {
    // TranslationProvider not mounted — return no-op fallback so SSR doesn't throw.
    return fallbackValue;
  }
  return ctx;
}

/** Back-compat alias. Existing code can keep importing `useLanguage`. */
export const useLanguage = useTranslation;