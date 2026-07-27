import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { translate, type Lang, type TranslationKey } from "../lib/i18n";

const LANG_CACHE_KEY = "kebo-admin-lang";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function isLang(value: unknown): value is Lang {
  return value === "ko" || value === "ja" || value === "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const cached = localStorage.getItem(LANG_CACHE_KEY);
    return isLang(cached) ? cached : "ko";
  });

  // 계정에 저장된 언어(AppSetting.language, 유저웹과 공유하는 값)로 동기화 —
  // 로컬 캐시로 먼저 그려서 깜빡임 없이 보여준 뒤, 실제 계정 설정으로 갱신.
  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    api
      .get<{ settings?: { language?: string } }>(`/users/${user.id}/profile`)
      .then((res) => {
        const remote = res.settings?.language;
        if (isLang(remote)) {
          setLangState(remote);
          localStorage.setItem(LANG_CACHE_KEY, remote);
        }
      })
      .catch(() => undefined);
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    localStorage.setItem(LANG_CACHE_KEY, next);
    const user = getStoredUser();
    if (user) void api.patch(`/users/${user.id}/settings`, { language: next }).catch(() => undefined);
  }

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
