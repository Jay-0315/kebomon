import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Swords, ChevronLeft, ChevronRight, Crown, Gift,
  X, Plus, SkipForward, Ticket,
} from "lucide-react";
import { getStoredUser } from "../lib/auth";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName, type CharacterRarity, type CharacterType } from "../data/characters";
import { useLang } from "../context/LangContext";
import { api } from "../lib/api";

// ─── 시즌/티어 상수 (외부 컴포넌트에서 import함 — 유지 필수) ──────────────────
const SEASON = { number: 2, startDate: "2026-07-01", endDate: "2026-07-31" };

export const SEASON_BORDER_ID = (tierKey: string) => `s${SEASON.number}_${tierKey}`;
export const BORDER_STYLES: Record<string, { image: string }> = {
  s1_silver:     { image: "/silver.png" },    s1_gold:       { image: "/gold.png" },
  s1_platinum:   { image: "/platinum.png" },  s1_diamond:    { image: "/diamond.png" },
  s1_master:     { image: "/master.png" },    s1_challenger: { image: "/challenger.png" },
  s2_silver:     { image: "/silver.png" },    s2_gold:       { image: "/gold.png" },
  s2_platinum:   { image: "/platinum.png" },  s2_diamond:    { image: "/diamond.png" },
  s2_master:     { image: "/master.png" },    s2_challenger: { image: "/challenger.png" },
  gm:            { image: "/GM.png" },
};
export const BORDER_NAMES: Record<string, { ko: string; ja: string; en: string }> = {
  s1_silver:     { ko: "S1 실버",     ja: "S1シルバー",     en: "S1 Silver" },
  s1_gold:       { ko: "S1 골드",     ja: "S1ゴールド",     en: "S1 Gold" },
  s1_platinum:   { ko: "S1 플레티넘", ja: "S1プラチナ",     en: "S1 Platinum" },
  s1_diamond:    { ko: "S1 다이아몬드",ja: "S1ダイヤ",      en: "S1 Diamond" },
  s1_master:     { ko: "S1 마스터",   ja: "S1マスター",     en: "S1 Master" },
  s1_challenger: { ko: "S1 챌린저",   ja: "S1チャレンジャー",en: "S1 Challenger" },
  s2_silver:     { ko: "S2 실버",     ja: "S2シルバー",     en: "S2 Silver" },
  s2_gold:       { ko: "S2 골드",     ja: "S2ゴールド",     en: "S2 Gold" },
  s2_platinum:   { ko: "S2 플레티넘", ja: "S2プラチナ",     en: "S2 Platinum" },
  s2_diamond:    { ko: "S2 다이아몬드",ja: "S2ダイヤ",      en: "S2 Diamond" },
  s2_master:     { ko: "S2 마스터",   ja: "S2マスター",     en: "S2 Master" },
  s2_challenger: { ko: "S2 챌린저",   ja: "S2チャレンジャー",en: "S2 Challenger" },
  gm:            { ko: "GM",           ja: "GM",             en: "GM" },
};

// ─── 티어 ─────────────────────────────────────────────────────────────────────
const TIERS = [
  { key:"bronze",    ko:"브론즈",    ja:"ブロンズ",    en:"Bronze",    min:0,     color:"#cd7f32", glow:"#8B4513" },
  { key:"silver",    ko:"실버",      ja:"シルバー",    en:"Silver",    min:3000,  color:"#c0c0c0", glow:"#708090" },
  { key:"gold",      ko:"골드",      ja:"ゴールド",    en:"Gold",      min:6000,  color:"#ffd700", glow:"#b8860b" },
  { key:"platinum",  ko:"플레티넘",  ja:"プラチナ",    en:"Platinum",  min:9000,  color:"#40e0d0", glow:"#008b8b" },
  { key:"diamond",   ko:"다이아몬드",ja:"ダイヤモンド",en:"Diamond",   min:12000, color:"#b9f2ff", glow:"#4169e1" },
  { key:"master",    ko:"마스터",    ja:"マスター",    en:"Master",    min:15000, color:"#da70d6", glow:"#800080" },
  { key:"challenger",ko:"챌린저",    ja:"チャレンジャー",en:"Challenger",min:18000,color:"#ff4500", glow:"#8b0000" },
] as const;

const SEASON_REWARDS = [
  { tierKey:"challenger", ko:"챌린저",    ja:"チャレンジャー",en:"Challenger", minPts:18000, bonusPoints:6000, color:"#ff4500", glow:"#8b0000" },
  { tierKey:"master",     ko:"마스터",    ja:"マスター",     en:"Master",     minPts:15000, bonusPoints:4500, color:"#da70d6", glow:"#9400d3" },
  { tierKey:"diamond",    ko:"다이아몬드",ja:"ダイヤモンド",  en:"Diamond",    minPts:12000, bonusPoints:3000, color:"#b9f2ff", glow:"#4169e1" },
  { tierKey:"platinum",   ko:"플레티넘",  ja:"プラチナ",     en:"Platinum",   minPts:9000,  bonusPoints:2100, color:"#40e0d0", glow:"#008b8b" },
  { tierKey:"gold",       ko:"골드",      ja:"ゴールド",     en:"Gold",       minPts:6000,  bonusPoints:1500, color:"#ffd700", glow:"#b8860b" },
  { tierKey:"silver",     ko:"실버",      ja:"シルバー",     en:"Silver",     minPts:3000,  bonusPoints:900,  color:"#c0c0c0", glow:"#708090" },
] as const;

// ─── 스탯/직업 ────────────────────────────────────────────────────────────────

// ─── 색상 팔레트 ──────────────────────────────────────────────────────────────
const C = {
  bg:           "linear-gradient(180deg,#0c0905 0%,#1a1208 40%,#100d07 70%,#0a0805 100%)",
  panel:        "linear-gradient(135deg,#1e1508 0%,#120e06 100%)",
  panelDark:    "linear-gradient(135deg,#130f05 0%,#0c0903 100%)",
  border:       "#5a3d0e",
  borderFaint:  "#2e1f06",
  gold:         "#c8a44a",
  goldGlow:     "#8b6020",
  parchment:    "#e8d9b0",
  stone:        "#8b6f3a",
  stoneFaint:   "#4a3010",
  playerBg:     "linear-gradient(180deg,#061a30 0%,#040f1c 100%)",
  playerBorder: "#1e3a5f",
  enemyBg:      "linear-gradient(180deg,#1f0707 0%,#130404 100%)",
  enemyBorder:  "#4f0e0e",
};
const FONT = "'Noto Sans KR','Noto Sans JP',sans-serif";

const RARITY_THEME: Record<CharacterRarity, { color: string; glow: string; border: string; bg: string }> = {
  common:    { color:"#94a3b8", glow:"#64748b", border:"#475569", bg:"#0f172a" },
  uncommon:  { color:"#4ade80", glow:"#22c55e", border:"#15803d", bg:"#052e16" },
  rare:      { color:"#60a5fa", glow:"#3b82f6", border:"#1d4ed8", bg:"#082f49" },
  epic:      { color:"#c084fc", glow:"#a855f7", border:"#7e22ce", bg:"#2e1065" },
  legendary: { color:"#fbbf24", glow:"#f59e0b", border:"#b45309", bg:"#451a03" },
  mythic:    { color:"#f472b6", glow:"#ec4899", border:"#be185d", bg:"#500724" },
};

const RARITY_KO: Record<string,string> = { common:"커먼", uncommon:"언커먼", rare:"레어", epic:"에픽", legendary:"레전더리", mythic:"신화" };
const RARITY_JA: Record<string,string> = { common:"コモン", uncommon:"アンコモン", rare:"レア", epic:"エピック", legendary:"レジェンダリー", mythic:"ミシック" };
const RARITY_EN: Record<string,string> = { common:"Common", uncommon:"Uncommon", rare:"Rare", epic:"Epic", legendary:"Legendary", mythic:"Mythic" };

// ─── 콜로세움 스탯 계산 (서버 로직 미러) ────────────────────────────────────────
const ARENA_TYPE_ARCHETYPE: Record<string,string> = {
  wolf:"warrior", tiger:"warrior", lion:"warrior", bear:"warrior",
  cat:"rogue",    rabbit:"rogue",  deer:"rogue",   eagle:"rogue",
  ghost:"mage",   owl:"mage",      dragon:"mage",  angel:"mage",  phoenix:"mage",
  turtle:"tank",  elephant:"tank", whale:"tank",   crocodile:"tank", boar:"tank",
  plant:"nature", fish:"nature",   unicorn:"nature", horse:"nature",
  robot:"meka",   slime:"meka",    beetle:"meka",
  fox:"cursed",   monkey:"cursed", raven:"cursed", snake:"cursed", demon:"cursed",
};
const ARENA_RARITY_BASE: Record<string,{hp:number;atk:number;spd:number}> = {
  common:    {hp:80,  atk:10, spd:80  },
  uncommon:  {hp:90,  atk:12, spd:85  },
  rare:      {hp:100, atk:15, spd:90  },
  epic:      {hp:115, atk:19, spd:95  },
  legendary: {hp:130, atk:24, spd:100 },
  mythic:    {hp:150, atk:30, spd:110 },
};
const ARENA_ARCH_MULT: Record<string,{hp:number;atk:number;spd:number}> = {
  warrior:{hp:0.90,atk:1.30,spd:1.00}, tank:   {hp:1.50,atk:0.60,spd:0.75},
  mage:   {hp:0.80,atk:1.50,spd:1.00}, rogue:  {hp:0.85,atk:1.10,spd:1.40},
  nature: {hp:1.30,atk:0.75,spd:0.85}, meka:   {hp:1.10,atk:1.00,spd:1.10},
  cursed: {hp:0.80,atk:1.40,spd:1.10}, all:    {hp:1.00,atk:1.00,spd:1.00},
};
const ARENA_ENH_PER_LV: Record<string,{hp:number;atk:number;spd:number}> = {
  warrior:{hp:3,atk:5,spd:2}, tank:   {hp:6,atk:2,spd:1},
  mage:   {hp:2,atk:6,spd:1}, rogue:  {hp:2,atk:3,spd:5},
  nature: {hp:5,atk:2,spd:2}, meka:   {hp:3,atk:3,spd:3},
  cursed: {hp:2,atk:4,spd:4}, all:    {hp:3,atk:3,spd:3},
};
const ARENA_ARCH_SKILLS: Record<string,{basic:string;skill:string;ultimate:string}> = {
  warrior:{basic:"강타",        skill:"연격",        ultimate:"폭풍검"    },
  tank:   {basic:"방패 치기",   skill:"방어 태세",   ultimate:"철벽 방어" },
  mage:   {basic:"마법탄",      skill:"파이어볼",    ultimate:"메테오"    },
  rogue:  {basic:"단검 찌르기", skill:"연속 베기",   ultimate:"암살"      },
  nature: {basic:"넝쿨 채찍",   skill:"치유의 손길", ultimate:"대자연의 힘"},
  meka:   {basic:"레이저",      skill:"미사일",      ultimate:"에너지 캐논"},
  cursed: {basic:"저주 공격",   skill:"저주의 낙인", ultimate:"재앙 선포" },
  all:    {basic:"공격",        skill:"강화 공격",   ultimate:"전력 공격" },
};
const ARCH_LABEL_KO: Record<string,string> = {
  warrior:"전사", tank:"탱커", mage:"마법사", rogue:"도적",
  nature:"자연",  meka:"메카", cursed:"저주술사", all:"올라운더",
};
function calcArenaStat(charType: string, rarity: string, enhLevel = 0) {
  const arch = ARENA_TYPE_ARCHETYPE[charType] ?? "all";
  const base = ARENA_RARITY_BASE[rarity]   ?? ARENA_RARITY_BASE.common;
  const mult = ARENA_ARCH_MULT[arch]       ?? ARENA_ARCH_MULT.all;
  const enh  = ARENA_ENH_PER_LV[arch]     ?? ARENA_ENH_PER_LV.all;
  return {
    arch,
    hp:  Math.round(base.hp  * mult.hp  * (1 + enhLevel * enh.hp  / 100)),
    atk: Math.round(base.atk * mult.atk * (1 + enhLevel * enh.atk / 100)),
    spd: Math.round(base.spd * mult.spd * (1 + enhLevel * enh.spd / 100)),
    enhHp:  enhLevel > 0 ? Math.round(base.hp  * mult.hp  * (1 + (enhLevel-1) * enh.hp  / 100)) : null,
    enhAtk: enhLevel > 0 ? Math.round(base.atk * mult.atk * (1 + (enhLevel-1) * enh.atk / 100)) : null,
    enhSpd: enhLevel > 0 ? Math.round(base.spd * mult.spd * (1 + (enhLevel-1) * enh.spd / 100)) : null,
    skills: ARENA_ARCH_SKILLS[arch] ?? ARENA_ARCH_SKILLS.all,
    enhLevel,
    enh,
  };
}

// ─── NPC 대전 상대 정의 ───────────────────────────────────────────────────────
interface NpcOpponent {
  id:          string;
  nameKo:      string;
  nameJa:      string;
  nameEn:      string;
  tierIdx:     number;
  fakePts:     number;
  slots:       number[];   // 방어 덱 character IDs
  enhLvs:      number[];   // 각 캐릭터 강화 레벨
  stars:       number;     // 1~5 난이도
  winPts:      number;
  lossPts:     number;
  descKo:      string;
}

const NPC_OPPONENTS: NpcOpponent[] = [
  {
    id:"npc_1", nameKo:"브론즈 훈련병",     nameJa:"ブロンズ訓練兵",   nameEn:"Bronze Recruit",
    tierIdx:0, fakePts:400,
    slots:[4,7,8,9], enhLvs:[0,0,0,0], stars:1, winPts:50, lossPts:0,
    descKo:"기초 훈련 중인 새내기. 쉽게 이길 수 있다.",
  },
  {
    id:"npc_2", nameKo:"견습 수비대",        nameJa:"見習い守備隊",     nameEn:"Rookie Guard",
    tierIdx:0, fakePts:1000,
    slots:[5,6,11,12], enhLvs:[0,0,0,0], stars:1, winPts:60, lossPts:0,
    descKo:"균형 잡힌 입문자 편성. 무난한 상대.",
  },
  {
    id:"npc_3", nameKo:"실버 검사",          nameJa:"シルバー剣士",     nameEn:"Silver Swordsman",
    tierIdx:1, fakePts:3200,
    slots:[20,14,22,84], enhLvs:[0,0,0,0], stars:2, winPts:90, lossPts:0,
    descKo:"언커먼 캐릭터로 구성된 전투 베테랑.",
  },
  {
    id:"npc_4", nameKo:"저주의 술사",        nameJa:"呪いの術師",       nameEn:"Cursed Warlock",
    tierIdx:1, fakePts:4500,
    slots:[16,91,90,21], enhLvs:[1,1,0,0], stars:2, winPts:100, lossPts:0,
    descKo:"저주와 회피가 특기. 방심하면 위험하다.",
  },
  {
    id:"npc_5", nameKo:"골드 전사단",        nameJa:"ゴールド戦士団",   nameEn:"Gold Warriors",
    tierIdx:2, fakePts:7500,
    slots:[26,35,33,36], enhLvs:[2,2,1,1], stars:3, winPts:150, lossPts:0,
    descKo:"레어 등급 4인 균형 편성. 전략이 필요하다.",
  },
  {
    id:"npc_6", nameKo:"에픽 마법군단",      nameJa:"エピック魔法軍団", nameEn:"Epic Spellcasters",
    tierIdx:3, fakePts:9800,
    slots:[40,39,99,131], enhLvs:[2,2,3,2], stars:3, winPts:180, lossPts:0,
    descKo:"에픽 마법사와 도적의 연합. 화력이 강력하다.",
  },
  {
    id:"npc_7", nameKo:"레전더리 수호자",    nameJa:"レジェンダリー守護者",nameEn:"Legendary Guards",
    tierIdx:4, fakePts:13000,
    slots:[57,53,52,135], enhLvs:[3,3,3,4], stars:4, winPts:250, lossPts:-20,
    descKo:"레전더리 등급의 엘리트 부대. 쉽지 않은 상대.",
  },
  {
    id:"npc_8", nameKo:"황금 전설 부대",     nameJa:"黄金伝説部隊",    nameEn:"Golden Legends",
    tierIdx:4, fakePts:14500,
    slots:[137,154,191,216], enhLvs:[4,4,3,4], stars:4, winPts:280, lossPts:-30,
    descKo:"피닉스·드래곤·고래·말의 드림팀.",
  },
  {
    id:"npc_9", nameKo:"신화 챔피언",        nameJa:"ミシックチャンピオン",nameEn:"Mythic Champion",
    tierIdx:5, fakePts:16500,
    slots:[64,72,83,150], enhLvs:[5,5,5,5], stars:5, winPts:350, lossPts:-50,
    descKo:"신화 등급 최강자들의 집합. 승리하면 큰 보상.",
  },
  {
    id:"npc_10", nameKo:"무패의 챌린저",     nameJa:"無敗のチャレンジャー",nameEn:"Undefeated Challenger",
    tierIdx:6, fakePts:21000,
    slots:[158,204,208,235], enhLvs:[6,6,6,6], stars:5, winPts:500, lossPts:-100,
    descKo:"전설의 챌린저. 이기면 명예를, 지면 굴욕을.",
  },
];

// ─── NPC 쿨타임 ──────────────────────────────────────────────────────────────
const NPC_CD_MS  = 8 * 60 * 60 * 1000;
const NPC_CD_KEY = "col_npc_cd";

function useNpcCooldowns() {
  const [cds, setCds] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(NPC_CD_KEY) ?? "{}"); }
    catch { return {}; }
  });
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
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
    const exp  = Date.now() + NPC_CD_MS;
    const next = { ...cds, [npcId]: exp };
    setCds(next);
    localStorage.setItem(NPC_CD_KEY, JSON.stringify(next));
  };

  return { isOnCooldown, getRemainingMs, applyCooldown };
}

// ─── 입장권 ───────────────────────────────────────────────────────────────────
const MAX_TICKETS = 5;
const REGEN_MS    = 2 * 60 * 60 * 1000;
const TK_KEY      = "col_tickets";
const TK_REGEN    = "col_regen_base_ts";
const TK_DATE     = "col_reset_date";

function syncTickets() {
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(TK_DATE) !== today) {
    localStorage.setItem(TK_DATE, today);
    localStorage.setItem(TK_KEY, "5");
    localStorage.removeItem(TK_REGEN);
    return { tickets: 5, regenBase: null as number | null };
  }
  let t = parseInt(localStorage.getItem(TK_KEY) ?? "5", 10);
  if (isNaN(t) || t > 5) t = 5;
  const raw  = localStorage.getItem(TK_REGEN);
  let base   = raw ? parseInt(raw, 10) : null as number | null;
  if (base && t < MAX_TICKETS) {
    const earned = Math.floor((Date.now() - base) / REGEN_MS);
    if (earned > 0) {
      t    = Math.min(MAX_TICKETS, t + earned);
      base = base + earned * REGEN_MS;
      localStorage.setItem(TK_KEY, String(t));
      if (t >= MAX_TICKETS) { base = null; localStorage.removeItem(TK_REGEN); }
      else localStorage.setItem(TK_REGEN, String(base));
    }
  }
  return { tickets: t, regenBase: base };
}

function useTickets() {
  const [state, setState] = useState(() => syncTickets());
  const [msToNext, setMsToNext] = useState<number | null>(null);

  useEffect(() => {
    if (!state.regenBase || state.tickets >= MAX_TICKETS) { setMsToNext(null); return; }
    const tick = () => {
      const rem = state.regenBase! + REGEN_MS - Date.now();
      if (rem <= 0) setState(syncTickets()); else setMsToNext(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state.regenBase, state.tickets]);

  const consume = () => {
    const cur = syncTickets();
    if (cur.tickets <= 0) return false;
    const newT = cur.tickets - 1;
    const newB = cur.regenBase ?? Date.now();
    localStorage.setItem(TK_KEY, String(newT));
    if (newT < MAX_TICKETS) localStorage.setItem(TK_REGEN, String(newB));
    setState({ tickets: newT, regenBase: newB });
    return true;
  };

  const fmtMs = (ms: number) => {
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
  };

  return { ...state, msToNext, fmtMs, consume };
}

// ─── 티어 유틸 ────────────────────────────────────────────────────────────────
function getTierIdx(pts: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) if (pts >= TIERS[i].min) return i;
  return 0;
}

// ─── 캐릭터 유틸 ─────────────────────────────────────────────────────────────
const charById = (id: number) => CHARACTERS.find(c => c.id === id) ?? CHARACTERS[0];

// ─── 인터페이스 ───────────────────────────────────────────────────────────────
interface RankingEntry {
  rank: number; userId: string; nickname: string;
  tierPoints: number; wins: number; winStreak: number; characterId: number | null;
}
interface CharInfo {
  slot: number; charId: number; maxHp: number; atk: number; spd: number;
  rarity: string; archetype: string; charType: string;
}
interface HitDetail {
  targetTeam: "attacker" | "defender";
  targetSlot: number;
  damage:     number;
  healed:     number;
  hpAfter:    number;
  alive:      boolean;
}
interface BattleEvent {
  actorTeam:     "attacker" | "defender";
  actorSlot:     number;           // -1 = DoT 이벤트
  targetTeam:    "attacker" | "defender";
  targetSlot:    number;
  damage:        number;
  healed:        number;
  targetHpAfter: number;
  targetMaxHp:   number;
  targetAlive:   boolean;
  skillType:     "basic" | "skill" | "ultimate" | "dot";
  skillName:     string;
  hits:          HitDetail[];
  crs: Array<{ team: "attacker" | "defender"; slot: number; cr: number; alive: boolean }>;
}
interface BattleResult {
  won: boolean; pointsDelta: number; tierPoints: number;
  wins: number; losses: number; winStreak: number;
  log: BattleEvent[]; attackerChars: CharInfo[]; defenderChars: CharInfo[];
}
type Phase = "lobby" | "deck-edit" | "attack-confirm" | "battle" | "result";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700;900&display=swap');
@keyframes col-flame{0%,100%{transform:scaleX(1) scaleY(1)}30%{transform:scaleX(1.12) scaleY(0.9)}60%{transform:scaleX(0.9) scaleY(1.1)}}
@keyframes col-idle-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes col-dmg-up{0%{opacity:1;transform:translateY(0) scale(1.4)}100%{opacity:0;transform:translateY(-52px) scale(0.9)}}
@keyframes col-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(40) saturate(0)}20%{transform:translateX(-8px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(2px)}100%{transform:translateX(0);filter:brightness(1)}}
@keyframes col-win-in{0%{letter-spacing:0.6em;opacity:0}100%{letter-spacing:0.12em;opacity:1}}
@keyframes col-log-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes col-roll-in{0%{opacity:0;transform:scale(0.5) rotate(-12deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes col-active-glow{0%,100%{filter:drop-shadow(0 0 6px #c8a44a)}50%{filter:drop-shadow(0 0 18px #c8a44a)}}
@keyframes col-dead{to{filter:grayscale(1) brightness(0.3);opacity:0.4}}
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
`;

// ─── 픽셀 불꽃 / 횃불 ──────────────────────────────────────────────────────────
function PixelFlame({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{ animation:`col-flame 0.22s ease-in-out ${delay}s infinite`, transformOrigin:"bottom center", display:"inline-block" }}>
      <svg width="16" height="24" viewBox="0 0 4 6" style={{ imageRendering:"pixelated", display:"block" }}>
        <rect x="1" y="0" width="2" height="1" fill="#fff7ed"/>
        <rect x="1" y="1" width="2" height="1" fill="#fde68a"/>
        <rect x="0" y="2" width="4" height="1" fill="#fbbf24"/>
        <rect x="0" y="3" width="4" height="1" fill="#f97316"/>
        <rect x="1" y="4" width="2" height="1" fill="#ea580c"/>
        <rect x="1" y="5" width="2" height="1" fill="#92400e"/>
      </svg>
    </div>
  );
}
function Torch({ flip }: { flip?: boolean }) {
  return (
    <div style={{ transform: flip ? "scaleX(-1)" : undefined, display:"inline-flex", flexDirection:"column", alignItems:"center" }}>
      <PixelFlame delay={flip ? 0.07 : 0}/>
      <svg width="12" height="20" viewBox="0 0 3 5" style={{ imageRendering:"pixelated", display:"block" }}>
        <rect x="1" y="0" width="1" height="4" fill="#92400e"/>
        <rect x="0" y="3" width="3" height="1" fill="#78350f"/>
        <rect x="1" y="4" width="1" height="1" fill="#451a03"/>
      </svg>
    </div>
  );
}

// ─── 콜로세움 경기장 픽셀아트 ─────────────────────────────────────────────────
function ArenaFlag({ flip }: { flip?: boolean }) {
  return (
    <svg width="28" height="60" viewBox="0 0 7 15" style={{ imageRendering:"pixelated", display:"block", transform: flip ? "scaleX(-1)" : undefined }}>
      <rect x="3" y="0" width="1" height="15" fill="#6b3a0a"/>
      <rect x="2" y="0" width="1" height="15" fill="#7c4010"/>
      <rect x="2" y="0" width="2" height="1" fill="#c8a44a"/>
      <rect x="4" y="1" width="3" height="6" fill="#b45309"/>
      <rect x="4" y="1" width="3" height="1" fill="#d97706"/>
      <rect x="4" y="3" width="3" height="1" fill="#c8a44a" opacity="0.5"/>
      <rect x="5" y="5" width="2" height="1" fill="#c8a44a" opacity="0.3"/>
      <rect x="4" y="7" width="2" height="1" fill="#b45309"/>
      <rect x="4" y="8" width="1" height="1" fill="#b45309"/>
      <rect x="0" y="13" width="7" height="2" fill="#3a2008"/>
      <rect x="1" y="12" width="5" height="2" fill="#4a2c10"/>
    </svg>
  );
}
function ArenaGate() {
  return (
    <svg width="104" height="56" viewBox="0 0 26 14" style={{ imageRendering:"pixelated", display:"block", filter:"drop-shadow(0 0 8px #c8a44a2a)" }}>
      <rect x="0"  y="2" width="6" height="12" fill="#2a1608"/>
      <rect x="1"  y="2" width="4" height="12" fill="#3a2010"/>
      <rect x="0"  y="0" width="7" height="3"  fill="#4a2c14"/>
      <rect x="1"  y="0" width="5" height="1"  fill="#c8a44a" opacity="0.4"/>
      <rect x="20" y="2" width="6" height="12" fill="#2a1608"/>
      <rect x="21" y="2" width="4" height="12" fill="#3a2010"/>
      <rect x="19" y="0" width="7" height="3"  fill="#4a2c14"/>
      <rect x="20" y="0" width="5" height="1"  fill="#c8a44a" opacity="0.4"/>
      <rect x="6"  y="0" width="14" height="3" fill="#4a2c14"/>
      <rect x="5"  y="1" width="16" height="2" fill="#3a2010"/>
      <rect x="11" y="0" width="4"  height="1" fill="#c8a44a" opacity="0.5"/>
      <rect x="6"  y="3" width="14" height="11" fill="#0c0603"/>
      <rect x="7"  y="3" width="1"  height="10" fill="#2a1a08"/>
      <rect x="10" y="3" width="1"  height="10" fill="#2a1a08"/>
      <rect x="13" y="3" width="1"  height="10" fill="#2a1a08"/>
      <rect x="16" y="3" width="1"  height="10" fill="#2a1a08"/>
      <rect x="19" y="3" width="1"  height="10" fill="#2a1a08"/>
      <rect x="7"  y="7" width="13" height="1"  fill="#2a1a08"/>
      <rect x="8"  y="4" width="2"  height="3"  fill="#c8a44a" opacity="0.06"/>
      <rect x="11" y="4" width="2"  height="3"  fill="#c8a44a" opacity="0.06"/>
      <rect x="14" y="4" width="2"  height="3"  fill="#c8a44a" opacity="0.06"/>
      <rect x="17" y="4" width="2"  height="3"  fill="#c8a44a" opacity="0.06"/>
      <rect x="1"  y="5" width="1"  height="4"  fill="#c8a44a" opacity="0.2"/>
      <rect x="24" y="5" width="1"  height="4"  fill="#c8a44a" opacity="0.2"/>
    </svg>
  );
}

// ─── 작은 서브 컴포넌트들 ─────────────────────────────────────────────────────

function TierBadgeSvg({ idx, size = 44 }: { idx: number; size?: number }) {
  const t = TIERS[idx];
  const patterns = [
    [[1,1],[5,1],[2,2],[4,2],[1,2],[5,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[3,0],[2,1],[4,1],[1,2],[5,2],[2,3],[4,3],[3,4]],
    [[0,2],[2,0],[4,0],[6,2],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[1,4],[5,4]],
    [[3,0],[2,1],[4,1],[1,2],[5,2],[2,3],[4,3],[3,4],[2,5],[4,5]],
    [[2,0],[3,0],[4,0],[1,1],[5,1],[0,2],[6,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[3,0],[1,1],[5,1],[0,2],[2,2],[4,2],[6,2],[1,3],[5,3],[2,4],[4,4],[3,5]],
    [[2,0],[4,0],[0,1],[6,1],[1,2],[3,2],[5,2],[0,3],[2,3],[4,3],[6,3],[0,4],[6,4],[1,5],[5,5]],
  ];
  const px = size / 7;
  const dots = patterns[idx] ?? patterns[0];
  return (
    <svg width={size} height={size} viewBox="0 0 7 7"
      style={{ imageRendering:"pixelated", filter:`drop-shadow(0 0 ${px*0.5}px ${t.glow})` }}>
      {dots.map(([x,y],i) => <rect key={i} x={x} y={y} width={1} height={1} fill={t.color}/>)}
    </svg>
  );
}

function HpBar({ hp, maxHp, height = 6 }: { hp: number; maxHp: number; height?: number }) {
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
  const col  = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#facc15" : "#f87171";
  const glow = pct > 0.5 ? "#22c55e" : "#ef4444";
  return (
    <div style={{ position:"relative", height, background:"#050a05", border:"1px solid #0a150a", borderRadius:3, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:"0 auto 0 0", width:`${pct*100}%`, background:`linear-gradient(180deg,${col}cc,${col})`, boxShadow:`0 0 8px ${glow}55`, borderRadius:3, transition:"width 0.45s cubic-bezier(0.25,0.8,0.25,1),background 0.4s" }}/>
      <div style={{ position:"absolute", top:0, left:0, right:`${(1-pct)*100}%`, height:"45%", background:"rgba(255,255,255,0.2)", borderRadius:"3px 3px 0 0", transition:"right 0.45s cubic-bezier(0.25,0.8,0.25,1)", pointerEvents:"none" }}/>
      {flash && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.5)", animation:"col-hp-flash 0.45s ease-out forwards", pointerEvents:"none" }}/>}
    </div>
  );
}

// ─── 덱 슬롯 카드 ─────────────────────────────────────────────────────────────
function DeckSlotCard({
  charId, onRemove, small = false,
}: { charId: number | null; onRemove?: () => void; small?: boolean }) {
  const size = small ? 36 : 52;
  if (!charId) return (
    <div style={{
      width: size+16, height: size+16, border:`2px dashed ${C.borderFaint}`, borderRadius:6,
      display:"flex", alignItems:"center", justifyContent:"center", color:C.stoneFaint, flexShrink:0,
    }}>
      <Plus size={16} color={C.stoneFaint}/>
    </div>
  );
  const char = charById(charId);
  return (
    <div style={{
      position:"relative", width:size+16, height:size+16, flexShrink:0,
      border:`2px solid ${RARITY_THEME[char.rarity as CharacterRarity]?.border ?? C.border}`,
      borderRadius:6, background:RARITY_THEME[char.rarity as CharacterRarity]?.bg ?? "#0a0805", overflow:"visible",
      boxShadow:`0 0 12px ${RARITY_THEME[char.rarity as CharacterRarity]?.glow ?? C.border}44`,
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
        <PixelSprite type={char.type as CharacterType} rarity={char.rarity as CharacterRarity} size={size}/>
      </div>
      {onRemove && (
        <button onClick={onRemove} style={{
          position:"absolute", top:-6, right:-6, width:16, height:16, borderRadius:"50%",
          background:"#dc2626", border:"none", cursor:"pointer", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:2,
        }}>
          <X size={10} color="#fff"/>
        </button>
      )}
    </div>
  );
}

// ─── 속도바 (좌측 사이드바, 배틀 중) ─────────────────────────────────────────
function SpeedBar({
  attackerChars, defenderChars, crs, activeActor,
}: {
  attackerChars: CharInfo[];
  defenderChars: CharInfo[];
  crs: Array<{ team: "attacker" | "defender"; slot: number; cr: number; alive: boolean }>;
  activeActor: { team: "attacker" | "defender"; slot: number } | null;
}) {
  const sorted = [...crs].sort((a, b) => b.cr - a.cr);
  return (
    <div style={{
      width: 100, flexShrink:0, display:"flex", flexDirection:"column", gap:4,
      padding:"8px 6px", background:"#0a0805", border:`1px solid ${C.borderFaint}`,
      borderRadius:6, overflowY:"auto",
    }}>
      <p style={{ fontFamily:FONT, fontSize:9, color:C.stoneFaint, textAlign:"center", margin:"0 0 4px", letterSpacing:"0.1em" }}>
        속도 순서
      </p>
      {sorted.map(u => {
        const chars = u.team === "attacker" ? attackerChars : defenderChars;
        const info  = chars.find(c => c.slot === u.slot);
        if (!info) return null;
        const char   = charById(info.charId);
        const isAtk  = u.team === "attacker";
        const isAct  = activeActor?.team === u.team && activeActor?.slot === u.slot;
        const accent = isAtk ? "#60a5fa" : "#f87171";
        return (
          <div key={`${u.team}-${u.slot}`} style={{
            display:"flex", flexDirection:"column", gap:2, padding:"4px 4px",
            borderRadius:4, border:`1px solid ${isAct ? accent : "transparent"}`,
            background: isAct ? `${accent}18` : "transparent",
            opacity: u.alive ? 1 : 0.3,
            transition:"all 0.25s",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ flexShrink:0, width:20, height:20 }}>
                <PixelSprite type={char.type as CharacterType} rarity={char.rarity as CharacterRarity} size={20}/>
              </div>
              <span style={{ fontFamily:"monospace", fontSize:9, color: accent, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {isAtk ? "아군" : "적군"}{u.slot+1}
              </span>
              <span style={{ fontFamily:"monospace", fontSize:8, color:C.stoneFaint }}>{u.cr}%</span>
            </div>
            <div style={{ height:3, background:"#1a1208", borderRadius:1, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${u.cr}%`, background: accent, transition:"width 0.3s", borderRadius:1 }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 유닛 카드 (배틀 필드) ────────────────────────────────────────────────────
function UnitCard({
  info, hp, isActive, isHit, isDead, isPlayer,
}: {
  info: CharInfo; hp: number; isActive: boolean; isHit: boolean; isDead: boolean; isPlayer: boolean;
}) {
  const char   = charById(info.charId);
  const accent = isPlayer ? "#60a5fa" : "#f87171";
  const th     = RARITY_THEME[info.rarity as CharacterRarity] ?? RARITY_THEME.common;
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", gap:3, width:68,
      opacity: isDead ? 0.3 : 1,
      animation: isDead ? "col-dead 0.5s forwards" : isHit ? "col-hit 0.4s ease-out" : undefined,
      transition:"opacity 0.3s",
    }}>
      {/* 캐릭터 카드 프레임 */}
      <div style={{
        position:"relative", width:60, height:60,
        background: isActive ? `radial-gradient(circle at 50% 60%, ${accent}22 0%, transparent 70%)` : `radial-gradient(circle at 50% 60%, ${th.color}11 0%, transparent 70%)`,
        border: `1px solid ${isActive ? accent : th.border}55`,
        borderRadius:8,
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow: isActive ? `0 0 16px ${accent}55, inset 0 0 12px ${accent}22` : `0 0 6px ${th.glow}33`,
        transition:"all 0.3s",
        overflow:"visible",
      }}>
        {/* 활성 코너 데코 */}
        {isActive && <>
          <div style={{ position:"absolute", top:1, left:1, width:6, height:6, borderTop:`2px solid ${accent}`, borderLeft:`2px solid ${accent}`, borderRadius:"2px 0 0 0", animation:"col-corner-glow 1s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", top:1, right:1, width:6, height:6, borderTop:`2px solid ${accent}`, borderRight:`2px solid ${accent}`, borderRadius:"0 2px 0 0", animation:"col-corner-glow 1s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", bottom:1, left:1, width:6, height:6, borderBottom:`2px solid ${accent}`, borderLeft:`2px solid ${accent}`, borderRadius:"0 0 0 2px", animation:"col-corner-glow 1s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", bottom:1, right:1, width:6, height:6, borderBottom:`2px solid ${accent}`, borderRight:`2px solid ${accent}`, borderRadius:"0 0 2px 0", animation:"col-corner-glow 1s ease-in-out infinite" }}/>
        </>}
        <div style={{
          animation: isDead ? undefined : isActive ? "col-active-glow 1s ease-in-out infinite" : "col-idle-bob 3s ease-in-out infinite",
          filter: isActive ? `drop-shadow(0 0 8px ${accent})` : `drop-shadow(0 0 4px ${th.glow}88)`,
        }}>
          <PixelSprite type={char.type as CharacterType} rarity={char.rarity as CharacterRarity} size={46}/>
        </div>
        {/* 사망 X 오버레이 */}
        {isDead && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", borderRadius:8 }}>
            <span style={{ fontFamily:"monospace", fontSize:20, fontWeight:900, color:"#f87171", textShadow:"0 0 12px #ef4444" }}>✕</span>
          </div>
        )}
      </div>

      {/* 플랫폼 글로우 */}
      <div style={{
        width:48, height:6, borderRadius:"50%",
        background:`radial-gradient(ellipse 100% 100% at 50% 50%, ${isActive ? accent : th.glow}66, transparent)`,
        animation:"col-ptf 2s ease-in-out infinite",
        marginTop:-4, marginBottom:1,
        pointerEvents:"none",
      }}/>

      <HpBar hp={hp} maxHp={info.maxHp} height={5}/>
      <span style={{ fontFamily:"monospace", fontSize:9, color: isDead ? "#4b5563" : accent, fontWeight:900 }}>
        {hp}/{info.maxHp}
      </span>
    </div>
  );
}

// ─── 시즌 보상 모달 ───────────────────────────────────────────────────────────
function SeasonRewardModal({ onClose, ko, ja, myPts }: { onClose:()=>void; ko:boolean; ja:boolean; myPts:number }) {
  const myIdx = SEASON_REWARDS.findIndex(r => myPts >= r.minPts);
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div style={{ background:"linear-gradient(135deg,#1e1508 0%,#120e06 100%)",border:"2px solid #5a3d0e",borderRadius:10,padding:"24px 20px",width:"min(480px,94vw)",boxShadow:"0 0 40px rgba(200,164,74,0.3)",fontFamily:FONT,position:"relative" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <Gift size={18} color="#c8a44a"/>
            <div>
              <p style={{ margin:0,fontSize:16,fontWeight:900,color:"#c8a44a" }}>{ko?`시즌 ${SEASON.number} 보상`:ja?`シーズン${SEASON.number}報酬`:`Season ${SEASON.number} Rewards`}</p>
              <p style={{ margin:0,fontSize:11,color:"#8b6f3a" }}>{SEASON.startDate} ~ {SEASON.endDate}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",padding:4 }}><X size={18} color="#8b6f3a"/></button>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
          {SEASON_REWARDS.map((r,i)=>{
            const isMine=i===myIdx, isAbove=myPts>=r.minPts, borCnt=SEASON_REWARDS.length-i;
            return (
              <div key={r.tierKey} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:6,border:`1px solid ${isMine?"#c8a44a":isAbove?"#5a3d0e22":"#2e1f06"}`,background:isMine?"rgba(200,164,74,0.08)":isAbove?"rgba(255,255,255,0.02)":"transparent",opacity:isAbove?1:0.6 }}>
                <img src={`/${r.tierKey}.png`} alt={ko?r.ko:ja?r.ja:r.en} style={{ width:44,height:44,objectFit:"contain",flexShrink:0 }}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ margin:0,fontSize:13,fontWeight:900,color:r.color,filter:`drop-shadow(0 0 4px ${r.glow})` }}>{ko?r.ko:ja?r.ja:r.en}</p>
                  <p style={{ margin:0,fontSize:10,color:"#8b6f3a" }}>{r.minPts.toLocaleString()} pts {ko?"이상":ja?"以上":"& above"}</p>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <p style={{ margin:0,fontSize:12,fontWeight:900,color:"#4ade80" }}>+{r.bonusPoints.toLocaleString()}P</p>
                  <p style={{ margin:0,fontSize:10,color:"#8b6f3a" }}>{ko?`테두리 ${borCnt}종`:ja?`枠${borCnt}種`:`${borCnt} border${borCnt>1?"s":""}`}</p>
                </div>
              </div>
            );
          })}
        </div>
        {myPts>0&&<p style={{ margin:"14px 0 0",fontSize:11,color:"#c8a44a",textAlign:"center" }}>
          {ko?`현재 ${myPts.toLocaleString()} pts · ${myIdx>=0?SEASON_REWARDS[myIdx].ko:"미달성"} 보상 예정`:ja?`現在 ${myPts.toLocaleString()} pts · ${myIdx>=0?SEASON_REWARDS[myIdx].ja:"未達成"}報酬予定`:`Currently ${myPts.toLocaleString()} pts · ${myIdx>=0?SEASON_REWARDS[myIdx].en:"Not yet achieved"} reward expected`}
        </p>}
      </div>
    </div>
  );
}

// ─── 픽셀 버튼 ────────────────────────────────────────────────────────────────
function PixelBtn({ onClick, disabled, children, color="amber" }: { onClick:()=>void; disabled?:boolean; children:React.ReactNode; color?:"amber"|"gray"|"red"|"blue" }) {
  const ref = useRef<HTMLButtonElement>(null);
  const st = {
    amber:{ bg:"linear-gradient(180deg,#c8a44a 0%,#8b6020 100%)", border:"#5a3d0e", shadow:"#3a2508", text:"#1c1101" },
    gray: { bg:"linear-gradient(180deg,#64748b 0%,#475569 100%)", border:"#1e293b", shadow:"#0f172a", text:"#e2e8f0" },
    red:  { bg:"linear-gradient(180deg,#f87171 0%,#dc2626 100%)", border:"#7f1d1d", shadow:"#450a0a", text:"#fff5f5" },
    blue: { bg:"linear-gradient(180deg,#60a5fa 0%,#2563eb 100%)", border:"#1e3a5f", shadow:"#082f49", text:"#fff" },
  }[color];
  const press   = () => { if (!ref.current||disabled) return; ref.current.style.boxShadow=`0 2px 0 ${st.shadow}`; ref.current.style.transform="translateY(4px)"; };
  const release = () => { if (!ref.current) return; ref.current.style.boxShadow=`0 6px 0 ${st.shadow}`; ref.current.style.transform=""; };
  return (
    <button ref={ref} onClick={onClick} disabled={disabled} onPointerDown={press} onPointerUp={release} onPointerLeave={release}
      style={{ background:disabled?"linear-gradient(180deg,#374151 0%,#1f2937 100%)":st.bg, border:`3px solid ${disabled?"#111827":st.border}`, boxShadow:disabled?`0 3px 0 #111827`:`0 6px 0 ${st.shadow}`, color:disabled?"#6b7280":st.text, fontWeight:900, fontSize:16, letterSpacing:"0.04em", padding:"12px 28px", borderRadius:4, cursor:disabled?"not-allowed":"pointer", transition:"box-shadow 0.06s,transform 0.06s", width:"100%", fontFamily:FONT, userSelect:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
      {children}
    </button>
  );
}

// ─── 스탯 툴팁 ────────────────────────────────────────────────────────────────
function StatTooltip({
  charId, charType, rarity, enhLevel, ko, ja,
  anchorRect,
}: {
  charId: number; charType: string; rarity: string; enhLevel: number;
  ko: boolean; ja: boolean; anchorRect: DOMRect;
}) {
  const s  = calcArenaStat(charType, rarity, enhLevel);
  const th = RARITY_THEME[rarity as CharacterRarity] ?? RARITY_THEME.common;
  const char = charById(charId);

  // 툴팁 너비 280px, 화면 안에서 좌우 조정
  const tipW = 256;
  let left = anchorRect.left + anchorRect.width / 2 - tipW / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
  // 위에 공간이 충분하면 위에, 아니면 아래에
  const spaceAbove = anchorRect.top;
  const top = spaceAbove > 200
    ? anchorRect.top - 8   // 위쪽에 붙임 (translateY(-100%))
    : anchorRect.bottom + 8; // 아래쪽

  const statRow = (label: string, val: number, prev: number | null, color: string) => (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <span style={{ fontSize:10, color:C.stoneFaint, width:28, flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:4, background:"#0a0703", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.min(100, val / 2)}%`, background:color, borderRadius:2, transition:"width 0.3s" }}/>
      </div>
      <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:900, color, width:34, textAlign:"right" }}>{val}</span>
      {prev !== null && val !== prev && (
        <span style={{ fontFamily:"monospace", fontSize:9, color:"#4ade80" }}>+{val-prev}</span>
      )}
    </div>
  );

  return (
    <div style={{
      position:"fixed",
      left, top,
      transform: spaceAbove > 200 ? "translateY(-100%)" : undefined,
      width: tipW,
      zIndex: 9999,
      background:"linear-gradient(135deg,#1e1508 0%,#0c0903 100%)",
      border:`2px solid ${th.border}`,
      borderRadius:8,
      boxShadow:`0 0 24px ${th.glow}55, 0 8px 32px rgba(0,0,0,0.8)`,
      padding:"12px 14px",
      pointerEvents:"none",
      fontFamily:FONT,
    }}>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, paddingBottom:8, borderBottom:`1px solid ${C.borderFaint}` }}>
        <PixelSprite type={char.type as CharacterType} rarity={char.rarity as CharacterRarity} size={32}/>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:12, fontWeight:900, color:th.color, textShadow:`0 0 8px ${th.glow}`, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {getCharName(char, ko?"ko":ja?"ja":"en")}
          </p>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
            <span style={{ fontSize:9, color:th.color, background:`${th.color}18`, border:`1px solid ${th.border}`, borderRadius:3, padding:"1px 5px", fontWeight:700 }}>
              {ko?RARITY_KO[rarity]:ja?RARITY_JA[rarity]:RARITY_EN[rarity]}
            </span>
            <span style={{ fontSize:9, color:"#94a3b8", background:"#1e293b", border:"1px solid #334155", borderRadius:3, padding:"1px 5px", fontWeight:700 }}>
              {ARCH_LABEL_KO[s.arch]}
            </span>
            {enhLevel > 0 && (
              <span style={{ fontSize:9, color:"#60a5fa", background:"#1e3a5f", border:"1px solid #2563eb", borderRadius:3, padding:"1px 5px", fontWeight:900 }}>
                +{enhLevel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 스탯 바 */}
      <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:10 }}>
        {statRow("HP",  s.hp,  s.enhHp,  "#4ade80")}
        {statRow("ATK", s.atk, s.enhAtk, "#f87171")}
        {statRow("SPD", s.spd, s.enhSpd, "#60a5fa")}
      </div>

      {/* 스킬 목록 */}
      <div style={{ borderTop:`1px solid ${C.borderFaint}`, paddingTop:8, display:"flex", flexDirection:"column", gap:4 }}>
        {[
          { label:"평타",   name:s.skills.basic,    color:"#94a3b8", cd:"--" },
          { label:"스킬",   name:s.skills.skill,    color:"#60a5fa", cd:"3턴" },
          { label:"궁극기", name:s.skills.ultimate, color:"#ffd700", cd:"5턴" },
        ].map(sk => (
          <div key={sk.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:8, fontWeight:900, color:sk.color, background:`${sk.color}18`, border:`1px solid ${sk.color}44`, borderRadius:3, padding:"1px 5px", width:36, textAlign:"center", flexShrink:0 }}>{sk.label}</span>
            <span style={{ fontSize:11, fontWeight:700, color:C.parchment, flex:1 }}>{sk.name}</span>
            <span style={{ fontSize:9, color:C.stoneFaint, fontFamily:"monospace" }}>{sk.cd}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 덱 편집 화면 ─────────────────────────────────────────────────────────────
function DeckEditor({
  deckType, currentSlots, ownedIds, onSave, onBack, ko, ja, charEnhancements,
}: {
  deckType: "attack" | "defense";
  currentSlots: number[];
  ownedIds: number[];
  onSave: (slots: number[]) => void;
  onBack: () => void;
  ko: boolean; ja: boolean;
  charEnhancements: Record<number, number>;
}) {
  const [slots, setSlots]       = useState<number[]>(currentSlots);
  const [tooltipInfo, setTooltipInfo] = useState<{ charId: number; rect: DOMRect } | null>(null);

  const addChar = (id: number) => {
    if (slots.includes(id) || slots.length >= 4) return;
    setSlots(p => [...p, id]);
  };
  const removeSlot = (idx: number) => setSlots(p => p.filter((_,i) => i !== idx));

  const ownedChars = ownedIds
    .map(id => charById(id))
    .sort((a,b) => {
      const order = ["mythic","legendary","epic","rare","uncommon","common"];
      return order.indexOf(a.rarity) - order.indexOf(b.rarity);
    });

  const typeLabel = deckType === "attack"
    ? (ko?"공격 덱":ja?"攻撃デッキ":"Attack Deck")
    : (ko?"방어 덱":ja?"防御デッキ":"Defense Deck");

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT, padding:"16px 16px 40px" }}>
      <style>{CSS}</style>
      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:C.stone }}>
          <ChevronLeft size={22} color={C.stone}/>
        </button>
        <h2 style={{ margin:0, color:C.gold, fontSize:18, fontWeight:900, letterSpacing:"0.1em" }}>{typeLabel} {ko?"편집":ja?"編集":"Edit"}</h2>
        <div style={{ marginLeft:"auto" }}>
          <button onClick={() => onSave(slots)}
            style={{ background:"linear-gradient(180deg,#c8a44a,#8b6020)", border:"2px solid #5a3d0e", color:"#1c1101", fontWeight:900, fontSize:13, padding:"8px 20px", borderRadius:4, cursor:"pointer", fontFamily:FONT }}>
            {ko?"저장":ja?"保存":"Save"}
          </button>
        </div>
      </div>

      {/* 현재 덱 슬롯 */}
      <div style={{ background:"linear-gradient(135deg,#1e1508,#120e06)", border:`2px solid ${C.border}`, borderRadius:8, padding:"14px 12px", marginBottom:14 }}>
        <p style={{ margin:"0 0 10px", fontSize:11, color:C.stone, letterSpacing:"0.12em" }}>
          {ko?"현재 덱":ja?"現在のデッキ":"Current Deck"} ({slots.length}/4)
        </p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <DeckSlotCard key={i} charId={slots[i] ?? null} onRemove={slots[i] ? () => removeSlot(i) : undefined}/>
          ))}
        </div>
      </div>

      {/* 캐릭터 선택 그리드 */}
      <p style={{ margin:"0 0 8px", fontSize:11, color:C.stone, letterSpacing:"0.1em" }}>
        {ko?"보유 캐릭터":ja?"所持キャラクター":"Owned Characters"}
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(72px,1fr))", gap:8 }}>
        {ownedChars.map(char => {
          const inDeck  = slots.includes(char.id);
          const isFull  = slots.length >= 4;
          const th      = RARITY_THEME[char.rarity as CharacterRarity];
          return (
            <button key={char.id}
              onClick={() => inDeck ? setSlots(p => p.filter(x => x !== char.id)) : addChar(char.id)}
              disabled={!inDeck && isFull}
              onMouseEnter={e => setTooltipInfo({ charId: char.id, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
              onMouseLeave={() => setTooltipInfo(null)}
              style={{ background: inDeck ? `${th?.color}22` : "#0a0805", border:`2px solid ${inDeck ? th?.color : th?.border}`, borderRadius:6, padding:"8px 4px", cursor:(!inDeck && isFull)?"not-allowed":"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, opacity:(!inDeck && isFull)?0.4:1, position:"relative" }}>
              <PixelSprite type={char.type as CharacterType} rarity={char.rarity as CharacterRarity} size={40}/>
              <span style={{ fontSize:9, color:th?.color, fontWeight:700, textAlign:"center", lineHeight:1.2, wordBreak:"break-all" }}>
                {getCharName(char, "ko")}
              </span>
              <span style={{ fontSize:8, color:th?.color, opacity:0.7, textAlign:"center" }}>
                {ko ? RARITY_KO[char.rarity] : ja ? RARITY_JA[char.rarity] : RARITY_EN[char.rarity]}
              </span>
              {inDeck && <div style={{ position:"absolute", top:2, right:2, width:12, height:12, background:"#4ade80", borderRadius:"50%", border:"1px solid #052e16" }}/>}
            </button>
          );
        })}
      </div>

      {/* 스탯 툴팁 */}
      {tooltipInfo && (() => {
        const c = charById(tooltipInfo.charId);
        const enh = charEnhancements[tooltipInfo.charId] ?? 0;
        return (
          <StatTooltip
            charId={tooltipInfo.charId}
            charType={c.type}
            rarity={c.rarity}
            enhLevel={enh}
            ko={ko} ja={ja}
            anchorRect={tooltipInfo.rect}
          />
        );
      })()}
    </div>
  );
}

// ─── 직업별 궁극기 연출 색상 ──────────────────────────────────────────────────
const ARCHETYPE_ULT_COLOR: Record<string, { main: string; sub: string; label: string }> = {
  warrior: { main:"#f87171", sub:"#7f1d1d",  label:"전사의 분노" },
  tank:    { main:"#60a5fa", sub:"#1e3a8a",  label:"철벽 의지" },
  mage:    { main:"#c084fc", sub:"#4c1d95",  label:"마력 폭발" },
  rogue:   { main:"#4ade80", sub:"#14532d",  label:"그림자 강습" },
  nature:  { main:"#86efac", sub:"#14532d",  label:"대자연의 숨결" },
  meka:    { main:"#94a3b8", sub:"#0f172a",  label:"기계 포격" },
  cursed:  { main:"#f472b6", sub:"#500724",  label:"저주의 발현" },
  all:     { main:"#ffd700", sub:"#713f12",  label:"필살 개방" },
};

// ─── 궁극기 연출 오버레이 ─────────────────────────────────────────────────────
function UltimateAnim({
  skillName, archetype, actorTeam, charId, onEnd,
}: {
  skillName: string;
  archetype: string;
  actorTeam: "attacker" | "defender";
  charId?: number;
  onEnd: () => void;
}) {
  const pal  = ARCHETYPE_ULT_COLOR[archetype] ?? ARCHETYPE_ULT_COLOR.all;
  const col  = pal.main;
  const dark = pal.sub;
  const actor = charId != null ? charById(charId) : null;

  useEffect(() => {
    const t = setTimeout(onEnd, 1600);
    return () => clearTimeout(t);
  }, [onEnd]);

  // 파티클 좌표 (정적 생성)
  const particles = Array.from({ length: 16 }, (_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const dist  = 70 + (i % 3) * 35;
    return {
      dx: Math.round(Math.cos(angle) * dist),
      dy: Math.round(Math.sin(angle) * dist),
      delay: `${(i * 0.03).toFixed(2)}s`,
      size: 4 + (i % 4) * 2,
    };
  });

  const slashLines = [
    { top:"28%", delay:"0s",   h:3 },
    { top:"47%", delay:"0.05s",h:2 },
    { top:"52%", delay:"0.08s",h:2 },
    { top:"72%", delay:"0.04s",h:3 },
  ];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9000,
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden", pointerEvents:"none",
    }}>
      {/* 배경 그라데이션 페이드인/아웃 */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse 80% 60% at 50% 50%, ${dark}ee 0%, rgba(0,0,0,0.97) 70%)`,
        animation:"ult-vignette 1.6s ease-in-out forwards",
        opacity:0,
      }}/>

      {/* 확장 링 (3겹) */}
      {[0, 180, 380].map((ms, i) => (
        <div key={i} style={{
          position:"absolute",
          width:160, height:160,
          border:`${i===0?3:2}px solid ${col}`,
          borderRadius:"50%",
          opacity:0,
          animation:`ult-ring 1.0s ease-out ${ms}ms forwards`,
          boxShadow:`0 0 20px ${col}66`,
        }}/>
      ))}

      {/* 대각선 광선들 */}
      {slashLines.map((s, i) => (
        <div key={i} style={{
          position:"absolute",
          top: s.top, left:"-5%",
          width:"110%", height:s.h,
          background:`linear-gradient(90deg, transparent 0%, ${col}99 30%, ${col} 50%, ${col}99 70%, transparent 100%)`,
          transform:"skewX(-18deg)",
          opacity:0,
          animation:`ult-slash 0.55s ease-out ${s.delay} forwards`,
          boxShadow:`0 0 14px ${col}88`,
        }}/>
      ))}

      {/* 파티클 */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position:"absolute",
          width:p.size, height:p.size,
          borderRadius:"50%",
          background:col,
          boxShadow:`0 0 ${p.size * 2}px ${col}`,
          opacity:0,
          animation:`ult-particle 0.75s ease-out ${p.delay} forwards`,
          // @ts-ignore
          "--dx":`${p.dx}px`,
          "--dy":`${p.dy}px`,
        } as React.CSSProperties}/>
      ))}

      {/* 텍스트 중앙 */}
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"0 24px" }}>
        {/* 캐릭터 스프라이트 */}
        {actor && (
          <div style={{
            display:"flex", justifyContent:"center", marginBottom:12,
            animation:"ult-sub 0.4s ease-out 0.1s both", opacity:0,
          }}>
            <div style={{
              padding:10, borderRadius:"50%",
              background:`radial-gradient(circle, ${col}33 0%, transparent 70%)`,
              boxShadow:`0 0 32px ${col}66`,
              animation:"col-idle-bob 2s ease-in-out infinite",
            }}>
              <PixelSprite type={actor.type as CharacterType} rarity={actor.rarity as CharacterRarity} size={72}/>
            </div>
          </div>
        )}
        {/* 팀 + 직업 라벨 */}
        <p style={{
          fontFamily:"'Courier New',monospace",
          fontSize:10, fontWeight:900,
          letterSpacing:"0.55em",
          color:`${col}cc`,
          margin:"0 0 10px",
          textTransform:"uppercase",
          animation:"ult-sub 0.4s ease-out 0.18s both",
          opacity:0,
        }}>
          {actorTeam === "attacker" ? "[ 공격팀 ]" : "[ 방어팀 ]"}&nbsp;&nbsp;{pal.label}
        </p>

        {/* 궁극기 레이블 */}
        <p style={{
          fontFamily:FONT, fontSize:11, fontWeight:900,
          letterSpacing:"0.35em", color:col,
          margin:"0 0 6px",
          animation:"ult-sub 0.35s ease-out 0.25s both",
          opacity:0,
        }}>
          ── 궁극기 ──
        </p>

        {/* 스킬 이름 */}
        <p style={{
          fontFamily:FONT, fontSize:46, fontWeight:900,
          color:"#fff",
          margin:"0 0 6px",
          letterSpacing:"0.04em",
          textShadow:`0 0 18px ${col}, 0 0 40px ${col}, 0 0 80px ${col}66, 2px 2px 0 ${dark}`,
          animation:"ult-title 0.55s cubic-bezier(0.175,0.885,0.32,1.275) 0.3s both",
          opacity:0,
          lineHeight:1.1,
        }}>
          {skillName}
        </p>

        {/* 하단 글로우 라인 */}
        <div style={{
          height:3, borderRadius:2,
          background:`linear-gradient(90deg, transparent, ${col}, transparent)`,
          boxShadow:`0 0 14px ${col}`,
          margin:"10px auto 0",
          opacity:0,
          animation:`ult-line-grow 0.6s ease-out 0.55s both`,
          maxWidth:280,
        }}/>
      </div>

      {/* 임팩트 플래시 */}
      <div style={{
        position:"absolute", inset:0,
        background:`radial-gradient(ellipse at center, ${col}88 0%, transparent 70%)`,
        opacity:0,
        animation:`ult-flash 0.45s ease-out 0.65s forwards`,
        zIndex:2,
      }}/>
    </div>
  );
}

// ─── 스킬 타입 색상 ───────────────────────────────────────────────────────────
const SKILL_COLOR: Record<string, string> = {
  basic: "#e2e8f0", skill: "#60a5fa", ultimate: "#ffd700", dot: "#c084fc",
};
const SKILL_LABEL: Record<string, string> = {
  basic: "평타", skill: "스킬", ultimate: "궁극기", dot: "저주",
};

// ─── 배틀 재생 화면 ───────────────────────────────────────────────────────────
function BattleReplay({
  result, onDone,
}: {
  result: BattleResult;
  onDone: () => void;
}) {
  const { log, attackerChars, defenderChars } = result;

  type FloatNum = { id: number; val: number; team: "attacker"|"defender"; slot: number; color: string; prefix: string };

  const [step, setStep]             = useState(-1);
  const [speed, setSpeed]           = useState(700);
  const [hitSlots, setHitSlots]     = useState<Set<string>>(new Set());
  const [floatNums, setFloatNums]   = useState<FloatNum[]>([]);
  const [skillBanner, setSkillBanner] = useState<{ name: string; type: string } | null>(null);
  const [ultimateAnim, setUltimateAnim] = useState<{ skillName: string; archetype: string; actorTeam: "attacker"|"defender"; charId?: number } | null>(null);
  const intervalRef                 = useRef<ReturnType<typeof setInterval>|null>(null);
  const pausedRef                   = useRef(false);

  // 현재 HP — hits 배열의 모든 타겟 처리
  const hpState = useCallback((upTo: number) => {
    const hp: Record<string, number> = {};
    for (const c of attackerChars) hp[`a${c.slot}`] = c.maxHp;
    for (const c of defenderChars) hp[`d${c.slot}`] = c.maxHp;
    for (let i = 0; i <= upTo && i < log.length; i++) {
      const ev = log[i];
      const allHits: Array<{ targetTeam: string; targetSlot: number; hpAfter: number }> =
        ev.hits?.length ? ev.hits : [{ targetTeam: ev.targetTeam, targetSlot: ev.targetSlot, hpAfter: ev.targetHpAfter }];
      for (const h of allHits) {
        hp[`${h.targetTeam === "attacker" ? "a" : "d"}${h.targetSlot}`] = h.hpAfter;
      }
    }
    return hp;
  }, [log, attackerChars, defenderChars]);

  const applyHitFx = useCallback((ev: BattleEvent, isUlt: boolean) => {
    const allHits: HitDetail[] = ev.hits?.length
      ? ev.hits
      : [{ targetTeam: ev.targetTeam, targetSlot: ev.targetSlot, damage: ev.damage, healed: ev.healed ?? 0, hpAfter: ev.targetHpAfter, alive: ev.targetAlive }];
    const hitSet = new Set<string>();
    const newFloats: FloatNum[] = [];
    for (const h of allHits) {
      if (h.damage > 0) {
        hitSet.add(`${h.targetTeam}-${h.targetSlot}`);
        const col = isUlt ? "#ffd700" : ev.skillType === "dot" ? "#c084fc" : h.targetTeam === "attacker" ? "#f87171" : "#60a5fa";
        newFloats.push({ id: Date.now() + Math.random(), val: h.damage, team: h.targetTeam, slot: h.targetSlot, color: col, prefix: "-" });
      }
      if (h.healed > 0) {
        newFloats.push({ id: Date.now() + Math.random(), val: h.healed, team: h.targetTeam, slot: h.targetSlot, color: "#4ade80", prefix: "+" });
      }
    }
    setHitSlots(hitSet);
    setTimeout(() => setHitSlots(new Set()), 380);
    setFloatNums(p => [...p.slice(-10), ...newFloats]);
    newFloats.forEach(n => setTimeout(() => setFloatNums(p => p.filter(d => d.id !== n.id)), 900));
  }, []);

  // 자동 재생
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setStep(prev => {
        if (prev + 1 >= log.length) {
          clearInterval(intervalRef.current!);
          setTimeout(onDone, 800);
          return prev;
        }
        const ev  = log[prev + 1];
        const isUlt = ev.skillType === "ultimate" && ev.actorSlot >= 0;

        if (isUlt) {
          // 궁극기 → 연출 오버레이 시작, 배틀 일시정지
          const actorInfo = (ev.actorTeam === "attacker" ? attackerChars : defenderChars)
            .find(c => c.slot === ev.actorSlot);
          setUltimateAnim({ skillName: ev.skillName, archetype: actorInfo?.archetype ?? "all", actorTeam: ev.actorTeam, charId: actorInfo?.charId });
          pausedRef.current = true;
          // 플래시 타이밍(650ms)에 맞춰 데미지 숫자 표시
          setTimeout(() => applyHitFx(ev, true), 650);
        } else {
          // 일반 스킬/평타
          if (ev.actorSlot >= 0 && ev.skillType !== "basic") {
            setSkillBanner({ name: ev.skillName, type: ev.skillType });
            setTimeout(() => setSkillBanner(null), Math.max(500, speed - 100));
          }
          applyHitFx(ev, false);
        }

        return prev + 1;
      });
    }, speed);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [speed, log, onDone, attackerChars, defenderChars, applyHitFx]);

  const handleUltimateEnd = useCallback(() => {
    setUltimateAnim(null);
    pausedRef.current = false;
  }, []);

  const currentStep = Math.max(0, step);
  const hp          = hpState(currentStep);
  const crs         = step >= 0 && step < log.length ? log[step].crs
    : [...attackerChars, ...defenderChars].map(c => ({ team: (attackerChars.includes(c) ? "attacker" : "defender") as "attacker"|"defender", slot: c.slot, cr: 0, alive: true }));
  const activeActor = step >= 0 && step < log.length && log[step].actorSlot >= 0
    ? { team: log[step].actorTeam, slot: log[step].actorSlot } : null;

  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pausedRef.current = false;
    setUltimateAnim(null);
    setStep(log.length - 1);
    setTimeout(onDone, 300);
  };

  const speedBtns = [{ label:"×1", v:700 },{ label:"×2", v:350 },{ label:"×3", v:180 }];

  const renderTeam = (chars: CharInfo[], teamKey: "attacker"|"defender") => {
    const isAtk = teamKey === "attacker";
    return chars.map(info => {
      const key    = `${isAtk ? "a" : "d"}${info.slot}`;
      const hitKey = `${teamKey}-${info.slot}`;
      const isDead = hp[key] === 0;
      const isHit  = hitSlots.has(hitKey);
      const isAct  = activeActor?.team === teamKey && activeActor.slot === info.slot;
      return (
        <div key={info.slot} style={{ position:"relative" }}>
          <UnitCard info={info} hp={hp[key] ?? info.maxHp} isActive={isAct} isHit={isHit} isDead={isDead} isPlayer={isAtk}/>
          {floatNums.filter(d => d.team === teamKey && d.slot === info.slot).map(d => (
            <div key={d.id} style={{ position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)", fontFamily:"monospace", fontWeight:900, fontSize:15, color:d.color, pointerEvents:"none", animation:"col-dmg-up 0.9s ease-out forwards", textShadow:`0 0 8px ${d.color}`, whiteSpace:"nowrap" }}>
              {d.prefix}{d.val}
            </div>
          ))}
        </div>
      );
    });
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#050a10 0%,#080510 40%,#0a0505 70%,#050608 100%)", fontFamily:FONT, display:"flex", flexDirection:"column", padding:"10px 8px 16px" }}>
      <style>{CSS}</style>
      {ultimateAnim && (
        <UltimateAnim
          skillName={ultimateAnim.skillName}
          archetype={ultimateAnim.archetype}
          actorTeam={ultimateAnim.actorTeam}
          charId={ultimateAnim.charId}
          onEnd={handleUltimateEnd}
        />
      )}
      {/* 상단: 속도 + 스킵 */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, padding:"6px 10px", background:"rgba(0,0,0,0.5)", border:"1px solid #2e1f0633", borderRadius:8, backdropFilter:"blur(8px)" }}>
        <span style={{ fontSize:9, color:C.stoneFaint, letterSpacing:"0.2em", marginRight:4 }}>SPD</span>
        {speedBtns.map(b => (
          <button key={b.v} onClick={() => setSpeed(b.v)} style={{ background: speed===b.v ? "linear-gradient(180deg,#c8a44a,#8b6020)" : "rgba(30,21,8,0.8)", border:`1px solid ${speed===b.v?"#c8a44a":"#2e1f06"}`, color: speed===b.v?"#1c1101":C.stone, fontFamily:"monospace", fontSize:11, fontWeight:900, padding:"3px 10px", borderRadius:4, cursor:"pointer", boxShadow: speed===b.v ? "0 0 8px #c8a44a44" : "none" }}>{b.label}</button>
        ))}
        <div style={{ flex:1, height:3, background:"rgba(0,0,0,0.5)", borderRadius:2, overflow:"hidden", margin:"0 4px" }}>
          <div style={{ height:"100%", width:`${Math.min(100,(step+1)/log.length*100)}%`, background:"linear-gradient(90deg,#3b82f6,#c8a44a,#ef4444)", borderRadius:2, transition:"width 0.3s" }}/>
        </div>
        <span style={{ fontSize:9, color:C.stoneFaint, fontFamily:"monospace" }}>{Math.max(0,step+1)}/{log.length}</span>
        <button onClick={skip} style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(30,21,8,0.8)", border:`1px solid ${C.borderFaint}`, color:C.stone, fontFamily:FONT, fontSize:10, padding:"3px 10px", borderRadius:4, cursor:"pointer" }}>
          <SkipForward size={11}/>{" 스킵"}
        </button>
      </div>

      {/* 스킬 배너 */}
      <div style={{ minHeight:32, marginBottom:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {skillBanner && (
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:`linear-gradient(90deg, transparent 0%, ${SKILL_COLOR[skillBanner.type]}22 20%, ${SKILL_COLOR[skillBanner.type]}18 80%, transparent 100%)`,
            border:`1px solid ${SKILL_COLOR[skillBanner.type]}66`,
            borderLeft:"none", borderRight:"none",
            padding:"5px 28px",
            position:"relative", overflow:"hidden",
            animation:"col-skill-in 0.2s ease-out",
            width:"100%",
          }}>
            {/* 좌측 글로우 라인 */}
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:`linear-gradient(180deg, transparent, ${SKILL_COLOR[skillBanner.type]}, transparent)` }}/>
            {/* 우측 글로우 라인 */}
            <div style={{ position:"absolute", right:0, top:0, bottom:0, width:3, background:`linear-gradient(180deg, transparent, ${SKILL_COLOR[skillBanner.type]}, transparent)` }}/>
            <span style={{ fontSize:8, fontWeight:900, color:SKILL_COLOR[skillBanner.type], letterSpacing:"0.25em", background:`${SKILL_COLOR[skillBanner.type]}22`, border:`1px solid ${SKILL_COLOR[skillBanner.type]}55`, padding:"2px 7px", borderRadius:3 }}>
              {SKILL_LABEL[skillBanner.type]}
            </span>
            <span style={{ fontSize:15, fontWeight:900, color:"#fff", textShadow:`0 0 16px ${SKILL_COLOR[skillBanner.type]}, 0 0 32px ${SKILL_COLOR[skillBanner.type]}88`, letterSpacing:"0.06em", flex:1, textAlign:"center" }}>
              {skillBanner.name}
            </span>
          </div>
        )}
      </div>

      {/* 메인 배틀 영역 */}
      <div style={{ display:"flex", gap:8, flex:1 }}>
        {/* 속도 바 (좌측) */}
        <SpeedBar attackerChars={attackerChars} defenderChars={defenderChars} crs={crs} activeActor={activeActor}/>

        {/* 배틀 필드 */}
        <div style={{ flex:1, display:"flex", gap:6 }}>
          {/* 공격팀 */}
          <div style={{
            flex:1, display:"flex", flexDirection:"column", gap:10, padding:"10px 8px",
            background:"linear-gradient(160deg,#0a2540 0%,#061a30 40%,#040f1c 100%)",
            border:"1px solid #1e3a5f",
            borderRadius:8,
            position:"relative", overflow:"hidden",
            boxShadow:"inset 0 0 40px rgba(96,165,250,0.06), 0 0 20px rgba(96,165,250,0.08)",
          }}>
            {/* 스캔라인 오버레이 */}
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", borderRadius:8 }}>
              <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(96,165,250,0.18),transparent)", animation:"col-scan 3.5s linear infinite" }}/>
              <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(96,165,250,0.025) 18px,rgba(96,165,250,0.025) 19px)", pointerEvents:"none" }}/>
            </div>
            {/* 코너 장식 */}
            <div style={{ position:"absolute", top:4, left:4, width:10, height:10, borderTop:"2px solid #3b82f666", borderLeft:"2px solid #3b82f666", borderRadius:"2px 0 0 0" }}/>
            <div style={{ position:"absolute", top:4, right:4, width:10, height:10, borderTop:"2px solid #3b82f666", borderRight:"2px solid #3b82f666", borderRadius:"0 2px 0 0" }}/>
            {/* 헤더 */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, position:"relative", zIndex:1 }}>
              <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,#3b82f655)" }}/>
              <span style={{ fontSize:9, color:"#60a5fa", fontWeight:900, letterSpacing:"0.3em" }}>공격</span>
              <div style={{ flex:1, height:1, background:"linear-gradient(90deg,#3b82f655,transparent)" }}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center", position:"relative", zIndex:1 }}>
              {renderTeam(attackerChars, "attacker")}
            </div>
            {/* 바닥 글로우 */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:40, background:"linear-gradient(0deg,rgba(96,165,250,0.1),transparent)", pointerEvents:"none" }}/>
          </div>

          {/* VS 구분자 */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", width:28, gap:4 }}>
            {/* 상단 에너지 라인 */}
            <div style={{ flex:1, width:1, background:"linear-gradient(180deg,transparent,#c8a44a55,#c8a44a,#c8a44a55,transparent)", animation:"col-energy 2s ease-in-out infinite" }}/>
            {/* VS 텍스트 */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{ width:20, height:20, borderRadius:"50%", background:"radial-gradient(circle,#c8a44a33,transparent)", border:"1px solid #c8a44a55", display:"flex", alignItems:"center", justifyContent:"center", animation:"col-vs-beat 1.8s ease-in-out infinite" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ overflow:"visible" }}>
                  <line x1="2" y1="12" x2="12" y2="2" stroke="#c8a44a" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="2" y1="2" x2="12" y2="12" stroke="#c8a44a" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="7" cy="7" r="2" fill="#c8a44a" opacity="0.7"/>
                </svg>
              </div>
              <span style={{ fontFamily:"monospace", fontSize:8, color:"#c8a44a88", fontWeight:900, letterSpacing:"0.05em", writingMode:"vertical-rl" }}>VS</span>
            </div>
            {/* 하단 에너지 라인 */}
            <div style={{ flex:1, width:1, background:"linear-gradient(180deg,#c8a44a55,#c8a44a,#c8a44a55,transparent)", animation:"col-energy 2s ease-in-out 1s infinite" }}/>
          </div>

          {/* 방어팀 */}
          <div style={{
            flex:1, display:"flex", flexDirection:"column", gap:10, padding:"10px 8px",
            background:"linear-gradient(200deg,#250606 0%,#1a0404 40%,#100303 100%)",
            border:"1px solid #5a1010",
            borderRadius:8,
            position:"relative", overflow:"hidden",
            boxShadow:"inset 0 0 40px rgba(248,113,113,0.06), 0 0 20px rgba(248,113,113,0.08)",
          }}>
            {/* 스캔라인 오버레이 */}
            <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", borderRadius:8 }}>
              <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(248,113,113,0.18),transparent)", animation:"col-scan 4s linear infinite 1s" }}/>
              <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(248,113,113,0.025) 18px,rgba(248,113,113,0.025) 19px)", pointerEvents:"none" }}/>
            </div>
            {/* 코너 장식 */}
            <div style={{ position:"absolute", top:4, left:4, width:10, height:10, borderTop:"2px solid #ef444466", borderLeft:"2px solid #ef444466", borderRadius:"2px 0 0 0" }}/>
            <div style={{ position:"absolute", top:4, right:4, width:10, height:10, borderTop:"2px solid #ef444466", borderRight:"2px solid #ef444466", borderRadius:"0 2px 0 0" }}/>
            {/* 헤더 */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, position:"relative", zIndex:1 }}>
              <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,#ef444455)" }}/>
              <span style={{ fontSize:9, color:"#f87171", fontWeight:900, letterSpacing:"0.3em" }}>방어</span>
              <div style={{ flex:1, height:1, background:"linear-gradient(90deg,#ef444455,transparent)" }}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center", position:"relative", zIndex:1 }}>
              {renderTeam(defenderChars, "defender")}
            </div>
            {/* 바닥 글로우 */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:40, background:"linear-gradient(0deg,rgba(248,113,113,0.1),transparent)", pointerEvents:"none" }}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ColosseumPage() {
  const { rewardSummary } = useAppData();
  const { lang }          = useLang();
  const ko = lang === "ko"; const ja = lang === "ja";
  const user              = getStoredUser();

  // 세션 상태
  const [phase, setPhase]             = useState<Phase>("lobby");
  const [showSeason, setShowSeason]   = useState(false);

  // 내 스탯 / 덱
  const [tierPts, setTierPts]         = useState(0);
  const [stats, setStats]             = useState({ wins:0, losses:0, winStreak:0 });
  const [myAtkSlots, setMyAtkSlots]   = useState<number[]>([]);
  const [myDefSlots, setMyDefSlots]   = useState<number[]>([]);

  // 덱 편집
  const [editingDeckType, setEditingDeckType] = useState<"attack"|"defense">("attack");

  // 공격 확인
  const [targetUser, setTargetUser]     = useState<{ userId:string; nickname:string; tierPoints:number } | null>(null);
  const [targetDefSlots, setTargetDefSlots] = useState<number[]>([]);
  const [npcTarget, setNpcTarget]       = useState<NpcOpponent | null>(null);

  // 배틀 / 결과
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [npcSection, setNpcSection]     = useState(true); // NPC 섹션 펼침 여부

  // 랭킹
  const [rankings, setRankings]       = useState<RankingEntry[]>([]);
  const [rankPage, setRankPage]       = useState(0);
  const [rankLoading, setRankLoading] = useState(false);

  const { tickets, msToNext, fmtMs, consume } = useTickets();
  const { isOnCooldown, getRemainingMs, applyCooldown } = useNpcCooldowns();

  const ownedIds = rewardSummary.ownedCharacterIds ?? [];

  // ── 내 데이터 로드 ──
  const fetchMyData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get<{ attackSlots:number[]; defenseSlots:number[]; tierPoints:number; wins:number; losses:number; winStreak:number }>(
        `/arena/my?userId=${encodeURIComponent(user.id)}`,
      );
      setMyAtkSlots(res.attackSlots);
      setMyDefSlots(res.defenseSlots);
      setTierPts(res.tierPoints);
      setStats({ wins:res.wins, losses:res.losses, winStreak:res.winStreak });
    } catch { /* silent */ }
  }, [user?.id]);

  const fetchRankings = useCallback(async () => {
    setRankLoading(true);
    try {
      const res = await api.get<{ rankings:RankingEntry[] }>("/rewards/colosseum-rankings");
      setRankings(res.rankings);
    } catch { /* silent */ }
    setRankLoading(false);
  }, []);

  useEffect(() => { fetchMyData(); fetchRankings(); }, [fetchMyData, fetchRankings]);

  // ── 덱 저장 ──
  const saveDeck = async (deckType: "attack"|"defense", slots: number[]) => {
    if (!user?.id) return;
    try {
      await api.put("/arena/deck", { userId: user.id, deckType, slots });
      if (deckType === "attack") setMyAtkSlots(slots);
      else setMyDefSlots(slots);
    } catch { /* silent */ }
    setPhase("lobby");
  };

  // ── 공격 확인 (실제 플레이어) ──
  const startAttackConfirm = async (target: RankingEntry) => {
    try {
      const res = await api.get<{ slots:number[]; defenderName:string }>(`/arena/defense/${encodeURIComponent(target.userId)}`);
      setTargetUser({ userId: target.userId, nickname: target.nickname, tierPoints: target.tierPoints });
      setTargetDefSlots(res.slots);
      setNpcTarget(null);
      setPhase("attack-confirm");
    } catch { /* silent */ }
  };

  // ── 공격 확인 (NPC) ──
  const startNpcAttackConfirm = (npc: NpcOpponent) => {
    setTargetUser({ userId: npc.id, nickname: npc.nameKo, tierPoints: npc.fakePts });
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
          userId:       user.id,
          npcSlots:     npcTarget.slots,
          npcEnhLvs:    npcTarget.enhLvs,
          pointsOnWin:  npcTarget.winPts,
          pointsOnLoss: npcTarget.lossPts,
        });
      } else {
        res = await api.post<BattleResult>(`/arena/attack/${encodeURIComponent(targetUser.userId)}`, { userId: user.id });
      }
      setBattleResult(res);
      setTierPts(res.tierPoints);
      setStats({ wins:res.wins, losses:res.losses, winStreak:res.winStreak });
      if (res.won && npcTarget) applyCooldown(npcTarget.id);
    } catch {
      setPhase("lobby");
    }
  };

  // ── 페이즈별 렌더 ──────────────────────────────────────────────────────────

  // 덱 편집
  if (phase === "deck-edit") {
    return (
      <DeckEditor
        deckType={editingDeckType}
        currentSlots={editingDeckType === "attack" ? myAtkSlots : myDefSlots}
        ownedIds={ownedIds}
        onSave={slots => saveDeck(editingDeckType, slots)}
        onBack={() => setPhase("lobby")}
        ko={ko} ja={ja}
        charEnhancements={rewardSummary.characterEnhancements ?? {}}
      />
    );
  }

  // 배틀 재생
  if (phase === "battle" && battleResult) {
    return (
      <BattleReplay
        result={battleResult}
        onDone={() => setPhase("result")}
      />
    );
  }

  // 결과 화면
  if (phase === "result" && battleResult) {
    const won = battleResult.won;
    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, padding:20 }}>
        <style>{CSS}</style>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontFamily:"'Courier New',monospace", fontSize:44, fontWeight:900, color: won?"#ffd700":"#f87171", textShadow: won?"0 0 30px #ffd700":"0 0 20px #ef4444", margin:"0 0 8px", animation:"col-win-in 0.6s ease-out both", letterSpacing:"0.12em" }}>
            {won ? (ko?"승리":"VICTORY") : (ko?"패배":"DEFEAT")}
          </p>
          <p style={{ fontSize:14, color:C.stone, margin:0 }}>
            vs. {targetUser?.nickname ?? "상대방"}
          </p>
        </div>
        <div style={{ background:"linear-gradient(135deg,#1e1508,#120e06)", border:`2px solid ${C.border}`, borderRadius:8, padding:"16px 28px", textAlign:"center" }}>
          <p style={{ fontFamily:"monospace", fontSize:32, fontWeight:900, color: battleResult.pointsDelta >= 0 ? "#4ade80" : "#f87171", margin:"0 0 4px" }}>
            {battleResult.pointsDelta >= 0 ? "+" : ""}{battleResult.pointsDelta} pts
          </p>
          <p style={{ fontSize:12, color:C.stone, margin:0 }}>
            {ko?"현재":"Total"}: {battleResult.tierPoints.toLocaleString()} pts
          </p>
        </div>
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:320 }}>
          <PixelBtn onClick={() => setPhase("lobby")} color="gray">
            {ko?"로비로":ja?"ロビーへ":"Lobby"}
          </PixelBtn>
          <PixelBtn onClick={() => { setBattleResult(null); setEditingDeckType("attack"); setPhase("deck-edit"); }}>
            {ko?"덱 수정":ja?"デッキ編集":"Edit Deck"}
          </PixelBtn>
        </div>
      </div>
    );
  }

  // 공격 확인 화면
  if (phase === "attack-confirm" && targetUser) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT, padding:"16px 16px 40px" }}>
        <style>{CSS}</style>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
          <button onClick={() => setPhase("lobby")} style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
            <ChevronLeft size={22} color={C.stone}/>
          </button>
          <h2 style={{ margin:0, color:C.gold, fontSize:17, fontWeight:900 }}>{ko?"전투 확인":ja?"戦闘確認":"Battle Preview"}</h2>
        </div>
        <div style={{ maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column", gap:14 }}>
          {/* NPC 배지 */}
          {npcTarget && (
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.35)", borderRadius:7 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#60a5fa" strokeWidth="1.5"/><rect x="5" y="4" width="4" height="1.5" rx="0.5" fill="#60a5fa"/><rect x="5" y="6.5" width="4" height="1.5" rx="0.5" fill="#60a5fa"/><rect x="5" y="9" width="4" height="1.5" rx="0.5" fill="#60a5fa"/></svg>
              <span style={{ fontSize:11, color:"#60a5fa", fontWeight:900 }}>AI 수련 전투</span>
              <span style={{ marginLeft:"auto", fontSize:10, color:"#4ade80", fontWeight:900 }}>승리 시 +{npcTarget.winPts}P{npcTarget.lossPts < 0 ? ` / 패배 시 ${npcTarget.lossPts}P` : " / 패배 무손실"}</span>
            </div>
          )}

          {/* 내 공격 덱 */}
          <div style={{ background:"linear-gradient(135deg,#061a30,#040f1c)", border:"1px solid #1e3a5f", borderRadius:8, padding:"14px 12px" }}>
            <p style={{ margin:"0 0 10px", fontSize:11, color:"#60a5fa", fontWeight:900, letterSpacing:"0.12em" }}>
              {ko?"내 공격 덱":ja?"自分の攻撃デッキ":"My Attack Deck"}
            </p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {myAtkSlots.length === 0
                ? <p style={{ color:C.stoneFaint, fontSize:12 }}>{ko?"덱 없음 — 자동으로 첫 번째 캐릭터 사용":"덱 없음"}</p>
                : myAtkSlots.map((id,i) => <DeckSlotCard key={i} charId={id} small/>)}
            </div>
          </div>

          {/* vs */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg,transparent,${C.border})` }}/>
            <Swords size={18} color={C.gold}/>
            <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${C.border},transparent)` }}/>
          </div>

          {/* 상대 방어 덱 */}
          <div style={{ background: npcTarget ? "linear-gradient(135deg,#0f1a2e,#090f1c)" : "linear-gradient(135deg,#1f0606,#130404)", border: npcTarget ? "1px solid #1e3a5f88" : "1px solid #4f0e0e", borderRadius:8, padding:"14px 12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <p style={{ margin:0, fontSize:11, fontWeight:900, letterSpacing:"0.12em", color: npcTarget ? "#60a5fa" : "#f87171" }}>
                {npcTarget ? (ko?"AI 방어 덱":ja?"AI防御デッキ":"AI Defense Deck") : `${targetUser.nickname} ${ko?"방어 덱":ja?"防御デッキ":"Defense Deck"}`}
              </p>
              {npcTarget && (
                <span style={{ display:"flex", gap:1 }}>
                  {Array.from({length:5},(_,i)=>(
                    <svg key={i} width="9" height="9" viewBox="0 0 10 10"><polygon points="5,1 6.2,3.8 9.5,4 7,6.2 7.8,9.5 5,7.8 2.2,9.5 3,6.2 0.5,4 3.8,3.8" fill={i<npcTarget.stars?"#fbbf24":"#2e1f06"}/></svg>
                  ))}
                </span>
              )}
            </div>
            <p style={{ margin:"0 0 10px", fontSize:10, color:C.stoneFaint }}>{targetUser.tierPoints.toLocaleString()} pts</p>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {targetDefSlots.map((id,i) => <DeckSlotCard key={i} charId={id} small/>)}
            </div>
          </div>

          {/* 티켓 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#0a0805", border:`1px solid ${C.borderFaint}`, borderRadius:6 }}>
            <span style={{ fontSize:13, color:C.stone }}>{ko?"입장권":ja?"入場券":"Tickets"}</span>
            <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:16, color: tickets > 0 ? C.gold : "#f87171" }}>
              {Array.from({ length: tickets }, (_, i) => <Ticket key={i} size={14} color={C.gold} style={{ display:"inline", verticalAlign:"middle", marginRight:1 }}/>)}{tickets === 0 && (msToNext ? fmtMs(msToNext) : "")}
            </span>
          </div>
          <PixelBtn onClick={startBattle} disabled={tickets === 0 || myAtkSlots.length === 0}>
            <Swords size={18}/>{" "}{ko?"전투 시작":ja?"戦闘開始":"Start Battle"}
          </PixelBtn>
        </div>
      </div>
    );
  }

  // ── 로비 ──────────────────────────────────────────────────────────────────
  const tierIdx      = getTierIdx(tierPts);
  const tier         = TIERS[tierIdx];
  const tierLabel    = ko ? tier.ko : ja ? tier.ja : tier.en;
  const tierNext     = TIERS[tierIdx + 1]?.min ?? tier.min + 1000;
  const tierProgress = Math.min(1, (tierPts - tier.min) / (tierNext - tier.min));
  const RANK_PAGE_SZ = 5;
  const rankTotalPages = Math.ceil(rankings.length / RANK_PAGE_SZ);
  const rankPage5 = rankings.slice(rankPage * RANK_PAGE_SZ, (rankPage + 1) * RANK_PAGE_SZ);
  const myRankEntry = rankings.find(e => e.userId === user?.id);

  // ── 공격 가능한 유효한 타겟 (나 제외) ──
  const attackableEntries = rankings.filter(e => e.userId !== user?.id);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"0 0 60px", fontFamily:FONT }}>
      <style>{CSS}</style>

      {/* ══ 히어로 배너 ══════════════════════════════════════════════════════ */}
      <div style={{ position:"relative", background:"linear-gradient(180deg,#1e1006 0%,#120a04 55%,#0c0703 100%)", borderBottom:`3px solid #6b3a0e`, boxShadow:`0 6px 40px ${C.goldGlow}55` }}>
        {/* 석재 질감 */}
        <div style={{ position:"absolute", inset:0, opacity:0.05, pointerEvents:"none", backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 15px,#fff 15px,#fff 16px),repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,0.5) 31px,rgba(255,255,255,0.5) 32px)" }}/>
        {/* 금빛 방사광 */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(ellipse 80% 60% at 50% 110%,${C.goldGlow}22 0%,transparent 65%)` }}/>
        {/* 사이드 그라디언트 */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"linear-gradient(90deg,rgba(0,0,0,0.35) 0%,transparent 30%,transparent 70%,rgba(0,0,0,0.35) 100%)" }}/>

        {/* 횃불 */}
        <div style={{ position:"absolute", top:14, left:14, zIndex:2 }}><Torch/></div>
        <div style={{ position:"absolute", top:14, right:14, zIndex:2 }}><Torch flip/></div>

        {/* 시즌 보상 버튼 (우상단) */}
        <button onClick={() => setShowSeason(true)} style={{ position:"absolute", top:14, right:48, zIndex:3, display:"flex", alignItems:"center", gap:5, background:"rgba(200,164,74,0.14)", border:"1px solid #6b4a12", borderRadius:6, padding:"5px 11px", cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:900, color:C.gold, backdropFilter:"blur(4px)" }}>
          <Gift size={12} color={C.gold}/>{ko?`S${SEASON.number} 보상`:ja?`S${SEASON.number}報酬`:`S${SEASON.number}`}
        </button>

        {/* 상단 컨텐츠 */}
        <div style={{ padding:"20px 16px 0", textAlign:"center", position:"relative", zIndex:1 }}>
          <p style={{ margin:"0 0 4px", fontSize:9, letterSpacing:"0.6em", color:C.stone, fontWeight:900 }}>K E B O M O N</p>
          {/* 경기장 게이트 */}
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:10, marginBottom:2 }}>
            <ArenaFlag/><ArenaGate/><ArenaFlag flip/>
          </div>
          <h1 style={{ margin:"0 0 4px", fontFamily:"'Courier New',monospace", fontSize:26, fontWeight:900, letterSpacing:"0.25em", color:C.gold, textShadow:`0 0 32px ${C.goldGlow}, 2px 2px 0 #3a2508, -1px -1px 0 #3a2508`, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            <Swords size={20} color={C.gold} strokeWidth={2.5}/>COLOSSEUM<Swords size={20} color={C.gold} strokeWidth={2.5}/>
          </h1>
          {/* 시즌 배지 */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(200,164,74,0.09)", border:`1px solid ${C.gold}33`, borderRadius:20, padding:"3px 16px", marginBottom:14 }}>
            <svg width="11" height="11" viewBox="0 0 14 14"><polygon points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2" fill="#c8a44a" opacity="0.9"/></svg>
            <span style={{ fontFamily:FONT, fontSize:10, fontWeight:900, letterSpacing:"0.14em", color:C.gold }}>
              {ko?`시즌 ${SEASON.number} · 영광의 시작`:ja?`S${SEASON.number} · 栄光の始まり`:`Season ${SEASON.number} · Glory Begins`}
            </span>
            <svg width="11" height="11" viewBox="0 0 14 14"><polygon points="7,1 8.8,5.2 13.5,5.5 10,8.5 11.1,13 7,10.5 2.9,13 4,8.5 0.5,5.5 5.2,5.2" fill="#c8a44a" opacity="0.9"/></svg>
          </div>
        </div>

        {/* 티어 + 스탯 통합 카드 (배너 하단에 붙음) */}
        <div style={{ maxWidth:860, margin:"0 auto", padding:"0 12px", position:"relative", zIndex:1 }}>
        <div style={{ padding:"10px 14px", background:`linear-gradient(135deg,${tier.glow}22 0%,rgba(0,0,0,0.55) 100%)`, border:`1px solid ${tier.color}55`, borderRadius:"8px 8px 0 0", backdropFilter:"blur(8px)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* 티어 배지 */}
            <div style={{ flexShrink:0, animation:"col-tier-pulse 3s ease-in-out infinite", color:tier.color }}>
              <TierBadgeSvg idx={tierIdx} size={36}/>
            </div>
            {/* 티어 정보 */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontFamily:FONT, fontSize:15, fontWeight:900, color:tier.color, textShadow:`0 0 12px ${tier.glow}` }}>{tierLabel}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, color:C.stone }}>{tierPts.toLocaleString()} pts</span>
              </div>
              {/* 진행 바 */}
              <div style={{ height:7, background:"rgba(0,0,0,0.6)", border:`1px solid ${tier.color}44`, borderRadius:4, overflow:"hidden", marginTop:4, boxShadow:`0 0 8px ${tier.glow}33` }}>
                <div style={{ height:"100%", width:`${tierProgress*100}%`, background:`linear-gradient(90deg,${tier.glow},${tier.color})`, boxShadow:`0 0 16px ${tier.color}aa`, borderRadius:4, transition:"width 0.6s cubic-bezier(0.25,0.8,0.25,1)", position:"relative" }}>
                  <div style={{ position:"absolute", inset:"0 auto 0 0", width:"100%", background:"linear-gradient(180deg,rgba(255,255,255,0.3) 0%,transparent 60%)", borderRadius:4 }}/>
                </div>
              </div>
              <p style={{ margin:"3px 0 0", fontSize:9, color:C.stoneFaint, fontFamily:"monospace" }}>
                {tierPts.toLocaleString()} / {(TIERS[tierIdx+1]?.min ?? tier.min+1000).toLocaleString()} pts
              </p>
            </div>
          </div>

          {/* 승/패/연승 가로 통계 */}
          <div style={{ display:"flex", marginTop:8, paddingTop:8, borderTop:`1px solid ${tier.color}33`, gap:0 }}>
            {[
              { lk:"승", lj:"勝", le:"WIN",    val:stats.wins,      col:"#4ade80", bg:"rgba(74,222,128,0.08)" },
              { lk:"패", lj:"敗", le:"LOSE",   val:stats.losses,    col:"#f87171", bg:"rgba(248,113,113,0.08)" },
              { lk:"연승", lj:"連勝", le:"STREAK", val:stats.winStreak, col:C.gold,   bg:`rgba(200,164,74,0.08)` },
            ].map((s,i) => (
              <div key={i} style={{ flex:1, textAlign:"center", padding:"4px 0", background:s.bg, borderRadius:4, margin:"0 3px" }}>
                <p style={{ margin:0, fontFamily:"monospace", fontSize:16, fontWeight:900, color:s.col, lineHeight:1, textShadow:`0 0 10px ${s.col}88` }}>{s.val}</p>
                <p style={{ margin:"2px 0 0", fontFamily:FONT, fontSize:9, color:C.stoneFaint, letterSpacing:"0.08em" }}>{ko?s.lk:ja?s.lj:s.le}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 배너 하단 border 연결 */}
        <div style={{ height:3, background:`linear-gradient(90deg,transparent,${tier.color}88,${tier.color},${tier.color}88,transparent)` }}/>
        </div>
      </div>

      {showSeason && <SeasonRewardModal onClose={() => setShowSeason(false)} ko={ko} ja={ja} myPts={tierPts}/>}

      <div style={{ maxWidth:860, margin:"0 auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* ══ 덱 구성 섹션 ═══════════════════════════════════════════════════ */}
        <div style={{ background:"linear-gradient(135deg,#18120a 0%,#0e0b06 100%)", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
          {/* 헤더 */}
          <div style={{ padding:"10px 14px", background:"rgba(200,164,74,0.06)", borderBottom:`1px solid ${C.borderFaint}`, display:"flex", alignItems:"center", gap:8 }}>
            <Swords size={13} color={C.gold} strokeWidth={2.5}/>
            <span style={{ fontFamily:FONT, fontSize:12, fontWeight:900, color:C.gold, letterSpacing:"0.1em" }}>{ko?"전투 덱 구성":ja?"戦闘デッキ":"Battle Deck"}</span>
          </div>

          {/* 공격/방어 덱 나란히 */}
          <div style={{ display:"flex", gap:0 }}>
            {[
              { type:"attack" as const,  label:ko?"공격 덱":ja?"攻撃":"ATK", slots:myAtkSlots,  accent:"#60a5fa", bgGrad:"linear-gradient(135deg,#061a30 0%,#040f1c 100%)", bdr:"#1e3a5f", icon:"⚔" },
              { type:"defense" as const, label:ko?"방어 덱":ja?"防御":"DEF", slots:myDefSlots, accent:"#f87171", bgGrad:"linear-gradient(135deg,#200707 0%,#130404 100%)", bdr:"#4f0e0e", icon:"🛡" },
            ].map((dk, di) => (
              <div key={dk.type} style={{ flex:1, padding:"12px 10px", background:dk.bgGrad, borderLeft: di===1 ? `1px solid ${C.borderFaint}` : undefined }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:900, color:dk.accent, letterSpacing:"0.08em" }}>{dk.label}</span>
                  <button onClick={() => { setEditingDeckType(dk.type); setPhase("deck-edit"); }}
                    style={{ display:"flex", alignItems:"center", gap:3, background:`${dk.accent}18`, border:`1px solid ${dk.accent}55`, color:dk.accent, fontFamily:FONT, fontSize:10, fontWeight:900, padding:"3px 10px", borderRadius:4, cursor:"pointer", transition:"background 0.15s" }}>
                    {ko?"편집":ja?"編集":"Edit"}
                  </button>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {Array.from({length:4}, (_,i) => {
                    const id = dk.slots[i];
                    if (!id) return (
                      <div key={i} style={{ width:44, height:44, border:`2px dashed ${dk.bdr}`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <Plus size={13} color={dk.bdr}/>
                      </div>
                    );
                    const ch = charById(id);
                    const th = RARITY_THEME[ch.rarity as CharacterRarity];
                    return (
                      <div key={i} style={{ width:44, height:44, border:`2px solid ${th?.border ?? dk.bdr}`, borderRadius:6, background:th?.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 8px ${th?.glow ?? dk.accent}44`, position:"relative" }}>
                        <PixelSprite type={ch.type as CharacterType} rarity={ch.rarity as CharacterRarity} size={34}/>
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin:"6px 0 0", fontSize:9, color:`${dk.accent}88`, fontFamily:"monospace" }}>
                  {dk.slots.length}/4 {ko?"편성":ja?"編成":"slots"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ 입장권 + 전투 시작 CTA ══════════════════════════════════════════ */}
        <div style={{ background:"linear-gradient(135deg,#1a1208 0%,#0e0b06 100%)", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 14px 16px" }}>
          {/* 입장권 */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, flex:1 }}>
              <span style={{ fontSize:11, color:C.stone, fontWeight:700 }}>{ko?"입장권":ja?"入場券":"Tickets"}</span>
              <div style={{ display:"flex", gap:4, marginLeft:4 }}>
                {Array.from({length:MAX_TICKETS}, (_,i) => (
                  <div key={i} style={{ width:10, height:22, borderRadius:3, background: i < tickets ? `linear-gradient(180deg,${C.gold},#8b6020)` : "#2e1f06", border: i < tickets ? `1px solid ${C.gold}66` : `1px solid #1a1005`, boxShadow: i < tickets ? `0 0 6px ${C.goldGlow}88` : "none", transition:"all 0.3s", flexShrink:0 }}/>
                ))}
              </div>
              <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:900, color: tickets > 0 ? C.gold : "#f87171", marginLeft:4 }}>
                {tickets}/{MAX_TICKETS}
              </span>
            </div>
            {msToNext && tickets < MAX_TICKETS && (
              <div style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(0,0,0,0.4)", border:`1px solid ${C.borderFaint}`, borderRadius:5, padding:"3px 8px" }}>
                <span style={{ fontSize:10, color:C.stoneFaint }}>{ko?"충전":ja?"補充":"next"}</span>
                <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:900, color:"#60a5fa" }}>{fmtMs(msToNext)}</span>
              </div>
            )}
          </div>

          {/* 전투 시작 버튼 */}
          <button
            disabled={tickets === 0 || myAtkSlots.length === 0 || rankings.filter(e=>e.userId!==user?.id).length === 0}
            onClick={() => document.getElementById("col-ranking")?.scrollIntoView({ behavior:"smooth" })}
            className="col-btn-shine"
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              background: tickets===0||myAtkSlots.length===0 ? "linear-gradient(180deg,#374151,#1f2937)" : "linear-gradient(180deg,#d4a84b 0%,#c8a44a 40%,#8b6020 100%)",
              border: tickets===0||myAtkSlots.length===0 ? "3px solid #1f2937" : "3px solid #5a3d0e",
              boxShadow: tickets===0||myAtkSlots.length===0 ? "0 5px 0 #0f172a" : undefined,
              color: tickets===0||myAtkSlots.length===0 ? "#6b7280" : "#1c1101",
              fontFamily:FONT, fontWeight:900, fontSize:18, letterSpacing:"0.1em",
              padding:"14px 0", borderRadius:6, cursor: tickets===0||myAtkSlots.length===0?"not-allowed":"pointer",
              animation: tickets>0&&myAtkSlots.length>0 ? "col-battle-ready 2.4s ease-in-out infinite" : undefined,
              transition:"opacity 0.2s",
            }}
          >
            <Swords size={20} strokeWidth={2.5}/>{" "}
            {tickets===0 ? (ko?"입장권 소진":ja?"入場券なし":"No Tickets")
             : myAtkSlots.length===0 ? (ko?"공격 덱 없음":ja?"デッキなし":"Set Attack Deck")
             : (ko?"결투 상대 선택":ja?"対戦相手選択":"Select Opponent")}
          </button>
          {myAtkSlots.length===0 && tickets>0 && (
            <p style={{ margin:"8px 0 0", fontSize:10, color:"#f87171", textAlign:"center" }}>
              {ko?"↑ 공격 덱을 먼저 편성해주세요":ja?"↑ 攻撃デッキを先に編成してください":"↑ Please set up your attack deck first"}
            </p>
          )}
        </div>

        {/* ══ AI 수련 상대 ══════════════════════════════════════════════════ */}
        <div style={{ background:"linear-gradient(135deg,#12100a 0%,#0c0a06 100%)", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
          {/* 헤더 (토글) */}
          <button onClick={() => setNpcSection(p => !p)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:"rgba(96,165,250,0.06)", borderBottom: npcSection ? `1px solid ${C.borderFaint}` : "none", border:"none", cursor:"pointer", fontFamily:FONT }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#60a5fa" strokeWidth="1.5"/>
                <rect x="5" y="4" width="4" height="1.5" rx="0.5" fill="#60a5fa"/>
                <rect x="5" y="6.5" width="4" height="1.5" rx="0.5" fill="#60a5fa"/>
                <rect x="5" y="9" width="4" height="1.5" rx="0.5" fill="#60a5fa"/>
              </svg>
              <span style={{ fontSize:12, fontWeight:900, color:"#60a5fa", letterSpacing:"0.1em" }}>
                {ko?"AI 수련 상대":ja?"AI練習相手":"AI Practice"}
              </span>
              <span style={{ fontSize:9, color:"#60a5fa88", background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.3)", borderRadius:10, padding:"1px 7px" }}>
                {ko?"패배 페널티 없음":ja?"敗北ペナルティなし":"No loss penalty"}
              </span>
            </div>
            <ChevronRight size={14} color="#60a5fa" style={{ transform: npcSection ? "rotate(90deg)" : "rotate(0deg)", transition:"transform 0.2s" }}/>
          </button>

          {npcSection && (
            <div style={{ padding:"10px 10px 12px" }}>
              <p style={{ margin:"0 0 10px", fontSize:10, color:C.stoneFaint, lineHeight:1.5, paddingLeft:4 }}>
                {ko?"유저가 적을 때도 언제든 연습하세요. 승리 시 포인트를 획득합니다.":ja?"いつでも練習できます。勝利でポイント獲得！":"Practice anytime. Win points for victories!"}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {NPC_OPPONENTS.map(npc => {
                  const t      = TIERS[npc.tierIdx];
                  const onCd   = isOnCooldown(npc.id);
                  const remMs  = getRemainingMs(npc.id);
                  const can    = tickets > 0 && myAtkSlots.length > 0 && !onCd;
                  const fmtCd  = (ms: number) => {
                    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
                    return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
                  };
                  return (
                    <div key={npc.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", background:`linear-gradient(90deg,${t.glow}10,transparent)`, border:`1px solid ${onCd ? "#4b5563" : t.color+"33"}`, borderRadius:7, transition:"border-color 0.15s", opacity: onCd ? 0.65 : 1 }}>
                      {/* 티어 배지 */}
                      <div style={{ flexShrink:0 }}>
                        <TierBadgeSvg idx={npc.tierIdx} size={28}/>
                      </div>
                      {/* 덱 미리보기 */}
                      <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                        {npc.slots.map((id, si) => {
                          const ch = charById(id);
                          const th = RARITY_THEME[ch.rarity as CharacterRarity];
                          return (
                            <div key={si} style={{ width:30, height:30, border:`1.5px solid ${th?.border ?? C.borderFaint}`, borderRadius:4, background:th?.bg ?? "#0a0805", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 5px ${th?.glow ?? "#000"}33` }}>
                              <PixelSprite type={ch.type as CharacterType} rarity={ch.rarity as CharacterRarity} size={22}/>
                            </div>
                          );
                        })}
                      </div>
                      {/* 이름 + 설명 + 난이도 */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ fontSize:12, fontWeight:900, color: onCd ? C.stoneFaint : t.color }}>{ko?npc.nameKo:ja?npc.nameJa:npc.nameEn}</span>
                          <span style={{ display:"flex", gap:1 }}>
                            {Array.from({length:5}, (_,i) => (
                              <svg key={i} width="9" height="9" viewBox="0 0 10 10">
                                <polygon points="5,1 6.2,3.8 9.5,4 7,6.2 7.8,9.5 5,7.8 2.2,9.5 3,6.2 0.5,4 3.8,3.8" fill={i < npc.stars ? "#fbbf24" : "#2e1f06"}/>
                              </svg>
                            ))}
                          </span>
                        </div>
                        <p style={{ margin:0, fontSize:9, color:C.stoneFaint, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{npc.descKo}</p>
                      </div>
                      {/* 보상 + 도전 버튼 */}
                      <div style={{ flexShrink:0, textAlign:"right" }}>
                        <p style={{ margin:"0 0 4px", fontSize:10, fontWeight:900, color:"#4ade80", fontFamily:"monospace" }}>+{npc.winPts}P</p>
                        {onCd && remMs ? (
                          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#0a0805", border:`1px solid ${C.borderFaint}`, borderRadius:4, padding:"4px 8px" }}>
                            <span style={{ fontSize:9, color:C.stoneFaint }}>{ko?"재도전":ja?"再挑戦":"CD"}</span>
                            <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:900, color:"#f87171" }}>{fmtCd(remMs)}</span>
                          </div>
                        ) : (
                          <button onClick={() => startNpcAttackConfirm(npc)} disabled={!can}
                            style={{ display:"flex", alignItems:"center", gap:3, background: can ? `linear-gradient(180deg,${t.color},${t.glow})` : "#1e1508", border:`1px solid ${can?t.color:C.borderFaint}`, color: can ? "#0c0903" : C.stoneFaint, fontFamily:FONT, fontSize:10, fontWeight:900, padding:"4px 11px", borderRadius:4, cursor:can?"pointer":"not-allowed", boxShadow: can ? `0 3px 0 ${t.glow}88` : "none", transition:"all 0.15s" }}>
                            <Swords size={9} strokeWidth={2.5}/>{ko?"도전":ja?"挑戦":"Fight"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══ 랭킹 (항상 표시) ═════════════════════════════════════════════ */}
        <div id="col-ranking" style={{ background:"linear-gradient(135deg,#16110a 0%,#0e0b06 100%)", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
          {/* 랭킹 헤더 */}
          <div style={{ padding:"11px 14px", background:"rgba(200,164,74,0.06)", borderBottom:`1px solid ${C.borderFaint}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Crown size={13} color={C.gold}/>
              <span style={{ fontFamily:FONT, fontSize:12, fontWeight:900, color:C.gold, letterSpacing:"0.1em" }}>
                {ko?"결투 상대 목록":ja?"対戦相手リスト":"Opponents"}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {rankLoading && <span style={{ fontSize:9, color:C.stoneFaint }}>로딩...</span>}
              <button onClick={fetchRankings} style={{ background:"none", border:"none", cursor:"pointer", color:C.stoneFaint, padding:2, lineHeight:0 }}>
                <ChevronRight size={14} color={C.stoneFaint}/>
              </button>
            </div>
          </div>

          {/* 내 랭킹 고정 */}
          {myRankEntry && (
            <div style={{ padding:"9px 14px", background:`linear-gradient(90deg,${C.gold}10,transparent)`, borderBottom:`1px solid ${C.borderFaint}`, display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:28, textAlign:"center" }}>
                <span style={{ fontFamily:"monospace", fontSize:13, fontWeight:900, color:C.gold }}>#{myRankEntry.rank}</span>
              </div>
              <TierBadgeSvg idx={getTierIdx(myRankEntry.tierPoints)} size={22}/>
              <span style={{ flex:1, fontSize:12, color:C.parchment, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {myRankEntry.nickname}
              </span>
              <span style={{ fontSize:9, color:C.gold, background:`${C.gold}18`, border:`1px solid ${C.gold}44`, borderRadius:3, padding:"2px 6px", fontWeight:900, flexShrink:0 }}>
                {ko?"나":"ME"}
              </span>
              <span style={{ fontFamily:"monospace", fontSize:12, color:C.gold, flexShrink:0 }}>{myRankEntry.tierPoints.toLocaleString()}</span>
            </div>
          )}

          {/* 랭킹 리스트 */}
          <div>
            {rankPage5.map((entry, ri) => {
              const isMe      = entry.userId === user?.id;
              const eti       = getTierIdx(entry.tierPoints);
              const rankColor = entry.rank===1?"#ffd700":entry.rank===2?"#c0c0c0":entry.rank===3?"#cd7f32":C.stoneFaint;
              return (
                <div key={entry.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderBottom:`1px solid ${C.borderFaint}`, background: isMe ? `${C.gold}08` : ri%2===0 ? "transparent" : "rgba(255,255,255,0.015)", transition:"background 0.15s" }}>
                  {/* 순위 */}
                  <div style={{ width:28, textAlign:"center", flexShrink:0 }}>
                    {entry.rank <= 3 ? (
                      <span style={{ fontFamily:"monospace", fontSize:14, fontWeight:900, color:rankColor, textShadow:`0 0 8px ${rankColor}` }}>{entry.rank}</span>
                    ) : (
                      <span style={{ fontFamily:"monospace", fontSize:12, color:C.stoneFaint }}>{entry.rank}</span>
                    )}
                  </div>
                  {/* 티어 배지 */}
                  <TierBadgeSvg idx={eti} size={22}/>
                  {/* 이름 */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:0, fontSize:12, color: isMe ? C.gold : C.parchment, fontWeight: isMe ? 900 : 700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {entry.nickname}{isMe && <span style={{ fontSize:9, color:C.gold, marginLeft:4 }}>(나)</span>}
                    </p>
                    <p style={{ margin:"1px 0 0", fontFamily:"monospace", fontSize:10, color:TIERS[eti].color }}>{TIERS[eti][ko?"ko":ja?"ja":"en"]}</p>
                  </div>
                  {/* 포인트 */}
                  <span style={{ fontFamily:"monospace", fontSize:11, color:C.stone, flexShrink:0 }}>{entry.tierPoints.toLocaleString()}</span>
                  {/* 공격 버튼 */}
                  {!isMe && (
                    <button onClick={() => startAttackConfirm(entry)} disabled={tickets===0||myAtkSlots.length===0}
                      style={{ display:"flex", alignItems:"center", gap:4, background: tickets>0&&myAtkSlots.length>0 ? "linear-gradient(180deg,#c8a44a,#8b6020)" : "#1e1508", border:`2px solid ${tickets>0&&myAtkSlots.length>0?"#5a3d0e":"#2e1f06"}`, color: tickets>0&&myAtkSlots.length>0 ? "#1c1101" : C.stoneFaint, fontFamily:FONT, fontSize:10, fontWeight:900, padding:"5px 12px", borderRadius:4, cursor:tickets===0||myAtkSlots.length===0?"not-allowed":"pointer", flexShrink:0, transition:"all 0.15s", boxShadow: tickets>0&&myAtkSlots.length>0 ? "0 3px 0 #3a2508" : "none" }}>
                      <Swords size={10} strokeWidth={2.5}/>{ko?"도전":ja?"挑戦":"Fight"}
                    </button>
                  )}
                </div>
              );
            })}
            {attackableEntries.length === 0 && (
              <p style={{ textAlign:"center", padding:"20px", fontSize:12, color:C.stoneFaint }}>
                {ko?"아직 결투 상대가 없습니다":ja?"対戦相手がいません":"No opponents yet"}
              </p>
            )}
          </div>

          {/* 페이지네이션 */}
          {rankTotalPages > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:"10px", borderTop:`1px solid ${C.borderFaint}`, background:"rgba(0,0,0,0.2)" }}>
              <button onClick={() => setRankPage(p => Math.max(0, p-1))} disabled={rankPage===0}
                style={{ background: rankPage===0?"transparent":"rgba(200,164,74,0.12)", border:`1px solid ${rankPage===0?C.borderFaint:C.border}`, borderRadius:5, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:rankPage===0?"not-allowed":"pointer", color: rankPage===0?C.borderFaint:C.gold, transition:"all 0.15s" }}>
                <ChevronLeft size={15}/>
              </button>
              <div style={{ display:"flex", gap:4 }}>
                {Array.from({length:Math.min(rankTotalPages,5)},(_,i)=>{
                  const pg = rankTotalPages<=5 ? i : Math.max(0,Math.min(rankPage-2,rankTotalPages-5))+i;
                  return (
                    <button key={pg} onClick={()=>setRankPage(pg)}
                      style={{ width:24, height:24, borderRadius:4, border:"none", background: pg===rankPage?C.gold:"transparent", color: pg===rankPage?"#1c1101":C.stoneFaint, fontFamily:"monospace", fontSize:11, fontWeight:900, cursor:"pointer" }}>
                      {pg+1}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setRankPage(p => Math.min(rankTotalPages-1, p+1))} disabled={rankPage>=rankTotalPages-1}
                style={{ background: rankPage>=rankTotalPages-1?"transparent":"rgba(200,164,74,0.12)", border:`1px solid ${rankPage>=rankTotalPages-1?C.borderFaint:C.border}`, borderRadius:5, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:rankPage>=rankTotalPages-1?"not-allowed":"pointer", color: rankPage>=rankTotalPages-1?C.borderFaint:C.gold, transition:"all 0.15s" }}>
                <ChevronRight size={15}/>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
