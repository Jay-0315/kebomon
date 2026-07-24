import { useEffect, useState } from "react";
import { api } from "../lib/api";

type RankingEntry = {
  rank: number;
  userId: string;
  nickname: string;
  tierPoints: number;
  wins: number;
  winStreak: number;
};

type SeasonPreview = {
  seasonId: number;
  topRankers: RankingEntry[];
  nextResetAt: string;
};

export default function SeasonPage() {
  const [preview, setPreview] = useState<SeasonPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setPreview(await api.get<SeasonPreview>("/admin/season"));
    } catch {
      setError("정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleForceReset() {
    if (
      !window.confirm(
        "지금 즉시 콜로세움 시즌을 종료할까요?\n\n전체 유저의 콜로세움 전적(티어 포인트/승패/연승)이 초기화되고, 되돌릴 수 없습니다. 랭킹 칭호·티어 테두리·KP 보상은 자동 지급됩니다.",
      )
    )
      return;
    setResetting(true);
    setError(null);
    try {
      await api.post("/admin/season/force-reset");
      window.alert("시즌 종료 처리가 완료되었습니다.");
      load();
    } catch {
      setError("시즌 종료 처리에 실패했습니다.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <p className="text-[var(--fg-faint)]">불러오는 중...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold">시즌 관리</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        콜로세움 시즌은 매월 1일 00:00(KST)에 자동으로 종료·정산됩니다. 아래 버튼은 그 전에 긴급하게
        수동으로 종료해야 할 때만 사용하세요.
      </p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {preview && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--fg-muted)]">진행중 시즌</p>
              <p className="mt-1 text-lg font-semibold">시즌 {preview.seasonId}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--fg-muted)]">다음 자동 종료</p>
              <p className="mt-1 text-sm font-semibold">{new Date(preview.nextResetAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-4 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3 py-2">순위</th>
                  <th className="px-3 py-2">닉네임</th>
                  <th className="px-3 py-2">티어 포인트</th>
                  <th className="px-3 py-2">전적</th>
                </tr>
              </thead>
              <tbody>
                {preview.topRankers.map((r) => (
                  <tr key={r.userId} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{r.rank}</td>
                    <td className="px-3 py-2">{r.nickname}</td>
                    <td className="px-3 py-2">{r.tierPoints.toLocaleString()}</td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">
                      {r.wins}승 · {r.winStreak}연승중
                    </td>
                  </tr>
                ))}
                {preview.topRankers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                      아직 랭커가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleForceReset}
            disabled={resetting}
            className="rounded-md border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            {resetting ? "처리 중..." : "지금 즉시 시즌 종료"}
          </button>
        </>
      )}
    </div>
  );
}
