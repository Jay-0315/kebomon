import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { clearAuthSession, setAuthSession, type AdminUser } from "../lib/auth";

type LoginResponse = {
  accessToken: string;
  user: AdminUser;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function finishLogin(res: LoginResponse) {
    if (res.user.role !== "ADMIN") {
      clearAuthSession();
      setError("관리자 계정이 아닙니다.");
      return;
    }
    setAuthSession(res.accessToken, res.user);
    navigate("/users", { replace: true });
  }

  useEffect(() => {
    if (!googleClientId) return;

    const initGoogle = () => {
      if (!googleButtonRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setError("Google 로그인 토큰을 받지 못했습니다.");
            return;
          }
          setLoading(true);
          setError(null);
          try {
            const res = await api.post<LoginResponse>("/auth/social", {
              provider: "GOOGLE",
              identityToken: response.credential,
            });
            finishLogin(res);
          } catch {
            setError("Google 로그인에 실패했습니다.");
          } finally {
            setLoading(false);
          }
        },
      });
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
        text: "signin_with",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleClientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      finishLogin(res);
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <p className="mb-1 text-sm text-[#b7607e]">KEBO</p>
        <h1 className="mb-6 text-xl font-semibold">관리자 로그인</h1>

        <label className="mb-1 block text-sm text-white/60">이메일</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        <label className="mb-1 block text-sm text-white/60">비밀번호</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mb-4 w-full rounded-md bg-[#b7607e] px-3 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {googleClientId && (
          <>
            <div className="mb-4 flex items-center gap-3 text-xs text-white/30">
              <div className="h-px flex-1 bg-white/10" />
              또는
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <div ref={googleButtonRef} className="flex justify-center" />
          </>
        )}
      </form>
    </div>
  );
}
