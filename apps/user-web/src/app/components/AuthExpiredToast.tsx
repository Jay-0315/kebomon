import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { LogIn, X } from "lucide-react";
import { clearAuthSession } from "../lib/auth";
import { useLang } from "../context/LangContext";

const AUTO_DISMISS_MS = 4000;

const MESSAGES = {
  ko: { line1: "세션이 만료됐어요.", line2: "다시 로그인해주세요." },
  ja: { line1: "セッションが期限切れです。", line2: "再度ログインしてください。" },
  en: { line1: "Your session has expired.", line2: "Please log in again." },
} as const;

export default function AuthExpiredToast() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      clearAuthSession();
      setVisible(true);
      navigate("/login", { replace: true });
      setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    };
    window.addEventListener("kebo:auth-expired", handler);
    return () => window.removeEventListener("kebo:auth-expired", handler);
  }, [navigate]);

  if (!visible) return null;
  const msg = MESSAGES[lang];

  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
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
        <LogIn size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: "#e2e8f0",
            fontFamily:
              "'Noto Sans KR','Noto Sans JP','Malgun Gothic',sans-serif",
            lineHeight: 1.5,
          }}
        >
          {msg.line1}
          <br />
          {msg.line2}
        </span>
        <button
          onClick={() => setVisible(false)}
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
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
