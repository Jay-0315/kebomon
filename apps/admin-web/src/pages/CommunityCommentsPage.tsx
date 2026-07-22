import { useEffect, useState } from "react";
import { api } from "../lib/api";

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
      setError("목록을 불러오지 못했습니다.");
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
    if (!window.confirm("이 댓글을 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      await api.delete(`/admin/community/comments/${comment.id}`);
      load();
    } catch {
      window.alert("삭제에 실패했습니다.");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">댓글 관리</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="내용 검색"
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]">
          검색
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">작성자</th>
              <th className="px-3 py-2">내용</th>
              <th className="px-3 py-2">게시글 ID</th>
              <th className="px-3 py-2">작성일</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {data?.comments.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap">{c.author?.name ?? "-"}</td>
                <td className="max-w-md truncate px-3 py-2 text-[var(--fg-muted)]">{stripHtml(c.content) || "(내용 없음)"}</td>
                <td className="px-3 py-2 text-[var(--fg-faint)]">{c.postId}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)] whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {data?.comments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  결과가 없습니다.
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
            이전
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
