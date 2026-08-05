import { useEffect, useRef, useState } from "react";
import {
  Swords,
  Sword,
  Shield,
  Leaf,
  Cog,
  Skull,
  Star,
  ChevronLeft,
  Gift,
  X,
  Plus,
} from "lucide-react";
import { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS,
  getCharName,
  type CharacterRarity,
  type CharacterType,
} from "../data/characters";
import { api } from "../lib/api";
import { RARITY_THEME } from "./BattleReplay";

// ColosseumPage.tsx의 시즌/티어 데이터, 아레나 전투력 계산, 티켓/NPC 쿨다운 훅,
// 덱 편집·시즌보상·툴팁 등 프레젠테이션 컴포넌트를 분리한 파일. 이 파일의 내용은
// 전부 ColosseumPage() 함수 "바깥"(모듈 최상위)에 이미 정의돼 있던 것들이라
// 클로저 변환 없이 그대로 옮기고 export만 붙였다 — 실제 로직/JSX는 손대지 않음.

// ─── 시즌/티어 상수 (외부 컴포넌트에서 import함 — 유지 필수) ──────────────────
// 시즌 번호/기간은 하드코딩 대신 현재 날짜로 계산 — rewards.service.ts의
// getCurrentSeasonNumber()와 동일한 기준점(2026년 6월 = 시즌1)이라 매달 1일
// 00시(KST) 시즌 전환 시 배포 없이 자동으로 맞물린다.
export function getCurrentSeasonInfo() {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = kstNow.getUTCFullYear();
  const month = kstNow.getUTCMonth() + 1;
  const number = (year - 2026) * 12 + (month - 6) + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    number,
    startDate: `${year}-${pad(month)}-01`,
    endDate: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}
export const SEASON = getCurrentSeasonInfo();

export const BORDER_STYLES: Record<string, { image: string }> = {
  s1_silver: { image: "/silver.png" },
  s1_gold: { image: "/gold.png" },
  s1_platinum: { image: "/platinum.png" },
  s1_diamond: { image: "/diamond.png" },
  s1_master: { image: "/master.png" },
  s1_challenger: { image: "/challenger.png" },
  s2_silver: { image: "/silver.png" },
  s2_gold: { image: "/gold.png" },
  s2_platinum: { image: "/platinum.png" },
  s2_diamond: { image: "/diamond.png" },
  s2_master: { image: "/master.png" },
  s2_challenger: { image: "/challenger.png" },
  s3_silver: { image: "/silver.png" },
  s3_gold: { image: "/gold.png" },
  s3_platinum: { image: "/platinum.png" },
  s3_diamond: { image: "/diamond.png" },
  s3_master: { image: "/master.png" },
  s3_challenger: { image: "/challenger.png" },
  gm: { image: "/GM.png" },
};

// Alpha-channel-measured transparent "hole" geometry for each border frame PNG.
// Canvas size and hole size/position differ per asset (511x488 for silver/gold/
// platinum/GM, 501x381 diamond, 225x204 master, 184x204 challenger), so sizing every
// frame into a fixed square with a single hardcoded padding misaligned the smaller/
// wider tiers. This table lets the photo be sized and positioned to match each
// frame's actual hole instead.
export const BORDER_HOLE_GEOMETRY: Record<
  string,
  { canvasW: number; canvasH: number; holeW: number; holeH: number; holeCx: number; holeCy: number }
> = {
  "/silver.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 244, holeCx: 255, holeCy: 241.5 },
  "/gold.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 244, holeCx: 255, holeCy: 241.5 },
  "/platinum.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 245, holeCx: 255, holeCy: 242 },
  "/diamond.png": { canvasW: 501, canvasH: 381, holeW: 198, holeH: 198, holeCx: 253.5, holeCy: 193.5 },
  "/master.png": { canvasW: 225, canvasH: 204, holeW: 94, holeH: 102, holeCx: 114.5, holeCy: 100.5 },
  "/challenger.png": { canvasW: 184, canvasH: 204, holeW: 90, holeH: 92, holeCx: 92.5, holeCy: 98.5 },
  "/GM.png": { canvasW: 511, canvasH: 488, holeW: 231, holeH: 247, holeCx: 255, holeCy: 240 },
};

export interface BorderLayout {
  /** the fixed box every border renders into, regardless of the source PNG's own aspect ratio */
  containerSize: number;
  /** frame image is letterboxed ("contain") inside containerSize, so it never overflows it */
  frameW: number;
  frameH: number;
  frameLeft: number;
  frameTop: number;
  /** photo size/position that lines up with this specific frame's hole at the resulting scale */
  photoSize: number;
  photoLeft: number;
  photoTop: number;
}

// Frames have wildly different native canvas sizes/aspect ratios (511x488 square-ish vs
// 184x204 challenger), so sizing the outer box to "whatever fits the hole" (old behavior)
// made the equipped-border box balloon to a different size per tier — visually breaking
// layouts that assumed a fixed avatar slot. Instead we fix containerSize once, letterbox
// the frame image to fit inside it (like object-fit: contain), and derive the photo's
// size/position from that same scale so it still lines up with the frame's actual hole.
export function getBorderLayout(imagePath: string, containerSize: number): BorderLayout {
  const g = BORDER_HOLE_GEOMETRY[imagePath];
  if (!g) {
    return {
      containerSize,
      frameW: containerSize,
      frameH: containerSize,
      frameLeft: 0,
      frameTop: 0,
      photoSize: containerSize,
      photoLeft: 0,
      photoTop: 0,
    };
  }
  const scale = Math.min(containerSize / g.canvasW, containerSize / g.canvasH);
  const frameW = g.canvasW * scale;
  const frameH = g.canvasH * scale;
  const frameLeft = (containerSize - frameW) / 2;
  const frameTop = (containerSize - frameH) / 2;
  const photoSize = ((g.holeW + g.holeH) / 2) * scale;
  return {
    containerSize,
    frameW,
    frameH,
    frameLeft,
    frameTop,
    photoSize,
    photoLeft: frameLeft + g.holeCx * scale - photoSize / 2,
    photoTop: frameTop + g.holeCy * scale - photoSize / 2,
  };
}

export const BORDER_NAMES: Record<
  string,
  { ko: string; ja: string; en: string }
> = {
  s1_silver: { ko: "S1 실버", ja: "S1シルバー", en: "S1 Silver" },
  s1_gold: { ko: "S1 골드", ja: "S1ゴールド", en: "S1 Gold" },
  s1_platinum: { ko: "S1 플레티넘", ja: "S1プラチナ", en: "S1 Platinum" },
  s1_diamond: { ko: "S1 다이아몬드", ja: "S1ダイヤ", en: "S1 Diamond" },
  s1_master: { ko: "S1 마스터", ja: "S1マスター", en: "S1 Master" },
  s1_challenger: {
    ko: "S1 챌린저",
    ja: "S1チャレンジャー",
    en: "S1 Challenger",
  },
  s2_silver: { ko: "S2 실버", ja: "S2シルバー", en: "S2 Silver" },
  s2_gold: { ko: "S2 골드", ja: "S2ゴールド", en: "S2 Gold" },
  s2_platinum: { ko: "S2 플레티넘", ja: "S2プラチナ", en: "S2 Platinum" },
  s2_diamond: { ko: "S2 다이아몬드", ja: "S2ダイヤ", en: "S2 Diamond" },
  s2_master: { ko: "S2 마스터", ja: "S2マスター", en: "S2 Master" },
  s2_challenger: {
    ko: "S2 챌린저",
    ja: "S2チャレンジャー",
    en: "S2 Challenger",
  },
  s3_silver: { ko: "S3 실버", ja: "S3シルバー", en: "S3 Silver" },
  s3_gold: { ko: "S3 골드", ja: "S3ゴールド", en: "S3 Gold" },
  s3_platinum: { ko: "S3 플레티넘", ja: "S3プラチナ", en: "S3 Platinum" },
  s3_diamond: { ko: "S3 다이아몬드", ja: "S3ダイヤ", en: "S3 Diamond" },
  s3_master: { ko: "S3 마스터", ja: "S3マスター", en: "S3 Master" },
  s3_challenger: {
    ko: "S3 챌린저",
    ja: "S3チャレンジャー",
    en: "S3 Challenger",
  },
  gm: { ko: "GM", ja: "GM", en: "GM" },
};

// ─── 티어 ─────────────────────────────────────────────────────────────────────
export const TIERS = [
  {
    key: "bronze",
    ko: "브론즈",
    ja: "ブロンズ",
    en: "Bronze",
    min: 0,
    color: "#cd7f32",
    glow: "#8B4513",
  },
  {
    key: "silver",
    ko: "실버",
    ja: "シルバー",
    en: "Silver",
    min: 3000,
    color: "#c0c0c0",
    glow: "#708090",
  },
  {
    key: "gold",
    ko: "골드",
    ja: "ゴールド",
    en: "Gold",
    min: 6000,
    color: "#ffd700",
    glow: "#b8860b",
  },
  {
    key: "platinum",
    ko: "플레티넘",
    ja: "プラチナ",
    en: "Platinum",
    min: 9000,
    color: "#40e0d0",
    glow: "#008b8b",
  },
  {
    key: "diamond",
    ko: "다이아몬드",
    ja: "ダイヤモンド",
    en: "Diamond",
    min: 12000,
    color: "#b9f2ff",
    glow: "#4169e1",
  },
  {
    key: "master",
    ko: "마스터",
    ja: "マスター",
    en: "Master",
    min: 15000,
    color: "#da70d6",
    glow: "#800080",
  },
  {
    key: "challenger",
    ko: "챌린저",
    ja: "チャレンジャー",
    en: "Challenger",
    min: 18000,
    color: "#ff4500",
    glow: "#8b0000",
  },
] as const;

export const SEASON_REWARDS = [
  {
    tierKey: "challenger",
    ko: "챌린저",
    ja: "チャレンジャー",
    en: "Challenger",
    minPts: 18000,
    bonusPoints: 6000,
    color: "#ff4500",
    glow: "#8b0000",
  },
  {
    tierKey: "master",
    ko: "마스터",
    ja: "マスター",
    en: "Master",
    minPts: 15000,
    bonusPoints: 4500,
    color: "#da70d6",
    glow: "#9400d3",
  },
  {
    tierKey: "diamond",
    ko: "다이아몬드",
    ja: "ダイヤモンド",
    en: "Diamond",
    minPts: 12000,
    bonusPoints: 3000,
    color: "#b9f2ff",
    glow: "#4169e1",
  },
  {
    tierKey: "platinum",
    ko: "플레티넘",
    ja: "プラチナ",
    en: "Platinum",
    minPts: 9000,
    bonusPoints: 2100,
    color: "#40e0d0",
    glow: "#008b8b",
  },
  {
    tierKey: "gold",
    ko: "골드",
    ja: "ゴールド",
    en: "Gold",
    minPts: 6000,
    bonusPoints: 1500,
    color: "#ffd700",
    glow: "#b8860b",
  },
  {
    tierKey: "silver",
    ko: "실버",
    ja: "シルバー",
    en: "Silver",
    minPts: 3000,
    bonusPoints: 900,
    color: "#c0c0c0",
    glow: "#708090",
  },
] as const;

// 원본 PNG마다 캔버스 여백/비율이 달라 objectFit:contain만으로는 배지 크기가 들쭉날쭉해 보정용 스케일
export const TIER_ICON_SCALE: Record<string, number> = {
  challenger: 1.03,
  master: 1.02,
  diamond: 1.12,
  platinum: 1,
  gold: 1,
  silver: 1,
};

// ─── 스탯/직업 ────────────────────────────────────────────────────────────────

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
export const C = {
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
export const FONT = "'Noto Sans KR','Noto Sans JP',sans-serif";

export const RARITY_KO: Record<string, string> = {
  common: "커먼",
  uncommon: "언커먼",
  rare: "레어",
  epic: "에픽",
  legendary: "레전더리",
  mythic: "신화",
};
export const RARITY_JA: Record<string, string> = {
  common: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  epic: "エピック",
  legendary: "レジェンダリー",
  mythic: "ミシック",
};
export const RARITY_EN: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

// ─── 콜로세움 스탯 계산 (서버 로직 미러) ────────────────────────────────────────
export const ARENA_TYPE_ARCHETYPE: Record<string, string> = {
  wolf: "warrior",
  tiger: "warrior",
  lion: "warrior",
  bear: "warrior",
  cat: "rogue",
  rabbit: "rogue",
  deer: "rogue",
  eagle: "rogue",
  ghost: "mage",
  owl: "mage",
  dragon: "mage",
  angel: "mage",
  phoenix: "mage",
  turtle: "tank",
  elephant: "tank",
  whale: "tank",
  crocodile: "tank",
  boar: "tank",
  plant: "nature",
  fish: "nature",
  unicorn: "nature",
  horse: "nature",
  robot: "meka",
  slime: "meka",
  beetle: "meka",
  fox: "cursed",
  monkey: "cursed",
  raven: "cursed",
  snake: "cursed",
  demon: "cursed",
};
export const ARENA_RARITY_BASE: Record<
  string,
  { hp: number; atk: number; spd: number }
> = {
  common: { hp: 80, atk: 10, spd: 80 },
  uncommon: { hp: 90, atk: 12, spd: 85 },
  rare: { hp: 100, atk: 15, spd: 90 },
  epic: { hp: 115, atk: 19, spd: 95 },
  legendary: { hp: 130, atk: 24, spd: 100 },
  mythic: { hp: 150, atk: 30, spd: 110 },
};
export const ARENA_ARCH_MULT: Record<
  string,
  { hp: number; atk: number; spd: number }
> = {
  warrior: { hp: 0.9, atk: 1.3, spd: 1.0 },
  tank: { hp: 1.5, atk: 0.6, spd: 0.75 },
  mage: { hp: 0.8, atk: 1.5, spd: 1.0 },
  rogue: { hp: 0.85, atk: 1.1, spd: 1.4 },
  nature: { hp: 1.3, atk: 0.75, spd: 0.85 },
  meka: { hp: 1.1, atk: 1.0, spd: 1.1 },
  cursed: { hp: 0.8, atk: 1.4, spd: 1.1 },
  all: { hp: 1.0, atk: 1.0, spd: 1.0 },
};
export const ARENA_ENH_PER_LV: Record<
  string,
  { hp: number; atk: number; spd: number }
> = {
  warrior: { hp: 3, atk: 5, spd: 2 },
  tank: { hp: 6, atk: 2, spd: 1 },
  mage: { hp: 2, atk: 6, spd: 1 },
  rogue: { hp: 2, atk: 3, spd: 5 },
  nature: { hp: 5, atk: 2, spd: 2 },
  meka: { hp: 3, atk: 3, spd: 3 },
  cursed: { hp: 2, atk: 4, spd: 4 },
  all: { hp: 3, atk: 3, spd: 3 },
};
export const ARENA_ARCH_SKILLS: Record<
  string,
  { basic: string; skill: string; ultimate: string }
> = {
  warrior: { basic: "강타", skill: "연격", ultimate: "폭풍검" },
  tank: { basic: "방패 치기", skill: "방어 태세", ultimate: "철벽 방어" },
  mage: { basic: "마법탄", skill: "파이어볼", ultimate: "메테오" },
  rogue: { basic: "단검 찌르기", skill: "연속 베기", ultimate: "암살" },
  nature: { basic: "넝쿨 채찍", skill: "치유의 손길", ultimate: "대자연의 힘" },
  meka: { basic: "레이저", skill: "미사일", ultimate: "에너지 캐논" },
  cursed: { basic: "저주 공격", skill: "저주의 낙인", ultimate: "재앙 선포" },
  all: { basic: "공격", skill: "강화 공격", ultimate: "전력 공격" },
};
export const ARCH_LABEL_KO: Record<string, string> = {
  warrior: "전사",
  tank: "탱커",
  mage: "마법사",
  rogue: "도적",
  nature: "자연",
  meka: "메카",
  cursed: "저주술사",
  all: "올라운더",
};
export function calcArenaStat(charType: string, rarity: string, enhLevel = 0) {
  const arch = ARENA_TYPE_ARCHETYPE[charType] ?? "all";
  const base = ARENA_RARITY_BASE[rarity] ?? ARENA_RARITY_BASE.common;
  const mult = ARENA_ARCH_MULT[arch] ?? ARENA_ARCH_MULT.all;
  const enh = ARENA_ENH_PER_LV[arch] ?? ARENA_ENH_PER_LV.all;
  return {
    arch,
    hp: Math.round(base.hp * mult.hp * (1 + (enhLevel * enh.hp) / 100)),
    atk: Math.round(base.atk * mult.atk * (1 + (enhLevel * enh.atk) / 100)),
    spd: Math.round(base.spd * mult.spd * (1 + (enhLevel * enh.spd) / 100)),
    enhHp:
      enhLevel > 0
        ? Math.round(base.hp * mult.hp * (1 + ((enhLevel - 1) * enh.hp) / 100))
        : null,
    enhAtk:
      enhLevel > 0
        ? Math.round(
            base.atk * mult.atk * (1 + ((enhLevel - 1) * enh.atk) / 100),
          )
        : null,
    enhSpd:
      enhLevel > 0
        ? Math.round(
            base.spd * mult.spd * (1 + ((enhLevel - 1) * enh.spd) / 100),
          )
        : null,
    skills: ARENA_ARCH_SKILLS[arch] ?? ARENA_ARCH_SKILLS.all,
    enhLevel,
    enh,
  };
}

// ─── NPC 대전 상대 정의 ───────────────────────────────────────────────────────
export interface NpcOpponent {
  id: string;
  nameKo: string;
  nameJa: string;
  nameEn: string;
  tierIdx: number;
  fakePts: number;
  slots: number[]; // 방어 덱 character IDs
  enhLvs: number[]; // 각 캐릭터 강화 레벨
  stars: number; // 1~5 난이도
  winPts: number;
  lossPts: number;
  descKo: string;
  descJa: string;
  descEn: string;
}

export const NPC_OPPONENTS: NpcOpponent[] = [
  {
    id: "npc_1",
    nameKo: "브론즈 훈련병",
    nameJa: "ブロンズ訓練兵",
    nameEn: "Bronze Recruit",
    tierIdx: 0,
    fakePts: 400,
    slots: [4, 7, 8, 9],
    enhLvs: [0, 0, 0, 0],
    stars: 1,
    winPts: 50,
    lossPts: 0,
    descKo: "기초 훈련 중인 새내기. 쉽게 이길 수 있다.",
    descJa: "基礎訓練中の新入り。簡単に勝てる。",
    descEn: "A rookie still in basic training. An easy win.",
  },
  {
    id: "npc_2",
    nameKo: "견습 수비대",
    nameJa: "見習い守備隊",
    nameEn: "Rookie Guard",
    tierIdx: 0,
    fakePts: 1000,
    slots: [5, 6, 11, 12],
    enhLvs: [0, 0, 0, 0],
    stars: 1,
    winPts: 60,
    lossPts: 0,
    descKo: "균형 잡힌 입문자 편성. 무난한 상대.",
    descJa: "バランスの取れた入門者編成。手堅い相手。",
    descEn: "Balanced beginner lineup. A reliable but easy opponent.",
  },
  {
    id: "npc_3",
    nameKo: "실버 검사",
    nameJa: "シルバー剣士",
    nameEn: "Silver Swordsman",
    tierIdx: 1,
    fakePts: 3200,
    slots: [20, 14, 22, 84],
    enhLvs: [0, 0, 0, 0],
    stars: 2,
    winPts: 90,
    lossPts: 0,
    descKo: "언커먼 캐릭터로 구성된 전투 베테랑.",
    descJa: "アンコモンキャラで構成された戦闘ベテラン。",
    descEn: "A battle veteran built with uncommon characters.",
  },
  {
    id: "npc_4",
    nameKo: "저주의 술사",
    nameJa: "呪いの術師",
    nameEn: "Cursed Warlock",
    tierIdx: 1,
    fakePts: 4500,
    slots: [16, 91, 90, 21],
    enhLvs: [1, 1, 0, 0],
    stars: 2,
    winPts: 100,
    lossPts: 0,
    descKo: "저주와 회피가 특기. 방심하면 위험하다.",
    descJa: "呪いと回避が得意。油断すると危険。",
    descEn: "Specializes in curses and evasion. Don't let your guard down.",
  },
  {
    id: "npc_5",
    nameKo: "골드 전사단",
    nameJa: "ゴールド戦士団",
    nameEn: "Gold Warriors",
    tierIdx: 2,
    fakePts: 7500,
    slots: [26, 35, 33, 36],
    enhLvs: [2, 2, 1, 1],
    stars: 3,
    winPts: 150,
    lossPts: 0,
    descKo: "레어 등급 4인 균형 편성. 전략이 필요하다.",
    descJa: "レアランク4人の均衡編成。戦略が必要。",
    descEn: "Balanced lineup of four rare units. Strategy required.",
  },
  {
    id: "npc_6",
    nameKo: "에픽 마법군단",
    nameJa: "エピック魔法軍団",
    nameEn: "Epic Spellcasters",
    tierIdx: 3,
    fakePts: 9800,
    slots: [40, 39, 99, 131],
    enhLvs: [2, 2, 3, 2],
    stars: 3,
    winPts: 180,
    lossPts: 0,
    descKo: "에픽 마법사와 도적의 연합. 화력이 강력하다.",
    descJa: "エピック魔法使いと盗賊の連合。火力が強力。",
    descEn: "Coalition of epic mages and rogues. Massive firepower.",
  },
  {
    id: "npc_7",
    nameKo: "레전더리 수호자",
    nameJa: "レジェンダリー守護者",
    nameEn: "Legendary Guards",
    tierIdx: 4,
    fakePts: 13000,
    slots: [57, 53, 52, 135],
    enhLvs: [3, 3, 3, 4],
    stars: 4,
    winPts: 250,
    lossPts: 0,
    descKo: "레전더리 등급의 엘리트 부대. 쉽지 않은 상대.",
    descJa: "レジェンダリーランクのエリート部隊。侮れない相手。",
    descEn: "Elite legendary-rank squad. No easy fight.",
  },
  {
    id: "npc_8",
    nameKo: "황금 전설 부대",
    nameJa: "黄金伝説部隊",
    nameEn: "Golden Legends",
    tierIdx: 4,
    fakePts: 14500,
    slots: [137, 154, 191, 216],
    enhLvs: [4, 4, 3, 4],
    stars: 4,
    winPts: 280,
    lossPts: 0,
    descKo: "피닉스·드래곤·고래·말의 드림팀.",
    descJa: "フェニックス・ドラゴン・クジラ・馬のドリームチーム。",
    descEn: "Dream team of phoenix, dragon, whale, and horse.",
  },
  {
    id: "npc_9",
    nameKo: "신화 챔피언",
    nameJa: "ミシックチャンピオン",
    nameEn: "Mythic Champion",
    tierIdx: 5,
    fakePts: 16500,
    slots: [64, 72, 83, 150],
    enhLvs: [5, 5, 5, 5],
    stars: 5,
    winPts: 350,
    lossPts: 0,
    descKo: "신화 등급 최강자들의 집합. 승리하면 큰 보상.",
    descJa: "神話ランクの最強者たちの集合。勝利すれば大きな報酬。",
    descEn: "Assembly of mythic-rank elites. Big rewards for a win.",
  },
  {
    id: "npc_10",
    nameKo: "무패의 챌린저",
    nameJa: "無敗のチャレンジャー",
    nameEn: "Undefeated Challenger",
    tierIdx: 6,
    fakePts: 21000,
    slots: [158, 204, 208, 235],
    enhLvs: [6, 6, 6, 6],
    stars: 5,
    winPts: 500,
    lossPts: 0,
    descKo: "전설의 챌린저. 이길 수 있다면 큰 보상이 기다린다.",
    descJa: "伝説のチャレンジャー。勝てれば大きな報酬が待っている。",
    descEn: "The legendary challenger. Massive rewards await if you can win.",
  },
];

// ─── NPC 쿨타임 ──────────────────────────────────────────────────────────────
export const NPC_CD_MS = 8 * 60 * 60 * 1000;
export const NPC_CD_KEY = "col_npc_cd";

export function useNpcCooldowns() {
  const [cds, setCds] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(NPC_CD_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const getRemainingMs = (npcId: string): number | null => {
    const exp = cds[npcId];
    if (exp == null) return null;
    const rem = exp - Date.now();
    return rem > 0 ? rem : null;
  };

  const isOnCooldown = (npcId: string) => getRemainingMs(npcId) !== null;

  const applyCooldown = (npcId: string) => {
    const exp = Date.now() + NPC_CD_MS;
    const next = { ...cds, [npcId]: exp };
    setCds(next);
    localStorage.setItem(NPC_CD_KEY, JSON.stringify(next));
  };

  return { isOnCooldown, getRemainingMs, applyCooldown };
}

// ─── 입장권 (서버 검증) ─────────────────────────────────────────────────────────
// 실제 차감/회복은 백엔드(UserReward.arenaTickets)가 계산 — 여기서는 표시용 낙관적 상태만 유지하고
// 전투 응답(res.tickets/ticketRegenAt)으로 항상 서버 값에 맞춰 확정한다.
export const MAX_TICKETS = 5;
export const REGEN_MS = 2 * 60 * 60 * 1000;

export function useTickets(userId: string | undefined) {
  const [state, setState] = useState<{ tickets: number; regenBase: number | null }>({
    tickets: 0,
    regenBase: null,
  });
  const [msToNext, setMsToNext] = useState<number | null>(null);

  // 마운트 시 서버에서 현재 상태 조회
  useEffect(() => {
    if (!userId) return;
    api
      .get<{ tickets: number; maxTickets: number; regenAt: string | null }>(
        `/arena/tickets?userId=${userId}`,
      )
      .then((res) => {
        setState({
          tickets: res.tickets,
          regenBase: res.regenAt ? new Date(res.regenAt).getTime() : null,
        });
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!state.regenBase || state.tickets >= MAX_TICKETS) {
      setMsToNext(null);
      return;
    }
    const tick = () => {
      const rem = state.regenBase! + REGEN_MS - Date.now();
      if (rem <= 0) {
        // 자연 회복 낙관적 반영 — 다음 전투 응답에서 서버 값으로 재확정됨
        setState((s) => {
          const newT = Math.min(MAX_TICKETS, s.tickets + 1);
          return { tickets: newT, regenBase: newT >= MAX_TICKETS ? null : Date.now() };
        });
      } else {
        setMsToNext(rem);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.regenBase, state.tickets]);

  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / 3600000),
      m = Math.floor((ms % 3600000) / 60000),
      s = Math.floor((ms % 60000) / 1000);
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  };

  // 요청 보내기 전 낙관적 소모 (버튼 즉시 반응용) — 실제 값은 서버 응답으로 확정
  const consume = () => {
    if (state.tickets <= 0) return false;
    setState((s) => ({ tickets: s.tickets - 1, regenBase: s.regenBase ?? Date.now() }));
    return true;
  };

  // 전투 응답에 포함된 서버 계산값으로 상태 확정
  const applyServer = (tickets: number, regenAtIso: string | null | undefined) => {
    setState({
      tickets,
      regenBase: regenAtIso ? new Date(regenAtIso).getTime() : null,
    });
  };

  // 요청이 서버에 닿지 못한 경우(네트워크 실패 등) 낙관적 소모를 되돌림
  const refund = () => {
    setState((s) => {
      const newT = Math.min(MAX_TICKETS, s.tickets + 1);
      return { tickets: newT, regenBase: newT >= MAX_TICKETS ? null : s.regenBase };
    });
  };

  return { tickets: state.tickets, msToNext, fmtMs, consume, refund, applyServer };
}

// ─── 티어 유틸 ────────────────────────────────────────────────────────────────
export function getTierIdx(pts: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) if (pts >= TIERS[i].min) return i;
  return 0;
}

// ─── 캐릭터 유틸 ─────────────────────────────────────────────────────────────
export const charById = (id: number) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

// ─── 인터페이스 ───────────────────────────────────────────────────────────────
export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  tierPoints: number;
  wins: number;
  winStreak: number;
  characterId: number | null;
}
export interface RevengeTarget {
  userId: string;
  name: string;
  tierPoints: number;
  defenseSlots: number[];
  theyWon: boolean;
  at: string;
}
export interface BattleHistoryEntry {
  id: string;
  opponentName: string;
  isAttacker: boolean;
  won: boolean;
  pointsDelta: number;
  createdAt: string;
}
export interface CharInfo {
  slot: number;
  charId: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  element: string;
  rarity: string;
  archetype: string;
  charType: string;
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
  value?: number;
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
  targetMaxHp: number;
  targetAlive: boolean;
  skillType: "s1" | "s2" | "s3" | "passive" | "dot";
  skillName: string;
  hits: HitDetail[];
  crs: CrSnapshot[];
  statusChanges?: StatusChangeEntry[];
}
export interface BattleResult {
  won: boolean;
  pointsDelta: number;
  tierPoints: number;
  wins: number;
  losses: number;
  winStreak: number;
  log: BattleEvent[];
  attackerChars: CharInfo[];
  defenderChars: CharInfo[];
  // 전투 기록 리플레이 조회 시에만 채워짐 (실전 배틀 응답에는 없음)
  opponentName?: string;
  isAttacker?: boolean;
  // 실전 배틀 응답에만 채워짐 — 서버가 계산한 전투 후 입장권 상태
  tickets?: number;
  ticketRegenAt?: string | null;
}
export type Phase = "lobby" | "deck-edit" | "attack-confirm" | "battle" | "result";

// ─── CSS ──────────────────────────────────────────────────────────────────────
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap');
@keyframes col-flame{0%,100%{transform:scaleX(1) scaleY(1)}30%{transform:scaleX(1.12) scaleY(0.9)}60%{transform:scaleX(0.9) scaleY(1.1)}}
@keyframes col-idle-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes col-dmg-up{0%{opacity:1;transform:translateY(0) scale(1.4)}100%{opacity:0;transform:translateY(-52px) scale(0.9)}}
@keyframes col-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(40) saturate(0)}20%{transform:translateX(-8px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}100%{transform:translateX(0);filter:brightness(1)}}
@keyframes col-attack{0%{transform:translate(0,0) scale(1)}20%{transform:translate(0,-6px) scale(1.08)}50%{transform:translate(14px,-2px) scale(1.13)}70%{transform:translate(-4px,2px) scale(1.04)}100%{transform:translate(0,0) scale(1)}}
@keyframes col-attack-rev{0%{transform:translate(0,0) scale(1)}20%{transform:translate(0,-6px) scale(1.08)}50%{transform:translate(-14px,-2px) scale(1.13)}70%{transform:translate(4px,2px) scale(1.04)}100%{transform:translate(0,0) scale(1)}}
@keyframes col-win-in{0%{letter-spacing:0.6em;opacity:0}100%{letter-spacing:0.12em;opacity:1}}
@keyframes col-spin{to{transform:rotate(360deg)}}
@keyframes col-log-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes col-roll-in{0%{opacity:0;transform:scale(0.5) rotate(-12deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes col-active-glow{0%,100%{filter:drop-shadow(0 0 6px #c8a44a)}50%{filter:drop-shadow(0 0 18px #c8a44a)}}
@keyframes col-dead{to{filter:grayscale(1) brightness(0.3);opacity:0.4}}
@keyframes slot-pulse{0%,100%{box-shadow:0 0 0 2px #c8a44a,0 0 14px #c8a44a55}50%{box-shadow:0 0 0 3px #ffd700,0 0 22px #ffd70088}}
@keyframes cr-fill{from{width:0}}
@keyframes col-hp-flash{0%{opacity:0.7}100%{opacity:0}}
@keyframes col-stone-glow{0%,100%{opacity:0.55}50%{opacity:0.9}}
@keyframes col-shine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(220%) skewX(-20deg)}}
@keyframes col-tier-pulse{0%,100%{filter:drop-shadow(0 0 4px currentColor)}50%{filter:drop-shadow(0 0 16px currentColor)}}
@keyframes col-border-glow{0%,100%{box-shadow:0 0 12px var(--glow-col,#c8a44a44),inset 0 0 8px var(--glow-col,#c8a44a11)}50%{box-shadow:0 0 28px var(--glow-col,#c8a44a88),inset 0 0 20px var(--glow-col,#c8a44a22)}}
@keyframes col-float-up{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes col-ticket-appear{0%{opacity:0;transform:scale(0) rotate(-30deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes col-battle-ready{0%,100%{box-shadow:0 6px 0 #5a2d00,0 0 24px #c8a44a33}50%{box-shadow:0 6px 0 #5a2d00,0 0 48px #c8a44a88}}
.col-btn-shine{overflow:hidden;position:relative}
.col-btn-shine::after{content:'';position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent);animation:col-shine 2.4s ease-in-out 0.8s infinite}
.col-rank-scroll::-webkit-scrollbar{display:none}
.col-rank-scroll{-ms-overflow-style:none;scrollbar-width:none}
@media(min-width:640px){.col-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}}
@keyframes ult-bg-in{0%{opacity:0}100%{opacity:1}}
@keyframes ult-bg-out{0%{opacity:1}100%{opacity:0}}
@keyframes ult-ring{0%{transform:scale(0.2);opacity:0.9}100%{transform:scale(4);opacity:0}}
@keyframes ult-slash{0%{opacity:0;transform:translateX(-120%) skewX(-18deg)}55%{opacity:1}100%{opacity:0;transform:translateX(60%) skewX(-18deg)}}
@keyframes ult-title{0%{opacity:0;transform:scale(0.3) rotate(-4deg)}65%{opacity:1;transform:scale(1.06) rotate(1deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
@keyframes ult-sub{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes ult-flash{0%{opacity:0}40%{opacity:0.55}100%{opacity:0}}
@keyframes ult-particle{0%{opacity:1;transform:translate(0,0) scale(1.2)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)}}
@keyframes ult-line-grow{0%{width:0;opacity:0}60%{opacity:1}100%{opacity:0}}
@keyframes ult-vignette{0%{opacity:0}30%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes col-ptf{0%,100%{opacity:0.35;transform:scaleX(0.9)}50%{opacity:0.75;transform:scaleX(1.1)}}
@keyframes col-vs-beat{0%,100%{transform:scale(1) rotate(-90deg);filter:drop-shadow(0 0 6px #c8a44a)}45%{transform:scale(1.22) rotate(-90deg);filter:drop-shadow(0 0 24px #c8a44a)}}
@keyframes col-scan{0%{transform:translateY(-100%)}100%{transform:translateY(600%)}}
@keyframes col-spark{0%{opacity:0;transform:translate(0,0) scale(1.4)}80%{opacity:0.9}100%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(0)}}
@keyframes col-energy{0%,100%{opacity:0.15}50%{opacity:0.5}}
@keyframes col-divider-pulse{0%,100%{opacity:0.3;height:60%}50%{opacity:0.9;height:80%}}
@keyframes col-skill-in{0%{opacity:0;transform:translateX(-24px) skewX(-8deg)}100%{opacity:1;transform:translateX(0) skewX(-8deg)}}
@keyframes col-skill-out{0%{opacity:1;transform:translateX(0) skewX(-8deg)}100%{opacity:0;transform:translateX(24px) skewX(-8deg)}}
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

// ─── 원소 / 아키타입 색상 ─────────────────────────────────────────────────────
export const ARCHETYPE_LABEL: Record<string, { ko: string; ja: string; en: string }> =
  {
    warrior: { ko: "전사", ja: "戦士", en: "Warrior" },
    tank: { ko: "수호자", ja: "守護者", en: "Tank" },
    mage: { ko: "마법사", ja: "魔法士", en: "Mage" },
    rogue: { ko: "도적", ja: "盗賊", en: "Rogue" },
    nature: { ko: "자연술사", ja: "自然術士", en: "Nature" },
    meka: { ko: "메카", ja: "メカ", en: "Meka" },
    cursed: { ko: "저주술사", ja: "呪術士", en: "Cursed" },
    all: { ko: "만능", ja: "万能", en: "All" },
  };
export function ArchetypeIcon({ arch, size = 10 }: { arch: string; size?: number }) {
  const p = { size, strokeWidth: 2.5 } as const;
  switch (arch) {
    case "warrior":
      return <Swords {...p} />;
    case "tank":
      return <Shield {...p} />;
    case "rogue":
      return <Sword {...p} />;
    case "nature":
      return <Leaf {...p} />;
    case "meka":
      return <Cog {...p} />;
    case "cursed":
      return <Skull {...p} />;
    default:
      return <Star {...p} />;
  }
}

// ─── 픽셀 불꽃 / 횃불 ──────────────────────────────────────────────────────────
export function PixelFlame({ delay = 0 }: { delay?: number }) {
  return (
    <div
      style={{
        animation: `col-flame 0.22s ease-in-out ${delay}s infinite`,
        transformOrigin: "bottom center",
        display: "inline-block",
      }}
    >
      <svg
        width="16"
        height="24"
        viewBox="0 0 4 6"
        style={{ imageRendering: "pixelated", display: "block" }}
      >
        <rect x="1" y="0" width="2" height="1" fill="#fff7ed" />
        <rect x="1" y="1" width="2" height="1" fill="#fde68a" />
        <rect x="0" y="2" width="4" height="1" fill="#fbbf24" />
        <rect x="0" y="3" width="4" height="1" fill="#f97316" />
        <rect x="1" y="4" width="2" height="1" fill="#ea580c" />
        <rect x="1" y="5" width="2" height="1" fill="#92400e" />
      </svg>
    </div>
  );
}
export function Torch({ flip }: { flip?: boolean }) {
  return (
    <div
      style={{
        transform: flip ? "scaleX(-1)" : undefined,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <PixelFlame delay={flip ? 0.07 : 0} />
      <svg
        width="12"
        height="20"
        viewBox="0 0 3 5"
        style={{ imageRendering: "pixelated", display: "block" }}
      >
        <rect x="1" y="0" width="1" height="4" fill="#92400e" />
        <rect x="0" y="3" width="3" height="1" fill="#78350f" />
        <rect x="1" y="4" width="1" height="1" fill="#451a03" />
      </svg>
    </div>
  );
}

// ─── 콜로세움 경기장 픽셀아트 ─────────────────────────────────────────────────
export function ArenaFlag({ flip }: { flip?: boolean }) {
  return (
    <svg
      width="28"
      height="60"
      viewBox="0 0 7 15"
      style={{
        imageRendering: "pixelated",
        display: "block",
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      <rect x="3" y="0" width="1" height="15" fill="#6b3a0a" />
      <rect x="2" y="0" width="1" height="15" fill="#7c4010" />
      <rect x="2" y="0" width="2" height="1" fill="#c8a44a" />
      <rect x="4" y="1" width="3" height="6" fill="#b45309" />
      <rect x="4" y="1" width="3" height="1" fill="#d97706" />
      <rect x="4" y="3" width="3" height="1" fill="#c8a44a" opacity="0.5" />
      <rect x="5" y="5" width="2" height="1" fill="#c8a44a" opacity="0.3" />
      <rect x="4" y="7" width="2" height="1" fill="#b45309" />
      <rect x="4" y="8" width="1" height="1" fill="#b45309" />
      <rect x="0" y="13" width="7" height="2" fill="#3a2008" />
      <rect x="1" y="12" width="5" height="2" fill="#4a2c10" />
    </svg>
  );
}
export function ArenaGate() {
  return (
    <svg
      width="104"
      height="56"
      viewBox="0 0 26 14"
      style={{
        imageRendering: "pixelated",
        display: "block",
        filter: "drop-shadow(0 0 8px #c8a44a2a)",
      }}
    >
      <rect x="0" y="2" width="6" height="12" fill="#2a1608" />
      <rect x="1" y="2" width="4" height="12" fill="#3a2010" />
      <rect x="0" y="0" width="7" height="3" fill="#4a2c14" />
      <rect x="1" y="0" width="5" height="1" fill="#c8a44a" opacity="0.4" />
      <rect x="20" y="2" width="6" height="12" fill="#2a1608" />
      <rect x="21" y="2" width="4" height="12" fill="#3a2010" />
      <rect x="19" y="0" width="7" height="3" fill="#4a2c14" />
      <rect x="20" y="0" width="5" height="1" fill="#c8a44a" opacity="0.4" />
      <rect x="6" y="0" width="14" height="3" fill="#4a2c14" />
      <rect x="5" y="1" width="16" height="2" fill="#3a2010" />
      <rect x="11" y="0" width="4" height="1" fill="#c8a44a" opacity="0.5" />
      <rect x="6" y="3" width="14" height="11" fill="#0c0603" />
      <rect x="7" y="3" width="1" height="10" fill="#2a1a08" />
      <rect x="10" y="3" width="1" height="10" fill="#2a1a08" />
      <rect x="13" y="3" width="1" height="10" fill="#2a1a08" />
      <rect x="16" y="3" width="1" height="10" fill="#2a1a08" />
      <rect x="19" y="3" width="1" height="10" fill="#2a1a08" />
      <rect x="7" y="7" width="13" height="1" fill="#2a1a08" />
      <rect x="8" y="4" width="2" height="3" fill="#c8a44a" opacity="0.06" />
      <rect x="11" y="4" width="2" height="3" fill="#c8a44a" opacity="0.06" />
      <rect x="14" y="4" width="2" height="3" fill="#c8a44a" opacity="0.06" />
      <rect x="17" y="4" width="2" height="3" fill="#c8a44a" opacity="0.06" />
      <rect x="1" y="5" width="1" height="4" fill="#c8a44a" opacity="0.2" />
      <rect x="24" y="5" width="1" height="4" fill="#c8a44a" opacity="0.2" />
    </svg>
  );
}

// ─── 작은 서브 컴포넌트들 ─────────────────────────────────────────────────────

export function TierBadgeSvg({ idx, size = 44 }: { idx: number; size?: number }) {
  const t = TIERS[idx];
  const patterns = [
    [
      [1, 1],
      [5, 1],
      [2, 2],
      [4, 2],
      [1, 2],
      [5, 2],
      [1, 3],
      [5, 3],
      [2, 4],
      [4, 4],
      [3, 5],
    ],
    [
      [3, 0],
      [2, 1],
      [4, 1],
      [1, 2],
      [5, 2],
      [2, 3],
      [4, 3],
      [3, 4],
    ],
    [
      [0, 2],
      [2, 0],
      [4, 0],
      [6, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [1, 4],
      [5, 4],
    ],
    [
      [3, 0],
      [2, 1],
      [4, 1],
      [1, 2],
      [5, 2],
      [2, 3],
      [4, 3],
      [3, 4],
      [2, 5],
      [4, 5],
    ],
    [
      [2, 0],
      [3, 0],
      [4, 0],
      [1, 1],
      [5, 1],
      [0, 2],
      [6, 2],
      [1, 3],
      [5, 3],
      [2, 4],
      [4, 4],
      [3, 5],
    ],
    [
      [3, 0],
      [1, 1],
      [5, 1],
      [0, 2],
      [2, 2],
      [4, 2],
      [6, 2],
      [1, 3],
      [5, 3],
      [2, 4],
      [4, 4],
      [3, 5],
    ],
    [
      [2, 0],
      [4, 0],
      [0, 1],
      [6, 1],
      [1, 2],
      [3, 2],
      [5, 2],
      [0, 3],
      [2, 3],
      [4, 3],
      [6, 3],
      [0, 4],
      [6, 4],
      [1, 5],
      [5, 5],
    ],
  ];
  const px = size / 7;
  const dots = patterns[idx] ?? patterns[0];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 7 7"
      style={{
        imageRendering: "pixelated",
        filter: `drop-shadow(0 0 ${px * 0.5}px ${t.glow})`,
      }}
    >
      {dots.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill={t.color} />
      ))}
    </svg>
  );
}

export function DeckSlotCard({
  charId,
  onRemove,
  small = false,
  onClick,
  isSelected = false,
}: {
  charId: number | null;
  onRemove?: () => void;
  small?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const size = small ? 36 : 52;
  if (!charId)
    return (
      <div
        onClick={onClick}
        style={{
          width: size + 16,
          height: size + 16,
          borderRadius: 6,
          flexShrink: 0,
          border: isSelected ? "2px solid #c8a44a" : `2px dashed ${C.border}`,
          background: isSelected ? "rgba(200,164,74,0.08)" : "transparent",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          cursor: onClick ? "pointer" : "default",
          animation: isSelected
            ? "slot-pulse 1.2s ease-in-out infinite"
            : undefined,
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <Plus
          size={isSelected ? 18 : 14}
          color={isSelected ? "#c8a44a" : C.border}
        />
        {isSelected && !small && (
          <span
            style={{
              fontSize: 7,
              color: "#c8a44a",
              fontWeight: 900,
              letterSpacing: "0.08em",
            }}
          >
            선택됨
          </span>
        )}
      </div>
    );
  const char = charById(charId);
  const th = RARITY_THEME[char.rarity as CharacterRarity];
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: size + 16,
        height: size + 16,
        flexShrink: 0,
        border: isSelected
          ? "2px solid #ffd700"
          : `2px solid ${th?.border ?? C.border}`,
        borderRadius: 6,
        background: th?.bg ?? "#0a0805",
        overflow: "visible",
        boxShadow: isSelected
          ? undefined
          : `0 0 12px ${th?.glow ?? C.border}44`,
        animation: isSelected
          ? "slot-pulse 1.2s ease-in-out infinite"
          : undefined,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <PixelSprite
          type={char.type as CharacterType}
          rarity={char.rarity as CharacterRarity}
          size={size}
        />
      </div>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#dc2626",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <X size={10} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ─── 유닛 카드 (배틀 필드) ────────────────────────────────────────────────────
export function SeasonRewardModal({
  onClose,
  ko,
  ja,
  myPts,
}: {
  onClose: () => void;
  ko: boolean;
  ja: boolean;
  myPts: number;
}) {
  const myIdx = SEASON_REWARDS.findIndex((r) => myPts >= r.minPts);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1e1508 0%,#120e06 100%)",
          border: "2px solid #5a3d0e",
          borderRadius: 10,
          padding: "24px 20px",
          width: "min(480px,94vw)",
          boxShadow: "0 0 40px rgba(200,164,74,0.3)",
          fontFamily: FONT,
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={18} color="#c8a44a" />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#c8a44a",
                }}
              >
                {ko
                  ? `시즌 ${SEASON.number} 보상`
                  : ja
                    ? `シーズン${SEASON.number}報酬`
                    : `Season ${SEASON.number} Rewards`}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#8b6f3a" }}>
                {SEASON.startDate} ~ {SEASON.endDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={18} color="#8b6f3a" />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {SEASON_REWARDS.map((r, i) => {
            const isMine = i === myIdx,
              isAbove = myPts >= r.minPts,
              borCnt = SEASON_REWARDS.length - i;
            return (
              <div
                key={r.tierKey}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: `1px solid ${isMine ? "#c8a44a" : isAbove ? "#5a3d0e22" : "#2e1f06"}`,
                  background: isMine
                    ? "rgba(200,164,74,0.08)"
                    : isAbove
                      ? "rgba(255,255,255,0.02)"
                      : "transparent",
                  opacity: isAbove ? 1 : 0.6,
                }}
              >
                <img
                  src={`/${r.tierKey}.png`}
                  alt={ko ? r.ko : ja ? r.ja : r.en}
                  style={{
                    width: 44,
                    height: 44,
                    objectFit: "contain",
                    flexShrink: 0,
                    transform: `scale(${TIER_ICON_SCALE[r.tierKey] ?? 1})`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 900,
                      color: r.color,
                      filter: `drop-shadow(0 0 4px ${r.glow})`,
                    }}
                  >
                    {ko ? r.ko : ja ? r.ja : r.en}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: "#8b6f3a" }}>
                    {r.minPts.toLocaleString()} pts{" "}
                    {ko ? "이상" : ja ? "以上" : "& above"}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 900,
                      color: "#4ade80",
                    }}
                  >
                    +{r.bonusPoints.toLocaleString()}KP
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: "#8b6f3a" }}>
                    {ko
                      ? `테두리 ${borCnt}종`
                      : ja
                        ? `枠${borCnt}種`
                        : `${borCnt} border${borCnt > 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {myPts > 0 && (
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 11,
              color: "#c8a44a",
              textAlign: "center",
            }}
          >
            {ko
              ? `현재 ${myPts.toLocaleString()} pts · ${myIdx >= 0 ? SEASON_REWARDS[myIdx].ko : "미달성"} 보상 예정`
              : ja
                ? `現在 ${myPts.toLocaleString()} pts · ${myIdx >= 0 ? SEASON_REWARDS[myIdx].ja : "未達成"}報酬予定`
                : `Currently ${myPts.toLocaleString()} pts · ${myIdx >= 0 ? SEASON_REWARDS[myIdx].en : "Not yet achieved"} reward expected`}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── 픽셀 버튼 ────────────────────────────────────────────────────────────────
export function PixelBtn({
  onClick,
  disabled,
  children,
  color = "amber",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  color?: "amber" | "gray" | "red" | "blue";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const st = {
    amber: {
      bg: "linear-gradient(180deg,#c8a44a 0%,#8b6020 100%)",
      border: "#5a3d0e",
      shadow: "#3a2508",
      text: "#1c1101",
    },
    gray: {
      bg: "linear-gradient(180deg,#64748b 0%,#475569 100%)",
      border: "#1e293b",
      shadow: "#0f172a",
      text: "#e2e8f0",
    },
    red: {
      bg: "linear-gradient(180deg,#f87171 0%,#dc2626 100%)",
      border: "#7f1d1d",
      shadow: "#450a0a",
      text: "#fff5f5",
    },
    blue: {
      bg: "linear-gradient(180deg,#60a5fa 0%,#2563eb 100%)",
      border: "#1e3a5f",
      shadow: "#082f49",
      text: "#fff",
    },
  }[color];
  const press = () => {
    if (!ref.current || disabled) return;
    ref.current.style.boxShadow = `0 2px 0 ${st.shadow}`;
    ref.current.style.transform = "translateY(4px)";
  };
  const release = () => {
    if (!ref.current) return;
    ref.current.style.boxShadow = `0 6px 0 ${st.shadow}`;
    ref.current.style.transform = "";
  };
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      style={{
        background: disabled
          ? "linear-gradient(180deg,#374151 0%,#1f2937 100%)"
          : st.bg,
        border: `3px solid ${disabled ? "#111827" : st.border}`,
        boxShadow: disabled ? `0 3px 0 #111827` : `0 6px 0 ${st.shadow}`,
        color: disabled ? "#6b7280" : st.text,
        fontWeight: 900,
        fontSize: 16,
        letterSpacing: "0.04em",
        padding: "12px 28px",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "box-shadow 0.06s,transform 0.06s",
        width: "100%",
        fontFamily: FONT,
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {children}
    </button>
  );
}

// ─── 스탯 툴팁 ────────────────────────────────────────────────────────────────
export function StatTooltip({
  charId,
  charType,
  rarity,
  enhLevel,
  ko,
  ja,
  anchorRect,
}: {
  charId: number;
  charType: string;
  rarity: string;
  enhLevel: number;
  ko: boolean;
  ja: boolean;
  anchorRect: DOMRect;
}) {
  const s = calcArenaStat(charType, rarity, enhLevel);
  const th = RARITY_THEME[rarity as CharacterRarity] ?? RARITY_THEME.common;
  const char = charById(charId);

  // 툴팁 너비 280px, 화면 안에서 좌우 조정
  const tipW = 256;
  let left = anchorRect.left + anchorRect.width / 2 - tipW / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
  // 위에 공간이 충분하면 위에, 아니면 아래에
  const spaceAbove = anchorRect.top;
  const top =
    spaceAbove > 200
      ? anchorRect.top - 8 // 위쪽에 붙임 (translateY(-100%))
      : anchorRect.bottom + 8; // 아래쪽

  const statRow = (
    label: string,
    val: number,
    prev: number | null,
    color: string,
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{ fontSize: 10, color: C.stoneFaint, width: 28, flexShrink: 0 }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "#0a0703",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, val / 2)}%`,
            background: color,
            borderRadius: 2,
            transition: "width 0.3s",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          fontWeight: 900,
          color,
          width: 34,
          textAlign: "right",
        }}
      >
        {val}
      </span>
      {prev !== null && val !== prev && (
        <span
          style={{ fontFamily: "monospace", fontSize: 9, color: "#4ade80" }}
        >
          +{val - prev}
        </span>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        transform: spaceAbove > 200 ? "translateY(-100%)" : undefined,
        width: tipW,
        zIndex: 9999,
        background: "linear-gradient(135deg,#1e1508 0%,#0c0903 100%)",
        border: `2px solid ${th.border}`,
        borderRadius: 8,
        boxShadow: `0 0 24px ${th.glow}55, 0 8px 32px rgba(0,0,0,0.8)`,
        padding: "12px 14px",
        pointerEvents: "none",
        fontFamily: FONT,
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          paddingBottom: 8,
          borderBottom: `1px solid ${C.borderFaint}`,
        }}
      >
        <PixelSprite
          type={char.type as CharacterType}
          rarity={char.rarity as CharacterRarity}
          size={32}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 900,
              color: th.color,
              textShadow: `0 0 8px ${th.glow}`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getCharName(char, ko ? "ko" : ja ? "ja" : "en")}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: th.color,
                background: `${th.color}18`,
                border: `1px solid ${th.border}`,
                borderRadius: 3,
                padding: "1px 5px",
                fontWeight: 700,
              }}
            >
              {ko
                ? RARITY_KO[rarity]
                : ja
                  ? RARITY_JA[rarity]
                  : RARITY_EN[rarity]}
            </span>
            <span
              style={{
                fontSize: 9,
                color: "#94a3b8",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 3,
                padding: "1px 5px",
                fontWeight: 700,
              }}
            >
              {ARCH_LABEL_KO[s.arch]}
            </span>
            {enhLevel > 0 && (
              <span
                style={{
                  fontSize: 9,
                  color: "#60a5fa",
                  background: "#1e3a5f",
                  border: "1px solid #2563eb",
                  borderRadius: 3,
                  padding: "1px 5px",
                  fontWeight: 900,
                }}
              >
                +{enhLevel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 스탯 바 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 5,
          marginBottom: 10,
        }}
      >
        {statRow("HP", s.hp, s.enhHp, "#4ade80")}
        {statRow("ATK", s.atk, s.enhAtk, "#f87171")}
        {statRow("SPD", s.spd, s.enhSpd, "#60a5fa")}
      </div>

      {/* 스킬 목록 */}
      <div
        style={{
          borderTop: `1px solid ${C.borderFaint}`,
          paddingTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {[
          { label: "평타", name: s.skills.basic, color: "#94a3b8", cd: "--" },
          { label: "스킬", name: s.skills.skill, color: "#60a5fa", cd: "3턴" },
          {
            label: "궁극기",
            name: s.skills.ultimate,
            color: "#ffd700",
            cd: "5턴",
          },
        ].map((sk) => (
          <div
            key={sk.label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 900,
                color: sk.color,
                background: `${sk.color}18`,
                border: `1px solid ${sk.color}44`,
                borderRadius: 3,
                padding: "1px 5px",
                width: 36,
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {sk.label}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.parchment,
                flex: 1,
              }}
            >
              {sk.name}
            </span>
            <span
              style={{
                fontSize: 9,
                color: C.stoneFaint,
                fontFamily: "monospace",
              }}
            >
              {sk.cd}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 덱 편집 화면 ─────────────────────────────────────────────────────────────
export function DeckEditor({
  deckType,
  currentSlots,
  ownedIds,
  onSave,
  onBack,
  ko,
  ja,
  charEnhancements,
}: {
  deckType: "attack" | "defense";
  currentSlots: number[];
  ownedIds: number[];
  onSave: (slots: number[]) => void;
  onBack: () => void;
  ko: boolean;
  ja: boolean;
  charEnhancements: Record<number, number>;
}) {
  // 4칸 고정 배열: 0 = 비어있음
  const [slots, setSlots] = useState<number[]>(() => {
    const arr = [0, 0, 0, 0];
    currentSlots.forEach((id, i) => {
      if (i < 4) arr[i] = id;
    });
    return arr;
  });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{
    charId: number;
    rect: DOMRect;
  } | null>(null);

  const selectSlot = (idx: number) => {
    setSelectedSlot((p) => (p === idx ? null : idx));
  };

  const placeChar = (id: number) => {
    if (selectedSlot !== null) {
      // 선택된 슬롯에 배치 (이미 덱 내 다른 곳에 있으면 그 자리를 비움)
      setSlots((p) =>
        p.map((v, i) => (i === selectedSlot ? id : v === id ? 0 : v)),
      );
      setSelectedSlot(null);
    } else {
      // 선택된 슬롯 없으면 첫 번째 빈 슬롯에 배치
      setSlots((p) => {
        const first = p.findIndex((v) => v === 0);
        if (first === -1) return p;
        return p.map((v, i) => (i === first ? id : v === id ? 0 : v));
      });
    }
  };

  const removeSlot = (idx: number) => {
    setSlots((p) => p.map((v, i) => (i === idx ? 0 : v)));
    if (selectedSlot === idx) setSelectedSlot(null);
  };

  const filledCount = slots.filter(Boolean).length;

  const ownedChars = ownedIds
    .map((id) => charById(id))
    .sort((a, b) => {
      const order = [
        "mythic",
        "legendary",
        "epic",
        "rare",
        "uncommon",
        "common",
      ];
      return order.indexOf(a.rarity) - order.indexOf(b.rarity);
    });

  const typeLabel =
    deckType === "attack"
      ? ko
        ? "공격 덱"
        : ja
          ? "攻撃デッキ"
          : "Attack Deck"
      : ko
        ? "방어 덱"
        : ja
          ? "防御デッキ"
          : "Defense Deck";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: FONT,
        padding: "16px 16px 40px",
      }}
    >
      <style>{CSS}</style>
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: C.stone,
          }}
        >
          <ChevronLeft size={22} color={C.stone} />
        </button>
        <h2
          style={{
            margin: 0,
            color: C.gold,
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: "0.1em",
          }}
        >
          {typeLabel} {ko ? "편집" : ja ? "編集" : "Edit"}
        </h2>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => onSave(slots)}
            style={{
              background: "linear-gradient(180deg,#c8a44a,#8b6020)",
              border: "2px solid #5a3d0e",
              color: "#1c1101",
              fontWeight: 900,
              fontSize: 13,
              padding: "8px 20px",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {ko ? "저장" : ja ? "保存" : "Save"}
          </button>
        </div>
      </div>

      {/* 현재 덱 슬롯 — 전열/후열 진형 */}
      <div
        style={{
          background: "linear-gradient(135deg,#1e1508,#120e06)",
          border: `2px solid ${C.border}`,
          borderRadius: 8,
          padding: "14px 12px",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <span
            style={{ fontSize: 11, color: C.stone, letterSpacing: "0.12em" }}
          >
            {ko ? "진형 편성" : ja ? "陣形編成" : "Formation"} ({filledCount}/4)
          </span>
          {selectedSlot !== null && (
            <span
              style={{
                fontSize: 10,
                color: "#c8a44a",
                fontWeight: 900,
                animation: "slot-pulse 1.2s ease-in-out infinite",
              }}
            >
              {ko
                ? `슬롯 ${selectedSlot + 1} 선택됨 — 캐릭터를 고르세요`
                : ja
                  ? `スロット${selectedSlot + 1}選択中 — キャラを選んでください`
                  : `Slot ${selectedSlot + 1} selected — pick a character`}
            </span>
          )}
        </div>
        {[
          {
            label: ko ? "전열" : ja ? "前列" : "Front",
            hint: ko
              ? "HP +20% · 방어 +10%"
              : ja
                ? "HP +20% · 防御 +10%"
                : "HP +20% · DEF +10%",
            color: "#60a5fa",
            idxs: [0, 1] as const,
          },
          {
            label: ko ? "후열" : ja ? "後列" : "Back",
            hint: ko
              ? "공격 +15% · 치명 +8%"
              : ja
                ? "攻撃 +15% · 会心 +8%"
                : "ATK +15% · CRIT +8%",
            color: "#f87171",
            idxs: [2, 3] as const,
          },
        ].map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 1,
                  background: row.color,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: row.color,
                  letterSpacing: "0.1em",
                }}
              >
                {row.label}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {row.idxs.map((i) => (
                <DeckSlotCard
                  key={i}
                  charId={slots[i] || null}
                  isSelected={selectedSlot === i}
                  onClick={() => selectSlot(i)}
                  onRemove={slots[i] ? () => removeSlot(i) : undefined}
                />
              ))}
            </div>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 9,
                color: row.color,
                opacity: 0.65,
                background: `${row.color}18`,
                borderRadius: 3,
                padding: "2px 6px",
                whiteSpace: "nowrap",
              }}
            >
              {row.hint}
            </span>
          </div>
        ))}
      </div>

      {/* 캐릭터 선택 그리드 */}
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          color: C.stone,
          letterSpacing: "0.1em",
        }}
      >
        {ko ? "보유 캐릭터" : ja ? "所持キャラクター" : "Owned Characters"}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(72px,1fr))",
          gap: 8,
        }}
      >
        {ownedChars.map((char) => {
          const inDeck = slots.includes(char.id);
          const isFull = filledCount >= 4 && selectedSlot === null;
          const th = RARITY_THEME[char.rarity as CharacterRarity];
          const enh = charEnhancements[char.id] ?? 0;
          return (
            <button
              key={char.id}
              onClick={() =>
                inDeck ? removeSlot(slots.indexOf(char.id)) : placeChar(char.id)
              }
              disabled={!inDeck && isFull}
              onMouseEnter={(e) =>
                setTooltipInfo({
                  charId: char.id,
                  rect: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setTooltipInfo(null)}
              style={{
                background: inDeck ? `${th?.color}22` : "#0a0805",
                border: `2px solid ${inDeck ? th?.color : th?.border}`,
                borderRadius: 6,
                padding: "8px 4px",
                cursor: !inDeck && isFull ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity: !inDeck && isFull ? 0.4 : 1,
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                <PixelSprite
                  type={char.type as CharacterType}
                  rarity={char.rarity as CharacterRarity}
                  size={40}
                />
                {enh > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -4,
                      background: "linear-gradient(135deg,#c8a44a,#8b6020)",
                      border: "1px solid #1c1101",
                      borderRadius: 3,
                      padding: "0px 4px",
                      fontSize: 8,
                      fontWeight: 900,
                      color: "#1c1101",
                      fontFamily: "monospace",
                      lineHeight: "14px",
                    }}
                  >
                    +{enh}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 9,
                  color: th?.color,
                  fontWeight: 700,
                  textAlign: "center",
                  lineHeight: 1.2,
                  wordBreak: "break-all",
                }}
              >
                {getCharName(char, "ko")}
              </span>
              <span
                style={{
                  fontSize: 8,
                  color: th?.color,
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                {ko
                  ? RARITY_KO[char.rarity]
                  : ja
                    ? RARITY_JA[char.rarity]
                    : RARITY_EN[char.rarity]}
              </span>
              {inDeck && (
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    width: 12,
                    height: 12,
                    background: "#4ade80",
                    borderRadius: "50%",
                    border: "1px solid #052e16",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 스탯 툴팁 */}
      {tooltipInfo &&
        (() => {
          const c = charById(tooltipInfo.charId);
          const enh = charEnhancements[tooltipInfo.charId] ?? 0;
          return (
            <StatTooltip
              charId={tooltipInfo.charId}
              charType={c.type}
              rarity={c.rarity}
              enhLevel={enh}
              ko={ko}
              ja={ja}
              anchorRect={tooltipInfo.rect}
            />
          );
        })()}
    </div>
  );
}

// ─── 직업별 궁극기 연출 색상 ──────────────────────────────────────────────────
export function FeedbackToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 24,
        transform: "translateX(-50%)",
        zIndex: 200,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(20,14,6,0.95)",
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "9px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: 700,
          color: "#f87171",
          maxWidth: "88vw",
          animation: "col-win-in 0.2s ease-out both",
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ─── 과거 전투 리플레이 종료 후 요약 카드 ─────────────────────────────────────
export function ReplaySummaryCard({
  result,
  ko,
  ja,
  onClose,
}: {
  result: BattleResult;
  ko: boolean;
  ja: boolean;
  onClose: () => void;
}) {
  const won = result.won;
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 20,
      }}
    >
      <style>{CSS}</style>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontFamily: "'Courier New',monospace",
            fontSize: 44,
            fontWeight: 900,
            color: won ? "#ffd700" : "#f87171",
            textShadow: won ? "0 0 30px #ffd700" : "0 0 20px #ef4444",
            margin: "0 0 8px",
            animation: "col-win-in 0.6s ease-out both",
            letterSpacing: "0.12em",
          }}
        >
          {won ? (ko ? "승리" : "VICTORY") : ko ? "패배" : "DEFEAT"}
        </p>
        <p style={{ fontSize: 14, color: C.stone, margin: 0 }}>
          vs. {result.opponentName ?? (ko ? "상대방" : "Opponent")}
        </p>
      </div>
      <div
        style={{
          background: "linear-gradient(135deg,#1e1508,#120e06)",
          border: `2px solid ${C.border}`,
          borderRadius: 8,
          padding: "16px 28px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 32,
            fontWeight: 900,
            color: result.pointsDelta >= 0 ? "#4ade80" : "#f87171",
            margin: 0,
          }}
        >
          {result.pointsDelta >= 0 ? "+" : ""}
          {result.pointsDelta} pts
        </p>
      </div>
      <div style={{ width: "100%", maxWidth: 320 }}>
        <PixelBtn onClick={onClose}>
          {ko ? "닫기" : ja ? "閉じる" : "Close"}
        </PixelBtn>
      </div>
    </div>
  );
}

