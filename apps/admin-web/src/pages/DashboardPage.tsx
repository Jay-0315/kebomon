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
import { useLang } from "../context/LangContext";

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

function TrendChart({ id, title, data, color }: { id: string; title: string; data: TrendPoint[]; color: string }) {
  const gradientId = `fill-${id}`;
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
              fill={`url(#${gradientId})`}
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
  const { t } = useLang();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/admin/dashboard")
      .then(setData)
      .catch(() => setError(t("dashboard.error_load")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!data) return <p className="text-[var(--fg-faint)]">{t("common.loading")}</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("dashboard.title")}</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("dashboard.total_users")} value={data.totalUsers} />
        <StatTile label={t("dashboard.dau")} value={data.dau} />
        <StatTile label={t("dashboard.total_posts")} value={data.totalPosts} />
        <StatTile label={t("dashboard.total_comments")} value={data.totalComments} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TrendChart id="signup" title={t("dashboard.signup_trend")} data={data.signupTrend} color="var(--chart-1)" />
        <TrendChart id="posts" title={t("dashboard.post_trend")} data={data.postTrend} color="var(--chart-2)" />
      </div>
    </div>
  );
}
