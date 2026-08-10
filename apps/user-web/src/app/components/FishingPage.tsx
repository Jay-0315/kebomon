import { useEffect, useRef, useState } from "react";
import { Fish as FishIcon, Sparkles, BookOpen, Zap, Anchor, Waves, Lock, X, Trophy } from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { api } from "../lib/api";
import {
  FISH,
  FISH_BY_ID,
  FISH_DEX_MILESTONES,
  FISH_RARITY_BG,
  FISH_RARITY_HEX,
  getFishName,
} from "../data/fish";
import {
  RARITY_COLOR,
  RARITY_BORDER,
  getRarityLabel,
  type CharacterRarity,
} from "../data/characters";

// ─── 에셋 — 낚시용 물고기 스프라이트(OpenGameArt "Cute Fish Sprites" by chips8688, OGA-BY 3.0)
// + 물결/기척 이펙트("Pixel Art Lake Assets", CC0) + 수면 파도 텍스처("Fishing Game Assets
// Pixel Art" by CraftPix.net, OGA-BY 3.0). 등급별 색상이 기존 FISH_RARITY_HEX 팔레트와
// 자연스럽게 맞아떨어지는 색상만 골라 각 등급에 매핑했다.
const RISEUP_SHEET = "/fishing-assets/riseup_sheet.png";
const RIPPLE_SHEET = "/fishing-assets/ripple_sheet.png";
const RISEUP_FRAMES = 8;
const RIPPLE_FRAMES = 4;

// 등급별 정지 프레임을 보여주는 스프라이트 클립 (CSS background-position 방식 — 시트 전체를
// 폭 4배로 늘린 뒤 프레임 인덱스만큼 밀어서 한 칸만 보이게 한다)
function SwimIcon({ rarity, frame = 0, size = 40 }: { rarity: string; size?: number; frame?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(/fishing-assets/swim_${rarity}.png)`,
        backgroundSize: "400% 100%",
        backgroundPosition: `${(frame / 3) * 100}% 0`,
        imageRendering: "pixelated",
      }}
    />
  );
}

function FishPortrait({ fish, size = 40, className = "" }: { fish: { asset: string; name: string }; size?: number; className?: string }) {
  return (
    <img
      src={fish.asset}
      alt={fish.name}
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
      }}
      draggable={false}
    />
  );
}

type Phase = "idle" | "waiting" | "catching" | "success" | "missed";
type Grade = "perfect" | "good";
type FishDexFilter = "all" | "owned" | "missing" | CharacterRarity;

const FISH_FILTERS: FishDexFilter[] = ["all", "owned", "missing", "common", "uncommon", "rare", "epic", "legendary", "mythic"];

const FISH_RARITY_TONE: Record<CharacterRarity, { aura: string; rays: string; ring: string; scale: string }> = {
  common: { aura: "from-slate-400/20", rays: "bg-slate-200/10", ring: "border-slate-300/35", scale: "scale-100" },
  uncommon: { aura: "from-emerald-400/25", rays: "bg-emerald-200/10", ring: "border-emerald-300/45", scale: "scale-105" },
  rare: { aura: "from-sky-400/30", rays: "bg-sky-200/15", ring: "border-sky-300/55", scale: "scale-110" },
  epic: { aura: "from-violet-400/35", rays: "bg-violet-200/20", ring: "border-violet-300/60", scale: "scale-115" },
  legendary: { aura: "from-amber-300/45", rays: "bg-amber-100/25", ring: "border-amber-200/70", scale: "scale-125" },
  mythic: { aura: "from-pink-300/50", rays: "bg-pink-100/30", ring: "border-pink-200/80", scale: "scale-125" },
};

const fishUi = (lang: string) => ({
  nextReward: lang === "ja" ? "次の報酬" : lang === "en" ? "Next Reward" : "다음 보상",
  complete: lang === "ja" ? "すべて達成" : lang === "en" ? "Complete" : "전체 달성",
  left: lang === "ja" ? "残り" : lang === "en" ? "left" : "남음",
  filterAll: lang === "ja" ? "全体" : lang === "en" ? "All" : "전체",
  owned: lang === "ja" ? "発見済み" : lang === "en" ? "Owned" : "보유",
  missing: lang === "ja" ? "未発見" : lang === "en" ? "Missing" : "미발견",
  caught: lang === "ja" ? "捕獲数" : lang === "en" ? "Caught" : "포획 수",
  firstFind: lang === "ja" ? "発見すると詳細が開きます" : lang === "en" ? "Details unlock when discovered" : "발견하면 상세 정보가 열립니다",
  dexDetail: lang === "ja" ? "図鑑詳細" : lang === "en" ? "Dex Detail" : "도감 상세",
  speciesNo: lang === "ja" ? "種 No." : lang === "en" ? "Species No." : "도감 번호",
  habitat: lang === "ja" ? "生息地" : lang === "en" ? "Habitat" : "서식지",
  close: lang === "ja" ? "閉じる" : lang === "en" ? "Close" : "닫기",
});

const getFishHabitat = (rarity: CharacterRarity, lang: string) => {
  const ko: Record<CharacterRarity, string> = {
    common: "얕은 해변가",
    uncommon: "잔잔한 물가",
    rare: "푸른 난류",
    epic: "달빛 암초",
    legendary: "폭풍 먼바다",
    mythic: "심연의 균열",
  };
  const ja: Record<CharacterRarity, string> = {
    common: "浅い浜辺",
    uncommon: "穏やかな水辺",
    rare: "青い暖流",
    epic: "月光の岩礁",
    legendary: "嵐の沖合",
    mythic: "深淵の裂け目",
  };
  const en: Record<CharacterRarity, string> = {
    common: "Shallow Shore",
    uncommon: "Quiet Waters",
    rare: "Blue Current",
    epic: "Moonlit Reef",
    legendary: "Storming Offshore",
    mythic: "Abyssal Rift",
  };
  return lang === "ja" ? ja[rarity] : lang === "en" ? en[rarity] : ko[rarity];
};

const BITE_MIN_DELAY_MS = 2000;
const BITE_MAX_DELAY_MS = 5000;

// ─── 낚시찌 당기기 미니게임 물리 상수 — Node 스크립트로 "가만히 있으면 대부분 놓치고,
// 물고기를 실제로 따라가면 대부분 잡히는" 난이도가 나오도록 시뮬레이션해서 튜닝한 값 ───
const BAR_HEIGHT_PCT = 30;
const BAR_GRAVITY = 0.00018;
const BAR_HOLD_ACCEL = 0.00036;
const BAR_MAX_SPEED = 0.095;
const FISH_MIN_SPEED = 0.018;
const FISH_MAX_SPEED = 0.06;
const FISH_RETARGET_MIN_MS = 350;
const FISH_RETARGET_MAX_MS = 900;
const PROGRESS_FILL_PER_MS = 0.05;
const PROGRESS_DRAIN_PER_MS = 0.05;
const START_PROGRESS = 35;
const PERFECT_QUALITY_THRESHOLD = 0.72;
const CATCH_TIMEOUT_MS = 20000;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface CatchGame {
  fishPct: number;
  fishTargetPct: number;
  fishNextRetargetAt: number;
  barPct: number;
  barVel: number;
  progressPct: number;
  qualityInMs: number;
  qualityTotalMs: number;
  startedAt: number;
}

function freshCatchGame(now: number): CatchGame {
  return {
    fishPct: 50,
    fishTargetPct: 50,
    fishNextRetargetAt: now,
    barPct: 50,
    barVel: 0,
    progressPct: START_PROGRESS,
    qualityInMs: 0,
    qualityTotalMs: 0,
    startedAt: now,
  };
}

interface CatchResult {
  fishId: number;
  rarity: keyof typeof FISH_RARITY_BG;
  isNew: boolean;
  points: number;
  dailyCapReached: boolean;
  totalCaught: number;
  distinctCount: number;
  milestoneKp: number;
}

export default function FishingPage() {
  const { t, lang } = useLang();
  const { refreshRewards } = useAppData();

  const [tab, setTab] = useState<"fish" | "dex">("fish");
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);
  const [catchResult, setCatchResult] = useState<CatchResult | null>(null);
  const [ownedFish, setOwnedFish] = useState<Record<number, number>>({});
  const [cooldownMs, setCooldownMs] = useState(0);
  const [dailyEarned, setDailyEarned] = useState(0);
  const [dailyCap, setDailyCap] = useState(500);
  const [fishDexBest, setFishDexBest] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<number | null>(null);
  const [dexFilter, setDexFilter] = useState<FishDexFilter>("all");
  const [selectedFishId, setSelectedFishId] = useState<number | null>(null);

  // 렌더용 스냅샷 — 실제 물리 계산은 catchRef(ref)에서 매 프레임 진행하고, 화면 갱신에
  // 필요한 세 값만 state로 미러링한다
  const [fishPct, setFishPct] = useState(50);
  const [barPct, setBarPct] = useState(50);
  const [progressPct, setProgressPct] = useState(START_PROGRESS);
  const [riseFrame, setRiseFrame] = useState(0);
  const [rippleKey, setRippleKey] = useState<number | null>(null);
  const [ripplePos, setRipplePos] = useState<"top" | "fish">("top");

  const catchRef = useRef<CatchGame | null>(null);
  const holdingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rippleSeq = useRef(0);

  useEffect(() => {
    api
      .get<{
        ownedFish: Record<number, number>;
        cooldownRemainingMs: number;
        dailyPointsEarned: number;
        dailyPointsCap: number;
        fishDexMilestoneBest: number;
      }>("/fishing/summary")
      .then((s) => {
        setOwnedFish(s.ownedFish);
        setCooldownMs(s.cooldownRemainingMs);
        setDailyEarned(s.dailyPointsEarned);
        setDailyCap(s.dailyPointsCap);
        setFishDexBest(s.fishDexMilestoneBest);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const interval = setInterval(() => {
      setCooldownMs((prev) => Math.max(0, prev - 200));
    }, 200);
    return () => clearInterval(interval);
  }, [cooldownMs > 0]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    };
  }, []);

  const playRipple = (pos: "top" | "fish") => {
    rippleSeq.current += 1;
    setRipplePos(pos);
    setRippleKey(rippleSeq.current);
  };

  const startWaiting = () => {
    setPhase("waiting");
    playRipple("top");
    const delay = BITE_MIN_DELAY_MS + Math.random() * (BITE_MAX_DELAY_MS - BITE_MIN_DELAY_MS);
    const start = performance.now();
    const loop = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= delay) {
        setRiseFrame(RISEUP_FRAMES - 1);
        startCatching();
        return;
      }
      setRiseFrame(Math.floor((elapsed / delay) * (RISEUP_FRAMES - 1)));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const handleCast = async () => {
    if (phase !== "idle" || cooldownMs > 0) return;
    setError(null);
    try {
      await api.post("/fishing/cast");
      setCooldownMs(3000);
      startWaiting();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const finishCatching = (result: "win" | "lose") => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const game = catchRef.current;
    catchRef.current = null;

    if (result === "lose" || !game) {
      setPhase("missed");
      setTimeout(() => setPhase("idle"), 1200);
      return;
    }

    const quality = game.qualityTotalMs > 0 ? game.qualityInMs / game.qualityTotalMs : 0;
    const grade: Grade = quality >= PERFECT_QUALITY_THRESHOLD ? "perfect" : "good";
    setLastGrade(grade);
    playRipple("fish");
    setPhase("success");
    api
      .post<CatchResult>("/fishing/catch", { grade })
      .then((res) => {
        setCatchResult(res);
        setOwnedFish((prev) => ({ ...prev, [res.fishId]: res.totalCaught }));
        setDailyEarned((prev) => Math.min(dailyCap, prev + res.points + res.milestoneKp));
        void refreshRewards();
        if (res.milestoneKp > 0) {
          setFishDexBest(res.distinctCount);
          setMilestoneToast(res.distinctCount);
          setTimeout(() => setMilestoneToast(null), 3500);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("idle");
      });
  };

  const startCatching = () => {
    const now = performance.now();
    catchRef.current = freshCatchGame(now);
    holdingRef.current = false;
    setPhase("catching");

    const loop = (now: number) => {
      const g = catchRef.current;
      if (!g) return;
      const dt = 16.67; // rAF 프레임 간격 고정치 사용 — 탭 전환 등으로 dt가 크게 튀는 것을 방지

      if (now >= g.fishNextRetargetAt) {
        g.fishTargetPct = 10 + Math.random() * 80;
        g.fishNextRetargetAt = now + FISH_RETARGET_MIN_MS + Math.random() * (FISH_RETARGET_MAX_MS - FISH_RETARGET_MIN_MS);
      }
      const diff = g.fishTargetPct - g.fishPct;
      const speed = FISH_MIN_SPEED + Math.random() * (FISH_MAX_SPEED - FISH_MIN_SPEED);
      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      g.fishPct = clamp(g.fishPct + step, 0, 100);

      g.barVel += (holdingRef.current ? BAR_HOLD_ACCEL : -BAR_GRAVITY) * dt;
      g.barVel = clamp(g.barVel, -BAR_MAX_SPEED, BAR_MAX_SPEED);
      g.barPct += g.barVel * dt;
      const half = BAR_HEIGHT_PCT / 2;
      if (g.barPct <= half) { g.barPct = half; g.barVel = Math.max(0, g.barVel); }
      if (g.barPct >= 100 - half) { g.barPct = 100 - half; g.barVel = Math.min(0, g.barVel); }

      const overlap = Math.abs(g.fishPct - g.barPct) <= half;
      g.progressPct = clamp(g.progressPct + (overlap ? PROGRESS_FILL_PER_MS : -PROGRESS_DRAIN_PER_MS) * dt, 0, 100);
      g.qualityTotalMs += dt;
      if (overlap) g.qualityInMs += dt;

      setFishPct(g.fishPct);
      setBarPct(g.barPct);
      setProgressPct(g.progressPct);

      if (g.progressPct >= 100) { finishCatching("win"); return; }
      if (g.progressPct <= 0 || now - g.startedAt >= CATCH_TIMEOUT_MS) { finishCatching("lose"); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const closeReveal = () => {
    setPhase("idle");
    setCatchResult(null);
  };

  const cooldownSec = Math.ceil(cooldownMs / 1000);
  const distinctCount = Object.keys(ownedFish).length;
  const barHalf = BAR_HEIGHT_PCT / 2;
  const ui = fishUi(lang);
  const nextMilestone = FISH_DEX_MILESTONES.find((m) => distinctCount < m.count);
  const selectedFish = selectedFishId ? FISH_BY_ID.get(selectedFishId) ?? null : null;
  const filteredFish = FISH.filter((fishDef) => {
    const owned = (ownedFish[fishDef.id] ?? 0) > 0;
    if (dexFilter === "owned") return owned;
    if (dexFilter === "missing") return !owned;
    if (dexFilter === "all") return true;
    return fishDef.rarity === dexFilter;
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/25 bg-primary/10">
            <FishIcon className="w-5 h-5 text-primary" />
          </span>
          <div>
            <h2 className="text-xl font-bold leading-tight">{t("nav.fishing")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("fishing.dex_count")} {distinctCount}/{FISH.length}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300">
          <Zap className="w-3.5 h-3.5" />
          {t("fishing.daily_cap")
            .replace("{earned}", String(dailyEarned))
            .replace("{cap}", String(dailyCap))}
        </div>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {(["fish", "dex"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === tb
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {tb === "fish" ? t("fishing.tab_fish") : t("fishing.tab_dex")}
          </button>
        ))}
      </div>

      {tab === "fish" && (
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 flex flex-col items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-2 text-xs flex-wrap justify-center">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
              <BookOpen className="w-3 h-3" />
              {t("fishing.dex_count")} {distinctCount}/{FISH.length}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 text-amber-400 font-semibold">
              <Zap className="w-3 h-3" />
              {t("fishing.daily_cap")
                .replace("{earned}", String(dailyEarned))
                .replace("{cap}", String(dailyCap))}
            </span>
          </div>

          {/* 낚시터 — 기존 해변 배경 에셋 위에 수면 톤을 얹어 미니게임 UI 가독성을 유지한다. */}
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-sky-300/25 select-none shadow-[inset_0_-30px_60px_rgba(6,78,118,0.45)]"
            style={{
              height: 360,
              backgroundImage:
                "linear-gradient(180deg, rgba(7,89,133,0.2) 0%, rgba(8,47,73,0.38) 46%, rgba(12,74,110,0.7) 100%), url(/bg-beach.png)",
              backgroundPosition: "center 48%",
              backgroundSize: "cover",
              touchAction: "none",
            }}
            onPointerDown={(e) => { if (phase === "catching") { e.preventDefault(); holdingRef.current = true; } }}
            onPointerUp={() => { holdingRef.current = false; }}
            onPointerLeave={() => { holdingRef.current = false; }}
            onPointerCancel={() => { holdingRef.current = false; }}
          >
            <div
              className="absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  "linear-gradient(115deg, transparent 0 12%, rgba(255,255,255,0.28) 13%, transparent 18% 34%, rgba(255,255,255,0.18) 35%, transparent 42% 100%)",
              }}
            />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-200/18 via-white/5 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-sky-950/60 via-cyan-950/20 to-transparent" />
            <div className="absolute left-4 bottom-7 h-10 w-3 rounded-t-full bg-emerald-300/45 shadow-[12px_-8px_0_rgba(110,231,183,0.28),26px_5px_0_rgba(52,211,153,0.24)]" />
            <div className="absolute right-8 bottom-8 h-12 w-3 rounded-t-full bg-lime-300/40 shadow-[-14px_7px_0_rgba(132,204,22,0.22),18px_-4px_0_rgba(163,230,53,0.26)]" />
            <div className="absolute left-[10%] top-[34%] opacity-60" style={{ animation: "fishingDrift 7s ease-in-out infinite" }}>
              <FishPortrait fish={FISH[5]} size={28} className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" />
            </div>
            <div className="absolute right-[12%] top-[52%] opacity-50 [transform:scaleX(-1)]" style={{ animation: "fishingDrift 8.5s ease-in-out 0.6s infinite" }}>
              <FishPortrait fish={FISH[12]} size={34} className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]" />
            </div>
            <div className="absolute left-[22%] bottom-[18%] opacity-40" style={{ animation: "fishingDrift 9s ease-in-out 1.2s infinite" }}>
              <FishPortrait fish={FISH[23]} size={30} />
            </div>
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-xl border border-white/15 bg-sky-950/35 px-3 py-2 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
              <Waves className="w-3.5 h-3.5" />
              {phase === "catching" ? t("fishing.bite") : t("fishing.tab_fish")}
            </div>
            <div className="absolute right-5 top-5 flex items-center gap-2 rounded-xl border border-white/15 bg-sky-950/35 px-3 py-2 text-[11px] font-semibold text-white/85 backdrop-blur-sm">
              <Anchor className="w-3.5 h-3.5" />
              {distinctCount}/{FISH.length}
            </div>
            {rippleKey !== null && (
              <div
                key={rippleKey}
                className="fishing-ripple absolute w-10 h-10 -translate-x-1/2"
                style={{
                  left: "50%",
                  top: ripplePos === "top" ? 0 : `${100 - fishPct}%`,
                  transform: "translate(-50%, -50%)",
                  backgroundImage: `url(${RIPPLE_SHEET})`,
                  backgroundSize: `${RIPPLE_FRAMES * 100}% 100%`,
                  imageRendering: "pixelated",
                }}
                onAnimationEnd={() => setRippleKey(null)}
              />
            )}

            {(phase === "idle") && (
              <div className="absolute inset-x-5 bottom-5 flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-sky-950/45 p-4 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/10">
                    <SwimIcon rarity="rare" size={36} frame={1} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white drop-shadow">{t("fishing.cast")}</p>
                    <p className="text-[11px] font-medium text-white/70">
                      {t("fishing.daily_cap")
                        .replace("{earned}", String(dailyEarned))
                        .replace("{cap}", String(dailyCap))}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleCast()}
                  disabled={cooldownMs > 0}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                    cooldownMs <= 0
                      ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90"
                      : "bg-white/20 text-white/70 cursor-not-allowed opacity-70"
                  }`}
                >
                  {cooldownMs > 0
                    ? t("fishing.cooldown").replace("{s}", String(cooldownSec))
                    : t("fishing.cast")}
                </button>
                {error && <p className="text-sm text-rose-400">{error}</p>}
              </div>
            )}

            {phase === "waiting" && (
              <>
                <div
                  className="absolute left-1/2 bottom-[10%] w-12 h-12 -translate-x-1/2"
                  style={{
                    backgroundImage: `url(${RISEUP_SHEET})`,
                    backgroundSize: `${RISEUP_FRAMES * 100}% 100%`,
                    backgroundPosition: `${(riseFrame / (RISEUP_FRAMES - 1)) * 100}% 0`,
                    imageRendering: "pixelated",
                  }}
                />
                <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/90 drop-shadow">
                  {t("fishing.waiting")}
                </p>
              </>
            )}

            {phase === "catching" && (
              <>
                <p className="absolute top-2 inset-x-0 text-center text-sm font-bold text-white drop-shadow">
                  {t("fishing.bite")}
                </p>
                {/* 진행도 미터 (오른쪽) */}
                <div className="absolute right-2 top-8 bottom-2 w-2 rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="absolute bottom-0 inset-x-0 rounded-full transition-[height]"
                    style={{
                      height: `${progressPct}%`,
                      background: "linear-gradient(180deg, #4ade80, #16a34a)",
                    }}
                  />
                </div>
                {/* 중앙 '찌 통로' — 막대와 물고기가 같은 좁은 레인을 공유해야 막대가
                    실제 활동 영역만큼만 보이고 텅 빈 큰 상자처럼 안 보인다 */}
                <div className="absolute left-1/2 top-8 bottom-2 w-24 -translate-x-1/2">
                  {/* 잡기 막대 */}
                  <div
                    className="absolute inset-x-0 rounded-xl border-2 border-emerald-300/80"
                    style={{
                      bottom: `${clamp(barPct - barHalf, 0, 100 - BAR_HEIGHT_PCT)}%`,
                      height: `${BAR_HEIGHT_PCT}%`,
                      background: "linear-gradient(180deg, rgba(110,231,183,0.4), rgba(16,185,129,0.22))",
                      boxShadow: "0 0 14px rgba(52,211,153,0.55), inset 0 0 10px rgba(255,255,255,0.18)",
                    }}
                  />
                  {/* 물고기 그림자(실루엣) — 등급은 아직 모르니 실제 색상 대신 그림자만 보여준다 */}
                  <div
                    className="absolute left-1/2 w-9 h-9 -translate-x-1/2"
                    style={{
                      bottom: `calc(${fishPct}% - 18px)`,
                      backgroundImage: `url(${RISEUP_SHEET})`,
                      backgroundSize: `${RISEUP_FRAMES * 100}% 100%`,
                      backgroundPosition: "100% 0",
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
                <p className="absolute inset-x-0 bottom-2 text-center text-[11px] text-white/80 drop-shadow pointer-events-none">
                  {t("fishing.hook_btn")}
                </p>
              </>
            )}

            {phase === "missed" && (
              <p className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white/90 drop-shadow">
                {t("fishing.miss")}
              </p>
            )}

            {phase === "success" && (
              <p className="absolute inset-0 flex items-center justify-center gap-1.5 text-sm font-medium text-white/90 drop-shadow">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                {t("fishing.reeling")}
              </p>
            )}
          </div>

          {phase === "success" && catchResult && (() => {
            const fishDef = FISH_BY_ID.get(catchResult.fishId);
            if (!fishDef) return null;
            const rarity = fishDef.rarity;
            const hex = FISH_RARITY_HEX[rarity];
            const tone = FISH_RARITY_TONE[rarity];
            return (
              <div
                className="flex flex-col items-center gap-3 py-1 w-full"
                style={{ animation: "fishRevealIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
              >
                {lastGrade && (
                  <p
                    className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide"
                    style={{ color: lastGrade === "perfect" ? "#fbbf24" : "#60a5fa" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {t(`fishing.${lastGrade}`)}
                  </p>
                )}
                <div
                  className={`relative rounded-2xl p-6 flex flex-col items-center gap-2 w-full overflow-hidden border-2 ${tone.ring}`}
                  style={{
                    background: `radial-gradient(circle at 50% 20%, ${hex}45 0%, ${hex}14 48%, rgba(15,23,42,0.12) 100%)`,
                    boxShadow: `0 0 ${rarity === "mythic" || rarity === "legendary" ? 54 : 30}px ${hex}55, inset 0 0 36px ${hex}18`,
                  }}
                >
                  {(rarity === "epic" || rarity === "legendary" || rarity === "mythic") && (
                    <div
                      className={`pointer-events-none absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b ${tone.aura} to-transparent opacity-90 blur-2xl`}
                    />
                  )}
                  {(rarity === "legendary" || rarity === "mythic") && (
                    <div className={`pointer-events-none absolute left-1/2 top-24 h-72 w-8 origin-center -translate-x-1/2 -translate-y-1/2 ${tone.rays} blur-sm`} style={{ animation: "fishRaySpin 5s linear infinite" }} />
                  )}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full blur-xl"
                      style={{ background: hex, opacity: 0.5, animation: "fishGlowPulse 1.8s ease-in-out infinite" }}
                    />
                    <FishPortrait
                      fish={fishDef}
                      size={88}
                      className={`relative drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)] ${tone.scale} [animation:fishIconPop_0.5s_0.05s_ease-out_both]`}
                    />
                  </div>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ color: hex, background: `${hex}22`, border: `1px solid ${hex}55` }}
                  >
                    {getRarityLabel(rarity, lang)}
                  </span>
                  <p className="text-xl font-extrabold" style={{ color: hex }}>
                    {getFishName(fishDef, lang)}
                  </p>
                  <div className="flex items-center gap-2">
                    {catchResult.isNew ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full font-semibold">
                        {t("fishing.new_badge")}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                        x{catchResult.totalCaught}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      +{catchResult.points}KP
                    </span>
                  </div>
                  {catchResult.dailyCapReached && (
                    <p className="text-[10px] text-amber-400">{t("fishing.daily_cap_reached")}</p>
                  )}
                </div>
                <button
                  onClick={closeReveal}
                  className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition"
                >
                  {t("fishing.continue")}
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {tab === "dex" && (
        <div className="space-y-3">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("fishing.milestone_heading")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {nextMilestone
                    ? `${ui.nextReward}: ${distinctCount}/${nextMilestone.count} · ${Math.max(0, nextMilestone.count - distinctCount)} ${ui.left}`
                    : ui.complete}
                </p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
                <Trophy className="h-5 w-5" />
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${nextMilestone ? clamp((distinctCount / nextMilestone.count) * 100, 0, 100) : 100}%`,
                }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {FISH_DEX_MILESTONES.map((m) => {
                const achieved = fishDexBest >= m.count;
                return (
                  <p
                    key={m.count}
                    className={`rounded-lg px-2 py-1 text-[11px] ${
                      achieved
                        ? "bg-primary/10 text-primary font-semibold"
                        : "bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    {achieved ? "✓ " : ""}
                    {t("fishing.milestone_item")
                      .replace("{count}", String(m.count))
                      .replace("{kp}", String(m.kp))}
                  </p>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {FISH_FILTERS.map((filter) => {
              const active = dexFilter === filter;
              const label =
                filter === "all"
                  ? ui.filterAll
                  : filter === "owned"
                    ? ui.owned
                    : filter === "missing"
                      ? ui.missing
                      : getRarityLabel(filter, lang);
              return (
                <button
                  key={filter}
                  onClick={() => setDexFilter(filter)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${
                    active
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {filteredFish.map((fishDef) => {
            const count = ownedFish[fishDef.id] ?? 0;
            const owned = count > 0;
            return (
              <button
                key={fishDef.id}
                onClick={() => setSelectedFishId(fishDef.id)}
                className={`min-h-[118px] rounded-xl border p-3 flex flex-col items-center justify-between gap-1 transition active:scale-95 ${
                  owned
                    ? `${RARITY_BORDER[fishDef.rarity]} ${FISH_RARITY_BG[fishDef.rarity]} hover:bg-muted/40`
                    : "border-border bg-muted/70 opacity-75"
                }`}
              >
                <div className="grid h-11 w-11 place-items-center">
                  {owned ? (
                    <FishPortrait fish={fishDef} size={42} />
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <p
                  className={`min-h-8 text-[11px] font-semibold text-center leading-tight ${owned ? RARITY_COLOR[fishDef.rarity] : "text-muted-foreground"}`}
                >
                  {owned ? getFishName(fishDef, lang) : "???"}
                </p>
                <span className={`text-[10px] ${owned ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
                  {owned ? `x${count}` : getRarityLabel(fishDef.rarity, lang)}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      )}

      {selectedFish && (() => {
        const count = ownedFish[selectedFish.id] ?? 0;
        const owned = count > 0;
        const hex = FISH_RARITY_HEX[selectedFish.rarity];
        return (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4"
            onClick={() => setSelectedFishId(null)}
          >
            <div
              className={`w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border bg-card p-5 shadow-2xl ${owned ? RARITY_BORDER[selectedFish.rarity] : "border-border"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">{ui.dexDetail}</p>
                  <h3 className={`text-lg font-extrabold ${owned ? RARITY_COLOR[selectedFish.rarity] : "text-muted-foreground"}`}>
                    {owned ? getFishName(selectedFish, lang) : "???"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFishId(null)}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"
                  aria-label={ui.close}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div
                className="my-5 flex h-44 items-center justify-center rounded-2xl border overflow-hidden"
                style={{
                  borderColor: owned ? `${hex}66` : undefined,
                  background: owned
                    ? `radial-gradient(circle at 50% 42%, ${hex}2f 0%, ${hex}0d 52%, transparent 100%)`
                    : "rgba(148,163,184,0.08)",
                }}
              >
                {owned ? (
                  <FishPortrait fish={selectedFish} size={108} className="drop-shadow-[0_12px_22px_rgba(0,0,0,0.35)]" />
                ) : (
                  <Lock className="h-12 w-12 text-muted-foreground/70" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{ui.speciesNo}</p>
                  <p className="font-bold">#{String(selectedFish.id).padStart(2, "0")}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{ui.caught}</p>
                  <p className="font-bold">{owned ? `x${count}` : "-"}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{ui.habitat}</p>
                  <p className="font-bold">{owned ? getFishHabitat(selectedFish.rarity, lang) : "???"}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{getRarityLabel(selectedFish.rarity, lang)}</p>
                  <p className={`font-bold ${RARITY_COLOR[selectedFish.rarity]}`}>{getRarityLabel(selectedFish.rarity, lang)}</p>
                </div>
              </div>

              {!owned && (
                <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-center text-[11px] text-muted-foreground">
                  {ui.firstFind}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {milestoneToast !== null && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-primary/40 bg-card px-4 py-2.5 shadow-lg">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FishIcon className="w-4 h-4 text-primary" />
            {t("fishing.milestone_toast").replace(
              "{n}",
              String(milestoneToast),
            )}
          </p>
        </div>
      )}
    </div>
  );
}
