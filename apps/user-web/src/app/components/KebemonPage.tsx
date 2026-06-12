import React, { useState, useEffect, useId } from "react";
import { useSearchParams } from "react-router";
import {
  Trophy,
  Lock,
  BookOpen,
  User,
  Sparkles,
  Shield,
  Gamepad2,
  CheckCircle2,
  Flame,
  Zap,
  Gift,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Swords,
  Layers,
  Map as MapIcon,
} from "lucide-react";
import { useAppData, type GachaResult } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";
import { type TranslationKey } from "../lib/i18n";
import PixelCharacter, { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS,
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_CHARACTER,
  GACHA_COST_SINGLE,
  GACHA_COST_TEN,
  RARITY_DUPLICATE_POINTS,
  GACHA_RATES,
  RARITY_COLOR,
  RARITY_BORDER,
  ROGUE_TYPE_MAP,
  RARITY_RAID_STATS,
  RARITY_COL_STATS,
  getCharName,
  getCharDesc,
  getRarityLabel,
  getAchLabel,
} from "../data/characters";
import type {
  CharacterDef,
  CharacterRarity,
  AchievementType,
  RogueArchetype,
} from "../data/characters";

const CHAR_DISPLAY_NUM = new Map(CHARACTERS.map((c, i) => [c.id, i + 1]));
const charNum = (id: number) =>
  String(CHAR_DISPLAY_NUM.get(id) ?? id).padStart(3, "0");

type TFunc = (key: TranslationKey) => string;

const CAPSULE_MYSTERY_COLORS = [
  "#7c3aed",
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
  "#9333ea",
  "#c026d3",
];

const RARITY_HEX: Record<CharacterRarity, string> = {
  common: "#9ca3af",
  uncommon: "#4ade80",
  rare: "#60a5fa",
  epic: "#c084fc",
  legendary: "#fbbf24",
  mythic: "#f472b6",
};

// 에픽+ 레어리티 휘광: epic=보라, legendary=주황, mythic=노란
const RARITY_REVEAL: Partial<
  Record<CharacterRarity, { glow: string; bg: string }>
> = {
  epic: {
    glow: "#a855f7",
    bg: "radial-gradient(circle at 50% 45%, #a855f750 0%, transparent 68%)",
  },
  legendary: {
    glow: "#f97316",
    bg: "radial-gradient(circle at 50% 45%, #f9731650 0%, transparent 68%)",
  },
};

const RARITY_BG: Record<CharacterRarity, string> = {
  common: "bg-gray-500/10",
  uncommon: "bg-green-500/10",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-amber-500/10",
  mythic: "bg-pink-500/10",
};

const RARITY_GLOW: Record<CharacterRarity, string> = {
  common: "shadow-gray-400/20",
  uncommon: "shadow-green-400/30",
  rare: "shadow-blue-400/30",
  epic: "shadow-purple-400/40",
  legendary: "shadow-amber-400/50",
  mythic: "shadow-pink-400/60",
};


type Tab = "character" | "collection" | "gacha" | "achievement";
type Filter = "all" | CharacterRarity;

// ─── Pixel Gacha Ball SVG ─────────────────────────────────────────────────
// viewBox 40×40 (정사각형) → 계단식 픽셀 원, 위 절반 컬러/아래 절반 흰색
function PixelCapsuleSVG({
  color,
  size = 80,
}: {
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {/* ── 위 절반 (컬러) ── */}
      <rect x="14" y="0" width="12" height="2" fill={color} />
      <rect x="10" y="2" width="20" height="2" fill={color} />
      <rect x="6" y="4" width="28" height="2" fill={color} />
      <rect x="4" y="6" width="32" height="2" fill={color} />
      <rect x="2" y="8" width="36" height="2" fill={color} />
      <rect x="0" y="10" width="40" height="9" fill={color} />

      {/* ── 아래 절반 (흰색/회색) ── */}
      <rect x="0" y="21" width="40" height="9" fill="#f2f2f2" />
      <rect x="2" y="30" width="36" height="2" fill="#ebebeb" />
      <rect x="4" y="32" width="32" height="2" fill="#e2e2e2" />
      <rect x="6" y="34" width="28" height="2" fill="#d8d8d8" />
      <rect x="10" y="36" width="20" height="2" fill="#cecece" />
      <rect x="14" y="38" width="12" height="2" fill="#c4c4c4" />

      {/* ── 적도 심(seam) ── */}
      <rect x="0" y="19" width="40" height="2" fill="#111" fillOpacity="0.28" />

      {/* ── 왼쪽 상단 하이라이트 (구체 광택) ── */}
      <rect x="12" y="2" width="8" height="2" fill="#fff" fillOpacity="0.65" />
      <rect x="8" y="4" width="10" height="2" fill="#fff" fillOpacity="0.48" />
      <rect x="6" y="6" width="10" height="2" fill="#fff" fillOpacity="0.34" />
      <rect x="4" y="8" width="8" height="4" fill="#fff" fillOpacity="0.24" />
      <rect x="4" y="12" width="6" height="4" fill="#fff" fillOpacity="0.14" />

      {/* ── 아래쪽 오른편 반사광 ── */}
      <rect x="24" y="28" width="8" height="2" fill="#fff" fillOpacity="0.22" />

      {/* ── "?" 마크 ── */}
      <rect x="15" y="4" width="10" height="2" fill="#fff" fillOpacity="0.88" />
      <rect x="21" y="6" width="4" height="3" fill="#fff" fillOpacity="0.88" />
      <rect x="15" y="9" width="10" height="2" fill="#fff" fillOpacity="0.88" />
      <rect x="17" y="11" width="4" height="4" fill="#fff" fillOpacity="0.88" />
      <rect x="17" y="16" width="4" height="2" fill="#fff" fillOpacity="0.88" />
    </svg>
  );
}

// ─── Mythic Character Background ─────────────────────────────────────────────
function MythicBackground() {
  const raw = useId();
  const uid = raw.replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 240 220"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        <radialGradient id={`${uid}h`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#6040c0" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#3020a0" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#1a1060" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}c`} cx="50%" cy="50%" r="36%">
          <stop offset="0%" stopColor="#1c0d40" />
          <stop offset="65%" stopColor="#100825" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#07030f" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id={`${uid}wl`}
          gradientUnits="userSpaceOnUse"
          x1="110"
          y1="110"
          x2="0"
          y2="60"
        >
          <stop offset="0%" stopColor="#1e1438" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#07040e" stopOpacity="0.52" />
        </linearGradient>
        <linearGradient
          id={`${uid}wr`}
          gradientUnits="userSpaceOnUse"
          x1="130"
          y1="110"
          x2="240"
          y2="60"
        >
          <stop offset="0%" stopColor="#1e1438" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#07040e" stopOpacity="0.52" />
        </linearGradient>
      </defs>

      {/* ── Left wing ── */}
      <polygon
        points="110,112 96,88 76,58 52,30 24,12 4,26 0,56 0,102 8,142 30,168 58,154 82,130 108,112"
        fill={`url(#${uid}wl)`}
      />
      <line
        x1="108"
        y1="112"
        x2="44"
        y2="44"
        stroke="#2a2060"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <line
        x1="104"
        y1="116"
        x2="18"
        y2="92"
        stroke="#2a2060"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <line
        x1="108"
        y1="118"
        x2="34"
        y2="162"
        stroke="#2a2060"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <rect x="22" y="12" width="8" height="4" fill="#30288a" opacity="0.7" />
      <rect x="4" y="26" width="4" height="6" fill="#28208a" opacity="0.6" />
      <rect x="0" y="58" width="4" height="8" fill="#201880" opacity="0.55" />
      <rect x="8" y="142" width="4" height="4" fill="#181470" opacity="0.45" />
      <rect x="30" y="166" width="8" height="4" fill="#181470" opacity="0.4" />

      {/* ── Right wing ── */}
      <polygon
        points="130,112 144,88 164,58 188,30 216,12 236,26 240,56 240,102 232,142 210,168 182,154 158,130 132,112"
        fill={`url(#${uid}wr)`}
      />
      <line
        x1="132"
        y1="112"
        x2="196"
        y2="44"
        stroke="#2a2060"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <line
        x1="136"
        y1="116"
        x2="222"
        y2="92"
        stroke="#2a2060"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <line
        x1="132"
        y1="118"
        x2="206"
        y2="162"
        stroke="#2a2060"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <rect x="210" y="12" width="8" height="4" fill="#30288a" opacity="0.7" />
      <rect x="232" y="26" width="4" height="6" fill="#28208a" opacity="0.6" />
      <rect x="236" y="58" width="4" height="8" fill="#201880" opacity="0.55" />
      <rect
        x="228"
        y="142"
        width="4"
        height="4"
        fill="#181470"
        opacity="0.45"
      />
      <rect x="202" y="166" width="8" height="4" fill="#181470" opacity="0.4" />

      {/* ── Background haze + dark orb ── */}
      <ellipse cx="120" cy="110" rx="108" ry="90" fill={`url(#${uid}h)`} />
      <ellipse cx="120" cy="108" rx="72" ry="66" fill={`url(#${uid}c)`} />

      {/* ── Crystal blades (glow halos) ── */}
      <polygon
        points="120,10 113,90 120,102 127,90"
        fill="#c0c8f0"
        opacity="0.1"
      />
      <polygon
        points="58,28 106,90 114,100 110,88"
        fill="#e0b030"
        opacity="0.1"
      />
      <polygon
        points="182,28 134,90 126,100 130,88"
        fill="#30a0c8"
        opacity="0.1"
      />

      {/* BLADE UP: white/silver */}
      <polygon
        points="120,10 116,88 120,100 124,88"
        fill="#c8d8ff"
        opacity="0.8"
      />
      <polygon
        points="120,10 118.5,88 120,100 121.5,88"
        fill="#eef5ff"
        opacity="0.92"
      />
      <rect x="119" y="10" width="2" height="78" fill="#ffffff" opacity="0.7" />

      {/* BLADE upper-left: gold */}
      <polygon
        points="58,28 106,90 114,100 110,87"
        fill="#dda820"
        opacity="0.78"
      />
      <polygon
        points="58,28 107.5,90.5 114,100 111,87.5"
        fill="#ffe870"
        opacity="0.88"
      />
      <line
        x1="58"
        y1="28"
        x2="112"
        y2="93"
        stroke="#fff0a0"
        strokeWidth="0.8"
        opacity="0.65"
      />

      {/* BLADE upper-right: cyan */}
      <polygon
        points="182,28 134,90 126,100 130,87"
        fill="#2090c0"
        opacity="0.78"
      />
      <polygon
        points="182,28 132.5,90.5 126,100 129,87.5"
        fill="#80e0ff"
        opacity="0.88"
      />
      <line
        x1="182"
        y1="28"
        x2="128"
        y2="93"
        stroke="#c0f0ff"
        strokeWidth="0.8"
        opacity="0.65"
      />

      {/* Accent blades: green + blue */}
      <polygon
        points="36,180 107,102 111,108 109,101"
        fill="#40d880"
        opacity="0.28"
      />
      <polygon
        points="204,180 133,102 129,108 131,101"
        fill="#4060e8"
        opacity="0.28"
      />

      {/* ── Magic circle ring (8 tick marks) ── */}
      <rect x="116" y="42" width="8" height="4" fill="#5040a8" opacity="0.6" />
      <rect x="163" y="60" width="4" height="6" fill="#4838a8" opacity="0.5" />
      <rect
        x="180"
        y="105"
        width="4"
        height="6"
        fill="#4030a0"
        opacity="0.45"
      />
      <rect x="163" y="150" width="4" height="6" fill="#3828a0" opacity="0.4" />
      <rect
        x="116"
        y="168"
        width="8"
        height="4"
        fill="#2820a0"
        opacity="0.35"
      />
      <rect x="73" y="150" width="4" height="6" fill="#3828a0" opacity="0.4" />
      <rect x="56" y="105" width="4" height="6" fill="#4030a0" opacity="0.45" />
      <rect x="73" y="60" width="4" height="6" fill="#4838a8" opacity="0.5" />
      <rect
        x="60"
        y="107"
        width="120"
        height="2"
        fill="#3030a0"
        opacity="0.35"
      />
      <rect
        x="119"
        y="46"
        width="2"
        height="126"
        fill="#3030a0"
        opacity="0.35"
      />

      {/* ── Ground mist ── */}
      <rect
        x="20"
        y="190"
        width="200"
        height="8"
        fill="#0c0620"
        opacity="0.5"
        rx="4"
      />
      <rect
        x="55"
        y="196"
        width="130"
        height="6"
        fill="#0c0620"
        opacity="0.32"
        rx="3"
      />
    </svg>
  );
}

// ─── Mythic Magic Circle (발밑 마법진) ────────────────────────────────────────
function MythicMagicCircle({ size = 220 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.44)}
      viewBox="0 0 220 96"
      style={{ imageRendering: "pixelated" }}
    >
      {/* ground glow */}
      <ellipse
        cx="110"
        cy="48"
        rx="108"
        ry="46"
        fill="#7c3aed"
        opacity="0.07"
      />
      {/* outer ring */}
      <ellipse
        cx="110"
        cy="48"
        rx="100"
        ry="40"
        fill="none"
        stroke="#9333ea"
        strokeWidth="1.5"
        opacity="0.45"
      />
      <ellipse
        cx="110"
        cy="48"
        rx="93"
        ry="33"
        fill="none"
        stroke="#c084fc"
        strokeWidth="1"
        opacity="0.25"
      />
      {/* inner ring */}
      <ellipse
        cx="110"
        cy="48"
        rx="62"
        ry="24"
        fill="none"
        stroke="#a855f7"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {/* center ring */}
      <ellipse
        cx="110"
        cy="48"
        rx="28"
        ry="11"
        fill="none"
        stroke="#c084fc"
        strokeWidth="1"
        opacity="0.4"
      />
      {/* 8 tick marks */}
      <rect x="108" y="7" width="4" height="5" fill="#e9d5ff" opacity="0.9" />
      <rect x="170" y="17" width="4" height="5" fill="#e9d5ff" opacity="0.65" />
      <rect x="206" y="45" width="4" height="5" fill="#e9d5ff" opacity="0.9" />
      <rect x="170" y="74" width="4" height="5" fill="#e9d5ff" opacity="0.65" />
      <rect x="108" y="84" width="4" height="5" fill="#e9d5ff" opacity="0.9" />
      <rect x="46" y="74" width="4" height="5" fill="#e9d5ff" opacity="0.65" />
      <rect x="10" y="45" width="4" height="5" fill="#e9d5ff" opacity="0.9" />
      <rect x="46" y="17" width="4" height="5" fill="#e9d5ff" opacity="0.65" />
      {/* cross lines */}
      <line
        x1="10"
        y1="48"
        x2="210"
        y2="48"
        stroke="#7c3aed"
        strokeWidth="0.8"
        opacity="0.2"
      />
      <line
        x1="110"
        y1="8"
        x2="110"
        y2="88"
        stroke="#7c3aed"
        strokeWidth="0.8"
        opacity="0.2"
      />
      {/* diagonal */}
      <line
        x1="48"
        y1="18"
        x2="172"
        y2="78"
        stroke="#7c3aed"
        strokeWidth="0.6"
        opacity="0.13"
      />
      <line
        x1="172"
        y1="18"
        x2="48"
        y2="78"
        stroke="#7c3aed"
        strokeWidth="0.6"
        opacity="0.13"
      />
    </svg>
  );
}

// ─── Individual Capsule Slot ──────────────────────────────────────────────
function CapsuleSlot({
  idx,
  r,
  isOpen,
  isPopping,
  size,
  onOpen,
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
          {!r.isDuplicate &&
            (char.rarity === "mythic" ? (
              <MythicBackground />
            ) : reveal ? (
              <div
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: reveal.bg,
                  animation: "revealGlow 1s ease-in-out 5 alternate",
                  animationDelay: "0.4s",
                }}
              />
            ) : null)}
          <div
            className={`relative p-1 rounded-lg ${RARITY_BG[char.rarity]} ${r.isDuplicate ? "grayscale opacity-50" : ""}`}
            style={
              reveal && !r.isDuplicate
                ? {
                    boxShadow: `0 0 14px 4px ${reveal.glow}80, 0 0 5px 2px ${reveal.glow}50`,
                  }
                : char.rarity === "mythic" && !r.isDuplicate
                  ? {
                      boxShadow:
                        "0 0 14px 4px #9060e080, 0 0 5px 2px #9060e050",
                    }
                  : undefined
            }
          >
            <PixelSprite
              type={char.type}
              colors={char.colors}
              characterId={char.id}
              rarity={char.rarity}
              size={spriteSize}
            />
          </div>
          <p
            className={`text-[8px] text-center font-semibold leading-tight max-w-full truncate px-0.5 ${
              r.isDuplicate ? "text-white/50" : RARITY_COLOR[char.rarity]
            }`}
          >
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
      if (!openedSet.has(i)) {
        openCapsule(i);
        break;
      }
    }
  };

  const openAll = () => {
    setPoppingIdx(null);
    setOpenedSet(new Set(result.results.map((_, i) => i)));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-slate-900/96 to-black/98">
      {/* Hint / title */}
      <p className="text-white/80 text-sm font-semibold tracking-wide">
        {allOpened
          ? t("kebomon.gacha_result_title")
          : t("kebomon.gacha_capsule_hint")}
      </p>

      {/* Capsules */}
      {isSingle ? (
        <div className="flex items-center justify-center min-h-[160px]">
          <CapsuleSlot
            idx={0}
            r={result.results[0]}
            isOpen={openedSet.has(0)}
            isPopping={poppingIdx === 0}
            size={capsuleSize}
            onOpen={openCapsule}
          />
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {result.results.map((_, idx) => (
            <CapsuleSlot
              key={idx}
              idx={idx}
              r={result.results[idx]}
              isOpen={openedSet.has(idx)}
              isPopping={poppingIdx === idx}
              size={capsuleSize}
              onOpen={openCapsule}
            />
          ))}
        </div>
      )}

      {/* Bonus points */}
      {allOpened && result.bonusPoints > 0 && (
        <p className="text-primary font-semibold text-sm">
          +{result.bonusPoints}P {t("kebomon.gacha_dupe_note")}
        </p>
      )}

      {/* Buttons */}
      <div className="flex gap-2 w-full max-w-xs">
        {allOpened ? (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary/80 text-white font-bold hover:bg-primary transition-colors shadow-lg"
          >
            {t("kebomon.gacha_confirm")}
          </button>
        ) : isSingle ? (
          <p className="w-full text-center text-white/50 text-xs py-2">
            {t("kebomon.gacha_tap_hint")}
          </p>
        ) : (
          <>
            <button
              onClick={openNext}
              disabled={poppingIdx !== null}
              className="flex-1 py-3 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors disabled:opacity-40"
            >
              {t("kebomon.gacha_open_one")}
            </button>
            <button
              onClick={openAll}
              className="flex-1 py-3 rounded-xl bg-primary/70 text-white font-semibold text-sm hover:bg-primary/90 transition-colors shadow-md"
            >
              {t("kebomon.gacha_open_all")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function KebomonPage() {
  const {
    rewardSummary,
    equipCharacter,
    checkAchievements,
    performGacha,
    profile,
  } = useAppData();
  const { t, lang } = useLang();
  const [searchParams] = useSearchParams();
  const initTab = (searchParams.get("tab") as Tab | null) ?? "character";
  const [tab, setTab] = useState<Tab>(initTab);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<number | null>(null);
  const [equipping, setEquipping] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [checkingAchievements, setCheckingAchievements] = useState(false);

  const {
    missionPoints,
    attendanceDays,
    streakDays,
    equippedCharacterId,
    ownedCharacterIds,
    gachaPityCount,
    legendaryPityCount,
    raidCount,
    rogueClears,
    expeditionCount,
  } = rewardSummary;

  const ownedSet = new Set(ownedCharacterIds);

  const equippedChar = equippedCharacterId
    ? (CHARACTERS.find((c) => c.id === equippedCharacterId) ?? CHARACTERS[0])
    : (CHARACTERS.find((c) => ownedSet.has(c.id)) ?? CHARACTERS[0]);

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
      await checkAchievements();
    } finally {
      setCheckingAchievements(false);
    }
  };

  const rarities: Filter[] = [
    "all",
    "common",
    "uncommon",
    "rare",
    "epic",
    "legendary",
    "mythic",
  ];
  const RARITY_ORDER: Record<CharacterRarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
  };
  const filtered = (
    filter === "all"
      ? CHARACTERS
      : CHARACTERS.filter((c) => c.rarity === filter)
  )
    .slice()
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);
  const selectedChar =
    selected !== null ? CHARACTERS.find((c) => c.id === selected) : null;

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
              {t("kebomon.title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ownedCharacterIds.length}/{CHARACTERS.length}{" "}
              {t("kebomon.collection_count")} · {missionPoints}P
            </p>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {(["character", "collection", "gacha", "achievement"] as Tab[]).map(
            (t_) => {
              const icons: Record<Tab, React.ReactNode> = {
                character: <User className="w-3.5 h-3.5" />,
                collection: <BookOpen className="w-3.5 h-3.5" />,
                gacha: <Sparkles className="w-3.5 h-3.5" />,
                achievement: <Trophy className="w-3.5 h-3.5" />,
              };
              const labels: Record<Tab, string> = {
                character: lang === "ja" ? "強化" : "강화",
                collection: lang === "ja" ? "図鑑" : "도감",
                gacha: lang === "ja" ? "ガチャ" : "뽑기",
                achievement: lang === "ja" ? "実績" : "업적",
              };
              return (
                <button
                  key={t_}
                  onClick={() => setTab(t_)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    tab === t_
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {icons[t_]}
                  {labels[t_]}
                </button>
              );
            },
          )}
        </div>

        {/* ══════════════ CHARACTER TAB ══════════════ */}
        {tab === "character" && (
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            {/* ── Hero card ── */}
            <div className="flex flex-col gap-4 flex-1 min-w-0">
              <div
                className={`bg-card rounded-2xl border-2 ${RARITY_BORDER[equippedChar.rarity]} p-6 shadow-lg ${RARITY_GLOW[equippedChar.rarity]}`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div
                    className={`rounded-2xl ${equippedChar.rarity === "mythic" ? "" : RARITY_BG[equippedChar.rarity]} relative overflow-hidden`}
                    style={{ width: "100%", minHeight: 220 }}
                  >
                    {equippedChar.rarity !== "mythic" && (
                      <div
                        className={`absolute inset-0 rounded-2xl blur-md opacity-30 ${RARITY_BG[equippedChar.rarity]}`}
                        style={{ transform: "scale(1.1)" }}
                      />
                    )}
                    {equippedChar.rarity === "mythic" && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-0">
                        <MythicMagicCircle size={240} />
                      </div>
                    )}
                    <div className="relative z-10 flex items-center justify-center py-6">
                      <PixelCharacter
                        characterId={equippedChar.id}
                        size={140}
                        float
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${RARITY_BG[equippedChar.rarity]} ${RARITY_COLOR[equippedChar.rarity]}`}
                      >
                        {getRarityLabel(equippedChar.rarity, lang)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{charNum(equippedChar.id)}
                      </span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${RARITY_COLOR[equippedChar.rarity]}`}
                    >
                      {getCharName(equippedChar, lang)}
                      {(rewardSummary.characterEnhancements[equippedChar.id] ??
                        0) > 0 && (
                        <span className="text-amber-400 ml-1.5">
                          +
                          {rewardSummary.characterEnhancements[equippedChar.id]}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getCharDesc(equippedChar, lang)}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-2">
                      {t("kebomon.mouse_hint")}
                    </p>
                  </div>
                </div>
              </div>

              {/*kebo-style full stats panel */}
              <KeboStatusPanel
                char={equippedChar}
                enhancements={rewardSummary.characterEnhancements}
                lang={lang}
              />
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
            characterEnhancements={rewardSummary.characterEnhancements}
            onSelectFilter={setFilter}
            onSelectChar={(id) => setSelected(selected === id ? null : id)}
            onEquip={(id) => void handleEquip(id)}
            t={t}
          />
        )}

        {/* ══════════════ GACHA TAB ══════════════ */}
        {tab === "gacha" && (
          <>
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
            raidCount={raidCount}
            rogueClears={rogueClears}
            expeditionCount={expeditionCount}
            userId={profile.id}
            checking={checkingAchievements}
            onCheck={() => void handleCheckAchievements()}
            t={t}
          />
        )}
      </div>

      {/* ── Gacha result modal ── */}
      {gachaResult && (
        <GachaCapsuleModal
          result={gachaResult}
          onClose={() => setGachaResult(null)}
          t={t}
        />
      )}
    </>
  );
}

// ─── Collection Tab ───────────────────────────────────────────────────────
function CollectionTab({
  ownedSet,
  equippedCharacterId,
  selected,
  selectedChar,
  filter,
  filtered,
  rarities,
  equipping,
  onSelectFilter,
  onSelectChar,
  onEquip,
  characterEnhancements,
  t,
}: {
  ownedSet: Set<number>;
  equippedCharacterId: number | null;
  selected: number | null;
  selectedChar: CharacterDef | null | undefined;
  filter: Filter;
  filtered: CharacterDef[];
  rarities: Filter[];
  equipping: boolean;
  characterEnhancements: Record<number, number>;
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
            {r === "all"
              ? lang === "ja"
                ? "全て"
                : "전체"
              : getRarityLabel(r as CharacterRarity, lang)}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.filter((c) => ownedSet.has(c.id)).length}/{filtered.length}{" "}
        {t("kebomon.collection_count")}
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
                  <PixelSprite
                    type={char.type}
                    colors={char.colors}
                    characterId={char.id}
                    rarity={char.rarity}
                    size={40}
                  />
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
                {/* Roguelike type icon — top-left */}
                {isOwned &&
                  (() => {
                    const rt: RogueArchetype =
                      ROGUE_TYPE_MAP[char.type] ?? "energy";
                    const rtColor =
                      rt === "energy"
                        ? "#38bdf8"
                        : rt === "attack"
                          ? "#f87171"
                          : "#60a5fa";
                    const rtBg =
                      rt === "energy"
                        ? "#0ea5e922"
                        : rt === "attack"
                          ? "#ef444422"
                          : "#3b82f622";
                    return (
                      <div
                        className="absolute -top-1 -left-1 w-4 h-4 rounded-sm flex items-center justify-center"
                        style={{
                          background: rtBg,
                          border: `1px solid ${rtColor}44`,
                        }}
                      >
                        {rt === "energy" ? (
                          <Zap
                            className="w-2.5 h-2.5"
                            style={{ color: rtColor }}
                          />
                        ) : rt === "attack" ? (
                          <Swords
                            className="w-2.5 h-2.5"
                            style={{ color: rtColor }}
                          />
                        ) : (
                          <Shield
                            className="w-2.5 h-2.5"
                            style={{ color: rtColor }}
                          />
                        )}
                      </div>
                    );
                  })()}
                {!isOwned && char.obtainMethod === "starter" && (
                  <div className="absolute -top-1 -left-1 text-[7px] font-bold bg-amber-500 text-white px-0.5 rounded leading-none py-px">
                    ST
                  </div>
                )}
              </div>
              <p
                className={`text-[9px] leading-tight text-center truncate w-full ${
                  isOwned
                    ? RARITY_COLOR[char.rarity]
                    : "text-muted-foreground/60"
                }`}
              >
                {isOwned ? getCharName(char, lang) : "???"}
                {isOwned && (characterEnhancements[char.id] ?? 0) > 0 && (
                  <span className="text-amber-400 ml-0.5">
                    +{characterEnhancements[char.id]}
                  </span>
                )}
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
  char,
  isOwned,
  isEquipped,
  equipping,
  onEquip,
  t,
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
    <div
      className={`bg-card rounded-xl border ${RARITY_BORDER[char.rarity]} p-4`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2 rounded-xl ${RARITY_BG[char.rarity]} ${!isOwned ? "opacity-70" : ""}`}
        >
          {isOwned ? (
            <PixelSprite
              type={char.type}
              colors={char.colors}
              characterId={char.id}
              rarity={char.rarity}
              size={56}
              float={isOwned}
            />
          ) : (
            <div className="w-14 h-14 flex items-center justify-center">
              <Lock className="w-7 h-7 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${RARITY_BG[char.rarity]} ${RARITY_COLOR[char.rarity]}`}
            >
              {getRarityLabel(char.rarity, lang)}
            </span>
            <span className="text-xs text-muted-foreground">
              #{charNum(char.id)}
            </span>
          </div>
          <p className="font-bold">
            {isOwned ? getCharName(char, lang) : "???"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isHidden
              ? t("kebomon.obtain_hidden")
              : ach
                ? getAchLabel(ach, lang)
                : char.obtainMethod === "starter"
                  ? t("kebomon.obtain_starter")
                  : t("kebomon.obtain_gacha")}
          </p>
          {isOwned && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {getCharDesc(char, lang)}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {!isOwned ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : isEquipped ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1.5 rounded-lg">
              <Shield className="w-3.5 h-3.5" />
              {t("kebomon.equipped")}
            </span>
          ) : (
            <button
              onClick={() => onEquip(char.id)}
              disabled={equipping}
              className="flex items-center gap-1 text-xs font-semibold bg-primary/80 text-primary-foreground px-2.5 py-1.5 rounded-lg hover:shadow-md transition-all disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5" />
              {equipping ? "..." : t("kebomon.equip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Gacha Tab ────────────────────────────────────────────────────────────
function GachaTab({
  missionPoints,
  gachaPityCount,
  legendaryPityCount,
  canAffordSingle,
  canAffordTen,
  pulling,
  onPull,
  t,
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
          <p className="text-xs text-muted-foreground">
            {t("kebomon.gacha_points_label")}
          </p>
          <p className="text-xl font-bold text-primary">{missionPoints}P</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("kebomon.gacha_pity_label")}
          </p>
          <p className="text-lg font-bold">
            {pityLeft}
            {t("kebomon.times")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("kebomon.gacha_ceiling_label")}
          </p>
          <p
            className={`text-lg font-bold ${ceilingLeft <= 10 ? "text-amber-500" : ""}`}
          >
            {ceilingLeft}
            {t("kebomon.times")}
          </p>
        </div>
      </div>
      {/* 천장 진행바 */}
      <div className="bg-card rounded-xl border border-border px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-muted-foreground">
            {t("kebomon.gacha_ceiling_label")} (
            {t("kebomon.gacha_ceiling_desc")})
          </p>
          <p className="text-xs font-bold text-amber-500">
            {legendaryPityCount}/80
          </p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(legendaryPityCount / 80) * 100}%`,
              background:
                legendaryPityCount >= 70
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
            <p className="font-bold text-sm">{t("kebomon.gacha_single")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {GACHA_COST_SINGLE}P
            </p>
          </div>
          {pulling && (
            <RotateCcw className="w-4 h-4 animate-spin text-primary" />
          )}
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
            <p className="font-bold text-sm">{t("kebomon.gacha_ten")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {GACHA_COST_TEN}P
            </p>
          </div>
          <span className="text-[10px] font-semibold text-amber-500 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
            {t("kebomon.gacha_ten_guarantee")}
          </span>
        </button>
      </div>

      {/* Rate table */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">
          {t("kebomon.gacha_rates_title")}
        </h3>
        <div className="space-y-1.5">
          {(
            [
              "common",
              "uncommon",
              "rare",
              "epic",
              "legendary",
              "mythic",
            ] as CharacterRarity[]
          ).map((r) => (
            <div key={r} className="flex items-center gap-2">
              <span className={`text-xs font-medium w-16 ${RARITY_COLOR[r]}`}>
                {getRarityLabel(r, lang)}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${GACHA_RATES[r]}%`,
                    backgroundColor: RARITY_HEX[r],
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">
                {GACHA_RATES[r]}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          <p className="text-[11px] text-muted-foreground">
            · {t("kebomon.gacha_dupe_note")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            · {t("kebomon.gacha_dupe_rate")}{" "}
            {(
              [
                "common",
                "uncommon",
                "rare",
                "epic",
                "legendary",
                "mythic",
              ] as CharacterRarity[]
            )
              .map(
                (r) =>
                  `${getRarityLabel(r, lang)} ${RARITY_DUPLICATE_POINTS[r]}P`,
              )
              .join(" / ")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Achievement Tab ──────────────────────────────────────────────────────
const CATEGORY_ICON: Record<
  AchievementType,
  { icon: React.ReactNode; color: string; labelKey: TranslationKey }
> = {
  attendance: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-blue-400",
    labelKey: "kebomon.cat_attendance",
  },
  streak: {
    icon: <Flame className="w-4 h-4" />,
    color: "text-orange-400",
    labelKey: "kebomon.cat_streak",
  },
  raid_count: {
    icon: <Zap className="w-4 h-4" />,
    color: "text-yellow-400",
    labelKey: "kebomon.cat_raid",
  },
  colosseum_wins: {
    icon: <Swords className="w-4 h-4" />,
    color: "text-amber-400",
    labelKey: "kebomon.cat_colosseum",
  },
  rogue_clears: {
    icon: <Layers className="w-4 h-4" />,
    color: "text-violet-400",
    labelKey: "kebomon.cat_rogue",
  },
  expedition_count: {
    icon: <MapIcon className="w-4 h-4" />,
    color: "text-emerald-400",
    labelKey: "kebomon.cat_expedition",
  },
  post_count: {
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-purple-400",
    labelKey: "kebomon.cat_post",
  },
  points: {
    icon: <Gift className="w-4 h-4" />,
    color: "text-primary",
    labelKey: "kebomon.cat_points",
  },
};

function AchievementTab({
  ownedSet,
  attendanceDays,
  streakDays,
  totalPointsUsed,
  raidCount,
  rogueClears,
  expeditionCount,
  userId,
  checking,
  onCheck,
  t,
}: {
  ownedSet: Set<number>;
  attendanceDays: number;
  streakDays: number;
  totalPointsUsed: number;
  raidCount: number;
  rogueClears: number;
  expeditionCount: number;
  userId: string;
  checking: boolean;
  onCheck: () => void;
  t: TFunc;
}) {
  const { lang } = useLang();
  const visibleAchs = ACHIEVEMENTS.filter((a) => !a.hidden);
  const hiddenAchs = ACHIEVEMENTS.filter((a) => a.hidden);
  const totalDone = ACHIEVEMENTS.filter((a) =>
    ownedSet.has(a.characterId),
  ).length;

  const [colosseumWins, setColosseumWins] = useState<number | null>(null);
  useEffect(() => {
    api
      .get<{ wins: number }>(
        `/rewards/colosseum-stats?userId=${encodeURIComponent(userId)}`,
      )
      .then((s) => setColosseumWins(s.wins))
      .catch(() => setColosseumWins(0));
  }, [userId]);

  const categories = (Object.keys(CATEGORY_ICON) as AchievementType[]).filter(
    (cat) => visibleAchs.some((a) => a.type === cat),
  );

  const [openCats, setOpenCats] = useState<Set<string>>(
    new Set([...categories, "hidden"]),
  );
  const toggleCat = (key: string) =>
    setOpenCats((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });

  const progressOf = (type: AchievementType, value: number) => {
    switch (type) {
      case "attendance":
        return Math.min(attendanceDays, value);
      case "streak":
        return Math.min(streakDays, value);
      case "points":
        return Math.min(totalPointsUsed, value);
      case "rogue_clears":
        return Math.min(rogueClears, value);
      case "expedition_count":
        return Math.min(expeditionCount, value);
      case "raid_count":
        return Math.min(raidCount, value);
      case "colosseum_wins":
        return colosseumWins !== null ? Math.min(colosseumWins, value) : null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {t("kebomon.achievement_total")}
          </p>
          <p className="text-lg font-bold">
            <span className="text-primary">{totalDone}</span>
            <span className="text-muted-foreground font-normal text-sm">
              {" "}
              / {ACHIEVEMENTS.length}
            </span>
          </p>
        </div>
        <button
          onClick={onCheck}
          disabled={checking}
          className="flex items-center gap-1.5 bg-primary/80 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
        >
          <Gift className="w-3.5 h-3.5" />
          {checking
            ? t("kebomon.achievement_checking")
            : t("kebomon.achievement_claim")}
        </button>
      </div>

      {/* Category groups */}
      {categories.map((cat) => {
        const achs = visibleAchs.filter((a) => a.type === cat);
        const meta = CATEGORY_ICON[cat];
        const isOpen = openCats.has(cat);
        return (
          <div
            key={cat}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            <button
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <span className={meta.color}>{meta.icon}</span>
              <span className="text-xs font-bold">{t(meta.labelKey)}</span>
              <span className="ml-auto text-[10px] text-muted-foreground mr-1.5">
                {achs.filter((a) => ownedSet.has(a.characterId)).length}/
                {achs.length}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
              />
            </button>
            {isOpen && (
              <div className="divide-y divide-border">
                {achs.map((ach) => {
                  const char = CHARACTERS.find((c) => c.id === ach.characterId);
                  if (!char) return null;
                  const isOwned = ownedSet.has(ach.characterId);
                  const progress = progressOf(
                    ach.type as AchievementType,
                    ach.value,
                  );
                  const pct =
                    progress !== null
                      ? Math.min(100, Math.round((progress / ach.value) * 100))
                      : null;

                  return (
                    <div
                      key={ach.characterId}
                      className={`flex items-center gap-3 px-4 py-3 ${isOwned ? "bg-primary/5" : "hover:bg-muted/20"}`}
                    >
                      <div
                        className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                          isOwned ? RARITY_BG[char.rarity] : "bg-muted"
                        } ${!isOwned ? "grayscale opacity-50" : ""}`}
                      >
                        <PixelSprite
                          type={char.type}
                          colors={char.colors}
                          characterId={char.id}
                          rarity={char.rarity}
                          size={32}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold leading-tight ${
                            isOwned
                              ? RARITY_COLOR[char.rarity]
                              : "text-foreground"
                          }`}
                        >
                          {getCharName(char, lang)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {getAchLabel(ach, lang)}
                        </p>
                        {pct !== null && !isOwned && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary/60"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {progress}/{ach.value}
                            </span>
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
          <span className="text-muted-foreground/60">
            <Lock className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            {t("kebomon.achievement_hidden")}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground mr-1.5">
            {hiddenAchs.filter((a) => ownedSet.has(a.characterId)).length}/
            {hiddenAchs.length}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${openCats.has("hidden") ? "" : "-rotate-90"}`}
          />
        </button>
        {openCats.has("hidden") && (
          <div className="divide-y divide-border">
            {hiddenAchs.map((ach) => {
              const isOwned = ownedSet.has(ach.characterId);
              const char = CHARACTERS.find((c) => c.id === ach.characterId);
              return (
                <div
                  key={ach.characterId}
                  className={`flex items-center gap-3 px-4 py-3 ${isOwned ? "bg-primary/5" : ""}`}
                >
                  <div
                    className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isOwned && char ? RARITY_BG[char.rarity] : "bg-muted"
                    } ${!isOwned ? "grayscale opacity-40" : ""}`}
                  >
                    {isOwned && char ? (
                      <PixelSprite
                        type={char.type}
                        colors={char.colors}
                        characterId={char.id}
                        rarity={char.rarity}
                        size={32}
                      />
                    ) : (
                      <span className="text-base font-bold text-muted-foreground/30">
                        ?
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isOwned && char
                          ? RARITY_COLOR[char.rarity]
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {isOwned && char ? getCharName(char, lang) : "???"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50">
                      {isOwned
                        ? getAchLabel(ach, lang)
                        : t("kebomon.achievement_condition_hidden")}
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
export function AchievementRevealModal({
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
  const safeChar = char!;
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

  const rayColor =
    !showSummary && phase === "revealed" && reveal ? reveal.glow : "#f59e0b";
  const headerColor =
    !showSummary && phase === "revealed" && reveal ? reveal.glow : "#f59e0b";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-slate-950/98">
      {/* 결과 보기 버튼 */}
      {!showSummary && phase === "medal" && newlyUnlocked.length > 1 && (
        <button
          onClick={skipAll}
          className="absolute top-5 right-5 text-white/50 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors z-20"
        >
          {t("kebomon.ach_view_all")}{" "}
          <ChevronRight className="w-3 h-3 inline-block" />
        </button>
      )}

      {/* 결과 요약 화면 */}
      {showSummary && (
        <div className="relative z-10 flex flex-col items-center gap-5 px-4 w-full max-w-lg overflow-y-auto max-h-screen py-10">
          <p className="text-white font-bold text-xl tracking-wide">
            {t("kebomon.ach_skip_summary")}
          </p>
          <div
            className={`grid gap-4 justify-center w-full ${newlyUnlocked.length === 1 ? "grid-cols-1" : newlyUnlocked.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}
          >
            {newlyUnlocked.map((cId) => {
              const c = CHARACTERS.find((ch) => ch.id === cId);
              if (!c) return null;
              const rv = RARITY_REVEAL[c.rarity];
              return (
                <div
                  key={cId}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl ${RARITY_BG[c.rarity]}`}
                  style={
                    c.rarity === "mythic"
                      ? { boxShadow: "0 0 18px 4px #9060e055" }
                      : rv
                        ? { boxShadow: `0 0 18px 4px ${rv.glow}55` }
                        : undefined
                  }
                >
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 ${RARITY_COLOR[c.rarity]}`}
                  >
                    NEW 획득!
                  </span>
                  <PixelSprite
                    type={c.type}
                    colors={c.colors}
                    characterId={c.id}
                    rarity={c.rarity}
                    size={80}
                  />
                  <p
                    className={`text-sm font-bold text-center leading-tight ${RARITY_COLOR[c.rarity]}`}
                  >
                    {getCharName(c, lang)}
                  </p>
                  <p
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/10 ${RARITY_COLOR[c.rarity]}`}
                  >
                    {getRarityLabel(c.rarity, lang)}
                  </p>
                </div>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="mt-2 w-64 py-3 rounded-2xl font-bold text-white text-sm"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 4px 24px #7c3aed40",
            }}
          >
            {t("kebomon.ach_confirm")}
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
                  i < currentIdx
                    ? "#f59e0b80"
                    : i === currentIdx
                      ? "#f59e0b"
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
          {t("kebomon.ach_unlocked_title")}
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
              style={{
                color: "#f59e0b",
                filter: "drop-shadow(0 0 10px #f59e0b90)",
              }}
            />
          </div>
          {phase === "medal" && (
            <p
              className="text-white/45 text-xs select-none"
              style={{
                animation: "capsuleFloat 1.8s ease-in-out 0.3s infinite",
              }}
            >
              {t("kebomon.ach_tap_hint")}
            </p>
          )}
        </div>
      )}

      {/* Revealed phase */}
      {!showSummary && phase === "revealed" && (
        <div
          className="relative flex flex-col items-center gap-5 z-10"
          style={{
            animation:
              "achContentReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
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
              ...(safeChar.rarity === "mythic"
                ? {
                    boxShadow:
                      "0 0 44px 14px #9060e050, 0 0 14px 4px #9060e040",
                  }
                : reveal
                  ? {
                      boxShadow: `0 0 44px 14px ${reveal.glow}50, 0 0 14px 4px ${reveal.glow}40`,
                    }
                  : {}),
            }}
          >
            {safeChar.rarity === "mythic" && <MythicBackground />}
            <div className="relative z-10 flex items-center justify-center py-6">
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
            <p
              className={`text-3xl font-bold ${RARITY_COLOR[safeChar.rarity]}`}
            >
              {getCharName(safeChar, lang)}
            </p>
            {ach && (
              <p className="text-sm text-white/50 max-w-[240px] leading-snug">
                {getAchLabel(ach, lang)}
              </p>
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
              boxShadow: reveal
                ? `0 4px 24px ${reveal.glow}50`
                : "0 4px 24px #7c3aed40",
            }}
          >
            {isLast ? t("kebomon.ach_confirm") : t("kebomon.ach_next")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── kebo-Style Status Panel ────────────────────────────────────────────────
const RARITY_HP_TABLE: Record<CharacterRarity, number> = {
  common: 70,
  uncommon: 75,
  rare: 80,
  epic: 85,
  legendary: 90,
  mythic: 100,
};
const ARCHETYPE_KO: Record<string, string> = {
  warrior: "전사",
  rogue: "도적",
  mage: "마법사",
  tank: "탱커",
  nature: "자연",
  wild: "야생",
};
const ARCHETYPE_JA: Record<string, string> = {
  warrior: "戦士",
  rogue: "盗賊",
  mage: "魔法使い",
  tank: "タンク",
  nature: "自然",
  wild: "野性",
};
const ROGUE_ARCH: Record<string, string> = {
  wolf: "warrior",
  tiger: "warrior",
  lion: "warrior",
  bear: "warrior",
  eagle: "warrior",
  boar: "warrior",
  cat: "rogue",
  fox: "rogue",
  rabbit: "rogue",
  monkey: "rogue",
  raven: "rogue",
  deer: "rogue",
  ghost: "mage",
  owl: "mage",
  dragon: "mage",
  demon: "mage",
  angel: "mage",
  phoenix: "mage",
  turtle: "tank",
  elephant: "tank",
  whale: "tank",
  beetle: "tank",
  crocodile: "tank",
  plant: "nature",
  fish: "nature",
  snake: "nature",
  unicorn: "nature",
  horse: "nature",
  robot: "wild",
  slime: "wild",
};
const TYPE_ATK_MULT: Record<RogueArchetype, number> = {
  energy: 1.0,
  attack: 1.3,
  defense: 0.8,
};
const TYPE_DEF_MULT: Record<RogueArchetype, number> = {
  energy: 0.9,
  attack: 0.8,
  defense: 1.4,
};
const TYPE_HP_MULT: Record<RogueArchetype, number> = {
  energy: 1.0,
  attack: 1.0,
  defense: 1.2,
};
const TYPE_SPD_MULT: Record<RogueArchetype, number> = {
  energy: 1.3,
  attack: 1.1,
  defense: 0.9,
};

const KEBO_STATUS_CSS = `
@keyframes kebo-bar-in { from { width:0 } to { width:var(--bar-w) } }
@keyframes kebo-pulse  { 0%,100%{opacity:0.7} 50%{opacity:1} }
@keyframes kebo-scan   { from{background-position:0 0} to{background-position:0 100px} }
`;

function KeboStatBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      style={{
        flex: 1,
        height: 6,
        background: "#0a0f1a",
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #1a2840",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 6px ${color}66`,
          borderRadius: 3,
          animation: "sao-bar-in 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      />
    </div>
  );
}

function KeboStatRow({
  label,
  value,
  max,
  color,
  unit = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}
    >
      <span
        style={{
          width: 36,
          fontSize: 9,
          fontWeight: 700,
          color: "#4a6080",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          flexShrink: 0,
          fontFamily: "monospace",
        }}
      >
        {label}
      </span>
      <KeboStatBar value={value} max={max} color={color} />
      <span
        style={{
          width: 36,
          fontSize: 10,
          fontWeight: 800,
          color,
          textAlign: "right",
          flexShrink: 0,
          fontFamily: "monospace",
        }}
      >
        {value}
        {unit}
      </span>
    </div>
  );
}

export function KeboStatusPanel({
  char,
  enhancements,
  lang,
}: {
  char: CharacterDef;
  enhancements: Record<number, number>;
  lang: string;
}) {
  const enhance = enhancements[char.id] ?? 0;
  const rt: RogueArchetype = ROGUE_TYPE_MAP[char.type] ?? "energy";
  const arch = ROGUE_ARCH[char.type] ?? "wild";
  const raid = RARITY_RAID_STATS[char.rarity];
  const col = RARITY_COL_STATS[char.rarity];

  const finalAtk = Math.round(raid.atk * TYPE_ATK_MULT[rt] + enhance * 3);
  const finalDef = Math.round(col.def * TYPE_DEF_MULT[rt] + enhance * 2);
  const finalHp = Math.round(col.hp * TYPE_HP_MULT[rt] + enhance * 20);
  const finalSpd = Math.round(col.spd * TYPE_SPD_MULT[rt]);
  const rogueHp = RARITY_HP_TABLE[char.rarity];

  const rtColor =
    rt === "energy" ? "#38bdf8" : rt === "attack" ? "#f87171" : "#60a5fa";
  const rtLabel =
    lang === "ja"
      ? rt === "energy"
        ? "エナジー型"
        : rt === "attack"
          ? "アタック型"
          : "ディフェンス型"
      : rt === "energy"
        ? "에너지형"
        : rt === "attack"
          ? "공격형"
          : "방어형";
  const rtBonus =
    lang === "ja"
      ? rt === "energy"
        ? "+1エナジー"
        : rt === "attack"
          ? "+1力"
          : "+5シールド"
      : rt === "energy"
        ? "+1 에너지"
        : rt === "attack"
          ? "+1 힘"
          : "+5 방어";
  const archLabel =
    lang === "ja" ? (ARCHETYPE_JA[arch] ?? arch) : (ARCHETYPE_KO[arch] ?? arch);

  const SEC = {
    label: {
      fontSize: 10,
      fontWeight: 700,
      color: "#38bdf8",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      fontFamily: "monospace",
      marginBottom: 8,
      display: "flex",
      alignItems: "center",
      gap: 5,
    },
  };

  return (
    <div
      style={{
        fontFamily: "'Noto Sans KR','Malgun Gothic',monospace",
        position: "relative",
      }}
    >
      <style>{KEBO_STATUS_CSS}</style>
      <div
        style={{
          background:
            "linear-gradient(135deg, #030812 0%, #060d1e 60%, #081020 100%)",
          border: "1.5px solid #1a3050",
          borderRadius: 14,
          padding: 18,
          boxShadow: "0 0 30px #0ea5e918, inset 0 0 20px #0000a008",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scan-line overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,#0a1a2808 2px,#0a1a2808 4px)",
            pointerEvents: "none",
            borderRadius: 14,
          }}
        />

        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            borderBottom: "1px solid #1a3050",
            paddingBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 3,
                height: 20,
                background: "#38bdf8",
                boxShadow: "0 0 8px #38bdf8",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#e2f0ff",
                letterSpacing: "0.08em",
              }}
            >
              STATUS WINDOW
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              style={{
                fontSize: 11,
                color: "#38bdf8",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              #{String(char.id).padStart(3, "0")}
            </span>
            {enhance > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: "#fbbf24",
                  background: "#fbbf2420",
                  border: "1px solid #fbbf2444",
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                +{enhance}
              </span>
            )}
          </div>
        </div>

        {/* ─── RAID ─── */}
        <div style={{ marginBottom: 14 }}>
          <div style={SEC.label}>
            <Swords size={12} color="#38bdf8" />
            {lang === "ja" ? "RAID" : "레이드"}
          </div>
          <KeboStatRow label="ATK" value={finalAtk} max={260} color="#f87171" />
          <KeboStatRow
            label="CRIT"
            value={raid.crit}
            max={30}
            color="#fbbf24"
            unit="%"
          />
          <KeboStatRow
            label="DPS"
            value={Math.round(finalAtk * (1 + (raid.crit / 100) * 1.5))}
            max={350}
            color="#fb923c"
          />
        </div>

        {/* ─── COLOSSEUM ─── */}
        <div style={{ marginBottom: 14 }}>
          <div style={SEC.label}>
            <Shield size={12} color="#38bdf8" />
            {lang === "ja" ? "コロシアム" : "콜로세움"}
          </div>
          <KeboStatRow label="HP" value={finalHp} max={1500} color="#4ade80" />
          <KeboStatRow label="DEF" value={finalDef} max={230} color="#60a5fa" />
          <KeboStatRow label="SPD" value={finalSpd} max={170} color="#a78bfa" />
        </div>

        {/* ─── ROGUELIKE ─── */}
        <div>
          <div style={SEC.label}>
            <Layers size={12} color="#38bdf8" />
            {lang === "ja" ? "ローグライク" : "로그라이크"}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {[
              {
                key: lang === "ja" ? "タイプ" : "타입",
                val: rtLabel,
                badge: true,
                color: rtColor,
              },
              {
                key: lang === "ja" ? "ボーナス" : "특수보너스",
                val: rtBonus,
                badge: true,
                color: rtColor,
              },
              {
                key: lang === "ja" ? "アーキ" : "아키타입",
                val: archLabel,
                badge: false,
                color: "#94a3b8",
              },
              {
                key: "START HP",
                val: String(rogueHp),
                badge: false,
                color: "#4ade80",
              },
            ].map(({ key, val, badge, color }) => (
              <div
                key={key}
                style={{
                  background: "#0a1020",
                  border: "1px solid #1a2840",
                  borderRadius: 8,
                  padding: "7px 10px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: 9,
                    color: "#4a6080",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                  }}
                >
                  {key}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 800,
                    color,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {badge && rt === "energy" && <Zap size={11} />}
                  {badge && rt === "attack" && <Swords size={11} />}
                  {badge && rt === "defense" && <Shield size={11} />}
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Corner accents ── */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            width: 10,
            height: 10,
            borderTop: "2px solid #38bdf8",
            borderLeft: "2px solid #38bdf8",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 10,
            height: 10,
            borderTop: "2px solid #38bdf8",
            borderRight: "2px solid #38bdf8",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 6,
            width: 10,
            height: 10,
            borderBottom: "2px solid #38bdf866",
            borderLeft: "2px solid #38bdf866",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            width: 10,
            height: 10,
            borderBottom: "2px solid #38bdf866",
            borderRight: "2px solid #38bdf866",
          }}
        />
      </div>
    </div>
  );
}
