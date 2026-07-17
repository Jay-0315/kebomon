import { useEffect, useState } from "react";
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

type TrendPoint = { date: string; count: number };

type DashboardSummary = {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  dau: number;
  signupTrend: TrendPoint[];
  postTrend: TrendPoint[];
};

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <p className="mb-1 text-xs text-[var(--fg-muted)]">{label}</p>
      <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function TrendChart({ title, data, color }: { title: string; data: TrendPoint[]; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`fill-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "var(--fg-faint)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--fg-faint)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              labelFormatter={formatDate}
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--fg)",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${title})`}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/admin/dashboard")
      .then(setData)
      .catch(() => setError("통계를 불러오지 못했습니다."));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-[var(--fg-faint)]">불러오는 중...</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">대시보드</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="총 회원수" value={data.totalUsers} />
        <StatTile label="오늘 접속(DAU)" value={data.dau} />
        <StatTile label="총 게시글" value={data.totalPosts} />
        <StatTile label="총 댓글" value={data.totalComments} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart title="최근 14일 가입 추이" data={data.signupTrend} color="var(--chart-1)" />
        <TrendChart title="최근 14일 게시글 추이" data={data.postTrend} color="var(--chart-2)" />
      </div>
    </div>
  );
}
