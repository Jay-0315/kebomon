import { useEffect, useState } from "react";
import { api } from "../lib/api";
import PostDetailModal, { type PostDetail } from "../components/PostDetailModal";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";

type PostRow = PostDetail;

type PostsResponse = {
  posts: PostRow[];
  total: number;
  page: number;
  totalPages: number;
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function CommunityPostsPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PostsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PostRow | null>(null);

  async function load() {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      params.set("page", String(page));
      const res = await api.get<PostsResponse>(`/admin/community/posts?${params.toString()}`);
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

  async function handleDelete(post: PostRow) {
    if (!window.confirm(t("community.confirm_delete_post"))) return;
    try {
      await api.delete(`/admin/community/posts/${post.id}`);
      load();
    } catch {
      showToast(t("community.error_delete"), "error");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("community.title_posts")}</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("community.search_placeholder")}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("community.category_all")}</option>
          <option value="brag" className="bg-[var(--bg-elevated)] text-[var(--fg)]">brag</option>
          <option value="tip" className="bg-[var(--bg-elevated)] text-[var(--fg)]">tip</option>
          <option value="chat" className="bg-[var(--bg-elevated)] text-[var(--fg)]">chat</option>
        </select>
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
              <th className="px-3 py-2">{t("community.col_category")}</th>
              <th className="px-3 py-2">{t("community.col_likes")}</th>
              <th className="px-3 py-2">{t("community.col_created")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.posts.map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap">{p.author?.name ?? "-"}</td>
                <td className="max-w-md truncate px-3 py-2 text-[var(--fg-muted)]">{stripHtml(p.content) || t("community.no_content")}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="px-3 py-2">{p.likesCount}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)] whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewing(p)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {t("community.view_detail")}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.posts.length === 0 && (
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

      {viewing && <PostDetailModal post={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
