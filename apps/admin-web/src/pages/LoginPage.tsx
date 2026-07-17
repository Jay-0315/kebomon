import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api";
import { setAuthSession, type AdminUser } from "../lib/auth";

type LoginResponse = {
  accessToken: string;
  user: AdminUser;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { email, password });
      if (res.user.role !== "ADMIN") {
        setError("관리자 계정이 아닙니다.");
        return;
      }
      setAuthSession(res.accessToken, res.user);
      navigate("/users", { replace: true });
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
          className="w-full rounded-md bg-[#b7607e] px-3 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
