import { useEffect, useRef, useState } from "react";
import { Fish as FishIcon, Waves } from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { api } from "../lib/api";
import {
  FISH,
  FISH_BY_ID,
  FISH_RARITY_BG,
  FISH_RARITY_GLOW,
  FISH_RARITY_HEX,
  getFishName,
} from "../data/fish";
import { RARITY_COLOR, RARITY_BORDER, getRarityLabel } from "../data/characters";

type Phase = "idle" | "casting" | "waiting" | "biting" | "revealing" | "missed";
type Grade = "perfect" | "good" | "miss";

const BITE_MIN_DELAY_MS = 2000;
const BITE_MAX_DELAY_MS = 5000;
const BITING_WINDOW_MS = 3200;
const SWEEP_PERIOD_MS = 1800;
const PERFECT_HALF_WIDTH = 11; // 중심 39~61%
const GOOD_HALF_WIDTH = 28; // 중심 22~78%

function triangleWave(elapsedMs: number, periodMs: number): number {
  const phase = (elapsedMs % periodMs) / periodMs;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

interface CatchResult {
  fishId: number;
  rarity: keyof typeof FISH_RARITY_BG;
  isNew: boolean;
  points: number;
  totalCaught: number;
  distinctCount: number;
  milestoneKp: number;
}

export default function FishingPage() {
  const { t, lang } = useLang();
  const { refreshRewards } = useAppData();

  const [tab, setTab] = useState<"fish" | "dex">("fish");
  const [phase, setPhase] = useState<Phase>("idle");
  const [markerPct, setMarkerPct] = useState(50);
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);
  const [catchResult, setCatchResult] = useState<CatchResult | null>(null);
  const [ownedFish, setOwnedFish] = useState<Record<number, number>>({});
  const [cooldownMs, setCooldownMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<number | null>(null);

  const bitingStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get<{ ownedFish: Record<number, number>; cooldownRemainingMs: number }>("/fishing/summary")
      .then((s) => {
        setOwnedFish(s.ownedFish);
        setCooldownMs(s.cooldownRemainingMs);
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

  const startBiting = () => {
    setPhase("biting");
    bitingStartRef.current = performance.now();
    const loop = (now: number) => {
      const elapsed = now - bitingStartRef.current;
      if (elapsed >= BITING_WINDOW_MS) {
        resolveBite(null);
        return;
      }
      setMarkerPct(triangleWave(elapsed, SWEEP_PERIOD_MS) * 100);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const handleCast = async () => {
    if (phase !== "idle" || cooldownMs > 0) return;
    setError(null);
    setPhase("casting");
    try {
      await api.post("/fishing/cast");
      setCooldownMs(3000);
      setPhase("waiting");
      const delay = BITE_MIN_DELAY_MS + Math.random() * (BITE_MAX_DELAY_MS - BITE_MIN_DELAY_MS);
      waitTimerRef.current = setTimeout(startBiting, delay);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  };

  const resolveBite = (pctAtClick: number | null) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    let grade: Grade = "miss";
    if (pctAtClick !== null) {
      const dist = Math.abs(pctAtClick - 50);
      if (dist <= PERFECT_HALF_WIDTH) grade = "perfect";
      else if (dist <= GOOD_HALF_WIDTH) grade = "good";
    }
    setLastGrade(grade);

    if (grade === "miss") {
      setPhase("missed");
      setTimeout(() => setPhase("idle"), 1200);
      return;
    }

    setPhase("revealing");
    api
      .post<CatchResult>("/fishing/catch", { grade })
      .then((result) => {
        setCatchResult(result);
        setOwnedFish((prev) => ({ ...prev, [result.fishId]: result.totalCaught }));
        void refreshRewards();
        if (result.milestoneKp > 0) {
          setMilestoneToast(result.distinctCount);
          setTimeout(() => setMilestoneToast(null), 3500);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("idle");
      });
  };

  const handleHook = () => {
    if (phase !== "biting") return;
    const elapsed = performance.now() - bitingStartRef.current;
    resolveBite(triangleWave(elapsed, SWEEP_PERIOD_MS) * 100);
  };

  const closeReveal = () => {
    setPhase("idle");
    setCatchResult(null);
  };

  const cooldownSec = Math.ceil(cooldownMs / 1000);
  const distinctCount = Object.keys(ownedFish).length;

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
              tab === tb ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {tb === "fish" ? t("fishing.tab_fish") : t("fishing.tab_dex")}
          </button>
        ))}
      </div>

      {tab === "fish" && (
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground">
            {t("fishing.dex_count")} {distinctCount}/{FISH.length}
          </p>

          {(phase === "idle" || phase === "casting") && (
            <>
              <Waves className="w-16 h-16 text-primary/60" />
              <button
                onClick={() => void handleCast()}
                disabled={phase === "casting" || cooldownMs > 0}
                className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
                  phase !== "casting" && cooldownMs <= 0
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                }`}
              >
                {cooldownMs > 0
                  ? t("fishing.cooldown").replace("{s}", String(cooldownSec))
                  : t("fishing.cast")}
              </button>
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </>
          )}

          {phase === "waiting" && (
            <>
              <Waves className="w-16 h-16 text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">{t("fishing.waiting")}</p>
            </>
          )}

          {phase === "biting" && (
            <>
              <p className="text-lg font-bold text-primary">{t("fishing.bite")}</p>
              <div className="relative w-full h-7 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-emerald-400/25"
                  style={{ left: `${50 - GOOD_HALF_WIDTH}%`, width: `${GOOD_HALF_WIDTH * 2}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-emerald-400/60"
                  style={{ left: `${50 - PERFECT_HALF_WIDTH}%`, width: `${PERFECT_HALF_WIDTH * 2}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                  style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
                />
              </div>
              <button
                onClick={handleHook}
                className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-white hover:bg-primary/90"
              >
                {t("fishing.hook_btn")}
              </button>
            </>
          )}

          {phase === "missed" && (
            <p className="text-sm text-muted-foreground py-6">{t("fishing.miss")}</p>
          )}

          {phase === "revealing" &&
            (catchResult ? (
              (() => {
                const fishDef = FISH_BY_ID.get(catchResult.fishId);
                if (!fishDef) return null;
                const rarity = fishDef.rarity;
                return (
                  <div className="flex flex-col items-center gap-2 py-2">
                    {lastGrade && (
                      <p className="text-xs font-bold text-primary uppercase">{t(`fishing.${lastGrade}`)}</p>
                    )}
                    <div
                      className={`rounded-2xl border-2 ${RARITY_BORDER[rarity]} ${FISH_RARITY_BG[rarity]} ${FISH_RARITY_GLOW[rarity]} p-6 flex flex-col items-center gap-2`}
                      style={{ minWidth: 200 }}
                    >
                      <FishIcon className="w-16 h-16" style={{ color: FISH_RARITY_HEX[rarity] }} />
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${FISH_RARITY_BG[rarity]} ${RARITY_COLOR[rarity]}`}
                      >
                        {getRarityLabel(rarity, lang)}
                      </span>
                      <p className={`text-lg font-bold ${RARITY_COLOR[rarity]}`}>{getFishName(fishDef, lang)}</p>
                      {catchResult.isNew ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full font-semibold">
                          {t("fishing.new_badge")}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">x{catchResult.totalCaught}</span>
                      )}
                      <span className="text-xs text-muted-foreground">+{catchResult.points}KP</span>
                    </div>
                    <button
                      onClick={closeReveal}
                      className="mt-2 w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                    >
                      {t("fishing.continue")}
                    </button>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground py-6">{t("fishing.reeling")}</p>
            ))}
        </div>
      )}

      {tab === "dex" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {FISH.map((fishDef) => {
            const count = ownedFish[fishDef.id] ?? 0;
            const owned = count > 0;
            return (
              <div
                key={fishDef.id}
                className={`rounded-xl border p-3 flex flex-col items-center gap-1 ${
                  owned ? `${RARITY_BORDER[fishDef.rarity]} ${FISH_RARITY_BG[fishDef.rarity]}` : "border-border bg-muted opacity-50"
                }`}
              >
                <FishIcon
                  className="w-7 h-7"
                  style={{ color: owned ? FISH_RARITY_HEX[fishDef.rarity] : undefined }}
                />
                <p className={`text-[11px] font-medium text-center ${owned ? RARITY_COLOR[fishDef.rarity] : "text-muted-foreground"}`}>
                  {owned ? getFishName(fishDef, lang) : "???"}
                </p>
                {owned && <span className="text-[10px] text-muted-foreground">x{count}</span>}
              </div>
            );
          })}
        </div>
      )}

      {milestoneToast !== null && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-primary/40 bg-card px-4 py-2.5 shadow-lg">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FishIcon className="w-4 h-4 text-primary" />
            {t("fishing.milestone_toast").replace("{n}", String(milestoneToast))}
          </p>
        </div>
      )}
    </div>
  );
}
