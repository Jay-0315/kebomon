import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Crown, Trophy } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type HallOfFameRow = {
  seasonId: number;
  rank: number;
  userId: string;
  nickname: string;
  tierPoints: number;
  wins: number;
  losses: number;
  winStreak: number;
};

const RANK_COLOR: Record<number, string> = {
  1: "#f5c542",
  2: "#c7ced8",
  3: "#c98a4e",
};

export default function HallOfFamePage() {
  const navigate = useNavigate();
  const { lang } = useLang();
  const [rows, setRows] = useState<HallOfFameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<HallOfFameRow[]>("/rewards/hall-of-fame")
      .then(setRows)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const bySeasons = rows.reduce<Map<number, HallOfFameRow[]>>((map, r) => {
    const list = map.get(r.seasonId) ?? [];
    list.push(r);
    map.set(r.seasonId, list);
    return map;
  }, new Map());
  const seasons = [...bySeasons.keys()].sort((a, b) => b - a);

  const title =
    lang === "ja" ? "殿堂入り" : lang === "en" ? "Hall of Fame" : "명예의 전당";
  const subtitle =
    lang === "ja"
      ? "歴代シーズンのトップランカー"
      : lang === "en"
        ? "Top rankers from past seasons"
        : "역대 시즌 TOP 랭커";
  const empty =
    lang === "ja" ? "まだ記録がありません。" : lang === "en" ? "No records yet." : "아직 기록이 없습니다.";
  const seasonLabel = (n: number) => (lang === "ja" ? `シーズン ${n}` : lang === "en" ? `Season ${n}` : `시즌 ${n}`);

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {lang === "ja" ? "戻る" : lang === "en" ? "Back" : "뒤로"}
      </button>

      <div className="mb-5 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {loading ? null : seasons.length === 0 ? (
        <p className="rounded border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-5">
          {seasons.map((seasonId) => (
            <div key={seasonId} className="rounded border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-primary">{seasonLabel(seasonId)}</h2>
              <ul className="space-y-1.5">
                {(bySeasons.get(seasonId) ?? []).map((r) => (
                  <li
                    key={`${r.seasonId}-${r.rank}`}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: RANK_COLOR[r.rank] ? `${RANK_COLOR[r.rank]}22` : "var(--muted)",
                        color: RANK_COLOR[r.rank] ?? "var(--muted-foreground)",
                      }}
                    >
                      {r.rank <= 3 ? <Crown className="h-3.5 w-3.5" /> : r.rank}
                    </span>
                    <span className="flex-1 truncate font-medium">{r.nickname}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {r.tierPoints.toLocaleString()}P · {r.wins}W {r.losses}L
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
