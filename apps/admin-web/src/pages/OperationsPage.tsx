import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LoadingState from "../components/LoadingState";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";
import type { TranslationKey } from "../lib/i18n";

type OperationsSummary = {
  eventSettings: {
    activeBanners: number;
    scheduledBanners: number;
    maintenanceEnabled: boolean;
    maintenanceEndsAt: string | null;
  };
  kpis: Record<string, number>;
  pointsTrend: { date: string; earned: number; spent: number; rewardLogs: number }[];
  rewardReasons: { reason: string; totalDelta: number; count: number }[];
  recentBalanceChanges: BalanceLogRow[];
};

type RewardLogRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  delta: number;
  reason: string;
  source: string | null;
  sourceId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
};

type RewardLogResponse = {
  logs: RewardLogRow[];
  total: number;
  page: number;
  totalPages: number;
};

type BalanceLogRow = {
  id: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  detail: string | null;
  createdAt: string;
};

const SOURCE_OPTIONS = [
  "admin",
  "auction",
  "quest",
  "tower-defense",
  "gacha",
  "shop",
  "guild",
  "raid",
  "rogue",
  "attendance",
  "community",
];

const KPI_KEYS: Record<string, TranslationKey> = {
  activeUsers14d: "operations.kpi.active_users_14d",
  communityPosts14d: "operations.kpi.community_posts_14d",
  comments14d: "operations.kpi.comments_14d",
  arenaBattles14d: "operations.kpi.arena_battles_14d",
  duelPlayers14d: "operations.kpi.duel_players_14d",
  towerDefensePlayers14d: "operations.kpi.tower_defense_players_14d",
  fishingPlayers14d: "operations.kpi.fishing_players_14d",
  roguePlayers14d: "operations.kpi.rogue_players_14d",
  expeditionPlayers14d: "operations.kpi.expedition_players_14d",
};

const REASON_KEYS: Record<string, TranslationKey> = {
  gacha_pull: "operations.reason.gacha_pull",
  auction_settle_refund: "operations.reason.auction_settle_refund",
  auction_seller_payout: "operations.reason.auction_seller_payout",
  auction_bid: "operations.reason.auction_bid",
  auction_bid_refund: "operations.reason.auction_bid_refund",
};

function formatDate(value: string) {
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-1 text-xs text-[var(--fg-muted)]">{label}</p>
      <p className="text-2xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {hint && <p className="mt-2 text-xs text-[var(--fg-faint)]">{hint}</p>}
    </div>
  );
}

function PageButton({
  disabled,
  children,
  onClick,
}: {
  disabled: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-[var(--border)] px-2 py-1 text-sm disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function OperationsPage() {
  const { t } = useLang();
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [rewardLogs, setRewardLogs] = useState<RewardLogResponse | null>(null);
  const [balanceLogs, setBalanceLogs] = useState<{ logs: BalanceLogRow[]; page: number; totalPages: number } | null>(null);
  const [balancePage, setBalancePage] = useState(1);
  const [rewardPage, setRewardPage] = useState(1);
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [source, setSource] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [direction, setDirection] = useState<"all" | "earned" | "spent">("all");
  const [error, setError] = useState<string | null>(null);

  const labelKpi = (key: string) => (KPI_KEYS[key] ? t(KPI_KEYS[key]) : key);
  const labelReason = (value: string) => {
    const direct = REASON_KEYS[value];
    if (direct) return t(direct);
    if (value.includes("가챠") || value.includes("뽑기")) return t("operations.reason.gacha_pull");
    if (value.includes("원정")) return t("operations.reason.expedition_reward");
    if (value.includes("출석")) return t("operations.reason.attendance_reward");
    if (value.includes("낚시")) return t("operations.reason.fishing_reward");
    if (value.includes("타워") || value.includes("디펜스")) return t("operations.reason.tower_defense_reward");
    return value;
  };

  async function loadSummary() {
    setError(null);
    try {
      setSummary(await api.get<OperationsSummary>("/admin/operations/summary"));
    } catch {
      setError(t("operations.error_load"));
    }
  }

  async function loadRewardLogs(page = rewardPage) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (reason.trim()) params.set("reason", reason.trim());
    if (source) params.set("source", source);
    if (sourceId.trim()) params.set("sourceId", sourceId.trim());
    if (direction !== "all") params.set("direction", direction);
    params.set("page", String(page));
    setRewardLogs(await api.get<RewardLogResponse>(`/admin/operations/reward-logs?${params.toString()}`));
  }

  async function loadBalanceHistory(page = balancePage) {
    setBalanceLogs(
      await api.get<{ logs: BalanceLogRow[]; page: number; totalPages: number }>(
        `/admin/operations/balance-history?page=${page}`,
      ),
    );
  }

  useEffect(() => {
    void loadSummary();
    void loadRewardLogs(1);
    void loadBalanceHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventLinks = useMemo(
    () => [
      { label: t("operations.link_banners"), to: "/banners", desc: t("operations.link_banners_desc") },
      { label: t("operations.link_gacha"), to: "/gacha-config", desc: t("operations.link_gacha_desc") },
      { label: t("operations.link_season"), to: "/season", desc: t("operations.link_season_desc") },
      { label: t("operations.link_maintenance"), to: "/maintenance", desc: t("operations.link_maintenance_desc") },
    ],
    [t],
  );

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!summary) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{t("operations.title")}</h1>
        <p className="mt-1 text-sm text-[var(--fg-faint)]">{t("operations.subtitle")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t("operations.event_shortcuts")}</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t("operations.active_banners")} value={summary.eventSettings.activeBanners} />
          <StatCard label={t("operations.scheduled_banners")} value={summary.eventSettings.scheduledBanners} />
          <StatCard
            label={t("operations.maintenance_status")}
            value={summary.eventSettings.maintenanceEnabled ? "ON" : "OFF"}
            hint={summary.eventSettings.maintenanceEndsAt ? new Date(summary.eventSettings.maintenanceEndsAt).toLocaleString() : undefined}
          />
          <StatCard label={t("operations.admin_menu")} value={eventLinks.length} hint={t("operations.admin_menu_hint")} />
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {eventLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4 hover:border-[#b7607e]"
            >
              <p className="font-semibold">{link.label}</p>
              <p className="mt-1 text-xs text-[var(--fg-muted)]">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("operations.points_trend")}</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.pointsTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--fg-muted)", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="earned" stroke="#34d399" fill="#34d39933" />
                <Area type="monotone" dataKey="spent" stroke="#f87171" fill="#f8717133" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("operations.recent_reasons")}</h2>
          <div className="space-y-2">
            {summary.rewardReasons.map((row) => (
              <div key={row.reason} className="flex items-center justify-between rounded-md bg-[var(--bg-soft)] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{labelReason(row.reason)}</span>
                <span className={row.totalDelta >= 0 ? "text-emerald-400" : "text-red-400"}>{row.totalDelta.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">{t("operations.content_kpi")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {Object.entries(summary.kpis).map(([key, value]) => (
            <StatCard key={key} label={labelKpi(key)} value={value} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("operations.reward_log_search")}</h2>
          <span className="text-xs text-[var(--fg-faint)]">{t("operations.reward_log_hint")}</span>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("operations.search_user_placeholder")}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("operations.reason_placeholder")}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none"
          >
            <option value="">{t("operations.source_all")}</option>
            {SOURCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            placeholder="sourceId"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "all" | "earned" | "spent")}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">{t("operations.direction_all")}</option>
            <option value="earned">{t("operations.direction_earned")}</option>
            <option value="spent">{t("operations.direction_spent")}</option>
          </select>
          <button
            onClick={() => {
              setRewardPage(1);
              void loadRewardLogs(1);
            }}
            className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm text-white hover:bg-[#a2536e]"
          >
            {t("common.search")}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2">{t("operations.col_user")}</th>
                <th className="px-2 py-2">{t("operations.col_delta")}</th>
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2">{t("operations.col_reason")}</th>
                <th className="px-2 py-2">Idempotency</th>
                <th className="px-2 py-2">{t("operations.col_date")}</th>
              </tr>
            </thead>
            <tbody>
              {rewardLogs?.logs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2">
                    <p>{log.userName}</p>
                    <p className="text-xs text-[var(--fg-faint)]">{log.userEmail}</p>
                  </td>
                  <td className={`px-2 py-2 font-semibold ${log.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {log.delta.toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-[var(--fg-muted)]">
                    <p>{log.source ?? "-"}</p>
                    <p className="text-xs text-[var(--fg-faint)]">{log.sourceId ?? "-"}</p>
                  </td>
                  <td className="px-2 py-2 text-[var(--fg-muted)]">{labelReason(log.reason)}</td>
                  <td className="max-w-[220px] truncate px-2 py-2 text-xs text-[var(--fg-faint)]">{log.idempotencyKey ?? "-"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-[var(--fg-muted)]">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {rewardLogs?.logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-[var(--fg-faint)]">
                    {t("common.no_results")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rewardLogs && rewardLogs.totalPages > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <PageButton
              disabled={rewardPage <= 1}
              onClick={() => {
                const next = rewardPage - 1;
                setRewardPage(next);
                void loadRewardLogs(next);
              }}
            >
              {t("common.prev")}
            </PageButton>
            <span className="text-sm text-[var(--fg-muted)]">
              {rewardLogs.page} / {rewardLogs.totalPages}
            </span>
            <PageButton
              disabled={rewardPage >= rewardLogs.totalPages}
              onClick={() => {
                const next = rewardPage + 1;
                setRewardPage(next);
                void loadRewardLogs(next);
              }}
            >
              {t("common.next")}
            </PageButton>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">{t("operations.admin_change_history")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2">{t("operations.col_action")}</th>
                <th className="px-2 py-2">{t("operations.col_target")}</th>
                <th className="px-2 py-2">{t("operations.col_detail")}</th>
                <th className="px-2 py-2">{t("operations.col_date")}</th>
              </tr>
            </thead>
            <tbody>
              {balanceLogs?.logs.map((log) => (
                <tr key={log.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2">{log.action}</td>
                  <td className="px-2 py-2 text-[var(--fg-muted)]">
                    {log.targetType ?? "-"} / {log.targetId ?? "-"}
                  </td>
                  <td className="max-w-[360px] truncate px-2 py-2 text-[var(--fg-muted)]">{log.detail ?? "-"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-[var(--fg-muted)]">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {balanceLogs && balanceLogs.totalPages > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <PageButton
              disabled={balancePage <= 1}
              onClick={() => {
                const next = balancePage - 1;
                setBalancePage(next);
                void loadBalanceHistory(next);
              }}
            >
              {t("common.prev")}
            </PageButton>
            <span className="text-sm text-[var(--fg-muted)]">
              {balanceLogs.page} / {balanceLogs.totalPages}
            </span>
            <PageButton
              disabled={balancePage >= balanceLogs.totalPages}
              onClick={() => {
                const next = balancePage + 1;
                setBalancePage(next);
                void loadBalanceHistory(next);
              }}
            >
              {t("common.next")}
            </PageButton>
          </div>
        )}
      </section>
    </div>
  );
}
