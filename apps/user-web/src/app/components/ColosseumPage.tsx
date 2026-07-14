import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Swords,
  Sword,
  Shield,
  Bot,
  Leaf,
  Cog,
  Skull,
  Star,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  History,
  PlayCircle,
  Loader2,
  X,
  Plus,
  SkipForward,
  Ticket,
} from "lucide-react";
import { getStoredUser } from "../lib/auth";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS,
  getCharName,
  type CharacterRarity,
  type CharacterType,
} from "../data/characters";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";

// ─── 시즌/티어 상수 (외부 컴포넌트에서 import함 — 유지 필수) ──────────────────
const SEASON = { number: 2, startDate: "2026-07-01", endDate: "2026-07-31" };

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
  gm: { image: "/GM.png" },
};
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
  gm: { ko: "GM", ja: "GM", en: "GM" },
};

// ─── 티어 ─────────────────────────────────────────────────────────────────────
const TIERS = [
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

const SEASON_REWARDS = [
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
const TIER_ICON_SCALE: Record<string, number> = {
  challenger: 1.03,
  master: 1.02,
  diamond: 1.12,
  platinum: 1,
  gold: 1,
  silver: 1,
};

// ─── 스탯/직업 ────────────────────────────────────────────────────────────────

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
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

const RARITY_KO: Record<string, string> = {
  common: "커먼",
  uncommon: "언커먼",
  rare: "레어",
  epic: "에픽",
  legendary: "레전더리",
  mythic: "신화",
};
const RARITY_JA: Record<string, string> = {
  common: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  epic: "エピック",
  legendary: "レジェンダリー",
  mythic: "ミシック",
};
const RARITY_EN: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  mythic: "Mythic",
};

// ─── 콜로세움 스탯 계산 (서버 로직 미러) ────────────────────────────────────────
const ARENA_TYPE_ARCHETYPE: Record<string, string> = {
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
const ARENA_RARITY_BASE: Record<
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
const ARENA_ARCH_MULT: Record<
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
const ARENA_ENH_PER_LV: Record<
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
const ARENA_ARCH_SKILLS: Record<
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
const ARCH_LABEL_KO: Record<string, string> = {
  warrior: "전사",
  tank: "탱커",
  mage: "마법사",
  rogue: "도적",
  nature: "자연",
  meka: "메카",
  cursed: "저주술사",
  all: "올라운더",
};
function calcArenaStat(charType: string, rarity: string, enhLevel = 0) {
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
interface NpcOpponent {
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

const NPC_OPPONENTS: NpcOpponent[] = [
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
const NPC_CD_MS = 8 * 60 * 60 * 1000;
const NPC_CD_KEY = "col_npc_cd";

function useNpcCooldowns() {
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
const MAX_TICKETS = 5;
const REGEN_MS = 2 * 60 * 60 * 1000;

function useTickets(userId: string | undefined) {
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
function getTierIdx(pts: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) if (pts >= TIERS[i].min) return i;
  return 0;
}

// ─── 캐릭터 유틸 ─────────────────────────────────────────────────────────────
const charById = (id: number) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

// ─── 인터페이스 ───────────────────────────────────────────────────────────────
interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  tierPoints: number;
  wins: number;
  winStreak: number;
  characterId: number | null;
}
interface RevengeTarget {
  userId: string;
  name: string;
  tierPoints: number;
  defenseSlots: number[];
  theyWon: boolean;
  at: string;
}
interface BattleHistoryEntry {
  id: string;
  opponentName: string;
  isAttacker: boolean;
  won: boolean;
  pointsDelta: number;
  createdAt: string;
}
interface CharInfo {
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
interface HitDetail {
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
interface StatusChangeEntry {
  team: "attacker" | "defender";
  slot: number;
  type: string;
  duration: number;
  value?: number;
  action: "apply" | "expire";
}
interface CrSnapshot {
  team: "attacker" | "defender";
  slot: number;
  cr: number;
  alive: boolean;
  buffs: Array<{ type: string; duration: number }>;
  debuffs: Array<{ type: string; duration: number }>;
}
interface BattleEvent {
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
interface BattleResult {
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
type Phase = "lobby" | "deck-edit" | "attack-confirm" | "battle" | "result";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
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
const ARCHETYPE_LABEL: Record<string, { ko: string; ja: string; en: string }> =
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
function ArchetypeIcon({ arch, size = 10 }: { arch: string; size?: number }) {
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
function PixelFlame({ delay = 0 }: { delay?: number }) {
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
function Torch({ flip }: { flip?: boolean }) {
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
function ArenaFlag({ flip }: { flip?: boolean }) {
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
function ArenaGate() {
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

function TierBadgeSvg({ idx, size = 44 }: { idx: number; size?: number }) {
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

// ─── 덱 슬롯 카드 ─────────────────────────────────────────────────────────────
function DeckSlotCard({
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
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 20,
                fontWeight: 900,
                color: "#f87171",
                textShadow: "0 0 12px #ef4444",
              }}
            >
              ✕
            </span>
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

// ─── 시즌 보상 모달 ───────────────────────────────────────────────────────────
function SeasonRewardModal({
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
function PixelBtn({
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
function StatTooltip({
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
function DeckEditor({
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

// ─── 궁극기 연출 오버레이 ─────────────────────────────────────────────────────
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
    sym: (["✿", "✦", "✶", "❋"] as string[])[i % 4],
    size: 12 + (i % 4) * 5,
  }));
  const curseDrops = Array.from({ length: 8 }, (_, i) => ({
    sym: (["✦", "✖", "✧", "✦", "✖", "◆", "✦", "✶"] as string[])[i],
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
                  fontSize: l.size,
                  color: col,
                  textShadow: `0 0 10px ${col},0 0 20px ${col}88`,
                  opacity: 0,
                  animation: `ult-leaf 1.1s ease-out ${l.delay} forwards`,
                  "--lx": l.lx,
                  "--lrot": l.lrot,
                  userSelect: "none",
                } as React.CSSProperties
              }
            >
              {l.sym}
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
                  fontSize: c.size,
                  color: col,
                  textShadow: `0 0 12px ${col},0 0 24px ${col}88`,
                  opacity: 0,
                  animation: `ult-curse-drop 1.0s ease-in ${c.delay} forwards`,
                  "--crot": c.crot,
                  userSelect: "none",
                } as React.CSSProperties
              }
            >
              {c.sym}
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

// ─── 스킬 타입 색상 ───────────────────────────────────────────────────────────
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

// ─── 콜로세움 픽셀아트 배경 ──────────────────────────────────────────────────
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

// ─── 배틀 재생 화면 ───────────────────────────────────────────────────────────
function BattleReplay({
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
          prefix: isHealSkill ? "♥" : "◼",
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
        ? "✦"
        : ev.skillType === "s2"
          ? "◆"
          : ev.skillType === "dot"
            ? "☠"
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
              {d.val > 0 ? `${d.prefix}${d.val}` : d.prefix}
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
                      }}
                    >
                      {e.icon}
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

// ─── 액션 실패 등 즉시 피드백용 토스트 ────────────────────────────────────────
function FeedbackToast({ text }: { text: string | null }) {
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
function ReplaySummaryCard({
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

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ColosseumPage() {
  const { rewardSummary } = useAppData();
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const user = getStoredUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 세션 상태
  const [phase, setPhase] = useState<Phase>("lobby");
  const [lobbyTab, setLobbyTab] = useState<"battle" | "deck" | "ai">("battle");
  const [showSeason, setShowSeason] = useState(false);

  // 내 스탯 / 덱
  const [tierPts, setTierPts] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, winStreak: 0 });
  const [myAtkSlots, setMyAtkSlots] = useState<number[]>([]);
  const [myDefSlots, setMyDefSlots] = useState<number[]>([]);

  // 덱 편집
  const [editingDeckType, setEditingDeckType] = useState<"attack" | "defense">(
    "attack",
  );

  // 공격 확인
  const [targetUser, setTargetUser] = useState<{
    userId: string;
    nickname: string;
    tierPoints: number;
  } | null>(null);
  const [targetDefSlots, setTargetDefSlots] = useState<number[]>([]);
  const [npcTarget, setNpcTarget] = useState<NpcOpponent | null>(null);

  // 배틀 / 결과
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  // 랭킹
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [rankPage, setRankPage] = useState(0);
  const [rankLoading, setRankLoading] = useState(false);
  const [tierFilter, setTierFilter] = useState<number | null>(null); // null = 전체

  // 복수 목록
  const [revengeTargets, setRevengeTargets] = useState<RevengeTarget[]>([]);
  const [revengeOpen, setRevengeOpen] = useState(false);

  // 전투 기록 / 리플레이
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyHighlightId, setHistoryHighlightId] = useState<string | null>(
    null,
  );
  const [replayResult, setReplayResult] = useState<BattleResult | null>(null);
  const [replayPhase, setReplayPhase] = useState<"playing" | "summary">(
    "playing",
  );
  const [replayLoadingId, setReplayLoadingId] = useState<string | null>(null);

  const { tickets, msToNext, fmtMs, consume, refund, applyServer } = useTickets(user?.id);
  const { isOnCooldown, getRemainingMs, applyCooldown } = useNpcCooldowns();

  // 액션 실패 피드백 토스트
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const ownedIds = rewardSummary.ownedCharacterIds ?? [];

  // ── 내 데이터 로드 ──
  const fetchMyData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<{
        attackSlots: number[];
        defenseSlots: number[];
        tierPoints: number;
        wins: number;
        losses: number;
        winStreak: number;
      }>(`/arena/my?userId=${encodeURIComponent(user.id)}`);
      setMyAtkSlots(res.attackSlots);
      setMyDefSlots(res.defenseSlots);
      setTierPts(res.tierPoints);
      setStats({
        wins: res.wins,
        losses: res.losses,
        winStreak: res.winStreak,
      });
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const fetchRankings = useCallback(async () => {
    setRankLoading(true);
    try {
      const res = await api.get<{ rankings: RankingEntry[] }>(
        "/rewards/colosseum-rankings",
      );
      setRankings(res.rankings);
    } catch {
      /* silent */
    }
    setRankLoading(false);
  }, []);

  const fetchRevengeTargets = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<RevengeTarget[]>(
        `/arena/revenge/${encodeURIComponent(user.id)}`,
      );
      setRevengeTargets(res);
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const fetchBattleHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<BattleHistoryEntry[]>(
        `/arena/history/${encodeURIComponent(user.id)}`,
      );
      setBattleHistory(res);
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const openReplay = useCallback(
    async (battleId: string) => {
      if (!user?.id) return;
      setReplayLoadingId(battleId);
      try {
        const res = await api.get<BattleResult>(
          `/arena/replay/${encodeURIComponent(battleId)}?userId=${encodeURIComponent(user.id)}`,
        );
        setReplayResult(res);
        setReplayPhase("playing");
        setHistoryOpen(true);
        setHistoryHighlightId(battleId);
        setTimeout(
          () => setHistoryHighlightId((cur) => (cur === battleId ? null : cur)),
          4000,
        );
      } catch {
        showToast(
          ko
            ? "리플레이를 불러오지 못했습니다."
            : ja
              ? "リプレイの読み込みに失敗しました。"
              : "Failed to load replay.",
        );
      }
      setReplayLoadingId(null);
    },
    [user?.id, ko, ja, showToast],
  );

  useEffect(() => {
    fetchMyData();
    fetchRankings();
    fetchRevengeTargets();
    fetchBattleHistory();
  }, [fetchMyData, fetchRankings, fetchRevengeTargets, fetchBattleHistory]);

  // 알림 딥링크 — ?battleId=123 으로 진입 시 자동으로 해당 전투 리플레이 오픈
  useEffect(() => {
    const battleId = searchParams.get("battleId");
    if (battleId) {
      openReplay(battleId);
      const next = new URLSearchParams(searchParams);
      next.delete("battleId");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── 덱 저장 ──
  const saveDeck = async (deckType: "attack" | "defense", slots: number[]) => {
    if (!user?.id) return;
    try {
      await api.put("/arena/deck", { userId: user.id, deckType, slots });
      if (deckType === "attack") setMyAtkSlots(slots);
      else setMyDefSlots(slots);
      setPhase("lobby");
    } catch {
      showToast(
        ko
          ? "덱 저장에 실패했습니다. 다시 시도해주세요."
          : ja
            ? "デッキの保存に失敗しました。もう一度お試しください。"
            : "Failed to save deck. Please try again.",
      );
    }
  };

  // ── 공격 확인 (실제 플레이어) ──
  const startAttackConfirm = async (target: RankingEntry) => {
    try {
      const res = await api.get<{ slots: number[]; defenderName: string }>(
        `/arena/defense/${encodeURIComponent(target.userId)}`,
      );
      setTargetUser({
        userId: target.userId,
        nickname: target.nickname,
        tierPoints: target.tierPoints,
      });
      setTargetDefSlots(res.slots);
      setNpcTarget(null);
      setPhase("attack-confirm");
    } catch {
      /* silent */
    }
  };

  // ── 공격 확인 (NPC) ──
  const startNpcAttackConfirm = (npc: NpcOpponent) => {
    setTargetUser({
      userId: npc.id,
      nickname: ko ? npc.nameKo : ja ? npc.nameJa : npc.nameEn,
      tierPoints: npc.fakePts,
    });
    setTargetDefSlots(npc.slots);
    setNpcTarget(npc);
    setPhase("attack-confirm");
  };

  // ── 배틀 실행 ──
  const startBattle = async () => {
    if (!user?.id || !targetUser) return;
    if (!consume()) return;
    setPhase("battle");
    try {
      let res: BattleResult;
      if (npcTarget) {
        res = await api.post<BattleResult>("/arena/attack-npc", {
          userId: user.id,
          npcId: npcTarget.id,
        });
      } else {
        res = await api.post<BattleResult>(
          `/arena/attack/${encodeURIComponent(targetUser.userId)}`,
          { userId: user.id },
        );
      }
      setBattleResult(res);
      setTierPts(res.tierPoints);
      setStats({
        wins: res.wins,
        losses: res.losses,
        winStreak: res.winStreak,
      });
      if (res.tickets !== undefined) applyServer(res.tickets, res.ticketRegenAt);
      if (res.won && npcTarget) applyCooldown(npcTarget.id);
      if (!npcTarget) fetchBattleHistory(); // 실제 유저 전투만 기록에 남음
    } catch {
      refund();
      setPhase("lobby");
      showToast(
        ko
          ? "전투 시작에 실패했습니다. 티켓이 반환되었습니다."
          : ja
            ? "バトル開始に失敗しました。チケットを返却しました。"
            : "Failed to start the battle. Your ticket was refunded.",
      );
    }
  };

  // ── 페이즈별 렌더 ──────────────────────────────────────────────────────────

  // 전투 기록 리플레이 (현재 phase와 무관하게 최우선 표시)
  if (replayResult) {
    if (replayPhase === "summary") {
      return (
        <ReplaySummaryCard
          result={replayResult}
          ko={ko}
          ja={ja}
          onClose={() => {
            setReplayResult(null);
            setReplayPhase("playing");
          }}
        />
      );
    }
    return (
      <BattleReplay
        result={replayResult}
        onDone={() => setReplayPhase("summary")}
      />
    );
  }

  // 덱 편집
  if (phase === "deck-edit") {
    return (
      <>
        <DeckEditor
          deckType={editingDeckType}
          currentSlots={editingDeckType === "attack" ? myAtkSlots : myDefSlots}
          ownedIds={ownedIds}
          onSave={(slots) => saveDeck(editingDeckType, slots)}
          onBack={() => setPhase("lobby")}
          ko={ko}
          ja={ja}
          charEnhancements={rewardSummary.characterEnhancements ?? {}}
        />
        <FeedbackToast text={toast} />
      </>
    );
  }

  // 배틀 재생
  if (phase === "battle" && battleResult) {
    return (
      <BattleReplay result={battleResult} onDone={() => setPhase("result")} />
    );
  }

  // 결과 화면
  if (phase === "result" && battleResult) {
    const won = battleResult.won;
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
            vs. {targetUser?.nickname ?? "상대방"}
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
          {npcTarget && !won ? (
            <>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#60a5fa",
                  margin: "0 0 4px",
                }}
              >
                {ko ? "패배 무손실" : ja ? "敗北ペナルティなし" : "No Penalty"}
              </p>
              <p style={{ fontSize: 11, color: C.stoneFaint, margin: 0 }}>
                {ko
                  ? "AI 수련 전투 — 점수 변동 없음"
                  : ja
                    ? "AI練習戦闘 — スコア変動なし"
                    : "AI practice — score unchanged"}
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  fontFamily: "monospace",
                  fontSize: 32,
                  fontWeight: 900,
                  color: battleResult.pointsDelta >= 0 ? "#4ade80" : "#f87171",
                  margin: "0 0 4px",
                }}
              >
                {battleResult.pointsDelta >= 0 ? "+" : ""}
                {battleResult.pointsDelta} pts
              </p>
              <p style={{ fontSize: 12, color: C.stone, margin: 0 }}>
                {ko ? "현재" : "Total"}:{" "}
                {battleResult.tierPoints.toLocaleString()} pts
              </p>
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 320 }}>
          <PixelBtn onClick={() => setPhase("lobby")} color="gray">
            {ko ? "로비로" : ja ? "ロビーへ" : "Lobby"}
          </PixelBtn>
          <PixelBtn
            onClick={() => {
              setBattleResult(null);
              setEditingDeckType("attack");
              setPhase("deck-edit");
            }}
          >
            {ko ? "덱 수정" : ja ? "デッキ編集" : "Edit Deck"}
          </PixelBtn>
        </div>
      </div>
    );
  }

  // 공격 확인 화면
  if (phase === "attack-confirm" && targetUser) {
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
        <FeedbackToast text={toast} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <button
            onClick={() => setPhase("lobby")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <ChevronLeft size={22} color={C.stone} />
          </button>
          <h2
            style={{ margin: 0, color: C.gold, fontSize: 17, fontWeight: 900 }}
          >
            {ko ? "전투 확인" : ja ? "戦闘確認" : "Battle Preview"}
          </h2>
        </div>
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* NPC 배지 */}
          {npcTarget && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "rgba(96,165,250,0.1)",
                border: "1px solid rgba(96,165,250,0.35)",
                borderRadius: 7,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                />
                <rect
                  x="5"
                  y="4"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="6.5"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="9"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
              </svg>
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 900 }}>
                {ko ? "AI 수련 전투" : ja ? "AI練習戦闘" : "AI Practice Battle"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 10,
                  color: "#4ade80",
                  fontWeight: 900,
                }}
              >
                {ko
                  ? `승리 시 +${npcTarget.winPts}P`
                  : ja
                    ? `勝利時 +${npcTarget.winPts}P`
                    : `Win +${npcTarget.winPts}P`}
                {ko
                  ? " / 패배 무손실"
                  : ja
                    ? " / 敗北ペナルティなし"
                    : " / No loss penalty"}
              </span>
            </div>
          )}

          {/* 내 공격 덱 */}
          <div
            style={{
              background: "linear-gradient(135deg,#061a30,#040f1c)",
              border: "1px solid #1e3a5f",
              borderRadius: 8,
              padding: "14px 12px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                color: "#60a5fa",
                fontWeight: 900,
                letterSpacing: "0.12em",
              }}
            >
              {ko ? "내 공격 덱" : ja ? "自分の攻撃デッキ" : "My Attack Deck"}
            </p>
            {!myAtkSlots.some(Boolean) ? (
              <p style={{ color: C.stoneFaint, fontSize: 12, margin: 0 }}>
                {ko ? "덱 없음 — 자동으로 첫 번째 캐릭터 사용" : "덱 없음"}
              </p>
            ) : (
              [
                {
                  label: ko ? "전열" : ja ? "前列" : "Front",
                  hint: ko
                    ? "HP+20% · DEF+10%"
                    : ja
                      ? "HP+20% · 防御+10%"
                      : "HP+20% · DEF+10%",
                  color: "#60a5fa",
                  idxs: [0, 1] as const,
                },
                {
                  label: ko ? "후열" : ja ? "後列" : "Back",
                  hint: ko
                    ? "ATK+15% · 치명+8%"
                    : ja
                      ? "ATK+15% · 会心+8%"
                      : "ATK+15% · CRIT+8%",
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
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 2,
                        height: 12,
                        borderRadius: 1,
                        background: row.color,
                      }}
                    />
                    <span
                      style={{ fontSize: 9, fontWeight: 900, color: row.color }}
                    >
                      {row.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {row.idxs.map((i) => (
                      <DeckSlotCard
                        key={i}
                        charId={myAtkSlots[i] || null}
                        small
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 8,
                      color: row.color,
                      opacity: 0.65,
                      background: `${row.color}15`,
                      borderRadius: 3,
                      padding: "2px 6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.hint}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* vs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(90deg,transparent,${C.border})`,
              }}
            />
            <Swords size={18} color={C.gold} />
            <div
              style={{
                flex: 1,
                height: 1,
                background: `linear-gradient(90deg,${C.border},transparent)`,
              }}
            />
          </div>

          {/* 상대 방어 덱 */}
          <div
            style={{
              background: npcTarget
                ? "linear-gradient(135deg,#1a0908,#0e0504)"
                : "linear-gradient(135deg,#1f0606,#130404)",
              border: npcTarget ? "1px solid #5a1e0e88" : "1px solid #4f0e0e",
              borderRadius: 8,
              padding: "14px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  color: npcTarget ? "#f8936e" : "#f87171",
                }}
              >
                {npcTarget
                  ? ko
                    ? "AI 방어 덱"
                    : ja
                      ? "AI防御デッキ"
                      : "AI Defense Deck"
                  : `${targetUser.nickname} ${ko ? "방어 덱" : ja ? "防御デッキ" : "Defense Deck"}`}
              </p>
              {npcTarget && (
                <span style={{ display: "flex", gap: 1 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <svg key={i} width="9" height="9" viewBox="0 0 10 10">
                      <polygon
                        points="5,1 6.2,3.8 9.5,4 7,6.2 7.8,9.5 5,7.8 2.2,9.5 3,6.2 0.5,4 3.8,3.8"
                        fill={i < npcTarget.stars ? "#fbbf24" : "#2e1f06"}
                      />
                    </svg>
                  ))}
                </span>
              )}
            </div>
            <p
              style={{ margin: "0 0 10px", fontSize: 10, color: C.stoneFaint }}
            >
              {targetUser.tierPoints.toLocaleString()} pts
            </p>
            {[
              {
                label: ko ? "전열" : ja ? "前列" : "Front",
                hint: ko
                  ? "HP+20% · DEF+10%"
                  : ja
                    ? "HP+20% · 防御+10%"
                    : "HP+20% · DEF+10%",
                color: "#60a5fa",
                idxs: [0, 1] as const,
              },
              {
                label: ko ? "후열" : ja ? "後列" : "Back",
                hint: ko
                  ? "ATK+15% · 치명+8%"
                  : ja
                    ? "ATK+15% · 会心+8%"
                    : "ATK+15% · CRIT+8%",
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
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 2,
                      height: 12,
                      borderRadius: 1,
                      background: row.color,
                    }}
                  />
                  <span
                    style={{ fontSize: 9, fontWeight: 900, color: row.color }}
                  >
                    {row.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {row.idxs.map((i) => {
                    const id = targetDefSlots[i];
                    if (!id)
                      return <DeckSlotCard key={i} charId={null} small />;
                    const ch = charById(id);
                    const TYPE_ARCH: Record<string, string> = {
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
                    const arch = TYPE_ARCH[ch.type] ?? "all";
                    const elem =
                      {
                        warrior: "fire",
                        tank: "earth",
                        mage: "ice",
                        rogue: "dark",
                        nature: "nature",
                        meka: "lightning",
                        cursed: "shadow",
                        all: "light",
                      }[arch] ?? "light";
                    const al = ARCHETYPE_LABEL[arch];
                    const ec = ELEMENT_COLOR[elem] ?? "#888";
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <DeckSlotCard charId={id} small />
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            color: ec,
                            background: `${ec}22`,
                            border: `1px solid ${ec}55`,
                            borderRadius: 3,
                            padding: "1px 5px",
                          }}
                        >
                          <ArchetypeIcon arch={arch} size={8} />
                          <span
                            style={{
                              fontSize: 8,
                              fontWeight: 900,
                              lineHeight: 1.3,
                            }}
                          >
                            {ko ? al?.ko : ja ? al?.ja : al?.en}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 8,
                    color: row.color,
                    opacity: 0.65,
                    background: `${row.color}15`,
                    borderRadius: 3,
                    padding: "2px 6px",
                    whiteSpace: "nowrap",
                    alignSelf: "center",
                  }}
                >
                  {row.hint}
                </span>
              </div>
            ))}
          </div>

          {/* 티켓 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#0a0805",
              border: `1px solid ${C.borderFaint}`,
              borderRadius: 6,
            }}
          >
            <span style={{ fontSize: 13, color: C.stone }}>
              {ko ? "입장권" : ja ? "入場券" : "Tickets"}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 900,
                fontSize: 16,
                color: tickets > 0 ? C.gold : "#f87171",
              }}
            >
              {Array.from({ length: tickets }, (_, i) => (
                <Ticket
                  key={i}
                  size={14}
                  color={C.gold}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 1,
                  }}
                />
              ))}
              {tickets === 0 && (msToNext ? fmtMs(msToNext) : "")}
            </span>
          </div>
          <PixelBtn
            onClick={startBattle}
            disabled={tickets === 0 || !myAtkSlots.some(Boolean)}
          >
            <Swords size={18} />{" "}
            {ko ? "전투 시작" : ja ? "戦闘開始" : "Start Battle"}
          </PixelBtn>
        </div>
      </div>
    );
  }

  // ── 로비 ──────────────────────────────────────────────────────────────────
  const tierIdx = getTierIdx(tierPts);
  const tier = TIERS[tierIdx];
  const tierLabel = ko ? tier.ko : ja ? tier.ja : tier.en;
  const tierNext = TIERS[tierIdx + 1]?.min ?? tier.min + 1000;
  const tierProgress = Math.min(
    1,
    (tierPts - tier.min) / (tierNext - tier.min),
  );
  const RANK_PAGE_SZ = 5;
  // ── 티어 필터 적용 ──
  const filteredRankings =
    tierFilter === null
      ? rankings
      : rankings.filter((e) => getTierIdx(e.tierPoints) === tierFilter);
  const rankTotalPages = Math.ceil(filteredRankings.length / RANK_PAGE_SZ);
  const rankPage5 = filteredRankings.slice(
    rankPage * RANK_PAGE_SZ,
    (rankPage + 1) * RANK_PAGE_SZ,
  );
  const myRankEntry = rankings.find((e) => e.userId === user?.id);

  // ── 공격 가능한 유효한 타겟 (나 제외) ──
  const attackableEntries = filteredRankings.filter(
    (e) => e.userId !== user?.id,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "0 0 60px",
        fontFamily: FONT,
      }}
    >
      <style>{CSS}</style>
      <FeedbackToast text={toast} />

      {/* ══ 히어로 배너 ══════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          background:
            "linear-gradient(180deg,#1e1006 0%,#120a04 55%,#0c0703 100%)",
          borderBottom: `3px solid #6b3a0e`,
          boxShadow: `0 6px 40px ${C.goldGlow}55`,
        }}
      >
        {/* 석재 질감 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.05,
            pointerEvents: "none",
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 15px,#fff 15px,#fff 16px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,0.5) 31px,rgba(255,255,255,0.5) 32px)",
          }}
        />
        {/* 금빛 방사광 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `radial-gradient(ellipse 80% 60% at 50% 110%,${C.goldGlow}22 0%,transparent 65%)`,
          }}
        />
        {/* 사이드 그라디언트 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg,rgba(0,0,0,0.35) 0%,transparent 30%,transparent 70%,rgba(0,0,0,0.35) 100%)",
          }}
        />

        {/* 횃불 */}
        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 2 }}>
          <Torch />
        </div>
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 2 }}>
          <Torch flip />
        </div>

        {/* 시즌 보상 버튼 (우상단) */}
        <button
          onClick={() => setShowSeason(true)}
          style={{
            position: "absolute",
            top: 14,
            right: 48,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(200,164,74,0.14)",
            border: "1px solid #6b4a12",
            borderRadius: 6,
            padding: "5px 11px",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 11,
            fontWeight: 900,
            color: C.gold,
            backdropFilter: "blur(4px)",
          }}
        >
          <Gift size={12} color={C.gold} />
          {ko
            ? `S${SEASON.number} 보상`
            : ja
              ? `S${SEASON.number}報酬`
              : `S${SEASON.number}`}
        </button>

        {/* 상단 컨텐츠 */}
        <div
          style={{
            padding: "20px 16px 0",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 9,
              letterSpacing: "0.6em",
              color: C.stone,
              fontWeight: 900,
            }}
          >
            K E B O M O N
          </p>
          {/* 경기장 게이트 */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 10,
              marginBottom: 2,
            }}
          >
            <ArenaFlag />
            <ArenaGate />
            <ArenaFlag flip />
          </div>
          <h1
            style={{
              margin: "0 0 4px",
              fontFamily: "'Courier New',monospace",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: "0.25em",
              color: C.gold,
              textShadow: `0 0 32px ${C.goldGlow}, 2px 2px 0 #3a2508, -1px -1px 0 #3a2508`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <Swords size={20} color={C.gold} strokeWidth={2.5} />
            COLOSSEUM
            <Swords size={20} color={C.gold} strokeWidth={2.5} />
          </h1>
          {/* 시즌 배지 */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(200,164,74,0.09)",
              border: `1px solid ${C.gold}33`,
              borderRadius: 20,
              padding: "3px 16px",
              marginBottom: 14,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 14 14">
              <polygon
                points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2"
                fill="#c8a44a"
                opacity="0.9"
              />
            </svg>
            <span
              style={{
                fontFamily: FONT,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.14em",
                color: C.gold,
              }}
            >
              {ko
                ? `시즌 ${SEASON.number} · 영광의 시작`
                : ja
                  ? `S${SEASON.number} · 栄光の始まり`
                  : `Season ${SEASON.number} · Glory Begins`}
            </span>
            <svg width="11" height="11" viewBox="0 0 14 14">
              <polygon
                points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2"
                fill="#c8a44a"
                opacity="0.9"
              />
            </svg>
          </div>
        </div>

        {/* 티어 + 스탯 통합 카드 (배너 하단에 붙음) */}
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "0 12px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              background: `linear-gradient(135deg,${tier.glow}22 0%,rgba(0,0,0,0.55) 100%)`,
              border: `1px solid ${tier.color}55`,
              borderRadius: "8px 8px 0 0",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* 티어 배지 */}
              <div
                style={{
                  flexShrink: 0,
                  animation: "col-tier-pulse 3s ease-in-out infinite",
                  color: tier.color,
                }}
              >
                <TierBadgeSvg idx={tierIdx} size={36} />
              </div>
              {/* 티어 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ display: "flex", alignItems: "baseline", gap: 6 }}
                >
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 15,
                      fontWeight: 900,
                      color: tier.color,
                      textShadow: `0 0 12px ${tier.glow}`,
                    }}
                  >
                    {tierLabel}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: C.stone,
                    }}
                  >
                    {tierPts.toLocaleString()} pts
                  </span>
                </div>
                {/* 진행 바 */}
                <div
                  style={{
                    height: 7,
                    background: "rgba(0,0,0,0.6)",
                    border: `1px solid ${tier.color}44`,
                    borderRadius: 4,
                    overflow: "hidden",
                    marginTop: 4,
                    boxShadow: `0 0 8px ${tier.glow}33`,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${tierProgress * 100}%`,
                      background: `linear-gradient(90deg,${tier.glow},${tier.color})`,
                      boxShadow: `0 0 16px ${tier.color}aa`,
                      borderRadius: 4,
                      transition: "width 0.6s cubic-bezier(0.25,0.8,0.25,1)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "0 auto 0 0",
                        width: "100%",
                        background:
                          "linear-gradient(180deg,rgba(255,255,255,0.3) 0%,transparent 60%)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
                <p
                  style={{
                    margin: "3px 0 0",
                    fontSize: 9,
                    color: C.stoneFaint,
                    fontFamily: "monospace",
                  }}
                >
                  {tierPts.toLocaleString()} /{" "}
                  {(
                    TIERS[tierIdx + 1]?.min ?? tier.min + 1000
                  ).toLocaleString()}{" "}
                  pts
                </p>
              </div>
            </div>

            {/* 승/패/연승 가로 통계 */}
            <div
              style={{
                display: "flex",
                marginTop: 8,
                paddingTop: 8,
                borderTop: `1px solid ${tier.color}33`,
                gap: 0,
              }}
            >
              {[
                {
                  lk: "승",
                  lj: "勝",
                  le: "WIN",
                  val: stats.wins,
                  col: "#4ade80",
                  bg: "rgba(74,222,128,0.08)",
                },
                {
                  lk: "패",
                  lj: "敗",
                  le: "LOSE",
                  val: stats.losses,
                  col: "#f87171",
                  bg: "rgba(248,113,113,0.08)",
                },
                {
                  lk: "연승",
                  lj: "連勝",
                  le: "STREAK",
                  val: stats.winStreak,
                  col: C.gold,
                  bg: `rgba(200,164,74,0.08)`,
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "4px 0",
                    background: s.bg,
                    borderRadius: 4,
                    margin: "0 3px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "monospace",
                      fontSize: 16,
                      fontWeight: 900,
                      color: s.col,
                      lineHeight: 1,
                      textShadow: `0 0 10px ${s.col}88`,
                    }}
                  >
                    {s.val}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontFamily: FONT,
                      fontSize: 9,
                      color: C.stoneFaint,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {ko ? s.lk : ja ? s.lj : s.le}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 배너 하단 border 연결 */}
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg,transparent,${tier.color}88,${tier.color},${tier.color}88,transparent)`,
            }}
          />
        </div>
      </div>

      {showSeason && (
        <SeasonRewardModal
          onClose={() => setShowSeason(false)}
          ko={ko}
          ja={ja}
          myPts={tierPts}
        />
      )}

      {/* ══ 탭 바 ══════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 12px" }}>
        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${C.border}`,
            marginTop: 2,
          }}
        >
          {[
            {
              key: "battle" as const,
              icon: <Swords size={13} strokeWidth={2.5} />,
              labelKo: "대전",
              labelJa: "対戦",
              labelEn: "Battle",
            },
            {
              key: "deck" as const,
              icon: <Sword size={13} strokeWidth={2.5} />,
              labelKo: "덱",
              labelJa: "デッキ",
              labelEn: "Deck",
            },
            {
              key: "ai" as const,
              icon: <Bot size={13} strokeWidth={2.5} />,
              labelKo: "수련",
              labelJa: "修練",
              labelEn: "Train",
            },
          ].map((t) => {
            const active = lobbyTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setLobbyTab(t.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "10px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: active
                    ? `3px solid ${C.gold}`
                    : "3px solid transparent",
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: "0.06em",
                  color: active ? C.gold : C.stoneFaint,
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s",
                  marginBottom: -2,
                }}
              >
                {t.icon}
                {ko ? t.labelKo : ja ? t.labelJa : t.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* ══ 탭: 덱 구성 ════════════════════════════════════════════════════ */}
        {lobbyTab === "deck" && (
          <div
            style={{
              background: "linear-gradient(135deg,#18120a 0%,#0e0b06 100%)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(200,164,74,0.06)",
                borderBottom: `1px solid ${C.borderFaint}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Swords size={13} color={C.gold} strokeWidth={2.5} />
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: 900,
                  color: C.gold,
                  letterSpacing: "0.1em",
                }}
              >
                {ko ? "전투 덱 구성" : ja ? "戦闘デッキ" : "Battle Deck"}
              </span>
            </div>

            {/* 공격/방어 덱 나란히 */}
            <div className="col-deck-wrap" style={{ display: "flex", gap: 0 }}>
              {[
                {
                  type: "attack" as const,
                  label: ko ? "공격 덱" : ja ? "攻撃" : "ATK",
                  slots: myAtkSlots,
                  accent: "#60a5fa",
                  bgGrad: "linear-gradient(135deg,#061a30 0%,#040f1c 100%)",
                  bdr: "#1e3a5f",
                },
                {
                  type: "defense" as const,
                  label: ko ? "방어 덱" : ja ? "防御" : "DEF",
                  slots: myDefSlots,
                  accent: "#f87171",
                  bgGrad: "linear-gradient(135deg,#200707 0%,#130404 100%)",
                  bdr: "#4f0e0e",
                },
              ].map((dk, di) => (
                <div
                  key={dk.type}
                  style={{
                    flex: 1,
                    padding: "12px 10px",
                    background: dk.bgGrad,
                    borderLeft:
                      di === 1 ? `1px solid ${C.borderFaint}` : undefined,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: dk.accent,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {dk.label}
                    </span>
                    <button
                      onClick={() => {
                        setEditingDeckType(dk.type);
                        setPhase("deck-edit");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        background: `${dk.accent}18`,
                        border: `1px solid ${dk.accent}55`,
                        color: dk.accent,
                        fontFamily: FONT,
                        fontSize: 10,
                        fontWeight: 900,
                        padding: "3px 10px",
                        borderRadius: 4,
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {ko ? "편집" : ja ? "編集" : "Edit"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {Array.from({ length: 4 }, (_, i) => {
                      const id = dk.slots[i];
                      if (!id)
                        return (
                          <div
                            key={i}
                            style={{
                              width: 44,
                              height: 44,
                              border: `2px dashed ${dk.bdr}`,
                              borderRadius: 6,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Plus size={13} color={dk.bdr} />
                          </div>
                        );
                      const ch = charById(id);
                      const th = RARITY_THEME[ch.rarity as CharacterRarity];
                      return (
                        <div
                          key={i}
                          style={{
                            width: 44,
                            height: 44,
                            border: `2px solid ${th?.border ?? dk.bdr}`,
                            borderRadius: 6,
                            background: th?.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: `0 0 8px ${th?.glow ?? dk.accent}44`,
                            position: "relative",
                          }}
                        >
                          <PixelSprite
                            type={ch.type as CharacterType}
                            rarity={ch.rarity as CharacterRarity}
                            size={34}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 9,
                      color: `${dk.accent}88`,
                      fontFamily: "monospace",
                    }}
                  >
                    {dk.slots.length}/4 {ko ? "편성" : ja ? "編成" : "slots"}
                  </p>
                </div>
              ))}
            </div>

            {/* 덱 탭 안내 — 대전 탭 바로가기 */}
            <div
              style={{
                padding: "12px 14px",
                borderTop: `1px solid ${C.borderFaint}`,
                background: "rgba(0,0,0,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 10, color: C.stoneFaint }}>
                {ko
                  ? "덱 편성 후 대전 탭에서 전투를 시작하세요"
                  : ja
                    ? "デッキ編成後、対戦タブで戦闘を開始してください"
                    : "Set your deck, then go to Battle tab to fight"}
              </span>
              <button
                onClick={() => setLobbyTab("battle")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: `${C.gold}18`,
                  border: `1px solid ${C.gold}44`,
                  color: C.gold,
                  fontFamily: FONT,
                  fontSize: 10,
                  fontWeight: 900,
                  padding: "4px 10px",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                <Swords size={10} strokeWidth={2.5} />
                {ko ? "대전 탭" : ja ? "対戦タブ" : "Battle Tab"}
              </button>
            </div>
          </div>
        )}

        {/* ══ 탭: 대전 — 입장권 + 전투 시작 CTA ════════════════════════════ */}
        {lobbyTab === "battle" && (
          <>
            <div
              style={{
                background: "linear-gradient(135deg,#1a1208 0%,#0e0b06 100%)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 14px 16px",
              }}
            >
              {/* 덱 미리보기 (소형) */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {[
                  {
                    label: ko ? "공격" : ja ? "攻撃" : "ATK",
                    slots: myAtkSlots,
                    accent: "#60a5fa",
                  },
                  {
                    label: ko ? "방어" : ja ? "防御" : "DEF",
                    slots: myDefSlots,
                    accent: "#f87171",
                  },
                ].map((dk) => (
                  <div
                    key={dk.label}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      background: "rgba(0,0,0,0.3)",
                      border: `1px solid ${C.borderFaint}`,
                      borderRadius: 7,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 900,
                          color: dk.accent,
                        }}
                      >
                        {dk.label}
                      </span>
                      <button
                        onClick={() => setLobbyTab("deck")}
                        style={{
                          fontSize: 8,
                          color: C.stoneFaint,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        {ko ? "편집" : ja ? "編集" : "Edit"}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: 4 }, (_, i) => {
                        const id = dk.slots[i];
                        if (!id)
                          return (
                            <div
                              key={i}
                              style={{
                                width: 30,
                                height: 30,
                                border: `1.5px dashed ${C.borderFaint}`,
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            />
                          );
                        const ch = charById(id);
                        const th = RARITY_THEME[ch.rarity as CharacterRarity];
                        return (
                          <div
                            key={i}
                            style={{
                              width: 30,
                              height: 30,
                              border: `1.5px solid ${th?.border ?? C.borderFaint}`,
                              borderRadius: 4,
                              background: th?.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <PixelSprite
                              type={ch.type as CharacterType}
                              rarity={ch.rarity as CharacterRarity}
                              size={22}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 입장권 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    flex: 1,
                  }}
                >
                  <span
                    style={{ fontSize: 11, color: C.stone, fontWeight: 700 }}
                  >
                    {ko ? "입장권" : ja ? "入場券" : "Tickets"}
                  </span>
                  <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                    {Array.from({ length: MAX_TICKETS }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 10,
                          height: 22,
                          borderRadius: 3,
                          background:
                            i < tickets
                              ? `linear-gradient(180deg,${C.gold},#8b6020)`
                              : "#2e1f06",
                          border:
                            i < tickets
                              ? `1px solid ${C.gold}66`
                              : `1px solid #1a1005`,
                          boxShadow:
                            i < tickets ? `0 0 6px ${C.goldGlow}88` : "none",
                          transition: "all 0.3s",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      fontWeight: 900,
                      color: tickets > 0 ? C.gold : "#f87171",
                      marginLeft: 4,
                    }}
                  >
                    {tickets}/{MAX_TICKETS}
                  </span>
                </div>
                {msToNext && tickets < MAX_TICKETS && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${C.borderFaint}`,
                      borderRadius: 5,
                      padding: "3px 8px",
                    }}
                  >
                    <span style={{ fontSize: 10, color: C.stoneFaint }}>
                      {ko ? "충전" : ja ? "補充" : "next"}
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        fontWeight: 900,
                        color: "#60a5fa",
                      }}
                    >
                      {fmtMs(msToNext)}
                    </span>
                  </div>
                )}
              </div>

              {/* 전투 시작 버튼 */}
              <button
                disabled={tickets === 0 || !myAtkSlots.some(Boolean)}
                onClick={() =>
                  document
                    .getElementById("col-ranking")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="col-btn-shine"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "linear-gradient(180deg,#374151,#1f2937)"
                      : "linear-gradient(180deg,#d4a84b 0%,#c8a44a 40%,#8b6020 100%)",
                  border:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "3px solid #1f2937"
                      : "3px solid #5a3d0e",
                  boxShadow:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "0 5px 0 #0f172a"
                      : undefined,
                  color:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "#6b7280"
                      : "#1c1101",
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: "0.1em",
                  padding: "14px 0",
                  borderRadius: 6,
                  cursor:
                    tickets === 0 || !myAtkSlots.some(Boolean)
                      ? "not-allowed"
                      : "pointer",
                  animation:
                    tickets > 0 && myAtkSlots.some(Boolean)
                      ? "col-battle-ready 2.4s ease-in-out infinite"
                      : undefined,
                  transition: "opacity 0.2s",
                }}
              >
                <Swords size={20} strokeWidth={2.5} />{" "}
                {tickets === 0
                  ? ko
                    ? "입장권 소진"
                    : ja
                      ? "入場券なし"
                      : "No Tickets"
                  : !myAtkSlots.some(Boolean)
                    ? ko
                      ? "공격 덱 편성 필요"
                      : ja
                        ? "デッキなし"
                        : "Set Attack Deck First"
                    : ko
                      ? "결투 상대 선택 ↓"
                      : ja
                        ? "対戦相手選択 ↓"
                        : "Select Opponent ↓"}
              </button>
              {!myAtkSlots.some(Boolean) && tickets > 0 && (
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 10,
                    color: "#f87171",
                    textAlign: "center",
                  }}
                >
                  <button
                    onClick={() => setLobbyTab("deck")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      background: "none",
                      border: "none",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: 10,
                      fontFamily: FONT,
                      textDecoration: "underline",
                    }}
                  >
                    <Sword size={10} strokeWidth={2.5} />
                    {ko ? "덱 탭" : ja ? "デッキ" : "Deck tab"}
                  </button>
                  {ko
                    ? "에서 공격 덱을 편성해 주세요"
                    : ja
                      ? "で攻撃デッキを編成してください"
                      : " — set up your attack deck first"}
                </p>
              )}
            </div>

            {/* ══ 복수 목록 (대전 탭 안) ═══════════════════════════════════════ */}
            {revengeTargets.length > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg,#180a0a 0%,#0e0606 100%)",
                  border: "1px solid #6b1414",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setRevengeOpen((p) => !p)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "rgba(248,113,113,0.07)",
                    borderBottom: revengeOpen ? "1px solid #3a0e0e" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Swords size={13} color="#f87171" strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#f87171",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ko ? "복수 목록" : ja ? "リベンジ" : "Revenge"}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: "#f87171",
                        background: "rgba(248,113,113,0.15)",
                        border: "1px solid rgba(248,113,113,0.35)",
                        borderRadius: 10,
                        padding: "1px 7px",
                      }}
                    >
                      {revengeTargets.length}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    color="#f87171"
                    style={{
                      transform: revengeOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {revengeOpen && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {revengeTargets.map((rt, i) => {
                      const eti = getTierIdx(rt.tierPoints);
                      const ago = (() => {
                        const diff = Date.now() - new Date(rt.at).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return h > 0
                          ? ko
                            ? `${h}시간 전`
                            : ja
                              ? `${h}時間前`
                              : `${h}h ago`
                          : ko
                            ? `${m}분 전`
                            : ja
                              ? `${m}分前`
                              : `${m}m ago`;
                      })();
                      return (
                        <div
                          key={rt.userId + i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderBottom:
                              i < revengeTargets.length - 1
                                ? "1px solid #2a0e0e"
                                : "none",
                            background:
                              i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.012)",
                          }}
                        >
                          <TierBadgeSvg idx={eti} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#e2e8f0",
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {rt.name}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  fontFamily: "monospace",
                                  color: TIERS[eti].color,
                                }}
                              >
                                {rt.tierPoints.toLocaleString()} pts
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: rt.theyWon ? "#f87171" : "#4ade80",
                                  background: rt.theyWon
                                    ? "rgba(248,113,113,0.12)"
                                    : "rgba(74,222,128,0.12)",
                                  border: `1px solid ${rt.theyWon ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                }}
                              >
                                {rt.theyWon
                                  ? ko
                                    ? "나를 격파"
                                    : ja
                                      ? "撃破された"
                                      : "They won"
                                  : ko
                                    ? "패배함"
                                    : ja
                                      ? "敗北"
                                      : "They lost"}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#4b5563",
                                  marginLeft: "auto",
                                }}
                              >
                                {ago}
                              </span>
                            </div>
                          </div>
                          <div
                            style={{ display: "flex", gap: 4, flexShrink: 0 }}
                          >
                            {rt.defenseSlots.slice(0, 3).map((id, si) => {
                              const ch = charById(id);
                              const th =
                                RARITY_THEME[ch.rarity as CharacterRarity];
                              return (
                                <div
                                  key={si}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    border: `1px solid ${th?.border ?? "#374151"}`,
                                    borderRadius: 4,
                                    background: th?.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <PixelSprite
                                    type={ch.type as CharacterType}
                                    rarity={ch.rarity as CharacterRarity}
                                    size={20}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <button
                            onClick={() =>
                              startAttackConfirm({
                                userId: rt.userId,
                                nickname: rt.name,
                                tierPoints: rt.tierPoints,
                                rank: 0,
                                wins: 0,
                                winStreak: 0,
                                characterId: null,
                              })
                            }
                            disabled={
                              tickets === 0 || !myAtkSlots.some(Boolean)
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background:
                                tickets > 0 && myAtkSlots.some(Boolean)
                                  ? "linear-gradient(180deg,#ef4444,#991b1b)"
                                  : "#1e0a0a",
                              border: `2px solid ${tickets > 0 && myAtkSlots.some(Boolean) ? "#7f1d1d" : "#2e0a0a"}`,
                              color:
                                tickets > 0 && myAtkSlots.some(Boolean)
                                  ? "#fff"
                                  : "#6b7280",
                              fontFamily: FONT,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "5px 10px",
                              borderRadius: 4,
                              cursor:
                                tickets === 0 || !myAtkSlots.some(Boolean)
                                  ? "not-allowed"
                                  : "pointer",
                              flexShrink: 0,
                              boxShadow:
                                tickets > 0 && myAtkSlots.some(Boolean)
                                  ? "0 3px 0 #450a0a"
                                  : "none",
                            }}
                          >
                            <Swords size={10} strokeWidth={2.5} />
                            {ko ? "복수" : ja ? "復讐" : "Revenge"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ 전투 기록 (대전 탭 안) ═══════════════════════════════════════ */}
            {battleHistory.length > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg,#0a1420 0%,#060d16 100%)",
                  border: "1px solid #14395a",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setHistoryOpen((p) => !p)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: "rgba(96,165,250,0.07)",
                    borderBottom: historyOpen ? "1px solid #0e2a44" : "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <History size={13} color="#60a5fa" strokeWidth={2.5} />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#60a5fa",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ko ? "전투 기록" : ja ? "バトル履歴" : "Battle History"}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: "#60a5fa",
                        background: "rgba(96,165,250,0.15)",
                        border: "1px solid rgba(96,165,250,0.35)",
                        borderRadius: 10,
                        padding: "1px 7px",
                      }}
                    >
                      {battleHistory.length}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    color="#60a5fa"
                    style={{
                      transform: historyOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
                </button>

                {historyOpen && (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {battleHistory.map((bh, i) => {
                      const ago = (() => {
                        const diff =
                          Date.now() - new Date(bh.createdAt).getTime();
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return h > 0
                          ? ko
                            ? `${h}시간 전`
                            : ja
                              ? `${h}時間前`
                              : `${h}h ago`
                          : ko
                            ? `${m}분 전`
                            : ja
                              ? `${m}分前`
                              : `${m}m ago`;
                      })();
                      const highlighted = historyHighlightId === bh.id;
                      return (
                        <div
                          key={bh.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderBottom:
                              i < battleHistory.length - 1
                                ? "1px solid #0e2233"
                                : "none",
                            background: highlighted
                              ? "rgba(96,165,250,0.14)"
                              : i % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.012)",
                            boxShadow: highlighted
                              ? "inset 3px 0 0 #60a5fa"
                              : "none",
                            transition: "background 0.4s, box-shadow 0.4s",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#e2e8f0",
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {bh.isAttacker
                                ? ko
                                  ? `vs ${bh.opponentName}`
                                  : ja
                                    ? `vs ${bh.opponentName}`
                                    : `vs ${bh.opponentName}`
                                : ko
                                  ? `${bh.opponentName}의 공격`
                                  : ja
                                    ? `${bh.opponentName}の攻撃`
                                    : `Attacked by ${bh.opponentName}`}
                            </p>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 2,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 9,
                                  color: bh.won ? "#4ade80" : "#f87171",
                                  background: bh.won
                                    ? "rgba(74,222,128,0.12)"
                                    : "rgba(248,113,113,0.12)",
                                  border: `1px solid ${bh.won ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                                  borderRadius: 3,
                                  padding: "1px 5px",
                                }}
                              >
                                {bh.won
                                  ? ko
                                    ? "승리"
                                    : ja
                                      ? "勝利"
                                      : "Won"
                                  : ko
                                    ? "패배"
                                    : ja
                                      ? "敗北"
                                      : "Lost"}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  fontFamily: "monospace",
                                  color:
                                    bh.pointsDelta >= 0 ? "#4ade80" : "#f87171",
                                }}
                              >
                                {bh.pointsDelta >= 0
                                  ? `+${bh.pointsDelta}`
                                  : bh.pointsDelta}
                                pts
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color: "#4b5563",
                                  marginLeft: "auto",
                                }}
                              >
                                {ago}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => openReplay(bh.id)}
                            disabled={replayLoadingId === bh.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background:
                                "linear-gradient(180deg,#3b82f6,#1d4ed8)",
                              border: "2px solid #1e3a8a",
                              color: "#fff",
                              fontFamily: FONT,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "5px 10px",
                              borderRadius: 4,
                              cursor:
                                replayLoadingId === bh.id ? "wait" : "pointer",
                              flexShrink: 0,
                              boxShadow: "0 3px 0 #1e3a8a",
                              opacity: replayLoadingId === bh.id ? 0.6 : 1,
                            }}
                          >
                            {replayLoadingId === bh.id ? (
                              <>
                                <Loader2
                                  size={10}
                                  strokeWidth={2.5}
                                  style={{
                                    animation: "col-spin 0.8s linear infinite",
                                  }}
                                />
                                {ko
                                  ? "로딩..."
                                  : ja
                                    ? "読込中..."
                                    : "Loading..."}
                              </>
                            ) : (
                              <>
                                <PlayCircle size={10} strokeWidth={2.5} />
                                {ko ? "리플레이" : ja ? "リプレイ" : "Replay"}
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ 랭킹 (항상 표시) ═════════════════════════════════════════════ */}
            <div
              id="col-ranking"
              style={{
                background: "linear-gradient(135deg,#16110a 0%,#0e0b06 100%)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* 랭킹 헤더 */}
              <div
                style={{
                  padding: "11px 14px",
                  background: "rgba(200,164,74,0.06)",
                  borderBottom: `1px solid ${C.borderFaint}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <Crown size={13} color={C.gold} />
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 12,
                        fontWeight: 900,
                        color: C.gold,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {ko
                        ? "결투 상대 목록"
                        : ja
                          ? "対戦相手リスト"
                          : "Opponents"}
                    </span>
                    {rankLoading && (
                      <span style={{ fontSize: 9, color: C.stoneFaint }}>
                        로딩...
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      fetchRankings();
                      setRankPage(0);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      lineHeight: 0,
                    }}
                  >
                    <ChevronRight size={14} color={C.stoneFaint} />
                  </button>
                </div>
                {/* 티어 필터 칩 */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <button
                    onClick={() => {
                      setTierFilter(null);
                      setRankPage(0);
                    }}
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      fontFamily: FONT,
                      padding: "2px 9px",
                      borderRadius: 10,
                      border: `1px solid ${tierFilter === null ? C.gold : C.borderFaint}`,
                      background:
                        tierFilter === null ? `${C.gold}22` : "transparent",
                      color: tierFilter === null ? C.gold : C.stoneFaint,
                      cursor: "pointer",
                    }}
                  >
                    {ko ? "전체" : ja ? "全体" : "All"}
                  </button>
                  {TIERS.map((t, ti) => (
                    <button
                      key={ti}
                      onClick={() => {
                        setTierFilter(ti);
                        setRankPage(0);
                      }}
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        fontFamily: FONT,
                        padding: "2px 9px",
                        borderRadius: 10,
                        border: `1px solid ${tierFilter === ti ? t.color : C.borderFaint}`,
                        background:
                          tierFilter === ti ? `${t.color}22` : "transparent",
                        color: tierFilter === ti ? t.color : C.stoneFaint,
                        cursor: "pointer",
                      }}
                    >
                      {ko ? t.ko : ja ? t.ja : t.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* 내 랭킹 고정 */}
              {myRankEntry && (
                <div
                  style={{
                    padding: "9px 14px",
                    background: `linear-gradient(90deg,${C.gold}10,transparent)`,
                    borderBottom: `1px solid ${C.borderFaint}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ width: 28, textAlign: "center" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        fontWeight: 900,
                        color: C.gold,
                      }}
                    >
                      #{myRankEntry.rank}
                    </span>
                  </div>
                  <TierBadgeSvg
                    idx={getTierIdx(myRankEntry.tierPoints)}
                    size={22}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12,
                      color: C.parchment,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {myRankEntry.nickname}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      color: C.gold,
                      background: `${C.gold}18`,
                      border: `1px solid ${C.gold}44`,
                      borderRadius: 3,
                      padding: "2px 6px",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {ko ? "나" : "ME"}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: C.gold,
                      flexShrink: 0,
                    }}
                  >
                    {myRankEntry.tierPoints.toLocaleString()}
                  </span>
                </div>
              )}

              {/* 랭킹 리스트 */}
              <div>
                {rankPage5.map((entry, ri) => {
                  const isMe = entry.userId === user?.id;
                  const eti = getTierIdx(entry.tierPoints);
                  const rankColor =
                    entry.rank === 1
                      ? "#ffd700"
                      : entry.rank === 2
                        ? "#c0c0c0"
                        : entry.rank === 3
                          ? "#cd7f32"
                          : C.stoneFaint;
                  return (
                    <div
                      key={entry.userId}
                      onClick={() => navigate(`/profile/${entry.userId}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderBottom: `1px solid ${C.borderFaint}`,
                        background: isMe
                          ? `${C.gold}08`
                          : ri % 2 === 0
                            ? "transparent"
                            : "rgba(255,255,255,0.015)",
                        transition: "background 0.15s",
                        cursor: "pointer",
                      }}
                    >
                      {/* 순위 */}
                      <div
                        style={{
                          width: 28,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {entry.rank <= 3 ? (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 14,
                              fontWeight: 900,
                              color: rankColor,
                              textShadow: `0 0 8px ${rankColor}`,
                            }}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              color: C.stoneFaint,
                            }}
                          >
                            {entry.rank}
                          </span>
                        )}
                      </div>
                      {/* 티어 배지 */}
                      <TierBadgeSvg idx={eti} size={22} />
                      {/* 이름 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: isMe ? C.gold : C.parchment,
                            fontWeight: isMe ? 900 : 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {entry.nickname}
                          {isMe && (
                            <span
                              style={{
                                fontSize: 9,
                                color: C.gold,
                                marginLeft: 4,
                              }}
                            >
                              (나)
                            </span>
                          )}
                        </p>
                        <p
                          style={{
                            margin: "1px 0 0",
                            fontFamily: "monospace",
                            fontSize: 10,
                            color: TIERS[eti].color,
                          }}
                        >
                          {TIERS[eti][ko ? "ko" : ja ? "ja" : "en"]}
                        </p>
                      </div>
                      {/* 포인트 */}
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: C.stone,
                          flexShrink: 0,
                        }}
                      >
                        {entry.tierPoints.toLocaleString()}
                      </span>
                      {/* 공격 버튼 */}
                      {!isMe && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startAttackConfirm(entry); }}
                          disabled={tickets === 0 || !myAtkSlots.some(Boolean)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background:
                              tickets > 0 && myAtkSlots.some(Boolean)
                                ? "linear-gradient(180deg,#c8a44a,#8b6020)"
                                : "#1e1508",
                            border: `2px solid ${tickets > 0 && myAtkSlots.some(Boolean) ? "#5a3d0e" : "#2e1f06"}`,
                            color:
                              tickets > 0 && myAtkSlots.some(Boolean)
                                ? "#1c1101"
                                : C.stoneFaint,
                            fontFamily: FONT,
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "5px 12px",
                            borderRadius: 4,
                            cursor:
                              tickets === 0 || !myAtkSlots.some(Boolean)
                                ? "not-allowed"
                                : "pointer",
                            flexShrink: 0,
                            transition: "all 0.15s",
                            boxShadow:
                              tickets > 0 && myAtkSlots.some(Boolean)
                                ? "0 3px 0 #3a2508"
                                : "none",
                          }}
                        >
                          <Swords size={10} strokeWidth={2.5} />
                          {ko ? "도전" : ja ? "挑戦" : "Fight"}
                        </button>
                      )}
                    </div>
                  );
                })}
                {attackableEntries.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      fontSize: 12,
                      color: C.stoneFaint,
                    }}
                  >
                    {ko
                      ? "아직 결투 상대가 없습니다"
                      : ja
                        ? "対戦相手がいません"
                        : "No opponents yet"}
                  </p>
                )}
              </div>

              {/* 페이지네이션 */}
              {rankTotalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    padding: "10px",
                    borderTop: `1px solid ${C.borderFaint}`,
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  <button
                    onClick={() => setRankPage((p) => Math.max(0, p - 1))}
                    disabled={rankPage === 0}
                    style={{
                      background:
                        rankPage === 0
                          ? "transparent"
                          : "rgba(200,164,74,0.12)",
                      border: `1px solid ${rankPage === 0 ? C.borderFaint : C.border}`,
                      borderRadius: 5,
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: rankPage === 0 ? "not-allowed" : "pointer",
                      color: rankPage === 0 ? C.borderFaint : C.gold,
                      transition: "all 0.15s",
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from(
                      { length: Math.min(rankTotalPages, 5) },
                      (_, i) => {
                        const pg =
                          rankTotalPages <= 5
                            ? i
                            : Math.max(
                                0,
                                Math.min(rankPage - 2, rankTotalPages - 5),
                              ) + i;
                        return (
                          <button
                            key={pg}
                            onClick={() => setRankPage(pg)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              border: "none",
                              background:
                                pg === rankPage ? C.gold : "transparent",
                              color: pg === rankPage ? "#1c1101" : C.stoneFaint,
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {pg + 1}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setRankPage((p) => Math.min(rankTotalPages - 1, p + 1))
                    }
                    disabled={rankPage >= rankTotalPages - 1}
                    style={{
                      background:
                        rankPage >= rankTotalPages - 1
                          ? "transparent"
                          : "rgba(200,164,74,0.12)",
                      border: `1px solid ${rankPage >= rankTotalPages - 1 ? C.borderFaint : C.border}`,
                      borderRadius: 5,
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        rankPage >= rankTotalPages - 1
                          ? "not-allowed"
                          : "pointer",
                      color:
                        rankPage >= rankTotalPages - 1 ? C.borderFaint : C.gold,
                      transition: "all 0.15s",
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ 탭: AI 수련 ════════════════════════════════════════════════════ */}
        {lobbyTab === "ai" && (
          <div
            style={{
              background: "linear-gradient(135deg,#12100a 0%,#0c0a06 100%)",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 14px",
                background: "rgba(96,165,250,0.06)",
                borderBottom: `1px solid ${C.borderFaint}`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                />
                <rect
                  x="5"
                  y="4"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="6.5"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
                <rect
                  x="5"
                  y="9"
                  width="4"
                  height="1.5"
                  rx="0.5"
                  fill="#60a5fa"
                />
              </svg>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: "#60a5fa",
                  letterSpacing: "0.1em",
                }}
              >
                {ko ? "AI 수련 상대" : ja ? "AI練習相手" : "AI Practice"}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#60a5fa88",
                  background: "rgba(96,165,250,0.1)",
                  border: "1px solid rgba(96,165,250,0.3)",
                  borderRadius: 10,
                  padding: "1px 7px",
                }}
              >
                {ko
                  ? "패배 페널티 없음"
                  : ja
                    ? "敗北ペナルティなし"
                    : "No loss penalty"}
              </span>
            </div>

            <div style={{ padding: "10px 10px 12px" }}>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 10,
                  color: C.stoneFaint,
                  lineHeight: 1.5,
                  paddingLeft: 4,
                }}
              >
                {ko
                  ? "유저가 적을 때도 언제든 연습하세요. 승리 시 포인트를 획득합니다."
                  : ja
                    ? "いつでも練習できます。勝利でポイント獲得！"
                    : "Practice anytime. Win points for victories!"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {NPC_OPPONENTS.map((npc) => {
                  const t = TIERS[npc.tierIdx];
                  const onCd = isOnCooldown(npc.id);
                  const remMs = getRemainingMs(npc.id);
                  const can = tickets > 0 && myAtkSlots.some(Boolean) && !onCd;
                  const fmtCd = (ms: number) => {
                    const h = Math.floor(ms / 3600000),
                      m = Math.floor((ms % 3600000) / 60000),
                      s = Math.floor((ms % 60000) / 1000);
                    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                  };
                  return (
                    <div
                      key={npc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 10px",
                        background: `linear-gradient(90deg,${t.glow}10,transparent)`,
                        border: `1px solid ${onCd ? "#4b5563" : t.color + "33"}`,
                        borderRadius: 7,
                        transition: "border-color 0.15s",
                        opacity: onCd ? 0.65 : 1,
                      }}
                    >
                      {/* 티어 배지 */}
                      <div style={{ flexShrink: 0 }}>
                        <TierBadgeSvg idx={npc.tierIdx} size={28} />
                      </div>
                      {/* 덱 미리보기 */}
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {npc.slots.map((id, si) => {
                          const ch = charById(id);
                          const th = RARITY_THEME[ch.rarity as CharacterRarity];
                          return (
                            <div
                              key={si}
                              style={{
                                width: 30,
                                height: 30,
                                border: `1.5px solid ${th?.border ?? C.borderFaint}`,
                                borderRadius: 4,
                                background: th?.bg ?? "#0a0805",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: `0 0 5px ${th?.glow ?? "#000"}33`,
                              }}
                            >
                              <PixelSprite
                                type={ch.type as CharacterType}
                                rarity={ch.rarity as CharacterRarity}
                                size={22}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* 이름 + 설명 + 난이도 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 900,
                              color: onCd ? C.stoneFaint : t.color,
                            }}
                          >
                            {ko ? npc.nameKo : ja ? npc.nameJa : npc.nameEn}
                          </span>
                          <span style={{ display: "flex", gap: 1 }}>
                            {Array.from({ length: 5 }, (_, i) => (
                              <svg
                                key={i}
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                              >
                                <polygon
                                  points="5,1 6.2,3.8 9.5,4 7,6.2 7.8,9.5 5,7.8 2.2,9.5 3,6.2 0.5,4 3.8,3.8"
                                  fill={i < npc.stars ? "#fbbf24" : "#2e1f06"}
                                />
                              </svg>
                            ))}
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 9,
                            color: C.stoneFaint,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ko ? npc.descKo : ja ? npc.descJa : npc.descEn}
                        </p>
                      </div>
                      {/* 보상 + 도전 버튼 */}
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <p
                          style={{
                            margin: "0 0 4px",
                            fontSize: 10,
                            fontWeight: 900,
                            color: "#4ade80",
                            fontFamily: "monospace",
                          }}
                        >
                          +{npc.winPts}P
                        </p>
                        {onCd && remMs ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: "#0a0805",
                              border: `1px solid ${C.borderFaint}`,
                              borderRadius: 4,
                              padding: "4px 8px",
                            }}
                          >
                            <span style={{ fontSize: 9, color: C.stoneFaint }}>
                              {ko ? "재도전" : ja ? "再挑戦" : "CD"}
                            </span>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 10,
                                fontWeight: 900,
                                color: "#f87171",
                              }}
                            >
                              {fmtCd(remMs)}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => startNpcAttackConfirm(npc)}
                            disabled={!can}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              background: can
                                ? `linear-gradient(180deg,${t.color},${t.glow})`
                                : "#1e1508",
                              border: `1px solid ${can ? t.color : C.borderFaint}`,
                              color: can ? "#0c0903" : C.stoneFaint,
                              fontFamily: FONT,
                              fontSize: 10,
                              fontWeight: 900,
                              padding: "4px 11px",
                              borderRadius: 4,
                              cursor: can ? "pointer" : "not-allowed",
                              boxShadow: can ? `0 3px 0 ${t.glow}88` : "none",
                              transition: "all 0.15s",
                            }}
                          >
                            <Swords size={9} strokeWidth={2.5} />
                            {ko ? "도전" : ja ? "挑戦" : "Fight"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
