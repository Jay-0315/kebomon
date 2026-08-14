import { createContext, useContext, type ReactNode } from "react";
import { useAppData } from "./AppDataContext";
import { translate, type Lang, type TranslationKey } from "../lib/i18n";

interface LangContextValue {
  lang: Lang;
  t: (key: TranslationKey | string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppData();
  const lang: Lang = (settings.language as Lang | undefined) ?? "ko";
  const t = (key: TranslationKey | string) => translate(lang, key);
  return <LangContext.Provider value={{ lang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
