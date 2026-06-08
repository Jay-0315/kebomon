import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, X } from "lucide-react";
import { api } from "../lib/api";
import { setAuthSession } from "../lib/auth";
import { useLang } from "../context/LangContext";
import { type CurrencyCode } from "../types/domain";

const SOCIAL_PROVIDERS = [
  {
    id: "google",
    label: "Google",
    className: "bg-white text-[#1f1f1f] border border-border",
  },
  { id: "kakao", label: "Kakao", className: "bg-[#FEE500] text-[#191600]" },
  { id: "line", label: "LINE", className: "bg-[#06C755] text-white" },
  { id: "apple", label: "Apple", className: "bg-black text-white" },
] as const;

type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    baseCountryCode: string;
    baseCurrency: CurrencyCode;
  };
  needsStarter: boolean;
};

{
  /* 비밀번호 찾기 모달 */
}
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    setIsSending(true);
    setError("");
    try {
      await api.post("/auth/send-verification", {
        email,
        purpose: "RESET_PASSWORD",
      });
      onClose();
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message || "발송에 실패했습니다.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-md max-w-sm w-full shadow-2xl border border-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold">{t("signup.forgot_title")}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("signup.forgot_desc")}
          </p>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full pl-10 pr-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              onKeyDown={(e) => e.key === "Enter" && email && handleSendCode()}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            onClick={handleSendCode}
            disabled={isSending || !email}
            className="w-full py-2.5 rounded bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSending ? t("signup.sending") : t("signup.send_code")}
          </button>
        </div>
      </div>
    </div>
  );
}

{
  /* LoginPage */
}
export default function LoginPage() {
  const { t } = useLang();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!googleButtonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setErrorMessage("Google 로그인 토큰을 받지 못했습니다.");
            return;
          }
          setIsSubmitting(true);
          setErrorMessage("");
          try {
            const authResponse = await api.post<AuthResponse>("/auth/social", {
              provider: "GOOGLE",
              identityToken: response.credential,
            });
            setAuthSession(authResponse.accessToken, authResponse.user);
            window.location.assign(authResponse.needsStarter ? "/starter" : "/");
          } catch {
            setErrorMessage("Google 로그인에 실패했습니다.");
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
        text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.querySelector<HTMLScriptElement>(
        'script[src*="accounts.google.com/gsi/client"]',
      );
      if (script) {
        script.addEventListener("load", initGoogle);
        return () => script.removeEventListener("load", initGoogle);
      }
    }
  }, [googleClientId]);

  const handleSocialLogin = (providerLabel: string) => {
    setErrorMessage(
      `${providerLabel} 소셜 로그인은 서버 앱 등록 후 활성화됩니다.`,
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      setAuthSession(response.accessToken, response.user);
      window.location.assign(response.needsStarter ? "/starter" : "/");
    } catch {
      setErrorMessage(t("login.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=1080')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src="/logo1.png" alt="Kebo" className="h-20 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-foreground mb-2">{t("login.title")}</h1>
          <p className="text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <div className="bg-card rounded p-6 shadow-lg border border-border">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">{t("login.email")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm">{t("login.password")}</label>
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {t("signup.forgot_password")}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary/80 text-primary-foreground rounded py-3 font-medium shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              {isSubmitting ? t("login.loading") : t("login.submit")}
            </button>
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">SOCIAL LOGIN</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <div ref={googleButtonRef} className="flex justify-center" />
            {!googleClientId && (
              <p className="text-xs text-center text-muted-foreground">
                `VITE_GOOGLE_CLIENT_ID` 설정 후 Google 로그인을 사용할 수
                있습니다.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SOCIAL_PROVIDERS.filter((p) => p.id !== "google").map(
                (provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleSocialLogin(provider.label)}
                    className={`rounded py-3 text-sm font-medium transition-all hover:opacity-90 ${provider.className}`}
                  >
                    {provider.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("login.no_account")}{" "}
              <Link
                to="/signup"
                className="text-primary/80 font-medium hover:underline"
              >
                {t("login.signup")}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}
    </div>
  );
}
