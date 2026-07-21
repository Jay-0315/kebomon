import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";

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

const TYPE_LABEL: Record<ReportRow["targetType"], string> = {
  POST: "게시글",
  COMMENT: "댓글",
  USER: "유저",
};

const STATUS_LABEL: Record<ReportRow["status"], string> = {
  PENDING: "대기",
  RESOLVED: "처리완료",
  DISMISSED: "기각",
};

function PreviewCell({ report }: { report: ReportRow }) {
  const p = report.preview;
  if ("deleted" in p) {
    return <span className="text-[var(--fg-faint)]">삭제됨</span>;
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
      setError("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  async function resolve(id: string, status: "RESOLVED" | "DISMISSED") {
    try {
      await api.patch(`/admin/reports/${id}`, { status });
      load();
    } catch {
      window.alert("처리에 실패했습니다.");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">신고 관리</h1>

      <div className="mb-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">전체 상태</option>
          <option value="PENDING" className="bg-[var(--bg-elevated)] text-[var(--fg)]">대기</option>
          <option value="RESOLVED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">처리완료</option>
          <option value="DISMISSED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">기각</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">유형</th>
              <th className="px-3 py-2">신고자</th>
              <th className="px-3 py-2">대상</th>
              <th className="px-3 py-2">사유</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">신고일</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {data?.reports.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">{TYPE_LABEL[r.targetType]}</td>
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
                <td className="px-3 py-2">{STATUS_LABEL[r.status]}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolve(r.id, "RESOLVED")}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                      >
                        처리완료
                      </button>
                      <button
                        onClick={() => resolve(r.id, "DISMISSED")}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                      >
                        기각
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--fg-faint)]">처리됨</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && data?.reports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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
