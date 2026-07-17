import { useEffect, useState } from "react";
import { api } from "../lib/api";
import RewardAdjustModal, { type RewardSummary } from "../components/RewardAdjustModal";

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  suspendedReason: string | null;
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
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewardTarget, setRewardTarget] = useState<AdminUserRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
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
  }, [page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function toggleRole(user: AdminUserRow) {
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(`${user.email}의 권한을 ${nextRole}로 변경할까요?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: nextRole });
      load();
    } catch {
      window.alert("권한 변경에 실패했습니다.");
    }
  }

  async function toggleStatus(user: AdminUserRow) {
    if (user.status === "SUSPENDED") {
      if (!window.confirm(`${user.email}의 정지를 해제할까요?`)) return;
      try {
        await api.patch(`/admin/users/${user.id}/status`, { status: "ACTIVE" });
        load();
      } catch {
        window.alert("정지 해제에 실패했습니다.");
      }
      return;
    }

    const reason = window.prompt(`${user.email}을(를) 정지할 사유를 입력하세요.`);
    if (!reason) return;
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: "SUSPENDED", reason });
      load();
    } catch {
      window.alert("정지 처리에 실패했습니다.");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">회원 관리</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 이메일 검색"
          className="rounded-md border border-white/15 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-white/15 bg-[#0a0a0a] px-2 py-1.5 text-sm"
        >
          <option value="">전체 권한</option>
          <option value="USER">USER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-white/15 bg-[#0a0a0a] px-2 py-1.5 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          검색
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-white/60">
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
              <tr key={u.id} className="border-t border-white/10">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">
                  {u.status}
                  {u.status === "SUSPENDED" && u.suspendedReason && (
                    <span className="ml-1 text-white/40">({u.suspendedReason})</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-white/70">
                  {u.reward
                    ? `${u.reward.missionPoints} / ${u.reward.normalEggs} / ${u.reward.bigEggs} / ${u.reward.goldenEggs} / ${u.reward.enhancementStones}`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-white/60">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRole(u)}
                      className="rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
                    >
                      {u.role === "ADMIN" ? "관리자 해제" : "관리자 지정"}
                    </button>
                    <button
                      onClick={() => toggleStatus(u)}
                      className="rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
                    >
                      {u.status === "SUSPENDED" ? "정지 해제" : "정지"}
                    </button>
                    <button
                      onClick={() => setRewardTarget(u)}
                      className="rounded border border-white/15 px-2 py-1 text-xs hover:bg-white/5"
                    >
                      재화 조정
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && data?.users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-white/40">
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
            className="rounded border border-white/15 px-2 py-1 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-white/60">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-white/15 px-2 py-1 disabled:opacity-30"
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
          onSaved={load}
        />
      )}
    </div>
  );
}
