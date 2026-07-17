import { useEffect, useState } from "react";
import { api } from "../lib/api";

export type PickedUser = { id: string; name: string; email: string };

type UsersResponse = {
  users: PickedUser[];
  total: number;
  page: number;
  totalPages: number;
};

export default function UserPickerModal({
  initialSelected,
  onClose,
  onApply,
}: {
  initialSelected: PickedUser[];
  onClose: () => void;
  onApply: (users: PickedUser[]) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, PickedUser>>(
    () => new Map(initialSelected.map((u) => [u.id, u])),
  );

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      const res = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
      setData(res);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function toggle(user: PickedUser) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6">
        <h2 className="mb-1 text-base font-semibold">유저 선택</h2>
        <p className="mb-3 text-xs text-[var(--fg-faint)]">{selected.size}명 선택됨</p>

        <form onSubmit={handleSearchSubmit} className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 또는 이메일 검색"
            className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]">
            검색
          </button>
        </form>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <div className="flex-1 overflow-y-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-[var(--bg-soft)] text-[var(--fg-muted)]">
              <tr>
                <th className="w-10 px-3 py-2"></th>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">이메일</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => toggle(u)}
                  className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--bg-hover)]"
                >
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(u.id)} readOnly />
                  </td>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 text-[var(--fg-muted)]">{u.email}</td>
                </tr>
              ))}
              {data?.users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                    결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
            >
              이전
            </button>
            <span className="text-[var(--fg-muted)]">
              {data.page} / {data.totalPages}
            </span>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
            >
              다음
            </button>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onApply(Array.from(selected.values()))}
            className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e]"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
