import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Swords, Shield } from "lucide-react";
import { getBattleSocket, disconnectBattleSocket } from "../lib/socket";
import { getStoredUser } from "../lib/auth";
import { useAppData } from "../context/AppDataContext";
import PixelCharacter from "./PixelCharacter";
import { CHARACTERS, getCharName } from "../data/characters";
import { useLang } from "../context/LangContext";

const TIERS = [
  { name: "battle.tier.bronze",     min: 0,    max: 999  },
  { name: "battle.tier.silver",     min: 1000, max: 1999 },
  { name: "battle.tier.gold",       min: 2000, max: 2999 },
  { name: "battle.tier.platinum",   min: 3000, max: 3999 },
  { name: "battle.tier.diamond",    min: 4000, max: 4999 },
  { name: "battle.tier.master",     min: 5000, max: 5999 },
  { name: "battle.tier.challenger", min: 6000, max: Infinity },
] as const;

const TIER_COLORS = [
  "text-amber-700",
  "text-gray-400",
  "text-yellow-400",
  "text-cyan-400",
  "text-blue-400",
  "text-purple-400",
  "text-rose-400",
] as const;

function getTierIndex(points: number): number {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) return i;
  }
  return 0;
}

/** Pixel tier badge SVG — 7×7 grid, each tier gets a distinct emblem */
function TierBadge({ tierIdx, size = 40 }: { tierIdx: number; size?: number }) {
  const palettes = [
    ["#8B4513", "#A0522D", "#DEB887"],   // bronze
    ["#708090", "#C0C0C0", "#F0F0F0"],   // silver
    ["#B8860B", "#FFD700", "#FFFACD"],   // gold
    ["#008B8B", "#40E0D0", "#E0FFFF"],   // platinum
    ["#191970", "#4169E1", "#ADD8E6"],   // diamond
    ["#4B0082", "#9400D3", "#DA70D6"],   // master
    ["#8B0000", "#FF4500", "#FFD700"],   // challenger
  ];
  const [dark, mid, light] = palettes[tierIdx] ?? palettes[0];
  // Each tier: simple pixel crown/gem shape
  const shapes: [number, number, string][][] = [
    // bronze: shield
    [[1,1,dark],[5,1,dark],[1,2,mid],[5,2,mid],[1,3,mid],[5,3,mid],[2,4,mid],[4,4,mid],[3,5,light]],
    // silver: diamond
    [[3,0,light],[2,1,mid],[4,1,mid],[1,2,mid],[5,2,mid],[2,3,mid],[4,3,mid],[3,4,light]],
    // gold: crown
    [[1,0,mid],[3,0,light],[5,0,mid],[1,1,mid],[2,1,mid],[3,1,light],[4,1,mid],[5,1,mid],[1,2,dark],[2,2,mid],[3,2,mid],[4,2,mid],[5,2,dark],[1,3,dark],[5,3,dark]],
    // platinum: crystal
    [[3,0,light],[2,1,mid],[4,1,mid],[1,2,dark],[5,2,dark],[2,3,mid],[4,3,mid],[3,4,light],[2,5,mid],[4,5,mid]],
    // diamond: gem
    [[2,0,light],[3,0,light],[4,0,light],[1,1,mid],[5,1,mid],[0,2,dark],[6,2,dark],[1,3,mid],[5,3,mid],[2,4,mid],[4,4,mid],[3,5,light]],
    // master: star
    [[3,0,light],[2,1,mid],[3,1,light],[4,1,mid],[0,2,mid],[1,2,mid],[5,2,mid],[6,2,mid],[1,3,mid],[5,3,mid],[2,4,mid],[4,4,mid],[3,5,dark]],
    // challenger: crown + star
    [[3,0,light],[1,1,mid],[5,1,mid],[0,2,dark],[2,2,light],[4,2,light],[6,2,dark],[1,3,mid],[2,3,light],[4,3,light],[5,3,mid],[1,4,dark],[5,4,dark]],
  ];
  const px = size / 7;
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" style={{ imageRendering: "pixelated" }}>
      <rect width="7" height="7" fill="transparent" />
      {(shapes[tierIdx] ?? shapes[0]).map(([cx, cy, fill], i) => (
        <rect key={i} x={cx} y={cy} width={1} height={1} fill={fill} style={{ transform: `scale(${px})` }} />
      ))}
      {(shapes[tierIdx] ?? shapes[0]).map(([cx, cy, fill], i) => (
        <rect key={`b${i}`} x={cx} y={cy} width={1} height={1} fill={fill} />
      ))}
    </svg>
  );
}

interface Fighter {
  userId: string;
  nickname: string;
  characterId: number;
  rarity: string;
  hp: number;
}

interface BattleState {
  player: Fighter;
  opponent: Fighter;
  turn: "player" | "opponent";
  maxHp: number;
  playerGoesFirst: boolean;
}

interface BattleResult {
  won: boolean;
  pointsDelta: number;
  tierPoints: number;
  wins: number;
  losses: number;
  winStreak: number;
}

type Phase =
  | "lobby"
  | "coin"
  | "battle"
  | "result";

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

function HpBar({ hp, maxHp, flip }: { hp: number; maxHp: number; flip?: boolean }) {
  const pct = Math.max(0, Math.round((hp / maxHp) * 100));
  const color = pct > 50 ? "from-green-500 to-green-400" : pct > 25 ? "from-yellow-500 to-yellow-400" : "from-red-600 to-red-400";
  return (
    <div className="w-full">
      <div className={`h-3 w-full overflow-hidden rounded-full border border-black/10 bg-gray-700 ${flip ? "scale-x-[-1]" : ""}`}>
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-0.5 text-[11px] font-semibold text-white/80 ${flip ? "text-left" : "text-right"}`}>{hp}/{maxHp}</p>
    </div>
  );
}

export default function BattlePage() {
  const { rewardSummary } = useAppData();
  const { t, lang } = useLang();
  const myCharacterId = rewardSummary.equippedCharacterId ?? CHARACTERS[0].id;
  const user = getStoredUser();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);
  const [lastRoll, setLastRoll] = useState<{ attacker: "player" | "opponent"; rolls: number[]; total: number } | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [tierPoints, setTierPoints] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, winStreak: 0 });
  const [rolling, setRolling] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const s = getBattleSocket();

    const onStarted = (d: {
      coinResult: "heads" | "tails";
      playerGoesFirst: boolean;
      player: Fighter;
      opponent: Fighter;
      turn: "player" | "opponent";
      maxHp: number;
    }) => {
      setCoinResult(d.coinResult);
      setBattleState({ player: d.player, opponent: d.opponent, turn: d.turn, maxHp: d.maxHp, playerGoesFirst: d.playerGoesFirst });
      setLastRoll(null);
      setPhase("coin");
      setTimeout(() => setPhase("battle"), 2200);
    };

    const onRolled = (d: { attacker: "player" | "opponent"; rolls: number[]; total: number; playerHp: number; opponentHp: number }) => {
      setLastRoll({ attacker: d.attacker, rolls: d.rolls, total: d.total });
      setBattleState((prev) => prev ? { ...prev, player: { ...prev.player, hp: d.playerHp }, opponent: { ...prev.opponent, hp: d.opponentHp } } : prev);
      setRolling(false);
    };

    const onTurn = (d: { turn: "player" | "opponent" }) => {
      setBattleState((prev) => prev ? { ...prev, turn: d.turn } : prev);
    };

    const onEnded = (d: BattleResult) => {
      setResult(d);
      setTierPoints(d.tierPoints);
      setStats({ wins: d.wins, losses: d.losses, winStreak: d.winStreak });
      setPhase("result");
    };

    s.on("battle:started", onStarted);
    s.on("battle:rolled", onRolled);
    s.on("battle:turn", onTurn);
    s.on("battle:ended", onEnded);

    return () => {
      s.off("battle:started", onStarted);
      s.off("battle:rolled", onRolled);
      s.off("battle:turn", onTurn);
      s.off("battle:ended", onEnded);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
      disconnectBattleSocket();
    };
  }, []);

  const startBattle = useCallback(() => {
    setPhase("coin");
    getBattleSocket().emit("battle:start", {
      userId: user?.id,
      characterId: myCharacterId,
      nickname: user?.name ?? "플레이어",
    });
  }, [user, myCharacterId]);

  const rollDice = useCallback(() => {
    if (rolling || battleState?.turn !== "player") return;
    setRolling(true);
    getBattleSocket().emit("battle:roll", { userId: user?.id });
  }, [rolling, battleState, user]);

  const reset = useCallback(() => {
    setBattleState(null);
    setCoinResult(null);
    setLastRoll(null);
    setResult(null);
    setPhase("lobby");
  }, []);

  const tierIdx = getTierIndex(tierPoints);

  // ── LOBBY ──────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <Swords className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-extrabold">{t("battle.title")}</h1>
          <p className="text-sm text-muted-foreground text-center">{t("battle.desc")}</p>
        </div>

        {/* tier card */}
        <div className="w-full rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-3">
          <TierBadge tierIdx={tierIdx} size={56} />
          <p className={`text-xl font-extrabold ${TIER_COLORS[tierIdx]}`}>{t(TIERS[tierIdx].name)}</p>
          <p className="text-sm text-muted-foreground">{tierPoints} pts</p>
          {/* tier progress bar */}
          <div className="w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, ((tierPoints - TIERS[tierIdx].min) / (TIERS[tierIdx].max === Infinity ? 1000 : (TIERS[tierIdx].max - TIERS[tierIdx].min + 1))) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex gap-6 text-center text-sm">
            <div><p className="font-extrabold text-foreground">{stats.wins}</p><p className="text-xs text-muted-foreground">{t("battle.wins")}</p></div>
            <div><p className="font-extrabold text-foreground">{stats.losses}</p><p className="text-xs text-muted-foreground">{t("battle.losses")}</p></div>
            <div><p className="font-extrabold text-foreground">{stats.winStreak}</p><p className="text-xs text-muted-foreground">{t("battle.streak")}</p></div>
          </div>
        </div>

        {/* my character */}
        <div className="flex flex-col items-center gap-1">
          <PixelCharacter characterId={myCharacterId} size={80} float />
          <p className="text-sm font-semibold">{getCharName(charById(myCharacterId), lang)}</p>
        </div>

        <button
          onClick={startBattle}
          className="w-full max-w-xs rounded-full bg-primary py-3 font-bold text-primary-foreground text-lg hover:brightness-110 transition-all shadow-lg"
        >
          {t("battle.start")}
        </button>
      </div>
    );
  }

  // ── COIN FLIP ──────────────────────────────────────────────────────
  if (phase === "coin") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black gap-6">
        <style>{`@keyframes coin-spin{0%{transform:rotateY(0deg)}100%{transform:rotateY(720deg)}}`}</style>
        <div style={{ animation: "coin-spin 1.8s ease-out forwards", width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 40 40" style={{ imageRendering: "pixelated" }}>
            <circle cx="20" cy="20" r="19" fill="#FFD700" stroke="#B8860B" strokeWidth="2" />
            <circle cx="20" cy="20" r="14" fill="#FFA500" />
            <text x="20" y="26" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#B8860B">₩</text>
          </svg>
        </div>
        {coinResult && (
          <p className="text-xl font-extrabold text-white">
            {coinResult === "heads" ? t("battle.coin_heads") : t("battle.coin_tails")}
          </p>
        )}
        <p className="text-sm text-white/50">{t("battle.waiting")}</p>
      </div>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const newTierIdx = getTierIndex(result.tierPoints);
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black gap-5 px-6">
        <div className={`text-5xl font-extrabold ${result.won ? "text-yellow-400" : "text-gray-400"}`}>
          {result.won ? t("battle.win") : t("battle.lose")}
        </div>
        <TierBadge tierIdx={newTierIdx} size={64} />
        <p className={`text-2xl font-extrabold ${TIER_COLORS[newTierIdx]}`}>{t(TIERS[newTierIdx].name)}</p>
        <p className={`text-base font-bold ${result.pointsDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
          {result.pointsDelta >= 0 ? `+${result.pointsDelta}` : result.pointsDelta} pts
        </p>
        <p className="text-sm text-white/60">{result.tierPoints} pts 보유</p>
        <div className="flex gap-6 text-center text-sm text-white">
          <div><p className="font-extrabold">{result.wins}</p><p className="text-xs text-white/50">{t("battle.wins")}</p></div>
          <div><p className="font-extrabold">{result.losses}</p><p className="text-xs text-white/50">{t("battle.losses")}</p></div>
          <div><p className="font-extrabold">{result.winStreak}</p><p className="text-xs text-white/50">{t("battle.streak")}</p></div>
        </div>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={reset} className="flex-1 rounded-full bg-white/10 py-2.5 text-white font-semibold hover:bg-white/20">
            <ArrowLeft className="inline h-4 w-4 mr-1" />{t("battle.back")}
          </button>
          <button onClick={startBattle} className="flex-1 rounded-full bg-primary py-2.5 font-bold text-primary-foreground hover:brightness-110">
            {t("battle.start")}
          </button>
        </div>
      </div>
    );
  }

  // ── BATTLE ARENA ───────────────────────────────────────────────────
  if (!battleState) return null;
  const { player, opponent, turn, maxHp } = battleState;
  const myTurn = turn === "player";
  const playerDef = charById(player.characterId);
  const oppDef = charById(opponent.characterId);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      <style>{`
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
        @keyframes bounce-up{0%{transform:translateY(0)}50%{transform:translateY(-12px)}100%{transform:translateY(0)}}
        @keyframes roll-in{0%{opacity:0;transform:scale(0.5) rotate(-15deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
      `}</style>

      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30">
        <button onClick={reset} className="flex items-center gap-1 text-sm text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t("battle.back")}
        </button>
        <p className="text-sm font-bold text-white/60">{t("battle.title")}</p>
        <Shield className="h-4 w-4 text-white/30" />
      </div>

      {/* opponent */}
      <div className="flex flex-col items-end px-5 pt-4 pb-2">
        <p className="text-xs font-semibold text-white/60 mb-1">{opponent.nickname}</p>
        <HpBar hp={opponent.hp} maxHp={maxHp} flip />
        <div
          className="mt-2"
          style={{ animation: !myTurn ? "bounce-up 0.8s ease-in-out infinite" : undefined }}
        >
          <PixelCharacter characterId={opponent.characterId} size={72} />
        </div>
      </div>

      {/* VS divider */}
      <div className="flex items-center gap-3 px-6 py-1">
        <div className="flex-1 h-px bg-white/10" />
        <p className="text-xs font-bold text-white/40">{t("battle.vs")}</p>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* player */}
      <div className="flex flex-col items-start px-5 pt-2 pb-4">
        <div
          style={{ animation: myTurn ? "bounce-up 0.8s ease-in-out infinite" : undefined }}
        >
          <PixelCharacter characterId={player.characterId} size={72} />
        </div>
        <p className="text-xs font-semibold text-white/60 mt-1 mb-1">{player.nickname}</p>
        <HpBar hp={player.hp} maxHp={maxHp} />
      </div>

      {/* dice result */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
        {lastRoll && (
          <div
            className="flex flex-col items-center gap-1"
            style={{ animation: "roll-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <div className="flex gap-2">
              {lastRoll.rolls.map((r, i) => (
                <div key={i} className="w-11 h-11 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-extrabold text-white">
                  {r}
                </div>
              ))}
            </div>
            <p className={`text-sm font-bold ${lastRoll.attacker === "player" ? "text-green-400" : "text-red-400"}`}>
              = {lastRoll.total} dmg
            </p>
          </div>
        )}

        {/* turn indicator + roll button */}
        <div className="flex flex-col items-center gap-2">
          <p className={`text-sm font-semibold ${myTurn ? "text-green-400" : "text-white/50"}`}>
            {myTurn ? t("battle.your_turn") : t("battle.opponent_turn")}
          </p>
          {myTurn && (
            <button
              onClick={rollDice}
              disabled={rolling}
              className={`rounded-full px-8 py-3 font-bold text-white text-base transition-all shadow-lg ${
                rolling ? "bg-gray-600 cursor-not-allowed" : "bg-primary hover:brightness-110 active:scale-95"
              }`}
            >
              {t("battle.roll")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
