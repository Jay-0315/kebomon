import { useEffect, useState } from "react";
import { WifiOff, Clock, X } from "lucide-react";
import type { NetworkErrorType } from "../lib/api";
import { useLang } from "../context/LangContext";

const AUTO_DISMISS_MS = 3000;

interface Toast {
  id: number;
  type: NetworkErrorType;
}

let nextId = 0;

const MESSAGES = {
  timeout: {
    ko: { line1: "요청 시간이 초과됐어요.", line2: "잠시 후 다시 시도해주세요." },
    ja: { line1: "リクエストがタイムアウトしました。", line2: "しばらくしてからお試しください。" },
  },
  offline: {
    ko: { line1: "인터넷 연결 상태가 좋지 않아요.", line2: "잠시 후 다시 시도해주세요." },
    ja: { line1: "インターネット接続が不安定です。", line2: "しばらくしてからお試しください。" },
  },
} as const;

export default function NetworkErrorToast() {
  const { lang } = useLang();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent<NetworkErrorType>).detail;
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, type }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    };
    window.addEventListener("kebo:network-error", handler);
    return () => window.removeEventListener("kebo:network-error", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const msg = MESSAGES[toast.type][lang];
        return (
          <div
            key={toast.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 10,
              padding: "10px 16px",
              boxShadow: "0 4px 24px #00000055",
              pointerEvents: "auto",
              minWidth: 280,
              maxWidth: "90vw",
              animation: "toast-in 0.2s ease-out both",
            }}
          >
            {toast.type === "timeout" ? (
              <Clock size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            ) : (
              <WifiOff size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            )}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: "#e2e8f0",
                fontFamily: "'Noto Sans KR','Noto Sans JP','Malgun Gothic',sans-serif",
                lineHeight: 1.5,
              }}
            >
              {msg.line1}
              <br />
              {msg.line2}
            </span>
            <button
              onClick={() => dismiss(toast.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                padding: 2,
                flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
