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

const I18nContext = createContext<I18nValue | null>(null);

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
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export type { TranslationKey };
