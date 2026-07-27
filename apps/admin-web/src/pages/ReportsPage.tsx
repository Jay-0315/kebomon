import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

type ReportRow = {
  id: string;
  reporterId: string;
  reporter: { id: string; name: string; email: string };
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  preview:
    | { deleted: true }
    | { content: string; category?: string; postId?: string }
    | { name: string; email: string; status: string };
};

type ReportsResponse = {
  reports: ReportRow[];
  total: number;
  page: number;
  totalPages: number;
};

const TYPE_LABEL_KEY: Record<ReportRow["targetType"], TranslationKey> = {
  POST: "reports.type_post",
  COMMENT: "reports.type_comment",
  USER: "reports.type_user",
};

const STATUS_LABEL_KEY: Record<ReportRow["status"], TranslationKey> = {
  PENDING: "reports.status_pending",
  RESOLVED: "reports.status_resolved",
  DISMISSED: "reports.status_dismissed",
};

function PreviewCell({ report }: { report: ReportRow }) {
  const { t } = useLang();
  const p = report.preview;
  if ("deleted" in p) {
    return <span className="text-[var(--fg-faint)]">{t("reports.deleted")}</span>;
  }
  if (report.targetType === "USER" && "email" in p) {
    return (
      <Link to={`/users/${report.targetId}`} className="text-[#b7607e] hover:underline">
        {p.name} ({p.email})
      </Link>
    );
  }
  if ("content" in p) {
    return <span className="line-clamp-2 max-w-xs">{p.content}</span>;
  }
  return <span className="text-[var(--fg-faint)]">-</span>;
}

export default function ReportsPage() {
  const { t } = useLang();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await api.get<ReportsResponse>(`/admin/reports?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("reports.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const [resolving, setResolving] = useState<{ id: string; status: "RESOLVED" | "DISMISSED" } | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function confirmResolve() {
    if (!resolving) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/reports/${resolving.id}`, {
        status: resolving.status,
        resolutionNote: resolutionNote.trim() || undefined,
      });
      setResolving(null);
      setResolutionNote("");
      load();
    } catch {
      window.alert(t("reports.error_resolve"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("reports.title")}</h1>

      <div className="mb-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("reports.status_all")}</option>
          <option value="PENDING" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("reports.status_pending")}</option>
          <option value="RESOLVED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("reports.status_resolved")}</option>
          <option value="DISMISSED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("reports.status_dismissed")}</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("reports.col_type")}</th>
              <th className="px-3 py-2">{t("reports.col_reporter")}</th>
              <th className="px-3 py-2">{t("reports.col_target")}</th>
              <th className="px-3 py-2">{t("reports.col_reason")}</th>
              <th className="px-3 py-2">{t("common.status")}</th>
              <th className="px-3 py-2">{t("reports.col_created")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.reports.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{t(TYPE_LABEL_KEY[r.targetType])}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link to={`/users/${r.reporterId}`} className="text-[#b7607e] hover:underline">
                    {r.reporter.name}
                  </Link>
                  <div className="text-xs text-[var(--fg-faint)]">{r.reporter.email}</div>
                </td>
                <td className="px-3 py-2">
                  <PreviewCell report={r} />
                </td>
                <td className="px-3 py-2 max-w-xs">{r.reason}</td>
                <td className="px-3 py-2">{t(STATUS_LABEL_KEY[r.status])}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setResolving({ id: r.id, status: "RESOLVED" })}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                      >
                        {t("reports.status_resolved")}
                      </button>
                      <button
                        onClick={() => setResolving({ id: r.id, status: "DISMISSED" })}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                      >
                        {t("reports.status_dismissed")}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--fg-faint)]">{t("reports.already_handled")}</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && data?.reports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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

      {resolving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
          onClick={() => !submitting && setResolving(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold">
              {resolving.status === "RESOLVED" ? t("reports.modal_title_resolved") : t("reports.modal_title_dismissed")}
            </h2>
            <p className="mb-3 text-xs text-[var(--fg-faint)]">{t("reports.modal_desc")}</p>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
              maxLength={255}
              placeholder={t("reports.note_placeholder")}
              className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolving(null)}
                disabled={submitting}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmResolve}
                disabled={submitting}
                className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
              >
                {submitting ? t("reports.processing") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
