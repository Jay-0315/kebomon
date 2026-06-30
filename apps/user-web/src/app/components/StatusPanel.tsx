import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Swords, Clock, Shield, Zap, ChevronRight, Flame, Layers, Map } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { getStoredUser } from "../lib/auth";
import { api } from "../lib/api";
import { CHARACTERS, getCharName, getRarityLabel } from "../data/characters";
import { PixelSprite } from "./PixelCharacter";
import type { TranslationKey } from "../lib/i18n";

// ─── 원정 localStorage ────────────────────────────────────────────────────────
const EXP_STORAGE_KEY = "kebo_expedition";
interface ExpeditionState {
  regionId: string;
  partyIds: number[];
  startTime: number;
  durationMs: number;
  durationHours: number;
  rewardClaimed: boolean;
}
function loadExpedition(): ExpeditionState | null {
  try { return JSON.parse(localStorage.getItem(EXP_STORAGE_KEY) ?? "null"); }
  catch { return null; }
}
const REGION_NAME: Record<string, { ko: string; ja: string }> = {
  grassland: { ko: "초원의 평야", ja: "草原の平野" },
  forest:    { ko: "삼림의 비경", ja: "森の秘境" },
  ruins:     { ko: "폐허의 유적", ja: "廃墟の遺跡" },
  altar:     { ko: "제단의 신비", ja: "祭壇の神秘" },
};

// ─── 상수 ─────────────────────────────────────────────────────────────────────
const TIERS: Array<{ min: number; color: string; glow: string; tKey: TranslationKey }> = [
  { min:0,    color:"#cd7f32", glow:"#8B4513", tKey: "battle.tier.bronze" },
  { min:1000, color:"#c0c0c0", glow:"#708090", tKey: "battle.tier.silver" },
  { min:2000, color:"#ffd700", glow:"#b8860b", tKey: "battle.tier.gold" },
  { min:3000, color:"#40e0d0", glow:"#008b8b", tKey: "battle.tier.platinum" },
  { min:4000, color:"#b9f2ff", glow:"#4169e1", tKey: "battle.tier.diamond" },
  { min:5000, color:"#da70d6", glow:"#800080", tKey: "battle.tier.master" },
  { min:6000, color:"#ff4500", glow:"#8b0000", tKey: "battle.tier.challenger" },
];

const RARITY_COLOR: Record<string, string> = {
  common: "#94a3b8", uncommon: "#4ade80", rare: "#60a5fa",
  epic: "#c084fc", legendary: "#fbbf24", mythic: "#f472b6",
};

const RAID_IDS = [1, 5] as const;

function getTierIdx(pts: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) if (pts >= TIERS[i].min) return i;
  return 0;
}

function fmtTimer(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ─── 레이드 보스 행 ────────────────────────────────────────────────────────────
function BossRow({
  id, info, now, t, onClick,
}: {
  id: number;
  info: { count: number; cooldownUntil: number; bossCharId: number; currentHp: number; maxHp: number } | undefined;
  now: number;
  t: (k: TranslationKey) => string;
  onClick: () => void;
}) {
  const onCooldown = !!info && info.cooldownUntil > now;
  const isFighting = !!info && !onCooldown && info.count > 0;
  const hpPct = info ? info.currentHp / info.maxHp : 1;
  const bossDef = info
    ? (CHARACTERS.find(c => c.id === info.bossCharId) ?? CHARACTERS[0])
    : CHARACTERS[(id * 43) % CHARACTERS.length];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 rounded cursor-pointer transition-colors hover:bg-muted/40"
      style={{
        background: onCooldown
          ? "rgba(239,68,68,0.04)"
          : isFighting
          ? "rgba(251,191,36,0.04)"
          : "rgba(34,197,94,0.04)",
        borderLeft: `3px solid ${onCooldown ? "#ef4444" : isFighting ? "#fbbf24" : "var(--primary)"}`,
      }}
    >
      <div className="shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden">
        <PixelSprite type={bossDef.type} colors={bossDef.colors} characterId={bossDef.id} size={30} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate leading-tight">
          {t(`raid.type.${id}.name` as TranslationKey)}
        </p>
        {onCooldown ? (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5 text-red-400 shrink-0" />
            <span className="text-xs font-mono text-red-400">{fmtTimer(info!.cooldownUntil - now)}</span>
          </div>
        ) : isFighting ? (
          <div className="mt-0.5 space-y-0.5">
            <div className="flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-400 font-semibold">{t("status.fighting")}</span>
              <span className="text-xs text-muted-foreground ml-auto font-mono">
                {info!.count}{t("status.players")}
              </span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden w-full">
              <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${hpPct * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-semibold">{t("raid.available")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 티어 픽셀 배지 ────────────────────────────────────────────────────────────
function TierPixelBadge({ idx, size = 32 }: { idx: number; size?: number }) {
  const tier = TIERS[idx];
  const patterns = [
    [[1,1],[5,1],[2,2],[4,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[3,0],[2,1],[4,1],[1,2],[5,2],[2,3],[4,3],[3,4]],
    [[0,2],[2,0],[4,0],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],[1,4],[5,4]],
    [[3,0],[2,1],[4,1],[1,2],[5,2],[2,3],[4,3],[3,4],[2,5],[4,5]],
    [[2,0],[4,0],[1,1],[5,1],[0,2],[6,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[3,0],[1,1],[5,1],[0,2],[2,2],[4,2],[6,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[2,0],[4,0],[0,1],[6,1],[1,2],[3,2],[5,2],[0,3],[2,3],[4,3],[6,3],[1,5],[5,5]],
  ];
  const dots = patterns[idx] ?? patterns[0];
  const px = size / 7;
  return (
    <svg
      width={size} height={size} viewBox="0 0 7 7"
      style={{ imageRendering: "pixelated", filter: `drop-shadow(0 0 ${px * 0.6}px ${tier.glow})` }}
    >
      {dots.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill={tier.color} />
      ))}
    </svg>
  );
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────
type RaidInfo = { count: number; cooldownUntil: number; bossCharId: number; currentHp: number; maxHp: number };
type BattleStats = { tierPoints: number; wins: number; losses: number; winStreak: number };

// ─── 메인 ─────────────────────────────────────────────────────────────────────
export default function StatusPanel() {
  const { rewardSummary } = useAppData();
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const user = getStoredUser();

  const charId = rewardSummary.equippedCharacterId;
  const charDef = charId ? (CHARACTERS.find(c => c.id === charId) ?? null) : null;

  const [battleStats, setBattleStats] = useState<BattleStats>({ tierPoints: 0, wins: 0, losses: 0, winStreak: 0 });
  const [raidLobby, setRaidLobby] = useState<Record<number, RaidInfo>>({});
  const [expedition, setExpedition] = useState<ExpeditionState | null>(() => loadExpedition());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user?.id) return;
    api.get<BattleStats>(`/rewards/battle-stats?userId=${user.id}`)
      .then(setBattleStats).catch(() => {});
    api.get<Record<string, RaidInfo>>("/raid/lobby")
      .then(raw => {
        const result: Record<number, RaidInfo> = {};
        for (const [k, v] of Object.entries(raw)) result[Number(k)] = v;
        setRaidLobby(result);
      }).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      setExpedition(loadExpedition());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const tierIdx = getTierIdx(battleStats.tierPoints);
  const tier = TIERS[tierIdx];
  const tierNext = TIERS[tierIdx + 1]?.min ?? tier.min + 1000;
  const tierProg = Math.min(1, (battleStats.tierPoints - tier.min) / (tierNext - tier.min));
  const hasPlayed = battleStats.wins + battleStats.losses > 0;

  return (
    <div className="bg-card border border-border rounded overflow-hidden">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Swords className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
          <span className="font-bold text-sm tracking-wide">{t("status.title")}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/colosseum")}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
          >
            {t("nav.colosseum")}<ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate("/raid")}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
          >
            {t("raid.title")}<ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate("/rogue")}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
          >
            {t("nav.rogue")}<ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigate("/expedition")}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
          >
            {t("nav.expedition")}<ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* ── 상단: 캐릭터 + 콜로세움 ── */}
        <div className="grid grid-cols-2 gap-2.5">

          {/* 장착 캐릭터 카드 */}
          <div
            className="rounded border border-border bg-muted/10 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/kebomon")}
          >
            <p className="text-xs text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3" />{t("status.char")}
            </p>
            {charDef ? (
              <div className="flex items-center gap-2.5">
                <div className="shrink-0">
                  <PixelSprite
                    type={charDef.type}
                    colors={charDef.colors}
                    characterId={charDef.id}
                    size={44}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm leading-tight truncate">
                    {getCharName(charDef, lang)}
                    {(rewardSummary.characterEnhancements[charDef.id] ?? 0) > 0 && (
                      <span className="text-amber-400 ml-1">
                        +{rewardSummary.characterEnhancements[charDef.id]}
                      </span>
                    )}
                  </p>
                  <p
                    className="text-xs font-semibold mt-0.5"
                    style={{ color: RARITY_COLOR[charDef.rarity] ?? "#94a3b8" }}
                  >
                    {getRarityLabel(charDef.rarity, lang)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    {rewardSummary.ownedCharacterIds.length}
                    <span className="text-muted-foreground/50">/{CHARACTERS.length}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">{t("status.no_char")}</p>
            )}
          </div>

          {/* 콜로세움 카드 */}
          <div
            className="rounded border border-border bg-muted/10 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/colosseum")}
          >
            <p className="text-xs text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
              <Swords className="w-3 h-3" strokeWidth={2} />{t("nav.colosseum")}
            </p>
            <div className="flex items-center gap-2 mb-1.5">
              <TierPixelBadge idx={tierIdx} size={28} />
              <div>
                <p className="font-black text-sm leading-none" style={{ color: tier.color }}>
                  {t(tier.tKey)}
                </p>
                <p className="text-xs font-mono mt-0.5" style={{ color: `${tier.color}bb` }}>
                  {battleStats.tierPoints.toLocaleString()} pts
                </p>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${tierProg * 100}%`, background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})` }}
              />
            </div>
            {hasPlayed ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-400 font-bold">
                  {battleStats.wins}
                  <span className="opacity-60 ml-0.5">{t("status.won")}</span>
                </span>
                <span className="text-red-400 font-bold">
                  {battleStats.losses}
                  <span className="opacity-60 ml-0.5">{t("status.lost")}</span>
                </span>
                {battleStats.winStreak >= 2 && (
                  <span className="text-amber-400 font-bold ml-auto flex items-center gap-0.5">
                    <Flame className="w-3 h-3" />
                    {battleStats.winStreak}{t("status.streak")}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("status.unranked")}</p>
            )}
          </div>
        </div>

        {/* ── 로그라이크 · 원정 ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className="rounded border border-border bg-muted/10 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate("/rogue")}
          >
            <p className="text-xs text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3" />{t("nav.rogue")}
            </p>
            <p className="font-black text-xl leading-none tabular-nums">
              {rewardSummary.rogueClears}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {t("rogue.clears")}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {rewardSummary.rogueClears === 0
                ? t("rogue.no_record")
                : t("rogue.keep_going")}
            </p>
          </div>
          {(() => {
            const activeExp = expedition && !expedition.rewardClaimed ? expedition : null;
            const expRemaining = activeExp
              ? Math.max(0, activeExp.startTime + activeExp.durationMs - now)
              : 0;
            const expDone = activeExp && expRemaining === 0;
            return (
              <div
                className="rounded border border-border bg-muted/10 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate("/expedition")}
              >
                <p className="text-xs text-muted-foreground font-semibold mb-1.5 flex items-center gap-1">
                  <Map className="w-3 h-3" />{t("nav.expedition")}
                </p>
                {activeExp ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${expDone ? "bg-primary" : "bg-amber-400"} animate-pulse`} />
                      <span className={`text-xs font-semibold ${expDone ? "text-primary" : "text-amber-400"}`}>
                        {expDone ? t("status.exp_pending") : t("status.exp_ongoing")}
                      </span>
                    </div>
                    <p className="text-xs font-bold leading-tight truncate">
                      {REGION_NAME[activeExp.regionId]?.[lang as "ko" | "ja"] ?? activeExp.regionId}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {expDone ? t("status.exp_done") : fmtTimer(expRemaining)}
                      <span className="ml-1 opacity-60">{activeExp.partyIds.length}{t("status.units")}</span>
                    </p>
                    <div className="flex gap-1 mt-1.5">
                      {activeExp.partyIds.slice(0, 5).map(id => {
                        const char = CHARACTERS.find(c => c.id === id);
                        if (!char) return null;
                        return (
                          <PixelSprite key={id} type={char.type} colors={char.colors} characterId={char.id} size={22} />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-black text-xl leading-none tabular-nums">
                      {rewardSummary.expeditionCount}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {t("expedition.count")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {rewardSummary.expeditionCount === 0
                        ? t("expedition.no_record")
                        : t("expedition.keep_going")}
                    </p>
                  </>
                )}
              </div>
            );
          })()}
        </div>

        {/* ── 레이드 현황 ── */}
        <div className="rounded border border-border bg-muted/10 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
            <Swords className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
            <p className="text-xs font-bold text-muted-foreground tracking-wide">
              {t("status.raids")}
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-border">
            {RAID_IDS.map(id => (
              <BossRow
                key={id}
                id={id}
                info={raidLobby[id]}
                now={now}
                t={t}
                onClick={() => navigate("/raid")}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
