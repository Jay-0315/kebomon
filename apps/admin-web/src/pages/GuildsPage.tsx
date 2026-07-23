import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";

type BossAnomaly = {
  weekKey: string;
  topContributorId: string;
  topDamage: number;
  totalDamage: number;
  topShare: number;
  suspicious: boolean;
} | null;

type GuildRow = {
  id: string;
  name: string;
  level: number;
  memberCount: number;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  bossAnomaly: BossAnomaly;
};

type GuildsResponse = {
  guilds: GuildRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function GuildsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GuildsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      const res = await api.get<GuildsResponse>(`/admin/guilds?${params.toString()}`);
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

  async function handleDisband(guild: GuildRow) {
    if (!window.confirm(`"${guild.name}" 길드를 해체할까요? 길드원/게시글/보스전 기록이 모두 삭제되며 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/admin/guilds/${guild.id}`);
      load();
    } catch {
      window.alert("해체에 실패했습니다.");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">길드 관리</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="길드명 검색"
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]">
          검색
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">길드명</th>
              <th className="px-3 py-2">레벨</th>
              <th className="px-3 py-2">인원</th>
              <th className="px-3 py-2">길드장</th>
              <th className="px-3 py-2">최근 보스전 기여도</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {data?.guilds.map((g) => (
              <tr key={g.id} className={`border-t border-[var(--border)] ${g.bossAnomaly?.suspicious ? "bg-amber-500/10" : ""}`}>
                <td className="px-3 py-2">
                  <Link to={`/guilds/${g.id}`} className="text-[#b7607e] hover:underline">
                    {g.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{g.level}</td>
                <td className="px-3 py-2">{g.memberCount}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">
                  {g.owner.name} ({g.owner.email})
                </td>
                <td className="px-3 py-2">
                  {g.bossAnomaly ? (
                    <>
                      최고 기여 {(g.bossAnomaly.topShare * 100).toFixed(0)}%
                      {g.bossAnomaly.suspicious && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                          쏠림 의심
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--fg-faint)]">기록 없음</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDisband(g)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    해체
                  </button>
                </td>
              </tr>
            ))}
            {data?.guilds.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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
    </div>
  );
}
