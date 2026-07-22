import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { api } from "../lib/api";
import RewardAdjustModal, { type RewardSummary } from "../components/RewardAdjustModal";
import SuspendUserModal from "../components/SuspendUserModal";

type UserDetail = {
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
  battleStats: { tierPoints: number; wins: number; losses: number; winStreak: number; bestStreak: number } | null;
  duelStats: { wins: number; losses: number; winStreak: number; bestStreak: number } | null;
  guildMembership: { role: string; guild: { id: string; name: string } } | null;
  posts: { id: string; content: string; category: string; createdAt: string }[];
  _count: { posts: number; comments: number; characters: number };
  reportsAgainstCount: number;
};

type ActivityLog = {
  points: { id: string; delta: number; reason: string; createdAt: string }[];
  characters: { characterId: number; name: string; obtainedAt: string }[];
};

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [userRes, logRes] = await Promise.all([
        api.get<UserDetail>(`/admin/users/${id}`),
        api.get<ActivityLog>(`/admin/users/${id}/activity-log`),
      ]);
      setUser(userRes);
      setActivityLog(logRes);
    } catch {
      setError("유저 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleRole() {
    if (!user) return;
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(`${user.email}의 권한을 ${nextRole}로 변경할까요?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: nextRole });
      load();
    } catch {
      window.alert("권한 변경에 실패했습니다.");
    }
  }

  async function unsuspend() {
    if (!user) return;
    if (!window.confirm(`${user.email}의 정지를 해제할까요?`)) return;
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: "ACTIVE" });
      load();
    } catch {
      window.alert("정지 해제에 실패했습니다.");
    }
  }

  if (loading) return <p className="text-[var(--fg-faint)]">불러오는 중...</p>;
  if (error || !user) return <p className="text-red-400">{error ?? "유저를 찾을 수 없습니다."}</p>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate("/users")}
        className="mb-4 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
      >
        ← 회원 목록으로
      </button>

      <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">{user.name}</h1>
            <p className="text-sm text-[var(--fg-muted)]">{user.email}</p>
            <p className="mt-1 text-xs text-[var(--fg-faint)]">
              가입일 {new Date(user.createdAt).toLocaleDateString()} · 최근 로그인{" "}
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "-"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">{user.role}</span>
            <span className="text-xs">
              {user.status}
              {user.status === "SUSPENDED" && (
                <span className="ml-1 text-[var(--fg-faint)]">
                  (
                  {user.suspendedUntil
                    ? `~${new Date(user.suspendedUntil).toLocaleString("ko-KR")}`
                    : "영구 정지"}
                  {user.suspendedReason ? ` · ${user.suspendedReason}` : ""}
                  )
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={toggleRole}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]"
          >
            {user.role === "ADMIN" ? "관리자 해제" : "관리자 지정"}
          </button>
          <button
            onClick={() => (user.status === "SUSPENDED" ? unsuspend() : setShowSuspend(true))}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]"
          >
            {user.status === "SUSPENDED" ? "정지 해제" : "정지"}
          </button>
          <button
            onClick={() => setShowReward(true)}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]"
          >
            재화 조정
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="KP" value={user.reward?.missionPoints ?? 0} />
        <StatTile label="보유 캐릭터" value={user._count.characters} />
        <StatTile label="게시글" value={user._count.posts} />
        <StatTile label="댓글" value={user._count.comments} />
        <StatTile
          label="콜로세움"
          value={user.battleStats ? `${user.battleStats.wins}승 ${user.battleStats.losses}패` : "-"}
        />
        <StatTile label="듀얼" value={user.duelStats ? `${user.duelStats.wins}승 ${user.duelStats.losses}패` : "-"} />
        <StatTile label="길드" value={user.guildMembership?.guild.name ?? "-"} />
        <StatTile label="피신고 횟수" value={user.reportsAgainstCount} />
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">최근 게시글</h2>
        {user.posts.length === 0 ? (
          <p className="text-sm text-[var(--fg-faint)]">작성한 게시글이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {user.posts.map((p) => (
              <li key={p.id} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                <p className="line-clamp-2">{p.content}</p>
                <p className="mt-1 text-xs text-[var(--fg-faint)]">
                  {p.category} · {new Date(p.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">KP 내역</h2>
          {!activityLog || activityLog.points.length === 0 ? (
            <p className="text-sm text-[var(--fg-faint)]">내역이 없습니다.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {activityLog.points.map((p) => (
                <li key={p.id} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                  <span className={p.delta > 0 ? "text-emerald-400" : "text-red-400"}>
                    {p.delta > 0 ? "+" : ""}
                    {p.delta}P
                  </span>{" "}
                  · {p.reason}
                  <p className="mt-0.5 text-xs text-[var(--fg-faint)]">{new Date(p.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">케릭터 획득 내역</h2>
          {!activityLog || activityLog.characters.length === 0 ? (
            <p className="text-sm text-[var(--fg-faint)]">내역이 없습니다.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {activityLog.characters.map((c, i) => (
                <li key={`${c.characterId}-${i}`} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                  {c.name} 획득
                  <p className="mt-0.5 text-xs text-[var(--fg-faint)]">{new Date(c.obtainedAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showReward && (
        <RewardAdjustModal
          userId={user.id}
          userLabel={`${user.name} (${user.email})`}
          current={user.reward}
          onClose={() => setShowReward(false)}
          onSaved={load}
        />
      )}

      {showSuspend && (
        <SuspendUserModal
          userId={user.id}
          userLabel={`${user.name} (${user.email})`}
          onClose={() => setShowSuspend(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
