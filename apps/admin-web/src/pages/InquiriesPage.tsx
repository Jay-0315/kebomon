import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import type { TranslationKey } from "../lib/i18n";

type InquiryRow = {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  category: "bug" | "account" | "suggestion" | "etc";
  content: string;
  status: "PENDING" | "ANSWERED";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

type InquiriesResponse = {
  inquiries: InquiryRow[];
  total: number;
  page: number;
  totalPages: number;
};

const CATEGORY_LABEL_KEY: Record<InquiryRow["category"], TranslationKey> = {
  bug: "inquiries.category_bug",
  account: "inquiries.category_account",
  suggestion: "inquiries.category_suggestion",
  etc: "inquiries.category_etc",
};

const STATUS_LABEL_KEY: Record<InquiryRow["status"], TranslationKey> = {
  PENDING: "inquiries.status_pending",
  ANSWERED: "inquiries.status_answered",
};

export default function InquiriesPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InquiriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<InquiryRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await api.get<InquiriesResponse>(`/admin/inquiries?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("inquiries.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function confirmReply() {
    if (!replyTarget || !replyText.trim()) return;
    setSubmitting(true);
    try {
      await api.patch(`/admin/inquiries/${replyTarget.id}/reply`, { reply: replyText.trim() });
      setReplyTarget(null);
      setReplyText("");
      load();
    } catch {
      showToast(t("inquiries.error_reply"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("inquiries.title")}</h1>

      <div className="mb-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("inquiries.status_all")}</option>
          <option value="PENDING" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("inquiries.status_pending")}</option>
          <option value="ANSWERED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("inquiries.status_answered")}</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("inquiries.col_category")}</th>
              <th className="px-3 py-2">{t("inquiries.col_author")}</th>
              <th className="px-3 py-2">{t("inquiries.col_content")}</th>
              <th className="px-3 py-2">{t("common.status")}</th>
              <th className="px-3 py-2">{t("inquiries.col_created")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.inquiries.map((q) => (
              <tr key={q.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap">{t(CATEGORY_LABEL_KEY[q.category])}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link to={`/users/${q.userId}`} className="text-[#b7607e] hover:underline">
                    {q.user.name}
                  </Link>
                  <div className="text-xs text-[var(--fg-faint)]">{q.user.email}</div>
                </td>
                <td className="px-3 py-2 max-w-xs">
                  <span className="line-clamp-2">{q.content}</span>
                  {q.adminReply && (
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--fg-faint)]">
                      {t("inquiries.reply_prefix", { reply: q.adminReply })}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2">{t(STATUS_LABEL_KEY[q.status])}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(q.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  {q.status === "PENDING" ? (
                    <button
                      onClick={() => {
                        setReplyTarget(q);
                        setReplyText("");
                      }}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {t("inquiries.reply_button")}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--fg-faint)]">{t("inquiries.already_handled")}</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && data?.inquiries.length === 0 && (
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

      {replyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
          onClick={() => !submitting && setReplyTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold">{t("inquiries.modal_title")}</h2>
            <p className="mb-3 text-xs text-[var(--fg-faint)]">
              {replyTarget.user.name} ({replyTarget.user.email}) · {t(CATEGORY_LABEL_KEY[replyTarget.category])}
            </p>
            <p className="mb-3 max-h-32 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg-soft)] p-2 text-sm whitespace-pre-wrap">
              {replyTarget.content}
            </p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={t("inquiries.reply_placeholder")}
              className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                disabled={submitting}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmReply}
                disabled={submitting || !replyText.trim()}
                className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
              >
                {submitting ? t("inquiries.submitting") : t("inquiries.submit_reply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
