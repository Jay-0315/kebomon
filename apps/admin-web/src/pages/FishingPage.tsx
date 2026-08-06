import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type FishingRow = {
  userId: string;
  name: string;
  email: string;
  totalCatches: number;
  speciesCount: number;
  fishDexMilestoneBest: number;
  lastFishCastAt: string | null;
};

type FishingResponse = {
  rows: FishingRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function FishingPage() {
  const { t } = useLang();
  const [sort, setSort] = useState<"count" | "species">("count");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FishingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<FishingResponse>(`/admin/fishing/rankings?sort=${sort}&page=${page}`)
      .then(setData)
      .catch(() => setError(t("common.error_load")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, page]);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("fishing.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("fishing.subtitle")}</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as typeof sort);
            setPage(1);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="count" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("fishing.sort_count")}</option>
          <option value="species" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("fishing.sort_species")}</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("fishing.col_name")}</th>
              <th className="px-3 py-2">{t("fishing.col_email")}</th>
              <th className="px-3 py-2">{t("fishing.col_total_catches")}</th>
              <th className="px-3 py-2">{t("fishing.col_species")}</th>
              <th className="px-3 py-2">{t("fishing.col_dex_milestone")}</th>
              <th className="px-3 py-2">{t("fishing.col_last_cast")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.userId} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{r.email}</td>
                <td className="px-3 py-2">{r.totalCatches.toLocaleString()}</td>
                <td className="px-3 py-2">{r.speciesCount}</td>
                <td className="px-3 py-2">{r.fishDexMilestoneBest}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {r.lastFishCastAt ? new Date(r.lastFishCastAt).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
            {data?.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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
