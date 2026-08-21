import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import LoadingState from "../components/LoadingState";
import RewardAdjustModal, { type RewardSummary } from "../components/RewardAdjustModal";
import SuspendUserModal from "../components/SuspendUserModal";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { isSuperAdmin } from "../lib/auth";
import type { TranslationKey } from "../lib/i18n";

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
  titles: { titleId: number; obtainedAt: string }[];
  _count: { posts: number; comments: number; characters: number };
  reportsAgainstCount: number;
};

type ActivityLog = {
  points: { id: string; delta: number; reason: string; createdAt: string }[];
  characters: { characterId: number; name: string; obtainedAt: string }[];
};

type SuspensionHistoryRow = {
  id: string;
  action: "SUSPENDED" | "UNSUSPENDED" | "AUTO_EXPIRED";
  reason: string | null;
  suspendedUntil: string | null;
  actedBy: string | null;
  createdAt: string;
};

const SUSPENSION_ACTION_KEY: Record<SuspensionHistoryRow["action"], TranslationKey> = {
  SUSPENDED: "users.suspend",
  UNSUSPENDED: "users.unsuspend",
  AUTO_EXPIRED: "userDetail.auto_expired",
};

const REASON_KEYS: Record<string, TranslationKey> = {
  gacha_pull: "operations.reason.gacha_pull",
  auction_settle_refund: "operations.reason.auction_settle_refund",
  auction_seller_payout: "operations.reason.auction_seller_payout",
  auction_bid: "operations.reason.auction_bid",
  auction_bid_refund: "operations.reason.auction_bid_refund",
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
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLog | null>(null);
  const [suspensionHistory, setSuspensionHistory] = useState<SuspensionHistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [titleIdInput, setTitleIdInput] = useState("");
  const [grantingTitle, setGrantingTitle] = useState(false);

  const dateLocale = lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "ko-KR";
  const formatDateTime = (value: string) => new Date(value).toLocaleString(dateLocale);
  const formatDate = (value: string) => new Date(value).toLocaleDateString(dateLocale);

  const labelRole = (role: string) => {
    if (role === "SUPER_ADMIN") return t("users.role_super_admin");
    if (role === "ADMIN") return t("users.role_admin");
    if (role === "USER") return t("users.role_user");
    return role;
  };

  const labelStatus = (status: string) => {
    if (status === "ACTIVE") return t("users.status_active");
    if (status === "SUSPENDED") return t("users.status_suspended");
    return status;
  };

  const labelPostCategory = (category: string) => {
    if (category === "brag") return t("userDetail.category_brag");
    if (category === "tip") return t("userDetail.category_tip");
    if (category === "chat") return t("userDetail.category_chat");
    return category;
  };

  const labelReason = (value: string) => {
    const key = REASON_KEYS[value];
    if (key) return t(key);
    if (value.includes("가챠") || value.includes("뽑기")) return t("operations.reason.gacha_pull");
    if (value.includes("원정")) return t("operations.reason.expedition_reward");
    if (value.includes("출석")) return t("operations.reason.attendance_reward");
    if (value.includes("낚시")) return t("operations.reason.fishing_reward");
    if (value.includes("타워") || value.includes("디펜스")) return t("operations.reason.tower_defense_reward");
    return value;
  };

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [userRes, logRes, suspensionRes] = await Promise.all([
        api.get<UserDetail>(`/admin/users/${id}`),
        api.get<ActivityLog>(`/admin/users/${id}/activity-log`),
        api.get<SuspensionHistoryRow[]>(`/admin/users/${id}/suspension-history`),
      ]);
      setUser(userRes);
      setActivityLog(logRes);
      setSuspensionHistory(suspensionRes);
    } catch {
      setError(t("userDetail.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleRole() {
    if (!user) return;
    const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(t("users.confirm_role_change", { email: user.email, role: labelRole(nextRole) }))) return;
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: nextRole });
      void load();
    } catch {
      showToast(t("users.error_role_change"), "error");
    }
  }

  async function unsuspend() {
    if (!user) return;
    if (!window.confirm(t("users.confirm_unsuspend", { email: user.email }))) return;
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: "ACTIVE" });
      void load();
    } catch {
      showToast(t("users.error_unsuspend"), "error");
    }
  }

  async function grantTitle() {
    if (!user) return;
    const titleId = Number(titleIdInput);
    if (!Number.isInteger(titleId) || titleId < 1) {
      showToast(t("userDetail.error_title_invalid"), "error");
      return;
    }
    setGrantingTitle(true);
    try {
      await api.post(`/admin/users/${user.id}/titles`, { titleId });
      setTitleIdInput("");
      void load();
    } catch {
      showToast(t("userDetail.error_title_grant"), "error");
    } finally {
      setGrantingTitle(false);
    }
  }

  async function revokeTitle(titleId: number) {
    if (!user) return;
    if (!window.confirm(t("userDetail.confirm_title_revoke", { id: titleId }))) return;
    try {
      await api.delete(`/admin/users/${user.id}/titles/${titleId}`);
      void load();
    } catch {
      showToast(t("userDetail.error_title_revoke"), "error");
    }
  }

  if (loading) return <LoadingState />;
  if (error || !user) return <p className="text-red-400">{error ?? t("userDetail.not_found")}</p>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate("/users")}
        className="mb-4 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
      >
        {t("userDetail.back_to_list")}
      </button>

      <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">{user.name}</h1>
            <p className="text-sm text-[var(--fg-muted)]">{user.email}</p>
            <p className="mt-1 text-xs text-[var(--fg-faint)]">
              {t("userDetail.joined_and_login", {
                date: formatDate(user.createdAt),
                login: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "-",
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs">{labelRole(user.role)}</span>
            <span className="text-xs">
              {labelStatus(user.status)}
              {user.status === "SUSPENDED" && (
                <span className="ml-1 text-[var(--fg-faint)]">
                  (
                  {user.suspendedUntil ? `~${formatDateTime(user.suspendedUntil)}` : t("userDetail.permanent")}
                  {user.suspendedReason ? ` · ${user.suspendedReason}` : ""}
                  )
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {isSuperAdmin() && user.role !== "SUPER_ADMIN" && (
            <button
              onClick={toggleRole}
              className="rounded border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]"
            >
              {user.role === "ADMIN" ? t("users.demote") : t("users.promote")}
            </button>
          )}
          <button
            onClick={() => (user.status === "SUSPENDED" ? void unsuspend() : setShowSuspend(true))}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]"
          >
            {user.status === "SUSPENDED" ? t("users.unsuspend") : t("users.suspend")}
          </button>
          {isSuperAdmin() && (
            <button
              onClick={() => setShowReward(true)}
              className="rounded border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]"
            >
              {t("users.adjust_reward")}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="KP" value={user.reward?.missionPoints ?? 0} />
        <StatTile label={t("userDetail.stat_characters")} value={user._count.characters} />
        <StatTile label={t("userDetail.stat_posts")} value={user._count.posts} />
        <StatTile label={t("userDetail.stat_comments")} value={user._count.comments} />
        <StatTile
          label={t("userDetail.stat_colosseum")}
          value={
            user.battleStats
              ? t("userDetail.wins_losses", { wins: user.battleStats.wins, losses: user.battleStats.losses })
              : "-"
          }
        />
        <StatTile
          label={t("userDetail.stat_duel")}
          value={
            user.duelStats
              ? t("userDetail.wins_losses", { wins: user.duelStats.wins, losses: user.duelStats.losses })
              : "-"
          }
        />
        <StatTile label={t("userDetail.stat_guild")} value={user.guildMembership?.guild.name ?? "-"} />
        <StatTile label={t("userDetail.stat_reports_against")} value={user.reportsAgainstCount} />
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("userDetail.recent_posts")}</h2>
        {user.posts.length === 0 ? (
          <p className="text-sm text-[var(--fg-faint)]">{t("userDetail.no_posts")}</p>
        ) : (
          <ul className="space-y-2">
            {user.posts.map((post) => (
              <li key={post.id} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                <p className="line-clamp-2">{post.content}</p>
                <p className="mt-1 text-xs text-[var(--fg-faint)]">
                  {labelPostCategory(post.category)} · {formatDateTime(post.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("userDetail.points_history")}</h2>
          {!activityLog || activityLog.points.length === 0 ? (
            <p className="text-sm text-[var(--fg-faint)]">{t("userDetail.no_history")}</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {activityLog.points.map((point) => (
                <li key={point.id} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                  <span className={point.delta > 0 ? "text-emerald-400" : "text-red-400"}>
                    {point.delta > 0 ? "+" : ""}
                    {point.delta}P
                  </span>{" "}
                  · {labelReason(point.reason)}
                  <p className="mt-0.5 text-xs text-[var(--fg-faint)]">{formatDateTime(point.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("userDetail.characters_history")}</h2>
          {!activityLog || activityLog.characters.length === 0 ? (
            <p className="text-sm text-[var(--fg-faint)]">{t("userDetail.no_history")}</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {activityLog.characters.map((character, index) => (
                <li key={`${character.characterId}-${index}`} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                  {t("userDetail.character_obtained", { name: character.name })}
                  <p className="mt-0.5 text-xs text-[var(--fg-faint)]">{formatDateTime(character.obtainedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("userDetail.suspension_history")}</h2>
        {!suspensionHistory || suspensionHistory.length === 0 ? (
          <p className="text-sm text-[var(--fg-faint)]">{t("userDetail.no_history")}</p>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {suspensionHistory.map((history) => (
              <li key={history.id} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                <span className={history.action === "SUSPENDED" ? "text-red-400" : "text-emerald-400"}>
                  {t(SUSPENSION_ACTION_KEY[history.action])}
                </span>
                {history.reason && <> · {history.reason}</>}
                {history.action === "SUSPENDED" && (
                  <> · {history.suspendedUntil ? `~${formatDateTime(history.suspendedUntil)}` : t("userDetail.permanent")}</>
                )}
                <p className="mt-0.5 text-xs text-[var(--fg-faint)]">{formatDateTime(history.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isSuperAdmin() && (
        <div className="mt-4 rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("userDetail.titles_section")}</h2>
          {user.titles.length === 0 ? (
            <p className="mb-3 text-sm text-[var(--fg-faint)]">{t("userDetail.no_titles")}</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {user.titles.map((title) => (
                <li
                  key={title.titleId}
                  className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0"
                >
                  <span>
                    #{title.titleId}
                    <span className="ml-2 text-xs text-[var(--fg-faint)]">
                      {formatDateTime(title.obtainedAt)}
                    </span>
                  </span>
                  <button
                    onClick={() => void revokeTitle(title.titleId)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    {t("userDetail.revoke_title")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={titleIdInput}
              onChange={(event) => setTitleIdInput(event.target.value)}
              placeholder={t("userDetail.title_id_placeholder")}
              className="w-40 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
            <button
              onClick={() => void grantTitle()}
              disabled={grantingTitle}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              {grantingTitle ? t("common.loading") : t("userDetail.grant_title")}
            </button>
          </div>
        </div>
      )}

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
