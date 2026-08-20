import { useEffect, useMemo, useState } from "react";
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
import { api } from "../lib/api";

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

const KPI_LABELS: Record<string, string> = {
  activeUsers14d: "14일 활성 유저",
  communityPosts14d: "커뮤니티 게시글",
  comments14d: "댓글",
  arenaBattles14d: "아레나 전투",
  duelPlayers14d: "카드배틀 참여자",
  towerDefensePlayers14d: "타워디펜스 참여자",
  fishingPlayers14d: "낚시 참여자",
  roguePlayers14d: "로그라이크 참여자",
  expeditionPlayers14d: "원정 참여자",
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
  children: React.ReactNode;
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

  async function loadSummary() {
    setError(null);
    try {
      setSummary(await api.get<OperationsSummary>("/admin/operations/summary"));
    } catch {
      setError("운영 현황을 불러오지 못했습니다.");
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
      { label: "배너 설정", to: "/banners", desc: "노출 기간, 활성 상태, 시즌 배너 관리" },
      { label: "가챠 설정", to: "/gacha-config", desc: "픽업/확률/교배 설정 관리" },
      { label: "시즌 설정", to: "/season", desc: "랭킹 보상, 시즌 보상, 테두리 지급 관리" },
      { label: "점검 설정", to: "/maintenance", desc: "공지, 접근 제한, 점검 종료 시간 관리" },
    ],
    [],
  );

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!summary) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">운영 현황</h1>
        <p className="mt-1 text-sm text-[var(--fg-faint)]">
          이벤트 설정, 콘텐츠 KPI, 포인트 원장, 관리자 변경 이력을 확인합니다.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">이벤트 설정 바로가기</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="활성 배너" value={summary.eventSettings.activeBanners} />
          <StatCard label="예약 배너" value={summary.eventSettings.scheduledBanners} />
          <StatCard
            label="점검 상태"
            value={summary.eventSettings.maintenanceEnabled ? "ON" : "OFF"}
            hint={summary.eventSettings.maintenanceEndsAt ? new Date(summary.eventSettings.maintenanceEndsAt).toLocaleString() : undefined}
          />
          <StatCard label="관리 메뉴" value={eventLinks.length} hint="운영 설정 화면으로 이동" />
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
          <h2 className="mb-3 text-sm font-semibold">포인트 변동 추이</h2>
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
          <h2 className="mb-3 text-sm font-semibold">최근 원장 사유</h2>
          <div className="space-y-2">
            {summary.rewardReasons.map((r) => (
              <div key={r.reason} className="flex items-center justify-between rounded-md bg-[var(--bg-soft)] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.reason}</span>
                <span className={r.totalDelta >= 0 ? "text-emerald-400" : "text-red-400"}>{r.totalDelta.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">콘텐츠 KPI</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
          {Object.entries(summary.kpis).map(([key, value]) => (
            <StatCard key={key} label={KPI_LABELS[key] ?? key} value={value} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">포인트 원장 검색</h2>
          <span className="text-xs text-[var(--fg-faint)]">source/sourceId 기반 콘텐츠별 추적 지원</span>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 / 이메일 / userId"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="reason"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none"
          >
            <option value="">source 전체</option>
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
            <option value="all">전체</option>
            <option value="earned">지급</option>
            <option value="spent">차감</option>
          </select>
          <button
            onClick={() => {
              setRewardPage(1);
              void loadRewardLogs(1);
            }}
            className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm text-white hover:bg-[#a2536e]"
          >
            검색
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Delta</th>
                <th className="px-2 py-2">Source</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Idempotency</th>
                <th className="px-2 py-2">Date</th>
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
                  <td className="px-2 py-2 text-[var(--fg-muted)]">{log.reason}</td>
                  <td className="max-w-[220px] truncate px-2 py-2 text-xs text-[var(--fg-faint)]">{log.idempotencyKey ?? "-"}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-[var(--fg-muted)]">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {rewardLogs?.logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-[var(--fg-faint)]">
                    검색 결과가 없습니다.
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
              이전
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
              다음
            </PageButton>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">관리자 변경 이력</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Target</th>
                <th className="px-2 py-2">Detail</th>
                <th className="px-2 py-2">Date</th>
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
              이전
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
              다음
            </PageButton>
          </div>
        )}
      </section>
    </div>
  );
}
