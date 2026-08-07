import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";

type RankingRow = {
  userId: string;
  name: string;
  email: string;
  tdBestWave: number;
  tdAttemptsToday: number;
  tdAttemptDate: string | null;
};

export default function TowerDefensePage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [rows, setRows] = useState<RankingRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<RankingRow[]>("/admin/tower-defense/rankings");
      setRows(res);
    } catch {
      setError(t("common.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [resetTarget, setResetTarget] = useState<RankingRow | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function confirmReset() {
    if (!resetTarget) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/tower-defense/users/${resetTarget.userId}/reset`, {
        reason: resetReason.trim() || undefined,
      });
      setResetTarget(null);
      setResetReason("");
      load();
    } catch {
      showToast(t("towerDefense.error_reset"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("towerDefense.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("towerDefense.subtitle")}</p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("towerDefense.col_rank")}</th>
              <th className="px-3 py-2">{t("towerDefense.col_player")}</th>
              <th className="px-3 py-2">{t("towerDefense.col_best_wave")}</th>
              <th className="px-3 py-2">{t("towerDefense.col_attempts_today")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r, i) => (
              <tr key={r.userId} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 text-[var(--fg-muted)]">{i + 1}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link to={`/users/${r.userId}`} className="text-[#b7607e] hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-[var(--fg-faint)]">{r.email}</div>
                </td>
                <td className="px-3 py-2 font-medium">{r.tdBestWave}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">
                  {r.tdAttemptDate ? `${r.tdAttemptsToday} (${r.tdAttemptDate})` : "-"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setResetTarget(r)}
                    className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                  >
                    {t("towerDefense.reset_btn")}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("common.no_results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
          onClick={() => !submitting && setResetTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold">{t("towerDefense.modal_title")}</h2>
            <p className="mb-3 text-xs text-[var(--fg-faint)]">
              {resetTarget.name} ({resetTarget.email}) · {t("towerDefense.col_best_wave")} {resetTarget.tdBestWave}
            </p>
            <p className="mb-3 text-xs text-[var(--fg-faint)]">{t("towerDefense.modal_desc")}</p>
            <textarea
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              rows={3}
              maxLength={255}
              placeholder={t("common.reason")}
              className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={submitting}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmReset}
                disabled={submitting}
                className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
              >
                {submitting ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
