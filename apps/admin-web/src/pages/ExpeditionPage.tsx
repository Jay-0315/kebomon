import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type ExpeditionRow = {
  userId: string;
  name: string;
  email: string;
  regionId: string;
  partySize: number;
  startTime: string;
  endsAt: string;
  eventTemplateId: string | null;
  eventBonusMult: number | null;
};

type ExpeditionResponse = {
  rows: ExpeditionRow[];
  total: number;
};

export default function ExpeditionPage() {
  const { t } = useLang();
  const [data, setData] = useState<ExpeditionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api
      .get<ExpeditionResponse>("/admin/expedition/active")
      .then(setData)
      .catch(() => setError(t("common.error_load")));
  }, [t]);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("expedition.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("expedition.subtitle")}</p>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("expedition.col_name")}</th>
              <th className="px-3 py-2">{t("expedition.col_email")}</th>
              <th className="px-3 py-2">{t("expedition.col_region")}</th>
              <th className="px-3 py-2">{t("expedition.col_party_size")}</th>
              <th className="px-3 py-2">{t("expedition.col_start")}</th>
              <th className="px-3 py-2">{t("expedition.col_ends_at")}</th>
              <th className="px-3 py-2">{t("expedition.col_event_bonus")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <tr key={r.userId} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{r.email}</td>
                <td className="px-3 py-2">{r.regionId}</td>
                <td className="px-3 py-2">{r.partySize}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(r.startTime).toLocaleString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(r.endsAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">
                  {r.eventTemplateId ? `${r.eventTemplateId} (x${r.eventBonusMult ?? 1})` : "-"}
                </td>
              </tr>
            ))}
            {data?.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("common.no_results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
