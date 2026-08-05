import React, { useState, useEffect } from "react";
import {
  Swords,
  Shield,
  ShoppingCart,
  Skull,
  Trophy,
  Star,
  Flame,
} from "lucide-react";
import type { CharacterType, CharacterRarity } from "../data/characters";

// RoguePage.tsx의 카드/유물/적/상점 데이터, 순수 로직 헬퍼, 작은 아이콘 컴포넌트를 분리한 파일.
// 원래 이 전부가 RoguePage.tsx 안에 있어서 파일이 10,000줄을 넘었다 — 실제 게임 상태머신
// (RoguePage 컴포넌트 본체)만 RoguePage.tsx에 남기고 콘텐츠/로직은 여기로 옮겼다.

export const FONT = "'Noto Sans KR','Noto Sans JP',sans-serif";

export const C_DARK = {
  bg: "#060d1a",
  panel: "#0d1525",
  panelDark: "#081018",
  border: "#1a2840",
  gold: "#f59e0b",
  text: "#cbd5e1",
  textBright: "#e2e8f0",
  textDim: "#64748b",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
};
export const C_LIGHT = {
  bg: "#1a2035",
  panel: "#222a45",
  panelDark: "#151c30",
  border: "#2e3f60",
  gold: "#f59e0b",
  text: "#c8d4f0",
  textBright: "#e6eeff",
  textDim: "#7888b0",
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
};

// module-level alias for sub-components (CardView, HpBar, etc.)
export const C = C_DARK;

export function useIsDark() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() =>
      setIsDark(el.classList.contains("dark")),
    );
    obs.observe(el, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export function MagicOrb({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="32"
      height="44"
      viewBox="0 0 8 11"
      style={{
        imageRendering: "pixelated",
        display: "block",
        filter: "drop-shadow(0 0 4px #9333ea)",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      <rect x="3" y="0" width="2" height="1" fill="#4a1a88" />
      <rect x="3" y="1" width="2" height="3" fill="#3a1270" />
      <rect x="2" y="3" width="4" height="1" fill="#5a2299" />
      <rect x="1" y="4" width="6" height="5" fill="#1a0830" />
      <rect x="2" y="5" width="4" height="3" fill="#2d0d50" />
      <rect x="3" y="5" width="2" height="1" fill="#7a2acc" />
      <rect x="2" y="6" width="1" height="1" fill="#5a1a99" />
      <rect x="3" y="6" width="2" height="1" fill="#cc88ff" />
      <rect x="5" y="6" width="1" height="1" fill="#4a1280" />
      <rect x="3" y="7" width="2" height="1" fill="#7a2acc" />
      <rect x="3" y="9" width="2" height="2" fill="#3a0a60" opacity="0.6" />
    </svg>
  );
}

export function DungeonGate() {
  return (
    <svg
      width="96"
      height="52"
      viewBox="0 0 24 13"
      style={{
        imageRendering: "pixelated",
        display: "block",
        filter: "drop-shadow(0 0 8px #7a1aee44)",
      }}
    >
      <rect x="0" y="2" width="5" height="11" fill="#1a0a38" />
      <rect x="1" y="2" width="3" height="11" fill="#240e4a" />
      <rect x="0" y="1" width="5" height="2" fill="#2e1460" />
      <rect x="19" y="2" width="5" height="11" fill="#1a0a38" />
      <rect x="20" y="2" width="3" height="11" fill="#240e4a" />
      <rect x="19" y="1" width="5" height="2" fill="#2e1460" />
      <rect x="4" y="0" width="16" height="3" fill="#2e1460" />
      <rect x="3" y="1" width="18" height="2" fill="#240e4a" />
      <rect x="5" y="3" width="14" height="10" fill="#08001c" />
      <rect x="6" y="4" width="12" height="8" fill="#0e0028" />
      <rect x="8" y="5" width="8" height="6" fill="#160038" />
      <rect x="10" y="7" width="4" height="3" fill="#3a0a7a" opacity="0.8" />
      <rect x="11" y="8" width="2" height="1" fill="#cc55ff" opacity="0.7" />
      <rect x="2" y="5" width="1" height="2" fill="#6a1a99" opacity="0.4" />
      <rect x="21" y="6" width="1" height="3" fill="#6a1a99" opacity="0.3" />
    </svg>
  );
}

export const RARITY_STYLE: Record<
  string,
  { border: string; glow: string; badge: string }
> = {
  common: { border: "#475569", glow: "#1e293b44", badge: "#64748b" },
  uncommon: { border: "#15803d", glow: "#052e1644", badge: "#16a34a" },
  rare: { border: "#1d4ed8", glow: "#082f4944", badge: "#2563eb" },
  epic: { border: "#7e22ce", glow: "#2e106544", badge: "#9333ea" },
  legendary: { border: "#b45309", glow: "#451a0344", badge: "#d97706" },
};

export const TYPE_BG: Record<string, string> = {
  attack: "#1c0a0a",
  skill: "#0a0e1c",
  power: "#1c1500",
};
export const TYPE_ACCENT: Record<string, string> = {
  attack: "#ef4444",
  skill: "#3b82f6",
  power: "#f59e0b",
};

// ── Types ──────────────────────────────────────────────────────────────────
export type CardType = "attack" | "skill" | "power";
export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type NodeType = "fight" | "elite" | "treasure" | "shop" | "rest" | "boss";
export type Phase =
  | "lobby"
  | "map"
  | "battle"
  | "reward"
  | "shop"
  | "rest"
  | "gameover"
  | "victory";
export type Intent = "attack" | "defend" | "buff" | "poison";
export type RelicGrade = "common" | "rare" | "unique" | "boss";
export type RelicCategory = "combat" | "utility" | "reward";
export interface RelicDef {
  id: string;
  name: string;
  nameJa: string;
  nameEn: string;
  grade: RelicGrade;
  category: RelicCategory;
  desc: string;
  descJa: string;
  descEn: string;
  handSizeMod?: number;
  selfDmgPct?: number;
}

export interface CardDef {
  id: string;
  name: string;
  nameJa: string;
  nameEn: string;
  cost: number;
  type: CardType;
  rarity: CardRarity;
  desc: string;
  descJa: string;
  descEn: string;
  archetype: string;
  damage?: number;
  shield?: number;
  draw?: number;
  poison?: number;
  strength?: number;
  heal?: number;
  multiHit?: number;
  bonusEnergy?: number;
  selfDamage?: number;
  shieldStrike?: number;
  comboFinisherMult?: number;
  doubleComboCount?: boolean;
  missingHpDamage?: boolean;
  maxHpScale?: number;
  maxHpGain?: number;
  bleed?: number;
  burn?: number;
  fear?: number;
  bind?: number;
  shock?: number;
  curseDebuff?: number;
  statusCombo?: boolean;
}
export interface CardInstance extends CardDef {
  uid: string;
}

export interface EnemyPattern {
  intent: Intent;
  value: number;
  poison?: number;
  shield?: number;
  strength?: number;
}
export interface EnemyDef {
  id: string;
  name: string;
  nameJa: string;
  nameEn: string;
  charType: CharacterType;
  hp: number;
  patterns: EnemyPattern[];
  isBoss?: boolean;
}
export interface EnemyState extends EnemyDef {
  currentHp: number;
  currentShield: number;
  currentStrength: number;
  poisonStacks: number;
  bleedStacks: number;
  burnStacks: number;
  fearStacks: number;
  bindStacks: number;
  shockStacks: number;
  curseStacks: number;
  patternIdx: number;
}
export type ShopConsumableId = "elixir_30" | "elixir_50" | "elixir_100" | "stat_str" | "stat_def" | "stat_maxhp" | "antidote";
export interface ShopEntry {
  kind: "card" | "consumable" | "relic";
  card?: CardDef;
  relic?: RelicDef;
  consumableId?: ShopConsumableId;
  price: number;
  bought: boolean;
}
export interface GameState {
  phase: Phase;
  floor: number;
  mode: RunMode;
  difficulty: Difficulty;
  mapLayout: { options: NodeType[] }[];
  chosenPath: NodeType[];
  playerHp: number;
  playerMaxHp: number;
  shield: number;
  strength: number;
  poison: number;
  energy: number;
  maxEnergy: number;
  deck: CardInstance[];
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  gold: number;
  enemy: EnemyState | null;
  log: string[];
  rewardCards: CardDef[];
  shopItems: ShopEntry[];
  turnCount: number;
  cardsPlayedCosts: number[];
  comboCountMult: number;
  chainPending: EnemyState | null;
  cursedRest: boolean;
  shopInflated: boolean;
  relics: RelicDef[];
  cursedRelic: RelicDef | null;
  relicPending: boolean;
  potions: (ShopConsumableId | null)[];
  infiniteMode: boolean;
}

// ── Card pool ─────────────────────────────────────────────────────────────
export const CARDS: CardDef[] = [
  // Universal
  {
    id: "strike",
    name: "스트라이크",
    nameJa: "ストライク",
    nameEn: "Strike",
    cost: 1,
    type: "attack",
    rarity: "common",
    desc: "8 데미지",
    descJa: "8ダメージ",
    descEn: "Deal 8 damage",
    archetype: "all",
    damage: 8,
  },
  {
    id: "defend",
    name: "방어",
    nameJa: "ディフェンス",
    nameEn: "Defend",
    cost: 1,
    type: "skill",
    rarity: "common",
    desc: "방어력 3",
    descJa: "防御力3",
    descEn: "Gain 3 armor",
    archetype: "all",
    shield: 3,
  },
  {
    id: "bash",
    name: "강타",
    nameJa: "バッシュ",
    nameEn: "Bash",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    desc: "16 데미지",
    descJa: "16ダメージ",
    descEn: "Deal 16 damage",
    archetype: "all",
    damage: 16,
  },
  {
    id: "fortify",
    name: "요새화",
    nameJa: "フォーティファイ",
    nameEn: "Fortify",
    cost: 2,
    type: "skill",
    rarity: "uncommon",
    desc: "방어력 7",
    descJa: "防御力7",
    descEn: "Gain 7 armor",
    archetype: "all",
    shield: 7,
  },
  {
    id: "dual_strike",
    name: "연타",
    nameJa: "二連打",
    nameEn: "Dual Strike",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    desc: "6 데미지 × 2",
    descJa: "6ダメージ×2",
    descEn: "Deal 6 damage twice",
    archetype: "all",
    damage: 6,
    multiHit: 2,
  },
  {
    id: "quick_guard",
    name: "속방어",
    nameJa: "素早い防御",
    nameEn: "Quick Guard",
    cost: 1,
    type: "skill",
    rarity: "common",
    desc: "방어력 3, 드로우 1",
    descJa: "防御力3・ドロー1",
    descEn: "Gain 3 armor, draw 1",
    archetype: "all",
    shield: 3,
    draw: 1,
  },
  {
    id: "power_surge",
    name: "파워 서지",
    nameJa: "パワーサージ",
    nameEn: "Power Surge",
    cost: 3,
    type: "attack",
    rarity: "rare",
    desc: "9 데미지 × 3",
    descJa: "9ダメージ×3",
    descEn: "Deal 9 damage three times",
    archetype: "all",
    damage: 9,
    multiHit: 3,
  },
  {
    id: "iron_wall",
    name: "철벽",
    nameJa: "鉄壁",
    nameEn: "Iron Wall",
    cost: 3,
    type: "skill",
    rarity: "rare",
    desc: "방어력 12",
    descJa: "防御力12",
    descEn: "Gain 12 armor",
    archetype: "all",
    shield: 12,
  },
  {
    id: "battle_cry",
    name: "전투 함성",
    nameJa: "バトルクライ",
    nameEn: "Battle Cry",
    cost: 1,
    type: "power",
    rarity: "rare",
    desc: "힘 +1, 방어력 2",
    descJa: "力+1・防御力2",
    descEn: "Gain 1 strength, 2 armor",
    archetype: "all",
    strength: 1,
    shield: 2,
  },
  {
    id: "second_wind",
    name: "재기",
    nameJa: "セカンドウィンド",
    nameEn: "Second Wind",
    cost: 2,
    type: "skill",
    rarity: "epic",
    desc: "방어력 5, 드로우 2",
    descJa: "防御力5・ドロー2",
    descEn: "Gain 5 armor, draw 2",
    archetype: "all",
    shield: 5,
    draw: 2,
  },
  // Warrior
  {
    id: "slash",
    name: "베기",
    nameJa: "斬り",
    nameEn: "Slash",
    cost: 1,
    type: "attack",
    rarity: "common",
    desc: "7 데미지",
    descJa: "7ダメージ",
    descEn: "Deal 7 damage",
    archetype: "warrior",
    damage: 7,
  },
  {
    id: "war_howl",
    name: "전쟁의 외침",
    nameJa: "戦の咆哮",
    nameEn: "War Howl",
    cost: 1,
    type: "power",
    rarity: "uncommon",
    desc: "힘 +1, 드로우 1",
    descJa: "力+1・ドロー1",
    descEn: "Gain 1 strength, draw 1",
    archetype: "warrior",
    strength: 1,
    draw: 1,
  },
  {
    id: "feral_strike",
    name: "야성 연타",
    nameJa: "野性連打",
    nameEn: "Feral Strike",
    cost: 2,
    type: "attack",
    rarity: "rare",
    desc: "7 데미지 × 2",
    descJa: "7ダメージ×2",
    descEn: "Deal 7 damage twice",
    archetype: "warrior",
    damage: 7,
    multiHit: 2,
  },
  {
    id: "alpha_wrath",
    name: "알파의 분노",
    nameJa: "アルファの怒り",
    nameEn: "Alpha's Wrath",
    cost: 2,
    type: "attack",
    rarity: "epic",
    desc: "10 데미지 × 2, 힘 +1",
    descJa: "10ダメージ×2・力+1",
    descEn: "Deal 10 damage twice, gain 1 str",
    archetype: "warrior",
    damage: 10,
    multiHit: 2,
    strength: 1,
  },
  {
    id: "war_cry",
    name: "전쟁의 함성",
    nameJa: "戦いの叫び",
    nameEn: "War Cry",
    cost: 2,
    type: "power",
    rarity: "rare",
    desc: "힘 +2, 드로우 1",
    descJa: "力+2・ドロー1",
    descEn: "Gain 2 strength, draw 1",
    archetype: "warrior",
    strength: 2,
    draw: 1,
  },
  {
    id: "reckless",
    name: "무모한 공격",
    nameJa: "無謀な攻撃",
    nameEn: "Reckless Swing",
    cost: 0,
    type: "attack",
    rarity: "uncommon",
    desc: "7 데미지, 자신 2 피해",
    descJa: "7ダメージ・自身2",
    descEn: "Deal 7 damage, take 2",
    archetype: "warrior",
    damage: 7,
    selfDamage: 2,
  },
  // Rogue
  {
    id: "scratch",
    name: "할퀴기",
    nameJa: "引っ掻き",
    nameEn: "Scratch",
    cost: 0,
    type: "attack",
    rarity: "common",
    desc: "4 데미지",
    descJa: "4ダメージ",
    descEn: "Deal 4 damage",
    archetype: "rogue",
    damage: 4,
  },
  {
    id: "pounce",
    name: "도약 공격",
    nameJa: "飛び掛かり",
    nameEn: "Pounce",
    cost: 1,
    type: "attack",
    rarity: "uncommon",
    desc: "6 데미지, 에너지 +1",
    descJa: "6ダメージ・エナジー+1",
    descEn: "Deal 6 damage, gain 1 energy",
    archetype: "rogue",
    damage: 6,
    bonusEnergy: 1,
  },
  {
    id: "shadow_step",
    name: "그림자 보법",
    nameJa: "影歩き",
    nameEn: "Shadow Step",
    cost: 2,
    type: "attack",
    rarity: "epic",
    desc: "6 데미지 × 2, 에너지 +1, 드로우 1",
    descJa: "6ダメージ×2・エナジー+1・ドロー1",
    descEn: "Deal 6 damage twice, gain 1 energy, draw 1",
    archetype: "rogue",
    damage: 6,
    multiHit: 2,
    bonusEnergy: 1,
    draw: 1,
  },
  {
    id: "smoke_bomb",
    name: "연막탄",
    nameJa: "煙幕弾",
    nameEn: "Smoke Bomb",
    cost: 1,
    type: "skill",
    rarity: "rare",
    desc: "방어력 3, 드로우 1",
    descJa: "防御力3・ドロー1",
    descEn: "Gain 3 armor, draw 1",
    archetype: "rogue",
    shield: 3,
    draw: 1,
  },
  {
    id: "swift_strike",
    name: "신속 공격",
    nameJa: "迅速打",
    nameEn: "Swift Strike",
    cost: 1,
    type: "attack",
    rarity: "common",
    desc: "5 데미지, 드로우 1",
    descJa: "5ダメージ・ドロー1",
    descEn: "Deal 5 damage, draw 1",
    archetype: "rogue",
    damage: 5,
    draw: 1,
  },
  {
    id: "backflip",
    name: "백플립",
    nameJa: "バックフリップ",
    nameEn: "Backflip",
    cost: 1,
    type: "skill",
    rarity: "uncommon",
    desc: "방어력 2, 드로우 2",
    descJa: "防御力2・ドロー2",
    descEn: "Gain 2 armor, draw 2",
    archetype: "rogue",
    shield: 2,
    draw: 2,
  },
  // Mage
  {
    id: "spark",
    name: "마법 불꽃",
    nameJa: "魔法の炎",
    nameEn: "Spark",
    cost: 0,
    type: "attack",
    rarity: "common",
    desc: "3 데미지, 독 1",
    descJa: "3ダメージ・毒1",
    descEn: "Deal 3 damage, apply 1 poison",
    archetype: "mage",
    damage: 3,
    poison: 1,
  },
  {
    id: "soul_drain",
    name: "영혼 흡수",
    nameJa: "魂の吸収",
    nameEn: "Soul Drain",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    desc: "14 데미지, HP +8",
    descJa: "14ダメージ・HP+8",
    descEn: "Deal 14 damage, heal 8 HP",
    archetype: "mage",
    damage: 14,
    heal: 8,
  },
  {
    id: "haunt",
    name: "저주",
    nameJa: "呪い",
    nameEn: "Haunt",
    cost: 1,
    type: "attack",
    rarity: "uncommon",
    desc: "6 데미지, 독 2",
    descJa: "6ダメージ・毒2",
    descEn: "Deal 6 damage, apply 2 poison",
    archetype: "mage",
    damage: 6,
    poison: 2,
  },
  {
    id: "arcane_surge",
    name: "비전 서지",
    nameJa: "アーケインサージ",
    nameEn: "Arcane Surge",
    cost: 2,
    type: "attack",
    rarity: "rare",
    desc: "9 데미지 × 2, 드로우 1",
    descJa: "9ダメージ×2・ドロー1",
    descEn: "Deal 9 damage twice, draw 1",
    archetype: "mage",
    damage: 9,
    multiHit: 2,
    draw: 1,
  },
  {
    id: "phantom_ward",
    name: "환영 방벽",
    nameJa: "幻影の防壁",
    nameEn: "Phantom Ward",
    cost: 1,
    type: "skill",
    rarity: "rare",
    desc: "방어력 4",
    descJa: "防御力4",
    descEn: "Gain 4 armor",
    archetype: "mage",
    shield: 4,
  },
  {
    id: "curse_bolt",
    name: "저주 번개",
    nameJa: "呪いの稲妻",
    nameEn: "Curse Bolt",
    cost: 2,
    type: "attack",
    rarity: "epic",
    desc: "10 데미지 × 2, 독 5",
    descJa: "10ダメージ×2・毒5",
    descEn: "Deal 10 damage twice, poison 5",
    archetype: "mage",
    damage: 10,
    multiHit: 2,
    poison: 5,
  },
  // Tank
  {
    id: "shell_block",
    name: "등껍질 방어",
    nameJa: "甲羅防御",
    nameEn: "Shell Block",
    cost: 1,
    type: "skill",
    rarity: "common",
    desc: "방어력 5",
    descJa: "防御力5",
    descEn: "Gain 5 armor",
    archetype: "tank",
    shield: 5,
  },
  {
    id: "crush_bite",
    name: "분쇄 물기",
    nameJa: "砕く噛みつき",
    nameEn: "Crush Bite",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    desc: "13 데미지",
    descJa: "13ダメージ",
    descEn: "Deal 13 damage",
    archetype: "tank",
    damage: 13,
  },
  {
    id: "fortress",
    name: "요새",
    nameJa: "要塞",
    nameEn: "Fortress",
    cost: 2,
    type: "skill",
    rarity: "rare",
    desc: "방어력 8, 힘 +1",
    descJa: "防御力8・力+1",
    descEn: "Gain 8 armor, 1 strength",
    archetype: "tank",
    shield: 8,
    strength: 1,
  },
  {
    id: "body_slam",
    name: "몸통 박치기",
    nameJa: "体当たり",
    nameEn: "Body Slam",
    cost: 2,
    type: "attack",
    rarity: "rare",
    desc: "7 데미지 × 2, 방어력 5",
    descJa: "7ダメージ×2・防御力5",
    descEn: "Deal 7 damage twice, gain 5 armor",
    archetype: "tank",
    damage: 7,
    multiHit: 2,
    shield: 5,
  },
  {
    id: "shell_crush",
    name: "갑각 분쇄",
    nameJa: "甲殻砕き",
    nameEn: "Shell Crush",
    cost: 2,
    type: "attack",
    rarity: "epic",
    desc: "8 데미지 × 2, 방어력 6",
    descJa: "8ダメージ×2・防御力6",
    descEn: "Deal 8 damage twice, gain 6 armor",
    archetype: "tank",
    damage: 8,
    multiHit: 2,
    shield: 6,
  },
  {
    id: "endure",
    name: "인내",
    nameJa: "忍耐",
    nameEn: "Endure",
    cost: 0,
    type: "skill",
    rarity: "rare",
    desc: "방어력 4",
    descJa: "防御力4",
    descEn: "Gain 4 armor",
    archetype: "tank",
    shield: 4,
  },
  // Nature (healing & max-HP scaling)
  {
    id: "life_force",
    name: "생명의 힘",
    nameJa: "生命の力",
    nameEn: "Life Force",
    cost: 0,
    type: "attack",
    rarity: "common",
    desc: "최대HP의 10% 데미지",
    descJa: "最大HPの10%ダメージ",
    descEn: "Deal 10% of max HP as damage",
    archetype: "nature",
    maxHpScale: 0.10,
  },
  {
    id: "pulse_heal",
    name: "생명 맥동",
    nameJa: "生命の脈動",
    nameEn: "Life Pulse",
    cost: 1,
    type: "skill",
    rarity: "common",
    desc: "HP +12, 최대HP +3",
    descJa: "HP+12・最大HP+3",
    descEn: "Heal 12 HP, gain 3 max HP",
    archetype: "nature",
    heal: 12,
    maxHpGain: 3,
  },
  {
    id: "nature_bloom",
    name: "자연의 개화",
    nameJa: "自然の開花",
    nameEn: "Nature's Bloom",
    cost: 1,
    type: "skill",
    rarity: "uncommon",
    desc: "HP +15, 드로우 1",
    descJa: "HP+15・ドロー1",
    descEn: "Heal 15 HP, draw 1",
    archetype: "nature",
    heal: 15,
    draw: 1,
  },
  {
    id: "rejuvenate",
    name: "재생",
    nameJa: "再生",
    nameEn: "Rejuvenate",
    cost: 2,
    type: "skill",
    rarity: "rare",
    desc: "HP +30, 최대HP +5",
    descJa: "HP+30・最大HP+5",
    descEn: "Heal 30 HP, gain 5 max HP",
    archetype: "nature",
    heal: 30,
    maxHpGain: 5,
  },
  {
    id: "vital_surge",
    name: "생명 급류",
    nameJa: "生命の急流",
    nameEn: "Vital Surge",
    cost: 2,
    type: "skill",
    rarity: "epic",
    desc: "HP +20, 최대HP +10, 드로우 1",
    descJa: "HP+20・最大HP+10・ドロー1",
    descEn: "Heal 20 HP, gain 10 max HP, draw 1",
    archetype: "nature",
    heal: 20,
    maxHpGain: 10,
    draw: 1,
  },
  // Wild
  {
    id: "patch",
    name: "응급 수리",
    nameJa: "応急処置",
    nameEn: "Patch",
    cost: 1,
    type: "skill",
    rarity: "common",
    desc: "방어력 2, HP +5",
    descJa: "防御力2・HP+5",
    descEn: "Gain 2 armor, heal 5 HP",
    archetype: "meka",
    shield: 2,
    heal: 5,
  },
  {
    id: "overclock",
    name: "오버클록",
    nameJa: "オーバークロック",
    nameEn: "Overclock",
    cost: 0,
    type: "power",
    rarity: "uncommon",
    desc: "에너지 +1",
    descJa: "エナジー+1",
    descEn: "Gain 1 energy",
    archetype: "meka",
    bonusEnergy: 1,
  },
  {
    id: "self_repair",
    name: "자가 수리",
    nameJa: "自己修復",
    nameEn: "Self-Repair",
    cost: 2,
    type: "skill",
    rarity: "rare",
    desc: "방어력 3, HP +14",
    descJa: "防御力3・HP+14",
    descEn: "Gain 3 armor, heal 14 HP",
    archetype: "meka",
    shield: 3,
    heal: 14,
  },
  {
    id: "absorb",
    name: "흡수",
    nameJa: "吸収",
    nameEn: "Absorb",
    cost: 1,
    type: "skill",
    rarity: "uncommon",
    desc: "방어력 2, 드로우 1",
    descJa: "防御力2・ドロー1",
    descEn: "Gain 2 armor, draw 1",
    archetype: "meka",
    shield: 2,
    draw: 1,
  },
  {
    id: "replicate",
    name: "복제",
    nameJa: "複製",
    nameEn: "Replicate",
    cost: 2,
    type: "skill",
    rarity: "epic",
    desc: "드로우 3",
    descJa: "ドロー3",
    descEn: "Draw 3 cards",
    archetype: "meka",
    draw: 3,
  },
  {
    id: "shock_blast",
    name: "전기 방전",
    nameJa: "電気放電",
    nameEn: "Electric Discharge",
    cost: 2,
    type: "attack",
    rarity: "rare",
    desc: "8 데미지 × 2, 감전 2",
    descJa: "8ダメージ×2・感電2",
    descEn: "Deal 8 damage twice, shock 2",
    archetype: "meka",
    damage: 8,
    multiHit: 2,
    shock: 2,
  },
  // Extra (만능) — 종류 보강
  {
    id: "heavy_blow",
    name: "묵직한 일격",
    nameJa: "重い一撃",
    nameEn: "Heavy Blow",
    cost: 2,
    type: "attack",
    rarity: "common",
    desc: "11 데미지",
    descJa: "11ダメージ",
    descEn: "Deal 11 damage",
    archetype: "all",
    damage: 11,
  },
  {
    id: "twin_fang",
    name: "쌍날 송곳니",
    nameJa: "双牙",
    nameEn: "Twin Fang",
    cost: 2,
    type: "attack",
    rarity: "uncommon",
    desc: "6 데미지 × 2",
    descJa: "6ダメージ×2",
    descEn: "Deal 6 damage twice",
    archetype: "all",
    damage: 6,
    multiHit: 2,
  },
  {
    id: "bulwark",
    name: "방벽",
    nameJa: "防壁",
    nameEn: "Bulwark",
    cost: 2,
    type: "skill",
    rarity: "uncommon",
    desc: "방어력 3, 드로우 1",
    descJa: "防御力3・ドロー1",
    descEn: "Gain 3 armor, draw 1",
    archetype: "all",
    shield: 3,
    draw: 1,
  },
  {
    id: "adrenaline",
    name: "아드레날린",
    nameJa: "アドレナリン",
    nameEn: "Adrenaline",
    cost: 0,
    type: "power",
    rarity: "uncommon",
    desc: "에너지 +1",
    descJa: "エナジー+1",
    descEn: "Gain 1 energy",
    archetype: "all",
    bonusEnergy: 1,
  },
  {
    id: "toxic_blade",
    name: "맹독 칼날",
    nameJa: "猛毒の刃",
    nameEn: "Toxic Blade",
    cost: 1,
    type: "attack",
    rarity: "uncommon",
    desc: "7 데미지, 독 2",
    descJa: "7ダメージ・毒2",
    descEn: "Deal 7 damage, apply 2 poison",
    archetype: "all",
    damage: 7,
    poison: 2,
  },
  {
    id: "shield_bash",
    name: "방패 강타",
    nameJa: "シールドバッシュ",
    nameEn: "Shield Bash",
    cost: 1,
    type: "attack",
    rarity: "uncommon",
    desc: "6 데미지, 방어력 2",
    descJa: "6ダメージ・防御力2",
    descEn: "Deal 6 damage, gain 2 armor",
    archetype: "all",
    damage: 6,
    shield: 2,
  },
  {
    id: "vampiric",
    name: "흡혈 일격",
    nameJa: "吸血の一撃",
    nameEn: "Vampiric Strike",
    cost: 2,
    type: "attack",
    rarity: "rare",
    desc: "8 데미지 × 2, HP +10",
    descJa: "8ダメージ×2・HP+10",
    descEn: "Deal 8 damage twice, heal 10 HP",
    archetype: "all",
    damage: 8,
    multiHit: 2,
    heal: 10,
  },
  {
    id: "focus",
    name: "집중",
    nameJa: "集中",
    nameEn: "Focus",
    cost: 1,
    type: "power",
    rarity: "rare",
    desc: "힘 +1, 드로우 1",
    descJa: "力+1・ドロー1",
    descEn: "Gain 1 strength, draw 1",
    archetype: "all",
    strength: 1,
    draw: 1,
  },
  {
    id: "cataclysm",
    name: "대재앙",
    nameJa: "大災厄",
    nameEn: "Cataclysm",
    cost: 3,
    type: "attack",
    rarity: "epic",
    desc: "10 데미지 × 3",
    descJa: "10ダメージ×3",
    descEn: "Deal 10 damage three times",
    archetype: "all",
    damage: 10,
    multiHit: 3,
  },
  {
    id: "fortress_wall",
    name: "성벽",
    nameJa: "城壁",
    nameEn: "Fortress Wall",
    cost: 3,
    type: "skill",
    rarity: "epic",
    desc: "방어력 8, 드로우 1",
    descJa: "防御力8・ドロー1",
    descEn: "Gain 8 armor, draw 1",
    archetype: "all",
    shield: 8,
    draw: 1,
  },
  // Shield-proportional
  {
    id: "bulwark_strike",
    name: "방패 맹격",
    nameJa: "盾の猛撃",
    nameEn: "Bulwark Strike",
    cost: 2,
    type: "attack",
    rarity: "rare",
    desc: "현재 방어력만큼 피해",
    descJa: "現在のシールド分ダメージ",
    descEn: "Deal damage equal to current shield",
    archetype: "all",
    shieldStrike: 1,
  },
  {
    id: "iron_surge",
    name: "철갑 질주",
    nameJa: "鉄甲突進",
    nameEn: "Iron Surge",
    cost: 1,
    type: "attack",
    rarity: "rare",
    desc: "현재 방어력만큼 피해, 방어력 +4",
    descJa: "現在の防御力分ダメージ・防御力+4",
    descEn: "Deal damage equal to current armor, gain 4 armor",
    archetype: "tank",
    shieldStrike: 1,
    shield: 4,
  },
  // Legendary
  {
    id: "final_strike",
    name: "최후의 일격",
    nameJa: "最後の一撃",
    nameEn: "Final Strike",
    cost: 3,
    type: "attack",
    rarity: "legendary",
    desc: "15 데미지 × 3",
    descJa: "15ダメージ×3",
    descEn: "Deal 15 damage three times",
    archetype: "all",
    damage: 15,
    multiHit: 3,
  },
  {
    id: "immortal",
    name: "불멸",
    nameJa: "不滅",
    nameEn: "Immortal",
    cost: 3,
    type: "skill",
    rarity: "legendary",
    desc: "방어력 7, HP +30",
    descJa: "防御力7・HP+30",
    descEn: "Gain 7 armor, heal 30 HP",
    archetype: "all",
    shield: 7,
    heal: 30,
  },
  {
    id: "battle_scars",
    name: "결사 일격",
    nameJa: "決死の一撃",
    nameEn: "Death Blow",
    cost: 1,
    type: "attack",
    rarity: "rare",
    desc: "잃은 HP만큼 데미지 (최소 5)",
    descJa: "失ったHP分ダメージ（最低5）",
    descEn: "Deal damage equal to missing HP (min 5)",
    archetype: "warrior",
    missingHpDamage: true,
  },
  {
    id: "berserker",
    name: "광전사",
    nameJa: "バーサーカー",
    nameEn: "Berserker",
    cost: 3,
    type: "attack",
    rarity: "legendary",
    desc: "10 데미지 × 4",
    descJa: "10ダメージ×4",
    descEn: "Deal 10 damage four times",
    archetype: "warrior",
    damage: 10,
    multiHit: 4,
  },
  // ── Legendary (1코·2코) — 직업별 ──────────────────────────────────────────
  // Warrior
  {
    id: "warlord_strike",
    name: "군주의 강타",
    nameJa: "君主の強打",
    nameEn: "Warlord's Strike",
    cost: 1,
    type: "attack",
    rarity: "legendary",
    desc: "12 데미지, 힘 +3",
    descJa: "12ダメージ・力+3",
    descEn: "Deal 12 damage, gain 3 strength",
    archetype: "warrior",
    damage: 12,
    strength: 3,
  },
  {
    id: "titan_slam",
    name: "타이탄 슬램",
    nameJa: "タイタンスラム",
    nameEn: "Titan Slam",
    cost: 2,
    type: "attack",
    rarity: "legendary",
    desc: "9 데미지 × 3, 힘 +4",
    descJa: "9ダメージ×3・力+4",
    descEn: "Deal 9 damage three times, gain 4 strength",
    archetype: "warrior",
    damage: 9,
    multiHit: 3,
    strength: 4,
  },
  // Mage
  {
    id: "arcane_bolt",
    name: "비전 화살",
    nameJa: "アルケイン・ボルト",
    nameEn: "Arcane Bolt",
    cost: 1,
    type: "attack",
    rarity: "legendary",
    desc: "8 데미지 × 2, 화상 5",
    descJa: "8ダメージ×2・火傷5",
    descEn: "Deal 8 damage twice, burn 5",
    archetype: "mage",
    damage: 8,
    multiHit: 2,
    burn: 5,
  },
  {
    id: "ancient_spell",
    name: "고대 주문",
    nameJa: "古代の呪文",
    nameEn: "Ancient Spell",
    cost: 2,
    type: "attack",
    rarity: "legendary",
    desc: "10 데미지 × 3, 독 8",
    descJa: "10ダメージ×3・毒8",
    descEn: "Deal 10 damage three times, poison 8",
    archetype: "mage",
    damage: 10,
    multiHit: 3,
    poison: 8,
  },
  // Tank
  {
    id: "iron_will",
    name: "강철 의지",
    nameJa: "鋼鉄の意志",
    nameEn: "Iron Will",
    cost: 1,
    type: "skill",
    rarity: "legendary",
    desc: "방어력 14, 힘 +2",
    descJa: "防御力14・力+2",
    descEn: "Gain 14 armor, 2 strength",
    archetype: "tank",
    shield: 14,
    strength: 2,
  },
  {
    id: "absolute_defense",
    name: "절대 방어",
    nameJa: "絶対防御",
    nameEn: "Absolute Defense",
    cost: 2,
    type: "skill",
    rarity: "legendary",
    desc: "방어력 18, 체력 10 회복, 힘 +2",
    descJa: "防御力18・HP10回復・力+2",
    descEn: "Gain 18 armor, heal 10 HP, 2 strength",
    archetype: "tank",
    shield: 18,
    heal: 10,
    strength: 2,
  },
  // Rogue — 0코 전설
  {
    id: "shadow_fang",
    name: "그림자 송곳니",
    nameJa: "影の牙",
    nameEn: "Shadow Fang",
    cost: 0,
    type: "attack",
    rarity: "legendary",
    desc: "8 데미지, 독 12 부여",
    descJa: "8ダメージ・毒12付与",
    descEn: "Deal 8 damage, poison 12",
    archetype: "rogue",
    damage: 8,
    poison: 12,
  },
  // Nature
  {
    id: "gift_of_life",
    name: "생명의 선물",
    nameJa: "命の贈り物",
    nameEn: "Gift of Life",
    cost: 1,
    type: "skill",
    rarity: "legendary",
    desc: "체력 15 회복, 최대 HP +10",
    descJa: "HP15回復・最大HP+10",
    descEn: "Heal 15 HP, gain 10 max HP",
    archetype: "nature",
    heal: 15,
    maxHpGain: 10,
  },
  {
    id: "natures_renewal",
    name: "자연의 재생",
    nameJa: "自然の再生",
    nameEn: "Nature's Renewal",
    cost: 2,
    type: "skill",
    rarity: "legendary",
    desc: "체력 25 회복, 최대 HP +18, 드로우 1",
    descJa: "HP25回復・最大HP+18・ドロー1",
    descEn: "Heal 25 HP, gain 18 max HP, draw 1",
    archetype: "nature",
    heal: 25,
    maxHpGain: 18,
    draw: 1,
  },
  // Cursed
  {
    id: "pain_pact",
    name: "고통의 계약",
    nameJa: "苦痛の契約",
    nameEn: "Pain Pact",
    cost: 1,
    type: "skill",
    rarity: "legendary",
    desc: "자신에게 6 피해, 힘 +8, 독 5 부여",
    descJa: "自身6ダメージ・力+8・毒5付与",
    descEn: "Take 6 damage, gain 8 strength, poison 5",
    archetype: "cursed",
    selfDamage: 6,
    strength: 8,
    poison: 5,
  },
  {
    id: "curse_explosion",
    name: "저주의 폭발",
    nameJa: "呪いの爆発",
    nameEn: "Curse Explosion",
    cost: 2,
    type: "attack",
    rarity: "legendary",
    desc: "자신에게 10 피해, 12 데미지 × 2, 화상 8, 출혈 6",
    descJa: "自身10ダメージ・12ダメージ×2・火傷8・出血6",
    descEn: "Take 10 damage, deal 12 damage twice, burn 8, bleed 6",
    archetype: "cursed",
    selfDamage: 10,
    damage: 12,
    multiHit: 2,
    burn: 8,
    bleed: 6,
  },
  // Meka
  {
    id: "overload",
    name: "과부하",
    nameJa: "オーバーロード",
    nameEn: "Overload",
    cost: 1,
    type: "attack",
    rarity: "legendary",
    desc: "10 데미지, 에너지 +2",
    descJa: "10ダメージ・エナジー+2",
    descEn: "Deal 10 damage, gain 2 energy",
    archetype: "meka",
    damage: 10,
    bonusEnergy: 2,
  },
  {
    id: "energy_bomb",
    name: "에너지 폭탄",
    nameJa: "エネルギー爆弾",
    nameEn: "Energy Bomb",
    cost: 2,
    type: "attack",
    rarity: "legendary",
    desc: "14 데미지 × 2, 에너지 +1",
    descJa: "14ダメージ×2・エナジー+1",
    descEn: "Deal 14 damage twice, gain 1 energy",
    archetype: "meka",
    damage: 14,
    multiHit: 2,
    bonusEnergy: 1,
  },
  // ── Legendary (3코) — 기존 유지 ──────────────────────────────────────────
  {
    id: "shadow_realm",
    name: "암흑 영역",
    nameJa: "暗黒領域",
    nameEn: "Shadow Realm",
    cost: 3,
    type: "attack",
    rarity: "legendary",
    desc: "8 데미지 × 3, 독 10",
    descJa: "8ダメージ×3・毒10",
    descEn: "Deal 8 damage three times, poison 10",
    archetype: "mage",
    damage: 8,
    multiHit: 3,
    poison: 10,
  },
  {
    id: "ancient_armor",
    name: "고대의 갑옷",
    nameJa: "古代の鎧",
    nameEn: "Ancient Armor",
    cost: 3,
    type: "skill",
    rarity: "legendary",
    desc: "방어력 13, 힘 +3",
    descJa: "防御力13・力+3",
    descEn: "Gain 13 armor, 3 strength",
    archetype: "tank",
    shield: 13,
    strength: 3,
  },
  {
    id: "phantom_echo",
    name: "환영의 메아리",
    nameJa: "幻影の残響",
    nameEn: "Phantom Echo",
    cost: 1,
    type: "skill",
    rarity: "legendary",
    desc: "이번 턴 사용한 카드 수를 2배로 간주",
    descJa: "このターン使ったカード枚数を2倍として扱う",
    descEn: "Count cards played this turn as twice the amount",
    archetype: "rogue",
    doubleComboCount: true,
  },
  {
    id: "combo_finisher_1",
    name: "콤보 피니셔 α",
    nameJa: "コンボフィニッシャーα",
    nameEn: "Combo Finisher α",
    cost: 1,
    type: "attack",
    rarity: "legendary",
    desc: "이번 턴 사용한 카드 수 × 10 피해",
    descJa: "このターン使ったカード数×10ダメージ",
    descEn: "Deal damage equal to cards played this turn × 10",
    archetype: "rogue",
    comboFinisherMult: 10,
  },
  {
    id: "combo_finisher_2",
    name: "콤보 피니셔 β",
    nameJa: "コンボフィニッシャーβ",
    nameEn: "Combo Finisher β",
    cost: 2,
    type: "attack",
    rarity: "legendary",
    desc: "이번 턴 사용한 카드 수 × 20 피해",
    descJa: "このターン使ったカード数×20ダメージ",
    descEn: "Deal damage equal to cards played this turn × 20",
    archetype: "rogue",
    comboFinisherMult: 20,
  },
  {
    id: "combo_finisher_3",
    name: "콤보 피니셔 γ",
    nameJa: "コンボフィニッシャーγ",
    nameEn: "Combo Finisher γ",
    cost: 3,
    type: "attack",
    rarity: "legendary",
    desc: "이번 턴 사용한 카드 수 × 30 피해",
    descJa: "このターン使ったカード数×30ダメージ",
    descEn: "Deal damage equal to cards played this turn × 30",
    archetype: "rogue",
    comboFinisherMult: 30,
  },
  {
    id: "ancient_growth",
    name: "고대의 성장",
    nameJa: "古代の成長",
    nameEn: "Ancient Growth",
    cost: 3,
    type: "skill",
    rarity: "legendary",
    desc: "HP +50, 최대HP +20, 드로우 2",
    descJa: "HP+50・最大HP+20・ドロー2",
    descEn: "Heal 50 HP, gain 20 max HP, draw 2",
    archetype: "nature",
    heal: 50,
    maxHpGain: 20,
    draw: 2,
  },
  // Cursed (상태이상 전문)
  {
    id: "hex_scratch",
    name: "저주 할퀴기",
    nameJa: "呪いの引っ掻き",
    nameEn: "Hex Scratch",
    cost: 0,
    type: "attack",
    rarity: "common",
    desc: "4 데미지, 출혈 1",
    descJa: "4ダメージ・出血1",
    descEn: "Deal 4 damage, bleed 1",
    archetype: "cursed",
    damage: 4,
    bleed: 1,
  },
  {
    id: "hex_bleed",
    name: "출혈 저주",
    nameJa: "出血の呪い",
    nameEn: "Hex Bleed",
    cost: 1,
    type: "attack",
    rarity: "common",
    desc: "5 데미지, 출혈 2",
    descJa: "5ダメージ・出血2",
    descEn: "Deal 5 damage, bleed 2",
    archetype: "cursed",
    damage: 5,
    bleed: 2,
  },
  {
    id: "hex_burn",
    name: "화염 저주",
    nameJa: "火炎の呪い",
    nameEn: "Hex Burn",
    cost: 1,
    type: "attack",
    rarity: "uncommon",
    desc: "4 데미지, 화상 2",
    descJa: "4ダメージ・火傷2",
    descEn: "Deal 4 damage, burn 2",
    archetype: "cursed",
    damage: 4,
    burn: 2,
  },
  {
    id: "hex_fear",
    name: "공포 부여",
    nameJa: "恐怖の付与",
    nameEn: "Instill Fear",
    cost: 1,
    type: "skill",
    rarity: "rare",
    desc: "공포 2 (2턴 동안 적이 공격 불가)",
    descJa: "恐怖2（2ターン攻撃不能）",
    descEn: "Fear 2 (enemy can't attack for 2 turns)",
    archetype: "cursed",
    fear: 2,
  },
  {
    id: "hex_shock",
    name: "감전",
    nameJa: "感電",
    nameEn: "Shock",
    cost: 1,
    type: "skill",
    rarity: "uncommon",
    desc: "감전 2 (2턴간 적 공격력 절반)",
    descJa: "感電2（2ターン攻撃力半減）",
    descEn: "Shock 2 (halve enemy damage for 2 turns)",
    archetype: "cursed",
    shock: 2,
  },
  {
    id: "hex_bind",
    name: "속박",
    nameJa: "束縛",
    nameEn: "Bind",
    cost: 2,
    type: "skill",
    rarity: "epic",
    desc: "속박 1 (1턴 동안 적이 행동 불가)",
    descJa: "束縛1（1ターン行動不能）",
    descEn: "Bind 1 (enemy cannot act for 1 turn)",
    archetype: "cursed",
    bind: 1,
  },
  {
    id: "hex_curse",
    name: "저주 강화",
    nameJa: "呪い強化",
    nameEn: "Curse",
    cost: 2,
    type: "skill",
    rarity: "rare",
    desc: "저주 2 (상태이상 피해 1.5배, 독 4)",
    descJa: "呪い2（状態異常ダメージ1.5倍・毒4）",
    descEn: "Curse 2 (1.5× status dmg) and poison 4",
    archetype: "cursed",
    curseDebuff: 2,
    poison: 4,
  },
  {
    id: "chaos_burst",
    name: "혼돈 폭발",
    nameJa: "混沌の爆発",
    nameEn: "Chaos Burst",
    cost: 0,
    type: "attack",
    rarity: "rare",
    desc: "적의 상태이상 스택 합계만큼 데미지",
    descJa: "敵の全状態異常スタック合計ダメージ",
    descEn: "Deal damage equal to total enemy status stacks",
    archetype: "cursed",
    statusCombo: true,
  },
  {
    id: "curse_burst",
    name: "저주 연쇄",
    nameJa: "呪いの連鎖",
    nameEn: "Curse Chain",
    cost: 1,
    type: "attack",
    rarity: "uncommon",
    desc: "6 데미지, 출혈 2, 화상 2",
    descJa: "6ダメージ・出血2・火傷2",
    descEn: "Deal 6 damage, bleed 2, burn 2",
    archetype: "cursed",
    damage: 6,
    bleed: 2,
    burn: 2,
  },
  {
    id: "hex_drain",
    name: "저주 흡수",
    nameJa: "呪い吸収",
    nameEn: "Hex Drain",
    cost: 2,
    type: "skill",
    rarity: "epic",
    desc: "적의 상태이상 스택 × 3 HP 회복",
    descJa: "敵の状態異常スタック×3HP回復",
    descEn: "Heal HP equal to enemy status stacks × 3",
    archetype: "cursed",
    statusCombo: true,
    heal: 0,
  },
  {
    id: "doom_hex",
    name: "멸망의 저주",
    nameJa: "滅亡の呪い",
    nameEn: "Doom Hex",
    cost: 3,
    type: "skill",
    rarity: "legendary",
    desc: "모든 상태이상 3씩 부여",
    descJa: "全状態異常を3ずつ付与",
    descEn: "Apply 3 stacks of every status effect",
    archetype: "cursed",
    bleed: 3,
    burn: 3,
    fear: 2,
    shock: 2,
    curseDebuff: 2,
    poison: 3,
  },
  {
    id: "omega_blast",
    name: "오메가 블래스트",
    nameJa: "オメガブラスト",
    nameEn: "Omega Blast",
    cost: 3,
    type: "attack",
    rarity: "legendary",
    desc: "8 데미지 × 3, 에너지 +1",
    descJa: "8ダメージ×3・エナジー+1",
    descEn: "Deal 8 damage three times, gain 1 energy",
    archetype: "meka",
    damage: 8,
    multiHit: 3,
    bonusEnergy: 1,
  },
];

// ── Relic pool ─────────────────────────────────────────────────────────────
export const RELICS: RelicDef[] = [
  // ── Common / combat ──
  {
    id: "blade_ring",
    grade: "common",
    category: "combat",
    name: "칼날 반지",
    nameJa: "刃の指輪",
    nameEn: "Blade Ring",
    desc: "전투 종료마다 힘 +1 (영구)",
    descJa: "戦闘終了ごとに力+1（永続）",
    descEn: "+1 strength permanently after each battle",
  },
  {
    id: "poison_bangle",
    grade: "common",
    category: "combat",
    name: "독침 팔찌",
    nameJa: "毒針腕輪",
    nameEn: "Poison Bangle",
    desc: "매 턴 시작 시 적에게 독 1",
    descJa: "ターン開始時、毒1付与",
    descEn: "Apply 1 poison to enemy each turn",
  },
  {
    id: "thorn_bracelet",
    grade: "common",
    category: "combat",
    name: "가시 팔찌",
    nameJa: "棘の腕輪",
    nameEn: "Thorn Bracelet",
    desc: "피격 시 반사 데미지 1",
    descJa: "被撃時、反射1ダメージ",
    descEn: "Reflect 1 damage when hit",
  },
  // ── Common / utility ──
  {
    id: "compass",
    grade: "common",
    category: "utility",
    name: "나침반",
    nameJa: "コンパス",
    nameEn: "Compass",
    desc: "매 전투 시작 시 카드 1장 추가",
    descJa: "戦闘開始時、1枚追加ドロー",
    descEn: "Draw 1 extra card at battle start",
  },
  {
    id: "bandage",
    grade: "common",
    category: "utility",
    name: "붕대",
    nameJa: "包帯",
    nameEn: "Bandage",
    desc: "전투 승리 시 최대 HP +1",
    descJa: "戦闘勝利時、最大HP+1",
    descEn: "+1 max HP on battle win",
  },
  // ── Common / reward ──
  {
    id: "old_wallet",
    grade: "common",
    category: "reward",
    name: "낡은 지갑",
    nameJa: "古い財布",
    nameEn: "Old Wallet",
    desc: "전투 승리 시 골드 +15",
    descJa: "戦闘勝利時、ゴールド+15",
    descEn: "Gain 15 gold on battle win",
  },
  {
    id: "lucky_coin",
    grade: "common",
    category: "reward",
    name: "행운의 동전",
    nameJa: "幸運のコイン",
    nameEn: "Lucky Coin",
    desc: "보상 카드 4장 중 선택",
    descJa: "報酬カード4枚から選択",
    descEn: "Choose from 4 reward cards",
  },
  // ── Rare / combat ──
  {
    id: "dragon_scale",
    grade: "rare",
    category: "combat",
    name: "용의 비늘",
    nameJa: "竜の鱗",
    nameEn: "Dragon Scale",
    desc: "매 턴 시작 시 방어력 +3",
    descJa: "ターン開始時、シールド+3",
    descEn: "Gain 3 shield at turn start",
  },
  {
    id: "berserker_axe",
    grade: "rare",
    category: "combat",
    name: "광전사의 도끼",
    nameJa: "狂戦士の斧",
    nameEn: "Berserker Axe",
    desc: "전투 종료마다 힘 +2 (영구)",
    descJa: "戦闘終了ごとに力+2（永続）",
    descEn: "+2 strength permanently after each battle",
  },
  {
    id: "vampire_ring",
    grade: "rare",
    category: "combat",
    name: "흡혈 반지",
    nameJa: "吸血の指輪",
    nameEn: "Vampire Ring",
    desc: "전투 승리 시 최대 HP +2",
    descJa: "戦闘勝利時、最大HP+2",
    descEn: "+2 max HP on battle win",
  },
  {
    id: "health_potion",
    grade: "rare",
    category: "combat",
    name: "체력 물약",
    nameJa: "体力ポーション",
    nameEn: "Health Potion",
    desc: "전투 종료마다 최대 HP +2 (영구)",
    descJa: "戦闘終了ごとに最大HP+2（永続）",
    descEn: "+2 max HP permanently after each battle",
  },
  // ── Rare / utility ──
  {
    id: "magic_cloak",
    grade: "rare",
    category: "utility",
    name: "마법 망토",
    nameJa: "魔法のマント",
    nameEn: "Magic Cloak",
    desc: "획득 시 최대 HP +100",
    descJa: "取得時、最大HP+100",
    descEn: "Gain +100 max HP",
  },
  {
    id: "energy_crystal",
    grade: "rare",
    category: "utility",
    name: "에너지 결정체",
    nameJa: "エナジークリスタル",
    nameEn: "Energy Crystal",
    desc: "획득 시 최대 에너지 +1",
    descJa: "取得時、最大エナジー+1",
    descEn: "Gain +1 max energy",
  },
  // ── Rare / reward ──
  {
    id: "gold_pouch",
    grade: "rare",
    category: "reward",
    name: "금화 주머니",
    nameJa: "金貨袋",
    nameEn: "Gold Pouch",
    desc: "골드 획득량 +30%",
    descJa: "ゴールド獲得量+30%",
    descEn: "+30% gold from battles",
  },
  // ── Unique / combat ──
  {
    id: "immortal_heart",
    grade: "unique",
    category: "combat",
    name: "불멸의 심장",
    nameJa: "不滅の心臓",
    nameEn: "Immortal Heart",
    desc: "런 중 1회 치사 데미지 방어",
    descJa: "1回だけ致死ダメージを無効",
    descEn: "Block lethal damage once per run",
  },
  {
    id: "storm_sword",
    grade: "unique",
    category: "combat",
    name: "폭풍의 검",
    nameJa: "嵐の剣",
    nameEn: "Storm Sword",
    desc: "획득 시 최대 에너지 +1 (영구)",
    descJa: "取得時、最大エナジー+1（永続）",
    descEn: "Gain +1 max energy permanently",
  },
  // ── Unique / utility ──
  {
    id: "hourglass",
    grade: "rare",
    category: "utility",
    name: "시간의 모래시계",
    nameJa: "時の砂時計",
    nameEn: "Hourglass",
    desc: "매 전투 시작 시 카드 2장 추가",
    descJa: "戦闘開始時、2枚追加ドロー",
    descEn: "Draw 2 extra cards at battle start",
  },
  {
    id: "philosopher",
    grade: "rare",
    category: "utility",
    name: "연금술사의 돌",
    nameJa: "賢者の石",
    nameEn: "Philosopher's Stone",
    desc: "상점 가격 -25%",
    descJa: "ショップ価格-25%",
    descEn: "Shop prices -25%",
  },
  // ── Unique / reward ──
  {
    id: "fate_dice",
    grade: "unique",
    category: "reward",
    name: "운명의 주사위",
    nameJa: "運命のサイコロ",
    nameEn: "Fate Dice",
    desc: "보상 카드 4장, 레어 이상 위주",
    descJa: "報酬4枚・レア以上中心",
    descEn: "4 reward cards, skewed rare+",
  },
  {
    id: "master_key",
    grade: "unique",
    category: "reward",
    name: "마스터 열쇠",
    nameJa: "マスターキー",
    nameEn: "Master Key",
    desc: "보물 노드 함정 없음",
    descJa: "宝物ノードのトラップなし",
    descEn: "No ambush trap in treasure nodes",
  },
  // ── Common / combat (신규) ──
  {
    id: "iron_flask",
    grade: "common",
    category: "combat",
    name: "철제 플라스크",
    nameJa: "鉄フラスク",
    nameEn: "Iron Flask",
    desc: "전투 시작 시 방어력 +5",
    descJa: "戦闘開始時、シールド+5",
    descEn: "Gain 5 shield at battle start",
  },
  {
    id: "battle_horn",
    grade: "common",
    category: "combat",
    name: "전투 뿔피리",
    nameJa: "戦闘の角笛",
    nameEn: "Battle Horn",
    desc: "전투 시작 시 적에게 독 3",
    descJa: "戦闘開始時、敵に毒3",
    descEn: "Apply 3 poison to enemy at battle start",
  },
  // ── Common / reward (신규) ──
  {
    id: "rabbit_foot",
    grade: "common",
    category: "reward",
    name: "토끼 발",
    nameJa: "ウサギの足",
    nameEn: "Rabbit's Foot",
    desc: "전투 승리 시 골드 +20",
    descJa: "戦闘勝利時、ゴールド+20",
    descEn: "Gain 20 gold on battle win",
  },
  // ── Rare / combat (신규) ──
  {
    id: "gilded_shield",
    grade: "rare",
    category: "combat",
    name: "황금 방패",
    nameJa: "黄金の盾",
    nameEn: "Gilded Shield",
    desc: "전투 시작 시 방어력 +10",
    descJa: "戦闘開始時、シールド+10",
    descEn: "Gain 10 shield at battle start",
  },
  {
    id: "cursed_tome",
    grade: "rare",
    category: "combat",
    name: "저주받은 책",
    nameJa: "呪われた本",
    nameEn: "Cursed Tome",
    desc: "매 턴 시작 시 적에게 독 2",
    descJa: "ターン開始時、敵に毒2",
    descEn: "Apply 2 poison to enemy each turn",
  },
  {
    id: "titan_heart",
    grade: "rare",
    category: "combat",
    name: "거인의 심장",
    nameJa: "巨人の心臓",
    nameEn: "Titan's Heart",
    desc: "획득 시 최대 HP +40",
    descJa: "取得時、最大HP+40",
    descEn: "Gain +40 max HP on acquire",
  },
  // ── Rare / utility (신규) ──
  {
    id: "mana_shard",
    grade: "rare",
    category: "utility",
    name: "마나 파편",
    nameJa: "マナの欠片",
    nameEn: "Mana Shard",
    desc: "전투 시작 시 에너지 +1",
    descJa: "戦闘開始時、エナジー+1",
    descEn: "Gain 1 extra energy at battle start",
  },
  // ── Unique / combat (신규) ──
  {
    id: "titan_core",
    grade: "unique",
    category: "combat",
    name: "거인의 핵",
    nameJa: "巨人の核",
    nameEn: "Titan Core",
    desc: "전투 종료마다 최대 HP +3 (영구)",
    descJa: "戦闘終了ごとに最大HP+3（永続）",
    descEn: "+3 max HP permanently after each battle",
  },
  {
    id: "soul_mirror",
    grade: "unique",
    category: "combat",
    name: "영혼의 거울",
    nameJa: "魂の鏡",
    nameEn: "Soul Mirror",
    desc: "피격 시 받은 피해의 30% 반사",
    descJa: "被撃時、ダメージの30%反射",
    descEn: "Reflect 30% of damage taken when hit",
  },
  // ── Unique / utility (신규) ──
  {
    id: "void_crystal",
    grade: "unique",
    category: "utility",
    name: "공허의 결정",
    nameJa: "虚空の結晶",
    nameEn: "Void Crystal",
    desc: "획득 시 최대 에너지 +2 (영구)",
    descJa: "取得時、最大エナジー+2（永続）",
    descEn: "Gain +2 max energy on acquire",
  },
  // ── Boss relics ──
  {
    id: "iron_heart",
    grade: "boss",
    category: "combat",
    name: "철의 심장",
    nameJa: "鉄の心臓",
    nameEn: "Iron Heart",
    handSizeMod: -1,
    desc: "전투 시작 방어력 +25 / 단 시작 패 4장",
    descJa: "戦闘開始時、防御+25 / ただし初期手札4枚",
    descEn: "Battle start: +25 armor / start with 4 cards",
  },
  {
    id: "berserker_crown",
    grade: "boss",
    category: "combat",
    name: "광전사의 왕관",
    nameJa: "狂戦士の王冠",
    nameEn: "Berserker Crown",
    selfDmgPct: 0.20,
    desc: "획득 시 힘 +10 (영구) · 전투 승리마다 힘 +2 (영구) / 단 매 전투 시작 체력 -20%",
    descJa: "取得時、力+10（永続）・戦闘勝利ごとに力+2（永続） / 戦闘開始HP-20%",
    descEn: "Gain +10 strength · +2 strength per battle win / Battle start: -20% HP",
  },
  {
    id: "cursed_sigil",
    grade: "boss",
    category: "combat",
    name: "저주의 인장",
    nameJa: "呪いの印章",
    nameEn: "Cursed Sigil",
    desc: "전투 시작 적 독 +12 / 단 본인도 독 +2",
    descJa: "戦闘開始時、敵に毒+12 / 自分も毒+2",
    descEn: "Battle start: enemy +12 poison / self +2 poison",
  },
  {
    id: "titan_gauntlet",
    grade: "boss",
    category: "combat",
    name: "거인의 건틀릿",
    nameJa: "巨人のガントレット",
    nameEn: "Titan Gauntlet",
    desc: "공격 카드 데미지 +8 · 타수 +2 / 단 획득 시 최대HP -30",
    descJa: "攻撃カードダメージ+8・ヒット数+2 / 取得時、最大HP-30",
    descEn: "Attack cards +8 damage & +2 hits / Lose 30 max HP on acquire",
  },
  {
    id: "abyss_crown",
    grade: "boss",
    category: "reward",
    name: "심연의 왕관",
    nameJa: "深淵の王冠",
    nameEn: "Abyss Crown",
    desc: "전투 종료 시 최대HP +10 & 힘 +1 / 단 획득 시 현재HP 절반",
    descJa: "戦闘終了時、最大HP+10 & 力+1 / 取得時、現在HP半減",
    descEn: "Battle end: +10 max HP & +1 strength / Acquire: HP halved",
  },
];

// ── Difficulty ─────────────────────────────────────────────────────────────
export type Difficulty = "normal" | "hard" | "hell" | "challenge";
export type RunMode = "story" | "challenge";
export const DIFF_HP_MULT: Record<Difficulty, number> = {
  normal: 0.85,
  hard: 1.25,
  hell: 1.85,
  challenge: 1.3,
};
export const DIFF_ATK_BONUS: Record<Difficulty, number> = {
  normal: 0,
  hard: 3,
  hell: 8,
  challenge: 4,
};
export const DIFF_STR_BONUS: Record<Difficulty, number> = {
  normal: 0,
  hard: 0,
  hell: 2,
  challenge: 1,
};
export const DIFF_GOLD_FIGHT: Record<Difficulty, number> = {
  normal: 50,
  hard: 65,
  hell: 80,
  challenge: 90,
};
export const DIFF_GOLD_ELITE: Record<Difficulty, number> = {
  normal: 75,
  hard: 95,
  hell: 115,
  challenge: 130,
};
export const DIFF_LEG_FLOOR: Record<Difficulty, number> = {
  normal: 5,
  hard: 4,
  hell: 3,
  challenge: 1,
};
export const DIFF_EPIC_FLOOR: Record<Difficulty, number> = {
  normal: 3,
  hard: 2,
  hell: 1,
  challenge: 1,
};

// ── Challenge mode ───────────────────────────────────────────────────────────
export const CHALLENGE_FLOORS = 100;
// 스테이지가 올라갈수록 적 HP·공격력이 계속 증가 (floor = 0-index, 3단계 가속)
// Phase1(1~50): 완만 / Phase2(51~75): 기울기 2배 / Phase3(76~100): 기울기 3.5배
export function challengeHpMult(floor: number): number {
  if (floor < 50) return 1 + floor * 0.08; // ×1.0 → ×4.92  (stage50 ≈ ×6.4)
  if (floor < 75) return 4.92 + (floor - 49) * 0.16; // ×4.92 → ×8.92 (stage75 ≈ ×11.6)
  return 8.92 + (floor - 74) * 0.28; // ×8.92 → ×15.92 (stage100 ≈ ×20.7)
}
export function challengeAtkBonus(floor: number): number {
  if (floor < 50) return Math.floor(floor * 0.45); // +0 → +22
  if (floor < 75) return Math.floor(22 + (floor - 49) * 0.9); // +22 → +44
  return Math.floor(44 + (floor - 74) * 1.5); // +44 → +81  (base +4 포함 시 +85)
}
// 매 칸 랜덤 선택지 2개. 20스테이지마다 보스만 등장, 10스테이지마다 엘리트 보장, 마지막은 최종 보스.
// 1~2스테이지: 상점·휴식 미등장 / 3스테이지: 상점만 미등장 / 4스테이지~: 전체 등장
export function challengeFloorOptions(i: number): NodeType[] {
  if (i >= CHALLENGE_FLOORS - 1) return ["boss"];
  if ((i + 1) % 20 === 0) return ["boss"];
  if ((i + 1) % 10 === 0)
    return shuffle([
      "elite",
      Math.random() < 0.5 ? "rest" : "treasure",
    ] as NodeType[]);
  const PAIRS_NO_SHOP_NO_REST: NodeType[][] = [
    ["fight", "treasure"],
    ["fight", "elite"],
    ["elite", "treasure"],
    ["fight", "treasure"],
  ];
  const PAIRS_NO_SHOP: NodeType[][] = [
    ["fight", "treasure"],
    ["fight", "rest"],
    ["fight", "elite"],
    ["elite", "treasure"],
    ["elite", "rest"],
    ["fight", "rest"],
    ["fight", "treasure"],
  ];
  const PAIRS_WITH_SHOP: NodeType[][] = [
    ["fight", "treasure"],
    ["fight", "rest"],
    ["fight", "shop"],
    ["fight", "elite"],
    ["elite", "treasure"],
    ["elite", "rest"],
    ["fight", "rest"],
    ["fight", "treasure"],
    ["rest", "shop"],
  ];
  const pool =
    i < 2 ? PAIRS_NO_SHOP_NO_REST : i < 3 ? PAIRS_NO_SHOP : PAIRS_WITH_SHOP;
  return shuffle([...pool[(Math.random() * pool.length) | 0]]);
}
export function generateChallengeMap(): { options: NodeType[] }[] {
  return Array.from({ length: CHALLENGE_FLOORS }, (_, i) => ({
    options: challengeFloorOptions(i),
  }));
}
// 무한모드 스테이지 선택지: 5스테이지마다 상점 선택지 추가, 나머지는 보스만
export function infiniteFloorOptions(floor: number): NodeType[] {
  const inf = floor - CHALLENGE_FLOORS + 1; // 1-indexed within infinite
  if (inf % 5 === 0) return ["boss", "shop"];
  return ["boss"];
}
// 무한모드 HP 배율: 10스테이지(inf) 단위로 증가
export function infiniteHpMult(floor: number): number {
  const tier = Math.floor((floor - CHALLENGE_FLOORS) / 10);
  return challengeHpMult(CHALLENGE_FLOORS - 1) * (1 + tier * 0.4);
}
// 무한모드 공격력 보너스
export function infiniteAtkBonus(floor: number): number {
  const tier = Math.floor((floor - CHALLENGE_FLOORS) / 10);
  return challengeAtkBonus(CHALLENGE_FLOORS - 1) + tier * 10;
}

// ── Enemies ────────────────────────────────────────────────────────────────
export const ENEMY_DEFS: EnemyDef[] = [
  // Normal tier
  {
    id: "goblin",
    name: "슬라임 고블린",
    nameJa: "スライムゴブリン",
    nameEn: "Slime Goblin",
    charType: "slime",
    hp: 30,
    patterns: [
      { intent: "attack", value: 6 },
      { intent: "attack", value: 6 },
      { intent: "defend", value: 0, shield: 5 },
      { intent: "attack", value: 8 },
    ],
  },
  {
    id: "skeleton",
    name: "해골 전사",
    nameJa: "スケルトン戦士",
    nameEn: "Skeleton Warrior",
    charType: "ghost",
    hp: 38,
    patterns: [
      { intent: "attack", value: 7 },
      { intent: "defend", value: 0, shield: 6 },
      { intent: "attack", value: 9 },
      { intent: "attack", value: 7 },
    ],
  },
  {
    id: "orc",
    name: "오크 투사",
    nameJa: "オーク戦士",
    nameEn: "Orc Fighter",
    charType: "bear",
    hp: 55,
    patterns: [
      { intent: "attack", value: 10 },
      { intent: "attack", value: 10 },
      { intent: "defend", value: 0, shield: 8 },
      { intent: "attack", value: 13 },
    ],
  },
  {
    id: "darkknight",
    name: "흑기사",
    nameJa: "黒騎士",
    nameEn: "Dark Knight",
    charType: "wolf",
    hp: 80,
    patterns: [
      { intent: "defend", value: 0, shield: 10 },
      { intent: "attack", value: 12 },
      { intent: "attack", value: 12 },
      { intent: "buff", value: 0, strength: 2 },
      { intent: "attack", value: 14 },
    ],
  },
  {
    id: "poisonwitch",
    name: "독 마녀",
    nameJa: "毒の魔女",
    nameEn: "Poison Witch",
    charType: "plant",
    hp: 65,
    patterns: [
      { intent: "poison", value: 7, poison: 2 },
      { intent: "poison", value: 7, poison: 2 },
      { intent: "buff", value: 0, strength: 2 },
      { intent: "attack", value: 10 },
    ],
  },
  {
    id: "shadowdragon",
    name: "그림자 드래곤",
    nameJa: "シャドウドラゴン",
    nameEn: "Shadow Dragon",
    charType: "dragon",
    hp: 95,
    patterns: [
      { intent: "attack", value: 14 },
      { intent: "attack", value: 14 },
      { intent: "defend", value: 0, shield: 12 },
      { intent: "attack", value: 18 },
      { intent: "defend", value: 0, shield: 8 },
    ],
  },
  // Hard+ tier
  {
    id: "voidwarden",
    name: "허공의 수호자",
    nameJa: "虚空の守護者",
    nameEn: "Void Warden",
    charType: "owl",
    hp: 110,
    patterns: [
      { intent: "defend", value: 0, shield: 14 },
      { intent: "attack", value: 13 },
      { intent: "attack", value: 13 },
      { intent: "buff", value: 0, strength: 2 },
      { intent: "attack", value: 16 },
    ],
  },
  {
    id: "irongolem",
    name: "강철 골렘",
    nameJa: "鋼鉄ゴーレム",
    nameEn: "Iron Golem",
    charType: "robot",
    hp: 120,
    patterns: [
      { intent: "attack", value: 16 },
      { intent: "defend", value: 0, shield: 18 },
      { intent: "attack", value: 16 },
      { intent: "buff", value: 0, strength: 2 },
      { intent: "attack", value: 20 },
    ],
  },
  // Hell tier
  {
    id: "hellspawn",
    name: "지옥의 자식",
    nameJa: "地獄の子",
    nameEn: "Hellspawn",
    charType: "demon",
    hp: 130,
    patterns: [
      { intent: "poison", value: 10, poison: 3 },
      { intent: "attack", value: 14 },
      { intent: "attack", value: 14 },
      { intent: "poison", value: 12, poison: 2 },
      { intent: "buff", value: 0, strength: 3 },
    ],
  },
  // Bosses
  {
    id: "chaosboss",
    name: "카오스 드래곤",
    nameJa: "カオスドラゴン",
    nameEn: "Chaos Dragon",
    charType: "demon",
    hp: 160,
    isBoss: true,
    patterns: [
      { intent: "attack", value: 16 },
      { intent: "attack", value: 16 },
      { intent: "defend", value: 0, shield: 15 },
      { intent: "poison", value: 12, poison: 3 },
      { intent: "buff", value: 0, strength: 3 },
      { intent: "attack", value: 20 },
    ],
  },
  {
    id: "infernodragon",
    name: "지옥 화염룡",
    nameJa: "地獄炎竜",
    nameEn: "Inferno Dragon",
    charType: "phoenix",
    hp: 280,
    isBoss: true,
    patterns: [
      { intent: "attack", value: 22 },
      { intent: "attack", value: 22 },
      { intent: "defend", value: 0, shield: 20 },
      { intent: "poison", value: 16, poison: 4 },
      { intent: "buff", value: 0, strength: 4 },
      { intent: "attack", value: 26 },
      { intent: "attack", value: 18 },
    ],
  },
];

// ── Maps ───────────────────────────────────────────────────────────────────
// Normal (7F)
export const FIGHT_POOL: string[][] = [
  ["goblin"],
  ["goblin", "skeleton"],
  ["skeleton", "orc"],
  ["orc", "darkknight"],
  ["darkknight", "poisonwitch"],
  ["poisonwitch", "shadowdragon"],
];
export const ELITE_POOL: string[][] = [
  ["skeleton"],
  ["orc"],
  ["darkknight"],
  ["poisonwitch"],
  ["shadowdragon"],
  ["shadowdragon"],
];
// Hard (10F)
export const HARD_FIGHT_POOL: string[][] = [
  ["goblin"],
  ["goblin", "skeleton"],
  ["skeleton", "orc"],
  ["orc", "darkknight"],
  ["darkknight", "poisonwitch"],
  ["poisonwitch", "shadowdragon"],
  ["shadowdragon"],
  ["shadowdragon", "voidwarden"],
  ["voidwarden", "irongolem"],
];
export const HARD_ELITE_POOL: string[][] = [
  ["skeleton"],
  ["orc"],
  ["darkknight"],
  ["poisonwitch"],
  ["shadowdragon"],
  ["voidwarden"],
  ["voidwarden"],
  ["irongolem"],
  ["irongolem"],
];
// Hell (15F)
export const HELL_FIGHT_POOL: string[][] = [
  ["goblin", "skeleton"],
  ["skeleton", "orc"],
  ["orc", "darkknight"],
  ["darkknight", "poisonwitch"],
  ["poisonwitch", "shadowdragon"],
  ["shadowdragon"],
  ["shadowdragon", "voidwarden"],
  ["voidwarden"],
  ["voidwarden", "irongolem"],
  ["irongolem"],
  ["irongolem", "hellspawn"],
  ["hellspawn"],
  ["hellspawn", "irongolem"],
  ["hellspawn"],
];
export const HELL_ELITE_POOL: string[][] = [
  ["orc"],
  ["darkknight"],
  ["poisonwitch"],
  ["shadowdragon"],
  ["voidwarden"],
  ["voidwarden"],
  ["irongolem"],
  ["irongolem"],
  ["hellspawn"],
  ["hellspawn"],
  ["hellspawn"],
  ["hellspawn"],
  ["hellspawn", "irongolem"],
  ["hellspawn"],
];

export function ms(floor: number, alt: NodeType): NodeType {
  return floor >= 3 && Math.random() < 0.65 ? "shop" : alt;
}
export function generateMap(diff: Difficulty = "normal"): { options: NodeType[] }[] {
  if (diff === "hard")
    return [
      { options: shuffle(["fight", "treasure"] as NodeType[]) },
      { options: shuffle(["fight", "rest"] as NodeType[]) },
      { options: shuffle(["fight", "rest"] as NodeType[]) },
      { options: shuffle(["elite", "treasure"] as NodeType[]) },
      { options: shuffle(["fight", ms(4, "rest")] as NodeType[]) },
      { options: shuffle(["elite", "rest"] as NodeType[]) },
      { options: shuffle(["fight", ms(6, "treasure")] as NodeType[]) },
      { options: shuffle(["elite", ms(7, "rest")] as NodeType[]) },
      { options: shuffle([ms(8, "rest"), "fight"] as NodeType[]) },
      { options: ["boss" as NodeType] },
    ];
  if (diff === "hell")
    return [
      { options: shuffle(["fight", "treasure"] as NodeType[]) },
      { options: shuffle(["fight", "rest"] as NodeType[]) },
      { options: shuffle(["fight", "rest"] as NodeType[]) },
      { options: shuffle(["elite", "treasure"] as NodeType[]) },
      { options: shuffle(["fight", ms(4, "rest")] as NodeType[]) },
      { options: shuffle(["elite", ms(5, "rest")] as NodeType[]) },
      { options: shuffle(["fight", ms(6, "treasure")] as NodeType[]) },
      { options: shuffle(["elite", ms(7, "rest")] as NodeType[]) },
      { options: shuffle(["fight", ms(8, "rest")] as NodeType[]) },
      { options: shuffle(["elite", "treasure"] as NodeType[]) },
      { options: shuffle([ms(10, "fight"), ms(10, "rest")] as NodeType[]) },
      { options: shuffle(["elite", "rest"] as NodeType[]) },
      { options: shuffle(["fight", "elite"] as NodeType[]) },
      { options: shuffle([ms(13, "rest"), ms(13, "fight")] as NodeType[]) },
      { options: ["boss" as NodeType] },
    ];
  return [
    { options: shuffle(["fight", "treasure"] as NodeType[]) },
    { options: shuffle(["fight", "rest"] as NodeType[]) },
    { options: shuffle(["fight", "rest"] as NodeType[]) },
    { options: shuffle(["elite", ms(3, "treasure")] as NodeType[]) },
    { options: shuffle([ms(4, "fight"), "rest"] as NodeType[]) },
    { options: shuffle(["rest", "fight"] as NodeType[]) },
    { options: ["boss" as NodeType] },
  ];
}

export const ARCHETYPE_MAP: Partial<Record<CharacterType, string>> = {
  // warrior (4)
  wolf: "warrior",
  tiger: "warrior",
  lion: "warrior",
  bear: "warrior",
  // rogue (4)
  cat: "rogue",
  rabbit: "rogue",
  deer: "rogue",
  eagle: "rogue",
  // mage (5)
  ghost: "mage",
  owl: "mage",
  dragon: "mage",
  angel: "mage",
  phoenix: "mage",
  // tank (5)
  turtle: "tank",
  elephant: "tank",
  whale: "tank",
  crocodile: "tank",
  boar: "tank",
  // nature (4)
  plant: "nature",
  fish: "nature",
  unicorn: "nature",
  horse: "nature",
  // meka (3)
  robot: "meka",
  slime: "meka",
  beetle: "meka",
  // cursed (5)
  fox: "cursed",
  monkey: "cursed",
  raven: "cursed",
  snake: "cursed",
  demon: "cursed",
};

export const RARITY_HP: Record<CharacterRarity, number> = {
  common: 80,
  uncommon: 85,
  rare: 90,
  epic: 95,
  legendary: 100,
  mythic: 110,
};
export const CARD_PRICE: Record<CardRarity, number> = {
  common: 40,
  uncommon: 60,
  rare: 90,
  epic: 130,
  legendary: 180,
};

// ── Utilities ──────────────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}
export function toInst(d: CardDef): CardInstance {
  return { ...d, uid: uid() };
}
export function hasRelic(relics: RelicDef[], id: string): boolean {
  return relics.some((r) => r.id === id);
}
export function getEffectiveRelics(gs: { relics: RelicDef[]; cursedRelic: RelicDef | null }): RelicDef[] {
  return gs.cursedRelic ? [...gs.relics, gs.cursedRelic] : gs.relics;
}
export function pickRelicOffer(owned: RelicDef[], count: number): RelicDef[] {
  const ownedIds = new Set(owned.map((r) => r.id));
  return shuffle(RELICS.filter((r) => r.grade !== "boss" && !ownedIds.has(r.id))).slice(0, count);
}
export function pickBossRelicOffer(owned: RelicDef[]): RelicDef[] {
  const ownedIds = new Set(owned.map((r) => r.id));
  return shuffle(RELICS.filter((r) => r.grade === "boss" && !ownedIds.has(r.id))).slice(0, 3);
}

export function drawN(
  hand: CardInstance[],
  draw: CardInstance[],
  disc: CardInstance[],
  n: number,
) {
  let h = [...hand],
    d = [...draw],
    di = [...disc];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      if (di.length === 0) break;
      d = shuffle(di);
      di = [];
    }
    if (d.length > 0) {
      h = [...h, d[0]];
      d = d.slice(1);
    }
  }
  return { hand: h.slice(0, 7), drawPile: d, discardPile: di };
}

export function makeStarterDeck(type: CharacterType): CardInstance[] {
  const arch = ARCHETYPE_MAP[type] ?? "all";
  const ARCH_STARTERS: Record<string, string[]> = {
    warrior: ["war_howl", "war_howl", "reckless"],
    rogue: ["swift_strike", "swift_strike", "scratch"],
    mage: ["haunt", "haunt", "soul_drain"],
    tank: ["shell_block", "shell_block", "endure"],
    nature: ["life_force", "pulse_heal", "nature_bloom"],
    meka: ["absorb", "absorb", "overclock"],
    cursed: ["hex_scratch", "hex_scratch", "hex_bleed"],
    all: ["quick_guard", "quick_guard", "battle_cry"],
  };
  const ids = [
    "strike",
    "strike",
    "strike",
    "strike",
    "defend",
    "defend",
    "defend",
    ...(ARCH_STARTERS[arch] ?? ARCH_STARTERS.all),
  ];
  return shuffle(
    ids.map((id) => CARDS.find((c) => c.id === id)!).filter(Boolean),
  ).map(toInst);
}

export function pickRewards(
  floor: number,
  arch: string,
  diff: Difficulty = "normal",
  extraCard = false,
  fateDice = false,
  deck: CardInstance[] = [],
): CardDef[] {
  const count = extraCard ? 4 : 3;
  const allowLeg = floor >= DIFF_LEG_FLOOR[diff];
  const allowEpicFloor = DIFF_EPIC_FLOOR[diff];
  const deckCount = new Map<string, number>();
  for (const c of deck) deckCount.set(c.id, (deckCount.get(c.id) ?? 0) + 1);
  const pool = CARDS.filter((c) => {
    if (c.rarity === "legendary" && !allowLeg) return false;
    if (c.rarity === "epic" && floor < allowEpicFloor) return false;
    const maxCopies = c.archetype === "all" ? 3 : 2;
    if ((deckCount.get(c.id) ?? 0) >= maxCopies) return false;
    return c.archetype === arch || c.archetype === "all";
  });
  const weighted: CardDef[] = [];
  for (const c of pool) {
    const baseW =
      (
        { common: 5, uncommon: 4, rare: 3, epic: 2, legendary: 1 } as Record<
          string,
          number
        >
      )[c.rarity] ?? 1;
    const w = fateDice
      ? c.rarity === "common" || c.rarity === "uncommon"
        ? 1
        : baseW * 3
      : baseW;
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  const seen = new Set<string>();
  const res: CardDef[] = [];
  for (const c of shuffle(weighted)) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      res.push(c);
      if (res.length === count) break;
    }
  }
  while (res.length < count) {
    const fb = CARDS.find(
      (c) => !seen.has(c.id) && (deckCount.get(c.id) ?? 0) < (c.archetype === "all" ? 3 : 2),
    );
    if (fb) {
      seen.add(fb.id);
      res.push(fb);
    } else break;
  }
  return res;
}

export const CONSUMABLE_DEFS: Record<ShopConsumableId, { ko: string; ja: string; en: string; desc: string; descJa: string; descEn: string; basePrice: number }> = {
  elixir_30:  { ko: "엘릭서 (소)", ja: "エリクサー（小）", en: "Elixir S", desc: "HP 30% 회복", descJa: "HP30%回復", descEn: "Restore 30% HP", basePrice: 60 },
  elixir_50:  { ko: "엘릭서 (중)", ja: "エリクサー（中）", en: "Elixir M", desc: "HP 50% 회복", descJa: "HP50%回復", descEn: "Restore 50% HP", basePrice: 100 },
  elixir_100: { ko: "엘릭서 (대)", ja: "エリクサー（大）", en: "Elixir L", desc: "HP 100% 회복", descJa: "HP100%回復", descEn: "Full HP restore", basePrice: 200 },
  stat_str:   { ko: "힘의 결정", ja: "力の結晶", en: "Strength Crystal", desc: "힘 +2 (영구)", descJa: "力+2（永続）", descEn: "Gain +2 strength permanently", basePrice: 120 },
  stat_def:   { ko: "방어의 결정", ja: "防御の結晶", en: "Armor Crystal", desc: "방어력 +2 (영구)", descJa: "防御力+2（永続）", descEn: "Gain +2 armor permanently", basePrice: 100 },
  stat_maxhp: { ko: "생명의 결정", ja: "生命の結晶", en: "Vitality Crystal", desc: "최대HP +15 (영구)", descJa: "最大HP+15（永続）", descEn: "Gain +15 max HP permanently", basePrice: 110 },
  antidote:   { ko: "해독제", ja: "解毒剤", en: "Antidote", desc: "모든 상태이상 즉시 해제", descJa: "全状態異常を即座に解除", descEn: "Instantly clear all status effects", basePrice: 80 },
};

export function makeShopItems(
  arch: string,
  inflated = false,
  discount = false,
  deck: CardInstance[] = [],
  ownedRelics: RelicDef[] = [],
): ShopEntry[] {
  const deckCount = new Map<string, number>();
  for (const c of deck) deckCount.set(c.id, (deckCount.get(c.id) ?? 0) + 1);
  const cardPool = shuffle(
    CARDS.filter(
      (c) =>
        (c.archetype === arch || c.archetype === "all") &&
        (deckCount.get(c.id) ?? 0) < 3,
    ),
  ).slice(0, 3);
  const mult = (inflated ? 1.5 : 1.0) * (discount ? 0.75 : 1.0);
  const entries: ShopEntry[] = cardPool.map((card) => ({
    kind: "card" as const,
    card,
    price: Math.ceil(((CARD_PRICE[card.rarity] ?? 60) * mult) / 10) * 10,
    bought: false,
  }));

  // 2 random consumables
  const consumableIds = shuffle(Object.keys(CONSUMABLE_DEFS) as ShopConsumableId[]).slice(0, 2);
  for (const id of consumableIds) {
    const def = CONSUMABLE_DEFS[id];
    entries.push({ kind: "consumable", consumableId: id, price: Math.ceil((def.basePrice * mult) / 10) * 10, bought: false });
  }

  // 1 random relic
  const relicOffer = pickRelicOffer(ownedRelics, 1);
  if (relicOffer.length > 0) {
    entries.push({ kind: "relic", relic: relicOffer[0], price: Math.ceil((180 * mult) / 10) * 10, bought: false });
  }

  return shuffle(entries);
}

export function spawnEnemyForFloor(
  floor: number,
  nodeType: "fight" | "elite" | "boss",
  diff: Difficulty = "normal",
): EnemyState {
  const hardTier = diff === "hell" || diff === "challenge";
  let pool: string[];
  if (nodeType === "boss") {
    pool = hardTier ? ["infernodragon"] : ["chaosboss"];
  } else if (nodeType === "elite") {
    const p = hardTier
      ? HELL_ELITE_POOL
      : diff === "hard"
        ? HARD_ELITE_POOL
        : ELITE_POOL;
    pool = p[Math.min(floor, p.length - 1)];
  } else {
    const p = hardTier
      ? HELL_FIGHT_POOL
      : diff === "hard"
        ? HARD_FIGHT_POOL
        : FIGHT_POOL;
    pool = p[Math.min(floor, p.length - 1)];
  }
  const id = pool[Math.floor(Math.random() * pool.length)];
  const def = ENEMY_DEFS.find((e) => e.id === id) ?? ENEMY_DEFS[0];
  // 도전 모드는 스테이지에 따라 계속 강해짐 (연속 스케일링)
  const isInfinite = diff === "challenge" && floor >= CHALLENGE_FLOORS;
  const earlyMult = diff === "challenge" && !isInfinite
    ? floor < 50 ? 0.7 : floor < 55 ? 0.80 : floor < 60 ? 0.90 : 1
    : 1;
  const hpMult =
    DIFF_HP_MULT[diff] *
    (isInfinite ? infiniteHpMult(floor) : diff === "challenge" ? challengeHpMult(floor) : 1) *
    earlyMult;
  const atkBonus =
    DIFF_ATK_BONUS[diff] +
    (isInfinite ? infiniteAtkBonus(floor) : diff === "challenge" ? challengeAtkBonus(floor) : 0);
  const strBonus =
    DIFF_STR_BONUS[diff] + (diff === "challenge" ? Math.floor(Math.min(floor, CHALLENGE_FLOORS - 1) / 20) : 0);
  const scaledPatterns = def.patterns.map((p) => ({
    ...p,
    value:
      p.intent === "attack" || p.intent === "poison"
        ? p.value + atkBonus
        : p.value,
    strength: p.strength !== undefined ? p.strength + strBonus : p.strength,
  }));
  const scaledHp = Math.round(def.hp * hpMult);
  return {
    ...def,
    hp: scaledHp,
    patterns: scaledPatterns,
    currentHp: scaledHp,
    currentShield: 0,
    currentStrength: 0,
    poisonStacks: 0,
    bleedStacks: 0,
    burnStacks: 0,
    fearStacks: 0,
    bindStacks: 0,
    shockStacks: 0,
    curseStacks: 0,
    patternIdx: 0,
  };
}

// ── Shop item pixel art icons ─────────────────────────────────────────────
export function PixelPotionIcon({ size = 32, variant = "blue" }: { size?: number; variant?: "blue" | "cyan" | "gold" | "green" }) {
  const C2 = {
    blue:  { b: "#3b82f6", h: "#93c5fd", d: "#1d4ed8" },
    cyan:  { b: "#06b6d4", h: "#67e8f9", d: "#0e7490" },
    gold:  { b: "#f59e0b", h: "#fde68a", d: "#b45309" },
    green: { b: "#22c55e", h: "#86efac", d: "#15803d" },
  }[variant];
  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 10 12" style={{ imageRendering: "pixelated", display: "block" }}>
      {/* cork */}
      <rect x="3" y="0" width="4" height="1" fill="#94a3b8" />
      <rect x="4" y="1" width="2" height="1" fill="#64748b" />
      {/* neck */}
      <rect x="4" y="2" width="2" height="1" fill="#334155" />
      {/* shoulders */}
      <rect x="2" y="3" width="6" height="1" fill={C2.b} />
      {/* body */}
      <rect x="1" y="4" width="8" height="6" fill={C2.b} />
      {/* highlight */}
      <rect x="2" y="4" width="1" height="4" fill={C2.h} />
      <rect x="3" y="4" width="1" height="2" fill={C2.h} />
      {/* bubble */}
      <rect x="6" y="6" width="1" height="1" fill={C2.h} />
      {/* side shadow */}
      <rect x="8" y="4" width="1" height="6" fill={C2.d} opacity="0.5" />
      {/* base */}
      <rect x="2" y="10" width="6" height="1" fill={C2.d} />
      {/* size bands */}
      {variant === "cyan" && <><rect x="1" y="7" width="8" height="1" fill={C2.d} opacity="0.3" /></>}
      {variant === "gold" && <><rect x="1" y="6" width="8" height="1" fill={C2.d} opacity="0.25" /><rect x="1" y="8" width="8" height="1" fill={C2.d} opacity="0.25" /></>}
    </svg>
  );
}

export function PixelCrystalIcon({ size = 32, variant = "red" }: { size?: number; variant?: "red" | "green" | "pink" }) {
  const C2 = {
    red:   { m: "#ef4444", h: "#fca5a5", d: "#991b1b" },
    green: { m: "#22c55e", h: "#86efac", d: "#15803d" },
    pink:  { m: "#ec4899", h: "#f9a8d4", d: "#9d174d" },
  }[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 10 12" style={{ imageRendering: "pixelated", display: "block" }}>
      {/* top tip */}
      <rect x="4" y="0" width="2" height="1" fill={C2.h} />
      {/* upper facets */}
      <rect x="2" y="1" width="6" height="2" fill={C2.m} />
      <rect x="2" y="1" width="2" height="2" fill={C2.h} />
      {/* waist */}
      <rect x="1" y="3" width="8" height="5" fill={C2.m} />
      <rect x="2" y="3" width="2" height="3" fill={C2.h} />
      {/* lower taper */}
      <rect x="2" y="8" width="6" height="2" fill={C2.d} />
      {/* bottom tip */}
      <rect x="4" y="10" width="2" height="2" fill={C2.d} />
    </svg>
  );
}

export function PixelRelicShopIcon({ size = 32, grade = "common" }: { size?: number; grade?: string }) {
  if (grade === "unique") {
    // Gold star / crown
    return (
      <svg width={size} height={size} viewBox="0 0 11 11" style={{ imageRendering: "pixelated", display: "block" }}>
        <rect x="4" y="0" width="3" height="2" fill="#fbbf24" />
        <rect x="3" y="1" width="5" height="1" fill="#fde68a" />
        <rect x="0" y="3" width="11" height="2" fill="#fbbf24" />
        <rect x="1" y="2" width="2" height="2" fill="#fbbf24" />
        <rect x="8" y="2" width="2" height="2" fill="#fbbf24" />
        <rect x="1" y="5" width="9" height="4" fill="#f59e0b" />
        <rect x="2" y="5" width="2" height="3" fill="#fde68a" />
        <rect x="0" y="9" width="11" height="2" fill="#b45309" />
      </svg>
    );
  }
  if (grade === "rare") {
    // Purple gem
    return (
      <svg width={size} height={size} viewBox="0 0 10 12" style={{ imageRendering: "pixelated", display: "block" }}>
        <rect x="3" y="0" width="4" height="1" fill="#c4b5fd" />
        <rect x="1" y="1" width="8" height="2" fill="#a78bfa" />
        <rect x="1" y="1" width="2" height="2" fill="#ddd6fe" />
        <rect x="0" y="3" width="10" height="5" fill="#7c3aed" />
        <rect x="1" y="3" width="2" height="3" fill="#a78bfa" />
        <rect x="0" y="8" width="10" height="2" fill="#6d28d9" />
        <rect x="3" y="10" width="4" height="2" fill="#5b21b6" />
      </svg>
    );
  }
  // Common - coin
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ imageRendering: "pixelated", display: "block" }}>
      <rect x="2" y="0" width="6" height="1" fill="#fde68a" />
      <rect x="1" y="1" width="8" height="1" fill="#fde68a" />
      <rect x="0" y="2" width="10" height="6" fill="#f59e0b" />
      <rect x="1" y="2" width="2" height="4" fill="#fde68a" />
      <rect x="4" y="2" width="2" height="6" fill="#b45309" opacity="0.35" />
      <rect x="3" y="4" width="4" height="2" fill="#b45309" opacity="0.35" />
      <rect x="1" y="8" width="8" height="1" fill="#fbbf24" />
      <rect x="2" y="9" width="6" height="1" fill="#b45309" />
    </svg>
  );
}

// ── Relic category pixel art icons ────────────────────────────────────────
export function RelicCombatIcon({
  size = 22,
  color = "#ef4444",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 9"
      style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
    >
      <rect x="3" y="0" width="2" height="4" fill={color} />
      <rect x="0" y="4" width="8" height="1" fill={color} />
      <rect x="3" y="5" width="2" height="2" fill={color} opacity="0.65" />
      <rect x="2" y="7" width="4" height="2" fill={color} />
      <rect x="4" y="1" width="1" height="2" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}
export function RelicUtilityIcon({
  size = 22,
  color = "#22c55e",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 9"
      style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
    >
      <rect x="1" y="0" width="6" height="1" fill={color} />
      <rect x="0" y="1" width="8" height="4" fill={color} />
      <rect x="1" y="5" width="6" height="1" fill={color} />
      <rect x="2" y="6" width="4" height="1" fill={color} />
      <rect x="3" y="7" width="2" height="2" fill={color} />
      <rect x="3" y="2" width="2" height="1" fill="rgba(255,255,255,0.35)" />
      <rect x="2" y="2" width="1" height="1" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}
export function RelicRewardIcon({
  size = 22,
  color = "#f59e0b",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 8"
      style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
    >
      <rect x="2" y="0" width="4" height="1" fill={color} />
      <rect x="1" y="1" width="6" height="1" fill={color} />
      <rect x="0" y="2" width="8" height="4" fill={color} />
      <rect x="1" y="6" width="6" height="1" fill={color} />
      <rect x="2" y="7" width="4" height="1" fill={color} />
      <rect x="2" y="3" width="1" height="2" fill="rgba(255,255,255,0.4)" />
      <rect x="5" y="3" width="1" height="2" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

// ── Card Component ─────────────────────────────────────────────────────────
export function CardView({
  card,
  canPlay,
  onClick,
  selected,
  lang = "ko",
}: {
  card: CardDef;
  canPlay: boolean;
  onClick?: () => void;
  selected?: boolean;
  lang?: string;
}) {
  const rs = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.common;
  const accent = TYPE_ACCENT[card.type] ?? "#94a3b8";
  const ko = lang === "ko";
  const ja = lang === "ja";
  const cardName = ko ? card.name : ja ? card.nameJa : card.nameEn;
  const cardDesc = ko ? card.desc : ja ? card.descJa : card.descEn;
  const typeLabel =
    card.type === "attack"
      ? ko
        ? "공격"
        : ja
          ? "攻撃"
          : "ATTACK"
      : card.type === "skill"
        ? ko
          ? "기술"
          : ja
            ? "スキル"
            : "SKILL"
        : ko
          ? "파워"
          : ja
            ? "パワー"
            : "POWER";
  const rarityLabel =
    card.rarity === "legendary"
      ? ko
        ? "전설"
        : ja
          ? "伝説"
          : "Legendary"
      : card.rarity === "epic"
        ? ko
          ? "에픽"
          : ja
            ? "エピック"
            : "Epic"
        : ko
          ? "레어"
          : ja
            ? "レア"
            : "Rare";
  return (
    <div
      onClick={canPlay ? onClick : undefined}
      style={{
        width: 90,
        minWidth: 90,
        height: 130,
        borderRadius: 8,
        border: `2px solid ${selected ? "#facc15" : rs.border}`,
        background: TYPE_BG[card.type] ?? C.panel,
        boxShadow: canPlay
          ? `0 0 10px ${rs.glow}, ${selected ? "0 0 16px #facc1566" : ""}`
          : "none",
        cursor: canPlay ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        opacity: canPlay ? 1 : 0.45,
        transform: canPlay ? "translateY(0)" : undefined,
        transition: "box-shadow 0.12s",
        flexShrink: 0,
        fontFamily: FONT,
      }}
    >
      {/* Cost orb */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "5px 7px 3px",
          borderBottom: `1px solid ${C.border}`,
          background: `${accent}18`,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 900,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {card.cost}
        </div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: accent,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {typeLabel}
        </div>
      </div>

      {/* Name */}
      <div
        style={{
          padding: "5px 7px 3px",
          fontSize: 10,
          fontWeight: 800,
          color: C.textBright,
          lineHeight: 1.3,
        }}
      >
        {cardName}
      </div>

      {/* Rarity dot */}
      <div style={{ padding: "0 7px 4px", display: "flex", gap: 3 }}>
        {["legendary", "epic", "rare", "uncommon", "common"].indexOf(
          card.rarity,
        ) < 3 ? (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: rs.badge,
              background: `${rs.badge}20`,
              borderRadius: 3,
              padding: "1px 4px",
            }}
          >
            {rarityLabel}
          </span>
        ) : null}
      </div>

      {/* Desc */}
      <div
        style={{
          flex: 1,
          padding: "0 7px 6px",
          fontSize: 10,
          color: C.textDim,
          lineHeight: 1.4,
          overflow: "hidden",
        }}
      >
        {cardDesc}
      </div>

      {/* Bottom accent */}
      <div style={{ height: 3, background: accent, opacity: 0.6 }} />
    </div>
  );
}

// ── HP Bar ─────────────────────────────────────────────────────────────────
export function HpBar({
  hp,
  max,
  color = "#22c55e",
}: {
  hp: number;
  max: number;
  color?: string;
}) {
  const pct = Math.max(0, hp / max);
  const col = pct > 0.5 ? color : pct > 0.25 ? "#facc15" : "#ef4444";
  return (
    <div
      style={{
        height: 8,
        background: "#0a0a0a",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct * 100}%`,
          background: `linear-gradient(90deg,${col}88,${col})`,
          transition: "width 0.35s",
        }}
      />
    </div>
  );
}

// ── Intent badge ───────────────────────────────────────────────────────────
export function IntentBadge({
  pattern,
  ko,
  ja = false,
}: {
  pattern: EnemyPattern;
  ko: boolean;
  ja?: boolean;
}) {
  const intentInfo: Record<
    Intent,
    {
      label: string;
      labelJa: string;
      labelEn: string;
      color: string;
      icon: React.ReactNode;
      poisonSuffix: string;
      poisonSuffixJa: string;
      poisonSuffixEn: string;
    }
  > = {
    attack: {
      label: "공격",
      labelJa: "攻撃",
      labelEn: "Attack",
      color: "#ef4444",
      icon: <Swords size={12} />,
      poisonSuffix: " + 독",
      poisonSuffixJa: " + 毒",
      poisonSuffixEn: " + poison ",
    },
    defend: {
      label: "방어",
      labelJa: "防御",
      labelEn: "Defend",
      color: "#3b82f6",
      icon: <Shield size={12} />,
      poisonSuffix: " + 독",
      poisonSuffixJa: " + 毒",
      poisonSuffixEn: " + poison ",
    },
    buff: {
      label: "강화",
      labelJa: "強化",
      labelEn: "Buff",
      color: "#f59e0b",
      icon: <Star size={12} />,
      poisonSuffix: " + 독",
      poisonSuffixJa: " + 毒",
      poisonSuffixEn: " + poison ",
    },
    poison: {
      label: "독 공격",
      labelJa: "毒攻撃",
      labelEn: "Poison",
      color: "#a855f7",
      icon: <Flame size={12} />,
      poisonSuffix: " + 독",
      poisonSuffixJa: " + 毒",
      poisonSuffixEn: " + poison ",
    },
  };
  const info = intentInfo[pattern.intent] ?? intentInfo.attack;
  const val =
    pattern.intent === "attack" || pattern.intent === "poison"
      ? pattern.value
      : (pattern.shield ?? pattern.strength ?? pattern.value);
  const intentLabel = ko ? info.label : ja ? info.labelJa : info.labelEn;
  const poisonText = pattern.poison
    ? ko
      ? `${info.poisonSuffix}${pattern.poison}`
      : ja
        ? `${info.poisonSuffixJa}${pattern.poison}`
        : `${info.poisonSuffixEn}${pattern.poison}`
    : "";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: `${info.color}18`,
        border: `1px solid ${info.color}44`,
        borderRadius: 6,
        padding: "4px 10px",
        color: info.color,
        fontFamily: FONT,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {info.icon}
      {intentLabel} {val}
      {poisonText}
    </div>
  );
}

// ── Node icon ──────────────────────────────────────────────────────────────
export function NodeIcon({ type, size = 20 }: { type: NodeType; size?: number }) {
  const map: Record<NodeType, { icon: React.ReactNode; color: string }> = {
    fight: { icon: <Swords size={size} />, color: "#ef4444" },
    elite: { icon: <Skull size={size} />, color: "#f97316" },
    treasure: { icon: <Star size={size} />, color: "#f59e0b" },
    shop: { icon: <ShoppingCart size={size} />, color: "#22c55e" },
    rest: { icon: <Flame size={size} />, color: "#60a5fa" },
    boss: { icon: <Trophy size={size} />, color: "#ec4899" },
  };
  const info = map[type] ?? map.fight;
  return <span style={{ color: info.color }}>{info.icon}</span>;
}

