import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { api } from "../lib/api";

type GuildMemberRow = {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalContribution: number;
  joinedAt: string;
};

type GuildBossRun = {
  weekKey: string;
  bossId: number;
  maxHp: number;
  hpRemaining: number;
  clearedAt: string | null;
  rewardsGranted: boolean;
  totalDamage: number;
  contributions: { userId: string; name: string; damage: number }[];
};

type GuildDetail = {
  id: string;
  name: string;
  iconId: string;
  notice: string | null;
  level: number;
  exp: number;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  members: GuildMemberRow[];
  bossRuns: GuildBossRun[];
};

const ROLE_LABEL: Record<string, string> = { owner: "길드장", officer: "부길드장", member: "길드원" };

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--fg-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function GuildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<GuildDetail>(`/admin/guilds/${id}`);
      setGuild(res);
    } catch {
      setError("길드 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDisband() {
    if (!guild) return;
    if (!window.confirm(`"${guild.name}" 길드를 해체할까요? 길드원/게시글/보스전 기록이 모두 삭제되며 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/admin/guilds/${guild.id}`);
      navigate("/guilds");
    } catch {
      window.alert("해체에 실패했습니다.");
    }
  }

  if (loading) return <p className="text-[var(--fg-faint)]">불러오는 중...</p>;
  if (error || !guild) return <p className="text-red-400">{error ?? "길드를 찾을 수 없습니다."}</p>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate("/guilds")}
        className="mb-4 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
      >
        ← 길드 목록으로
      </button>

      <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold">{guild.name}</h1>
            <p className="text-sm text-[var(--fg-muted)]">
              길드장{" "}
              <Link to={`/users/${guild.owner.id}`} className="text-[#b7607e] hover:underline">
                {guild.owner.name} ({guild.owner.email})
              </Link>
            </p>
            <p className="mt-1 text-xs text-[var(--fg-faint)]">
              생성일 {new Date(guild.createdAt).toLocaleDateString()}
            </p>
            {guild.notice && (
              <p className="mt-2 whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--bg-soft)] p-2 text-xs text-[var(--fg-muted)]">
                {guild.notice}
              </p>
            )}
          </div>
          <button
            onClick={handleDisband}
            className="shrink-0 rounded border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
          >
            해체
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="레벨" value={guild.level} />
        <StatTile label="경험치" value={guild.exp} />
        <StatTile label="인원" value={guild.members.length} />
        <StatTile
          label="이번 주 보스전"
          value={guild.bossRuns[0] ? (guild.bossRuns[0].clearedAt ? "클리어" : "진행중") : "기록 없음"}
        />
      </div>

      <div className="mb-4 overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">이메일</th>
              <th className="px-3 py-2">역할</th>
              <th className="px-3 py-2">누적 기여도</th>
              <th className="px-3 py-2">가입일</th>
            </tr>
          </thead>
          <tbody>
            {guild.members.map((m) => (
              <tr key={m.userId} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  <Link to={`/users/${m.userId}`} className="text-[#b7607e] hover:underline">
                    {m.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{m.email}</td>
                <td className="px-3 py-2">{ROLE_LABEL[m.role] ?? m.role}</td>
                <td className="px-3 py-2">{m.totalContribution.toLocaleString()}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{new Date(m.joinedAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {guild.members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  길드원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[var(--border)] p-4">
        <h2 className="mb-3 text-sm font-semibold">길드 보스전 기록 (최근 {guild.bossRuns.length}주)</h2>
        {guild.bossRuns.length === 0 ? (
          <p className="text-sm text-[var(--fg-faint)]">기록이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {guild.bossRuns.map((run) => (
              <li key={run.weekKey} className="border-t border-[var(--border)] pt-2 text-sm first:border-t-0 first:pt-0">
                <button
                  onClick={() => setExpandedWeek((w) => (w === run.weekKey ? null : run.weekKey))}
                  className="flex w-full items-center justify-between text-left hover:text-[var(--fg)]"
                >
                  <span>
                    {run.weekKey} · 보스 #{run.bossId} · {run.hpRemaining.toLocaleString()} / {run.maxHp.toLocaleString()} HP
                    {run.clearedAt && <span className="ml-2 text-emerald-400">클리어</span>}
                    {!run.rewardsGranted && run.clearedAt && (
                      <span className="ml-2 text-amber-400">보상 미지급</span>
                    )}
                  </span>
                  <span className="text-[var(--fg-faint)]">{expandedWeek === run.weekKey ? "접기" : "기여도 보기"}</span>
                </button>
                {expandedWeek === run.weekKey && (
                  <ul className="mt-2 space-y-1 pl-3 text-xs text-[var(--fg-muted)]">
                    {run.contributions.map((c) => (
                      <li key={c.userId} className="flex justify-between">
                        <span>{c.name}</span>
                        <span>
                          {c.damage.toLocaleString()} (
                          {run.totalDamage > 0 ? ((c.damage / run.totalDamage) * 100).toFixed(0) : 0}%)
                        </span>
                      </li>
                    ))}
                    {run.contributions.length === 0 && <li>기여 기록이 없습니다.</li>}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
