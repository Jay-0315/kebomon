import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Layers, Swords, Shield, Heart, RefreshCw,
  ShoppingCart, Skull, Trophy, Star, X, Flame, ChevronRight, Crown,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, ROGUE_TYPE_MAP, type CharacterType, type CharacterRarity, getCharName } from "../data/characters";
import { useLang } from "../context/LangContext";
import type { RogueMilestone, ChallengeResult, ChallengeRankRow } from "../types/domain";

const FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";

const C_DARK = {
  bg:        "#060d1a",
  panel:     "#0d1525",
  panelDark: "#081018",
  border:    "#1a2840",
  gold:      "#f59e0b",
  text:      "#cbd5e1",
  textBright:"#e2e8f0",
  textDim:   "#64748b",
  red:       "#ef4444",
  green:     "#22c55e",
  blue:      "#3b82f6",
};
const C_LIGHT = {
  bg:        "#1a2035",
  panel:     "#222a45",
  panelDark: "#151c30",
  border:    "#2e3f60",
  gold:      "#f59e0b",
  text:      "#c8d4f0",
  textBright:"#e6eeff",
  textDim:   "#7888b0",
  red:       "#ef4444",
  green:     "#22c55e",
  blue:      "#3b82f6",
};

// module-level alias for sub-components (CardView, HpBar, etc.)
const C = C_DARK;

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setIsDark(el.classList.contains("dark")));
    obs.observe(el, { attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

const RARITY_STYLE: Record<string, { border: string; glow: string; badge: string }> = {
  common:    { border:"#475569", glow:"#1e293b44", badge:"#64748b" },
  uncommon:  { border:"#15803d", glow:"#052e1644", badge:"#16a34a" },
  rare:      { border:"#1d4ed8", glow:"#082f4944", badge:"#2563eb" },
  epic:      { border:"#7e22ce", glow:"#2e106544", badge:"#9333ea" },
  legendary: { border:"#b45309", glow:"#451a0344", badge:"#d97706" },
};

const TYPE_BG: Record<string, string> = {
  attack: "#1c0a0a",
  skill:  "#0a0e1c",
  power:  "#1c1500",
};
const TYPE_ACCENT: Record<string, string> = {
  attack: "#ef4444",
  skill:  "#3b82f6",
  power:  "#f59e0b",
};

// ── Types ──────────────────────────────────────────────────────────────────
type CardType   = "attack" | "skill" | "power";
type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type NodeType   = "fight" | "elite" | "treasure" | "shop" | "rest" | "boss";
type Phase      = "lobby" | "map" | "battle" | "reward" | "shop" | "rest" | "gameover" | "victory";
type Intent     = "attack" | "defend" | "buff" | "poison";

interface CardDef {
  id: string; name: string; nameJa: string; nameEn: string;
  cost: number; type: CardType; rarity: CardRarity;
  desc: string; descJa: string; descEn: string; archetype: string;
  damage?: number; shield?: number; draw?: number;
  poison?: number; strength?: number; heal?: number;
  multiHit?: number; bonusEnergy?: number; selfDamage?: number;
}
interface CardInstance extends CardDef { uid: string }

interface EnemyPattern {
  intent: Intent; value: number;
  poison?: number; shield?: number; strength?: number;
}
interface EnemyDef {
  id: string; name: string; nameJa: string; nameEn: string;
  charType: CharacterType; hp: number;
  patterns: EnemyPattern[]; isBoss?: boolean;
}
interface EnemyState extends EnemyDef {
  currentHp: number; currentShield: number;
  currentStrength: number; poisonStacks: number; patternIdx: number;
}
interface GameState {
  phase: Phase; floor: number;
  mode: RunMode;
  difficulty: Difficulty;
  mapLayout: { options: NodeType[] }[];
  chosenPath: NodeType[];
  playerHp: number; playerMaxHp: number;
  shield: number; strength: number; poison: number;
  energy: number; maxEnergy: number;
  deck: CardInstance[]; hand: CardInstance[];
  drawPile: CardInstance[]; discardPile: CardInstance[];
  gold: number; enemy: EnemyState | null;
  log: string[]; rewardCards: CardDef[];
  shopItems: { card: CardDef; price: number; bought: boolean }[];
  turnCount: number;
  chainPending: EnemyState | null;
  cursedRest: boolean;
  shopInflated: boolean;
}

// ── Card pool ─────────────────────────────────────────────────────────────
const CARDS: CardDef[] = [
  // Universal
  { id:"strike",       name:"스트라이크",   nameJa:"ストライク",       nameEn:"Strike",        cost:1,type:"attack",rarity:"common",   desc:"6 데미지",            descJa:"6ダメージ",           descEn:"Deal 6 damage",                   archetype:"all",     damage:6 },
  { id:"defend",       name:"방어",         nameJa:"ディフェンス",      nameEn:"Defend",        cost:1,type:"skill", rarity:"common",   desc:"방어력 5",            descJa:"シールド5",           descEn:"Gain 5 shield",                   archetype:"all",     shield:5 },
  { id:"bash",         name:"강타",         nameJa:"バッシュ",          nameEn:"Bash",          cost:2,type:"attack",rarity:"uncommon", desc:"14 데미지",           descJa:"14ダメージ",          descEn:"Deal 14 damage",                  archetype:"all",     damage:14 },
  { id:"fortify",      name:"요새화",       nameJa:"フォーティファイ",  nameEn:"Fortify",       cost:2,type:"skill", rarity:"uncommon", desc:"방어력 12",           descJa:"シールド12",          descEn:"Gain 12 shield",                  archetype:"all",     shield:12 },
  { id:"dual_strike",  name:"연타",         nameJa:"二連打",            nameEn:"Dual Strike",   cost:1,type:"attack",rarity:"uncommon", desc:"4 데미지 × 2",       descJa:"4ダメージ×2",         descEn:"Deal 4 damage twice",             archetype:"all",     damage:4, multiHit:2 },
  { id:"quick_guard",  name:"속방어",       nameJa:"素早い防御",        nameEn:"Quick Guard",   cost:1,type:"skill", rarity:"common",   desc:"방어력 3, 드로우 1",  descJa:"シールド3・ドロー1",  descEn:"Gain 3 shield, draw 1",           archetype:"all",     shield:3,draw:1 },
  { id:"power_surge",  name:"파워 서지",    nameJa:"パワーサージ",      nameEn:"Power Surge",   cost:3,type:"attack",rarity:"rare",     desc:"20 데미지",           descJa:"20ダメージ",          descEn:"Deal 20 damage",                  archetype:"all",     damage:20 },
  { id:"iron_wall",    name:"철벽",         nameJa:"鉄壁",              nameEn:"Iron Wall",     cost:3,type:"skill", rarity:"rare",     desc:"방어력 18",           descJa:"シールド18",          descEn:"Gain 18 shield",                  archetype:"all",     shield:18 },
  { id:"battle_cry",   name:"전투 함성",    nameJa:"バトルクライ",      nameEn:"Battle Cry",    cost:1,type:"power", rarity:"rare",     desc:"힘 +2 (영구)",        descJa:"力+2（永続）",        descEn:"Gain 2 strength (permanent)",     archetype:"all",     strength:2 },
  { id:"second_wind",  name:"재기",         nameJa:"セカンドウィンド",  nameEn:"Second Wind",   cost:2,type:"skill", rarity:"epic",     desc:"방어력 8, 드로우 2",  descJa:"シールド8・ドロー2",  descEn:"Gain 8 shield, draw 2",           archetype:"all",     shield:8,draw:2 },
  // Warrior
  { id:"war_howl",     name:"전쟁의 외침",  nameJa:"戦の咆哮",          nameEn:"War Howl",      cost:1,type:"power", rarity:"uncommon", desc:"힘 +1, 드로우 1",     descJa:"力+1・ドロー1",      descEn:"Gain 1 strength, draw 1",         archetype:"warrior", strength:1,draw:1 },
  { id:"feral_strike", name:"야성 연타",    nameJa:"野性連打",          nameEn:"Feral Strike",  cost:1,type:"attack",rarity:"rare",     desc:"5 데미지 × 2",       descJa:"5ダメージ×2",         descEn:"Deal 5 damage twice",             archetype:"warrior", damage:5,multiHit:2 },
  { id:"alpha_wrath",  name:"알파의 분노",  nameJa:"アルファの怒り",    nameEn:"Alpha's Wrath", cost:2,type:"attack",rarity:"epic",     desc:"18 데미지, 힘 +1",    descJa:"18ダメージ・力+1",   descEn:"Deal 18 damage, gain 1 strength", archetype:"warrior", damage:18,strength:1 },
  { id:"war_cry",      name:"전쟁의 함성",  nameJa:"戦いの叫び",        nameEn:"War Cry",       cost:2,type:"power", rarity:"rare",     desc:"힘 +3",               descJa:"力+3",               descEn:"Gain 3 strength",                 archetype:"warrior", strength:3 },
  { id:"reckless",     name:"무모한 공격",  nameJa:"無謀な攻撃",        nameEn:"Reckless Swing",cost:0,type:"attack",rarity:"uncommon", desc:"7 데미지, 자신 2 피해",descJa:"7ダメージ・自身2",   descEn:"Deal 7 damage, take 2",           archetype:"warrior", damage:7,selfDamage:2 },
  // Rogue
  { id:"scratch",      name:"할퀴기",       nameJa:"引っ掻き",          nameEn:"Scratch",       cost:0,type:"attack",rarity:"common",   desc:"4 데미지",            descJa:"4ダメージ",           descEn:"Deal 4 damage",                   archetype:"rogue",   damage:4 },
  { id:"pounce",       name:"도약 공격",    nameJa:"飛び掛かり",        nameEn:"Pounce",        cost:1,type:"attack",rarity:"uncommon", desc:"8 데미지, 에너지 +1", descJa:"8ダメージ・エナジー+1",descEn:"Deal 8 damage, gain 1 energy",   archetype:"rogue", damage:8,bonusEnergy:1 },
  { id:"smoke_bomb",   name:"연막탄",       nameJa:"煙幕弾",            nameEn:"Smoke Bomb",    cost:1,type:"skill", rarity:"rare",     desc:"방어력 10, 드로우 1", descJa:"シールド10・ドロー1", descEn:"Gain 10 shield, draw 1",          archetype:"rogue",  shield:10,draw:1 },
  { id:"swift_strike", name:"신속 공격",    nameJa:"迅速打",            nameEn:"Swift Strike",  cost:1,type:"attack",rarity:"common",   desc:"5 데미지, 드로우 1",  descJa:"5ダメージ・ドロー1",  descEn:"Deal 5 damage, draw 1",           archetype:"rogue",   damage:5,draw:1 },
  { id:"backflip",     name:"백플립",       nameJa:"バックフリップ",    nameEn:"Backflip",      cost:1,type:"skill", rarity:"uncommon", desc:"방어력 6, 드로우 2",  descJa:"シールド6・ドロー2",  descEn:"Gain 6 shield, draw 2",           archetype:"rogue",   shield:6,draw:2 },
  // Mage
  { id:"soul_drain",   name:"영혼 흡수",    nameJa:"魂の吸収",          nameEn:"Soul Drain",    cost:2,type:"attack",rarity:"uncommon", desc:"10 데미지, HP +5",    descJa:"10ダメージ・HP+5",   descEn:"Deal 10 damage, heal 5 HP",       archetype:"mage",    damage:10,heal:5 },
  { id:"haunt",        name:"저주",         nameJa:"呪い",              nameEn:"Haunt",         cost:1,type:"attack",rarity:"uncommon", desc:"6 데미지, 독 2",      descJa:"6ダメージ・毒2",      descEn:"Deal 6 damage, apply 2 poison",   archetype:"mage",    damage:6,poison:2 },
  { id:"arcane_surge", name:"비전 서지",    nameJa:"アーケインサージ",  nameEn:"Arcane Surge",  cost:2,type:"attack",rarity:"rare",     desc:"16 데미지, 드로우 1", descJa:"16ダメージ・ドロー1", descEn:"Deal 16 damage, draw 1",          archetype:"mage",   damage:16,draw:1 },
  { id:"phantom_ward", name:"환영 방벽",    nameJa:"幻影の防壁",        nameEn:"Phantom Ward",  cost:1,type:"skill", rarity:"rare",     desc:"방어력 12",           descJa:"シールド12",          descEn:"Gain 12 shield",                  archetype:"mage",    shield:12 },
  { id:"curse_bolt",   name:"저주 번개",    nameJa:"呪いの稲妻",        nameEn:"Curse Bolt",    cost:2,type:"attack",rarity:"epic",     desc:"18 데미지, 독 3",     descJa:"18ダメージ・毒3",     descEn:"Deal 18 damage, apply 3 poison",  archetype:"mage",    damage:18,poison:3 },
  // Tank
  { id:"shell_block",  name:"등껍질 방어",  nameJa:"甲羅防御",          nameEn:"Shell Block",   cost:1,type:"skill", rarity:"common",   desc:"방어력 9",            descJa:"シールド9",           descEn:"Gain 9 shield",                   archetype:"tank",    shield:9 },
  { id:"crush_bite",   name:"분쇄 물기",    nameJa:"砕く噛みつき",      nameEn:"Crush Bite",    cost:2,type:"attack",rarity:"uncommon", desc:"13 데미지",           descJa:"13ダメージ",          descEn:"Deal 13 damage",                  archetype:"tank",    damage:13 },
  { id:"fortress",     name:"요새",         nameJa:"要塞",              nameEn:"Fortress",      cost:2,type:"skill", rarity:"rare",     desc:"방어력 16, 힘 +1",    descJa:"シールド16・力+1",   descEn:"Gain 16 shield, gain 1 strength", archetype:"tank",    shield:16,strength:1 },
  { id:"body_slam",    name:"몸통 박치기",  nameJa:"体当たり",          nameEn:"Body Slam",     cost:2,type:"attack",rarity:"rare",     desc:"10 데미지, 방어력 8", descJa:"10ダメージ・シールド8",descEn:"Deal 10 damage, gain 8 shield",  archetype:"tank",  damage:10,shield:8 },
  { id:"endure",       name:"인내",         nameJa:"忍耐",              nameEn:"Endure",        cost:0,type:"skill", rarity:"rare",     desc:"방어력 7",            descJa:"シールド7",           descEn:"Gain 7 shield",                   archetype:"tank",    shield:7 },
  // Nature
  { id:"thorn_strike", name:"가시 공격",    nameJa:"棘攻撃",            nameEn:"Thorn Strike",  cost:1,type:"attack",rarity:"common",   desc:"7 데미지",            descJa:"7ダメージ",           descEn:"Deal 7 damage",                   archetype:"nature",  damage:7 },
  { id:"spore_cloud",  name:"포자 구름",    nameJa:"胞子の雲",          nameEn:"Spore Cloud",   cost:1,type:"skill", rarity:"uncommon", desc:"독 3, 방어력 4",      descJa:"毒3・シールド4",      descEn:"Apply 3 poison, gain 4 shield",   archetype:"nature",  poison:3,shield:4 },
  { id:"rejuvenate",   name:"재생",         nameJa:"再生",              nameEn:"Rejuvenate",    cost:2,type:"skill", rarity:"rare",     desc:"HP +14",              descJa:"HP+14",               descEn:"Heal 14 HP",                      archetype:"nature",  heal:14 },
  { id:"vine_lash",    name:"넝쿨 채찍",    nameJa:"蔓の鞭",            nameEn:"Vine Lash",     cost:1,type:"attack",rarity:"uncommon", desc:"8 데미지, 독 1",      descJa:"8ダメージ・毒1",      descEn:"Deal 8 damage, apply 1 poison",   archetype:"nature",  damage:8,poison:1 },
  { id:"photosyn",     name:"광합성",       nameJa:"光合成",            nameEn:"Photosynthesis",cost:2,type:"skill", rarity:"epic",     desc:"HP +8, 드로우 2",     descJa:"HP+8・ドロー2",       descEn:"Heal 8 HP, draw 2",               archetype:"nature",  heal:8,draw:2 },
  // Wild
  { id:"overclock",    name:"오버클록",     nameJa:"オーバークロック",  nameEn:"Overclock",     cost:1,type:"power", rarity:"uncommon", desc:"에너지 +2",           descJa:"エナジー+2",          descEn:"Gain 2 energy",                   archetype:"wild",    bonusEnergy:2 },
  { id:"self_repair",  name:"자가 수리",    nameJa:"自己修復",          nameEn:"Self-Repair",   cost:2,type:"skill", rarity:"rare",     desc:"방어력 8, HP +8",     descJa:"シールド8・HP+8",     descEn:"Gain 8 shield, heal 8 HP",        archetype:"wild",    shield:8,heal:8 },
  { id:"absorb",       name:"흡수",         nameJa:"吸収",              nameEn:"Absorb",        cost:1,type:"skill", rarity:"uncommon", desc:"방어력 8",            descJa:"シールド8",           descEn:"Gain 8 shield",                   archetype:"wild",    shield:8 },
  { id:"replicate",    name:"복제",         nameJa:"複製",              nameEn:"Replicate",     cost:2,type:"skill", rarity:"epic",     desc:"드로우 3",            descJa:"ドロー3",             descEn:"Draw 3 cards",                    archetype:"wild",    draw:3 },
  { id:"shock_blast",  name:"충격 파동",    nameJa:"衝撃波",            nameEn:"Shock Blast",   cost:2,type:"attack",rarity:"rare",     desc:"12 데미지, 독 2",     descJa:"12ダメージ・毒2",     descEn:"Deal 12 damage, apply 2 poison",  archetype:"wild",    damage:12,poison:2 },
  // Legendary
  { id:"final_strike", name:"최후의 일격",  nameJa:"最後の一撃",        nameEn:"Final Strike",  cost:3,type:"attack",rarity:"legendary",desc:"25 데미지",           descJa:"25ダメージ",          descEn:"Deal 25 damage",                  archetype:"all",     damage:25 },
  { id:"immortal",     name:"불멸",         nameJa:"不滅",              nameEn:"Immortal",      cost:3,type:"skill", rarity:"legendary",desc:"방어력 20, HP +20",   descJa:"シールド20・HP+20",  descEn:"Gain 20 shield, heal 20 HP",      archetype:"all",     shield:20,heal:20 },
  { id:"berserker",    name:"광전사",       nameJa:"バーサーカー",      nameEn:"Berserker",     cost:2,type:"attack",rarity:"legendary",desc:"6 데미지 × 4",       descJa:"6ダメージ×4",         descEn:"Deal 6 damage four times",        archetype:"warrior", damage:6,multiHit:4 },
  { id:"shadow_realm", name:"암흑 영역",    nameJa:"暗黒領域",          nameEn:"Shadow Realm",  cost:3,type:"attack",rarity:"legendary",desc:"20 데미지, 독 5",     descJa:"20ダメージ・毒5",     descEn:"Deal 20 damage, apply 5 poison",  archetype:"mage",    damage:20,poison:5 },
  { id:"ancient_armor",name:"고대의 갑옷",  nameJa:"古代の鎧",          nameEn:"Ancient Armor", cost:3,type:"skill", rarity:"legendary",desc:"방어력 25, 힘 +2",    descJa:"シールド25・力+2",   descEn:"Gain 25 shield, gain 2 strength", archetype:"tank",    shield:25,strength:2 },
];

// ── Difficulty ─────────────────────────────────────────────────────────────
type Difficulty = "normal" | "hard" | "hell" | "challenge";
type RunMode = "story" | "challenge";
const DIFF_HP_MULT:  Record<Difficulty, number> = { normal:1.0, hard:1.5, hell:2.2, challenge:1.6 };
const DIFF_ATK_BONUS:Record<Difficulty, number> = { normal:0,   hard:4,   hell:10,  challenge:6   };
const DIFF_STR_BONUS:Record<Difficulty, number> = { normal:0,   hard:0,   hell:2,   challenge:1   };
const DIFF_GOLD_FIGHT:Record<Difficulty,number> = { normal:50,  hard:65,  hell:80,  challenge:90  };
const DIFF_GOLD_ELITE:Record<Difficulty,number> = { normal:75,  hard:95,  hell:115, challenge:130 };
const DIFF_LEG_FLOOR: Record<Difficulty, number> = { normal:5,  hard:4,   hell:3,   challenge:1   };
const DIFF_EPIC_FLOOR:Record<Difficulty, number> = { normal:3,  hard:2,   hell:1,   challenge:1   };

// ── Challenge mode ───────────────────────────────────────────────────────────
const CHALLENGE_FLOORS = 100;
// 스테이지가 올라갈수록 적 HP·공격력이 계속 증가 (floor = 0-index)
function challengeHpMult(floor: number): number { return 1 + floor * 0.10; }   // stage100 ≈ ×10.9
function challengeAtkBonus(floor: number): number { return Math.floor(floor * 0.6); } // stage100 ≈ +59
// 매 칸 랜덤 선택지 2개 (기존 로그라이크처럼). 10칸마다 엘리트 보장, 마지막은 최종 보스
function challengeFloorOptions(i: number): NodeType[] {
  if (i >= CHALLENGE_FLOORS - 1) return ["boss"];
  if ((i + 1) % 10 === 0) return shuffle(["elite", Math.random() < 0.5 ? "rest" : "treasure"] as NodeType[]);
  const PAIRS: NodeType[][] = [
    ["fight", "treasure"], ["fight", "rest"], ["fight", "shop"],
    ["fight", "elite"],    ["elite", "treasure"], ["elite", "rest"],
    ["fight", "rest"],     ["fight", "treasure"], ["rest", "shop"],
  ];
  return shuffle([...PAIRS[(Math.random() * PAIRS.length) | 0]]);
}
function generateChallengeMap(): { options: NodeType[] }[] {
  return Array.from({ length: CHALLENGE_FLOORS }, (_, i) => ({ options: challengeFloorOptions(i) }));
}

// ── Enemies ────────────────────────────────────────────────────────────────
const ENEMY_DEFS: EnemyDef[] = [
  // Normal tier
  { id:"goblin",      name:"슬라임 고블린",  nameJa:"スライムゴブリン",  nameEn:"Slime Goblin",    charType:"slime",   hp:30,  patterns:[{intent:"attack",value:6},{intent:"attack",value:6},{intent:"defend",value:0,shield:5},{intent:"attack",value:8}] },
  { id:"skeleton",    name:"해골 전사",      nameJa:"スケルトン戦士",    nameEn:"Skeleton Warrior", charType:"ghost",   hp:38,  patterns:[{intent:"attack",value:7},{intent:"defend",value:0,shield:6},{intent:"attack",value:9},{intent:"attack",value:7}] },
  { id:"orc",         name:"오크 투사",      nameJa:"オーク戦士",        nameEn:"Orc Fighter",      charType:"bear",    hp:55,  patterns:[{intent:"attack",value:10},{intent:"attack",value:10},{intent:"defend",value:0,shield:8},{intent:"attack",value:13}] },
  { id:"darkknight",  name:"흑기사",         nameJa:"黒騎士",            nameEn:"Dark Knight",      charType:"wolf",    hp:80,  patterns:[{intent:"defend",value:0,shield:10},{intent:"attack",value:12},{intent:"attack",value:12},{intent:"buff",value:0,strength:2},{intent:"attack",value:14}] },
  { id:"poisonwitch", name:"독 마녀",        nameJa:"毒の魔女",          nameEn:"Poison Witch",     charType:"plant",   hp:65,  patterns:[{intent:"poison",value:7,poison:2},{intent:"poison",value:7,poison:2},{intent:"buff",value:0,strength:2},{intent:"attack",value:10}] },
  { id:"shadowdragon",name:"그림자 드래곤",  nameJa:"シャドウドラゴン",  nameEn:"Shadow Dragon",    charType:"dragon",  hp:95,  patterns:[{intent:"attack",value:14},{intent:"attack",value:14},{intent:"defend",value:0,shield:12},{intent:"attack",value:18},{intent:"defend",value:0,shield:8}] },
  // Hard+ tier
  { id:"voidwarden",  name:"허공의 수호자",  nameJa:"虚空の守護者",      nameEn:"Void Warden",      charType:"owl",     hp:110, patterns:[{intent:"defend",value:0,shield:14},{intent:"attack",value:13},{intent:"attack",value:13},{intent:"buff",value:0,strength:2},{intent:"attack",value:16}] },
  { id:"irongolem",   name:"강철 골렘",      nameJa:"鋼鉄ゴーレム",      nameEn:"Iron Golem",       charType:"robot",   hp:120, patterns:[{intent:"attack",value:16},{intent:"defend",value:0,shield:18},{intent:"attack",value:16},{intent:"buff",value:0,strength:2},{intent:"attack",value:20}] },
  // Hell tier
  { id:"hellspawn",   name:"지옥의 자식",    nameJa:"地獄の子",          nameEn:"Hellspawn",        charType:"demon",   hp:130, patterns:[{intent:"poison",value:10,poison:3},{intent:"attack",value:14},{intent:"attack",value:14},{intent:"poison",value:12,poison:2},{intent:"buff",value:0,strength:3}] },
  // Bosses
  { id:"chaosboss",   name:"카오스 드래곤",  nameJa:"カオスドラゴン",    nameEn:"Chaos Dragon",     charType:"demon",   hp:160, isBoss:true, patterns:[{intent:"attack",value:16},{intent:"attack",value:16},{intent:"defend",value:0,shield:15},{intent:"poison",value:12,poison:3},{intent:"buff",value:0,strength:3},{intent:"attack",value:20}] },
  { id:"infernodragon",name:"지옥 화염룡",  nameJa:"地獄炎竜",           nameEn:"Inferno Dragon",   charType:"phoenix", hp:280, isBoss:true, patterns:[{intent:"attack",value:22},{intent:"attack",value:22},{intent:"defend",value:0,shield:20},{intent:"poison",value:16,poison:4},{intent:"buff",value:0,strength:4},{intent:"attack",value:26},{intent:"attack",value:18}] },
];

// ── Maps ───────────────────────────────────────────────────────────────────
// Normal (7F)
const FIGHT_POOL: string[][] = [
  ["goblin"],
  ["goblin","skeleton"],
  ["skeleton","orc"],
  ["orc","darkknight"],
  ["darkknight","poisonwitch"],
  ["poisonwitch","shadowdragon"],
];
const ELITE_POOL: string[][] = [
  ["skeleton"],
  ["orc"],
  ["darkknight"],
  ["poisonwitch"],
  ["shadowdragon"],
  ["shadowdragon"],
];
// Hard (10F)
const HARD_FIGHT_POOL: string[][] = [
  ["goblin"],
  ["goblin","skeleton"],
  ["skeleton","orc"],
  ["orc","darkknight"],
  ["darkknight","poisonwitch"],
  ["poisonwitch","shadowdragon"],
  ["shadowdragon"],
  ["shadowdragon","voidwarden"],
  ["voidwarden","irongolem"],
];
const HARD_ELITE_POOL: string[][] = [
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
const HELL_FIGHT_POOL: string[][] = [
  ["goblin","skeleton"],
  ["skeleton","orc"],
  ["orc","darkknight"],
  ["darkknight","poisonwitch"],
  ["poisonwitch","shadowdragon"],
  ["shadowdragon"],
  ["shadowdragon","voidwarden"],
  ["voidwarden"],
  ["voidwarden","irongolem"],
  ["irongolem"],
  ["irongolem","hellspawn"],
  ["hellspawn"],
  ["hellspawn","irongolem"],
  ["hellspawn"],
];
const HELL_ELITE_POOL: string[][] = [
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
  ["hellspawn","irongolem"],
  ["hellspawn"],
];

function ms(floor: number, alt: NodeType): NodeType {
  return floor >= 3 && Math.random() < 0.65 ? "shop" : alt;
}
function generateMap(diff: Difficulty = "normal"): { options: NodeType[] }[] {
  if (diff === "hard") return [
    { options: shuffle(["fight","treasure"]              as NodeType[]) },
    { options: shuffle(["fight","rest"]                  as NodeType[]) },
    { options: shuffle(["fight","rest"]                  as NodeType[]) },
    { options: shuffle(["elite","treasure"]              as NodeType[]) },
    { options: shuffle(["fight", ms(4,"rest")]           as NodeType[]) },
    { options: shuffle(["elite","rest"]                  as NodeType[]) },
    { options: shuffle(["fight", ms(6,"treasure")]       as NodeType[]) },
    { options: shuffle(["elite", ms(7,"rest")]           as NodeType[]) },
    { options: shuffle([ms(8,"rest"),"fight"]            as NodeType[]) },
    { options: ["boss" as NodeType] },
  ];
  if (diff === "hell") return [
    { options: shuffle(["fight","treasure"]              as NodeType[]) },
    { options: shuffle(["fight","rest"]                  as NodeType[]) },
    { options: shuffle(["fight","rest"]                  as NodeType[]) },
    { options: shuffle(["elite","treasure"]              as NodeType[]) },
    { options: shuffle(["fight", ms(4,"rest")]           as NodeType[]) },
    { options: shuffle(["elite", ms(5,"rest")]           as NodeType[]) },
    { options: shuffle(["fight", ms(6,"treasure")]       as NodeType[]) },
    { options: shuffle(["elite", ms(7,"rest")]           as NodeType[]) },
    { options: shuffle(["fight", ms(8,"rest")]           as NodeType[]) },
    { options: shuffle(["elite","treasure"]              as NodeType[]) },
    { options: shuffle([ms(10,"fight"), ms(10,"rest")]   as NodeType[]) },
    { options: shuffle(["elite","rest"]                  as NodeType[]) },
    { options: shuffle(["fight","elite"]                 as NodeType[]) },
    { options: shuffle([ms(13,"rest"), ms(13,"fight")]   as NodeType[]) },
    { options: ["boss" as NodeType] },
  ];
  return [
    { options: shuffle(["fight","treasure"]              as NodeType[]) },
    { options: shuffle(["fight","rest"]                  as NodeType[]) },
    { options: shuffle(["fight","rest"]                  as NodeType[]) },
    { options: shuffle(["elite", ms(3,"treasure")]       as NodeType[]) },
    { options: shuffle([ms(4,"fight"),"rest"]            as NodeType[]) },
    { options: shuffle(["rest","fight"]                  as NodeType[]) },
    { options: ["boss" as NodeType] },
  ];
}

const ARCHETYPE_MAP: Partial<Record<CharacterType,string>> = {
  wolf:"warrior", tiger:"warrior", lion:"warrior", bear:"warrior", eagle:"warrior", boar:"warrior",
  cat:"rogue",    fox:"rogue",     rabbit:"rogue", monkey:"rogue", raven:"rogue",   deer:"rogue",
  ghost:"mage",   owl:"mage",      dragon:"mage",  demon:"mage",   angel:"mage",    phoenix:"mage",
  turtle:"tank",  elephant:"tank", whale:"tank",   beetle:"tank",  crocodile:"tank",
  plant:"nature", fish:"nature",   snake:"nature", unicorn:"nature",horse:"nature",
  robot:"wild",   slime:"wild",
};

const RARITY_HP: Record<CharacterRarity,number> = { common:70, uncommon:75, rare:80, epic:85, legendary:90, mythic:100 };
const CARD_PRICE: Record<CardRarity,number>      = { common:40, uncommon:60, rare:90, epic:130, legendary:180 };

// ── Utilities ──────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function uid() { return Math.random().toString(36).slice(2,9); }
function toInst(d: CardDef): CardInstance { return { ...d, uid: uid() }; }

function drawN(
  hand: CardInstance[], draw: CardInstance[], disc: CardInstance[], n: number
) {
  let h=[...hand], d=[...draw], di=[...disc];
  for (let i=0;i<n;i++) {
    if (d.length===0) { if (di.length===0) break; d=shuffle(di); di=[]; }
    if (d.length>0) { h=[...h,d[0]]; d=d.slice(1); }
  }
  return { hand: h.slice(0,7), drawPile:d, discardPile:di };
}

function makeStarterDeck(type: CharacterType): CardInstance[] {
  const arch = ARCHETYPE_MAP[type] ?? "all";
  const ARCH_STARTERS: Record<string,string[]> = {
    warrior:["war_howl","war_howl","reckless"],
    rogue:  ["swift_strike","swift_strike","scratch"],
    mage:   ["haunt","haunt","soul_drain"],
    tank:   ["shell_block","shell_block","endure"],
    nature: ["thorn_strike","thorn_strike","spore_cloud"],
    wild:   ["absorb","absorb","overclock"],
    all:    ["quick_guard","quick_guard","battle_cry"],
  };
  const ids = ["strike","strike","strike","strike","defend","defend","defend",...(ARCH_STARTERS[arch]??ARCH_STARTERS.all)];
  return shuffle(ids.map(id=>CARDS.find(c=>c.id===id)!).filter(Boolean)).map(toInst);
}

function pickRewards(floor: number, arch: string, diff: Difficulty = "normal"): CardDef[] {
  const allowLeg = floor >= DIFF_LEG_FLOOR[diff];
  const allowEpicFloor = DIFF_EPIC_FLOOR[diff];
  const pool = CARDS.filter(c => {
    if (c.rarity==="legendary" && !allowLeg) return false;
    if (c.rarity==="epic" && floor<allowEpicFloor) return false;
    return c.archetype===arch || c.archetype==="all";
  });
  const weighted: CardDef[] = [];
  for (const c of pool) {
    const w = ({common:5,uncommon:4,rare:3,epic:2,legendary:1} as Record<string,number>)[c.rarity]??1;
    for (let i=0;i<w;i++) weighted.push(c);
  }
  const seen = new Set<string>(); const res: CardDef[] = [];
  for (const c of shuffle(weighted)) {
    if (!seen.has(c.id)) { seen.add(c.id); res.push(c); if (res.length===3) break; }
  }
  while (res.length<3) {
    const fb = CARDS.find(c=>!seen.has(c.id));
    if (fb) { seen.add(fb.id); res.push(fb); } else break;
  }
  return res;
}

function makeShopItems(arch: string, inflated = false) {
  const pool = shuffle(CARDS.filter(c=>c.archetype===arch||c.archetype==="all")).slice(0,3);
  const mult = inflated ? 1.5 : 1.0;
  return pool.map(card=>({ card, price: Math.ceil((CARD_PRICE[card.rarity]??60) * mult / 10) * 10, bought:false }));
}

function spawnEnemyForFloor(floor: number, nodeType: "fight"|"elite"|"boss", diff: Difficulty = "normal"): EnemyState {
  const hardTier = diff === "hell" || diff === "challenge";
  let pool: string[];
  if (nodeType==="boss") {
    pool = hardTier ? ["infernodragon"] : ["chaosboss"];
  } else if (nodeType==="elite") {
    const p = hardTier ? HELL_ELITE_POOL : diff==="hard" ? HARD_ELITE_POOL : ELITE_POOL;
    pool = p[Math.min(floor, p.length-1)];
  } else {
    const p = hardTier ? HELL_FIGHT_POOL : diff==="hard" ? HARD_FIGHT_POOL : FIGHT_POOL;
    pool = p[Math.min(floor, p.length-1)];
  }
  const id = pool[Math.floor(Math.random()*pool.length)];
  const def = ENEMY_DEFS.find(e=>e.id===id) ?? ENEMY_DEFS[0];
  // 도전 모드는 스테이지에 따라 계속 강해짐 (연속 스케일링)
  const hpMult = DIFF_HP_MULT[diff] * (diff==="challenge" ? challengeHpMult(floor) : 1);
  const atkBonus = DIFF_ATK_BONUS[diff] + (diff==="challenge" ? challengeAtkBonus(floor) : 0);
  const strBonus = DIFF_STR_BONUS[diff] + (diff==="challenge" ? Math.floor(floor/20) : 0);
  const scaledPatterns = def.patterns.map(p => ({
    ...p,
    value: (p.intent==="attack"||p.intent==="poison") ? p.value+atkBonus : p.value,
    strength: p.strength !== undefined ? p.strength+strBonus : p.strength,
  }));
  const scaledHp = Math.round(def.hp * hpMult);
  return { ...def, hp:scaledHp, patterns:scaledPatterns, currentHp:scaledHp, currentShield:0, currentStrength:0, poisonStacks:0, patternIdx:0 };
}

// ── Card Component ─────────────────────────────────────────────────────────
function CardView({ card, canPlay, onClick, selected, lang="ko" }: {
  card: CardDef; canPlay: boolean; onClick?: () => void; selected?: boolean; lang?: string;
}) {
  const rs = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.common;
  const accent = TYPE_ACCENT[card.type] ?? "#94a3b8";
  const ko = lang === "ko";
  const ja = lang === "ja";
  const cardName = ko ? card.name : ja ? card.nameJa : card.nameEn;
  const cardDesc = ko ? card.desc : ja ? card.descJa : card.descEn;
  const typeLabel = card.type === "attack"
    ? (ko ? "공격" : ja ? "攻撃" : "ATTACK")
    : card.type === "skill"
    ? (ko ? "기술" : ja ? "スキル" : "SKILL")
    : (ko ? "파워" : ja ? "パワー" : "POWER");
  const rarityLabel = card.rarity === "legendary"
    ? (ko ? "전설" : ja ? "伝説" : "Legendary")
    : card.rarity === "epic"
    ? (ko ? "에픽" : ja ? "エピック" : "Epic")
    : (ko ? "레어" : ja ? "レア" : "Rare");
  return (
    <div
      onClick={canPlay ? onClick : undefined}
      style={{
        width:90, minWidth:90, height:130, borderRadius:8,
        border:`2px solid ${selected?"#facc15":rs.border}`,
        background: TYPE_BG[card.type] ?? C.panel,
        boxShadow: canPlay ? `0 0 10px ${rs.glow}, ${selected?"0 0 16px #facc1566":""}` : "none",
        cursor: canPlay ? "pointer" : "default",
        display:"flex", flexDirection:"column", overflow:"hidden",
        opacity: canPlay ? 1 : 0.45,
        transform: selected ? "translateY(-10px)" : canPlay ? "translateY(0)" : undefined,
        transition:"transform 0.12s, box-shadow 0.12s",
        flexShrink:0, fontFamily:FONT,
      }}
    >
      {/* Cost orb */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"5px 7px 3px",
        borderBottom:`1px solid ${C.border}`,
        background:`${accent}18`,
      }}>
        <div style={{
          width:20, height:20, borderRadius:"50%",
          background: accent, display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:900, color:"#fff", flexShrink:0,
        }}>{card.cost}</div>
        <div style={{
          fontSize:9, fontWeight:700, color:accent,
          textTransform:"uppercase", letterSpacing:"0.08em",
        }}>{typeLabel}</div>
      </div>

      {/* Name */}
      <div style={{
        padding:"5px 7px 3px", fontSize:10, fontWeight:800,
        color: C.textBright, lineHeight:1.3,
      }}>{cardName}</div>

      {/* Rarity dot */}
      <div style={{ padding:"0 7px 4px", display:"flex", gap:3 }}>
        {["legendary","epic","rare","uncommon","common"].indexOf(card.rarity) < 3 ? (
          <span style={{
            fontSize:9, fontWeight:700, color: rs.badge,
            background:`${rs.badge}20`, borderRadius:3, padding:"1px 4px",
          }}>
            {rarityLabel}
          </span>
        ) : null}
      </div>

      {/* Desc */}
      <div style={{
        flex:1, padding:"0 7px 6px", fontSize:10, color: C.textDim,
        lineHeight:1.4, overflow:"hidden",
      }}>{cardDesc}</div>

      {/* Bottom accent */}
      <div style={{ height:3, background: accent, opacity:0.6 }} />
    </div>
  );
}

// ── HP Bar ─────────────────────────────────────────────────────────────────
function HpBar({ hp, max, color="#22c55e" }: { hp:number; max:number; color?:string }) {
  const pct = Math.max(0, hp/max);
  const col = pct>0.5?color:pct>0.25?"#facc15":"#ef4444";
  return (
    <div style={{ height:8, background:"#0a0a0a", borderRadius:4, overflow:"hidden" }}>
      <div style={{
        height:"100%", width:`${pct*100}%`,
        background:`linear-gradient(90deg,${col}88,${col})`,
        transition:"width 0.35s",
      }}/>
    </div>
  );
}

// ── Intent badge ───────────────────────────────────────────────────────────
function IntentBadge({ pattern, ko, ja=false }: { pattern: EnemyPattern; ko: boolean; ja?: boolean }) {
  const intentInfo: Record<Intent,{label:string;labelJa:string;labelEn:string;color:string;icon:React.ReactNode;poisonSuffix:string;poisonSuffixJa:string;poisonSuffixEn:string}> = {
    attack:  { label:"공격", labelJa:"攻撃", labelEn:"Attack",  color:"#ef4444", icon:<Swords size={12}/>, poisonSuffix:" + 독", poisonSuffixJa:" + 毒", poisonSuffixEn:" + poison " },
    defend:  { label:"방어", labelJa:"防御", labelEn:"Defend",  color:"#3b82f6", icon:<Shield size={12}/>, poisonSuffix:" + 독", poisonSuffixJa:" + 毒", poisonSuffixEn:" + poison " },
    buff:    { label:"강화", labelJa:"強化", labelEn:"Buff",    color:"#f59e0b", icon:<Star size={12}/>,   poisonSuffix:" + 독", poisonSuffixJa:" + 毒", poisonSuffixEn:" + poison " },
    poison:  { label:"독 공격", labelJa:"毒攻撃", labelEn:"Poison", color:"#a855f7", icon:<Flame size={12}/>, poisonSuffix:" + 독", poisonSuffixJa:" + 毒", poisonSuffixEn:" + poison " },
  };
  const info = intentInfo[pattern.intent] ?? intentInfo.attack;
  const val = pattern.intent==="attack"||pattern.intent==="poison" ? pattern.value
    : pattern.shield ?? pattern.strength ?? pattern.value;
  const intentLabel = ko ? info.label : ja ? info.labelJa : info.labelEn;
  const poisonText = pattern.poison
    ? (ko ? `${info.poisonSuffix}${pattern.poison}` : ja ? `${info.poisonSuffixJa}${pattern.poison}` : `${info.poisonSuffixEn}${pattern.poison}`)
    : "";
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:5,
      background:`${info.color}18`, border:`1px solid ${info.color}44`,
      borderRadius:6, padding:"4px 10px", color: info.color,
      fontFamily:FONT, fontSize:12, fontWeight:700,
    }}>
      {info.icon}
      {intentLabel} {val}{poisonText}
    </div>
  );
}

// ── Node icon ──────────────────────────────────────────────────────────────
function NodeIcon({ type, size=20 }: { type: NodeType; size?:number }) {
  const map: Record<NodeType,{icon:React.ReactNode;color:string}> = {
    fight:    { icon:<Swords size={size}/>,      color:"#ef4444" },
    elite:    { icon:<Skull size={size}/>,        color:"#f97316" },
    treasure: { icon:<Star size={size}/>,         color:"#f59e0b" },
    shop:     { icon:<ShoppingCart size={size}/>, color:"#22c55e" },
    rest:     { icon:<Flame size={size}/>,        color:"#60a5fa" },
    boss:     { icon:<Trophy size={size}/>,       color:"#ec4899" },
  };
  const info = map[type] ?? map.fight;
  return <span style={{ color: info.color }}>{info.icon}</span>;
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function RoguePage() {
  const { rewardSummary, completeRogue, submitChallenge, fetchChallengeRankings } = useAppData();
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const isDark = useIsDark();
  const C = isDark ? C_DARK : C_LIGHT;

  const equippedId = rewardSummary.equippedCharacterId ?? CHARACTERS[0].id;
  const myChar = CHARACTERS.find(c=>c.id===equippedId) ?? CHARACTERS[0];
  const arch = ARCHETYPE_MAP[myChar.type] ?? "all";

  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gs, setGs] = useState<GameState | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [rogueMilestones, setRogueMilestones] = useState<RogueMilestone[]>([]);
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [rogueDmgNums, setRogueDmgNums] = useState<{id:number;dmg:number;side:"enemy"|"player"}[]>([]);
  const [cardEffect, setCardEffect] = useState<{effectType:"attack"|"shield"|"heal"|"power";multiHit?:number;id:number}|null>(null);
  const prevEnemyHpRef = useRef<number|null>(null);
  const prevPlayerHpRef = useRef<number|null>(null);
  const victoryCountedRef = useRef(false);
  const completeRogueRef = useRef(completeRogue);
  completeRogueRef.current = completeRogue;
  const [challengeResult, setChallengeResult] = useState<ChallengeResult | null>(null);
  const [challengeRanks, setChallengeRanks] = useState<ChallengeRankRow[]>([]);
  const challengeSubmittedRef = useRef(false);
  const submitChallengeRef = useRef(submitChallenge);
  submitChallengeRef.current = submitChallenge;

  // 피격 이펙트 — gs 변경 시 HP 델타 감지
  useEffect(() => {
    if (!gs || gs.phase !== "battle") {
      prevEnemyHpRef.current = null;
      prevPlayerHpRef.current = null;
      return;
    }
    const cleanups: Array<() => void> = [];

    const enemyHp = gs.enemy?.currentHp ?? null;
    if (enemyHp !== null && prevEnemyHpRef.current !== null && enemyHp < prevEnemyHpRef.current) {
      const dmg = prevEnemyHpRef.current - enemyHp;
      setEnemyHit(true);
      const id = Date.now() + Math.random();
      setRogueDmgNums(p => [...p.slice(-4), { id, dmg, side: "enemy" as const }]);
      const t1 = setTimeout(() => setEnemyHit(false), 380);
      const t2 = setTimeout(() => setRogueDmgNums(p => p.filter(n => n.id !== id)), 900);
      cleanups.push(() => { clearTimeout(t1); clearTimeout(t2); });
    }
    prevEnemyHpRef.current = enemyHp;

    const playerHp = gs.playerHp;
    if (prevPlayerHpRef.current !== null && playerHp < prevPlayerHpRef.current) {
      const dmg = prevPlayerHpRef.current - playerHp;
      setPlayerHit(true);
      const id = Date.now() + Math.random();
      setRogueDmgNums(p => [...p.slice(-4), { id, dmg, side: "player" as const }]);
      const t1 = setTimeout(() => setPlayerHit(false), 380);
      const t2 = setTimeout(() => setRogueDmgNums(p => p.filter(n => n.id !== id)), 900);
      cleanups.push(() => { clearTimeout(t1); clearTimeout(t2); });
    }
    prevPlayerHpRef.current = playerHp;

    if (cleanups.length) return () => cleanups.forEach(fn => fn());
  }, [gs]);

  useEffect(() => {
    // 스토리 모드 클리어 → 로그라이크 클리어 카운트
    if (gs?.phase === "victory" && gs.mode === "story" && !victoryCountedRef.current) {
      victoryCountedRef.current = true;
      const prev = parseInt(localStorage.getItem("kebo_rogue_clears") ?? "0", 10);
      localStorage.setItem("kebo_rogue_clears", String(prev + 1));
      completeRogueRef.current()
        .then(result => { if (result?.milestones.length) setRogueMilestones(result.milestones); })
        .catch(() => undefined);
    }
    // 도전 모드 종료(사망/완주) → 도달 스테이지 제출
    if (gs && gs.mode === "challenge" && (gs.phase === "gameover" || gs.phase === "victory") && !challengeSubmittedRef.current) {
      challengeSubmittedRef.current = true;
      const cleared = Math.max(0, gs.phase === "victory" ? gs.floor + 1 : gs.floor);
      submitChallengeRef.current(cleared)
        .then(res => { if (res) setChallengeResult(res); })
        .catch(() => undefined);
    }
    if (gs === null) {
      victoryCountedRef.current = false;
      challengeSubmittedRef.current = false;
      setRogueMilestones([]);
      setChallengeResult(null);
    }
  }, [gs?.phase]);

  // 도전 모드 랭킹 로드 (마운트 시 + 런 종료 후 갱신)
  const fetchRanksRef = useRef(fetchChallengeRankings);
  fetchRanksRef.current = fetchChallengeRankings;
  useEffect(() => {
    fetchRanksRef.current().then(setChallengeRanks).catch(() => undefined);
  }, [challengeResult]);

  // ── Start run ────────────────────────────────────────────────────────────
  const startRun = useCallback((mode: RunMode = "story") => {
    const maxHp = RARITY_HP[myChar.rarity] ?? 75;
    const deck = makeStarterDeck(myChar.type);
    const rogueType = ROGUE_TYPE_MAP[myChar.type] ?? "energy";
    const startEnergy    = rogueType === "energy"  ? 4 : 3;
    const startStrength  = rogueType === "attack"  ? 1 : 0;
    const startShield    = rogueType === "defense" ? 5 : 0;
    const diff: Difficulty = mode === "challenge" ? "challenge" : difficulty;
    setGs({
      phase:"map", floor:-1,
      mode,
      difficulty: diff,
      mapLayout: mode === "challenge" ? generateChallengeMap() : generateMap(diff),
      chosenPath: [],
      playerHp:maxHp, playerMaxHp:maxHp,
      shield:startShield, strength:startStrength, poison:0,
      energy:startEnergy, maxEnergy:startEnergy,
      deck, hand:[], drawPile:shuffle(deck), discardPile:[],
      gold:0, enemy:null, log:[],
      rewardCards:[], shopItems:[], turnCount:0,
      chainPending:null, cursedRest:false, shopInflated:false,
    });
    setSelIdx(null);
  }, [myChar, difficulty]);

  // ── Enter a map node ─────────────────────────────────────────────────────
  const enterNode = useCallback((floorIdx: number, nodeType: NodeType) => {
    setGs(prev => {
      if (!prev || prev.phase !== "map") return prev;
      const newChosenPath = [...prev.chosenPath, nodeType];

      if (nodeType==="fight"||nodeType==="elite"||nodeType==="boss") {
        const enemy = spawnEnemyForFloor(floorIdx, nodeType as "fight"|"elite"|"boss", prev.difficulty);
        const drawPile = shuffle([...prev.deck]);
        const drawn = drawN([], drawPile, [], 5);
        // 억까: 연전 - elite floor4+ 20% 확률로 2연전
        const chainPending = (nodeType==="elite" && floorIdx >= 4 && Math.random() < 0.20)
          ? spawnEnemyForFloor(floorIdx, "fight", prev.difficulty)
          : null;
        return {
          ...prev, phase:"battle", floor:floorIdx,
          chosenPath:newChosenPath,
          shield:0, energy:prev.maxEnergy, enemy,
          hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
          log:[ko?"전투 시작!":ja?"バトル開始！":"Battle start!"], turnCount:1,
          chainPending, cursedRest:false, shopInflated:false,
        };
      }
      if (nodeType==="treasure") {
        // 억까: 함정 보물 - 25% 확률로 적 매복
        if (Math.random() < 0.25) {
          const enemy = spawnEnemyForFloor(floorIdx, "fight", prev.difficulty);
          const drawPile = shuffle([...prev.deck]);
          const drawn = drawN([], drawPile, [], 5);
          return {
            ...prev, phase:"battle", floor:floorIdx, chosenPath:newChosenPath,
            shield:0, energy:prev.maxEnergy, enemy,
            hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
            log:[ko?"⚠ 함정이다! 적이 숨어 있었다!":ja?"⚠ トラップ！敵が潜んでいた！":"⚠ Ambush! An enemy was hiding!"], turnCount:1,
            chainPending:null, cursedRest:false, shopInflated:false,
          };
        }
        return { ...prev, phase:"reward", floor:floorIdx, chosenPath:newChosenPath, rewardCards:pickRewards(floorIdx, arch, prev.difficulty) };
      }
      if (nodeType==="shop") {
        // 억까: 바가지 상점 - 30% 확률로 가격 1.5배
        const inflated = Math.random() < 0.30;
        return { ...prev, phase:"shop", floor:floorIdx, chosenPath:newChosenPath, shopItems:makeShopItems(arch, inflated), shopInflated:inflated };
      }
      if (nodeType==="rest") {
        // 억까: 저주받은 휴식소 - floor4+ 25% 확률
        const cursedRest = floorIdx >= 4 && Math.random() < 0.25;
        return { ...prev, phase:"rest", floor:floorIdx, chosenPath:newChosenPath, cursedRest };
      }
      return prev;
    });
    setSelIdx(null);
  }, [ko, ja, arch]);

  // ── Play a card ──────────────────────────────────────────────────────────
  const playCard = useCallback((handIdx: number) => {
    setGs(prev => {
      if (!prev || prev.phase!=="battle" || !prev.enemy) return prev;
      const card = prev.hand[handIdx];
      if (!card || prev.energy < card.cost) return prev;

      let playerHp = prev.playerHp;
      let shield = prev.shield;
      let strength = prev.strength;
      let energy = prev.energy - card.cost;
      let enemy = { ...prev.enemy };
      const logs: string[] = [];

      // 1. Strength first
      if (card.strength) { strength += card.strength; logs.push(ko?`힘 +${card.strength}`:ja?`力+${card.strength}`:`Strength +${card.strength}`); }

      // 2. Damage
      if (card.damage) {
        const hits = card.multiHit ?? 1;
        let total = 0;
        for (let i=0;i<hits;i++) {
          const raw = card.damage + strength;
          const abs = Math.min(enemy.currentShield, raw);
          enemy.currentShield = Math.max(0, enemy.currentShield - abs);
          enemy.currentHp = Math.max(0, enemy.currentHp - (raw - abs));
          total += raw;
        }
        const hitStr = hits>1 ? ` ×${hits}` : "";
        logs.push(ko?`${total} 데미지${hitStr}`:ja?`${total}ダメージ${hitStr}`:`${total} damage${hitStr}`);
      }

      // 3. Shield
      if (card.shield) { shield += card.shield; logs.push(ko?`방어력 +${card.shield}`:ja?`シールド+${card.shield}`:`Shield +${card.shield}`); }

      // 4. Heal
      if (card.heal) {
        const h = Math.min(card.heal, prev.playerMaxHp - playerHp);
        playerHp = Math.min(prev.playerMaxHp, playerHp + card.heal);
        if (h>0) logs.push(`HP +${h}`);
      }

      // 5. Poison on enemy
      if (card.poison) { enemy.poisonStacks += card.poison; logs.push(ko?`독 ${card.poison}`:ja?`毒${card.poison}`:`Poison ${card.poison}`); }

      // 6. Self damage
      if (card.selfDamage) {
        const abs = Math.min(shield, card.selfDamage);
        shield = Math.max(0, shield - card.selfDamage);
        const direct = card.selfDamage - abs;
        playerHp = Math.max(0, playerHp - direct);
        if (direct>0) logs.push(ko?`자신 -${direct}`:ja?`自身-${direct}`:`Self -${direct}`);
      }

      // 7. Bonus energy
      if (card.bonusEnergy) { energy += card.bonusEnergy; logs.push(ko?`에너지 +${card.bonusEnergy}`:ja?`エナジー+${card.bonusEnergy}`:`Energy +${card.bonusEnergy}`); }

      // Update hand / discard
      const newHand = prev.hand.filter((_,i)=>i!==handIdx);
      let disc = [...prev.discardPile, card];
      let { hand: finalHand, drawPile, discardPile } = { hand:newHand, drawPile:prev.drawPile, discardPile:disc };

      // Draw cards
      if (card.draw) {
        const d = drawN(finalHand, drawPile, discardPile, card.draw);
        finalHand=d.hand; drawPile=d.drawPile; discardPile=d.discardPile;
      }

      const logEntry = `[${card.name}] ${logs.join(", ")}`;
      const newLog = [...prev.log.slice(-5), logEntry];

      // Enemy dead?
      if (enemy.currentHp <= 0) {
        const nodeType = prev.chosenPath[prev.floor];
        const isFinal = prev.mode !== "challenge" || prev.floor >= CHALLENGE_FLOORS - 1;
        if (nodeType==="boss" && isFinal) {
          return { ...prev, playerHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:[...newLog, ko?"승리!":ja?"クリア！":"Victory!"], phase:"victory" };
        }
        // 억까: 연전 처리
        if (prev.chainPending) {
          const chainDrawPile = shuffle([...prev.deck]);
          const chainDrawn = drawN([], chainDrawPile, [], 5);
          return { ...prev, playerHp, shield:0, strength, energy:prev.maxEnergy, enemy:prev.chainPending, chainPending:null,
            hand:chainDrawn.hand, drawPile:chainDrawn.drawPile, discardPile:[],
            log:[...newLog, ko?"⚠ 연전! 새로운 적이 나타났다!":ja?"⚠ 連戦！新たな敵が出現！":"⚠ Chain battle! A new enemy appears!"], turnCount:1,
          };
        }
        const goldGain = nodeType==="elite" ? DIFF_GOLD_ELITE[prev.difficulty] : DIFF_GOLD_FIGHT[prev.difficulty];
        const rewards = pickRewards(prev.floor, arch, prev.difficulty);
        return { ...prev, playerHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:[...newLog, ko?"처치!":ja?"撃破！":"Defeated!"], phase:"reward", gold:prev.gold+goldGain, rewardCards:rewards };
      }

      // Player dead?
      if (playerHp<=0) {
        return { ...prev, playerHp:0, phase:"gameover", log:newLog, hand:finalHand, drawPile, discardPile };
      }

      return { ...prev, playerHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:newLog };
    });
    setSelIdx(null);
  }, [ko, ja, arch]);

  // ── End turn ─────────────────────────────────────────────────────────────
  const endTurn = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.phase!=="battle" || !prev.enemy) return prev;

      let enemy = { ...prev.enemy };
      let playerHp = prev.playerHp;
      let playerPoison = prev.poison;
      const logs: string[] = [];
      const eName = ko ? enemy.name : ja ? enemy.nameJa : enemy.nameEn;

      // Enemy poison tick
      if (enemy.poisonStacks > 0) {
        const pd = enemy.poisonStacks;
        enemy.currentHp = Math.max(0, enemy.currentHp - pd);
        enemy.poisonStacks = Math.max(0, enemy.poisonStacks - 1);
        logs.push(ko?`[독] -${pd} HP`:ja?`[毒] -${pd} HP`:`[Poison] -${pd} HP`);
      }

      if (enemy.currentHp <= 0) {
        const nodeType = prev.chosenPath[prev.floor];
        const isFinal = prev.mode !== "challenge" || prev.floor >= CHALLENGE_FLOORS - 1;
        if (nodeType==="boss" && isFinal) {
          return { ...prev, enemy:{...enemy,currentHp:0}, phase:"victory", log:[...prev.log.slice(-5), ko?"승리!":ja?"クリア！":"Victory!"], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
        }
        // 억까: 연전 처리
        if (prev.chainPending) {
          const chainDrawPile = shuffle([...prev.deck]);
          const chainDrawn = drawN([], chainDrawPile, [], 5);
          return { ...prev, enemy:prev.chainPending, chainPending:null,
            shield:0, energy:prev.maxEnergy,
            hand:chainDrawn.hand, drawPile:chainDrawn.drawPile, discardPile:[],
            log:[...prev.log.slice(-3),...logs,ko?"⚠ 연전! 새로운 적이 나타났다!":ja?"⚠ 連戦！新たな敵が出現！":"⚠ Chain battle! A new enemy appears!"], turnCount:1,
          };
        }
        const goldGain = nodeType==="elite" ? DIFF_GOLD_ELITE[prev.difficulty] : DIFF_GOLD_FIGHT[prev.difficulty];
        return { ...prev, enemy:{...enemy,currentHp:0}, phase:"reward", gold:prev.gold+goldGain, rewardCards:pickRewards(prev.floor, arch, prev.difficulty), log:[...prev.log.slice(-5),...logs,ko?"처치!":ja?"撃破！":"Defeated!"], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
      }

      // Enemy action
      enemy.currentShield = 0;
      const pattern = enemy.patterns[enemy.patternIdx % enemy.patterns.length];
      enemy.patternIdx++;

      if (pattern.intent==="attack"||pattern.intent==="poison") {
        const atk = pattern.value + enemy.currentStrength;
        const abs = Math.min(prev.shield, atk);
        const direct = atk - abs;
        playerHp = Math.max(0, playerHp - direct);
        logs.push(`[${eName}] ${ko?"공격":ja?"攻撃":"Attack"} ${atk}${direct<atk?` (${ko?"방어":ja?"盾":"Block"} ${abs})`:""}${direct>0?` → -${direct}HP`:""}`);
        if (pattern.poison) { playerPoison += pattern.poison; logs.push(ko?`독 ${pattern.poison} 적용`:ja?`毒${pattern.poison}`:`Poison ${pattern.poison} applied`); }
      }
      if (pattern.intent==="defend") {
        const sh = pattern.shield ?? 0;
        enemy.currentShield = sh;
        logs.push(`[${eName}] ${ko?`방어력 ${sh}`:ja?`シールド${sh}`:`Shield ${sh}`}`);
      }
      if (pattern.intent==="buff") {
        const str = pattern.strength ?? 0;
        enemy.currentStrength += str;
        logs.push(`[${eName}] ${ko?`힘 +${str}`:ja?`力+${str}`:`Strength +${str}`}`);
      }

      // Player death check
      if (playerHp <= 0) {
        return { ...prev, playerHp:0, poison:playerPoison, enemy, phase:"gameover", log:[...prev.log.slice(-5),...logs], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
      }

      // Player poison tick
      if (playerPoison > 0) {
        const pd = playerPoison;
        playerHp = Math.max(0, playerHp - pd);
        playerPoison = Math.max(0, playerPoison - 1);
        logs.push(ko?`[나] 독 -${pd} HP`:ja?`[自分] 毒-${pd}HP`:`[You] Poison -${pd} HP`);
        if (playerHp <= 0) {
          return { ...prev, playerHp:0, poison:playerPoison, enemy, phase:"gameover", log:[...prev.log.slice(-5),...logs], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
        }
      }

      // Start new player turn: reset shield, draw 5
      const newDisc = [...prev.discardPile, ...prev.hand];
      const drawn = drawN([], prev.drawPile, newDisc, 5);

      return {
        ...prev,
        playerHp, poison:playerPoison,
        shield:0, energy:prev.maxEnergy,
        enemy,
        hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
        log:[...prev.log.slice(-4),...logs, ko?`— 턴 ${prev.turnCount+1}`:ja?`— ターン${prev.turnCount+1}`:`— Turn ${prev.turnCount+1}`],
        turnCount:prev.turnCount+1,
      };
    });
    setSelIdx(null);
  }, [ko, ja, arch]);

  // ── Pick reward ──────────────────────────────────────────────────────────
  const pickReward = useCallback((card: CardDef) => {
    setGs(prev => {
      if (!prev) return prev;
      const newCard = toInst(card);
      return { ...prev, deck:[...prev.deck, newCard], phase:"map", rewardCards:[] };
    });
  }, []);
  const skipReward = useCallback(() => setGs(p => p ? {...p, phase:"map", rewardCards:[]} : p), []);

  // ── Shop ─────────────────────────────────────────────────────────────────
  const buyCard = useCallback((idx: number) => {
    setGs(prev => {
      if (!prev) return prev;
      const item = prev.shopItems[idx];
      if (!item || item.bought || prev.gold < item.price) return prev;
      const newItems = prev.shopItems.map((it,i) => i===idx ? {...it,bought:true} : it);
      return { ...prev, deck:[...prev.deck, toInst(item.card)], gold:prev.gold-item.price, shopItems:newItems };
    });
  }, []);
  const leaveShop = useCallback(() => setGs(p => p ? {...p, phase:"map"} : p), []);

  // ── Rest ─────────────────────────────────────────────────────────────────
  const doRest = useCallback(() => {
    setGs(prev => {
      if (!prev) return prev;
      const healPct = prev.cursedRest ? 0.10 : 0.30;
      const heal = Math.floor(prev.playerMaxHp * healPct);
      return { ...prev, playerHp: Math.min(prev.playerMaxHp, prev.playerHp+heal), phase:"map", cursedRest:false };
    });
  }, []);

  const abandonRun = useCallback(() => { setGs(null); setSelIdx(null); }, []);

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @keyframes rogue-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes rogue-in{from{opacity:0;transform:scale(0.9) translateY(8px)}to{opacity:1;transform:none}}
    @keyframes rogue-slide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
    @keyframes ut-enemy-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(50) saturate(0)}12%{transform:translateX(-9px);filter:brightness(14) saturate(0)}26%{transform:translateX(7px);filter:brightness(5) saturate(0.3)}44%{transform:translateX(-5px);filter:brightness(2.2) saturate(1)}62%{transform:translateX(4px);filter:brightness(1.3)}80%{transform:translateX(-2px);filter:brightness(1)}100%{transform:translateX(0);filter:brightness(1)}}
    @keyframes ut-dmg-pop{0%{opacity:1;transform:translateY(0) scale(1.8)}20%{opacity:1;transform:translateY(-8px) scale(1.3)}100%{opacity:0;transform:translateY(-48px) scale(0.85)}}
    @keyframes ut-player-flash{0%{opacity:0.55}100%{opacity:0}}
    @keyframes ut-card-panel-flash{0%{opacity:0.85}50%{opacity:0.55}100%{opacity:0}}
    @keyframes ut-card-icon{0%{opacity:0.95;transform:scale(0.3) rotate(-18deg)}28%{opacity:1;transform:scale(1.35) rotate(6deg)}60%{opacity:0.85;transform:scale(1.05) rotate(0)}100%{opacity:0;transform:scale(0.8) rotate(0)}}
    @keyframes ut-multihit-badge{0%{opacity:0;transform:scale(0.4) translateY(4px)}30%{opacity:1;transform:scale(1.2) translateY(-2px)}70%{opacity:1;transform:scale(1) translateY(0)}100%{opacity:0;transform:scale(0.8) translateY(-6px)}}
    .rogue-card-hover:hover{transform:translateY(-6px)!important;box-shadow:0 8px 24px #00000055!important}
    .rogue-log::-webkit-scrollbar{display:none}
    .rogue-log{scrollbar-width:none;-ms-overflow-style:none}
  `;

  // ── Deck modal ────────────────────────────────────────────────────────────
  const DeckModal = () => {
    if (!gs || !deckOpen) return null;
    return (
      <div style={{position:"fixed",inset:0,zIndex:999,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setDeckOpen(false)}>
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20,width:"min(560px,94vw)",maxHeight:"80vh",overflow:"auto",fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <p style={{margin:0,color:C.textBright,fontWeight:800,fontSize:15}}>{ko?"덱 보기":ja?"デッキ確認":"Deck"} ({gs.deck.length}{ko?"장":ja?"枚":" cards"})</p>
            <button onClick={()=>setDeckOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {gs.deck.map((c,i)=>(
              <CardView key={c.uid??i} card={c} canPlay={false} lang={lang}/>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 마일스톤 보상 목록 (도전/스토리 공용)
  const MilestoneList = ({ milestones, labelOf }: { milestones: RogueMilestone[]; labelOf: (n: number) => string }) => (
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:360,animation:"rogue-in 0.4s 0.1s ease-out both"}}>
      {milestones.map((m, i) => (
        <div key={i} style={{background:"#0a1a0a",border:"1px solid #22c55e44",borderRadius:10,padding:"10px 14px"}}>
          <p style={{margin:"0 0 7px",fontSize:13,fontWeight:800,color:"#22c55e"}}>🎉 {labelOf(m.clears)}</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {m.points>0&&<span style={{fontSize:11,fontWeight:700,color:C.gold,background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:5,padding:"2px 8px"}}>{ko?"포인트":ja?"ポイント":"Points"} ×{m.points.toLocaleString()}</span>}
            {m.stones>0&&<span style={{fontSize:11,fontWeight:700,color:"#60a5fa",background:"#60a5fa15",border:"1px solid #60a5fa44",borderRadius:5,padding:"2px 8px"}}>{ko?"강화석":ja?"強化石":"Upgrade Stone"} ×{m.stones}</span>}
            {m.normalEgg>0&&<span style={{fontSize:11,fontWeight:700,color:"#94a3b8",background:"#94a3b815",border:"1px solid #94a3b844",borderRadius:5,padding:"2px 8px"}}>{ko?"일반 알":ja?"通常卵":"Normal Egg"} ×{m.normalEgg}</span>}
            {m.bigEgg>0&&<span style={{fontSize:11,fontWeight:700,color:"#4ade80",background:"#4ade8015",border:"1px solid #4ade8044",borderRadius:5,padding:"2px 8px"}}>{ko?"고급 알":ja?"上級卵":"Premium Egg"} ×{m.bigEgg}</span>}
            {m.goldEgg>0&&<span style={{fontSize:11,fontWeight:700,color:C.gold,background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:5,padding:"2px 8px"}}>{ko?"황금 알":ja?"黄金卵":"Golden Egg"} ×{m.goldEgg}</span>}
          </div>
        </div>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════
  if (!gs) {
    const archLabel: Record<string,string> = { warrior:ko?"전사형":ja?"戦士型":"Warrior", rogue:ko?"도적형":ja?"盗賊型":"Rogue", mage:ko?"마법사형":ja?"魔法使い型":"Mage", tank:ko?"수호자형":ja?"守護者型":"Guardian", nature:ko?"자연형":ja?"自然型":"Nature", wild:ko?"야생형":ja?"野生型":"Wild", all:ko?"만능형":ja?"万能型":"All-rounder" };
    const archColor: Record<string,string> = { warrior:"#ef4444", rogue:"#a855f7", mage:"#3b82f6", tank:"#22c55e", nature:"#84cc16", wild:"#f59e0b", all:"#94a3b8" };
    const ac = archColor[arch] ?? "#94a3b8";
    const RARITY_KO: Record<string,string> = { common:"커먼",uncommon:"언커먼",rare:"레어",epic:"에픽",legendary:"레전더리",mythic:"신화" };
    const RARITY_JA: Record<string,string> = { common:"コモン",uncommon:"アンコモン",rare:"レア",epic:"エピック",legendary:"レジェンダリー",mythic:"ミシック" };
    const RARITY_EN_L: Record<string,string> = { common:"Common",uncommon:"Uncommon",rare:"Rare",epic:"Epic",legendary:"Legendary",mythic:"Mythic" };
    const rarityLabel = ko ? RARITY_KO[myChar.rarity] : ja ? RARITY_JA[myChar.rarity] : RARITY_EN_L[myChar.rarity];
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <style>{css}</style>
        <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:24}}>
          {/* Header */}
          <div style={{textAlign:"center",animation:"rogue-in 0.4s ease-out both"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:4}}>
              <Layers size={28} color={C.gold}/>
              <h1 style={{margin:0,fontSize:24,fontWeight:900,color:C.gold,letterSpacing:"0.1em"}}>CARD EXPEDITION</h1>
            </div>
            <p style={{margin:0,fontSize:12,color:C.textDim}}>{ko?"카드 배틀 로그라이크":ja?"カードバトルローグライク":"Card Battle Roguelike"}</p>
          </div>

          {/* Character card */}
          <div style={{background:C.panel,border:`2px solid ${ac}44`,borderRadius:12,padding:20,display:"flex",alignItems:"center",gap:20,overflow:"hidden",animation:"rogue-in 0.4s 0.05s ease-out both"}}>
            <div style={{animation:"rogue-float 3s ease-in-out infinite",flexShrink:0}}>
              <PixelSprite type={myChar.type} colors={myChar.colors} characterId={myChar.id} rarity={myChar.rarity} size={72}/>
            </div>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:16,fontWeight:800,color:C.textBright}}>{getCharName(myChar, lang)}</p>
              <p style={{margin:"2px 0 6px",fontSize:11,color:ac}}>{rarityLabel} · {archLabel[arch]}</p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.red}18`,borderRadius:6,padding:"3px 8px"}}>
                  <Heart size={11} color={C.red}/>
                  <span style={{fontSize:11,color:C.red,fontWeight:700}}>{RARITY_HP[myChar.rarity]??75}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,background:"#22c55e18",borderRadius:6,padding:"3px 8px"}}>
                  <Layers size={11} color="#22c55e"/>
                  <span style={{fontSize:11,color:"#22c55e",fontWeight:700}}>{ko?"덱 10장":ja?"デッキ10枚":"10 Cards"}</span>
                </div>
                {(()=>{
                  const rt = ROGUE_TYPE_MAP[myChar.type]??"energy";
                  const tColor = rt==="energy"?"#38bdf8":rt==="attack"?"#ef4444":"#3b82f6";
                  const tIcon = rt==="energy"?<Swords size={11}/>:rt==="attack"?<Swords size={11}/>:<Shield size={11}/>;
                  const tLabel = rt==="energy"?(ko?"에너지형":ja?"エナジー型":"Energy"):rt==="attack"?(ko?"공격형":ja?"アタック型":"Attack"):(ko?"방어형":ja?"ディフェンス型":"Defense");
                  const tBonus = rt==="energy"?(ko?"+1에너지":ja?"+1エナジー":"+1 Energy"):rt==="attack"?(ko?"+1힘":ja?"+1力":"+1 Strength"):(ko?"+5방어":ja?"+5シールド":"+5 Shield");
                  return (
                    <div style={{display:"flex",alignItems:"center",gap:4,background:`${tColor}18`,borderRadius:6,padding:"3px 8px"}}>
                      <span style={{color:tColor,display:"flex"}}>{tIcon}</span>
                      <span style={{fontSize:11,color:tColor,fontWeight:700}}>{tLabel} {tBonus}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Difficulty selector */}
          <div style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:16,animation:"rogue-in 0.4s 0.08s ease-out both"}}>
            <p style={{margin:"0 0 10px",color:C.textBright,fontWeight:700,fontSize:13}}>
              {ko?"난이도 선택":ja?"難易度選択":"Difficulty"}
            </p>
            <div style={{display:"flex",gap:8}}>
              {([
                ["normal", ko?"노말":ja?"ノーマル":"Normal", ko?"7스테이지 · 입문":ja?"7ステージ・入門":"7 stages · Beginner", "#22c55e", 7],
                ["hard",   ko?"하드":ja?"ハード":"Hard",     ko?"10스테이지 · 고급":ja?"10ステージ・上級":"10 stages · Advanced","#f59e0b",10],
                ["hell",   ko?"지옥":ja?"ヘル":"Hell",       ko?"15스테이지 · 극한":ja?"15ステージ・極限":"15 stages · Extreme","#ef4444",15],
              ] as [Difficulty, string, string, string, number][]).map(([d, label, desc, col, stages]) => {
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex:1, borderRadius:8, padding:"10px 6px",
                      background: active ? `${col}22` : "transparent",
                      border:`2px solid ${active ? col : C.border}`,
                      cursor:"pointer", fontFamily:FONT, textAlign:"center" as const,
                      boxShadow: active ? `0 0 12px ${col}44` : "none",
                      transition:"all 0.15s",
                    }}
                  >
                    <p style={{margin:"0 0 2px",fontSize:13,fontWeight:900,color: active ? col : C.textDim}}>{label}</p>
                    <p style={{margin:"0 0 4px",fontSize:9,color:active?col:C.textDim,fontWeight:600}}>{stages}{ko?"스테이지":ja?"ステージ":" stages"}</p>
                    <p style={{margin:0,fontSize:9,color:C.textDim,lineHeight:1.3}}>{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rules */}
          <div style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:16,fontSize:12,color:C.textDim,animation:"rogue-in 0.4s 0.1s ease-out both"}}>
            <p style={{margin:"0 0 8px",color:C.textBright,fontWeight:700}}>{ko?"규칙":ja?"ルール":"Rules"}</p>
            {[
              ko?"전투 후 카드 3장 중 1장을 선택해 덱에 추가":ja?"戦闘後、カード3枚から1枚をデッキに追加":"After each battle, pick 1 of 3 cards to add to your deck",
              ko?"에너지를 소비해 카드를 사용":ja?"エナジーを消費してカードを使用":"Spend energy to play cards",
              ko?"매 턴 방어력은 초기화됩니다":ja?"毎ターン防御力はリセットされます":"Shield resets at the start of every turn",
            ].map((rule, i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,lineHeight:1.7}}>
                <ChevronRight size={11} color={C.textDim} style={{flexShrink:0,marginTop:3}}/>
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={() => startRun("story")}
            style={{
              background:`linear-gradient(135deg,${C.gold}cc,${C.gold}88)`,
              border:`2px solid ${C.gold}`,borderRadius:10,padding:"14px 0",
              color:"#1c1500",fontWeight:900,fontSize:16,cursor:"pointer",
              fontFamily:FONT,letterSpacing:"0.05em",
              animation:"rogue-in 0.4s 0.15s ease-out both",
            }}
          >{ko?"탐험 시작!":ja?"探検開始！":"Start Expedition!"}</button>

          {/* 도전 모드 */}
          <div style={{background:C.panelDark,border:"1px solid #7c3aed55",borderRadius:10,padding:16,animation:"rogue-in 0.4s 0.18s ease-out both"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <Crown size={16} color="#a855f7"/>
                <span style={{color:"#c084fc",fontWeight:800,fontSize:14}}>{ko?"도전 모드":ja?"チャレンジモード":"Challenge"}</span>
              </div>
              <span style={{fontSize:11,color:C.textDim}}>{ko?"최고":ja?"最高":"Best"} <b style={{color:"#c084fc"}}>{rewardSummary.challengeBest}</b>/100</span>
            </div>
            <p style={{margin:"0 0 10px",fontSize:11,color:C.textDim,lineHeight:1.5}}>
              {ko?"100스테이지까지 점점 강해지는 적! 몇 칸까지 갈 수 있나? (사망 시 종료)":ja?"100ステージ、敵がどんどん強化！どこまで行ける？（死亡で終了）":"100 stages of ever-stronger foes. How far can you go? (ends on death)"}
            </p>
            <button
              onClick={() => startRun("challenge")}
              style={{width:"100%",background:"linear-gradient(135deg,#7c3aedcc,#a855f7aa)",border:"2px solid #a855f7",borderRadius:10,padding:"12px 0",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:FONT}}
            >{ko?"도전 시작!":ja?"挑戦開始！":"Start Challenge!"}</button>
            {challengeRanks.length > 0 && (
              <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:C.textBright}}>{ko?"🏆 역대 랭킹":ja?"🏆 ランキング":"🏆 Rankings"}</p>
                {challengeRanks.slice(0,5).map(r => (
                  <div key={r.userId} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0",fontSize:12}}>
                    <span style={{width:18,textAlign:"right",fontWeight:800,color:r.rank<=3?"#fbbf24":C.textDim}}>{r.rank}</span>
                    <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nickname}</span>
                    <span style={{color:"#c084fc",fontWeight:700}}>{r.best}{ko?"칸":ja?"":""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // MAP
  // ════════════════════════════════════════════════════════════
  // ── Challenge mode: 일직선 진행 화면 ──
  if (gs.phase === "map" && gs.mode === "challenge") {
    const nextFloor = gs.floor + 1;
    const cleared = gs.floor + 1;
    const options = gs.mapLayout[nextFloor]?.options ?? (["fight"] as NodeType[]);
    const cfg = DIFF_GOLD_FIGHT.challenge, ceg = DIFF_GOLD_ELITE.challenge;
    const ntMeta: Record<string,[string,string]> = {
      fight:    [ko?"전투":ja?"戦闘":"Fight", "#ef4444"],
      elite:    [ko?"엘리트":ja?"エリート":"Elite", "#f97316"],
      boss:     [ko?"보스":ja?"ボス":"Boss", "#ec4899"],
      rest:     [ko?"휴식":ja?"休憩":"Rest", "#60a5fa"],
      shop:     [ko?"상점":ja?"商店":"Shop", "#22c55e"],
      treasure: [ko?"보물":ja?"宝物":"Treasure", "#f59e0b"],
    };
    const ntDesc: Record<string,string> = {
      fight:    ko?`${cfg}G + 카드`:ja?`${cfg}G+カード`:`${cfg}G + card`,
      elite:    ko?`${ceg}G + 카드`:ja?`${ceg}G+カード`:`${ceg}G + card`,
      boss:     ko?"최종 보스":ja?"最終ボス":"Final Boss",
      rest:     ko?"HP 30% 회복":ja?"HP30%回復":"Heal 30%",
      shop:     ko?"카드 구매":ja?"購入":"Buy cards",
      treasure: ko?"카드 선택":ja?"カード選択":"Pick a card",
    };
    return (
      <div style={{height:"100dvh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",padding:"14px 16px",gap:14,maxWidth:520,margin:"0 auto",overflow:"hidden"}}>
        <style>{css}</style>
        {/* header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <Crown size={18} color="#a855f7"/>
            <span style={{color:"#c084fc",fontWeight:800,fontSize:15}}>{ko?"도전 모드":ja?"チャレンジ":"Challenge"}</span>
          </div>
          <button onClick={abandonRun} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",color:C.textDim,fontSize:11,cursor:"pointer",fontFamily:FONT}}>{ko?"포기":ja?"放棄":"Abandon"}</button>
        </div>

        {/* progress */}
        <div style={{textAlign:"center"}}>
          <p style={{margin:"6px 0 2px",fontSize:13,color:C.textDim}}>{ko?"클리어":ja?"クリア":"Cleared"}</p>
          <p style={{margin:0,fontSize:44,fontWeight:900,color:"#c084fc",lineHeight:1}}>{cleared}<span style={{fontSize:20,color:C.textDim}}> / {CHALLENGE_FLOORS}</span></p>
          <div style={{height:8,background:C.panelDark,borderRadius:6,overflow:"hidden",margin:"12px 0 0"}}>
            <div style={{height:"100%",width:`${(cleared/CHALLENGE_FLOORS)*100}%`,background:"linear-gradient(90deg,#7c3aed,#c084fc)",borderRadius:6,transition:"width 0.3s"}}/>
          </div>
        </div>

        {/* HP */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.textDim}}><Heart size={13} color={C.red}/>HP</span>
            <span style={{fontSize:13,fontWeight:800,color:C.text}}>{gs.playerHp}/{gs.playerMaxHp}</span>
          </div>
          <HpBar hp={gs.playerHp} max={gs.playerMaxHp}/>
        </div>

        {/* 선택지 (랜덤 2갈래) */}
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:12}}>
          <p style={{margin:0,fontSize:12,color:C.textDim,textAlign:"center"}}>{ko?"다음 길을 선택":ja?"次の道を選択":"Choose your path"} · {ko?"스테이지":ja?"ステージ":"Stage"} {nextFloor+1}</p>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            {options.map((opt, idx) => {
              const [label, color] = ntMeta[opt] ?? ntMeta.fight;
              return (
                <button
                  key={idx}
                  onClick={()=>enterNode(nextFloor, opt)}
                  style={{flex:1,maxWidth:200,border:`2px solid ${color}`,background:`${color}18`,borderRadius:14,padding:"20px 12px",textAlign:"center",cursor:"pointer",fontFamily:FONT,transition:"transform 0.12s",boxShadow:`0 0 12px ${color}33`}}
                >
                  <p style={{margin:"0 0 5px",fontSize:18,fontWeight:900,color}}>{label}</p>
                  <p style={{margin:0,fontSize:11,color:C.textDim}}>{ntDesc[opt] ?? ""}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* deck */}
        <button onClick={()=>setDeckOpen(true)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textDim,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FONT}}>{ko?"덱 보기":ja?"デッキ確認":"View Deck"} ({gs.deck.length})</button>
        <DeckModal/>
      </div>
    );
  }

  if (gs.phase === "map") {
    const nodeLabel: Record<NodeType,[string,string]> = {
      fight:    [ko?"전투":ja?"戦闘":"Fight",              "#ef4444"],
      elite:    [ko?"엘리트":ja?"エリート":"Elite",        "#f97316"],
      treasure: [ko?"보물":ja?"宝物":"Treasure",            "#f59e0b"],
      shop:     [ko?"상점":ja?"商店":"Shop",                "#22c55e"],
      rest:     [ko?"휴식":ja?"休憩":"Rest",                "#60a5fa"],
      boss:     [ko?"최종 보스":ja?"最終ボス":"Final Boss", "#ec4899"],
    };
    const eg = DIFF_GOLD_ELITE[gs.difficulty];
    const fg = DIFF_GOLD_FIGHT[gs.difficulty];
    const nodeDesc: Record<NodeType,string> = {
      fight:    ko?`${fg}G + 카드`:ja?`${fg}G+カード`:`${fg}G + card`,
      elite:    ko?`${eg}G + 카드`:ja?`${eg}G+カード`:`${eg}G + card`,
      treasure: ko?"카드 선택":ja?"カード選択":"Pick a card",
      shop:     ko?"카드 구매":ja?"購入":"Buy cards",
      rest:     ko?"HP 30% 회복":ja?"HP30%回復":"Heal 30% HP",
      boss:     ko?"최종 보스 처치":ja?"ボス撃破":"Defeat final boss",
    };
    const nextFloor = gs.floor + 1;
    const totalFloors = gs.mapLayout.length;
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,padding:"16px 16px 32px"}}>
        <style>{css}</style>
        {/* Header */}
        <div style={{maxWidth:520,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Layers size={18} color={C.gold}/>
            <span style={{color:C.gold,fontWeight:800,fontSize:15}}>CARD EXPEDITION</span>
            <span style={{
              fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4,
              background: gs.difficulty==="hell"?"#ef444422":gs.difficulty==="hard"?"#f59e0b22":"#22c55e22",
              color: gs.difficulty==="hell"?"#ef4444":gs.difficulty==="hard"?"#f59e0b":"#22c55e",
              border:`1px solid ${gs.difficulty==="hell"?"#ef444444":gs.difficulty==="hard"?"#f59e0b44":"#22c55e44"}`,
            }}>
              {ko ? (gs.difficulty==="hell"?"지옥":gs.difficulty==="hard"?"하드":"노말")
                  : ja ? (gs.difficulty==="hell"?"ヘル":gs.difficulty==="hard"?"ハード":"ノーマル")
                  : (gs.difficulty==="hell"?"Hell":gs.difficulty==="hard"?"Hard":"Normal")}
            </span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:4,background:"#f59e0b18",borderRadius:6,padding:"4px 8px"}}>
              <Star size={12} color={C.gold}/><span style={{fontSize:12,color:C.gold,fontWeight:700}}>{gs.gold}G</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.red}18`,borderRadius:6,padding:"4px 8px"}}>
              <Heart size={12} color={C.red}/><span style={{fontSize:12,color:C.red,fontWeight:700}}>{gs.playerHp}/{gs.playerMaxHp}</span>
            </div>
            <button onClick={()=>setDeckOpen(true)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",color:C.textDim,cursor:"pointer",fontSize:11,fontFamily:FONT}}>
              {ko?`덱 (${gs.deck.length}장)`:ja?`デッキ(${gs.deck.length}枚)`:`Deck (${gs.deck.length})`}
            </button>
            <button onClick={abandonRun} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:FONT,padding:"4px 6px"}}>
              {ko?"포기":ja?"放棄":"Quit"}
            </button>
          </div>
        </div>

        {/* Progress + HP */}
        <div style={{maxWidth:520,margin:"0 auto 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <span style={{fontSize:11,color:C.textDim,fontWeight:600}}>
              {ko?`${nextFloor}/${totalFloors}층`:ja?`${nextFloor}/${totalFloors}F`:`Floor ${nextFloor}/${totalFloors}`}
            </span>
            <div style={{display:"flex",gap:8}}>
              {gs.poison>0&&<span style={{fontSize:11,color:"#a855f7"}}>{ko?"독":ja?"毒":"Poison"} {gs.poison}</span>}
              {gs.strength>0&&<span style={{fontSize:11,color:C.gold}}>{ko?"힘":ja?"力":"Str"} +{gs.strength}</span>}
            </div>
          </div>
          <HpBar hp={gs.playerHp} max={gs.playerMaxHp}/>
        </div>

        {/* Floor list */}
        <div style={{maxWidth:520,margin:"0 auto",display:"flex",flexDirection:"column",gap:6}}>
          {gs.mapLayout.map((mapFloor, floorIdx) => {
            const isDone    = floorIdx < nextFloor;
            const isCurrent = floorIdx === nextFloor;
            const isFuture  = floorIdx > nextFloor;
            const chosen    = isDone ? gs.chosenPath[floorIdx] : undefined;
            return (
              <div key={floorIdx} style={{animation:isCurrent?"rogue-in 0.25s ease-out both":undefined}}>
                {/* Floor number row */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{
                    width:20,height:20,borderRadius:"50%",flexShrink:0,
                    background:isDone?"#1e3a5f":isCurrent?"#facc15":"transparent",
                    border:`2px solid ${isDone?"#334155":isCurrent?"#facc15":C.border}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,fontWeight:900,
                    color:isDone?"#4ade80":isCurrent?"#1c1500":C.textDim,
                  }}>
                    {isDone?"✓":floorIdx+1}
                  </div>
                  <div style={{flex:1,height:1,background:isDone?"#1e3a5f33":C.border+"44"}}/>
                  {isCurrent&&<span style={{fontSize:10,color:"#facc15",fontWeight:700,flexShrink:0}}>{ko?"선택":ja?"選択":"Pick"}</span>}
                </div>

                {/* Options row */}
                <div style={{display:"flex",gap:8,paddingLeft:28}}>
                  {mapFloor.options.map((nodeType, optIdx) => {
                    const [label, col] = nodeLabel[nodeType];
                    const isChosen   = chosen === nodeType;
                    const isRejected = isDone && !isChosen;
                    return (
                      <button
                        key={optIdx}
                        disabled={!isCurrent}
                        onClick={() => isCurrent && enterNode(floorIdx, nodeType)}
                        style={{
                          flex:1,
                          background: isChosen?"#0a1a2e":isCurrent?`${col}14`:C.panelDark,
                          border:`1px solid ${isChosen?col+"66":isCurrent?col:C.border}`,
                          borderRadius:10, padding:"10px 12px",
                          display:"flex",alignItems:"center",gap:8,
                          cursor:isCurrent?"pointer":"default",
                          opacity:isRejected?0.25:isFuture?0.45:1,
                          fontFamily:FONT, textAlign:"left",
                          boxShadow:isCurrent?`0 0 12px ${col}22`:"none",
                        }}
                      >
                        <NodeIcon type={nodeType} size={16}/>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontSize:12,fontWeight:800,
                            color:isRejected?"#334155":isCurrent||isChosen?col:C.textDim,
                          }}>{label}</p>
                          <p style={{margin:0,fontSize:10,color:C.textDim}}>{nodeDesc[nodeType]}</p>
                        </div>
                        {isChosen&&<span style={{fontSize:12,color:"#4ade80",flexShrink:0}}>✓</span>}
                        {isCurrent&&<ChevronRight size={14} color={col} style={{flexShrink:0}}/>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DeckModal/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // BATTLE
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "battle" && gs.enemy) {
    const e = gs.enemy;
    const nextP = e.patterns[e.patternIdx % e.patterns.length];
    const pHpPct = gs.playerHp / gs.playerMaxHp;
    return (
      <div style={{height:"100dvh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",padding:"8px 10px",gap:6,maxWidth:640,margin:"0 auto",overflow:"hidden"}}>
        <style>{`${css} .rogue-card-hover{transition:transform 0.12s,box-shadow 0.12s}`}</style>

        {/* 플레이어 피격 레드 플래시 */}
        {playerHit&&(
          <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(220,0,0,0.28)",animation:"ut-player-flash 0.38s ease-out forwards",pointerEvents:"none"}}/>
        )}
        {rogueDmgNums.filter(n=>n.side==="player").map(n=>(
          <span key={n.id} style={{position:"fixed",top:"42%",left:"50%",transform:"translateX(-50%)",
            fontWeight:900,fontSize:28,color:"#ff4444",
            textShadow:"0 0 12px #ff0000,0 0 6px #ff8888,1px 1px 0 #000",
            animation:"ut-dmg-pop 0.9s ease-out forwards",pointerEvents:"none",fontFamily:"monospace",zIndex:60,whiteSpace:"nowrap"}}>
            -{n.dmg}
          </span>
        ))}

        {/* Enemy area */}
        <div style={{position:"relative"}}>
        {cardEffect?.effectType==="attack" && (
          <div style={{
            position:"absolute",inset:0,zIndex:25,borderRadius:12,overflow:"hidden",
            pointerEvents:"none",
            background:"rgba(239,68,68,0.18)",
            animation:"ut-card-panel-flash 0.55s ease-out forwards",
          }}>
            <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
              <div style={{animation:"ut-card-icon 0.55s ease-out forwards",filter:"drop-shadow(0 0 10px rgba(239,68,68,0.95))",color:"rgba(239,68,68,0.95)",display:"flex"}}>
                <Swords size={38}/>
              </div>
              {cardEffect.multiHit && cardEffect.multiHit > 1 && (
                <span style={{fontSize:15,fontWeight:900,color:"#faff00",fontFamily:"monospace",
                  textShadow:"0 0 8px #fff,1px 1px 0 #000",
                  animation:"ut-multihit-badge 0.55s ease-out forwards"}}>×{cardEffect.multiHit}</span>
              )}
            </div>
          </div>
        )}
        <div style={{background:C.panelDark,border:`1px solid #3a0a0a`,borderRadius:12,padding:10,animation:"rogue-in 0.3s ease-out both"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{animation:enemyHit?"ut-enemy-hit 0.38s ease-out":"rogue-float 2.5s ease-in-out infinite"}}>
                <PixelSprite type={e.charType} colors={CHARACTERS.find(c=>c.type===e.charType)?.colors ?? {p:"#888",s:"#666",a:"#aaa"}} characterId={0} rarity="common" size={52}/>
              </div>
              {rogueDmgNums.filter(n=>n.side==="enemy").map(n=>(
                <span key={n.id} style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                  fontWeight:900,fontSize:22,color:"#faff00",
                  textShadow:"0 0 10px #fff,0 0 5px #ffd700,1px 1px 0 #000",
                  animation:"ut-dmg-pop 0.9s ease-out forwards",pointerEvents:"none",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                  -{n.dmg}
                </span>
              ))}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#fca5a5",display:"flex",alignItems:"center",gap:5}}>
                  {ko?e.name:ja?e.nameJa:e.nameEn}
                  {e.isBoss&&<Crown size={13} color="#f59e0b"/>}
                </p>
                <p style={{margin:0,fontSize:12,color:"#ef4444",fontWeight:700}}>{e.currentHp}/{e.hp}</p>
              </div>
              <HpBar hp={e.currentHp} max={e.hp} color="#ef4444"/>
              <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                {e.currentShield>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:3,background:"#1d4ed820",border:"1px solid #1d4ed8",borderRadius:5,padding:"2px 6px"}}>
                    <Shield size={10} color="#60a5fa"/>
                    <span style={{fontSize:11,color:"#60a5fa",fontWeight:700}}>{e.currentShield}</span>
                  </div>
                )}
                {e.currentStrength>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:3,background:"#b4530920",border:"1px solid #b45309",borderRadius:5,padding:"2px 6px"}}>
                    <span style={{fontSize:11,color:C.gold,fontWeight:700}}>{ko?"힘":ja?"力":"Str"}+{e.currentStrength}</span>
                  </div>
                )}
                {e.poisonStacks>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:3,background:"#7e22ce20",border:"1px solid #7e22ce",borderRadius:5,padding:"2px 6px"}}>
                    <span style={{fontSize:11,color:"#a855f7",fontWeight:700}}>{ko?"독":ja?"毒":"Poison"} {e.poisonStacks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontWeight:600}}>{ko?"다음 행동:":ja?"次の行動:":"Next Action:"}</span>
            <IntentBadge pattern={nextP} ko={ko} ja={ja}/>
          </div>
        </div>
        </div>{/* /enemy wrapper */}

        {/* Battle log */}
        <div style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"5px 10px"}}>
            {gs.log.slice(-2).map((l,i,arr)=>(
              <p key={i} style={{margin:0,fontSize:11,color:i===arr.length-1?C.text:C.textDim,lineHeight:1.45}}>{l}</p>
            ))}
          </div>
          {gs.log.length > 0 && (
            <button
              onClick={()=>setLogExpanded(true)}
              style={{width:"100%",background:"none",border:"none",borderTop:`1px solid ${C.border}22`,padding:"4px 12px",color:C.textDim,fontSize:10,cursor:"pointer",fontFamily:FONT,textAlign:"left",display:"flex",alignItems:"center",gap:4}}
            >
              <ChevronRight size={10} style={{transform:"rotate(90deg)",flexShrink:0}}/>
              {ko?`전체 로그 (${gs.log.length}줄)`:ja?`全ログ(${gs.log.length}行)`:`Full log (${gs.log.length} lines)`}
            </button>
          )}
        </div>

        {/* Log modal */}
        {logExpanded && (
          <div style={{position:"fixed",inset:0,zIndex:999,background:"#000a",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setLogExpanded(false)}>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:"12px 12px 0 0",width:"100%",maxWidth:640,maxHeight:"60vh",display:"flex",flexDirection:"column",fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                <p style={{margin:0,color:C.textBright,fontWeight:700,fontSize:13}}>{ko?"전투 로그":ja?"戦闘ログ":"Battle Log"}</p>
                <button onClick={()=>setLogExpanded(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim,padding:0}}><X size={16}/></button>
              </div>
              <div style={{overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:1}}>
                {gs.log.map((l,i)=>(
                  <p key={i} style={{margin:0,fontSize:12,color:i===gs.log.length-1?C.text:C.textDim,lineHeight:1.8}}>{l}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Player status */}
        <div style={{position:"relative"}}>
        {cardEffect && cardEffect.effectType !== "attack" && (() => {
          const cfg = {
            shield: { bg:"rgba(96,165,250,0.20)",  icon:<Shield size={38}/>,  glow:"rgba(96,165,250,0.95)",  color:"rgba(96,165,250,0.95)"  },
            heal:   { bg:"rgba(74,222,128,0.22)",   icon:<Heart size={38}/>,   glow:"rgba(74,222,128,0.95)",  color:"rgba(74,222,128,0.95)"  },
            power:  { bg:"rgba(251,191,36,0.22)",   icon:<Star size={38}/>,    glow:"rgba(251,191,36,0.95)",  color:"rgba(251,191,36,0.95)"  },
          }[cardEffect.effectType] ?? { bg:"rgba(96,165,250,0.20)", icon:<Shield size={38}/>, glow:"rgba(96,165,250,0.95)", color:"rgba(96,165,250,0.95)" };
          return (
            <div style={{
              position:"absolute",inset:0,zIndex:25,borderRadius:10,overflow:"hidden",
              pointerEvents:"none",
              background:cfg.bg,
              animation:"ut-card-panel-flash 0.55s ease-out forwards",
            }}>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{animation:"ut-card-icon 0.55s ease-out forwards",filter:`drop-shadow(0 0 10px ${cfg.glow})`,color:cfg.color,display:"flex"}}>
                  {cfg.icon}
                </div>
              </div>
            </div>
          );
        })()}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              {/* Energy */}
              <div style={{display:"flex",gap:3}}>
                {Array.from({length:gs.maxEnergy},(_,i)=>(
                  <div key={i} style={{width:18,height:18,borderRadius:"50%",background:i<gs.energy?"#f59e0b":"#1c1500",border:`2px solid ${i<gs.energy?"#f59e0b":"#374151"}`}}/>
                ))}
              </div>
              {gs.shield>0&&(
                <div style={{display:"flex",alignItems:"center",gap:3,background:"#1d4ed820",borderRadius:5,padding:"2px 6px"}}>
                  <Shield size={11} color="#60a5fa"/>
                  <span style={{fontSize:11,color:"#60a5fa",fontWeight:700}}>{gs.shield}</span>
                </div>
              )}
              {gs.strength>0&&(
                <div style={{background:"#b4530920",borderRadius:5,padding:"2px 6px"}}>
                  <span style={{fontSize:11,color:C.gold,fontWeight:700}}>{ko?"힘":ja?"力":"Str"}+{gs.strength}</span>
                </div>
              )}
              {gs.poison>0&&(
                <div style={{background:"#7e22ce20",borderRadius:5,padding:"2px 6px"}}>
                  <span style={{fontSize:11,color:"#a855f7",fontWeight:700}}>{ko?"독":ja?"毒":"Poison"} {gs.poison}</span>
                </div>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <Heart size={12} color={C.red}/>
              <span style={{fontSize:13,color:pHpPct>0.5?C.green:pHpPct>0.25?"#facc15":C.red,fontWeight:800}}>{gs.playerHp}</span>
              <span style={{fontSize:11,color:C.textDim}}>/{gs.playerMaxHp}</span>
            </div>
          </div>
          <HpBar hp={gs.playerHp} max={gs.playerMaxHp}/>
        </div>
        </div>{/* /player status wrapper */}

        {/* How-to hint (모바일 절약: 한 줄) */}
        <p style={{margin:0,padding:"0 2px",opacity:0.4,fontSize:10,color:C.textDim,textAlign:"center",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {ko?"카드 클릭 → 사용 · 턴 종료 시 적 행동":ja?"カードタップ→使用 · ターン終了で敵行動":"Tap card to play · End turn for enemy"}
        </p>

        {/* Hand */}
        <div style={{flex:1,overflowX:"auto",display:"flex",gap:8,padding:"4px 0 8px",alignItems:"flex-end"}}>
          {gs.hand.length===0
            ? <p style={{color:C.textDim,fontSize:13,margin:"auto"}}>{ko?"패가 없습니다":ja?"手札がありません":"No cards in hand"}</p>
            : gs.hand.map((card, i) => (
              <div key={card.uid} className="rogue-card-hover">
                <CardView
                  card={card}
                  canPlay={gs.energy >= card.cost}
                  lang={lang}
                  onClick={() => {
                    if (selIdx===i) {
                      if (gs.energy >= card.cost) {
                        const effectType: "attack"|"shield"|"heal"|"power" =
                          card.type === "power" ? "power"
                          : card.heal ? "heal"
                          : card.type === "skill" ? "shield"
                          : "attack";
                        const id = Date.now();
                        setCardEffect({ effectType, multiHit: card.multiHit, id });
                        setTimeout(() => setCardEffect(c => c?.id === id ? null : c), 600);
                      }
                      playCard(i); setSelIdx(null);
                    } else setSelIdx(i);
                  }}
                  selected={selIdx===i}
                />
              </div>
            ))
          }
        </div>

        {/* Bottom bar */}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{fontSize:11,color:C.textDim}}>
            {ko?`덱:${gs.drawPile.length} / 버림:${gs.discardPile.length}`:ja?`山:${gs.drawPile.length} / 捨:${gs.discardPile.length}`:`Draw:${gs.drawPile.length} / Discard:${gs.discardPile.length}`}
          </div>
          <div style={{flex:1}}/>
          {selIdx!==null&&(
            <button onClick={()=>setSelIdx(null)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:12}}>
              {ko?"취소":ja?"キャンセル":"Cancel"}
            </button>
          )}
          <button
            onClick={endTurn}
            style={{background:"#1d3a1d",border:"2px solid #15803d",borderRadius:10,padding:"10px 22px",color:"#4ade80",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >
            {ko?"턴 종료":ja?"ターン終了":"End Turn"}
          </button>
        </div>

        {selIdx!==null&&(
          <p style={{textAlign:"center",fontSize:12,color:C.textDim,margin:0}}>
            {ko?"한 번 더 클릭해서 카드 사용":ja?"もう一度タップしてカード使用":"Tap again to play the card"}
          </p>
        )}
        <DeckModal/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // REWARD
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "reward") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:16}}>
        <style>{css}</style>
        <div style={{textAlign:"center",animation:"rogue-in 0.3s ease-out both"}}>
          <p style={{margin:0,fontSize:20,fontWeight:900,color:C.gold}}>{ko?"카드 보상":ja?"カード報酬":"Card Reward"}</p>
          <p style={{margin:"4px 0 0",fontSize:12,color:C.textDim}}>{ko?"1장을 선택해 덱에 추가하세요":ja?"1枚選んでデッキに追加してください":"Pick 1 card to add to your deck"}</p>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",animation:"rogue-in 0.3s 0.05s ease-out both"}}>
          {gs.rewardCards.map((card,i)=>(
            <div key={i} onClick={()=>pickReward(card)} style={{cursor:"pointer",animation:`rogue-in 0.3s ${0.05+i*0.05}s ease-out both`}}>
              <CardView card={card} canPlay={true} lang={lang}/>
            </div>
          ))}
        </div>
        <button onClick={skipReward} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 20px",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
          {ko?"건너뛰기":ja?"スキップ":"Skip"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // SHOP
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "shop") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:16}}>
        <style>{css}</style>
        <div style={{textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:4}}>
            <ShoppingCart size={20} color={gs.shopInflated?"#f59e0b":"#22c55e"}/>
            <p style={{margin:0,fontSize:20,fontWeight:900,color:gs.shopInflated?"#f59e0b":"#22c55e"}}>
              {gs.shopInflated?(ko?"바가지 상점 ⚠":ja?"ぼったくり商店 ⚠":"Overpriced Shop ⚠"):(ko?"상점":ja?"商店":"Shop")}
            </p>
          </div>
          {gs.shopInflated && (
            <p style={{margin:"0 0 4px",fontSize:12,color:"#fbbf24",fontWeight:700}}>
              {ko?"상인이 가격을 올려놨다... 모든 가격 +50%":ja?"商人が値段を上げた…全価格+50%":"The merchant jacked up prices... all items +50%"}
            </p>
          )}
          <p style={{margin:0,fontSize:13,color:C.gold,fontWeight:700}}>{ko?`보유 골드: ${gs.gold}G`:ja?`所持ゴールド: ${gs.gold}G`:`Gold: ${gs.gold}G`}</p>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
          {gs.shopItems.map((item,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div style={{opacity:item.bought?0.4:1}}>
                <CardView card={item.card} canPlay={!item.bought&&gs.gold>=item.price} lang={lang}/>
              </div>
              <button
                disabled={item.bought||gs.gold<item.price}
                onClick={()=>buyCard(i)}
                style={{
                  background:item.bought?"#1a2030":gs.gold>=item.price?"#14532d":"#1a2030",
                  border:`1px solid ${item.bought?"#334155":gs.gold>=item.price?"#15803d":"#334155"}`,
                  borderRadius:6, padding:"6px 16px", color:item.bought?"#334155":gs.gold>=item.price?"#4ade80":"#64748b",
                  cursor:item.bought||gs.gold<item.price?"not-allowed":"pointer",
                  fontFamily:FONT, fontWeight:700, fontSize:13,
                }}
              >
                {item.bought?(ko?"구매완료":ja?"購入済":"Purchased"):ko?`${item.price}G로 구매`:ja?`${item.price}Gで購入`:`Buy ${item.price}G`}
              </button>
            </div>
          ))}
        </div>
        <button onClick={leaveShop} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 24px",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
          {ko?"상점 나가기":ja?"商店を出る":"Leave Shop"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // REST
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "rest") {
    const healAmt = Math.floor(gs.playerMaxHp * (gs.cursedRest ? 0.10 : 0.30));
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:20}}>
        <style>{css}</style>
        <Flame size={48} color={gs.cursedRest?"#a855f7":"#60a5fa"} style={{animation:"rogue-float 2s ease-in-out infinite"}}/>
        <div style={{textAlign:"center"}}>
          <p style={{margin:0,fontSize:20,fontWeight:900,color:gs.cursedRest?"#a855f7":"#60a5fa"}}>
            {gs.cursedRest?(ko?"저주받은 모닥불":ja?"呪われた焚き火":"Cursed Campfire"):(ko?"모닥불":ja?"焚き火":"Campfire")}
          </p>
          {gs.cursedRest && (
            <p style={{margin:"4px 0",fontSize:12,color:"#c084fc",fontWeight:700}}>
              {ko?"불길한 기운... 회복량이 크게 감소했다":ja?"不吉な気配…回復量が大幅に減少した":"An ominous aura... healing is greatly reduced"}
            </p>
          )}
          <p style={{margin:"4px 0",fontSize:13,color:C.textDim}}>{ko?`현재 HP: ${gs.playerHp} / ${gs.playerMaxHp}`:ja?`現在HP: ${gs.playerHp} / ${gs.playerMaxHp}`:`HP: ${gs.playerHp} / ${gs.playerMaxHp}`}</p>
        </div>
        <button
          onClick={doRest}
          style={{background:gs.cursedRest?"#1a0830":"#082030",border:`2px solid ${gs.cursedRest?"#a855f7":"#60a5fa"}`,borderRadius:10,padding:"12px 28px",color:gs.cursedRest?"#a855f7":"#60a5fa",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FONT}}
        >
          {ko?`HP ${healAmt} 회복하기 (${gs.cursedRest?10:30}%)`:ja?`HP ${healAmt} 回復する（${gs.cursedRest?10:30}%）`:`Rest — Heal ${healAmt} HP (${gs.cursedRest?10:30}%)`}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "gameover") {
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:20}}>
        <style>{css}</style>
        <Skull size={64} color={C.red} style={{animation:"rogue-in 0.5s ease-out both"}}/>
        <div style={{textAlign:"center",animation:"rogue-in 0.4s 0.1s ease-out both"}}>
          {gs.mode === "challenge" ? (
            <>
              <p style={{margin:0,fontSize:26,fontWeight:900,color:C.red}}>{ko?"도전 종료":ja?"挑戦終了":"Challenge Over"}</p>
              <p style={{margin:"8px 0 0",fontSize:16,fontWeight:900,color:"#c084fc"}}>
                {ko?`${gs.floor}칸 도달`:ja?`${gs.floor}マス到達`:`Reached ${gs.floor}`} <span style={{color:C.textDim,fontWeight:700}}>/ {CHALLENGE_FLOORS}</span>
              </p>
              {challengeResult?.isNewRecord && (
                <p style={{margin:"4px 0 0",fontSize:13,fontWeight:800,color:C.gold}}>🎉 {ko?"신기록 달성!":ja?"新記録達成！":"New Record!"}</p>
              )}
              <p style={{margin:"4px 0 0",fontSize:12,color:C.textDim}}>
                {ko?`역대 최고: ${challengeResult?.challengeBest ?? rewardSummary.challengeBest}칸`:ja?`最高: ${challengeResult?.challengeBest ?? rewardSummary.challengeBest}マス`:`Best: ${challengeResult?.challengeBest ?? rewardSummary.challengeBest}`}
              </p>
            </>
          ) : (
            <>
              <p style={{margin:0,fontSize:26,fontWeight:900,color:C.red}}>{ko?"탐험 실패":ja?"探検失敗":"Expedition Failed"}</p>
              <p style={{margin:"6px 0 0",fontSize:13,color:C.textDim}}>
                {ko?`${gs.floor+1}번째 방에서 쓰러졌습니다`:ja?`${gs.floor+1}部屋目で倒れました`:`Fell on floor ${gs.floor+1}`}
              </p>
              <p style={{margin:"4px 0 0",fontSize:13,color:C.textDim}}>
                {ko?`덱: ${gs.deck.length}장`:ja?`デッキ: ${gs.deck.length}枚`:`Deck: ${gs.deck.length} cards`}
              </p>
            </>
          )}
        </div>
        {gs.mode === "challenge" && (challengeResult?.milestones.length ?? 0) > 0 && (
          <MilestoneList milestones={challengeResult!.milestones} labelOf={(n)=>ko?`${n}칸 돌파 보상!`:ja?`${n}マス突破報酬！`:`Stage ${n} Reward!`}/>
        )}
        <div style={{display:"flex",gap:10,animation:"rogue-in 0.4s 0.2s ease-out both"}}>
          <button
            onClick={() => startRun(gs.mode)}
            style={{background:"#1c0a0a",border:`2px solid ${C.red}`,borderRadius:10,padding:"12px 24px",color:C.red,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >
            <div style={{display:"flex",alignItems:"center",gap:6}}><RefreshCw size={16}/>{ko?"다시 도전":ja?"再挑戦":"Try Again"}</div>
          </button>
          <button
            onClick={abandonRun}
            style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 24px",color:C.textDim,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >{ko?"처음으로":ja?"トップへ":"Home"}</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VICTORY
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "victory") {
    const totalClears = parseInt(localStorage.getItem("kebo_rogue_clears") ?? "0", 10);
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:16}}>
        <style>{css}</style>
        <Trophy size={72} color={C.gold} style={{animation:"rogue-float 2s ease-in-out infinite"}}/>
        <div style={{textAlign:"center",animation:"rogue-in 0.4s ease-out both"}}>
          <p style={{margin:0,fontSize:28,fontWeight:900,color:C.gold,letterSpacing:"0.08em"}}>{gs.mode==="challenge"?(ko?"100칸 완주!":ja?"100マス完走！":"100 Stages Cleared!"):(ko?"탐험 성공!":ja?"探検成功！":"Expedition Clear!")}</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:8}}>
            <Skull size={16} color="#4ade80"/>
            <p style={{margin:0,fontSize:14,color:"#4ade80"}}>
              {gs.mode==="challenge"?(ko?"도전 모드를 완전 정복했습니다!":ja?"チャレンジを完全制覇！":"You conquered the Challenge!"):(ko?"카오스 드래곤을 처치했습니다":ja?"カオスドラゴンを撃破しました":"You defeated the Chaos Dragon")}
            </p>
          </div>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textDim}}>
            {ko?`HP ${gs.playerHp} / ${gs.playerMaxHp} · 덱 ${gs.deck.length}장`:ja?`HP ${gs.playerHp} / ${gs.playerMaxHp} · デッキ${gs.deck.length}枚`:`HP ${gs.playerHp} / ${gs.playerMaxHp} · Deck ${gs.deck.length} cards`}
          </p>
          {gs.mode!=="challenge" && (
            <p style={{margin:"4px 0 0",fontSize:12,color:C.textDim}}>
              {ko?`누적 클리어: ${totalClears}회`:ja?`累計クリア: ${totalClears}回`:`Total Clears: ${totalClears}`}
            </p>
          )}
        </div>

        {/* 마일스톤 보상 */}
        {gs.mode==="challenge"
          ? (challengeResult?.milestones.length ?? 0) > 0 && (
              <MilestoneList milestones={challengeResult!.milestones} labelOf={(n)=>ko?`${n}칸 돌파 보상!`:ja?`${n}マス突破報酬！`:`Stage ${n} Reward!`}/>
            )
          : rogueMilestones.length > 0 && (
              <MilestoneList milestones={rogueMilestones} labelOf={(n)=>ko?`${n}회 달성 보상!`:ja?`${n}回達成報酬！`:`${n}-Clear Reward!`}/>
            )}

        <div style={{display:"flex",gap:10,animation:"rogue-in 0.4s 0.2s ease-out both"}}>
          <button
            onClick={() => startRun(gs.mode)}
            style={{background:`linear-gradient(135deg,${C.gold}cc,${C.gold}88)`,border:`2px solid ${C.gold}`,borderRadius:10,padding:"12px 28px",color:"#1c1500",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:FONT}}
          >
            <div style={{display:"flex",alignItems:"center",gap:6}}><RefreshCw size={16}/>{ko?"다시 하기":ja?"もう一度":"Play Again"}</div>
          </button>
          <button
            onClick={abandonRun}
            style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 24px",color:C.textDim,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >{ko?"메인으로":ja?"メインへ":"Home"}</button>
        </div>
      </div>
    );
  }

  return null;
}
