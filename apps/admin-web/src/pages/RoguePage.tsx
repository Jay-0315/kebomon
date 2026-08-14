import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type RogueRow = {
  userId: string;
  name: string;
  email: string;
  rogueClears: number;
  challengeBest: number;
  activeRunStartedAt: string | null;
};

type RogueResponse = {
  rows: RogueRow[];
  total: number;
  page: number;
  totalPages: number;
  maxActiveRunHours: number;
};

function formatElapsed(
  startedAt: string,
  t: (key: "rogue.elapsed_minutes" | "rogue.elapsed_hours" | "rogue.elapsed_hours_minutes", vars: Record<string, number>) => string,
): string {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return t("rogue.elapsed_minutes", { minutes });
  if (minutes <= 0) return t("rogue.elapsed_hours", { hours });
  return t("rogue.elapsed_hours_minutes", { hours, minutes });
}

export default function RoguePage() {
  const { t } = useLang();
  const [sort, setSort] = useState<"clears" | "challenge">("clears");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RogueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<RogueResponse>(`/admin/rogue/rankings?sort=${sort}&page=${page}`)
      .then(setData)
      .catch(() => setError(t("common.error_load")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page]);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("rogue.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("rogue.subtitle")}</p>
      <p className="mb-4 text-xs text-[var(--fg-faint)]">
        {t("rogue.active_limit_note", { hours: data?.maxActiveRunHours ?? 120 })}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as typeof sort);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="clears" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("rogue.sort_clears")}</option>
          <option value="challenge" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("rogue.sort_challenge")}</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("rogue.col_name")}</th>
              <th className="px-3 py-2">{t("rogue.col_email")}</th>
              <th className="px-3 py-2">{t("rogue.col_clears")}</th>
              <th className="px-3 py-2">{t("rogue.col_challenge")}</th>
              <th className="px-3 py-2">{t("rogue.col_status")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.userId} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{r.email}</td>
                <td className="px-3 py-2">{r.rogueClears.toLocaleString()}</td>
                <td className="px-3 py-2">{r.challengeBest.toLocaleString()}</td>
                <td className="px-3 py-2">
                  {r.activeRunStartedAt ? (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-400">
                      {t("rogue.status_running")} ({formatElapsed(r.activeRunStartedAt, t)})
                    </span>
                  ) : (
                    <span className="text-[var(--fg-faint)]">{t("rogue.status_idle")}</span>
                  )}
                </td>
              </tr>
            ))}
            {data?.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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
