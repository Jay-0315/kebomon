import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";

type CommentRow = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; email: string } | null;
};

type CommentsResponse = {
  comments: CommentRow[];
  total: number;
  page: number;
  totalPages: number;
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function CommunityCommentsPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CommentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("page", String(page));
      const res = await api.get<CommentsResponse>(`/admin/community/comments?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("common.error_load"));
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

  async function handleDelete(comment: CommentRow) {
    if (!window.confirm(t("community.confirm_delete_comment"))) return;
    try {
      await api.delete(`/admin/community/comments/${comment.id}`);
      load();
    } catch {
      showToast(t("community.error_delete"), "error");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("community.title_comments")}</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("community.search_placeholder")}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]">
          {t("common.search")}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("community.col_author")}</th>
              <th className="px-3 py-2">{t("community.col_content")}</th>
              <th className="px-3 py-2">{t("community.col_post_id")}</th>
              <th className="px-3 py-2">{t("community.col_created")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.comments.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap">{c.author?.name ?? "-"}</td>
                <td className="max-w-md truncate px-3 py-2 text-[var(--fg-muted)]">{stripHtml(c.content) || t("community.no_content")}</td>
                <td className="px-3 py-2 text-[var(--fg-faint)]">{c.postId}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)] whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    {t("common.delete")}
                  </button>
                </td>
              </tr>
            ))}
            {data?.comments.length === 0 && (
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
