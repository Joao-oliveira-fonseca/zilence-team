import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { es } from "./es";
import { pt, type TranslationKey } from "./pt";

export const LANGUAGES = ["pt", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

const dictionaries = { pt, es } as const;
const STORAGE_KEY = "zilence.lang";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function translate(lang: Language, key: TranslationKey, vars?: Record<string, string | number>) {
  let text: string = dictionaries[lang][key] ?? pt[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

type I18nValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  locale: string;
};

// Kept on globalThis so hot reloads of this file reuse the same context as the mounted provider.
const g = globalThis as { __zilenceI18n?: React.Context<I18nValue | null> };
const I18nContext = (g.__zilenceI18n ??= createContext<I18nValue | null>(null));

const fallback: I18nValue = {
  lang: "pt",
  setLang: () => {},
  t: (key, vars) => translate("pt", key, vars),
  locale: "pt-BR",
};

export function I18nProvider({ children }: { children: ReactNode }) {
  // Portuguese is the default; the device preference is read after hydration.
  const [lang, setLangState] = useState<Language>("pt");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "es";
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      locale: lang === "pt" ? "pt-BR" : "es-ES",
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  // Outside the provider (e.g. mid hot-reload) fall back to Portuguese instead of crashing.
  return ctx ?? fallback;
}

export type { TranslationKey };
