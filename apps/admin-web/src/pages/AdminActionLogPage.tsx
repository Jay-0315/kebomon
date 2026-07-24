import { useEffect, useState } from "react";
import { api } from "../lib/api";

type ActionLogRow = {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
};

type ActionLogResponse = {
  logs: ActionLogRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function AdminActionLogPage() {
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ActionLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(p: number) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actorId) params.set("actorId", actorId);
      params.set("page", String(p));
      const res = await api.get<ActionLogResponse>(`/admin/action-log?${params.toString()}`);
      setData(res);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorId]);

  function handlePageChange(p: number) {
    setPage(p);
    void load(p);
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">감사 로그</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          placeholder="관리자 userId로 필터링"
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">관리자</th>
              <th className="px-3 py-2">액션</th>
              <th className="px-3 py-2">대상</th>
              <th className="px-3 py-2">상세</th>
              <th className="px-3 py-2">일시</th>
            </tr>
          </thead>
          <tbody>
            {data?.logs.map((l) => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-[var(--fg-muted)]">{l.actorId}</td>
                <td className="px-3 py-2 whitespace-nowrap">{l.action}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {l.targetType ? `${l.targetType} · ${l.targetId}` : "-"}
                </td>
                <td className="px-3 py-2 max-w-sm truncate text-[var(--fg-muted)]">{l.detail ?? "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data?.logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
