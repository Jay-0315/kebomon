import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { api } from "../lib/api";
import RewardAdjustModal, { type RewardSummary } from "../components/RewardAdjustModal";
import SuspendUserModal from "../components/SuspendUserModal";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useLang } from "../context/LangContext";

type SortKey = "name" | "email" | "role" | "status" | "reward" | "createdAt" | "lastLoginAt";
type SortDir = "asc" | "desc";

function SortHeader({
  sortKey,
  label,
  activeKey,
  dir,
  onToggle,
}: {
  sortKey: SortKey;
  label: string;
  activeKey: SortKey;
  dir: SortDir;
  onToggle: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-3 py-2">
      <button
        onClick={() => onToggle(sortKey)}
        className={`flex items-center gap-1 hover:text-[var(--fg)] ${active ? "text-[var(--fg)]" : ""}`}
      >
        {label}
        <Icon size={12} />
      </button>
    </th>
  );
}

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
  online: boolean;
};

type UsersResponse = {
  users: AdminUserRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function UsersPage() {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      params.set("page", String(p));
      const res = await api.get<UsersResponse>(`/admin/users?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("common.error_load"));
    } finally {
      setLoading(false);
    }
  }

  // 검색어/필터/정렬이 바뀌면 1페이지부터 즉시 재검색
  useEffect(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, roleFilter, statusFilter, sortBy, sortDir]);

  function handlePageChange(p: number) {
    setPage(p);
    void load(p);
  }

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
  }

  async function toggleRole(user: AdminUserRow) {
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(t("users.confirm_role_change", { email: user.email, role: nextRole }))) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: nextRole });
      void load(page);
    } catch {
      window.alert(t("users.error_role_change"));
    }
  }

  async function unsuspend(user: AdminUserRow) {
    if (!window.confirm(t("users.confirm_unsuspend", { email: user.email }))) return;
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: "ACTIVE" });
      void load(page);
    } catch {
      window.alert(t("users.error_unsuspend"));
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("users.title")}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("users.search_placeholder")}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("users.role_all")}</option>
          <option value="USER" className="bg-[var(--bg-elevated)] text-[var(--fg)]">USER</option>
          <option value="ADMIN" className="bg-[var(--bg-elevated)] text-[var(--fg)]">ADMIN</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("users.status_all")}</option>
          <option value="ACTIVE" className="bg-[var(--bg-elevated)] text-[var(--fg)]">ACTIVE</option>
          <option value="SUSPENDED" className="bg-[var(--bg-elevated)] text-[var(--fg)]">SUSPENDED</option>
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <SortHeader sortKey="name" label={t("users.col_name")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <SortHeader sortKey="email" label={t("users.col_email")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <SortHeader sortKey="role" label={t("users.col_role")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <th className="px-3 py-2">{t("users.col_online")}</th>
              <SortHeader
                sortKey="reward"
                label={t("users.col_reward")}
                activeKey={sortBy}
                dir={sortDir}
                onToggle={toggleSort}
              />
              <SortHeader sortKey="createdAt" label={t("users.col_created")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <SortHeader sortKey="lastLoginAt" label={t("users.col_last_login")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <th className="px-3 py-2">{t("common.actions")}</th>
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
                  <span className="flex items-center gap-1.5" title={u.online ? t("users.online") : t("users.offline")}>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: u.online ? "#3b82f6" : "#ef4444" }}
                    />
                    <span className="text-[var(--fg-muted)]">{u.online ? t("users.online") : t("users.offline")}</span>
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {u.reward
                    ? `${u.reward.missionPoints} / ${u.reward.normalEggs} / ${u.reward.bigEggs} / ${u.reward.goldenEggs} / ${u.reward.enhancementStones}`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleRole(u)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {u.role === "ADMIN" ? t("users.demote") : t("users.promote")}
                    </button>
                    <button
                      onClick={() => (u.status === "SUSPENDED" ? unsuspend(u) : setSuspendTarget(u))}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {u.status === "SUSPENDED" ? t("users.unsuspend") : t("users.suspend")}
                    </button>
                    <button
                      onClick={() => setRewardTarget(u)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {t("users.adjust_reward")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && data?.users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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
            onClick={() => handlePageChange(page - 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.prev")}
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.next")}
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
