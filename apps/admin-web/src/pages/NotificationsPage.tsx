import { useState } from "react";
import { api } from "../lib/api";
import UserPickerModal, { type PickedUser } from "../components/UserPickerModal";

type SendResult = { sent: number; failed: number; total: number };

const LINK_OPTIONS: { label: string; value: string }[] = [
  { label: "홈", value: "/" },
  { label: "커뮤니티", value: "/community" },
  { label: "출석체크", value: "/attendance" },
  { label: "마이페이지", value: "/mypage" },
  { label: "케보몬 도감", value: "/kebomon" },
  { label: "가챠", value: "/gacha" },
  { label: "라이브 채팅", value: "/live" },
  { label: "미션", value: "/mission" },
  { label: "레이드", value: "/raid" },
  { label: "콜로세움", value: "/colosseum" },
  { label: "로그라이크", value: "/rogue" },
  { label: "듀얼", value: "/duel" },
  { label: "원정", value: "/expedition" },
  { label: "길드", value: "/guild" },
  { label: "상점", value: "/shop" },
  { label: "설정", value: "/settings" },
];

export default function NotificationsPage() {
  const [target, setTarget] = useState<"all" | "user">("user");
  const [selectedUsers, setSelectedUsers] = useState<PickedUser[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
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

    if (target === "user" && selectedUsers.length === 0) {
      setError("유저를 한 명 이상 선택하세요.");
      return;
    }
    if (target === "all" && !window.confirm("전체 회원에게 발송합니다. 계속할까요?")) {
      return;
    }

    setSending(true);
    try {
      const res = await api.post<SendResult>("/admin/notifications", {
        target,
        userIds: target === "user" ? selectedUsers.map((u) => u.id) : undefined,
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
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">받는 사람</label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)]"
            >
              {selectedUsers.length === 0 ? (
                <span className="text-[var(--fg-faint)]">클릭해서 유저 선택...</span>
              ) : selectedUsers.length <= 3 ? (
                selectedUsers.map((u) => u.name).join(", ")
              ) : (
                `${selectedUsers.slice(0, 3).map((u) => u.name).join(", ")} 외 ${selectedUsers.length - 3}명`
              )}
            </button>
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
          className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">링크 (선택)</label>
        <select
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        >
          <option value="">링크 없음</option>
          {LINK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

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

      {pickerOpen && (
        <UserPickerModal
          initialSelected={selectedUsers}
          onClose={() => setPickerOpen(false)}
          onApply={(users) => {
            setSelectedUsers(users);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
