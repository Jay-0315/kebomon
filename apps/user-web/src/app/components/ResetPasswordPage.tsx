import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { Wallet, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

export default function ResetPasswordPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromParam = searchParams.get("email") ?? "";

  const [code, setCode]               = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 프론트 1차 검사 (UX용)
    if (newPassword !== confirmPw) {
      setError(t("signup.pw_mismatch"));
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await api.post("/auth/reset-password", {
        email: emailFromParam,
        code,
        newPassword,
        confirmPassword: confirmPw,   // 서버에서 재검증
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    "w-full pl-10 pr-4 py-3 bg-input-background rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring";

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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/80 rounded mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-foreground mb-2">{t("signup.forgot_title")}</h1>
          <p className="text-muted-foreground text-sm">
            {emailFromParam && (
              <span className="text-primary font-medium">{emailFromParam}</span>
            )}
            {emailFromParam ? t("signup.code_sent_to") : t("signup.forgot_desc")}
          </p>
        </div>

        <div className="bg-card rounded p-6 shadow-lg border border-border">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-primary font-medium">{t("signup.reset_success")}</p>
              <p className="text-sm text-muted-foreground">{t("signup.redirecting")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 인증번호 */}
              <div>
                <label className="block mb-2 text-sm">{t("signup.verify_code")}</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("signup.code_placeholder")}
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="block mb-2 text-sm">{t("signup.new_password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {/* 새 비밀번호 확인 */}
              <div>
                <label className="block mb-2 text-sm">{t("signup.confirm_password")}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputCls} ${
                      confirmPw && newPassword !== confirmPw ? "border-destructive" : ""
                    }`}
                    required
                    minLength={8}
                  />
                </div>
                {confirmPw && newPassword !== confirmPw && (
                  <p className="mt-1 text-xs text-destructive">{t("signup.pw_mismatch")}</p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary/80 text-primary-foreground rounded py-3 font-medium shadow-md hover:shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
              >
                {isSubmitting ? t("signup.loading") : t("signup.reset_submit")}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="inline h-4 w-4 mr-1" />{t("login.submit")} 페이지로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
