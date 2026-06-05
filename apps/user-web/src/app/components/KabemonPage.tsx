import React, { useState } from "react";
import {
  Trophy, Lock, BookOpen, User, Sparkles, Shield, Gamepad2,
  CheckCircle2, Flame, Star, Zap, Gift, RotateCcw, ChevronDown, Egg,
} from "lucide-react";
import { useAppData, type GachaResult, type EggType, type EggOpenResult } from "../context/AppDataContext";
import EggHatchModal from "./EggHatchModal";
import { useLang } from "../context/LangContext";
import { type TranslationKey } from "../lib/i18n";
import PixelCharacter, { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS, ACHIEVEMENTS, ACHIEVEMENT_BY_CHARACTER,
  GACHA_COST_SINGLE, GACHA_COST_TEN, RARITY_DUPLICATE_POINTS, GACHA_RATES,
  RARITY_COLOR, RARITY_BORDER,
  getCharName, getCharDesc, getRarityLabel, getAchLabel,
} from "../data/characters";
import type { CharacterDef, CharacterRarity, AchievementType } from "../data/characters";

const CHAR_DISPLAY_NUM = new Map(CHARACTERS.map((c, i) => [c.id, i + 1]));
const charNum = (id: number) => String(CHAR_DISPLAY_NUM.get(id) ?? id).padStart(3, "0");

type TFunc = (key: TranslationKey) => string;

const CAPSULE_MYSTERY_COLORS = [
  "#7c3aed","#4f46e5","#2563eb","#0891b2",
  "#059669","#d97706","#dc2626","#db2777","#9333ea","#c026d3",
];

const RARITY_HEX: Record<CharacterRarity, string> = {
  common: "#9ca3af", uncommon: "#4ade80", rare: "#60a5fa",
  epic: "#c084fc", legendary: "#fbbf24", mythic: "#f472b6",
};

// 에픽+ 레어리티 휘광: epic=보라, legendary=주황, mythic=노란
const RARITY_REVEAL: Partial<Record<CharacterRarity, { glow: string; bg: string }>> = {
  epic:      { glow: "#a855f7", bg: "radial-gradient(circle at 50% 45%, #a855f750 0%, transparent 68%)" },
  legendary: { glow: "#f97316", bg: "radial-gradient(circle at 50% 45%, #f9731650 0%, transparent 68%)" },
  mythic:    { glow: "#eab308", bg: "radial-gradient(circle at 50% 45%, #eab30850 0%, transparent 68%)" },
};

const RARITY_BG: Record<CharacterRarity, string> = {
  common:    "bg-gray-500/10",
  uncommon:  "bg-green-500/10",
  rare:      "bg-blue-500/10",
  epic:      "bg-purple-500/10",
  legendary: "bg-amber-500/10",
  mythic:    "bg-pink-500/10",
};

const RARITY_GLOW: Record<CharacterRarity, string> = {
  common:    "shadow-gray-400/20",
  uncommon:  "shadow-green-400/30",
  rare:      "shadow-blue-400/30",
  epic:      "shadow-purple-400/40",
  legendary: "shadow-amber-400/50",
  mythic:    "shadow-pink-400/60",
};

function getMissions(t: TFunc) {
  return [
    { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,  label: t("mission.attendance"), reward: "50~150P", desc: t("mission.attendance_desc") },
    { icon: <Zap          className="w-4 h-4 text-blue-400"   />, label: t("mission.write"),      reward: "+50P",   desc: t("mission.write_desc") },
    { icon: <Sparkles     className="w-4 h-4 text-pink-400"   />, label: t("mission.streak"),     reward: "+20P",   desc: t("mission.streak_desc") },
  ];
}

type Tab = "character" | "collection" | "gacha" | "achievement";
type Filter = "all" | CharacterRarity;

// ─── Pixel Egg SVG ────────────────────────────────────────────────────────
function PixelEggSVG({ type, size = 48 }: { type: "normal" | "big" | "golden"; size?: number }) {
  const C = {
    normal: { body: "#ede8dd", hi: "#f8f4ee", lo: "#c4b49a" },
    big:    { body: "#7dd3fc", hi: "#dbeafe", lo: "#1d4ed8", spot: "#0369a1" },
    golden: { body: "#fbbf24", hi: "#fef9c3", lo: "#b45309" },
  }[type] as { body: string; hi: string; lo: string; spot?: string };
  return (
    <svg width={size} height={size} viewBox="0 0 16 20" style={{ imageRendering: "pixelated", display: "block", margin: "auto" }}>
      <rect x="5"  y="0"  width="6"  height="2" fill={C.body} />
      <rect x="3"  y="2"  width="10" height="2" fill={C.body} />
      <rect x="2"  y="4"  width="12" height="2" fill={C.body} />
      <rect x="1"  y="6"  width="14" height="2" fill={C.body} />
      <rect x="0"  y="8"  width="16" height="4" fill={C.body} />
      <rect x="1"  y="12" width="14" height="2" fill={C.body} />
      <rect x="2"  y="14" width="12" height="2" fill={C.body} />
      <rect x="4"  y="16" width="8"  height="2" fill={C.body} />
      <rect x="6"  y="18" width="4"  height="2" fill={C.body} />
      {/* highlight */}
      <rect x="4"  y="2"  width="3"  height="2" fill={C.hi} />
      <rect x="3"  y="4"  width="2"  height="2" fill={C.hi} />
      <rect x="2"  y="6"  width="2"  height="2" fill={C.hi} />
      {/* shadow */}
      <rect x="4"  y="14" width="4"  height="2" fill={C.lo} />
      <rect x="6"  y="16" width="3"  height="2" fill={C.lo} />
      {type === "big" && <>
        <rect x="9"  y="6"  width="2" height="2" fill={C.spot} />
        <rect x="11" y="10" width="2" height="2" fill={C.spot} />
      </>}
      {type === "golden" && <>
        <rect x="11" y="2" width="2" height="1" fill="#fff" />
        <rect x="12" y="1" width="1" height="3" fill="#fff" />
      </>}
    </svg>
  );
}

// ─── Pixel Gacha Ball SVG ─────────────────────────────────────────────────
// viewBox 40×40 (정사각형) → 계단식 픽셀 원, 위 절반 컬러/아래 절반 흰색
function PixelCapsuleSVG({ color, size = 80 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40"
      style={{ imageRendering: "pixelated", display: "block" }}>

      {/* ── 위 절반 (컬러) ── */}
      <rect x="14" y="0"  width="12" height="2"  fill={color} />
      <rect x="10" y="2"  width="20" height="2"  fill={color} />
      <rect x="6"  y="4"  width="28" height="2"  fill={color} />
      <rect x="4"  y="6"  width="32" height="2"  fill={color} />
      <rect x="2"  y="8"  width="36" height="2"  fill={color} />
      <rect x="0"  y="10" width="40" height="9"  fill={color} />

      {/* ── 아래 절반 (흰색/회색) ── */}
      <rect x="0"  y="21" width="40" height="9"  fill="#f2f2f2" />
      <rect x="2"  y="30" width="36" height="2"  fill="#ebebeb" />
      <rect x="4"  y="32" width="32" height="2"  fill="#e2e2e2" />
      <rect x="6"  y="34" width="28" height="2"  fill="#d8d8d8" />
      <rect x="10" y="36" width="20" height="2"  fill="#cecece" />
      <rect x="14" y="38" width="12" height="2"  fill="#c4c4c4" />

      {/* ── 적도 심(seam) ── */}
      <rect x="0"  y="19" width="40" height="2"  fill="#111" fillOpacity="0.28" />

      {/* ── 왼쪽 상단 하이라이트 (구체 광택) ── */}
      <rect x="12" y="2"  width="8"  height="2"  fill="#fff" fillOpacity="0.65" />
      <rect x="8"  y="4"  width="10" height="2"  fill="#fff" fillOpacity="0.48" />
      <rect x="6"  y="6"  width="10" height="2"  fill="#fff" fillOpacity="0.34" />
      <rect x="4"  y="8"  width="8"  height="4"  fill="#fff" fillOpacity="0.24" />
      <rect x="4"  y="12" width="6"  height="4"  fill="#fff" fillOpacity="0.14" />

      {/* ── 아래쪽 오른편 반사광 ── */}
      <rect x="24" y="28" width="8"  height="2"  fill="#fff" fillOpacity="0.22" />

      {/* ── "?" 마크 ── */}
      <rect x="15" y="4"  width="10" height="2"  fill="#fff" fillOpacity="0.88" />
      <rect x="21" y="6"  width="4"  height="3"  fill="#fff" fillOpacity="0.88" />
      <rect x="15" y="9"  width="10" height="2"  fill="#fff" fillOpacity="0.88" />
      <rect x="17" y="11" width="4"  height="4"  fill="#fff" fillOpacity="0.88" />
      <rect x="17" y="16" width="4"  height="2"  fill="#fff" fillOpacity="0.88" />
    </svg>
  );
}

// ─── Individual Capsule Slot ──────────────────────────────────────────────
function CapsuleSlot({
  idx, r, isOpen, isPopping, size, onOpen,
}: {
  idx: number;
  r: GachaResult["results"][0];
  isOpen: boolean;
  isPopping: boolean;
  size: number;
  onOpen: (idx: number) => void;
}) {
  const { lang } = useLang();
  const char = CHARACTERS.find((c) => c.id === r.characterId);
  const mColor = CAPSULE_MYSTERY_COLORS[idx % CAPSULE_MYSTERY_COLORS.length];
  // 구체는 정사각형
  const capW = size;
  const spriteSize = Math.round(size * 0.6);
  const reveal = char ? RARITY_REVEAL[char.rarity] : undefined;

  return (
    <div
      style={{ width: capW, height: capW, flexShrink: 0, position: "relative" }}
      className="flex items-center justify-center"
    >
      {isOpen && char ? (
        /* ── 개봉 후: 캐릭터 등장 ── */
        <div
          className="flex flex-col items-center gap-0.5 w-full h-full justify-center relative"
          style={{ animation: "charBurst 0.42s ease-out both" }}
        >
          {/* 에픽+ 휘광 레이어 */}
          {reveal && !r.isDuplicate && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: reveal.bg,
                animation: "revealGlow 1s ease-in-out 5 alternate",
                animationDelay: "0.4s",
              }}
            />
          )}
          <div
            className={`relative p-1 rounded-lg ${RARITY_BG[char.rarity]} ${r.isDuplicate ? "grayscale opacity-50" : ""}`}
            style={
              reveal && !r.isDuplicate
                ? { boxShadow: `0 0 14px 4px ${reveal.glow}80, 0 0 5px 2px ${reveal.glow}50` }
                : undefined
            }
          >
            <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={spriteSize} />
          </div>
          <p className={`text-[8px] text-center font-semibold leading-tight max-w-full truncate px-0.5 ${
            r.isDuplicate ? "text-white/50" : RARITY_COLOR[char.rarity]
          }`}>
            {r.isDuplicate ? `+${r.bonusPoints}P` : getCharName(char, lang)}
          </p>
        </div>
      ) : (
        /* ── 미개봉: 캡슐 표시 ── */
        <div
          className="cursor-pointer select-none"
          onClick={() => !isOpen && onOpen(idx)}
          style={{
            animation: isPopping
              ? "capsulePop 0.35s ease-in forwards"
              : `capsuleFloat 2.2s ease-in-out ${idx * 0.13}s infinite`,
          }}
        >
          <PixelCapsuleSVG color={mColor} size={size} />
        </div>
      )}
    </div>
  );
}

// ─── Gacha Capsule Modal ──────────────────────────────────────────────────
function GachaCapsuleModal({
  result,
  onClose,
  t,
}: {
  result: GachaResult;
  onClose: () => void;
  t: TFunc;
}) {
  const [openedSet, setOpenedSet] = useState<Set<number>>(new Set());
  const [poppingIdx, setPoppingIdx] = useState<number | null>(null);

  const isSingle = result.results.length === 1;
  const allOpened = openedSet.size === result.results.length;
  const capsuleSize = isSingle ? 120 : 60;

  const openCapsule = (idx: number) => {
    if (openedSet.has(idx) || poppingIdx !== null) return;
    setPoppingIdx(idx);
    setTimeout(() => {
      setOpenedSet((prev) => new Set([...prev, idx]));
      setPoppingIdx(null);
    }, 330);
  };

  const openNext = () => {
    if (poppingIdx !== null) return;
    for (let i = 0; i < result.results.length; i++) {
      if (!openedSet.has(i)) { openCapsule(i); break; }
    }
  };

  const openAll = () => {
    setPoppingIdx(null);
    setOpenedSet(new Set(result.results.map((_, i) => i)));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-slate-900/96 to-black/98">
      {/* Skip */}
      {!allOpened && (
        <button
          onClick={openAll}
          className="absolute top-5 right-5 text-white/60 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
        >
          {t("kabemon.gacha_skip")} ⏭
        </button>
      )}

      {/* Hint / title */}
      <p className="text-white/80 text-sm font-semibold tracking-wide">
        {allOpened ? t("kabemon.gacha_result_title") : t("kabemon.gacha_capsule_hint")}
      </p>

      {/* Capsules */}
      {isSingle ? (
        <div className="flex items-center justify-center min-h-[160px]">
          <CapsuleSlot
            idx={0} r={result.results[0]}
            isOpen={openedSet.has(0)} isPopping={poppingIdx === 0}
            size={capsuleSize} onOpen={openCapsule}
          />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {result.results.map((_, idx) => (
            <CapsuleSlot
              key={idx} idx={idx} r={result.results[idx]}
              isOpen={openedSet.has(idx)} isPopping={poppingIdx === idx}
              size={capsuleSize} onOpen={openCapsule}
            />
          ))}
        </div>
      )}

      {/* Bonus points */}
      {allOpened && result.bonusPoints > 0 && (
        <p className="text-primary font-semibold text-sm">
          +{result.bonusPoints}P {t("kabemon.gacha_dupe_note")}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2 w-full max-w-xs">
        {allOpened ? (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary/80 text-white font-bold hover:bg-primary transition-colors shadow-lg"
          >
            {t("kabemon.gacha_confirm")}
          </button>
        ) : isSingle ? (
          <p className="w-full text-center text-white/50 text-xs py-2">
            {t("kabemon.gacha_tap_hint")}
          </p>
        ) : (
          <>
            <button
              onClick={openNext}
              disabled={poppingIdx !== null}
              className="flex-1 py-3 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors disabled:opacity-40"
            >
              {t("kabemon.gacha_open_one")}
            </button>
            <button
              onClick={openAll}
              className="flex-1 py-3 rounded-xl bg-primary/70 text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md"
            >
              {t("kabemon.gacha_open_all")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function KabemonPage() {
  const { rewardSummary, equipCharacter, checkAchievements, performGacha, openEgg, refreshRewards } = useAppData();
  const { t, lang } = useLang();
  const [opening, setOpening] = useState<EggType | null>(null);
  const [eggResult, setEggResult] = useState<EggOpenResult | null>(null);
  const eggCounts: Record<EggType, number> = {
    normal: rewardSummary.normalEggs,
    big: rewardSummary.bigEggs,
    golden: rewardSummary.goldenEggs,
  };
  const handleOpenEgg = async (type: EggType) => {
    if (eggCounts[type] <= 0 || opening) return;
    setOpening(type);
    try {
      setEggResult(await openEgg(type));
    } catch {
      /* ignore */
    } finally {
      setOpening(null);
    }
  };
  const [tab, setTab] = useState<Tab>("character");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [checkingAchievements, setCheckingAchievements] = useState(false);
  const [newAchievements, setNewAchievements] = useState<number[]>([]);

  const { missionPoints, attendanceDays, streakDays, equippedCharacterId, ownedCharacterIds, gachaPityCount, legendaryPityCount } = rewardSummary;

  const ownedSet = new Set(ownedCharacterIds);

  const equippedChar = equippedCharacterId
    ? (CHARACTERS.find((c) => c.id === equippedCharacterId) ?? CHARACTERS[0])
    : CHARACTERS.find((c) => ownedSet.has(c.id)) ?? CHARACTERS[0];

  const handleEquip = async (characterId: number) => {
    setEquipping(true);
    try {
      await equipCharacter(characterId);
      setSelected(null);
    } finally {
      setEquipping(false);
    }
  };

  const handleGacha = async (count: 1 | 10) => {
    setPulling(true);
    try {
      const result = await performGacha(count);
      setGachaResult(result);
    } finally {
      setPulling(false);
    }
  };

  const handleCheckAchievements = async () => {
    setCheckingAchievements(true);
    try {
      const unlocked = await checkAchievements();
      if (unlocked.length > 0) {
        await refreshRewards();
      }
      setNewAchievements(unlocked);
    } finally {
      setCheckingAchievements(false);
    }
  };

  const rarities: Filter[] = ["all", "common", "uncommon", "rare", "epic", "legendary", "mythic"];
  const RARITY_ORDER: Record<CharacterRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
  const filtered = (filter === "all" ? CHARACTERS : CHARACTERS.filter((c) => c.rarity === filter))
    .slice()
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
  const selectedChar = selected !== null ? CHARACTERS.find((c) => c.id === selected) : null;

  const canAffordSingle = missionPoints >= GACHA_COST_SINGLE;
  const canAffordTen = missionPoints >= GACHA_COST_TEN;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-primary" />
              {t("kabemon.title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ownedCharacterIds.length}/{CHARACTERS.length} {t("kabemon.collection_count")} · {missionPoints}P
            </p>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {(["character", "collection", "gacha", "achievement"] as Tab[]).map((t_) => {
            const icons: Record<Tab, React.ReactNode> = {
              character: <User className="w-3.5 h-3.5" />,
              collection: <BookOpen className="w-3.5 h-3.5" />,
              gacha: <Sparkles className="w-3.5 h-3.5" />,
              achievement: <Trophy className="w-3.5 h-3.5" />,
            };
            const labels: Record<Tab, string> = { character: t("kabemon.my_character"), collection: t("kabemon.pokedex"), gacha: t("kabemon.gacha_tab"), achievement: t("kabemon.achievement_tab") };
            return (
              <button
                key={t_}
                onClick={() => setTab(t_)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  tab === t_ ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {icons[t_]}
                {labels[t_]}
              </button>
            );
          })}
        </div>

        {/* ══════════════ CHARACTER TAB ══════════════ */}
        {tab === "character" && (
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            {/* ── Hero card ── */}
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              <div className={`bg-card rounded-2xl border-2 ${RARITY_BORDER[equippedChar.rarity]} p-6 shadow-lg ${RARITY_GLOW[equippedChar.rarity]}`}>
                <div className="flex flex-col items-center gap-4">
                  <div className={`rounded-2xl ${RARITY_BG[equippedChar.rarity]} relative overflow-hidden`} style={{ width: "100%", minHeight: 220 }}>
                    <div className={`absolute inset-0 rounded-2xl blur-md opacity-30 ${RARITY_BG[equippedChar.rarity]}`} style={{ transform: "scale(1.1)" }} />
                    <div className="relative z-10 flex items-center justify-center py-6">
                      <PixelCharacter characterId={equippedChar.id} size={140} float />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${RARITY_BG[equippedChar.rarity]} ${RARITY_COLOR[equippedChar.rarity]}`}>
                        {getRarityLabel(equippedChar.rarity, lang)}
                      </span>
                      <span className="text-xs text-muted-foreground">#{charNum(equippedChar.id)}</span>
                    </div>
                    <p className={`text-2xl font-bold ${RARITY_COLOR[equippedChar.rarity]}`}>{getCharName(equippedChar, lang)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{getCharDesc(equippedChar, lang)}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-2">{t("kabemon.mouse_hint")}</p>
                  </div>
                </div>
              </div>

              {/* Stats + 출석판 */}
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Trophy className="w-4 h-4 text-primary" />
                  {t("kabemon.stats")}
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: t("kabemon.attendance"),     value: attendanceDays, unit: t("kabemon.days") },
                    { label: t("kabemon.mission_points"), value: missionPoints,  unit: "P" },
                    { label: t("kabemon.streak"),         value: streakDays,     unit: t("kabemon.days") },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                      <p className="text-2xl font-bold text-primary/80">{value}</p>
                      <p className="text-[10px] text-muted-foreground">{unit}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setTab("achievement")}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-all"
                >
                  <Trophy className="w-4 h-4 text-primary" />
                  {t("kabemon.achievement_check_btn")}
                </button>
              </div>
            </div>

            {/* ── Mission guide ── */}
            <div className="lg:w-64 lg:shrink-0 bg-card rounded-xl border border-border p-5">
              <h3 className="mb-3 text-sm font-semibold">{t("kabemon.mission_guide")}</h3>
              <div className="space-y-2">
                {getMissions(t).map(({ icon, label, reward, desc }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <span className="text-sm font-bold text-primary shrink-0">{reward}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 text-center">{t("kabemon.mission_footer")}</p>
            </div>
          </div>
        )}

        {/* ══════════════ COLLECTION TAB ══════════════ */}
        {tab === "collection" && (
          <CollectionTab
            ownedSet={ownedSet}
            equippedCharacterId={equippedCharacterId}
            selected={selected}
            selectedChar={selectedChar}
            filter={filter}
            filtered={filtered}
            rarities={rarities}
            equipping={equipping}
            onSelectFilter={setFilter}
            onSelectChar={(id) => setSelected(selected === id ? null : id)}
            onEquip={(id) => void handleEquip(id)}
            t={t}
          />
        )}

        {/* ══════════════ GACHA TAB ══════════════ */}
        {tab === "gacha" && (
          <>
            {/* ── 알 부화기 ── */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Egg className="h-5 w-5 text-primary" />
                <h3 className="font-bold">알 부화기</h3>
                <span className="text-xs text-muted-foreground">미션 레이드 보상으로 획득</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { type: "normal", name: "일반 알", range: "커먼~레어", tint: "from-gray-200 to-gray-300" },
                  { type: "big", name: "큰 알", range: "커먼~에픽", tint: "from-sky-200 to-blue-300" },
                  { type: "golden", name: "황금 알", range: "커먼~레전더리", tint: "from-amber-200 to-yellow-400" },
                ] as { type: EggType; name: string; range: string; tint: string }[]).map((e) => {
                  const cnt = eggCounts[e.type];
                  return (
                    <div key={e.type} className={`rounded-xl bg-gradient-to-b ${e.tint} p-3 text-center`}>
                      <PixelEggSVG type={e.type} size={48} />
                      <div className="mt-1 text-xs font-bold text-gray-800">{e.name}</div>
                      <div className="text-[10px] text-gray-700">{e.range}</div>
                      <div className="text-lg font-extrabold text-gray-900">×{cnt}</div>
                      <button
                        onClick={() => handleOpenEgg(e.type)}
                        disabled={cnt <= 0 || !!opening}
                        className={`mt-1 w-full rounded-full py-1 text-[11px] font-bold transition-all ${
                          cnt > 0 && !opening ? "bg-gray-900/85 text-white hover:bg-gray-900" : "cursor-not-allowed bg-gray-400/50 text-gray-600"
                        }`}
                      >
                        {opening === e.type ? "부화 중…" : "부화"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <GachaTab
              missionPoints={missionPoints}
              gachaPityCount={gachaPityCount}
              legendaryPityCount={legendaryPityCount}
              canAffordSingle={canAffordSingle}
              canAffordTen={canAffordTen}
              pulling={pulling}
              onPull={handleGacha}
              t={t}
            />
          </>
        )}

        {/* ══════════════ ACHIEVEMENT TAB ══════════════ */}
        {tab === "achievement" && (
          <AchievementTab
            ownedSet={ownedSet}
            attendanceDays={attendanceDays}
            streakDays={streakDays}
            totalPointsUsed={rewardSummary.totalPointsUsed}
            checking={checkingAchievements}
            onCheck={() => void handleCheckAchievements()}
            t={t}
          />
        )}

      </div>

      {/* ── 알 부화 연출 ── */}
      {eggResult && (
        <EggHatchModal eggType={eggResult.eggType} result={eggResult} onClose={() => setEggResult(null)} />
      )}

      {/* ── Achievement reveal modal ── */}
      {newAchievements.length > 0 && (
        <AchievementRevealModal
          newlyUnlocked={newAchievements}
          onClose={() => setNewAchievements([])}
          t={t}
        />
      )}

      {/* ── Gacha result modal ── */}
      {gachaResult && (
        <GachaCapsuleModal result={gachaResult} onClose={() => setGachaResult(null)} t={t} />
      )}
    </>
  );
}

// ─── Collection Tab ───────────────────────────────────────────────────────
function CollectionTab({
  ownedSet, equippedCharacterId, selected, selectedChar, filter, filtered, rarities,
  equipping, onSelectFilter, onSelectChar, onEquip, t,
}: {
  ownedSet: Set<number>;
  equippedCharacterId: number | null;
  selected: number | null;
  selectedChar: CharacterDef | null | undefined;
  filter: Filter;
  filtered: CharacterDef[];
  rarities: Filter[];
  equipping: boolean;
  onSelectFilter: (f: Filter) => void;
  onSelectChar: (id: number) => void;
  onEquip: (id: number) => void;
  t: TFunc;
}) {
  const { lang } = useLang();
  const topRef = React.useRef<HTMLDivElement>(null);

  // 보유 캐릭터 상단 정렬
  const sorted = [...filtered].sort((a, b) => {
    const ao = ownedSet.has(a.id) ? 0 : 1;
    const bo = ownedSet.has(b.id) ? 0 : 1;
    return ao - bo;
  });

  const handleSelect = (id: number) => {
    onSelectChar(id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <div ref={topRef} />
      {/* Selected char detail */}
      {selectedChar && (
        <CharacterDetail
          char={selectedChar}
          isOwned={ownedSet.has(selectedChar.id)}
          isEquipped={selectedChar.id === equippedCharacterId}
          equipping={equipping}
          onEquip={onEquip}
          t={t}
        />
      )}

      {/* Rarity filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {rarities.map((r) => (
          <button
            key={r}
            onClick={() => onSelectFilter(r)}
            className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              filter === r
                ? "bg-primary/80 text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {r === "all" ? (lang === "ja" ? "全て" : "전체") : getRarityLabel(r as CharacterRarity, lang)}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.filter((c) => ownedSet.has(c.id)).length}/{filtered.length} {t("kabemon.collection_count")}
      </p>

      {/* Grid — 보유 캐릭터 상단 정렬 */}
      <div className="grid grid-cols-5 gap-2">
        {sorted.map((char) => {
          const isOwned = ownedSet.has(char.id);
          const isEquipped = char.id === equippedCharacterId;
          const isSelected = char.id === selected;

          return (
            <button
              key={char.id}
              onClick={() => handleSelect(char.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                isEquipped
                  ? `${RARITY_BORDER[char.rarity]} bg-primary/10 ring-1 ring-primary/40`
                  : isSelected
                  ? "border-foreground/40 bg-muted/70"
                  : "border-border bg-muted hover:bg-muted/70"
              }`}
            >
              <div className="relative">
                {isOwned ? (
                  <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={40} />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                )}
                {isEquipped && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                    <Shield className="w-2 h-2 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className={`text-[9px] leading-tight text-center truncate w-full ${
                isOwned ? RARITY_COLOR[char.rarity] : "text-muted-foreground/60"
              }`}>
                {isOwned ? getCharName(char, lang) : "???"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Character Detail Panel ───────────────────────────────────────────────
function CharacterDetail({
  char, isOwned, isEquipped, equipping, onEquip, t,
}: {
  char: CharacterDef;
  isOwned: boolean;
  isEquipped: boolean;
  equipping: boolean;
  onEquip: (id: number) => void;
  t: TFunc;
}) {
  const { lang } = useLang();
  const ach = ACHIEVEMENT_BY_CHARACTER.get(char.id);
  const isHidden = char.hiddenAchievement && !isOwned;

  return (
    <div className={`bg-card rounded-xl border ${RARITY_BORDER[char.rarity]} p-4`}>
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl ${RARITY_BG[char.rarity]} ${!isOwned ? "opacity-70" : ""}`}>
          {isOwned ? (
            <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={56} float={isOwned} />
          ) : (
            <div className="w-14 h-14 flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${RARITY_BG[char.rarity]} ${RARITY_COLOR[char.rarity]}`}>
              {getRarityLabel(char.rarity, lang)}
            </span>
            <span className="text-xs text-muted-foreground">#{charNum(char.id)}</span>
          </div>
          <p className="font-bold">{isOwned ? getCharName(char, lang) : "???"}</p>
          <p className="text-xs text-muted-foreground">
            {isHidden
              ? t("kabemon.obtain_hidden")
              : ach
              ? getAchLabel(ach, lang)
              : char.obtainMethod === "starter"
              ? t("kabemon.obtain_starter")
              : t("kabemon.obtain_gacha")}
          </p>
          {isOwned && (
            <p className="text-xs text-muted-foreground mt-0.5">{getCharDesc(char, lang)}</p>
          )}
        </div>
        <div className="shrink-0">
          {!isOwned ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : isEquipped ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1.5 rounded-lg">
              <Shield className="w-3.5 h-3.5" />
              {t("kabemon.equipped")}
            </span>
          ) : (
            <button
              onClick={() => onEquip(char.id)}
              disabled={equipping}
              className="flex items-center gap-1 text-xs font-semibold bg-primary/80 text-primary-foreground px-2.5 py-1.5 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5" />
              {equipping ? "..." : t("kabemon.equip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Gacha Tab ────────────────────────────────────────────────────────────
function GachaTab({
  missionPoints, gachaPityCount, legendaryPityCount, canAffordSingle, canAffordTen, pulling, onPull, t,
}: {
  missionPoints: number;
  gachaPityCount: number;
  legendaryPityCount: number;
  canAffordSingle: boolean;
  canAffordTen: boolean;
  pulling: boolean;
  onPull: (count: 1 | 10) => void;
  t: TFunc;
}) {
  const { lang } = useLang();
  const pityLeft = Math.max(0, 10 - (gachaPityCount % 10));
  const ceilingLeft = Math.max(0, 80 - legendaryPityCount);

  return (
    <div className="space-y-4">
      {/* Points + pity display */}
      <div className="bg-card rounded-xl border border-border p-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("kabemon.gacha_points_label")}</p>
          <p className="text-xl font-bold text-primary">{missionPoints}P</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("kabemon.gacha_pity_label")}</p>
          <p className="text-lg font-bold">{pityLeft}{t("kabemon.times")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("kabemon.gacha_ceiling_label")}</p>
          <p className={`text-lg font-bold ${ceilingLeft <= 10 ? "text-amber-500" : ""}`}>
            {ceilingLeft}{t("kabemon.times")}
          </p>
        </div>
      </div>
      {/* 천장 진행바 */}
      <div className="bg-card rounded-xl border border-border px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">{t("kabemon.gacha_ceiling_label")} ({t("kabemon.gacha_ceiling_desc")})</p>
          <p className="text-xs font-bold text-amber-500">{legendaryPityCount}/80</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(legendaryPityCount / 80) * 100}%`,
              background: legendaryPityCount >= 70
                ? "linear-gradient(90deg, #f97316, #eab308)"
                : "linear-gradient(90deg, #7c3aed, #4f46e5)",
            }}
          />
        </div>
      </div>

      {/* Gacha buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => !pulling && onPull(1)}
          disabled={!canAffordSingle || pulling}
          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
            canAffordSingle
              ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:shadow-md"
              : "border-border bg-muted opacity-50"
          }`}
        >
          <Sparkles className="w-8 h-8 text-primary" />
          <div className="text-center">
            <p className="font-bold text-sm">{t("kabemon.gacha_single")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{GACHA_COST_SINGLE}P</p>
          </div>
          {pulling && <RotateCcw className="w-4 h-4 animate-spin text-primary" />}
        </button>

        <button
          onClick={() => !pulling && onPull(10)}
          disabled={!canAffordTen || pulling}
          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
            canAffordTen
              ? "border-amber-400/60 bg-amber-400/5 hover:bg-amber-400/10 hover:shadow-md"
              : "border-border bg-muted opacity-50"
          }`}
        >
          <div className="relative">
            <Sparkles className="w-8 h-8 text-amber-400" />
            <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="font-bold text-sm">{t("kabemon.gacha_ten")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{GACHA_COST_TEN}P</p>
          </div>
          <span className="text-[10px] font-semibold text-amber-500 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
            {t("kabemon.gacha_ten_guarantee")}
          </span>
        </button>
      </div>

      {/* Rate table */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">{t("kabemon.gacha_rates_title")}</h3>
        <div className="space-y-1.5">
          {(["common", "uncommon", "rare", "epic", "legendary", "mythic"] as CharacterRarity[]).map((r) => (
            <div key={r} className="flex items-center gap-2">
              <span className={`text-xs font-medium w-16 ${RARITY_COLOR[r]}`}>{getRarityLabel(r, lang)}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${GACHA_RATES[r]}%`, backgroundColor: RARITY_HEX[r] }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{GACHA_RATES[r]}%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          <p className="text-[11px] text-muted-foreground">· {t("kabemon.gacha_dupe_note")}</p>
          <p className="text-[11px] text-muted-foreground">
            · {t("kabemon.gacha_dupe_rate")} {(["common", "uncommon", "rare", "epic", "legendary", "mythic"] as CharacterRarity[]).map((r) => `${getRarityLabel(r, lang)} ${RARITY_DUPLICATE_POINTS[r]}P`).join(" / ")}
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── Achievement Tab ──────────────────────────────────────────────────────
const CATEGORY_ICON: Record<AchievementType, { icon: React.ReactNode; color: string; labelKey: TranslationKey }> = {
  attendance:  { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-blue-400",   labelKey: "kabemon.cat_attendance" },
  streak:      { icon: <Flame        className="w-4 h-4" />, color: "text-orange-400", labelKey: "kabemon.cat_streak" },
  raid_count:  { icon: <Zap          className="w-4 h-4" />, color: "text-yellow-400", labelKey: "kabemon.cat_raid" },
  live_count:  { icon: <Star         className="w-4 h-4" />, color: "text-green-400",  labelKey: "kabemon.cat_live" },
  post_count:  { icon: <Sparkles     className="w-4 h-4" />, color: "text-purple-400", labelKey: "kabemon.cat_post" },
  points:      { icon: <Gift         className="w-4 h-4" />, color: "text-primary",    labelKey: "kabemon.cat_points" },
};

function AchievementTab({
  ownedSet, attendanceDays, streakDays, totalPointsUsed, checking, onCheck, t,
}: {
  ownedSet: Set<number>;
  attendanceDays: number;
  streakDays: number;
  totalPointsUsed: number;
  checking: boolean;
  onCheck: () => void;
  t: TFunc;
}) {
  const { lang } = useLang();
  const visibleAchs = ACHIEVEMENTS.filter((a) => !a.hidden);
  const hiddenAchs  = ACHIEVEMENTS.filter((a) => a.hidden);
  const totalDone   = ACHIEVEMENTS.filter((a) => ownedSet.has(a.characterId)).length;

  const categories = (Object.keys(CATEGORY_ICON) as AchievementType[]).filter(
    (cat) => visibleAchs.some((a) => a.type === cat)
  );

  const [openCats, setOpenCats] = useState<Set<string>>(new Set([...categories, "hidden"]));
  const toggleCat = (key: string) =>
    setOpenCats((prev) => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const progressOf = (type: AchievementType, value: number) => {
    switch (type) {
      case "attendance": return Math.min(attendanceDays, value);
      case "streak":     return Math.min(streakDays, value);
      case "points":     return Math.min(totalPointsUsed, value);
      default:           return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("kabemon.achievement_total")}</p>
          <p className="text-lg font-bold">
            <span className="text-primary">{totalDone}</span>
            <span className="text-muted-foreground font-normal text-sm"> / {ACHIEVEMENTS.length}</span>
          </p>
        </div>
        <button
          onClick={onCheck}
          disabled={checking}
          className="flex items-center gap-1.5 bg-primary/80 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
        >
          <Gift className="w-3.5 h-3.5" />
          {checking ? t("kabemon.achievement_checking") : t("kabemon.achievement_claim")}
        </button>
      </div>

      {/* Category groups */}
      {categories.map((cat) => {
        const achs = visibleAchs.filter((a) => a.type === cat);
        const meta = CATEGORY_ICON[cat];
        const isOpen = openCats.has(cat);
        return (
          <div key={cat} className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <span className={meta.color}>{meta.icon}</span>
              <span className="text-xs font-bold">{t(meta.labelKey)}</span>
              <span className="ml-auto text-[10px] text-muted-foreground mr-1.5">
                {achs.filter((a) => ownedSet.has(a.characterId)).length}/{achs.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
            </button>
            {isOpen && (
              <div className="divide-y divide-border">
                {achs.map((ach) => {
                  const char = CHARACTERS.find((c) => c.id === ach.characterId);
                  if (!char) return null;
                  const isOwned = ownedSet.has(ach.characterId);
                  const progress = progressOf(ach.type as AchievementType, ach.value);
                  const pct = progress !== null ? Math.min(100, Math.round((progress / ach.value) * 100)) : null;

                  return (
                    <div
                      key={ach.characterId}
                      className={`flex items-center gap-3 px-4 py-3 ${isOwned ? "bg-primary/5" : "hover:bg-muted/20"}`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isOwned ? RARITY_BG[char.rarity] : "bg-muted"
                      } ${!isOwned ? "grayscale opacity-50" : ""}`}>
                        <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${
                          isOwned ? RARITY_COLOR[char.rarity] : "text-foreground"
                        }`}>
                          {getCharName(char, lang)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{getAchLabel(ach, lang)}</p>
                        {pct !== null && !isOwned && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{progress}/{ach.value}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {isOwned ? (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Hidden achievements */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => toggleCat("hidden")}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
        >
          <span className="text-muted-foreground/60"><Lock className="w-4 h-4" /></span>
          <span className="text-xs font-bold text-muted-foreground">{t("kabemon.achievement_hidden")}</span>
          <span className="ml-auto text-[10px] text-muted-foreground mr-1.5">
            {hiddenAchs.filter((a) => ownedSet.has(a.characterId)).length}/{hiddenAchs.length}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${openCats.has("hidden") ? "" : "-rotate-90"}`} />
        </button>
        {openCats.has("hidden") && (
          <div className="divide-y divide-border">
            {hiddenAchs.map((ach) => {
              const isOwned = ownedSet.has(ach.characterId);
              const char = CHARACTERS.find((c) => c.id === ach.characterId);
              return (
                <div key={ach.characterId} className={`flex items-center gap-3 px-4 py-3 ${isOwned ? "bg-primary/5" : ""}`}>
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isOwned && char ? RARITY_BG[char.rarity] : "bg-muted"
                  } ${!isOwned ? "grayscale opacity-40" : ""}`}>
                    {isOwned && char
                      ? <PixelSprite type={char.type} colors={char.colors} characterId={char.id} rarity={char.rarity} size={32} />
                      : <span className="text-base font-bold text-muted-foreground/30">?</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${
                      isOwned && char ? RARITY_COLOR[char.rarity] : "text-muted-foreground/40"
                    }`}>
                      {isOwned && char ? getCharName(char, lang) : "???"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50">
                      {isOwned ? getAchLabel(ach, lang) : t("kabemon.achievement_condition_hidden")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isOwned ? (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Achievement Reveal Modal ─────────────────────────────────────────────
function AchievementRevealModal({
  newlyUnlocked,
  onClose,
  t,
}: {
  newlyUnlocked: number[];
  onClose: () => void;
  t: TFunc;
}) {
  const { lang } = useLang();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<"medal" | "busting" | "revealed">("medal");
  const [showSummary, setShowSummary] = useState(false);

  const charId = newlyUnlocked[currentIdx];
  const char = CHARACTERS.find((c) => c.id === charId);
  const ach = char ? ACHIEVEMENT_BY_CHARACTER.get(char.id) : undefined;
  const reveal = char ? RARITY_REVEAL[char.rarity] : undefined;
  // safeChar는 showSummary가 아닐 때 항상 존재 (위 guard에서 보장)
  const safeChar = char!
  const isLast = currentIdx === newlyUnlocked.length - 1;

  const bust = () => {
    if (phase !== "medal") return;
    setPhase("busting");
    setTimeout(() => setPhase("revealed"), 380);
  };

  const next = () => {
    if (!isLast) {
      setCurrentIdx((i) => i + 1);
      setPhase("medal");
    } else {
      onClose();
    }
  };

  const skipAll = () => {
    setShowSummary(true);
  };

  if (!showSummary && !char) return null;

  const rayColor = !showSummary && phase === "revealed" && reveal ? reveal.glow : "#f59e0b";
  const headerColor = !showSummary && phase === "revealed" && reveal ? reveal.glow : "#f59e0b";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-slate-950/98">
      {/* Skip */}
      {!showSummary && phase === "medal" && newlyUnlocked.length > 1 && (
        <button
          onClick={skipAll}
          className="absolute top-5 right-5 text-white/50 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors z-20"
        >
          {t("kabemon.gacha_skip")} ⏭
        </button>
      )}

      {/* 스킵 요약 화면 */}
      {showSummary && (
        <div className="relative z-10 flex flex-col items-center gap-5 px-4 w-full max-w-sm">
          <p className="text-white font-bold text-lg tracking-wide">{t("kabemon.ach_skip_summary")}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {newlyUnlocked.map((cId) => {
              const c = CHARACTERS.find((ch) => ch.id === cId);
              if (!c) return null;
              const rv = RARITY_REVEAL[c.rarity];
              return (
                <div
                  key={cId}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl ${RARITY_BG[c.rarity]}`}
                  style={rv ? { boxShadow: `0 0 12px 3px ${rv.glow}50` } : undefined}
                >
                  <PixelSprite type={c.type} colors={c.colors} characterId={c.id} rarity={c.rarity} size={48} />
                  <p className={`text-xs font-semibold text-center leading-tight ${RARITY_COLOR[c.rarity]}`}>{getCharName(c, lang)}</p>
                  <p className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${RARITY_BG[c.rarity]} ${RARITY_COLOR[c.rarity]}`}>{getRarityLabel(c.rarity, lang)}</p>
                </div>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-64 py-3 rounded-2xl font-bold text-white text-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 4px 24px #7c3aed40" }}
          >
            {t("kabemon.ach_confirm")}
          </button>
        </div>
      )}

      {/* Rotating light rays */}
      {!showSummary && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: "200vmax",
            height: "200vmax",
            top: "50%",
            left: "50%",
            background: `repeating-conic-gradient(from 0deg, ${rayColor}14 0deg, ${rayColor}22 11deg, transparent 11deg, transparent 22deg)`,
            animation: "achRayRotate 14s linear infinite",
          }}
        />
      )}

      {/* Progress dots (multiple achievements) */}
      {!showSummary && newlyUnlocked.length > 1 && (
        <div className="absolute top-6 flex gap-1.5 z-10">
          {newlyUnlocked.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentIdx ? 12 : 6,
                height: 6,
                background:
                  i < currentIdx ? "#f59e0b80"
                  : i === currentIdx ? "#f59e0b"
                  : "#ffffff25",
              }}
            />
          ))}
        </div>
      )}

      {/* Title */}
      {!showSummary && (
        <p
          className="absolute text-sm font-bold tracking-[0.22em] z-10"
          style={{
            top: newlyUnlocked.length > 1 ? 54 : 42,
            color: headerColor,
            textShadow: `0 0 16px ${headerColor}80, 0 0 4px ${headerColor}`,
            transition: "color 0.5s, text-shadow 0.5s",
          }}
        >
          {t("kabemon.ach_unlocked_title")}
        </p>
      )}

      {/* Medal / Busting phase */}
      {!showSummary && (phase === "medal" || phase === "busting") && (
        <div
          className="relative flex flex-col items-center gap-5 z-10"
          onClick={phase === "medal" ? bust : undefined}
          style={{
            cursor: phase === "medal" ? "pointer" : "default",
            animation:
              phase === "busting"
                ? "achMedalBurst 0.38s ease-out forwards"
                : "achMedalFloat 2.4s ease-in-out infinite",
          }}
        >
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center select-none"
            style={{
              background:
                "radial-gradient(circle at 38% 32%, #fde68a30 0%, #f59e0b15 60%, transparent 100%)",
              border: "2px solid #f59e0b40",
              boxShadow: "0 0 40px 14px #f59e0b28, 0 0 80px 28px #f59e0b14",
            }}
          >
            <Trophy
              className="w-20 h-20"
              style={{ color: "#f59e0b", filter: "drop-shadow(0 0 10px #f59e0b90)" }}
            />
          </div>
          {phase === "medal" && (
            <p
              className="text-white/45 text-xs select-none"
              style={{ animation: "capsuleFloat 1.8s ease-in-out 0.3s infinite" }}
            >
              {t("kabemon.ach_tap_hint")}
            </p>
          )}
        </div>
      )}

      {/* Revealed phase */}
      {!showSummary && phase === "revealed" && (
        <div
          className="relative flex flex-col items-center gap-5 z-10"
          style={{ animation: "achContentReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
        >
          {/* Rarity ambient glow */}
          {reveal && (
            <div
              className="absolute pointer-events-none"
              style={{
                width: "100vw",
                height: "100vh",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: reveal.bg,
                animation: "revealGlow 1.2s ease-in-out 5 alternate",
                animationDelay: "0.2s",
              }}
            />
          )}

          {/* Character */}
          <div
            className={`relative rounded-2xl ${RARITY_BG[safeChar.rarity]} overflow-hidden`}
            style={{
              minHeight: 200,
              ...(reveal ? { boxShadow: `0 0 44px 14px ${reveal.glow}50, 0 0 14px 4px ${reveal.glow}40` } : {}),
            }}
          >
            <div className="flex items-center justify-center py-6">
              <PixelCharacter characterId={safeChar.id} size={128} float />
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col items-center gap-2 text-center px-6">
            <span
              className={`text-xs font-bold px-3 py-0.5 rounded-full ${RARITY_BG[safeChar.rarity]} ${RARITY_COLOR[safeChar.rarity]}`}
            >
              {getRarityLabel(safeChar.rarity, lang)}
            </span>
            <p className={`text-3xl font-bold ${RARITY_COLOR[safeChar.rarity]}`}>{getCharName(safeChar, lang)}</p>
            {ach && (
              <p className="text-sm text-white/50 max-w-[240px] leading-snug">{getAchLabel(ach, lang)}</p>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={next}
            className="w-64 py-3.5 rounded-2xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: reveal
                ? `linear-gradient(135deg, ${reveal.glow}cc, ${reveal.glow}88)`
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: reveal ? `0 4px 24px ${reveal.glow}50` : "0 4px 24px #7c3aed40",
            }}
          >
            {isLast ? t("kabemon.ach_confirm") : t("kabemon.ach_next")}
          </button>
        </div>
      )}
    </div>
  );
}

