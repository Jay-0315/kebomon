import { Component, type ErrorInfo, type ReactNode } from "react";
import { LANG_CACHE_KEY, isLang } from "../context/LangContext";
import { translate } from "../lib/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// LangProvider 바깥(더 상위)에서 렌더되는 컴포넌트라 useLang() 훅을 쓸 수 없음 —
// LangProvider가 참조하는 것과 동일한 캐시 키를 직접 읽어 translate()를 호출.
function fallbackLang() {
  const cached = localStorage.getItem(LANG_CACHE_KEY);
  return isLang(cached) ? cached : "ko";
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const lang = fallbackLang();

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-[var(--fg)]">
        <div className="max-w-sm rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-6 text-center">
          <p className="mb-2 text-base font-semibold">{translate(lang, "errorBoundary.title")}</p>
          <p className="mb-4 text-sm text-[var(--fg-muted)]">{translate(lang, "errorBoundary.message")}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-[#b7607e] px-4 py-2 text-sm font-medium text-white hover:bg-[#a2536e]"
          >
            {translate(lang, "errorBoundary.reload")}
          </button>
        </div>
      </div>
    );
  }
}
