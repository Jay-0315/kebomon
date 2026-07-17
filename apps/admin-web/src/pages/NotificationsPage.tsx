import { useState } from "react";
import { api } from "../lib/api";

type SendResult = { sent: number; failed: number; total: number };

export default function NotificationsPage() {
  const [target, setTarget] = useState<"all" | "user">("user");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (target === "all" && !window.confirm("전체 회원에게 발송합니다. 계속할까요?")) {
      return;
    }

    setSending(true);
    try {
      const res = await api.post<SendResult>("/admin/notifications", {
        target,
        email: target === "user" ? email : undefined,
        title,
        body,
        link: link || undefined,
      });
      setResult(res);
      setTitle("");
      setBody("");
      setLink("");
    } catch {
      setError("발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-lg font-semibold">공지 발송</h1>

      <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--border)] p-4">
        <div className="mb-4 flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={target === "user"}
              onChange={() => setTarget("user")}
            />
            특정 유저
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={target === "all"}
              onChange={() => setTarget("all")}
            />
            전체 회원
          </label>
        </div>

        {target === "user" && (
          <>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">유저 이메일</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
            />
          </>
        )}

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">제목</label>
        <input
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">내용</label>
        <textarea
          required
          maxLength={255}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">링크 (선택)</label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="/community"
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {result && (
          <p className="mb-4 text-sm text-emerald-400">
            발송 완료: {result.sent}건 성공{result.failed > 0 ? ` / ${result.failed}건 실패` : ""}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-[#b7607e] px-4 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
        >
          {sending ? "발송 중..." : "발송"}
        </button>
      </form>
    </div>
  );
}
