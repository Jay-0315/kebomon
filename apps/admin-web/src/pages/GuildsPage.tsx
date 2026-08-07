import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

type SortKey = "name" | "level" | "memberCount" | "createdAt";
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

type BossAnomaly = {
  weekKey: string;
  topContributorId: string;
  topDamage: number;
  totalDamage: number;
  topShare: number;
  suspicious: boolean;
} | null;

type GuildRow = {
  id: string;
  name: string;
  level: number;
  memberCount: number;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  bossAnomaly: BossAnomaly;
};

type GuildsResponse = {
  guilds: GuildRow[];
  total: number;
  page: number;
  totalPages: number;
};

export default function GuildsPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GuildsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(p: number) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      params.set("page", String(p));
      const res = await api.get<GuildsResponse>(`/admin/guilds?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("common.error_load"));
    }
  }

  useEffect(() => {
    setPage(1);
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, sortBy, sortDir]);

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

  async function handleDisband(guild: GuildRow) {
    if (!window.confirm(t("guilds.confirm_disband", { name: guild.name }))) return;
    try {
      await api.delete(`/admin/guilds/${guild.id}`);
      load(page);
    } catch {
      showToast(t("guilds.error_disband"), "error");
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">{t("guilds.title")}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("guilds.search_placeholder")}
          className="rounded-md border border-[var(--border)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <SortHeader sortKey="name" label={t("guilds.col_name")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <SortHeader sortKey="level" label={t("guilds.col_level")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <SortHeader sortKey="memberCount" label={t("guilds.col_members")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <th className="px-3 py-2">{t("guilds.col_owner")}</th>
              <th className="px-3 py-2">{t("guilds.col_recent_boss")}</th>
              <SortHeader sortKey="createdAt" label={t("common.date")} activeKey={sortBy} dir={sortDir} onToggle={toggleSort} />
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.guilds.map((g) => (
              <tr key={g.id} className={`border-t border-[var(--border)] ${g.bossAnomaly?.suspicious ? "bg-amber-500/10" : ""}`}>
                <td className="px-3 py-2">
                  <Link to={`/guilds/${g.id}`} className="text-[#b7607e] hover:underline">
                    {g.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{g.level}</td>
                <td className="px-3 py-2">{g.memberCount}</td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">
                  {g.owner.name} ({g.owner.email})
                </td>
                <td className="px-3 py-2">
                  {g.bossAnomaly ? (
                    <>
                      {t("guilds.top_contribution", { pct: (g.bossAnomaly.topShare * 100).toFixed(0) })}
                      {g.bossAnomaly.suspicious && (
                        <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                          {t("guilds.suspicious_share")}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--fg-faint)]">{t("guilds.no_record")}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">{new Date(g.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => handleDisband(g)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    {t("guilds.disband")}
                  </button>
                </td>
              </tr>
            ))}
            {data?.guilds.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-faint)]">
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
    </div>
  );
}
