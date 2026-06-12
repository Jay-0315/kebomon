import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import PixelCharacter, { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName, getRarityLabel, RARITY_COLOR } from "../data/characters";
import { useLang } from "../context/LangContext";
import type { EggOpenResult, EggType } from "../context/AppDataContext";

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

const EGG_TINT_COLORS: Record<EggType, { body: string; hi: string; lo: string }> = {
  normal: { body: "#ede8dd", hi: "#f8f4ee", lo: "#c4b49a" },
  big:    { body: "#7dd3fc", hi: "#dbeafe", lo: "#1d4ed8" },
  golden: { body: "#fbbf24", hi: "#fef9c3", lo: "#b45309" },
};

function EggSlot({
  idx, eggType, result, isOpen, onOpen,
}: {
  idx: number;
  eggType: EggType;
  result: EggOpenResult;
  isOpen: boolean;
  onOpen: (i: number) => void;
}) {
  const { lang } = useLang();
  const C = EGG_TINT_COLORS[eggType];
  const char = charById(result.characterId);

  if (isOpen) {
    return (
      <div
        className="flex flex-col items-center gap-1"
        style={{ animation: "eggSlotReveal 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        <PixelSprite
          type={char.type}
          colors={char.colors}
          characterId={char.id}
          rarity={char.rarity}
          size={56}
        />
        <p className={`text-[10px] font-bold text-center leading-tight ${RARITY_COLOR[char.rarity]}`} style={{ maxWidth: 64 }}>
          {getCharName(char, lang)}
        </p>
        {result.isDuplicate ? (
          <span className="text-[9px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full">+{result.points}P</span>
        ) : (
          <span className="text-[9px] text-green-400 bg-green-400/15 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onOpen(idx)}
      className="flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      style={{ width: 64 }}
    >
      <svg width="40" height="50" viewBox="0 0 16 20" style={{ imageRendering: "pixelated", display: "block", margin: "auto" }}>
        <rect x="5"  y="0"  width="6"  height="2" fill={C.body} />
        <rect x="3"  y="2"  width="10" height="2" fill={C.body} />
        <rect x="2"  y="4"  width="12" height="2" fill={C.body} />
        <rect x="1"  y="6"  width="14" height="2" fill={C.body} />
        <rect x="0"  y="8"  width="16" height="4" fill={C.body} />
        <rect x="1"  y="12" width="14" height="2" fill={C.body} />
        <rect x="2"  y="14" width="12" height="2" fill={C.body} />
        <rect x="4"  y="16" width="8"  height="2" fill={C.body} />
        <rect x="6"  y="18" width="4"  height="2" fill={C.body} />
        <rect x="4"  y="2"  width="3"  height="2" fill={C.hi} />
        <rect x="3"  y="4"  width="2"  height="2" fill={C.hi} />
        <rect x="2"  y="6"  width="2"  height="2" fill={C.hi} />
        <rect x="4"  y="14" width="4"  height="2" fill={C.lo} />
        <text x="8" y="11" textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="white" fontWeight="bold">?</text>
      </svg>
    </button>
  );
}

export function EggBatchModal({
  eggType,
  results,
  onClose,
}: {
  eggType: EggType;
  results: EggOpenResult[];
  onClose: () => void;
}) {
  const { t } = useLang();
  const [openedSet, setOpenedSet] = useState<Set<number>>(new Set());

  const allOpened = openedSet.size === results.length;

  const openOne = (idx: number) => {
    if (openedSet.has(idx)) return;
    setOpenedSet((prev) => new Set([...prev, idx]));
  };

  const openNext = () => {
    for (let i = 0; i < results.length; i++) {
      if (!openedSet.has(i)) { openOne(i); break; }
    }
  };

  const openAll = () => {
    setOpenedSet(new Set(results.map((_, i) => i)));
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-slate-900/97 to-black/98">
      <style>{`@keyframes eggSlotReveal { 0%{transform:scale(0) rotate(-10deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }`}</style>

      <p className="text-white/80 text-sm font-semibold tracking-wide">
        {allOpened ? t("egg.batch_result") : t("egg.batch_hint")}
      </p>

      <div className="grid grid-cols-5 gap-4">
        {results.map((r, idx) => (
          <EggSlot key={idx} idx={idx} eggType={eggType} result={r} isOpen={openedSet.has(idx)} onOpen={openOne} />
        ))}
      </div>

      <div className="flex gap-2 w-full max-w-xs">
        {allOpened ? (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary/80 text-white font-bold hover:bg-primary transition-colors shadow-lg"
          >
            {t("kebomon.gacha_confirm")}
          </button>
        ) : (
          <>
            <button
              onClick={openNext}
              className="flex-1 py-3 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors"
            >
              {t("egg.batch_open_one")}
            </button>
            <button
              onClick={openAll}
              className="flex-1 py-3 rounded-xl bg-primary/70 text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md"
            >
              {t("egg.batch_open_all")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function EggHatchModal({
  eggType,
  result,
  onClose,
}: {
  eggType: EggType;
  result: EggOpenResult;
  onClose: () => void;
}) {
  const { t, lang } = useLang();
  const [phase, setPhase] = useState<"hatch" | "reveal">("hatch");

  const EGG_TINT: Record<EggType, { shell: string; spot: string; labelKey: "egg.normal" | "egg.big" | "egg.golden" }> = {
    normal: { shell: "#CFD8DC", spot: "#90A4AE", labelKey: "egg.normal" },
    big: { shell: "#81D4FA", spot: "#0288D1", labelKey: "egg.big" },
    golden: { shell: "#FFD54F", spot: "#FFA000", labelKey: "egg.golden" },
  };

  const tint = EGG_TINT[eggType];
  const def = charById(result.characterId);

  useEffect(() => {
    const timer = setTimeout(() => setPhase("reveal"), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
      onClick={phase === "reveal" ? onClose : undefined}
    >
      <style>{`
        @keyframes egg-wobble { 0%,100%{transform:rotate(-9deg)} 50%{transform:rotate(9deg)} }
        @keyframes egg-pop { 0%{transform:scale(0)} 60%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes hatch-ray { from{opacity:0;transform:scale(0.5) rotate(0)} to{opacity:0.7;transform:scale(1) rotate(20deg)} }
      `}</style>

      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "hatch" ? (
          <div className="flex flex-col items-center py-8">
            <p className="mb-6 text-sm font-semibold text-primary">{t("egg.hatching")}</p>
            <div className="relative">
              <div
                className="absolute inset-0 -z-10"
                style={{
                  background: `radial-gradient(circle, ${tint.shell}aa, transparent 70%)`,
                  animation: "hatch-ray 1.2s ease-in-out infinite alternate",
                }}
              />
              <div style={{ animation: "egg-wobble 0.5s ease-in-out infinite", transformOrigin: "50% 90%" }}>
                <svg width="120" height="150" viewBox="0 0 120 150" style={{ imageRendering: "pixelated" }}>
                  <ellipse cx="60" cy="84" rx="50" ry="60" fill={tint.shell} />
                  <ellipse cx="45" cy="52" rx="16" ry="11" fill="#FFFFFF" opacity={0.45} />
                  <circle cx="40" cy="72" r="9" fill={tint.spot} />
                  <circle cx="80" cy="98" r="11" fill={tint.spot} />
                  <circle cx="56" cy="116" r="7" fill={tint.spot} />
                  <polyline points="38,86 55,76 50,92 66,82 62,100" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity={0.75} />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-1 flex items-center justify-center gap-1 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> {t(tint.labelKey)}{t("egg.hatch_suffix")}
            </div>
            <div className="flex justify-center py-2" style={{ animation: "egg-pop 0.5s ease-out" }}>
              <PixelCharacter characterId={result.characterId} size={120} />
            </div>
            <p className="text-lg font-extrabold">{getCharName(def, lang)}</p>
            <p className={`text-sm font-bold ${RARITY_COLOR[def.rarity]}`}>{getRarityLabel(def.rarity, lang)}</p>
            {result.isDuplicate ? (
              <p className="mt-2 inline-block rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                {t("egg.duplicate_prefix")}{result.points}{t("egg.duplicate_suffix")}
              </p>
            ) : (
              <p className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {t("egg.new_char")}
              </p>
            )}
            <button onClick={onClose} className="mt-4 w-full rounded-full bg-primary py-2 font-semibold text-primary-foreground">
              {t("kebomon.gacha_confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
