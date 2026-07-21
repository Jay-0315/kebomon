import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  SkipForward,
  X,
  Flower2,
  Sparkle,
  Sparkles,
  Snowflake,
  Star,
  Diamond,
  Heart,
  Square,
  Skull,
  type LucideIcon,
} from "lucide-react";
import { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS,
  type CharacterRarity,
  type CharacterType,
} from "../data/characters";
import { useLang } from "../context/LangContext";

// 이 파일은 ColosseumPage.tsx의 BattleReplay(전투 리플레이 애니메이션)와 그 의존 요소를
// 그대로 복제해 길드 보스전 등 다른 기능에서도 재사용할 수 있게 만든 것입니다.
// ColosseumPage.tsx 쪽 로직을 바꿔도 여기는 자동 반영되지 않으니, 전투 연출 관련
// 버그를 고치거나 스킬 연출을 추가할 때는 두 파일 모두 확인하세요.

const C = {
  bg: "linear-gradient(180deg,#0c0905 0%,#1a1208 40%,#100d07 70%,#0a0805 100%)",
  panel: "linear-gradient(135deg,#1e1508 0%,#120e06 100%)",
  panelDark: "linear-gradient(135deg,#130f05 0%,#0c0903 100%)",
  border: "#5a3d0e",
  borderFaint: "#2e1f06",
  gold: "#c8a44a",
  goldGlow: "#8b6020",
  parchment: "#e8d9b0",
  stone: "#8b6f3a",
  stoneFaint: "#4a3010",
  playerBg: "linear-gradient(180deg,#061a30 0%,#040f1c 100%)",
  playerBorder: "#1e3a5f",
  enemyBg: "linear-gradient(180deg,#1f0707 0%,#130404 100%)",
  enemyBorder: "#4f0e0e",
};
const FONT = "'Noto Sans KR','Noto Sans JP',sans-serif";

// 전투 연출용 파티클/아이콘 기호 → 루시드 아이콘 매핑
const LEAF_ICONS = [Flower2, Sparkle, Sparkles, Snowflake] as const;
const CURSE_ICONS = [Sparkle, X, Star, Sparkle, X, Diamond, Sparkle, Sparkles] as const;
const LOG_ICONS: Record<string, LucideIcon> = {
  s3: Sparkle,
  s2: Diamond,
  dot: Skull,
};

/** floatNums의 prefix 문자열에 아이콘이 포함된 경우 아이콘+텍스트로, 아니면 순수 텍스트로 렌더링 */
function renderFloatContent(prefix: string, val: number, color: string): React.ReactNode {
  if (prefix === "HEAL_ICON") return <Heart size={13} color={color} fill={color} />;
  if (prefix === "SKILL_ICON") return <Square size={11} color={color} fill={color} />;
  if (prefix === "◆-") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
        <Diamond size={11} color={color} fill={color} />-{val}
      </span>
    );
  }
  return val > 0 ? `${prefix}${val}` : prefix;
}

const RARITY_THEME: Record<
  CharacterRarity,
  { color: string; glow: string; border: string; bg: string }
> = {
  common: {
    color: "#94a3b8",
    glow: "#64748b",
    border: "#475569",
    bg: "#0f172a",
  },
  uncommon: {
    color: "#4ade80",
    glow: "#22c55e",
    border: "#15803d",
    bg: "#052e16",
  },
  rare: { color: "#60a5fa", glow: "#3b82f6", border: "#1d4ed8", bg: "#082f49" },
  epic: { color: "#c084fc", glow: "#a855f7", border: "#7e22ce", bg: "#2e1065" },
  legendary: {
    color: "#fbbf24",
    glow: "#f59e0b",
    border: "#b45309",
    bg: "#451a03",
  },
  mythic: {
    color: "#f472b6",
    glow: "#ec4899",
    border: "#be185d",
    bg: "#500724",
  },
};

const charById = (id: number) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export interface CharInfo {
  slot: number;
  charId: number;
  maxHp: number;
  element: string;
  rarity: string;
  archetype: string;
}
export interface HitDetail {
  targetTeam: "attacker" | "defender";
  targetSlot: number;
  damage: number;
  healed: number;
  hpAfter: number;
  alive: boolean;
  isCrit?: boolean;
  affinity?: "advantage" | "neutral";
  barrierDmg?: number;
}
export interface StatusChangeEntry {
  team: "attacker" | "defender";
  slot: number;
  type: string;
  duration: number;
  action: "apply" | "expire";
}
export interface CrSnapshot {
  team: "attacker" | "defender";
  slot: number;
  cr: number;
  alive: boolean;
  buffs: Array<{ type: string; duration: number }>;
  debuffs: Array<{ type: string; duration: number }>;
}
export interface BattleEvent {
  actorTeam: "attacker" | "defender";
  actorSlot: number; // -1 = DoT 이벤트
  targetTeam: "attacker" | "defender";
  targetSlot: number;
  damage: number;
  healed: number;
  targetHpAfter: number;
  targetAlive: boolean;
  skillType: "s1" | "s2" | "s3" | "passive" | "dot";
  skillName: string;
  hits: HitDetail[];
  crs: CrSnapshot[];
  statusChanges?: StatusChangeEntry[];
}
export interface BattleResult {
  // BattleReplay 본체는 log/attackerChars/defenderChars만 읽는다 — 나머지는
  // 이 컴포넌트를 재사용하는 다른 화면(콜로세움 결과 요약 등)을 위한 선택 필드.
  won?: boolean;
  pointsDelta?: number;
  tierPoints?: number;
  wins?: number;
  losses?: number;
  winStreak?: number;
  log: BattleEvent[];
  attackerChars: CharInfo[];
  defenderChars: CharInfo[];
  opponentName?: string;
  isAttacker?: boolean;
  tickets?: number;
  ticketRegenAt?: string | null;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap');
@keyframes col-idle-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes col-dmg-up{0%{opacity:1;transform:translateY(0) scale(1.4)}100%{opacity:0;transform:translateY(-52px) scale(0.9)}}
@keyframes col-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(40) saturate(0)}20%{transform:translateX(-8px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}100%{transform:translateX(0);filter:brightness(1)}}
@keyframes col-attack{0%{transform:translate(0,0) scale(1)}20%{transform:translate(0,-6px) scale(1.08)}50%{transform:translate(14px,-2px) scale(1.13)}70%{transform:translate(-4px,2px) scale(1.04)}100%{transform:translate(0,0) scale(1)}}
@keyframes col-attack-rev{0%{transform:translate(0,0) scale(1)}20%{transform:translate(0,-6px) scale(1.08)}50%{transform:translate(-14px,-2px) scale(1.13)}70%{transform:translate(4px,2px) scale(1.04)}100%{transform:translate(0,0) scale(1)}}
@keyframes col-active-glow{0%,100%{filter:drop-shadow(0 0 6px #c8a44a)}50%{filter:drop-shadow(0 0 18px #c8a44a)}}
@keyframes col-dead{to{filter:grayscale(1) brightness(0.3);opacity:0.4}}
@keyframes col-hp-flash{0%{opacity:0.7}100%{opacity:0}}
@keyframes col-shine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}
.col-btn-shine{overflow:hidden;position:relative}
.col-btn-shine::after{content:'';position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);animation:col-shine 2.4s ease-in-out 0.8s infinite}
.col-rank-scroll::-webkit-scrollbar{display:none}
.col-rank-scroll{-ms-overflow-style:none;scrollbar-width:none}
@media(min-width:640px){.col-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
@keyframes ult-ring{0%{transform:scale(0.2);opacity:0.9}100%{transform:scale(4);opacity:0}}
@keyframes ult-slash{0%{opacity:0;transform:translateX(-120%) skewX(-18deg)}55%{opacity:1}100%{opacity:0;transform:translateX(60%) skewX(-18deg)}}
@keyframes ult-title{0%{opacity:0;transform:scale(0.3) rotate(-4deg)}65%{opacity:1;transform:scale(1.06) rotate(1deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
@keyframes ult-sub{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes ult-flash{0%{opacity:0}40%{opacity:0.55}100%{opacity:0}}
@keyframes ult-particle{0%{opacity:1;transform:translate(0,0) scale(1.2)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)}}
@keyframes ult-line-grow{0%{width:0;opacity:0}60%{opacity:1}100%{opacity:0}}
@keyframes ult-vignette{0%{opacity:0}30%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes col-ptf{0%,100%{opacity:0.35;transform:scaleX(0.9)}50%{opacity:0.75;transform:scaleX(1.1)}}
@keyframes col-skill-in{0%{opacity:0;transform:translateX(-24px) skewX(-8deg)}100%{opacity:1;transform:translateX(0) skewX(-8deg)}}
@keyframes col-corner-glow{0%,100%{opacity:0.4}50%{opacity:1}}
@keyframes ult-meteor{0%{opacity:0;transform:translate(var(--mx),0) rotate(25deg) scale(0.3)}15%{opacity:1}90%{opacity:0.85}100%{opacity:0;transform:translate(var(--mx),430px) rotate(25deg) scale(1.4)}}
@keyframes ult-impact{0%{transform:scale(0);opacity:1}100%{transform:scale(4);opacity:0}}
@keyframes ult-shield{0%{transform:scale(0.12) rotate(-10deg);opacity:0}55%{transform:scale(1.06) rotate(2deg);opacity:1}80%{transform:scale(0.98) rotate(0deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:0.85}}
@keyframes ult-shield-ring{0%{transform:scale(0.2);opacity:0.9}100%{transform:scale(2.8);opacity:0}}
@keyframes ult-leaf{0%{transform:translate(var(--lx),90px) rotate(0deg) scale(0.5);opacity:0}25%{opacity:1}100%{transform:translate(var(--lx),-220px) rotate(var(--lrot)) scale(1.1);opacity:0}}
@keyframes ult-heal-pulse{0%{transform:scale(0.2);opacity:0.9}100%{transform:scale(3.5);opacity:0}}
@keyframes ult-laser-beam{0%{clip-path:inset(0 100% 0 0);opacity:0.9}30%{opacity:1}80%{opacity:1;clip-path:inset(0 0% 0 0)}100%{opacity:0;clip-path:inset(0 0% 0 0)}}
@keyframes ult-curse-drop{0%{transform:translateY(-260px) rotate(var(--crot));opacity:0}25%{opacity:1}100%{transform:translateY(290px) rotate(var(--crot));opacity:0}}
@keyframes ult-dagger-fly{0%{transform:translate(var(--dagx),var(--dagy)) rotate(var(--dagr)) scale(1.4);opacity:0}35%{opacity:1}90%{opacity:0.8}100%{transform:translate(0,0) rotate(45deg) scale(0.3);opacity:0}}
@keyframes ult-dark-in{0%{opacity:0}30%{opacity:0.88}80%{opacity:0.88}100%{opacity:0}}
@keyframes ult-multi-slash{0%{opacity:0;transform:translateX(-130%) rotate(var(--srot)) skewX(-12deg)}45%{opacity:1}100%{opacity:0;transform:translateX(80%) rotate(var(--srot)) skewX(-12deg)}}
@keyframes ult-buff-text{0%{opacity:0;transform:translateY(18px) scale(0.8)}50%{opacity:1;transform:translateY(0) scale(1.1)}100%{opacity:0;transform:translateY(-38px) scale(0.9)}}
@keyframes s2-slash{0%{opacity:0;transform:translateX(-110%) skewX(-14deg) scaleY(0.7)}40%{opacity:1}100%{opacity:0;transform:translateX(90%) skewX(-14deg) scaleY(0.7)}}
@keyframes s2-ring{0%{transform:scale(0.3);opacity:0.8}100%{transform:scale(2.2);opacity:0}}
@keyframes affinity-ring{0%{transform:scale(0.2);opacity:1}100%{transform:scale(3);opacity:0}}
@keyframes status-float{0%{opacity:0;transform:translateY(6px) scale(0.85)}20%{opacity:1;transform:translateY(0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-28px) scale(0.9)}}
@keyframes log-in{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
@keyframes elem-pulse{0%,100%{opacity:0.55}50%{opacity:1}}
@media(max-width:480px){.col-deck-wrap{flex-direction:column}}
`;

const ELEMENT_COLOR: Record<string, string> = {
  fire: "#f97316",
  ice: "#93c5fd",
  earth: "#a16207",
  nature: "#4ade80",
  dark: "#a78bfa",
  light: "#fef08a",
  lightning: "#facc15",
  shadow: "#c084fc",
};

function HpBar({
  hp,
  maxHp,
  height = 6,
}: {
  hp: number;
  maxHp: number;
  height?: number;
}) {
  const prevRef = useRef(hp);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (hp < prevRef.current) {
      setFlash(true);
      const tid = setTimeout(() => setFlash(false), 480);
      prevRef.current = hp;
      return () => clearTimeout(tid);
    }
    prevRef.current = hp;
  }, [hp]);
  const pct = Math.max(0, hp / maxHp);
  const col = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#facc15" : "#f87171";
  const glow = pct > 0.5 ? "#22c55e" : "#ef4444";
  return (
    <div
      style={{
        position: "relative",
        height,
        background: "#050a05",
        border: "1px solid #0a150a",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${pct * 100}%`,
          background: `linear-gradient(180deg,${col}cc,${col})`,
          boxShadow: `0 0 8px ${glow}55`,
          borderRadius: 3,
          transition:
            "width 0.45s cubic-bezier(0.25,0.8,0.25,1),background 0.4s",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: `${(1 - pct) * 100}%`,
          height: "45%",
          background: "rgba(255,255,255,0.2)",
          borderRadius: "3px 3px 0 0",
          transition: "right 0.45s cubic-bezier(0.25,0.8,0.25,1)",
          pointerEvents: "none",
        }}
      />
      {flash && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.5)",
            animation: "col-hp-flash 0.45s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

function UnitCard({
  info,
  hp,
  isActive,
  isHit,
  isDead,
  isPlayer,
  isAttacking,
  buffs,
  debuffs,
}: {
  info: CharInfo;
  hp: number;
  isActive: boolean;
  isHit: boolean;
  isDead: boolean;
  isPlayer: boolean;
  isAttacking?: boolean;
  buffs?: Array<{ type: string; duration: number }>;
  debuffs?: Array<{ type: string; duration: number }>;
}) {
  const char = charById(info.charId);
  const accent = isPlayer ? "#60a5fa" : "#f87171";
  const th =
    RARITY_THEME[info.rarity as CharacterRarity] ?? RARITY_THEME.common;
  const activeBufMeta = (buffs ?? [])
    .map((b) => BUFF_META[b.type])
    .filter(Boolean);
  const activeDebufMeta = (debuffs ?? [])
    .map((d) => DEBUFF_META[d.type])
    .filter(Boolean);
  const elemCol = ELEMENT_COLOR[info.element] ?? th.border;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        width: 72,
        opacity: isDead ? 0.3 : 1,
        animation: isDead
          ? "col-dead 0.5s forwards"
          : isHit
            ? "col-hit 0.4s ease-out"
            : isAttacking
              ? isPlayer
                ? "col-attack 0.42s ease-out"
                : "col-attack-rev 0.42s ease-out"
              : undefined,
        transition: "opacity 0.3s",
      }}
    >
      {/* 버프 아이콘 행 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "center",
          minHeight: 14,
          maxWidth: 72,
        }}
      >
        {activeBufMeta.slice(0, 4).map((m, i) => (
          <span
            key={i}
            style={{
              fontSize: 8,
              fontWeight: 900,
              color: m.color,
              background: m.bg,
              borderRadius: 3,
              padding: "1px 3px",
              lineHeight: 1.4,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* 캐릭터 카드 프레임 */}
      <div
        style={{
          position: "relative",
          width: 60,
          height: 60,
          background: isActive
            ? `radial-gradient(circle at 50% 60%, ${accent}22 0%, transparent 70%)`
            : `radial-gradient(circle at 50% 60%, ${elemCol}18 0%, transparent 70%)`,
          border: `2px solid ${isActive ? accent : elemCol}66`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isActive
            ? `0 0 16px ${accent}55, inset 0 0 12px ${accent}22`
            : `0 0 8px ${elemCol}44, inset 0 0 6px ${elemCol}11`,
          transition: "all 0.3s",
          overflow: "visible",
        }}
      >
        {isActive && (
          <>
            <div
              style={{
                position: "absolute",
                top: 1,
                left: 1,
                width: 6,
                height: 6,
                borderTop: `2px solid ${accent}`,
                borderLeft: `2px solid ${accent}`,
                borderRadius: "2px 0 0 0",
                animation: "col-corner-glow 1s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 1,
                right: 1,
                width: 6,
                height: 6,
                borderTop: `2px solid ${accent}`,
                borderRight: `2px solid ${accent}`,
                borderRadius: "0 2px 0 0",
                animation: "col-corner-glow 1s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 1,
                left: 1,
                width: 6,
                height: 6,
                borderBottom: `2px solid ${accent}`,
                borderLeft: `2px solid ${accent}`,
                borderRadius: "0 0 0 2px",
                animation: "col-corner-glow 1s ease-in-out infinite",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 1,
                right: 1,
                width: 6,
                height: 6,
                borderBottom: `2px solid ${accent}`,
                borderRight: `2px solid ${accent}`,
                borderRadius: "0 0 2px 0",
                animation: "col-corner-glow 1s ease-in-out infinite",
              }}
            />
          </>
        )}
        <div
          style={{
            animation: isDead
              ? undefined
              : isActive
                ? "col-active-glow 1s ease-in-out infinite"
                : "col-idle-bob 3s ease-in-out infinite",
            filter: isActive
              ? `drop-shadow(0 0 8px ${accent})`
              : `drop-shadow(0 0 4px ${elemCol}88)`,
          }}
        >
          <PixelSprite
            type={char.type as CharacterType}
            rarity={char.rarity as CharacterRarity}
            size={46}
          />
        </div>
        {isDead && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.55)",
              borderRadius: 8,
            }}
          >
            <X
              size={28}
              strokeWidth={3}
              color="#f87171"
              style={{ filter: "drop-shadow(0 0 8px #ef4444)" }}
            />
          </div>
        )}
        {/* 원소 뱃지 (우하단) */}
        {!isDead && (
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: elemCol,
              border: "2px solid #050a10",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "elem-pulse 2s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* 플랫폼 글로우 */}
      <div
        style={{
          width: 48,
          height: 6,
          borderRadius: "50%",
          background: `radial-gradient(ellipse 100% 100% at 50% 50%, ${isActive ? accent : elemCol}66, transparent)`,
          animation: "col-ptf 2s ease-in-out infinite",
          marginTop: -4,
          marginBottom: 1,
          pointerEvents: "none",
        }}
      />

      <HpBar hp={hp} maxHp={info.maxHp} height={5} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color: isDead ? "#6b7280" : accent,
          fontWeight: 900,
          textShadow: "0 0 6px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)",
        }}
      >
        {hp}/{info.maxHp}
      </span>

      {/* 디버프 아이콘 행 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "center",
          minHeight: 14,
          maxWidth: 72,
        }}
      >
        {activeDebufMeta.slice(0, 4).map((m, i) => (
          <span
            key={i}
            style={{
              fontSize: 8,
              fontWeight: 900,
              color: m.color,
              background: m.bg,
              borderRadius: 3,
              padding: "1px 3px",
              lineHeight: 1.4,
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const ARCHETYPE_ULT_COLOR: Record<
  string,
  {
    main: string;
    sub: string;
    labelKo: string;
    labelJa: string;
    labelEn: string;
  }
> = {
  warrior: {
    main: "#f87171",
    sub: "#7f1d1d",
    labelKo: "전사의 분노",
    labelJa: "戦士の怒り",
    labelEn: "Warrior's Rage",
  },
  tank: {
    main: "#60a5fa",
    sub: "#1e3a8a",
    labelKo: "철벽 의지",
    labelJa: "鉄壁の意志",
    labelEn: "Iron Will",
  },
  mage: {
    main: "#c084fc",
    sub: "#4c1d95",
    labelKo: "마력 폭발",
    labelJa: "魔力爆発",
    labelEn: "Mana Burst",
  },
  rogue: {
    main: "#4ade80",
    sub: "#14532d",
    labelKo: "그림자 강습",
    labelJa: "影の急襲",
    labelEn: "Shadow Strike",
  },
  nature: {
    main: "#86efac",
    sub: "#14532d",
    labelKo: "대자연의 숨결",
    labelJa: "大自然の息吹",
    labelEn: "Nature's Breath",
  },
  meka: {
    main: "#94a3b8",
    sub: "#0f172a",
    labelKo: "기계 포격",
    labelJa: "機械砲撃",
    labelEn: "Mech Barrage",
  },
  cursed: {
    main: "#f472b6",
    sub: "#500724",
    labelKo: "저주의 발현",
    labelJa: "呪いの発現",
    labelEn: "Curse Manifest",
  },
  all: {
    main: "#ffd700",
    sub: "#713f12",
    labelKo: "필살 개방",
    labelJa: "必殺開放",
    labelEn: "Final Release",
  },
};

const ARCHETYPE_ULT_NAME: Record<
  string,
  { ko: string; ja: string; en: string }
> = {
  warrior: { ko: "폭풍검", ja: "嵐の剣", en: "Storm Blade" },
  tank: { ko: "철벽 방어", ja: "鉄壁防御", en: "Iron Defense" },
  mage: { ko: "메테오", ja: "メテオ", en: "Meteor" },
  rogue: { ko: "암살", ja: "暗殺", en: "Assassination" },
  nature: { ko: "대자연의 힘", ja: "大自然の力", en: "Power of Nature" },
  meka: { ko: "에너지 캐논", ja: "エネルギーキャノン", en: "Energy Cannon" },
  cursed: { ko: "재앙 선포", ja: "災厄宣布", en: "Calamity Decree" },
  all: { ko: "전력 공격", ja: "全力攻撃", en: "All-Out Attack" },
};

function UltimateAnim({
  archetype,
  actorTeam,
  charId,
  onEnd,
}: {
  archetype: string;
  actorTeam: "attacker" | "defender";
  charId?: number;
  onEnd: () => void;
}) {
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const pal = ARCHETYPE_ULT_COLOR[archetype] ?? ARCHETYPE_ULT_COLOR.all;
  const col = pal.main;
  const dark = pal.sub;
  const actor = charId != null ? charById(charId) : null;

  useEffect(() => {
    const t = setTimeout(onEnd, 1600);
    return () => clearTimeout(t);
  }, [onEnd]);

  const meteors = Array.from({ length: 7 }, (_, i) => ({
    mx: `${-142 + i * 47}px`,
    delay: `${(i * 0.08).toFixed(2)}s`,
    size: 16 + (i % 3) * 9,
  }));
  const multiSlashes = Array.from({ length: 8 }, (_, i) => ({
    top: `${13 + i * 10}%`,
    rot: `${(i % 2 === 0 ? -1 : 1) * (2 + (i % 3) * 4)}deg`,
    delay: `${(i * 0.045).toFixed(3)}s`,
    h: 2 + (i % 3),
  }));
  const leaves = Array.from({ length: 12 }, (_, i) => ({
    lx: `${-138 + i * 25}px`,
    lrot: `${(i % 2 === 0 ? 1 : -1) * (120 + (i % 4) * 60)}deg`,
    delay: `${(i * 0.06).toFixed(2)}s`,
    Icon: LEAF_ICONS[i % 4],
    size: 12 + (i % 4) * 5,
  }));
  const curseDrops = Array.from({ length: 8 }, (_, i) => ({
    Icon: CURSE_ICONS[i],
    lx: -154 + i * 44,
    crot: `${(i % 2 === 0 ? -1 : 1) * (8 + (i % 4) * 12)}deg`,
    delay: `${(i * 0.07).toFixed(2)}s`,
    size: 14 + (i % 3) * 8,
  }));
  const daggers = [
    { dagx: "-190px", dagy: "-190px", dagr: "-45deg", delay: "0s" },
    { dagx: "190px", dagy: "-190px", dagr: "135deg", delay: "0.07s" },
    { dagx: "-190px", dagy: "190px", dagr: "-135deg", delay: "0.14s" },
    { dagx: "190px", dagy: "190px", dagr: "45deg", delay: "0.21s" },
  ];
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const dist = 70 + (i % 3) * 35;
    return {
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist),
      delay: `${(i * 0.03).toFixed(2)}s`,
      size: 4 + (i % 4) * 2,
    };
  });
  const slashLines = [
    { top: "28%", delay: "0s", h: 3 },
    { top: "47%", delay: "0.05s", h: 2 },
    { top: "52%", delay: "0.08s", h: 2 },
    { top: "72%", delay: "0.04s", h: 3 },
  ];

  const renderEffects = (): React.ReactNode => {
    if (archetype === "mage")
      return (
        <>
          {meteors.map((m, i) => (
            <div
              key={i}
              style={
                {
                  position: "absolute",
                  top: -70,
                  left: "50%",
                  width: m.size,
                  height: Math.round(m.size * 1.5),
                  background: `radial-gradient(ellipse at top,#fff 0%,${col} 40%,${dark}cc 100%)`,
                  borderRadius: "50% 50% 60% 60%",
                  boxShadow: `0 0 ${m.size}px ${col}`,
                  opacity: 0,
                  animation: `ult-meteor 0.88s ease-in ${m.delay} forwards`,
                  "--mx": m.mx,
                } as React.CSSProperties
              }
            />
          ))}
          {[0.65, 0.78, 0.92].map((delay, i) => (
            <div
              key={`mgi${i}`}
              style={{
                position: "absolute",
                width: 80 + i * 60,
                height: 80 + i * 60,
                border: `${3 - i}px solid ${col}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `ult-impact 0.5s ease-out ${delay}s forwards`,
                boxShadow: `0 0 20px ${col}88`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              top: "44%",
              left: "5%",
              right: "5%",
              height: 5,
              background: `linear-gradient(90deg,transparent,${col}66,${col},${col}66,transparent)`,
              boxShadow: `0 0 25px ${col}`,
              opacity: 0,
              animation: `ult-flash 0.8s ease-out 0.72s forwards`,
            }}
          />
        </>
      );

    if (archetype === "warrior")
      return (
        <>
          {multiSlashes.map((s, i) => (
            <div
              key={i}
              style={
                {
                  position: "absolute",
                  top: s.top,
                  left: "-10%",
                  width: "120%",
                  height: s.h,
                  background: `linear-gradient(90deg,transparent 0%,${col}66 15%,${col} 50%,${col}66 85%,transparent 100%)`,
                  opacity: 0,
                  animation: `ult-multi-slash 0.52s ease-out ${s.delay} forwards`,
                  boxShadow: `0 0 10px ${col}88`,
                  "--srot": s.rot,
                } as React.CSSProperties
              }
            />
          ))}
          {[0, 120, 260].map((ms, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 100 + i * 50,
                height: 100 + i * 50,
                border: `${3 - i}px solid ${col}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `ult-ring 0.85s ease-out ${ms}ms forwards`,
                boxShadow: `0 0 20px ${col}55`,
              }}
            />
          ))}
        </>
      );

    if (archetype === "tank")
      return (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              opacity: 0,
              animation: `ult-dark-in 1.6s ease-in-out forwards`,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              background: `linear-gradient(135deg,${col}44 0%,${dark}bb 60%,${col}22 100%)`,
              clipPath:
                "polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
              border: `3px solid ${col}`,
              boxShadow: `0 0 50px ${col},0 0 100px ${col}44`,
              opacity: 0,
              animation: `ult-shield 1.1s cubic-bezier(0.175,0.885,0.32,1.275) 0.1s forwards`,
            }}
          />
          {[0, 220, 440].map((ms, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 160 + i * 20,
                height: 160 + i * 20,
                border: `${3 - i}px solid ${col}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `ult-shield-ring 0.9s ease-out ${ms}ms forwards`,
                boxShadow: `0 0 24px ${col}88`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              bottom: "22%",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: "0.22em",
              color: col,
              textShadow: `0 0 20px ${col},0 0 40px ${col}88`,
              opacity: 0,
              animation: `ult-buff-text 1.1s ease-out 0.48s forwards`,
            }}
          >
            {ko ? "철벽 방어!" : ja ? "鉄壁の防御！" : "IRON GUARD!"}
          </div>
        </>
      );

    if (archetype === "nature")
      return (
        <>
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "45%",
              background: `linear-gradient(0deg,${dark}99 0%,transparent 100%)`,
              opacity: 0,
              animation: `ult-dark-in 1.6s ease-in-out forwards`,
            }}
          />
          {leaves.map((l, i) => (
            <div
              key={i}
              style={
                {
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  opacity: 0,
                  animation: `ult-leaf 1.1s ease-out ${l.delay} forwards`,
                  "--lx": l.lx,
                  "--lrot": l.lrot,
                  userSelect: "none",
                } as React.CSSProperties
              }
            >
              <l.Icon
                size={l.size}
                color={col}
                style={{ filter: `drop-shadow(0 0 10px ${col}) drop-shadow(0 0 20px ${col}88)` }}
              />
            </div>
          ))}
          {[0, 260, 520].map((ms, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 120 + i * 50,
                height: 120 + i * 50,
                border: `${3 - i}px solid ${col}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `ult-heal-pulse 0.9s ease-out ${ms}ms forwards`,
                boxShadow: `0 0 24px ${col}88`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              bottom: "22%",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 20,
              letterSpacing: "0.2em",
              color: col,
              textShadow: `0 0 20px ${col},0 0 40px ${col}88`,
              opacity: 0,
              animation: `ult-buff-text 1.1s ease-out 0.52s forwards`,
            }}
          >
            {ko ? "전체 HP 회복!" : ja ? "全体HP回復！" : "FULL HEAL!"}
          </div>
        </>
      );

    if (archetype === "meka")
      return (
        <>
          {[0, 130].map((ms, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 70 + i * 40,
                height: 70 + i * 40,
                border: `${3 - i}px solid ${col}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `ult-ring 0.55s ease-out ${ms}ms forwards`,
                boxShadow: `0 0 20px ${col}`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              top: "48%",
              left: "-5%",
              width: "110%",
              height: 6,
              background: `linear-gradient(90deg,transparent,${col}88,#fff,${col}88,transparent)`,
              boxShadow: `0 0 28px ${col},0 0 50px ${col}66`,
              opacity: 0.9,
              animation: `ult-laser-beam 1.0s ease-out 0.22s forwards`,
            }}
          />
          {[-28, 28].map((offset, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `calc(48% + ${offset}px)`,
                left: "-5%",
                width: "110%",
                height: 2,
                background: `linear-gradient(90deg,transparent,${col}44,${col}77,${col}44,transparent)`,
                opacity: 0.9,
                animation: `ult-laser-beam 0.8s ease-out ${0.32 + i * 0.1}s forwards`,
              }}
            />
          ))}
        </>
      );

    if (archetype === "cursed")
      return (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(ellipse at center,${dark}99 0%,rgba(0,0,0,0.7) 100%)`,
              opacity: 0,
              animation: `ult-dark-in 1.6s ease-in-out forwards`,
            }}
          />
          {curseDrops.map((c, i) => (
            <div
              key={i}
              style={
                {
                  position: "absolute",
                  top: 0,
                  left: `calc(50% + ${c.lx}px)`,
                  opacity: 0,
                  animation: `ult-curse-drop 1.0s ease-in ${c.delay} forwards`,
                  "--crot": c.crot,
                  userSelect: "none",
                } as React.CSSProperties
              }
            >
              <c.Icon
                size={c.size}
                color={col}
                style={{ filter: `drop-shadow(0 0 12px ${col}) drop-shadow(0 0 24px ${col}88)` }}
              />
            </div>
          ))}
          {[0, 250].map((ms, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 130 + i * 40,
                height: 130 + i * 40,
                border: `2px solid ${col}`,
                borderRadius: "50%",
                opacity: 0,
                animation: `ult-ring 1.0s ease-out ${ms}ms forwards`,
                boxShadow: `0 0 28px ${col}88`,
              }}
            />
          ))}
        </>
      );

    if (archetype === "rogue")
      return (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.78)",
              opacity: 0,
              animation: `ult-dark-in 1.6s ease-in-out forwards`,
            }}
          />
          {daggers.map((d, i) => (
            <div
              key={i}
              style={
                {
                  position: "absolute",
                  width: 40,
                  height: 5,
                  background: `linear-gradient(90deg,transparent,${col}66,${col},#fff)`,
                  borderRadius: 3,
                  boxShadow: `0 0 12px ${col}`,
                  opacity: 0,
                  animation: `ult-dagger-fly 0.92s ease-in ${d.delay} forwards`,
                  "--dagx": d.dagx,
                  "--dagy": d.dagy,
                  "--dagr": d.dagr,
                } as React.CSSProperties
              }
            />
          ))}
          <div
            style={{
              position: "absolute",
              width: 24,
              height: 24,
              background: col,
              borderRadius: "50%",
              boxShadow: `0 0 40px ${col},0 0 80px ${col}88`,
              opacity: 0,
              animation: `ult-flash 0.4s ease-out 0.52s forwards`,
            }}
          />
        </>
      );

    // "all" archetype — generic
    return (
      <>
        {[0, 180, 380].map((ms, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              border: `${i === 0 ? 3 : 2}px solid ${col}`,
              borderRadius: "50%",
              opacity: 0,
              animation: `ult-ring 1.0s ease-out ${ms}ms forwards`,
              boxShadow: `0 0 20px ${col}66`,
            }}
          />
        ))}
        {slashLines.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: s.top,
              left: "-5%",
              width: "110%",
              height: s.h,
              background: `linear-gradient(90deg,transparent 0%,${col}99 30%,${col} 50%,${col}99 70%,transparent 100%)`,
              transform: "skewX(-18deg)",
              opacity: 0,
              animation: `ult-slash 0.55s ease-out ${s.delay} forwards`,
              boxShadow: `0 0 14px ${col}88`,
            }}
          />
        ))}
        {particles.map((p, i) => (
          <div
            key={i}
            style={
              {
                position: "absolute",
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: col,
                boxShadow: `0 0 ${p.size * 2}px ${col}`,
                opacity: 0,
                animation: `ult-particle 0.75s ease-out ${p.delay} forwards`,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* 배경 그라데이션 페이드인/아웃 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 50%,${dark}ee 0%,rgba(0,0,0,0.97) 70%)`,
          animation: "ult-vignette 1.6s ease-in-out forwards",
          opacity: 0,
        }}
      />

      {/* 직업별 이펙트 */}
      {renderEffects()}

      {/* 텍스트 중앙 */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "0 24px",
        }}
      >
        {actor && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
              animation: "ult-sub 0.4s ease-out 0.1s both",
              opacity: 0,
            }}
          >
            <div
              style={{
                padding: 10,
                borderRadius: "50%",
                background: `radial-gradient(circle,${col}33 0%,transparent 70%)`,
                boxShadow: `0 0 32px ${col}66`,
                animation: "col-idle-bob 2s ease-in-out infinite",
              }}
            >
              <PixelSprite
                type={actor.type as CharacterType}
                rarity={actor.rarity as CharacterRarity}
                size={72}
              />
            </div>
          </div>
        )}
        <p
          style={{
            fontFamily: "'Courier New',monospace",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.55em",
            color: `${col}cc`,
            margin: "0 0 10px",
            textTransform: "uppercase",
            animation: "ult-sub 0.4s ease-out 0.18s both",
            opacity: 0,
          }}
        >
          {actorTeam === "attacker"
            ? ko
              ? "[ 공격팀 ]"
              : ja
                ? "[ 攻撃チーム ]"
                : "[ ATTACK ]"
            : ko
              ? "[ 방어팀 ]"
              : ja
                ? "[ 防御チーム ]"
                : "[ DEFENSE ]"}
          &nbsp;&nbsp;{ko ? pal.labelKo : ja ? pal.labelJa : pal.labelEn}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: "0.35em",
            color: col,
            margin: "0 0 6px",
            animation: "ult-sub 0.35s ease-out 0.25s both",
            opacity: 0,
          }}
        >
          {ko ? "── 궁극기 ──" : ja ? "── 奥義 ──" : "── ULTIMATE ──"}
        </p>
        <p
          style={{
            fontFamily: FONT,
            fontSize: 46,
            fontWeight: 900,
            color: "#fff",
            margin: "0 0 6px",
            letterSpacing: "0.04em",
            textShadow: `0 0 18px ${col},0 0 40px ${col},0 0 80px ${col}66,2px 2px 0 ${dark}`,
            animation:
              "ult-title 0.55s cubic-bezier(0.175,0.885,0.32,1.275) 0.3s both",
            opacity: 0,
            lineHeight: 1.1,
          }}
        >
          {
            (ARCHETYPE_ULT_NAME[archetype] ?? ARCHETYPE_ULT_NAME.all)[
              ko ? "ko" : ja ? "ja" : "en"
            ]
          }
        </p>
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(90deg,transparent,${col},transparent)`,
            boxShadow: `0 0 14px ${col}`,
            margin: "10px auto 0",
            opacity: 0,
            animation: `ult-line-grow 0.6s ease-out 0.55s both`,
            maxWidth: 280,
          }}
        />
      </div>

      {/* 임팩트 플래시 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center,${col}88 0%,transparent 70%)`,
          opacity: 0,
          animation: `ult-flash 0.45s ease-out 0.65s forwards`,
          zIndex: 2,
        }}
      />
    </div>
  );
}

const SKILL_COLOR: Record<string, string> = {
  s1: "#e2e8f0",
  s2: "#60a5fa",
  s3: "#ffd700",
  passive: "#a78bfa",
  dot: "#c084fc",
};
const SKILL_LABEL: Record<string, Record<string, string>> = {
  ko: {
    s1: "기본기",
    s2: "스킬",
    s3: "궁극기",
    passive: "패시브",
    dot: "지속피해",
  },
  ja: {
    s1: "通常攻撃",
    s2: "スキル",
    s3: "奥義",
    passive: "パッシブ",
    dot: "持続ダメージ",
  },
  en: {
    s1: "Basic",
    s2: "Skill",
    s3: "Ultimate",
    passive: "Passive",
    dot: "DoT",
  },
};

// ─── 버프/디버프 표시 정의 ─────────────────────────────────────────────────────
const BUFF_META: Record<string, { label: string; color: string; bg: string }> =
  {
    attack_up: { label: "ATK↑", color: "#fbbf24", bg: "#78350f" },
    defense_up: { label: "DEF↑", color: "#60a5fa", bg: "#1e3a5f" },
    speed_up: { label: "SPD↑", color: "#a78bfa", bg: "#2e1065" },
    barrier: { label: "배리어", color: "#93c5fd", bg: "#1e3a5f" },
    immune: { label: "면역", color: "#e2e8f0", bg: "#374151" },
    counter: { label: "반격", color: "#f97316", bg: "#7c2d12" },
    revive: { label: "부활", color: "#fbbf24", bg: "#713f12" },
    recovery: { label: "재생", color: "#4ade80", bg: "#14532d" },
    cr_boost: { label: "CR↑", color: "#c084fc", bg: "#4a1d96" },
  };
const DEBUFF_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  defense_break: { label: "방파", color: "#f87171", bg: "#7f1d1d" },
  attack_down: { label: "ATK↓", color: "#fca5a5", bg: "#7f1d1d" },
  speed_down: { label: "SPD↓", color: "#fb923c", bg: "#7c2d12" },
  stun: { label: "기절", color: "#fbbf24", bg: "#713f12" },
  silence: { label: "침묵", color: "#94a3b8", bg: "#1e293b" },
  sleep: { label: "수면", color: "#818cf8", bg: "#1e1b4b" },
  provoke: { label: "도발", color: "#f87171", bg: "#7f1d1d" },
  restrict: { label: "봉인", color: "#fb923c", bg: "#7c2d12" },
  blind: { label: "실명", color: "#9ca3af", bg: "#1f2937" },
  burn: { label: "화상", color: "#fb923c", bg: "#7c2d12" },
  poison: { label: "독", color: "#86efac", bg: "#14532d" },
  bleed: { label: "출혈", color: "#f87171", bg: "#7f1d1d" },
  bomb: { label: "폭탄", color: "#fbbf24", bg: "#713f12" },
  unhealable: { label: "회불", color: "#f87171", bg: "#7f1d1d" },
};

const ArenaBg = React.memo(function ArenaBg() {
  const crowd = (ox: number, oy: number, ow: number, oh: number) => {
    const els: React.ReactNode[] = [];
    const pw = 4,
      ph = 6,
      gx = 2,
      gy = 2;
    const cols = Math.floor(ow / (pw + gx));
    const rows = Math.floor(oh / (ph + gy));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offX = r % 2 === 1 ? (pw + gx) / 2 : 0;
        const x = ox + c * (pw + gx) + offX;
        const y = oy + r * (ph + gy);
        if (x + pw > ox + ow) continue;
        const op = 0.18 + (r / Math.max(rows - 1, 1)) * 0.55;
        const v = 20 + r * 4;
        els.push(
          <g key={`${r}-${c}`} opacity={op}>
            <rect
              x={x + 1}
              y={y}
              width={pw - 2}
              height={2}
              fill={`rgb(${v},${Math.round(v * 0.7)},${Math.round(v * 0.4)})`}
            />
            <rect
              x={x}
              y={y + 2}
              width={pw}
              height={ph - 2}
              fill={`rgb(${v},${Math.round(v * 0.65)},${Math.round(v * 0.35)})`}
            />
          </g>,
        );
      }
    }
    return els;
  };

  return (
    <svg
      viewBox="0 0 320 480"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        <pattern
          id="ap-fl"
          x="0"
          y="0"
          width="32"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect width="32" height="20" fill="#1e1508" />
          <rect x="1" y="1" width="30" height="18" fill="#2c1e0e" />
          <rect
            x="1"
            y="1"
            width="13"
            height="8"
            fill="#342412"
            opacity="0.8"
          />
          <rect
            x="16"
            y="11"
            width="14"
            height="7"
            fill="#281a0a"
            opacity="0.9"
          />
          <rect x="30" y="0" width="2" height="20" fill="#1e1508" />
          <rect x="0" y="18" width="32" height="2" fill="#1e1508" />
        </pattern>
        <pattern
          id="ap-br"
          x="0"
          y="0"
          width="32"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <rect width="32" height="12" fill="#1c1008" />
          <rect x="1" y="1" width="29" height="5" fill="#3a2810" />
          <rect x="17" y="7" width="14" height="4" fill="#362410" />
          <rect x="0" y="7" width="15" height="4" fill="#362410" />
          <rect x="31" y="0" width="1" height="12" fill="#1c1008" />
          <rect x="0" y="11" width="32" height="1" fill="#1c1008" />
        </pattern>
        <pattern
          id="ap-st"
          x="0"
          y="0"
          width="40"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <rect width="40" height="16" fill="#1a1208" />
          <rect x="1" y="1" width="37" height="7" fill="#2c1e0c" />
          <rect x="21" y="9" width="18" height="6" fill="#281a0a" />
          <rect x="0" y="9" width="19" height="6" fill="#261808" />
          <rect x="39" y="0" width="1" height="16" fill="#1a1208" />
          <rect x="0" y="15" width="40" height="1" fill="#1a1208" />
        </pattern>
        <radialGradient id="ap-ag" cx="25%" cy="65%" r="55%">
          <stop offset="0%" stopColor="#1e50b4" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#1e50b4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ap-dg" cx="75%" cy="65%" r="55%">
          <stop offset="0%" stopColor="#b41e1e" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#b41e1e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ap-vig" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="ap-cg" cx="50%" cy="58%" r="50%">
          <stop offset="0%" stopColor="#c8a44a" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#c8a44a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── 천장 / 하늘 (y 0–72) ── */}
      <rect width="320" height="72" fill="#07050a" />
      <line x1="0" y1="0" x2="160" y2="70" stroke="#16101a" strokeWidth="3" />
      <line x1="320" y1="0" x2="160" y2="70" stroke="#16101a" strokeWidth="3" />
      <line
        x1="107"
        y1="0"
        x2="160"
        y2="70"
        stroke="#120e16"
        strokeWidth="1.5"
      />
      <line
        x1="213"
        y1="0"
        x2="160"
        y2="70"
        stroke="#120e16"
        strokeWidth="1.5"
      />
      {(
        [
          [18, 8, 2, 0],
          [42, 5, 1, 1],
          [70, 14, 1, 0],
          [95, 7, 2, 1],
          [130, 17, 1, 0],
          [162, 4, 2, 1],
          [197, 10, 1, 0],
          [222, 6, 2, 1],
          [256, 13, 1, 0],
          [290, 8, 2, 1],
          [312, 19, 1, 0],
          [30, 26, 1, 0],
          [68, 21, 2, 1],
          [107, 29, 1, 0],
          [152, 24, 2, 1],
          [192, 18, 1, 0],
          [242, 25, 2, 1],
          [277, 21, 1, 0],
          [305, 30, 2, 1],
          [55, 38, 1, 0],
          [122, 34, 2, 1],
          [182, 41, 1, 0],
          [263, 37, 2, 1],
          [308, 44, 1, 1],
        ] as [number, number, number, number][]
      ).map(([x, y, s, gold], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={s}
          height={s}
          fill={gold ? "#c8a44a" : "#ffffff"}
          opacity={0.28 + (i % 4) * 0.14}
        />
      ))}
      {/* 달 */}
      <rect x="148" y="12" width="2" height="2" fill="#fff6d8" opacity="0.5" />
      <rect x="146" y="14" width="8" height="8" fill="#fff6d8" opacity="0.5" />
      <rect x="144" y="16" width="12" height="4" fill="#fff6d8" opacity="0.5" />
      <rect x="146" y="20" width="8" height="2" fill="#fff6d8" opacity="0.5" />
      <rect x="148" y="22" width="4" height="2" fill="#fff6d8" opacity="0.5" />
      <ellipse cx="152" cy="17" rx="20" ry="13" fill="#fffae0" opacity="0.03" />

      {/* ── 관람석 (y 72–160) ── */}
      <rect x="0" y="72" width="320" height="88" fill="url(#ap-br)" />
      {/* 3개 아치 개구부 — 필라: 0–16, 102–118, 204–220, 306–320 */}
      <rect x="16" y="82" width="84" height="78" fill="#08060b" />
      <rect x="118" y="82" width="84" height="78" fill="#08060b" />
      <rect x="220" y="82" width="84" height="78" fill="#08060b" />
      {/* 아치 상단 픽셀 곡선 (좌우 계단) */}
      {([16, 118, 220] as number[]).map((ax) => [
        <rect
          key={`a${ax}1`}
          x={ax}
          y="82"
          width="84"
          height="2"
          fill="#201608"
        />,
        <rect
          key={`a${ax}2`}
          x={ax}
          y="84"
          width="4"
          height="5"
          fill="#201608"
        />,
        <rect
          key={`a${ax}3`}
          x={ax + 80}
          y="84"
          width="4"
          height="5"
          fill="#201608"
        />,
        <rect
          key={`a${ax}4`}
          x={ax + 2}
          y="89"
          width="2"
          height="3"
          fill="#201608"
        />,
        <rect
          key={`a${ax}5`}
          x={ax + 80}
          y="89"
          width="2"
          height="3"
          fill="#201608"
        />,
      ])}
      {/* 군중 실루엣 */}
      {crowd(20, 93, 76, 63)}
      {crowd(122, 93, 76, 63)}
      {crowd(224, 93, 76, 63)}
      {/* 필라 어두운 오버레이 */}
      <rect x="0" y="72" width="16" height="88" fill="rgba(0,0,0,0.48)" />
      <rect x="102" y="72" width="16" height="88" fill="rgba(0,0,0,0.48)" />
      <rect x="204" y="72" width="16" height="88" fill="rgba(0,0,0,0.48)" />
      <rect x="304" y="72" width="16" height="88" fill="rgba(0,0,0,0.48)" />
      {/* 필라 하이라이트 선 */}
      <rect x="0" y="72" width="1" height="88" fill="#6a4c1e" opacity="0.35" />
      <rect
        x="102"
        y="72"
        width="1"
        height="88"
        fill="#6a4c1e"
        opacity="0.35"
      />
      <rect
        x="204"
        y="72"
        width="1"
        height="88"
        fill="#6a4c1e"
        opacity="0.35"
      />

      {/* ── 아레나 장벽 (y 160–220) ── */}
      <rect x="0" y="160" width="320" height="60" fill="url(#ap-st)" />
      <rect x="0" y="160" width="320" height="2" fill="#6a4c1e" />
      <rect x="0" y="162" width="320" height="1" fill="#8a6428" />
      <rect x="0" y="178" width="320" height="2" fill="#5a4018" />
      <rect x="0" y="180" width="320" height="1" fill="#7a5828" />
      <rect x="0" y="217" width="320" height="2" fill="#6a4c1e" />
      <rect x="0" y="219" width="320" height="1" fill="#3a2810" />

      {/* ── 아레나 바닥 (y 220–480) ── */}
      <rect x="0" y="220" width="320" height="260" fill="url(#ap-fl)" />
      <rect x="0" y="220" width="20" height="260" fill="rgba(0,0,0,0.38)" />
      <rect x="300" y="220" width="20" height="260" fill="rgba(0,0,0,0.38)" />
      <rect x="0" y="220" width="160" height="260" fill="url(#ap-ag)" />
      <rect x="160" y="220" width="160" height="260" fill="url(#ap-dg)" />
      {/* 균열 */}
      <line
        x1="58"
        y1="248"
        x2="76"
        y2="268"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.7"
      />
      <line
        x1="76"
        y1="268"
        x2="70"
        y2="278"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="250"
        y1="295"
        x2="266"
        y2="314"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.7"
      />
      <line
        x1="138"
        y1="375"
        x2="156"
        y2="398"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.6"
      />
      <line
        x1="94"
        y1="338"
        x2="106"
        y2="348"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.45"
      />
      <line
        x1="208"
        y1="255"
        x2="220"
        y2="265"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.5"
      />
      <line
        x1="176"
        y1="420"
        x2="185"
        y2="435"
        stroke="#140e06"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* ── 횃불 (왼쪽) ── */}
      <rect x="7" y="195" width="6" height="10" fill="#5a4020" />
      <rect x="5" y="198" width="10" height="2" fill="#7a5828" />
      <rect x="8" y="189" width="4" height="8" fill="#4a3418" />
      <rect x="8" y="181" width="4" height="8" fill="#d44010">
        <animate
          attributeName="height"
          values="8;6;9;7;8;6;8"
          dur="0.85s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="181;183;180;182;181;183;181"
          dur="0.85s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="9" y="176" width="2" height="5" fill="#f8b030">
        <animate
          attributeName="height"
          values="5;4;6;5;4;5"
          dur="0.72s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="176;177;175;176;177;176"
          dur="0.72s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="x"
          values="9;10;9;8;9;10;9"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </rect>
      <ellipse cx="10" cy="182" rx="15" ry="11" fill="#f86010" opacity="0.09">
        <animate
          attributeName="opacity"
          values="0.09;0.06;0.13;0.08;0.10;0.09"
          dur="1.0s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="10" cy="182" rx="5" ry="4" fill="#f8b030" opacity="0.18">
        <animate
          attributeName="opacity"
          values="0.18;0.12;0.22;0.15;0.18"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </ellipse>

      {/* ── 횃불 (오른쪽) ── */}
      <rect x="307" y="195" width="6" height="10" fill="#5a4020" />
      <rect x="305" y="198" width="10" height="2" fill="#7a5828" />
      <rect x="308" y="189" width="4" height="8" fill="#4a3418" />
      <rect x="308" y="181" width="4" height="8" fill="#d44010">
        <animate
          attributeName="height"
          values="7;9;8;6;8;9;7"
          dur="0.92s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="182;180;181;183;181;180;182"
          dur="0.92s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="309" y="176" width="2" height="5" fill="#f8b030">
        <animate
          attributeName="height"
          values="4;6;5;4;5;6;4"
          dur="0.76s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="177;175;176;177;176;175;177"
          dur="0.76s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="x"
          values="309;310;309;308;309;310;309"
          dur="0.88s"
          repeatCount="indefinite"
        />
      </rect>
      <ellipse cx="310" cy="182" rx="15" ry="11" fill="#f86010" opacity="0.09">
        <animate
          attributeName="opacity"
          values="0.07;0.12;0.09;0.06;0.10;0.07"
          dur="1.1s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="310" cy="182" rx="5" ry="4" fill="#f8b030" opacity="0.18">
        <animate
          attributeName="opacity"
          values="0.14;0.20;0.16;0.12;0.18;0.14"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </ellipse>

      {/* ── 횃불 (중앙 황금) ── */}
      <rect x="157" y="174" width="6" height="10" fill="#5a4020" />
      <rect x="155" y="177" width="10" height="2" fill="#7a5828" />
      <rect x="158" y="168" width="4" height="8" fill="#4a3418" />
      <rect x="158" y="160" width="4" height="8" fill="#c87020">
        <animate
          attributeName="height"
          values="8;6;9;7;8;6;8"
          dur="1.1s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="160;162;159;161;160;162;160"
          dur="1.1s"
          repeatCount="indefinite"
        />
      </rect>
      <rect x="159" y="155" width="2" height="5" fill="#ffe050">
        <animate
          attributeName="height"
          values="5;4;6;5;4;5"
          dur="0.9s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="y"
          values="155;156;154;155;156;155"
          dur="0.9s"
          repeatCount="indefinite"
        />
      </rect>
      <ellipse cx="160" cy="162" rx="20" ry="13" fill="#c8a44a" opacity="0.11">
        <animate
          attributeName="opacity"
          values="0.11;0.07;0.16;0.09;0.12;0.11"
          dur="1.3s"
          repeatCount="indefinite"
        />
      </ellipse>
      <ellipse cx="160" cy="162" rx="6" ry="4" fill="#ffe050" opacity="0.22">
        <animate
          attributeName="opacity"
          values="0.22;0.15;0.28;0.17;0.22"
          dur="1.0s"
          repeatCount="indefinite"
        />
      </ellipse>

      {/* 전역 오버레이 */}
      <rect width="320" height="480" fill="url(#ap-cg)" />
      <rect width="320" height="480" fill="url(#ap-vig)" />
    </svg>
  );
});

export default function BattleReplay({
  result,
  onDone,
}: {
  result: BattleResult;
  onDone: () => void;
}) {
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const skillLang = SKILL_LABEL[lang] ?? SKILL_LABEL.ko;
  const { log, attackerChars, defenderChars } = result;

  type FloatNum = {
    id: number;
    val: number;
    team: "attacker" | "defender";
    slot: number;
    color: string;
    prefix: string;
  };
  type StatusFlt = {
    id: number;
    text: string;
    color: string;
    team: "attacker" | "defender";
    slot: number;
  };
  type LogEntry = { id: number; text: string; color: string; icon: string };

  const [step, setStep] = useState(-1);
  const [speed, setSpeed] = useState(700);
  const [hitSlots, setHitSlots] = useState<Set<string>>(new Set());
  const [attackSlots, setAttackSlots] = useState<Set<string>>(new Set());
  const [floatNums, setFloatNums] = useState<FloatNum[]>([]);
  const [statusFloats, setStatusFloats] = useState<StatusFlt[]>([]);
  const [affinityRings, setAffinityRings] = useState<
    Array<{ id: number; team: "attacker" | "defender"; slot: number }>
  >([]);
  const [skillBanner, setSkillBanner] = useState<{
    name: string;
    type: string;
  } | null>(null);
  const [s2Anim, setS2Anim] = useState<{
    archetype: string;
    actorTeam: "attacker" | "defender";
  } | null>(null);
  const [ultimateAnim, setUltimateAnim] = useState<{
    skillName: string;
    archetype: string;
    actorTeam: "attacker" | "defender";
    charId?: number;
  } | null>(null);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // 현재 HP — hits 배열의 모든 타겟 처리
  const hpState = useCallback(
    (upTo: number) => {
      const hp: Record<string, number> = {};
      for (const c of attackerChars) hp[`a${c.slot}`] = c.maxHp;
      for (const c of defenderChars) hp[`d${c.slot}`] = c.maxHp;
      for (let i = 0; i <= upTo && i < log.length; i++) {
        const ev = log[i];
        const allHits: Array<{
          targetTeam: string;
          targetSlot: number;
          hpAfter: number;
        }> = ev.hits?.length
          ? ev.hits
          : [
              {
                targetTeam: ev.targetTeam,
                targetSlot: ev.targetSlot,
                hpAfter: ev.targetHpAfter,
              },
            ];
        for (const h of allHits) {
          hp[`${h.targetTeam === "attacker" ? "a" : "d"}${h.targetSlot}`] =
            h.hpAfter;
        }
      }
      return hp;
    },
    [log, attackerChars, defenderChars],
  );

  const applyHitFx = useCallback((ev: BattleEvent, isUlt: boolean) => {
    const allHits: HitDetail[] = ev.hits?.length
      ? ev.hits
      : [
          {
            targetTeam: ev.targetTeam,
            targetSlot: ev.targetSlot,
            damage: ev.damage,
            healed: ev.healed ?? 0,
            hpAfter: ev.targetHpAfter,
            alive: ev.targetAlive,
          },
        ];
    const hitSet = new Set<string>();
    const newFloats: FloatNum[] = [];
    const newStatusFlt: StatusFlt[] = [];
    const newRings: Array<{
      id: number;
      team: "attacker" | "defender";
      slot: number;
    }> = [];

    for (const h of allHits) {
      if (h.damage > 0) {
        hitSet.add(`${h.targetTeam}-${h.targetSlot}`);
        const col = isUlt
          ? "#ffd700"
          : ev.skillType === "dot"
            ? "#c084fc"
            : h.targetTeam === "attacker"
              ? "#f87171"
              : "#60a5fa";
        if (h.isCrit) {
          newFloats.push({
            id: Date.now() + Math.random(),
            val: 0,
            team: h.targetTeam,
            slot: h.targetSlot,
            color: "#ffd700",
            prefix: "CRIT!",
          });
        }
        if (h.affinity === "advantage") {
          newRings.push({
            id: Date.now() + Math.random(),
            team: h.targetTeam,
            slot: h.targetSlot,
          });
        }
        const prefix = h.affinity === "advantage" ? "◆-" : "-";
        newFloats.push({
          id: Date.now() + Math.random() + 0.1,
          val: h.damage,
          team: h.targetTeam,
          slot: h.targetSlot,
          color: h.isCrit ? "#ffd700" : col,
          prefix,
        });
        if (h.barrierDmg && h.barrierDmg > 0) {
          newFloats.push({
            id: Date.now() + Math.random() + 0.2,
            val: h.barrierDmg,
            team: h.targetTeam,
            slot: h.targetSlot,
            color: "#60a5fa",
            prefix: "B-",
          });
        }
      }
      if (h.healed > 0) {
        newFloats.push({
          id: Date.now() + Math.random(),
          val: h.healed,
          team: h.targetTeam,
          slot: h.targetSlot,
          color: "#4ade80",
          prefix: "+",
        });
      }
    }

    // 버프/디버프 없는 스킬 아이콘
    if (!isUlt && ev.skillType !== "s1" && ev.actorSlot >= 0) {
      const hasEffect = allHits.some((h) => h.damage > 0 || h.healed > 0);
      if (!hasEffect) {
        const isHealSkill =
          ev.skillName.includes("치유") ||
          ev.skillName.includes("자연") ||
          ev.skillName.includes("회복") ||
          ev.skillName.includes("힘");
        newFloats.push({
          id: Date.now() + Math.random(),
          val: 0,
          team: ev.actorTeam,
          slot: ev.actorSlot,
          color: isHealSkill ? "#4ade80" : "#60a5fa",
          prefix: isHealSkill ? "HEAL_ICON" : "SKILL_ICON",
        });
      }
    }

    // 상태 효과 변화 플로팅 (Phase 4)
    if (ev.statusChanges?.length) {
      for (const sc of ev.statusChanges) {
        if (sc.action === "apply") {
          const isBuff = !!BUFF_META[sc.type];
          const meta = isBuff ? BUFF_META[sc.type] : DEBUFF_META[sc.type];
          if (meta) {
            newStatusFlt.push({
              id: Date.now() + Math.random(),
              text: `${meta.label} ${sc.duration}턴`,
              color: meta.color,
              team: sc.team,
              slot: sc.slot,
            });
          }
        }
      }
    }

    // 이벤트 로그 항목 (Phase 4)
    const actorLabel = ev.actorTeam === "attacker" ? "Atk" : "Def";
    const totalDmg = allHits.reduce((s, h) => s + h.damage, 0);
    const totalHeal = allHits.reduce((s, h) => s + h.healed, 0);
    const hasCrit = allHits.some((h) => h.isCrit);
    const logText =
      totalDmg > 0
        ? `[${actorLabel}] ${ev.skillName}${hasCrit ? " CRIT" : ""} → ${totalDmg.toLocaleString()} 피해`
        : totalHeal > 0
          ? `[${actorLabel}] ${ev.skillName} → ${totalHeal.toLocaleString()} 회복`
          : `[${actorLabel}] ${ev.skillName}`;
    const logCol =
      ev.skillType === "s3"
        ? "#ffd700"
        : ev.skillType === "dot"
          ? "#c084fc"
          : totalHeal > 0
            ? "#4ade80"
            : "#e2e8f0";
    const logIcon =
      ev.skillType === "s3"
        ? "s3"
        : ev.skillType === "s2"
          ? "s2"
          : ev.skillType === "dot"
            ? "dot"
            : "·";
    setEventLog((p) => [
      ...p.slice(-29),
      {
        id: Date.now() + Math.random(),
        text: logText,
        color: logCol,
        icon: logIcon,
      },
    ]);

    // 타격모션: 공격자 스윙 즉시 시작
    if (ev.actorSlot >= 0) {
      const actorKey = `${ev.actorTeam}-${ev.actorSlot}`;
      setAttackSlots(new Set([actorKey]));
      setTimeout(() => setAttackSlots(new Set()), 450);
    }

    // 피격모션: 스윙 후 딜레이
    const hitDelay = Math.min(180, speedRef.current * 0.25);
    setTimeout(() => {
      setHitSlots(hitSet);
      setTimeout(() => setHitSlots(new Set()), 380);
      setFloatNums((p) => [...p.slice(-12), ...newFloats]);
      newFloats.forEach((n) =>
        setTimeout(
          () => setFloatNums((p) => p.filter((d) => d.id !== n.id)),
          900,
        ),
      );

      if (newStatusFlt.length) {
        setStatusFloats((p) => [...p.slice(-8), ...newStatusFlt]);
        newStatusFlt.forEach((n) =>
          setTimeout(
            () => setStatusFloats((p) => p.filter((d) => d.id !== n.id)),
            1400,
          ),
        );
      }
      if (newRings.length) {
        setAffinityRings((p) => [...p, ...newRings]);
        newRings.forEach((r) =>
          setTimeout(
            () => setAffinityRings((p) => p.filter((d) => d.id !== r.id)),
            600,
          ),
        );
      }
    }, hitDelay);
  }, []);

  // 자동 재생
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setStep((prev) => {
        if (prev + 1 >= log.length) {
          clearInterval(intervalRef.current!);
          setTimeout(onDone, 800);
          return prev;
        }
        const ev = log[prev + 1];
        const isUlt = ev.skillType === "s3" && ev.actorSlot >= 0;
        const isSkill = ev.skillType === "s2" && ev.actorSlot >= 0;

        if (isUlt) {
          const actorInfo = (
            ev.actorTeam === "attacker" ? attackerChars : defenderChars
          ).find((c) => c.slot === ev.actorSlot);
          setUltimateAnim({
            skillName: ev.skillName,
            archetype: actorInfo?.archetype ?? "all",
            actorTeam: ev.actorTeam,
            charId: actorInfo?.charId,
          });
          pausedRef.current = true;
          setTimeout(() => applyHitFx(ev, true), 650);
        } else {
          if (ev.actorSlot >= 0 && ev.skillType !== "s1") {
            setSkillBanner({ name: ev.skillName, type: ev.skillType });
            setTimeout(() => setSkillBanner(null), Math.max(500, speed - 100));
          }
          // S2 미니 애니메이션 (Phase 5)
          if (isSkill) {
            const actorInfo = (
              ev.actorTeam === "attacker" ? attackerChars : defenderChars
            ).find((c) => c.slot === ev.actorSlot);
            setS2Anim({
              archetype: actorInfo?.archetype ?? "all",
              actorTeam: ev.actorTeam,
            });
            setTimeout(() => setS2Anim(null), 500);
          }
          applyHitFx(ev, false);
        }

        return prev + 1;
      });
    }, speed);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speed, log, onDone, attackerChars, defenderChars, applyHitFx]);

  const handleUltimateEnd = useCallback(() => {
    setUltimateAnim(null);
    pausedRef.current = false;
  }, []);

  const currentStep = Math.max(0, step);
  const hp = hpState(currentStep);
  const crs =
    step >= 0 && step < log.length
      ? log[step].crs
      : [...attackerChars, ...defenderChars].map((c) => ({
          team: (attackerChars.includes(c) ? "attacker" : "defender") as
            | "attacker"
            | "defender",
          slot: c.slot,
          cr: 0,
          alive: true,
          buffs: [],
          debuffs: [],
        }));
  const activeActor =
    step >= 0 && step < log.length && log[step].actorSlot >= 0
      ? { team: log[step].actorTeam, slot: log[step].actorSlot }
      : null;

  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pausedRef.current = false;
    setUltimateAnim(null);
    setAttackSlots(new Set());
    setHitSlots(new Set());
    setStep(log.length - 1);
    setTimeout(onDone, 300);
  };

  const speedBtns = [
    { label: "×1", v: 700 },
    { label: "×2", v: 350 },
    { label: "×3", v: 180 },
  ];

  // 아레나 캐릭터 배치 좌표 (slot 0-1=전열·중앙, slot 2-3=후열·바깥)
  const ATK_POS: React.CSSProperties[] = [
    { left: "30%", top: "14%" }, // slot 0 — 전열
    { left: "28%", top: "55%" }, // slot 1 — 전열
    { left: "7%", top: "8%" }, // slot 2 — 후열
    { left: "7%", top: "62%" }, // slot 3 — 후열
  ];
  const DEF_POS: React.CSSProperties[] = [
    { right: "30%", top: "14%" }, // slot 0 — 전열
    { right: "28%", top: "55%" }, // slot 1 — 전열
    { right: "7%", top: "8%" }, // slot 2 — 후열
    { right: "7%", top: "62%" }, // slot 3 — 후열
  ];

  const renderUnit = (
    info: CharInfo,
    teamKey: "attacker" | "defender",
    posStyle: React.CSSProperties,
  ) => {
    const isAtk = teamKey === "attacker";
    const key = `${isAtk ? "a" : "d"}${info.slot}`;
    const hitKey = `${teamKey}-${info.slot}`;
    const isDead = hp[key] === 0;
    const isHit = hitSlots.has(hitKey);
    const isAtking = attackSlots.has(hitKey);
    const isAct =
      activeActor?.team === teamKey && activeActor.slot === info.slot;
    const snap = crs.find((c) => c.team === teamKey && c.slot === info.slot);
    return (
      <div
        key={`${teamKey}-${info.slot}`}
        style={{ position: "absolute", ...posStyle }}
      >
        <UnitCard
          info={info}
          hp={hp[key] ?? info.maxHp}
          isActive={isAct}
          isHit={isHit}
          isDead={isDead}
          isPlayer={isAtk}
          isAttacking={isAtking}
          buffs={snap?.buffs}
          debuffs={snap?.debuffs}
        />
        {floatNums
          .filter((d) => d.team === teamKey && d.slot === info.slot)
          .map((d) => (
            <div
              key={d.id}
              style={{
                position: "absolute",
                top: -8,
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: 15,
                color: d.color,
                pointerEvents: "none",
                animation: "col-dmg-up 0.9s ease-out forwards",
                textShadow: `0 0 8px ${d.color}`,
                whiteSpace: "nowrap",
              }}
            >
              {renderFloatContent(d.prefix, d.val, d.color)}
            </div>
          ))}
        {statusFloats
          .filter((d) => d.team === teamKey && d.slot === info.slot)
          .map((d) => (
            <div
              key={d.id}
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 9,
                color: d.color,
                pointerEvents: "none",
                animation: "status-float 1.4s ease-out forwards",
                background: "rgba(0,0,0,0.65)",
                borderRadius: 3,
                padding: "2px 5px",
                border: `1px solid ${d.color}55`,
                whiteSpace: "nowrap",
                zIndex: 10,
              }}
            >
              {d.text}
            </div>
          ))}
        {affinityRings
          .filter((r) => r.team === teamKey && r.slot === info.slot)
          .map((r) => (
            <div
              key={r.id}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 60,
                height: 60,
                marginTop: -30,
                marginLeft: -30,
                borderRadius: "50%",
                border: "2px solid #ffd700",
                pointerEvents: "none",
                animation: "affinity-ring 0.6s ease-out forwards",
              }}
            />
          ))}
      </div>
    );
  };

  // 하단 HUD용 활성 캐릭터 정보
  const activeCharInfo = activeActor
    ? (activeActor.team === "attacker" ? attackerChars : defenderChars).find(
        (c) => c.slot === activeActor.slot,
      )
    : null;
  const activeHpKey = activeActor
    ? `${activeActor.team === "attacker" ? "a" : "d"}${activeActor.slot}`
    : "";
  const activeHpVal = activeCharInfo
    ? (hp[activeHpKey] ?? activeCharInfo.maxHp)
    : 0;
  const activeSnap = activeActor
    ? crs.find(
        (c) => c.team === activeActor.team && c.slot === activeActor.slot,
      )
    : null;
  const activeAccent = activeActor?.team === "attacker" ? "#60a5fa" : "#f87171";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(160deg,#050a10 0%,#080510 40%,#0a0505 70%,#050608 100%)",
        fontFamily: FONT,
      }}
    >
      <style>{CSS}</style>
      {ultimateAnim && (
        <UltimateAnim
          archetype={ultimateAnim.archetype}
          actorTeam={ultimateAnim.actorTeam}
          charId={ultimateAnim.charId}
          onEnd={handleUltimateEnd}
        />
      )}
      {s2Anim && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {[0, 1].map((i) => {
            const sc = SKILL_COLOR.s2;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 3,
                  marginTop: i === 0 ? -18 : 14,
                  background: `linear-gradient(90deg,transparent,${sc}cc 30%,${sc} 50%,${sc}cc 70%,transparent)`,
                  transform: `rotate(${i === 0 ? -12 : 8}deg)`,
                  animation: "s2-slash 0.5s ease-out forwards",
                  boxShadow: `0 0 12px ${sc}`,
                }}
              />
            );
          })}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 120,
              height: 120,
              marginTop: -60,
              marginLeft: -60,
              borderRadius: "50%",
              border: `2px solid ${SKILL_COLOR.s2}88`,
              animation: "s2-ring 0.5s ease-out forwards",
            }}
          />
        </div>
      )}

      {/* ── 상단 HUD ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "rgba(0,0,0,0.78)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #ffffff08",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* 컨트롤 */}
        <button
          onClick={skip}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 3,
            background: "rgba(30,21,8,0.9)",
            border: `1px solid ${C.borderFaint}`,
            color: C.stone,
            fontFamily: FONT,
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          <SkipForward size={11} />
          {ko ? "스킵" : ja ? "スキップ" : "Skip"}
        </button>
        {speedBtns.map((b) => (
          <button
            key={b.v}
            onClick={() => setSpeed(b.v)}
            style={{
              background:
                speed === b.v
                  ? "linear-gradient(180deg,#c8a44a,#8b6020)"
                  : "rgba(30,21,8,0.9)",
              border: `1px solid ${speed === b.v ? "#c8a44a" : "#2e1f06"}`,
              color: speed === b.v ? "#1c1101" : C.stone,
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 900,
              padding: "3px 8px",
              borderRadius: 4,
              cursor: "pointer",
              boxShadow: speed === b.v ? "0 0 8px #c8a44a44" : "none",
            }}
          >
            {b.label}
          </button>
        ))}

        {/* 중앙: 양팀 미니 HP */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {/* 공격팀 */}
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
            {attackerChars.map((info) => {
              const k = `a${info.slot}`;
              const curHp = hp[k] ?? info.maxHp;
              const pct = curHp / info.maxHp;
              const char = charById(info.charId);
              const isAct =
                activeActor?.team === "attacker" &&
                activeActor.slot === info.slot;
              const hpCol =
                pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
              return (
                <div
                  key={info.slot}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    opacity: curHp === 0 ? 0.22 : 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  <div
                    style={{
                      border: `1.5px solid ${isAct ? "#60a5fa" : "#1e3a5f"}`,
                      borderRadius: 4,
                      padding: 1,
                      background: "#061830",
                      boxShadow: isAct ? "0 0 10px #60a5fa99" : "none",
                      transition: "all 0.25s",
                    }}
                  >
                    <PixelSprite
                      type={char.type as CharacterType}
                      rarity={char.rarity as CharacterRarity}
                      size={22}
                    />
                  </div>
                  <div
                    style={{
                      width: 26,
                      height: 3,
                      background: "#0a0f1a",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: "100%",
                        background: hpCol,
                        borderRadius: 1,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* VS */}
          <span
            style={{
              fontFamily: "'Courier New',monospace",
              fontSize: 12,
              fontWeight: 900,
              color: C.gold,
              letterSpacing: "0.04em",
              textShadow: `0 0 10px ${C.gold}`,
              flexShrink: 0,
            }}
          >
            VS
          </span>

          {/* 방어팀 */}
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "flex-end",
              flexDirection: "row-reverse",
            }}
          >
            {defenderChars.map((info) => {
              const k = `d${info.slot}`;
              const curHp = hp[k] ?? info.maxHp;
              const pct = curHp / info.maxHp;
              const char = charById(info.charId);
              const isAct =
                activeActor?.team === "defender" &&
                activeActor.slot === info.slot;
              const hpCol =
                pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
              return (
                <div
                  key={info.slot}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    opacity: curHp === 0 ? 0.22 : 1,
                    transition: "opacity 0.3s",
                  }}
                >
                  <div
                    style={{
                      border: `1.5px solid ${isAct ? "#f87171" : "#4f1010"}`,
                      borderRadius: 4,
                      padding: 1,
                      background: "#180606",
                      boxShadow: isAct ? "0 0 10px #f8717199" : "none",
                      transition: "all 0.25s",
                    }}
                  >
                    <PixelSprite
                      type={char.type as CharacterType}
                      rarity={char.rarity as CharacterRarity}
                      size={22}
                    />
                  </div>
                  <div
                    style={{
                      width: 26,
                      height: 3,
                      background: "#1a0808",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: "100%",
                        background: hpCol,
                        borderRadius: 1,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 로그 + 진행 */}
        <span style={{ fontFamily: "monospace", fontSize: 9, color: C.stone }}>
          {Math.max(0, step + 1)}/{log.length}
        </span>
        <button
          onClick={() => setShowLog((p) => !p)}
          style={{
            background: showLog ? "rgba(96,165,250,0.15)" : "rgba(30,21,8,0.9)",
            border: `1px solid ${showLog ? "#60a5fa66" : C.borderFaint}`,
            color: showLog ? "#60a5fa" : C.stone,
            fontFamily: FONT,
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          LOG
        </button>
      </div>

      {/* 스킬 배너 */}
      {skillBanner && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              background: `linear-gradient(90deg,transparent,${SKILL_COLOR[skillBanner.type]}18,${SKILL_COLOR[skillBanner.type]}18,transparent)`,
              border: `1px solid ${SKILL_COLOR[skillBanner.type]}55`,
              borderLeft: "none",
              borderRight: "none",
              padding: "4px 28px",
              position: "relative",
              overflow: "hidden",
              animation: "col-skill-in 0.2s ease-out",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: `linear-gradient(180deg,transparent,${SKILL_COLOR[skillBanner.type]},transparent)`,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 3,
                background: `linear-gradient(180deg,transparent,${SKILL_COLOR[skillBanner.type]},transparent)`,
              }}
            />
            <span
              style={{
                fontSize: 8,
                fontWeight: 900,
                color: SKILL_COLOR[skillBanner.type],
                letterSpacing: "0.25em",
                background: `${SKILL_COLOR[skillBanner.type]}22`,
                border: `1px solid ${SKILL_COLOR[skillBanner.type]}55`,
                padding: "1px 6px",
                borderRadius: 3,
                flexShrink: 0,
              }}
            >
              {skillLang[skillBanner.type]}
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#fff",
                textShadow: `0 0 14px ${SKILL_COLOR[skillBanner.type]}`,
                letterSpacing: "0.06em",
                flex: 1,
                textAlign: "center",
              }}
            >
              {skillBanner.name}
            </span>
          </div>
        </div>
      )}

      {/* ── 아레나 ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <ArenaBg />
        {/* 분위기 그라데이션 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 50% at 50% 95%,rgba(200,164,74,0.07),transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 45% 80% at 13% 50%,rgba(96,165,250,0.05),transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 45% 80% at 87% 50%,rgba(248,113,113,0.05),transparent)",
            pointerEvents: "none",
          }}
        />
        {/* 중앙 구분선 */}
        <div
          style={{
            position: "absolute",
            top: "4%",
            bottom: "4%",
            left: "50%",
            width: 1,
            background:
              "linear-gradient(180deg,transparent,#c8a44a22,#c8a44a44,#c8a44a22,transparent)",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />
        {/* 팀 레이블 */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 0,
            width: "50%",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: "#60a5facc",
              fontWeight: 900,
              letterSpacing: "0.3em",
              textShadow: "0 0 8px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,1)",
            }}
          >
            {ko ? "공격팀" : ja ? "攻撃" : "ATTACK"}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 0,
            width: "50%",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: "#f87171cc",
              fontWeight: 900,
              letterSpacing: "0.3em",
              textShadow: "0 0 8px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,1)",
            }}
          >
            {ko ? "방어팀" : ja ? "防御" : "DEFENSE"}
          </span>
        </div>
        {/* 전열/후열 구분선 (공격팀) */}
        <div
          style={{
            position: "absolute",
            top: "4%",
            bottom: "4%",
            left: "22%",
            width: 1,
            background:
              "linear-gradient(180deg,transparent,#60a5fa30,#60a5fa50,#60a5fa30,transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "3%",
            left: "19%",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 7,
              color: "#60a5fa99",
              fontWeight: 900,
              letterSpacing: "0.15em",
              writingMode: "vertical-rl",
              textShadow: "0 0 6px rgba(0,0,0,1)",
            }}
          >
            {ko ? "전열" : ja ? "前列" : "FRONT"}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            top: "3%",
            left: "4%",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 7,
              color: "#60a5fa77",
              fontWeight: 900,
              letterSpacing: "0.15em",
              writingMode: "vertical-rl",
              textShadow: "0 0 6px rgba(0,0,0,1)",
            }}
          >
            {ko ? "후열" : ja ? "後列" : "BACK"}
          </span>
        </div>
        {/* 전열/후열 구분선 (방어팀) */}
        <div
          style={{
            position: "absolute",
            top: "4%",
            bottom: "4%",
            right: "22%",
            width: 1,
            background:
              "linear-gradient(180deg,transparent,#f8717130,#f8717150,#f8717130,transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "3%",
            right: "19%",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 7,
              color: "#f8717199",
              fontWeight: 900,
              letterSpacing: "0.15em",
              writingMode: "vertical-rl",
              textShadow: "0 0 6px rgba(0,0,0,1)",
            }}
          >
            {ko ? "전열" : ja ? "前列" : "FRONT"}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            top: "3%",
            right: "4%",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 7,
              color: "#f8717177",
              fontWeight: 900,
              letterSpacing: "0.15em",
              writingMode: "vertical-rl",
              textShadow: "0 0 6px rgba(0,0,0,1)",
            }}
          >
            {ko ? "후열" : ja ? "後列" : "BACK"}
          </span>
        </div>

        {/* 캐릭터 */}
        {attackerChars.map((info, i) =>
          renderUnit(info, "attacker", ATK_POS[info.slot] ?? ATK_POS[i % 4]),
        )}
        {defenderChars.map((info, i) =>
          renderUnit(info, "defender", DEF_POS[info.slot] ?? DEF_POS[i % 4]),
        )}

        {/* 이벤트 로그 오버레이 */}
        {showLog && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0,0,0,0.82)",
              borderTop: "1px solid #1e3a5f44",
              padding: "5px 8px",
              backdropFilter: "blur(6px)",
              maxHeight: 110,
              overflowY: "auto",
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column-reverse",
                gap: 2,
              }}
            >
              {[...eventLog]
                .reverse()
                .slice(0, 12)
                .map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 5,
                      animation: "log-in 0.2s ease-out",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: e.color,
                        flexShrink: 0,
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {LOG_ICONS[e.icon]
                        ? React.createElement(LOG_ICONS[e.icon], { size: 10, color: e.color })
                        : e.icon}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: "monospace",
                        color: e.color,
                        lineHeight: 1.4,
                      }}
                    >
                      {e.text}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 하단 HUD ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid #ffffff08",
          flexShrink: 0,
          minHeight: 74,
        }}
      >
        {/* 활성 캐릭터 패널 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          {activeCharInfo ? (
            (() => {
              const char = charById(activeCharInfo.charId);
              const elemCol = ELEMENT_COLOR[activeCharInfo.element] ?? "#888";
              const th = RARITY_THEME[activeCharInfo.rarity as CharacterRarity];
              const pct =
                activeCharInfo.maxHp > 0
                  ? activeHpVal / activeCharInfo.maxHp
                  : 0;
              const hpCol =
                pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444";
              const actBuf = (activeSnap?.buffs ?? [])
                .map((b) => BUFF_META[b.type])
                .filter(Boolean);
              const actDeb = (activeSnap?.debuffs ?? [])
                .map((d) => DEBUFF_META[d.type])
                .filter(Boolean);
              return (
                <>
                  <div
                    style={{
                      flexShrink: 0,
                      border: `2px solid ${activeAccent}99`,
                      borderRadius: 8,
                      padding: 2,
                      background: `${activeAccent}0d`,
                      boxShadow: `0 0 18px ${activeAccent}44`,
                      animation: "col-active-glow 1.5s ease-in-out infinite",
                    }}
                  >
                    <PixelSprite
                      type={char.type as CharacterType}
                      rarity={char.rarity as CharacterRarity}
                      size={50}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: 12,
                          fontWeight: 900,
                          color: activeAccent,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {char.type}
                      </span>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: elemCol,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${elemCol}`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 8,
                          color: `${th?.color ?? activeAccent}99`,
                          background: `${th?.color ?? activeAccent}11`,
                          border: `1px solid ${th?.color ?? activeAccent}33`,
                          borderRadius: 3,
                          padding: "1px 4px",
                          fontWeight: 900,
                          flexShrink: 0,
                        }}
                      >
                        {activeCharInfo.rarity}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "rgba(0,0,0,0.6)",
                        borderRadius: 3,
                        overflow: "hidden",
                        border: `1px solid ${activeAccent}33`,
                        marginBottom: 3,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct * 100}%`,
                          background: hpCol,
                          borderRadius: 3,
                          transition: "width 0.4s",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 9,
                          color: `${hpCol}cc`,
                        }}
                      >
                        {activeHpVal}/{activeCharInfo.maxHp}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 2,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        {actBuf.slice(0, 3).map((m, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 7,
                              fontWeight: 900,
                              color: m.color,
                              background: m.bg,
                              borderRadius: 2,
                              padding: "1px 3px",
                            }}
                          >
                            {m.label}
                          </span>
                        ))}
                        {actDeb.slice(0, 3).map((m, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 7,
                              fontWeight: 900,
                              color: m.color,
                              background: m.bg,
                              borderRadius: 2,
                              padding: "1px 3px",
                            }}
                          >
                            {m.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <span style={{ fontSize: 10, color: C.stone }}>
              {ko ? "대기 중..." : ja ? "待機中..." : "Waiting..."}
            </span>
          )}
        </div>

        {/* CR 순서 인디케이터 */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <span
            style={{
              fontSize: 7,
              color: C.stone,
              letterSpacing: "0.2em",
              fontWeight: 900,
            }}
          >
            TURN
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            {[...crs]
              .sort((a, b) => b.cr - a.cr)
              .slice(0, 6)
              .map((u) => {
                const chars =
                  u.team === "attacker" ? attackerChars : defenderChars;
                const info = chars.find((c) => c.slot === u.slot);
                if (!info) return null;
                const char = charById(info.charId);
                const isAct =
                  activeActor?.team === u.team && activeActor.slot === u.slot;
                const accent = u.team === "attacker" ? "#60a5fa" : "#f87171";
                return (
                  <div
                    key={`${u.team}-${u.slot}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 1,
                      opacity: u.alive ? 1 : 0.22,
                      transition: "opacity 0.3s",
                    }}
                  >
                    <div
                      style={{
                        border: `1.5px solid ${isAct ? accent : accent + "44"}`,
                        borderRadius: "50%",
                        padding: 1,
                        background: isAct ? `${accent}22` : "transparent",
                        boxShadow: isAct ? `0 0 8px ${accent}88` : undefined,
                        transition: "all 0.25s",
                      }}
                    >
                      <PixelSprite
                        type={char.type as CharacterType}
                        rarity={char.rarity as CharacterRarity}
                        size={20}
                      />
                    </div>
                    <div
                      style={{
                        width: 22,
                        height: 2,
                        background: "rgba(0,0,0,0.5)",
                        borderRadius: 1,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${u.cr}%`,
                          height: "100%",
                          background: accent,
                          borderRadius: 1,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 진행도 */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <div
            style={{
              width: 56,
              height: 3,
              background: "rgba(0,0,0,0.5)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, ((step + 1) / log.length) * 100)}%`,
                background: "linear-gradient(90deg,#3b82f6,#c8a44a,#ef4444)",
                borderRadius: 2,
                transition: "width 0.3s",
              }}
            />
          </div>
          <span
            style={{ fontFamily: "monospace", fontSize: 8, color: C.stone }}
          >
            {Math.max(0, step + 1)}/{log.length}
          </span>
        </div>
      </div>
    </div>
  );
}
