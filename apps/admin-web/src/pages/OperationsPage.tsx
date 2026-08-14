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
import { api } from "../lib/api";
import LoadingState from "../components/LoadingState";

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
  activeUsers14d: "14일 활성 사용자",
  communityPosts14d: "게시글",
  comments14d: "댓글",
  arenaBattles14d: "콜로세움 전투",
  duelPlayers14d: "카드배틀 참여자",
  towerDefensePlayers14d: "타워디펜스 참여자",
  fishingPlayers14d: "낚시 참여자",
  roguePlayers14d: "로그라이크 참여자",
  expeditionPlayers14d: "원정 참여자",
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
  const [balancePage, setBalancePage] = useState(1);
  const [balanceLogs, setBalanceLogs] = useState<{ logs: BalanceLogRow[]; page: number; totalPages: number } | null>(null);
  const [q, setQ] = useState("");
  const [reason, setReason] = useState("");
  const [direction, setDirection] = useState<"all" | "earned" | "spent">("all");
  const [rewardPage, setRewardPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setError(null);
    try {
      setSummary(await api.get<OperationsSummary>("/admin/operations/summary"));
    } catch {
      setError("운영 지표를 불러오지 못했습니다.");
    }
  }

  async function loadRewardLogs(page = rewardPage) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (reason.trim()) params.set("reason", reason.trim());
    if (direction !== "all") params.set("direction", direction);
    params.set("page", String(page));
    setRewardLogs(await api.get<RewardLogResponse>(`/admin/operations/reward-logs?${params.toString()}`));
  }

  async function loadBalanceHistory(page = balancePage) {
    setBalanceLogs(await api.get<{ logs: BalanceLogRow[]; page: number; totalPages: number }>(`/admin/operations/balance-history?page=${page}`));
  }

  useEffect(() => {
    void loadSummary();
    void loadRewardLogs(1);
    void loadBalanceHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventLinks = useMemo(
    () => [
      { label: "배너/이벤트 노출 설정", to: "/banners", desc: "상단 배너, 기간, 노출 상태 관리" },
      { label: "가챠 확률/보장 설정", to: "/gacha-config", desc: "확률표와 보장 카운트 관리" },
      { label: "시즌 운영", to: "/season", desc: "시즌 보상, 강제 정산, 초기화" },
      { label: "점검 모드", to: "/maintenance", desc: "서비스 차단, 공지 메시지, 종료 예정 시간" },
    ],
    [],
  );

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!summary) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">운영 관리</h1>
        <p className="mt-1 text-sm text-[var(--fg-faint)]">
          이벤트 설정, 콘텐츠 KPI, 밸런스 변경 이력, 보상 지급 로그를 한 화면에서 확인합니다.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">이벤트 설정 현황</h2>
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="진행 중 배너" value={summary.eventSettings.activeBanners} />
          <StatCard label="예약 배너" value={summary.eventSettings.scheduledBanners} />
          <StatCard
            label="점검 모드"
            value={summary.eventSettings.maintenanceEnabled ? "ON" : "OFF"}
            hint={summary.eventSettings.maintenanceEndsAt ? new Date(summary.eventSettings.maintenanceEndsAt).toLocaleString() : undefined}
          />
          <StatCard label="관리 링크" value={eventLinks.length} hint="운영 설정 화면 바로가기" />
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {eventLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-[var(--border)] p-3 text-sm hover:bg-[var(--bg-hover)]"
            >
              <p className="font-semibold">{link.label}</p>
              <p className="mt-1 text-xs text-[var(--fg-faint)]">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">콘텐츠별 KPI</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Object.entries(summary.kpis).map(([key, value]) => (
            <StatCard key={key} label={KPI_LABELS[key] ?? key} value={value} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">최근 7일 KP 흐름</h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.pointsTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: "var(--fg-faint)", fontSize: 11 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--fg-faint)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="earned" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} />
                <Area type="monotone" dataKey="spent" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.18} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] p-4">
          <h2 className="mb-3 text-sm font-semibold">보상 사유 Top 8</h2>
          <div className="space-y-2">
            {summary.rewardReasons.map((r) => (
              <div key={r.reason} className="flex items-center justify-between rounded-md bg-[var(--bg-soft)] px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.reason}</span>
                <span className={r.totalDelta >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {r.totalDelta.toLocaleString()} KP
                </span>
                <span className="ml-3 text-xs text-[var(--fg-faint)]">{r.count}건</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">밸런스 변경 이력</h2>
          <button
            onClick={() => {
              const next = 1;
              setBalancePage(next);
              void loadBalanceHistory(next);
            }}
            className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
          >
            새로고침
          </button>
        </div>
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
              {(balanceLogs?.logs ?? summary.recentBalanceChanges).map((log) => (
                <tr key={log.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2 font-mono text-xs">{log.action}</td>
                  <td className="px-2 py-2 text-[var(--fg-muted)]">{log.targetType ?? "-"} {log.targetId ?? ""}</td>
                  <td className="max-w-sm truncate px-2 py-2 text-[var(--fg-muted)]">{log.detail ?? "-"}</td>
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
            <span className="text-sm text-[var(--fg-muted)]">{balanceLogs.page} / {balanceLogs.totalPages}</span>
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

      <section className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">보상 지급 로그 검색</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="닉네임 / 이메일 / userId"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="지급 사유"
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "all" | "earned" | "spent")}
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none"
          >
            <option value="all">전체</option>
            <option value="earned">획득</option>
            <option value="spent">차감/소모</option>
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
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--fg-muted)]">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Delta</th>
                <th className="px-2 py-2">Reason</th>
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
                  <td className="px-2 py-2 text-[var(--fg-muted)]">{log.reason}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-[var(--fg-muted)]">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {rewardLogs?.logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-[var(--fg-faint)]">검색 결과가 없습니다.</td>
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
            <span className="text-sm text-[var(--fg-muted)]">{rewardLogs.page} / {rewardLogs.totalPages}</span>
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
    </div>
  );
}
