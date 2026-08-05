import { useEffect, useRef, useState } from "react";
import { Fish as FishIcon, Sparkles, BookOpen, Zap } from "lucide-react";
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
} from "../data/characters";

// ─── 에셋 — 낚시용 물고기 스프라이트(OpenGameArt "Cute Fish Sprites" by chips8688, OGA-BY 3.0)
// + 물결/기척 이펙트("Pixel Art Lake Assets", CC0). 등급별 색상이 기존 FISH_RARITY_HEX 팔레트와
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

type Phase = "idle" | "waiting" | "catching" | "success" | "missed";
type Grade = "perfect" | "good";

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <FishIcon className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">{t("nav.fishing")}</h2>
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
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-4">
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

          {/* 물탱크 — idle/waiting/catching 전 구간에서 항상 보이는 공용 배경 */}
          <div
            className="relative w-full overflow-hidden rounded-2xl border border-sky-400/20 select-none"
            style={{
              height: 300,
              background: "linear-gradient(180deg, #7dd3fc22 0%, #0ea5e955 45%, #0369a1cc 100%)",
              touchAction: "none",
            }}
            onPointerDown={(e) => { if (phase === "catching") { e.preventDefault(); holdingRef.current = true; } }}
            onPointerUp={() => { holdingRef.current = false; }}
            onPointerLeave={() => { holdingRef.current = false; }}
            onPointerCancel={() => { holdingRef.current = false; }}
          >
            {/* 수면 라인 */}
            <div className="absolute top-0 inset-x-0 h-2 bg-sky-200/30" />

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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                <button
                  onClick={() => void handleCast()}
                  disabled={cooldownMs > 0}
                  className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
                    cooldownMs <= 0
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground cursor-not-allowed opacity-60"
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
                {/* 잡기 막대 */}
                <div
                  className="absolute left-2 right-6 rounded-lg border-2 border-emerald-300/70 bg-emerald-400/25"
                  style={{ bottom: `${clamp(barPct - barHalf, 0, 100 - BAR_HEIGHT_PCT)}%`, height: `${BAR_HEIGHT_PCT}%` }}
                />
                {/* 물고기 그림자(실루엣) — 등급은 아직 모르니 실제 색상 대신 그림자만 보여준다 */}
                <div
                  className="absolute left-2 w-9 h-9"
                  style={{
                    bottom: `calc(${fishPct}% - 18px)`,
                    backgroundImage: `url(${RISEUP_SHEET})`,
                    backgroundSize: `${RISEUP_FRAMES * 100}% 100%`,
                    backgroundPosition: "100% 0",
                    imageRendering: "pixelated",
                  }}
                />
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
                  className="relative rounded-2xl p-6 flex flex-col items-center gap-2 w-full overflow-hidden"
                  style={{
                    border: `1.5px solid ${hex}66`,
                    background: `radial-gradient(circle at 50% 25%, ${hex}2e 0%, ${hex}0a 55%, transparent 100%)`,
                    boxShadow: `0 0 28px ${hex}3d, inset 0 0 32px ${hex}14`,
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full blur-xl"
                      style={{ background: hex, opacity: 0.5, animation: "fishGlowPulse 1.8s ease-in-out infinite" }}
                    />
                    <img
                      src={`/fishing-assets/win_${rarity}.png`}
                      alt=""
                      className="relative w-20 h-20"
                      style={{ imageRendering: "pixelated", animation: "fishIconPop 0.5s 0.05s ease-out both" }}
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
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">
              {t("fishing.milestone_heading")}
            </p>
            <div className="flex flex-col gap-1">
              {FISH_DEX_MILESTONES.map((m) => {
                const achieved = fishDexBest >= m.count;
                return (
                  <p
                    key={m.count}
                    className={`text-xs ${achieved ? "text-primary font-semibold" : "text-muted-foreground"}`}
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
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {FISH.map((fishDef) => {
            const count = ownedFish[fishDef.id] ?? 0;
            const owned = count > 0;
            return (
              <div
                key={fishDef.id}
                className={`rounded-xl border p-3 flex flex-col items-center gap-1 ${
                  owned
                    ? `${RARITY_BORDER[fishDef.rarity]} ${FISH_RARITY_BG[fishDef.rarity]}`
                    : "border-border bg-muted opacity-50"
                }`}
              >
                {owned ? (
                  <SwimIcon rarity={fishDef.rarity} size={32} />
                ) : (
                  <FishIcon className="w-7 h-7 text-muted-foreground" />
                )}
                <p
                  className={`text-[11px] font-medium text-center ${owned ? RARITY_COLOR[fishDef.rarity] : "text-muted-foreground"}`}
                >
                  {owned ? getFishName(fishDef, lang) : "???"}
                </p>
                {owned && (
                  <span className="text-[10px] text-muted-foreground">
                    x{count}
                  </span>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}

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
