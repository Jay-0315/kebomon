import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type BattleRow = {
  userId: string;
  name: string;
  email: string;
  tierPoints?: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestStreak: number;
  winRate: number;
  suspicious: boolean;
};

type BattleResponse = {
  rows: BattleRow[];
  total: number;
  page: number;
  totalPages: number;
};

type Mode = "colosseum" | "duel";

export default function BattlesPage() {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>("colosseum");
  const [sort, setSort] = useState<"winrate" | "tierpoints" | "streak">("winrate");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BattleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<BattleResponse>(`/admin/battles/${mode}?sort=${sort}&page=${page}`)
      .then(setData)
      .catch(() => setError(t("common.error_load")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sort, page]);

  function switchMode(next: Mode) {
    setMode(next);
    setPage(1);
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("battles.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        {mode === "colosseum" ? t("battles.subtitle_colosseum") : t("battles.subtitle_duel")}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
          {(["colosseum", "duel"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-3 py-1.5 text-sm ${
                mode === m ? "bg-[var(--bg-active)] text-[var(--fg)]" : "text-[var(--fg-muted)] hover:bg-[var(--bg-hover)]"
              }`}
            >
              {m === "colosseum" ? t("battles.mode_colosseum") : t("battles.mode_duel")}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="winrate" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("battles.sort_winrate")}</option>
          {mode === "colosseum" && <option value="tierpoints" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("battles.sort_tierpoints")}</option>}
          <option value="streak" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("battles.sort_streak")}</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("battles.col_name")}</th>
              <th className="px-3 py-2">{t("battles.col_email")}</th>
              {mode === "colosseum" && <th className="px-3 py-2">{t("battles.col_tierpoints")}</th>}
              <th className="px-3 py-2">{t("battles.col_wins_losses")}</th>
              <th className="px-3 py-2">{t("battles.col_winrate")}</th>
              <th className="px-3 py-2">{t("battles.col_streak")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr
                key={r.userId}
                className={`border-t border-[var(--border)] ${r.suspicious ? "bg-amber-500/10" : ""}`}
              >
                <td className="px-3 py-2">
                  {r.name}
                  {r.suspicious && (
                    <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                      {t("battles.suspicious")}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{r.email}</td>
                {mode === "colosseum" && <td className="px-3 py-2">{r.tierPoints}</td>}
                <td className="px-3 py-2">
                  {r.wins} / {r.losses}
                </td>
                <td className="px-3 py-2">{(r.winRate * 100).toFixed(1)}%</td>
                <td className="px-3 py-2">
                  {r.winStreak} / {r.bestStreak}
                </td>
              </tr>
            ))}
            {data?.rows.length === 0 && (
              <tr>
                <td colSpan={mode === "colosseum" ? 6 : 5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("common.no_results")}
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
            {t("common.prev")}
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.next")}
          </button>
        </div>
      )}
    </div>
  );
}
