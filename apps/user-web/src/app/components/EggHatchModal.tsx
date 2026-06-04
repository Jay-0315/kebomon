import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import PixelCharacter from "./PixelCharacter";
import { CHARACTERS, getCharName, getRarityLabel, RARITY_COLOR } from "../data/characters";
import { useLang } from "../context/LangContext";
import type { EggOpenResult, EggType } from "../context/AppDataContext";

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

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
              {t("kabemon.gacha_confirm")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
