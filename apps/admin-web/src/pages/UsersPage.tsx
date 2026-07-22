import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import RewardAdjustModal, { type RewardSummary } from "../components/RewardAdjustModal";
import SuspendUserModal from "../components/SuspendUserModal";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  suspendedReason: string | null;
  suspendedUntil: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  reward: RewardSummary;
};

type UsersResponse = {
  users: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function UsersPage() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardTarget, setRewardTarget] = useState<AdminUserRow | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRow | null>(null);

  async function load(p: number) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(p));
      const res = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
      setData(res);
    } catch {
      setError("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 검색어/필터가 바뀌면 1페이지부터 즉시 재검색
  useEffect(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, roleFilter, statusFilter]);

  function handlePageChange(p: number) {
    setPage(p);
    void load(p);
  }

  async function toggleRole(user: AdminUserRow) {
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(`${user.email}의 권한을 ${nextRole}로 변경할까요?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: nextRole });
      void load(page);
    } catch {
      window.alert("권한 변경에 실패했습니다.");
    }
  }

  async function unsuspend(user: AdminUserRow) {
    if (!window.confirm(`${user.email}의 정지를 해제할까요?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: "ACTIVE" });
      void load(page);
    } catch {
      window.alert("정지 해제에 실패했습니다.");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">회원 관리</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">전체 권한</option>
          <option value="USER" className="bg-[var(--bg-elevated)] text-[var(--fg)]">USER</option>
          <option value="ADMIN" className="bg-[var(--bg-elevated)] text-[var(--fg)]">ADMIN</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">전체 상태</option>
          <option value="ACTIVE" className="bg-[var(--bg-elevated)] text-[var(--fg)]">ACTIVE</option>
          <option value="SUSPENDED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">SUSPENDED</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">권한</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2">재화 (KP/일반알/왕알/황금알/강화석)</th>
              <th className="px-3 py-2">가입일</th>
              <th className="px-3 py-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  <Link to={`/users/${u.id}`} className="text-[#b7607e] hover:underline">
                    {u.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">
                  {u.status}
                  {u.status === "SUSPENDED" && (
                    <span className="ml-1 text-[var(--fg-faint)]">
                      (
                      {u.suspendedUntil
                        ? `~${new Date(u.suspendedUntil).toLocaleString("ko-KR")}`
                        : "영구 정지"}
                      {u.suspendedReason ? ` · ${u.suspendedReason}` : ""}
                      )
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {u.reward
                    ? `${u.reward.missionPoints} / ${u.reward.normalEggs} / ${u.reward.bigEggs} / ${u.reward.goldenEggs} / ${u.reward.enhancementStones}`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRole(u)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {u.role === "ADMIN" ? "관리자 해제" : "관리자 지정"}
                    </button>
                    <button
                      onClick={() => (u.status === "SUSPENDED" ? unsuspend(u) : setSuspendTarget(u))}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {u.status === "SUSPENDED" ? "정지 해제" : "정지"}
                    </button>
                    <button
                      onClick={() => setRewardTarget(u)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      재화 조정
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && data?.users.length === 0 && (
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
            onClick={() => handlePageChange(page - 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}

      {rewardTarget && (
        <RewardAdjustModal
          userId={rewardTarget.id}
          userLabel={`${rewardTarget.name} (${rewardTarget.email})`}
          current={rewardTarget.reward}
          onClose={() => setRewardTarget(null)}
          onSaved={() => load(page)}
        />
      )}

      {suspendTarget && (
        <SuspendUserModal
          userId={suspendTarget.id}
          userLabel={`${suspendTarget.name} (${suspendTarget.email})`}
          onClose={() => setSuspendTarget(null)}
          onSaved={() => load(page)}
        />
      )}
    </div>
  );
}
