import { useState } from "react";
import { Link } from "react-router";
import { Wallet, Mail, Lock, User, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { setAuthSession } from "../lib/auth";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { type CurrencyCode } from "../types/domain";

function LangSwitcher() {
  const { lang } = useLang();
  const { updateSettings } = useAppData();
  return (
    <div className="flex items-center justify-center gap-2 mb-5 text-sm">
      <button
        onClick={() => void updateSettings({ language: "ko" })}
        className={`px-2 py-0.5 rounded transition-colors ${lang === "ko" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
      >
        한국어
      </button>
      <span className="text-border">|</span>
      <button
        onClick={() => void updateSettings({ language: "ja" })}
        className={`px-2 py-0.5 rounded transition-colors ${lang === "ja" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
      >
        日本語
      </button>
      <span className="text-border">|</span>
      <button
        onClick={() => void updateSettings({ language: "en" })}
        className={`px-2 py-0.5 rounded transition-colors ${lang === "en" ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
      >
        English
      </button>
    </div>
  );
}

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

export default function SignupPage() {
  const { t, lang } = useLang();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [codeMessage, setCodeMessage] = useState("");

  const handleSendCode = async () => {
    if (!formData.email) return;
    setIsSendingCode(true);
    setCodeMessage("");
    setErrorMessage("");
    try {
      await api.post("/auth/send-verification", {
        email: formData.email,
        purpose: "SIGNUP",
        lang,
      });
      setCodeSent(true);
      setVerificationCode("");
      setCodeMessage(t("signup.code_sent"));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      setErrorMessage(msg || t("signup.error"));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage(t("signup.pw_mismatch"));
      return;
    }
    if (!codeSent || !verificationCode) {
      setErrorMessage(t("signup.send_code") + "가 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await api.post<AuthResponse>("/auth/signup", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        verificationCode,
      });
      setAuthSession(response.accessToken, response.user);
      window.location.assign(response.needsStarter ? "/starter" : "/");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      setErrorMessage(msg || t("signup.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full pl-10 pr-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1585143790814-b40d4b829e4a?w=1080')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/80 rounded mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-foreground mb-2">{t("signup.title")}</h1>
          <p className="text-muted-foreground">{t("signup.subtitle")}</p>
        </div>

        <div className="bg-card rounded p-6 shadow-lg border border-border">
          <LangSwitcher />
          <form onSubmit={handleSignup} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="block mb-2 text-sm">{t("signup.name")}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="홍길동"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* 이메일 + 인증번호 발송 */}
            <div>
              <label className="block mb-2 text-sm">{t("signup.email")}</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setCodeSent(false);
                                    }}
                    placeholder="example@email.com"
                    className={inputCls}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSendingCode || !formData.email}
                  className="shrink-0 px-3 py-2 text-sm rounded border border-primary text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingCode
                    ? t("signup.sending")
                    : codeSent
                    ? t("signup.resend_code")
                    : t("signup.send_code")}
                </button>
              </div>
              {codeMessage && (
                <p className="mt-1.5 text-xs text-primary">{codeMessage}</p>
              )}
            </div>

            {/* 인증번호 입력 */}
            {codeSent && (
              <div>
                <label className="block mb-2 text-sm">{t("signup.verify_code")}</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("signup.code_placeholder")}
                    className={inputCls}
                    required
                  />
                </div>
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="block mb-2 text-sm">{t("signup.password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block mb-2 text-sm">{t("signup.confirm_password")}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary/80 text-primary-foreground rounded py-3 font-medium shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              {isSubmitting ? t("signup.loading") : t("signup.submit")}
            </button>
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("signup.has_account")}{" "}
              <Link to="/login" className="text-primary/80 font-medium hover:underline">
                {t("signup.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
