import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import LoadingState from "../components/LoadingState";

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
  const { t } = useLang();
  const { showToast } = useToast();
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
      setError(t("season.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleForceReset() {
    if (!window.confirm(t("season.confirm_force_reset"))) return;
    setResetting(true);
    setError(null);
    try {
      await api.post("/admin/season/force-reset");
      showToast(t("season.reset_done"), "success");
      load();
    } catch {
      setError(t("season.error_reset"));
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold">{t("season.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("season.subtitle")}</p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {preview && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--fg-muted)]">{t("season.current_season")}</p>
              <p className="mt-1 text-lg font-semibold">{t("season.season_number", { id: preview.seasonId })}</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-xs text-[var(--fg-muted)]">{t("season.next_auto_reset")}</p>
              <p className="mt-1 text-sm font-semibold">{new Date(preview.nextResetAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-4 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3 py-2">{t("season.col_rank")}</th>
                  <th className="px-3 py-2">{t("season.col_nickname")}</th>
                  <th className="px-3 py-2">{t("season.col_tier_points")}</th>
                  <th className="px-3 py-2">{t("season.col_record")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.topRankers.map((r) => (
                  <tr key={r.userId} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2">{r.rank}</td>
                    <td className="px-3 py-2">{r.nickname}</td>
                    <td className="px-3 py-2">{r.tierPoints.toLocaleString()}</td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">
                      {t("season.record_value", { wins: r.wins, streak: r.winStreak })}
                    </td>
                  </tr>
                ))}
                {preview.topRankers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                      {t("season.no_rankers")}
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
            {resetting ? t("season.processing") : t("season.force_reset")}
          </button>
        </>
      )}
    </div>
  );
}
