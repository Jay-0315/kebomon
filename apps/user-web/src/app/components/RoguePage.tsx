import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Layers, Swords, Shield, Heart, RefreshCw,
  ShoppingCart, Skull, Trophy, Star, X, Flame, ChevronRight, Crown,
  Sparkles, Award, AlertCircle,
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
type RelicGrade    = "common" | "rare" | "unique";
type RelicCategory = "combat" | "utility" | "reward";
interface RelicDef {
  id: string; name: string; nameJa: string; nameEn: string;
  grade: RelicGrade; category: RelicCategory;
  desc: string; descJa: string; descEn: string;
}

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
  relics: RelicDef[];
  relicPending: boolean;
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
  // Extra (만능) — 종류 보강
  { id:"heavy_blow",   name:"묵직한 일격",  nameJa:"重い一撃",          nameEn:"Heavy Blow",    cost:2,type:"attack",rarity:"common",   desc:"11 데미지",           descJa:"11ダメージ",          descEn:"Deal 11 damage",                  archetype:"all",     damage:11 },
  { id:"twin_fang",    name:"쌍날 송곳니",  nameJa:"双牙",              nameEn:"Twin Fang",     cost:1,type:"attack",rarity:"uncommon", desc:"5 데미지 × 2",       descJa:"5ダメージ×2",         descEn:"Deal 5 damage twice",             archetype:"all",     damage:5,multiHit:2 },
  { id:"bulwark",      name:"방벽",         nameJa:"防壁",              nameEn:"Bulwark",       cost:2,type:"skill", rarity:"uncommon", desc:"방어력 14",           descJa:"シールド14",          descEn:"Gain 14 shield",                  archetype:"all",     shield:14 },
  { id:"adrenaline",   name:"아드레날린",   nameJa:"アドレナリン",      nameEn:"Adrenaline",    cost:0,type:"power", rarity:"uncommon", desc:"에너지 +1, 드로우 1", descJa:"エナジー+1・ドロー1", descEn:"Gain 1 energy, draw 1",           archetype:"all",     bonusEnergy:1,draw:1 },
  { id:"toxic_blade",  name:"맹독 칼날",    nameJa:"猛毒の刃",          nameEn:"Toxic Blade",   cost:1,type:"attack",rarity:"uncommon", desc:"7 데미지, 독 2",      descJa:"7ダメージ・毒2",      descEn:"Deal 7 damage, apply 2 poison",   archetype:"all",     damage:7,poison:2 },
  { id:"shield_bash",  name:"방패 강타",    nameJa:"シールドバッシュ",  nameEn:"Shield Bash",   cost:1,type:"attack",rarity:"uncommon", desc:"6 데미지, 방어력 6",  descJa:"6ダメージ・シールド6",descEn:"Deal 6 damage, gain 6 shield",    archetype:"all",     damage:6,shield:6 },
  { id:"vampiric",     name:"흡혈 일격",    nameJa:"吸血の一撃",        nameEn:"Vampiric Strike",cost:2,type:"attack",rarity:"rare",    desc:"14 데미지, HP +6",    descJa:"14ダメージ・HP+6",   descEn:"Deal 14 damage, heal 6 HP",       archetype:"all",     damage:14,heal:6 },
  { id:"focus",        name:"집중",         nameJa:"集中",              nameEn:"Focus",         cost:1,type:"power", rarity:"rare",     desc:"힘 +2, 드로우 1",     descJa:"力+2・ドロー1",       descEn:"Gain 2 strength, draw 1",         archetype:"all",     strength:2,draw:1 },
  { id:"cataclysm",    name:"대재앙",       nameJa:"大災厄",            nameEn:"Cataclysm",     cost:3,type:"attack",rarity:"epic",     desc:"28 데미지",           descJa:"28ダメージ",          descEn:"Deal 28 damage",                  archetype:"all",     damage:28 },
  { id:"fortress_wall",name:"성벽",         nameJa:"城壁",              nameEn:"Fortress Wall", cost:3,type:"skill", rarity:"epic",     desc:"방어력 22, 드로우 1", descJa:"シールド22・ドロー1", descEn:"Gain 22 shield, draw 1",          archetype:"all",     shield:22,draw:1 },
  // Legendary
  { id:"final_strike", name:"최후의 일격",  nameJa:"最後の一撃",        nameEn:"Final Strike",  cost:3,type:"attack",rarity:"legendary",desc:"40 데미지",           descJa:"40ダメージ",          descEn:"Deal 40 damage",                  archetype:"all",     damage:40 },
  { id:"immortal",     name:"불멸",         nameJa:"不滅",              nameEn:"Immortal",      cost:3,type:"skill", rarity:"legendary",desc:"방어력 20, HP +20",   descJa:"シールド20・HP+20",  descEn:"Gain 20 shield, heal 20 HP",      archetype:"all",     shield:20,heal:20 },
  { id:"berserker",    name:"광전사",       nameJa:"バーサーカー",      nameEn:"Berserker",     cost:2,type:"attack",rarity:"legendary",desc:"6 데미지 × 4",       descJa:"6ダメージ×4",         descEn:"Deal 6 damage four times",        archetype:"warrior", damage:6,multiHit:4 },
  { id:"shadow_realm", name:"암흑 영역",    nameJa:"暗黒領域",          nameEn:"Shadow Realm",  cost:3,type:"attack",rarity:"legendary",desc:"20 데미지, 독 5",     descJa:"20ダメージ・毒5",     descEn:"Deal 20 damage, apply 5 poison",  archetype:"mage",    damage:20,poison:5 },
  { id:"ancient_armor",name:"고대의 갑옷",  nameJa:"古代の鎧",          nameEn:"Ancient Armor", cost:3,type:"skill", rarity:"legendary",desc:"방어력 25, 힘 +2",    descJa:"シールド25・力+2",   descEn:"Gain 25 shield, gain 2 strength", archetype:"tank",    shield:25,strength:2 },
];

// ── Relic pool ─────────────────────────────────────────────────────────────
const RELICS: RelicDef[] = [
  // ── Common / combat ──
  { id:"blade_ring",     grade:"common", category:"combat",   name:"칼날 반지",       nameJa:"刃の指輪",         nameEn:"Blade Ring",       desc:"획득 시 힘 +1 (영구)",         descJa:"取得時、力+1（永続）",      descEn:"Gain +1 strength permanently" },
  { id:"poison_bangle",  grade:"common", category:"combat",   name:"독침 팔찌",       nameJa:"毒針腕輪",         nameEn:"Poison Bangle",    desc:"매 턴 시작 시 적에게 독 1",    descJa:"ターン開始時、毒1付与",     descEn:"Apply 1 poison to enemy each turn" },
  { id:"thorn_bracelet", grade:"common", category:"combat",   name:"가시 팔찌",       nameJa:"棘の腕輪",         nameEn:"Thorn Bracelet",   desc:"피격 시 반사 데미지 1",         descJa:"被撃時、反射1ダメージ",     descEn:"Reflect 1 damage when hit" },
  // ── Common / utility ──
  { id:"compass",        grade:"common", category:"utility",  name:"나침반",          nameJa:"コンパス",         nameEn:"Compass",          desc:"매 전투 시작 시 카드 1장 추가", descJa:"戦闘開始時、1枚追加ドロー", descEn:"Draw 1 extra card at battle start" },
  { id:"bandage",        grade:"common", category:"utility",  name:"붕대",            nameJa:"包帯",             nameEn:"Bandage",          desc:"전투 승리 시 최대 HP +5",      descJa:"戦闘勝利時、最大HP+5",     descEn:"+5 max HP on battle win" },
  // ── Common / reward ──
  { id:"old_wallet",     grade:"common", category:"reward",   name:"낡은 지갑",       nameJa:"古い財布",         nameEn:"Old Wallet",       desc:"전투 승리 시 골드 +15",        descJa:"戦闘勝利時、ゴールド+15",  descEn:"Gain 15 gold on battle win" },
  { id:"lucky_coin",     grade:"common", category:"reward",   name:"행운의 동전",     nameJa:"幸運のコイン",     nameEn:"Lucky Coin",       desc:"보상 카드 4장 중 선택",        descJa:"報酬カード4枚から選択",     descEn:"Choose from 4 reward cards" },
  // ── Rare / combat ──
  { id:"dragon_scale",   grade:"rare",   category:"combat",   name:"용의 비늘",       nameJa:"竜の鱗",           nameEn:"Dragon Scale",     desc:"매 턴 시작 시 방어력 +3",      descJa:"ターン開始時、シールド+3",  descEn:"Gain 3 shield at turn start" },
  { id:"berserker_axe",  grade:"rare",   category:"combat",   name:"광전사의 도끼",   nameJa:"狂戦士の斧",       nameEn:"Berserker Axe",    desc:"획득 시 힘 +2 (영구)",         descJa:"取得時、力+2（永続）",      descEn:"Gain +2 strength permanently" },
  { id:"vampire_ring",   grade:"rare",   category:"combat",   name:"흡혈 반지",       nameJa:"吸血の指輪",       nameEn:"Vampire Ring",     desc:"전투 승리 시 최대 HP +10",     descJa:"戦闘勝利時、最大HP+10",    descEn:"+10 max HP on battle win" },
  { id:"health_potion",  grade:"rare",   category:"combat",   name:"체력 물약",       nameJa:"体力ポーション",   nameEn:"Health Potion",    desc:"매 전투 시작 시 HP +8",        descJa:"戦闘開始時、HP+8",         descEn:"Heal 8 HP at battle start" },
  // ── Rare / utility ──
  { id:"magic_cloak",    grade:"rare",   category:"utility",  name:"마법 망토",       nameJa:"魔法のマント",     nameEn:"Magic Cloak",      desc:"획득 시 최대 HP +20",          descJa:"取得時、最大HP+20",         descEn:"Gain +20 max HP" },
  { id:"energy_crystal", grade:"rare",   category:"utility",  name:"에너지 결정체",   nameJa:"エナジークリスタル",nameEn:"Energy Crystal",   desc:"획득 시 최대 에너지 +1",       descJa:"取得時、最大エナジー+1",    descEn:"Gain +1 max energy" },
  // ── Rare / reward ──
  { id:"gold_pouch",     grade:"rare",   category:"reward",   name:"금화 주머니",     nameJa:"金貨袋",           nameEn:"Gold Pouch",       desc:"골드 획득량 +30%",             descJa:"ゴールド獲得量+30%",        descEn:"+30% gold from battles" },
  // ── Unique / combat ──
  { id:"immortal_heart", grade:"unique", category:"combat",   name:"불멸의 심장",     nameJa:"不滅の心臓",       nameEn:"Immortal Heart",   desc:"런 중 1회 치사 데미지 방어",    descJa:"1回だけ致死ダメージを無効", descEn:"Block lethal damage once per run" },
  { id:"storm_sword",    grade:"unique", category:"combat",   name:"폭풍의 검",       nameJa:"嵐の剣",           nameEn:"Storm Sword",      desc:"획득 시 최대 에너지 +1 (영구)", descJa:"取得時、最大エナジー+1（永続）",descEn:"Gain +1 max energy permanently" },
  // ── Unique / utility ──
  { id:"hourglass",      grade:"unique", category:"utility",  name:"시간의 모래시계", nameJa:"時の砂時計",       nameEn:"Hourglass",        desc:"매 전투 시작 시 카드 2장 추가", descJa:"戦闘開始時、2枚追加ドロー", descEn:"Draw 2 extra cards at battle start" },
  { id:"philosopher",    grade:"unique", category:"utility",  name:"연금술사의 돌",   nameJa:"賢者の石",         nameEn:"Philosopher's Stone",desc:"상점 가격 -25%",              descJa:"ショップ価格-25%",          descEn:"Shop prices -25%" },
  // ── Unique / reward ──
  { id:"fate_dice",      grade:"unique", category:"reward",   name:"운명의 주사위",   nameJa:"運命のサイコロ",   nameEn:"Fate Dice",        desc:"보상 카드 4장, 레어 이상 위주", descJa:"報酬4枚・レア以上中心",     descEn:"4 reward cards, skewed rare+" },
  { id:"master_key",     grade:"unique", category:"reward",   name:"마스터 열쇠",     nameJa:"マスターキー",     nameEn:"Master Key",       desc:"보물 노드 함정 없음",           descJa:"宝物ノードのトラップなし",  descEn:"No ambush trap in treasure nodes" },
];

// ── Difficulty ─────────────────────────────────────────────────────────────
type Difficulty = "normal" | "hard" | "hell" | "challenge";
type RunMode = "story" | "challenge";
const DIFF_HP_MULT:  Record<Difficulty, number> = { normal:0.85, hard:1.25, hell:1.85, challenge:1.3 };
const DIFF_ATK_BONUS:Record<Difficulty, number> = { normal:0,    hard:3,    hell:8,    challenge:4   };
const DIFF_STR_BONUS:Record<Difficulty, number> = { normal:0,    hard:0,    hell:2,    challenge:1   };
const DIFF_GOLD_FIGHT:Record<Difficulty,number> = { normal:50,  hard:65,  hell:80,  challenge:90  };
const DIFF_GOLD_ELITE:Record<Difficulty,number> = { normal:75,  hard:95,  hell:115, challenge:130 };
const DIFF_LEG_FLOOR: Record<Difficulty, number> = { normal:5,  hard:4,   hell:3,   challenge:1   };
const DIFF_EPIC_FLOOR:Record<Difficulty, number> = { normal:3,  hard:2,   hell:1,   challenge:1   };

// ── Challenge mode ───────────────────────────────────────────────────────────
const CHALLENGE_FLOORS = 100;
// 스테이지가 올라갈수록 적 HP·공격력이 계속 증가 (floor = 0-index)
function challengeHpMult(floor: number): number { return 1 + floor * 0.08; }   // stage100 ≈ ×8.9
function challengeAtkBonus(floor: number): number { return Math.floor(floor * 0.45); } // stage100 ≈ +44
// 매 칸 랜덤 선택지 2개. 20스테이지마다 보스만 등장, 10스테이지마다 엘리트 보장, 마지막은 최종 보스.
// 1~3스테이지는 상점 선택지 없음.
function challengeFloorOptions(i: number): NodeType[] {
  if (i >= CHALLENGE_FLOORS - 1) return ["boss"];
  if ((i + 1) % 20 === 0) return ["boss"];
  if ((i + 1) % 10 === 0) return shuffle(["elite", Math.random() < 0.5 ? "rest" : "treasure"] as NodeType[]);
  const PAIRS_NO_SHOP: NodeType[][] = [
    ["fight", "treasure"], ["fight", "rest"],
    ["fight", "elite"],    ["elite", "treasure"], ["elite", "rest"],
    ["fight", "rest"],     ["fight", "treasure"],
  ];
  const PAIRS_WITH_SHOP: NodeType[][] = [
    ["fight", "treasure"], ["fight", "rest"], ["fight", "shop"],
    ["fight", "elite"],    ["elite", "treasure"], ["elite", "rest"],
    ["fight", "rest"],     ["fight", "treasure"], ["rest", "shop"],
  ];
  const pool = i < 3 ? PAIRS_NO_SHOP : PAIRS_WITH_SHOP;
  return shuffle([...pool[(Math.random() * pool.length) | 0]]);
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
function hasRelic(relics: RelicDef[], id: string): boolean { return relics.some(r => r.id === id); }
function pickRelicOffer(owned: RelicDef[], count: number): RelicDef[] {
  const ownedIds = new Set(owned.map(r => r.id));
  return shuffle(RELICS.filter(r => !ownedIds.has(r.id))).slice(0, count);
}

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

function pickRewards(floor: number, arch: string, diff: Difficulty = "normal", extraCard = false, fateDice = false): CardDef[] {
  const count = extraCard ? 4 : 3;
  const allowLeg = floor >= DIFF_LEG_FLOOR[diff];
  const allowEpicFloor = DIFF_EPIC_FLOOR[diff];
  const pool = CARDS.filter(c => {
    if (c.rarity==="legendary" && !allowLeg) return false;
    if (c.rarity==="epic" && floor<allowEpicFloor) return false;
    return c.archetype===arch || c.archetype==="all";
  });
  const weighted: CardDef[] = [];
  for (const c of pool) {
    const baseW = ({common:5,uncommon:4,rare:3,epic:2,legendary:1} as Record<string,number>)[c.rarity]??1;
    const w = fateDice ? (c.rarity==="common"||c.rarity==="uncommon" ? 1 : baseW*3) : baseW;
    for (let i=0;i<w;i++) weighted.push(c);
  }
  const seen = new Set<string>(); const res: CardDef[] = [];
  for (const c of shuffle(weighted)) {
    if (!seen.has(c.id)) { seen.add(c.id); res.push(c); if (res.length===count) break; }
  }
  while (res.length<count) {
    const fb = CARDS.find(c=>!seen.has(c.id));
    if (fb) { seen.add(fb.id); res.push(fb); } else break;
  }
  return res;
}

function makeShopItems(arch: string, inflated = false, discount = false) {
  const pool = shuffle(CARDS.filter(c=>c.archetype===arch||c.archetype==="all")).slice(0,3);
  const mult = (inflated ? 1.5 : 1.0) * (discount ? 0.75 : 1.0);
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
  const earlyMult = (diff==="challenge" && floor < 50) ? 0.7 : 1;
  const hpMult = DIFF_HP_MULT[diff] * (diff==="challenge" ? challengeHpMult(floor) : 1) * earlyMult;
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

// ── Relic category pixel art icons ────────────────────────────────────────
function RelicCombatIcon({ size = 22, color = "#ef4444" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 9" style={{ imageRendering:"pixelated", display:"block", flexShrink:0 }}>
      <rect x="3" y="0" width="2" height="4" fill={color}/>
      <rect x="0" y="4" width="8" height="1" fill={color}/>
      <rect x="3" y="5" width="2" height="2" fill={color} opacity="0.65"/>
      <rect x="2" y="7" width="4" height="2" fill={color}/>
      <rect x="4" y="1" width="1" height="2" fill="rgba(255,255,255,0.35)"/>
    </svg>
  );
}
function RelicUtilityIcon({ size = 22, color = "#22c55e" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 9" style={{ imageRendering:"pixelated", display:"block", flexShrink:0 }}>
      <rect x="1" y="0" width="6" height="1" fill={color}/>
      <rect x="0" y="1" width="8" height="4" fill={color}/>
      <rect x="1" y="5" width="6" height="1" fill={color}/>
      <rect x="2" y="6" width="4" height="1" fill={color}/>
      <rect x="3" y="7" width="2" height="2" fill={color}/>
      <rect x="3" y="2" width="2" height="1" fill="rgba(255,255,255,0.35)"/>
      <rect x="2" y="2" width="1" height="1" fill="rgba(255,255,255,0.35)"/>
    </svg>
  );
}
function RelicRewardIcon({ size = 22, color = "#f59e0b" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" style={{ imageRendering:"pixelated", display:"block", flexShrink:0 }}>
      <rect x="2" y="0" width="4" height="1" fill={color}/>
      <rect x="1" y="1" width="6" height="1" fill={color}/>
      <rect x="0" y="2" width="8" height="4" fill={color}/>
      <rect x="1" y="6" width="6" height="1" fill={color}/>
      <rect x="2" y="7" width="4" height="1" fill={color}/>
      <rect x="2" y="3" width="1" height="2" fill="rgba(255,255,255,0.4)"/>
      <rect x="5" y="3" width="1" height="2" fill="rgba(255,255,255,0.2)"/>
    </svg>
  );
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

  const [sessionChallengeBest, setSessionChallengeBest] = useState(rewardSummary.challengeBest ?? 0);
  const [relicOpen, setRelicOpen] = useState(false);
  const [pendingRelicOffer, setPendingRelicOffer] = useState<RelicDef[] | null>(null);
  const [pendingRelicSwap, setPendingRelicSwap] = useState<RelicDef | null>(null);
  const [pendingCardSwap, setPendingCardSwap] = useState<CardInstance | null>(null);
  const [showRewardGuide, setShowRewardGuide] = useState(false);
  const [guideDiff, setGuideDiff] = useState<"normal"|"hard"|"hell">("normal");
  const [showStarterCards, setShowStarterCards] = useState(false);
  const immortalHeartUsedRef = useRef(false);
  const gsRef = useRef(gs);
  gsRef.current = gs;

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
      completeRogueRef.current(gs.difficulty ?? "normal")
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

  // Track session best for challenge mode (rewardSummary may not refresh)
  useEffect(() => {
    if (challengeResult?.challengeBest != null) {
      setSessionChallengeBest(prev => Math.max(prev, challengeResult.challengeBest));
    }
  }, [challengeResult?.challengeBest]);

  useEffect(() => {
    setSessionChallengeBest(prev => Math.max(prev, rewardSummary.challengeBest ?? 0));
  }, [rewardSummary.challengeBest]);

  // Relic offer after elite/boss/treasure reward
  useEffect(() => {
    if (gs?.phase === "map" && gs.relicPending && !pendingRelicOffer && !pendingRelicSwap) {
      const nodeType = gs.chosenPath[gs.floor];
      const count = nodeType === "boss" ? 3 : 2;
      setPendingRelicOffer(pickRelicOffer(gs.relics, count));
      setGs(prev => prev ? { ...prev, relicPending: false } : prev);
    }
  }, [gs?.phase, gs?.relicPending]);

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
      relics:[], relicPending:false,
    });
    setSelIdx(null);
    immortalHeartUsedRef.current = false;
  }, [myChar, difficulty]);

  // ── Enter a map node ─────────────────────────────────────────────────────
  const enterNode = useCallback((floorIdx: number, nodeType: NodeType) => {
    setGs(prev => {
      if (!prev || prev.phase !== "map") return prev;
      const newChosenPath = [...prev.chosenPath, nodeType];

      if (nodeType==="fight"||nodeType==="elite"||nodeType==="boss") {
        const enemy = spawnEnemyForFloor(floorIdx, nodeType as "fight"|"elite"|"boss", prev.difficulty);
        const drawPile = shuffle([...prev.deck]);
        // Relic: extra draws at battle start
        const extraDraw = (hasRelic(prev.relics,"compass")?1:0) + (hasRelic(prev.relics,"hourglass")?2:0);
        const drawn = drawN([], drawPile, [], 5 + extraDraw);
        // Relic: heal at battle start (health_potion)
        const startHeal = hasRelic(prev.relics,"health_potion") ? Math.min(8, prev.playerMaxHp - prev.playerHp) : 0;
        // 억까: 연전 - elite floor4+ 20% 확률로 2연전
        const chainPending = (nodeType==="elite" && floorIdx >= 4 && Math.random() < 0.20)
          ? spawnEnemyForFloor(floorIdx, "fight", prev.difficulty)
          : null;
        return {
          ...prev, phase:"battle", floor:floorIdx,
          chosenPath:newChosenPath,
          shield:0, energy:prev.maxEnergy,
          playerHp: prev.playerHp + startHeal,
          enemy,
          hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
          log:[ko?"전투 시작!":ja?"バトル開始！":"Battle start!"], turnCount:1,
          chainPending, cursedRest:false, shopInflated:false,
        };
      }
      if (nodeType==="treasure") {
        // 억까: 함정 보물 - 25% 확률로 적 매복 (master_key 기물로 방지)
        if (!hasRelic(prev.relics,"master_key") && Math.random() < 0.25) {
          const enemy = spawnEnemyForFloor(floorIdx, "fight", prev.difficulty);
          const drawPile = shuffle([...prev.deck]);
          const extraDraw = (hasRelic(prev.relics,"compass")?1:0) + (hasRelic(prev.relics,"hourglass")?2:0);
          const drawn = drawN([], drawPile, [], 5 + extraDraw);
          return {
            ...prev, phase:"battle", floor:floorIdx, chosenPath:newChosenPath,
            shield:0, energy:prev.maxEnergy, enemy,
            hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
            log:[ko?"[!] 함정이다! 적이 숨어 있었다!":ja?"[!] トラップ！敵が潜んでいた！":"[!] Ambush! An enemy was hiding!"], turnCount:1,
            chainPending:null, cursedRest:false, shopInflated:false,
          };
        }
        const extraCard = hasRelic(prev.relics,"lucky_coin")||hasRelic(prev.relics,"fate_dice");
        const fateDice = hasRelic(prev.relics,"fate_dice");
        return { ...prev, phase:"reward", floor:floorIdx, chosenPath:newChosenPath, rewardCards:pickRewards(floorIdx, arch, prev.difficulty, extraCard, fateDice), relicPending:true };
      }
      if (nodeType==="shop") {
        // 억까: 바가지 상점 - 30% 확률로 가격 1.5배
        const inflated = Math.random() < 0.30;
        const discount = hasRelic(prev.relics,"philosopher");
        return { ...prev, phase:"shop", floor:floorIdx, chosenPath:newChosenPath, shopItems:makeShopItems(arch, inflated, discount), shopInflated:inflated };
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
        // Relic: permanent max HP gain on kill
        const killMaxHpGain = (hasRelic(prev.relics,"bandage")?5:0) + (hasRelic(prev.relics,"vampire_ring")?10:0);
        const newMaxHp = prev.playerMaxHp + killMaxHpGain;
        const hpAfterKill = Math.min(newMaxHp, playerHp + killMaxHpGain);
        if (nodeType==="boss" && isFinal) {
          return { ...prev, playerHp:hpAfterKill, playerMaxHp:newMaxHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:[...newLog, ko?"승리!":ja?"クリア！":"Victory!"], phase:"victory" };
        }
        if (prev.chainPending) {
          const chainDrawPile = shuffle([...prev.deck]);
          const extraDraw = (hasRelic(prev.relics,"compass")?1:0)+(hasRelic(prev.relics,"hourglass")?2:0);
          const chainDrawn = drawN([], chainDrawPile, [], 5+extraDraw);
          return { ...prev, playerHp:hpAfterKill, playerMaxHp:newMaxHp, shield:0, strength, energy:prev.maxEnergy, enemy:prev.chainPending, chainPending:null,
            hand:chainDrawn.hand, drawPile:chainDrawn.drawPile, discardPile:[],
            log:[...newLog, ko?"[!] 연전! 새로운 적이 나타났다!":ja?"[!] 連戦！新たな敵が出現！":"[!] Chain battle! A new enemy appears!"], turnCount:1,
          };
        }
        const baseGold = nodeType==="elite" ? DIFF_GOLD_ELITE[prev.difficulty] : DIFF_GOLD_FIGHT[prev.difficulty];
        const finalGold = hasRelic(prev.relics,"gold_pouch") ? Math.floor(baseGold*1.3) : baseGold;
        const extraCard = hasRelic(prev.relics,"lucky_coin")||hasRelic(prev.relics,"fate_dice");
        const rewards = pickRewards(prev.floor, arch, prev.difficulty, extraCard, hasRelic(prev.relics,"fate_dice"));
        const newRelicPending = nodeType==="elite" || nodeType==="boss";
        return { ...prev, playerHp:hpAfterKill, playerMaxHp:newMaxHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:[...newLog, ko?"처치!":ja?"撃破！":"Defeated!"], phase:"reward", gold:prev.gold+finalGold, rewardCards:rewards, relicPending:newRelicPending };
      }

      // Player dead?
      if (playerHp<=0) {
        if (hasRelic(prev.relics,"immortal_heart") && !immortalHeartUsedRef.current) {
          immortalHeartUsedRef.current = true;
          playerHp = 1;
          logs.push(ko?"[불멸의 심장] 치사 데미지 무효!":ja?"[不滅の心臓] 致死無効！":"[Immortal Heart] Lethal blocked!");
        } else {
          return { ...prev, playerHp:0, phase:"gameover", log:newLog, hand:finalHand, drawPile, discardPile };
        }
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
        const killMaxHpGain = (hasRelic(prev.relics,"bandage")?5:0)+(hasRelic(prev.relics,"vampire_ring")?10:0);
        const newMaxHp = prev.playerMaxHp + killMaxHpGain;
        const hpAfterKill = Math.min(newMaxHp, playerHp + killMaxHpGain);
        if (nodeType==="boss" && isFinal) {
          return { ...prev, playerHp:hpAfterKill, playerMaxHp:newMaxHp, enemy:{...enemy,currentHp:0}, phase:"victory", log:[...prev.log.slice(-5), ko?"승리!":ja?"クリア！":"Victory!"], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
        }
        if (prev.chainPending) {
          const chainDrawPile = shuffle([...prev.deck]);
          const extraDraw = (hasRelic(prev.relics,"compass")?1:0)+(hasRelic(prev.relics,"hourglass")?2:0);
          const chainDrawn = drawN([], chainDrawPile, [], 5+extraDraw);
          return { ...prev, playerHp:hpAfterKill, playerMaxHp:newMaxHp, enemy:prev.chainPending, chainPending:null,
            shield:0, energy:prev.maxEnergy,
            hand:chainDrawn.hand, drawPile:chainDrawn.drawPile, discardPile:[],
            log:[...prev.log.slice(-3),...logs,ko?"[!] 연전! 새로운 적이 나타났다!":ja?"[!] 連戦！新たな敵が出現！":"[!] Chain battle! A new enemy appears!"], turnCount:1,
          };
        }
        const baseGold = nodeType==="elite" ? DIFF_GOLD_ELITE[prev.difficulty] : DIFF_GOLD_FIGHT[prev.difficulty];
        const finalGold = hasRelic(prev.relics,"gold_pouch") ? Math.floor(baseGold*1.3) : baseGold;
        const extraCard = hasRelic(prev.relics,"lucky_coin")||hasRelic(prev.relics,"fate_dice");
        const newRelicPending = nodeType==="elite" || nodeType==="boss";
        return { ...prev, playerHp:hpAfterKill, playerMaxHp:newMaxHp, enemy:{...enemy,currentHp:0}, phase:"reward", gold:prev.gold+finalGold, rewardCards:pickRewards(prev.floor, arch, prev.difficulty, extraCard, hasRelic(prev.relics,"fate_dice")), relicPending:newRelicPending, log:[...prev.log.slice(-5),...logs,ko?"처치!":ja?"撃破！":"Defeated!"], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
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
        // Relic: thorn bracelet reflects 1 damage when hit
        if (direct > 0 && hasRelic(prev.relics,"thorn_bracelet")) {
          enemy.currentHp = Math.max(0, enemy.currentHp - 1);
          logs.push(ko?"[가시 팔찌] 반사 1":ja?"[棘腕輪] 反射1":"[Thorn Bracelet] Reflect 1");
        }
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
        if (hasRelic(prev.relics,"immortal_heart") && !immortalHeartUsedRef.current) {
          immortalHeartUsedRef.current = true;
          playerHp = 1;
          logs.push(ko?"[불멸의 심장] 치사 데미지 무효!":ja?"[不滅の心臓] 致死無効！":"[Immortal Heart] Lethal blocked!");
        } else {
          return { ...prev, playerHp:0, poison:playerPoison, enemy, phase:"gameover", log:[...prev.log.slice(-5),...logs], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
        }
      }

      // Player poison tick
      if (playerPoison > 0) {
        const pd = playerPoison;
        playerHp = Math.max(0, playerHp - pd);
        playerPoison = Math.max(0, playerPoison - 1);
        logs.push(ko?`[나] 독 -${pd} HP`:ja?`[自分] 毒-${pd}HP`:`[You] Poison -${pd} HP`);
        if (playerHp <= 0) {
          if (hasRelic(prev.relics,"immortal_heart") && !immortalHeartUsedRef.current) {
            immortalHeartUsedRef.current = true;
            playerHp = 1;
            logs.push(ko?"[불멸의 심장] 치사 데미지 무효!":ja?"[不滅の心臓] 致死無効！":"[Immortal Heart] Lethal blocked!");
          } else {
            return { ...prev, playerHp:0, poison:playerPoison, enemy, phase:"gameover", log:[...prev.log.slice(-5),...logs], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
          }
        }
      }

      // Start new player turn: reset shield, draw 5
      const newDisc = [...prev.discardPile, ...prev.hand];
      const extraDraw = (hasRelic(prev.relics,"compass")?1:0)+(hasRelic(prev.relics,"hourglass")?2:0);
      const drawn = drawN([], prev.drawPile, newDisc, 5 + extraDraw);

      // Relic: dragon scale - shield on turn start
      const dragonShield = hasRelic(prev.relics,"dragon_scale") ? 3 : 0;
      // Relic: poison bangle - apply poison to enemy on turn start
      let turnStartEnemy = { ...enemy };
      const turnLogs: string[] = [];
      if (hasRelic(prev.relics,"poison_bangle") && turnStartEnemy.currentHp > 0) {
        turnStartEnemy.poisonStacks += 1;
        turnLogs.push(ko?"[독침 팔찌] 독 1":ja?"[毒針腕輪] 毒1":"[Poison Bangle] +1 poison");
      }

      return {
        ...prev,
        playerHp, poison:playerPoison,
        shield:dragonShield, energy:prev.maxEnergy,
        enemy:turnStartEnemy,
        hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
        log:[...prev.log.slice(-4),...logs,...turnLogs, ko?`— 턴 ${prev.turnCount+1}`:ja?`— ターン${prev.turnCount+1}`:`— Turn ${prev.turnCount+1}`],
        turnCount:prev.turnCount+1,
      };
    });
    setSelIdx(null);
  }, [ko, ja, arch]);

  // ── Pick reward ──────────────────────────────────────────────────────────
  const pickReward = useCallback((card: CardDef) => {
    const newCard = toInst(card);
    if (gsRef.current && gsRef.current.deck.length >= 20) {
      setPendingCardSwap(newCard);
      return;
    }
    setGs(prev => {
      if (!prev) return prev;
      return { ...prev, deck:[...prev.deck, newCard], phase:"map", rewardCards:[] };
    });
  }, []);
  const skipReward = useCallback(() => setGs(p => p ? {...p, phase:"map", rewardCards:[]} : p), []);

  // ── Shop ─────────────────────────────────────────────────────────────────
  const buyCard = useCallback((idx: number) => {
    const cur = gsRef.current;
    if (!cur) return;
    const item = cur.shopItems[idx];
    if (!item || item.bought || cur.gold < item.price) return;
    if (cur.deck.length >= 20) {
      const newCard = toInst(item.card);
      const newItems = cur.shopItems.map((it,i) => i===idx ? {...it,bought:true} : it);
      setGs(prev => prev ? { ...prev, gold:prev.gold-item.price, shopItems:newItems } : prev);
      setPendingCardSwap(newCard);
      return;
    }
    const newItems = cur.shopItems.map((it,i) => i===idx ? {...it,bought:true} : it);
    setGs(prev => {
      if (!prev) return prev;
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

  const abandonRun = useCallback(() => {
    setGs(null); setSelIdx(null);
    setPendingRelicOffer(null); setPendingRelicSwap(null); setPendingCardSwap(null);
  }, []);

  // ── Relic offer handlers ──────────────────────────────────────────────────
  const handlePickRelic = useCallback((relic: RelicDef) => {
    if (!gsRef.current) return;
    if (gsRef.current.relics.length >= 5) {
      setPendingRelicSwap(relic);
      return;
    }
    setGs(prev => {
      if (!prev) return prev;
      let next = { ...prev, relics: [...prev.relics, relic] };
      if (relic.id==="blade_ring")     next = { ...next, strength: next.strength + 1 };
      if (relic.id==="berserker_axe")  next = { ...next, strength: next.strength + 2 };
      if (relic.id==="magic_cloak")    next = { ...next, playerMaxHp: next.playerMaxHp + 20, playerHp: Math.min(next.playerMaxHp + 20, next.playerHp + 20) };
      if (relic.id==="energy_crystal") next = { ...next, maxEnergy: next.maxEnergy + 1, energy: next.energy + 1 };
      if (relic.id==="storm_sword")    next = { ...next, maxEnergy: next.maxEnergy + 1, energy: next.energy + 1 };
      return next;
    });
    setPendingRelicOffer(null);
  }, []);

  const handleSkipRelic = useCallback(() => {
    setPendingRelicOffer(null);
  }, []);

  const handleRelicSwap = useCallback((slotIdx: number) => {
    if (!pendingRelicSwap) return;
    const newRelic = pendingRelicSwap;
    setGs(prev => {
      if (!prev) return prev;
      const oldRelic = prev.relics[slotIdx];
      const newRelics = [...prev.relics]; newRelics[slotIdx] = newRelic;
      let next = { ...prev, relics: newRelics };
      // Reverse old relic immediate effects
      if (oldRelic.id==="blade_ring")     next = { ...next, strength: Math.max(0, next.strength - 1) };
      if (oldRelic.id==="berserker_axe")  next = { ...next, strength: Math.max(0, next.strength - 2) };
      if (oldRelic.id==="magic_cloak")    next = { ...next, playerMaxHp: next.playerMaxHp - 20, playerHp: Math.min(next.playerHp, next.playerMaxHp - 20) };
      if (oldRelic.id==="energy_crystal") next = { ...next, maxEnergy: Math.max(1, next.maxEnergy - 1), energy: Math.max(1, next.energy - 1) };
      if (oldRelic.id==="storm_sword")    next = { ...next, maxEnergy: Math.max(1, next.maxEnergy - 1), energy: Math.max(1, next.energy - 1) };
      // Apply new relic immediate effects
      if (newRelic.id==="blade_ring")     next = { ...next, strength: next.strength + 1 };
      if (newRelic.id==="berserker_axe")  next = { ...next, strength: next.strength + 2 };
      if (newRelic.id==="magic_cloak")    next = { ...next, playerMaxHp: next.playerMaxHp + 20, playerHp: Math.min(next.playerMaxHp + 20, next.playerHp + 20) };
      if (newRelic.id==="energy_crystal") next = { ...next, maxEnergy: next.maxEnergy + 1, energy: next.energy + 1 };
      if (newRelic.id==="storm_sword")    next = { ...next, maxEnergy: next.maxEnergy + 1, energy: next.energy + 1 };
      return next;
    });
    setPendingRelicSwap(null); setPendingRelicOffer(null);
  }, [pendingRelicSwap]);

  const handleRelicSwapSkip = useCallback(() => {
    setPendingRelicSwap(null); setPendingRelicOffer(null);
  }, []);

  // ── Card swap handlers (deck full) ────────────────────────────────────────
  const handleCardSwap = useCallback((replaceIdx: number) => {
    if (!pendingCardSwap) return;
    const newCard = pendingCardSwap;
    setGs(prev => {
      if (!prev) return prev;
      const newDeck = [...prev.deck]; newDeck[replaceIdx] = newCard;
      // If we're in reward phase, go back to map; if in shop, stay in shop
      const nextPhase = prev.phase === "reward" ? "map" : prev.phase;
      return { ...prev, deck: newDeck, phase: nextPhase as Phase, rewardCards: nextPhase==="map"?[]:prev.rewardCards };
    });
    setPendingCardSwap(null);
  }, [pendingCardSwap]);

  const handleCardSwapSkip = useCallback(() => {
    setGs(prev => {
      if (!prev) return prev;
      const nextPhase = prev.phase === "reward" ? "map" : prev.phase;
      return { ...prev, phase: nextPhase as Phase, rewardCards: nextPhase==="map"?[]:prev.rewardCards };
    });
    setPendingCardSwap(null);
  }, []);

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
    .rogue-reward-guide::-webkit-scrollbar{display:none}
    .rogue-reward-guide{scrollbar-width:none;-ms-overflow-style:none}
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

  // ── Relic grade colors ───────────────────────────────────────────────────
  const RELIC_GRADE_COLOR: Record<RelicGrade,string> = { common:"#64748b", rare:"#2563eb", unique:"#a855f7" };
  const RELIC_GRADE_LABEL = (g: RelicGrade) =>
    g==="common" ? (ko?"커먼":ja?"コモン":"Common") :
    g==="rare"   ? (ko?"레어":ja?"レア":"Rare") :
                   (ko?"유니크":ja?"ユニーク":"Unique");
  const RELIC_CAT_LABEL = (c: RelicCategory) =>
    c==="combat"  ? (ko?"전투형":ja?"戦闘型":"Combat") :
    c==="utility" ? (ko?"유틸형":ja?"ユーティリティ":"Utility") :
                    (ko?"보상형":ja?"報酬型":"Reward");

  // ── Relic card view ──────────────────────────────────────────────────────
  const RelicCard = ({ relic, size="md", onClick, selected }: { relic:RelicDef; size?:"sm"|"md"; onClick?:()=>void; selected?:boolean }) => {
    const gc = RELIC_GRADE_COLOR[relic.grade];
    const relicName = ko ? relic.name : ja ? relic.nameJa : relic.nameEn;
    const relicDesc = ko ? relic.desc : ja ? relic.descJa : relic.descEn;
    const CatIcon = relic.category==="combat"
      ? () => <RelicCombatIcon size={size==="sm"?18:22} color={gc}/>
      : relic.category==="utility"
      ? () => <RelicUtilityIcon size={size==="sm"?18:22} color={gc}/>
      : () => <RelicRewardIcon size={size==="sm"?18:22} color={gc}/>;
    return (
      <div onClick={onClick} style={{
        borderRadius:10, border:`2px solid ${selected?"#facc15":gc}`,
        background:`${gc}14`, padding: size==="sm"?"8px 10px":"12px 14px",
        cursor:onClick?"pointer":"default",
        boxShadow: selected?`0 0 16px #facc1566`:`0 0 8px ${gc}33`,
        transition:"all 0.12s", minWidth: size==="sm"?120:160,
        flex:1,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
          <CatIcon/>
          <div>
            <p style={{margin:0,fontSize:size==="sm"?11:13,fontWeight:800,color:"#e2e8f0",lineHeight:1.2}}>{relicName}</p>
            <div style={{display:"flex",gap:4,marginTop:2}}>
              <span style={{fontSize:9,fontWeight:700,color:gc,background:`${gc}22`,borderRadius:3,padding:"1px 5px"}}>{RELIC_GRADE_LABEL(relic.grade)}</span>
              <span style={{fontSize:9,fontWeight:700,color:"#94a3b8",background:"#94a3b822",borderRadius:3,padding:"1px 5px"}}>{RELIC_CAT_LABEL(relic.category)}</span>
            </div>
          </div>
        </div>
        <p style={{margin:0,fontSize:size==="sm"?10:11,color:"#94a3b8",lineHeight:1.4}}>{relicDesc}</p>
      </div>
    );
  };

  // ── Relic modal (view owned) ──────────────────────────────────────────────
  const RelicModal = () => {
    if (!gs || !relicOpen) return null;
    return (
      <div style={{position:"fixed",inset:0,zIndex:999,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setRelicOpen(false)}>
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20,width:"min(540px,94vw)",maxHeight:"80vh",overflow:"auto",fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <p style={{margin:0,color:"#a855f7",fontWeight:800,fontSize:15,display:"flex",alignItems:"center",gap:6}}><Sparkles size={15}/>{ko?"기물 보기":ja?"遺物確認":"Relics"} ({gs.relics.length}/5)</p>
            <button onClick={()=>setRelicOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
          </div>
          {gs.relics.length === 0
            ? <p style={{color:C.textDim,fontSize:13,textAlign:"center",padding:"20px 0"}}>{ko?"보유한 기물이 없습니다":ja?"所持している遺物がありません":"No relics held"}</p>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {gs.relics.map(r=><RelicCard key={r.id} relic={r}/>)}
              </div>
          }
        </div>
      </div>
    );
  };

  // ── Relic offer modal ─────────────────────────────────────────────────────
  const RelicOfferModal = () => {
    if (!pendingRelicOffer || pendingRelicSwap) return null;
    return (
      <div style={{position:"fixed",inset:0,zIndex:998,background:"#000c",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT}}>
        <div style={{background:C.panel,border:"2px solid #a855f744",borderRadius:14,padding:24,width:"min(500px,94vw)",animation:"rogue-in 0.25s ease-out both"}}>
          <p style={{margin:"0 0 4px",fontSize:20,fontWeight:900,color:"#a855f7",textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}><Sparkles size={20} color="#a855f7"/>{ko?"기물 획득":ja?"遺物獲得":"Relic Found"}</p>
          <p style={{margin:"0 0 16px",fontSize:12,color:C.textDim,textAlign:"center"}}>{ko?"1개를 선택해 보유하세요 (최대 5개)":ja?"1つ選んで所持してください（最大5個）":"Pick 1 to keep (max 5 relics)"}</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {pendingRelicOffer.map(r => <RelicCard key={r.id} relic={r} onClick={()=>handlePickRelic(r)}/>)}
          </div>
          <button onClick={handleSkipRelic} style={{marginTop:14,width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 0",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
            {ko?"획득 포기":ja?"取得スキップ":"Skip"}
          </button>
        </div>
      </div>
    );
  };

  // ── Relic swap modal (when holding 5 relics) ──────────────────────────────
  const RelicSwapModal = () => {
    if (!pendingRelicSwap || !gs) return null;
    return (
      <div style={{position:"fixed",inset:0,zIndex:999,background:"#000d",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT}}>
        <div style={{background:C.panel,border:"2px solid #f59e0b44",borderRadius:14,padding:24,width:"min(560px,94vw)",maxHeight:"90vh",overflow:"auto",animation:"rogue-in 0.25s ease-out both"}}>
          <p style={{margin:"0 0 4px",fontSize:18,fontWeight:900,color:C.gold,textAlign:"center"}}>{ko?"기물 교체":ja?"遺物交換":"Swap Relic"}</p>
          <p style={{margin:"0 0 10px",fontSize:12,color:C.textDim,textAlign:"center"}}>{ko?"새 기물:":ja?"新遺物:":"New relic:"}</p>
          <div style={{marginBottom:14}}><RelicCard relic={pendingRelicSwap}/></div>
          <p style={{margin:"0 0 8px",fontSize:12,color:C.textDim}}>{ko?"교체할 기물을 선택하세요 (최대 5개 초과)":ja?"交換する遺物を選択してください":"Choose a relic to replace:"}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {gs.relics.map((r,i)=><RelicCard key={r.id} relic={r} onClick={()=>handleRelicSwap(i)}/>)}
          </div>
          <button onClick={handleRelicSwapSkip} style={{marginTop:14,width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 0",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
            {ko?"획득 포기":ja?"取得スキップ":"Skip"}
          </button>
        </div>
      </div>
    );
  };

  // ── Card swap modal (deck full = 20 cards) ────────────────────────────────
  const CardSwapModal = () => {
    if (!pendingCardSwap || !gs) return null;
    return (
      <div style={{position:"fixed",inset:0,zIndex:999,background:"#000d",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT}}>
        <div style={{background:C.panel,border:"2px solid #f59e0b44",borderRadius:14,padding:20,width:"min(600px,96vw)",maxHeight:"90vh",overflow:"auto",animation:"rogue-in 0.25s ease-out both"}}>
          <p style={{margin:"0 0 4px",fontSize:18,fontWeight:900,color:C.gold,textAlign:"center"}}>{ko?"덱이 가득 찼습니다 (20/20)":ja?"デッキが満杯です（20/20）":"Deck Full (20/20)"}</p>
          <p style={{margin:"0 0 10px",fontSize:12,color:C.textDim,textAlign:"center"}}>{ko?"새 카드:":ja?"新カード:":"New card:"}</p>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <CardView card={pendingCardSwap} canPlay={false} lang={lang}/>
          </div>
          <p style={{margin:"0 0 8px",fontSize:12,color:C.textDim}}>{ko?"교체할 카드를 선택하세요":ja?"交換するカードを選択":"Click a card in your deck to replace it:"}</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",maxHeight:"320px",overflowY:"auto"}}>
            {gs.deck.map((c,i)=>(
              <div key={c.uid??i} onClick={()=>handleCardSwap(i)} style={{cursor:"pointer",opacity:1,transition:"opacity 0.12s"}}
                onMouseEnter={e=>(e.currentTarget.style.opacity="0.7")}
                onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                <CardView card={c} canPlay={false} lang={lang}/>
              </div>
            ))}
          </div>
          <button onClick={handleCardSwapSkip} style={{marginTop:14,width:"100%",background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 0",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
            {ko?"획득 포기":ja?"取得スキップ":"Skip"}
          </button>
        </div>
      </div>
    );
  };

  // ── Global overlays (shown on top of any phase) ───────────────────────────
  const GlobalModals = () => (
    <>
      <CardSwapModal/>
      <RelicSwapModal/>
      <RelicOfferModal/>
      <RelicModal/>
    </>
  );

  // 마일스톤 보상 목록 (도전/스토리 공용)
  const MilestoneList = ({ milestones, labelOf }: { milestones: RogueMilestone[]; labelOf: (n: number) => string }) => (
    <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:360,animation:"rogue-in 0.4s 0.1s ease-out both"}}>
      {milestones.map((m, i) => (
        <div key={i} style={{background:"#0a1a0a",border:"1px solid #22c55e44",borderRadius:10,padding:"10px 14px"}}>
          <p style={{margin:"0 0 7px",fontSize:13,fontWeight:800,color:"#22c55e",display:"flex",alignItems:"center",gap:5}}><Award size={14} color="#22c55e"/>{labelOf(m.clears)}</p>
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
      <>
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <style>{css}</style>
        <div style={{width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:24}}>
          {/* Header */}
          <div style={{animation:"rogue-in 0.4s ease-out both"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Layers size={28} color={C.gold}/>
                <h1 style={{margin:0,fontSize:24,fontWeight:900,color:C.gold,letterSpacing:"0.1em"}}>CARD EXPEDITION</h1>
              </div>
              <button
                onClick={() => setShowRewardGuide(true)}
                style={{flexShrink:0,background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",color:C.textDim,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap" as const}}
              >
                <Award size={12}/>{ko?"보상 안내":ja?"報酬案内":"Rewards"}
              </button>
            </div>
            <p style={{margin:0,fontSize:12,color:C.textDim,textAlign:"center"}}>{ko?"카드 배틀 로그라이크":ja?"カードバトルローグライク":"Card Battle Roguelike"}</p>
          </div>

          {/* Character card */}
          {(()=>{
            const ARCH_UNIQUE: Record<string,string[]> = {
              warrior:["war_howl","reckless"], rogue:["swift_strike","scratch"],
              mage:["haunt","soul_drain"], tank:["shell_block","endure"],
              nature:["thorn_strike","spore_cloud"], wild:["absorb","overclock"],
              all:["quick_guard","battle_cry"],
            };
            const uniqueIds = ARCH_UNIQUE[arch] ?? ARCH_UNIQUE.all;
            const uniqueCards = uniqueIds.map(id=>CARDS.find(c=>c.id===id)!).filter(Boolean);
            const cardTypeColor = (t:string) => t==="attack"?"#ef4444":t==="skill"?"#3b82f6":"#a855f7";
            const cardTypeName = (t:string) => t==="attack"?(ko?"공격":ja?"攻撃":"Atk"):t==="skill"?(ko?"스킬":ja?"スキル":"Skill"):(ko?"기술":ja?"技":"Power");
            return (
            <div style={{background:C.panel,border:`2px solid ${ac}44`,borderRadius:12,padding:20,display:"flex",alignItems:"center",gap:16,animation:"rogue-in 0.4s 0.05s ease-out both",position:"relative"}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:0,fontSize:16,fontWeight:800,color:C.textBright}}>{getCharName(myChar, lang)}</p>
                <p style={{margin:"2px 0 6px",fontSize:11,color:ac}}>{rarityLabel} · {archLabel[arch]}</p>
                <div style={{display:"flex",gap:8,flexWrap:"wrap" as const}}>
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
              {/* Sprite on the right — hover shows starter cards */}
              <div
                style={{flexShrink:0,cursor:"help",position:"relative"}}
                onMouseEnter={()=>setShowStarterCards(true)}
                onMouseLeave={()=>setShowStarterCards(false)}
              >
                <div style={{animation:"rogue-float 3s ease-in-out infinite"}}>
                  <PixelSprite type={myChar.type} colors={myChar.colors} characterId={myChar.id} rarity={myChar.rarity} size={72}/>
                </div>
                <p style={{margin:"3px 0 0",textAlign:"center" as const,fontSize:9,color:C.textDim}}>{ko?"카드 확인":ja?"カード確認":"Cards"}</p>
                {showStarterCards && (
                  <div style={{
                    position:"absolute",right:0,bottom:"calc(100% + 8px)",zIndex:20,
                    background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,
                    padding:10,width:200,boxShadow:"0 8px 24px #000a",
                    animation:"rogue-in 0.15s ease-out both",
                  }}>
                    <p style={{margin:"0 0 6px",fontSize:10,fontWeight:800,color:C.textBright,display:"flex",alignItems:"center",gap:4}}>
                      <Layers size={10} color={ac}/>{ko?"전용 스타터 카드":ja?"専用スターターカード":"Unique Starter Cards"}
                    </p>
                    {uniqueCards.map(card=>(
                      <div key={card.id} style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:5}}>
                        <span style={{fontSize:9,fontWeight:800,color:"#0a0a0a",background:cardTypeColor(card.type),borderRadius:3,padding:"1px 4px",flexShrink:0,lineHeight:1.6}}>{cardTypeName(card.type)}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{margin:0,fontSize:10,fontWeight:700,color:C.textBright,lineHeight:1.2}}>
                            [{card.cost}] {ko?card.name:ja?card.nameJa:card.nameEn}
                          </p>
                          <p style={{margin:0,fontSize:9,color:C.textDim,lineHeight:1.3}}>{ko?card.desc:ja?card.descJa:card.descEn}</p>
                        </div>
                      </div>
                    ))}
                    <p style={{margin:"4px 0 0",fontSize:9,color:C.textDim,borderTop:`1px solid ${C.border}`,paddingTop:4}}>
                      {ko?"공통: 스트라이크×4, 방어×3":ja?"共通: ストライク×4, ディフェンス×3":"Common: Strike×4, Defend×3"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            );
          })()}

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
              <span style={{fontSize:11,color:C.textDim}}>{ko?"최고":ja?"最高":"Best"} <b style={{color:"#c084fc"}}>{sessionChallengeBest}</b>/100</span>
            </div>
            <p style={{margin:"0 0 10px",fontSize:11,color:C.textDim,lineHeight:1.5}}>
              {ko?"100스테이지까지 점점 강해지는 적! 몇 스테이지까지 갈 수 있나? (사망 시 종료)":ja?"100ステージ、敵がどんどん強化！何ステージまで行ける？（死亡で終了）":"100 stages of ever-stronger foes. How far can you go? (ends on death)"}
            </p>
            <button
              onClick={() => startRun("challenge")}
              style={{width:"100%",background:"linear-gradient(135deg,#7c3aedcc,#a855f7aa)",border:"2px solid #a855f7",borderRadius:10,padding:"12px 0",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:FONT}}
            >{ko?"도전 시작!":ja?"挑戦開始！":"Start Challenge!"}</button>
            {challengeRanks.length > 0 && (
              <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                <p style={{margin:"0 0 6px",fontSize:11,fontWeight:700,color:C.textBright,display:"flex",alignItems:"center",gap:4}}><Trophy size={12} color={C.gold}/>{ko?"역대 랭킹":ja?"ランキング":"Rankings"}</p>
                {challengeRanks.slice(0,5).map(r => (
                  <div key={r.userId} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0",fontSize:12}}>
                    <span style={{width:18,textAlign:"right",fontWeight:800,color:r.rank<=3?"#fbbf24":C.textDim}}>{r.rank}</span>
                    <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nickname}</span>
                    <span style={{color:"#c084fc",fontWeight:700}}>{r.best}{ko?"스테이지":ja?"ステージ":" stages"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 보상 안내 모달 ── */}
      {showRewardGuide && (() => {
        const GUIDE_TABS = [
          {id:"normal" as const, label:ko?"노말":ja?"ノーマル":"Normal", color:"#22c55e"},
          {id:"hard"   as const, label:ko?"하드":ja?"ハード":"Hard",     color:"#f97316"},
          {id:"hell"   as const, label:ko?"지옥":ja?"ヘル":"Hell",       color:"#ef4444"},
        ] as const;
        const NORMAL_MS = [
          {c:1,   pts:500,  st:0, ne:1, be:0, ge:0},
          {c:3,   pts:1000, st:1, ne:1, be:0, ge:0},
          {c:5,   pts:1500, st:1, ne:1, be:0, ge:0},
          {c:10,  pts:2000, st:1, ne:0, be:1, ge:0},
          {c:20,  pts:3000, st:2, ne:0, be:1, ge:0},
          {c:30,  pts:3500, st:2, ne:0, be:1, ge:0},
          {c:40,  pts:4000, st:2, ne:0, be:1, ge:0},
          {c:50,  pts:4500, st:2, ne:0, be:1, ge:0},
          {c:75,  pts:5000, st:3, ne:0, be:0, ge:1},
          {c:100, pts:5000, st:3, ne:0, be:0, ge:1},
          {c:125, pts:5500, st:3, ne:0, be:0, ge:1},
          {c:150, pts:5000, st:3, ne:0, be:0, ge:1},
        ];
        const HARD_MS = [
          {c:1,   pts:800,  st:0, ne:1, be:0, ge:0},
          {c:3,   pts:1500, st:1, ne:1, be:0, ge:0},
          {c:5,   pts:2000, st:2, ne:0, be:1, ge:0},
          {c:10,  pts:3000, st:2, ne:0, be:1, ge:0},
          {c:20,  pts:4500, st:3, ne:0, be:1, ge:0},
          {c:30,  pts:5000, st:3, ne:0, be:1, ge:0},
          {c:40,  pts:6000, st:3, ne:0, be:0, ge:1},
          {c:50,  pts:6500, st:3, ne:0, be:0, ge:1},
          {c:75,  pts:7500, st:4, ne:0, be:0, ge:1},
          {c:100, pts:7500, st:4, ne:0, be:0, ge:1},
          {c:125, pts:8000, st:4, ne:0, be:0, ge:1},
          {c:150, pts:7500, st:4, ne:0, be:0, ge:1},
        ];
        const HELL_MS = [
          {c:1,   pts:1000,  st:0, ne:1, be:0, ge:0},
          {c:3,   pts:2000,  st:2, ne:0, be:1, ge:0},
          {c:5,   pts:3000,  st:2, ne:0, be:1, ge:0},
          {c:10,  pts:4000,  st:3, ne:0, be:1, ge:0},
          {c:20,  pts:6000,  st:4, ne:0, be:0, ge:1},
          {c:30,  pts:7000,  st:4, ne:0, be:0, ge:1},
          {c:40,  pts:8000,  st:4, ne:0, be:0, ge:1},
          {c:50,  pts:9000,  st:4, ne:0, be:0, ge:1},
          {c:75,  pts:10000, st:5, ne:0, be:0, ge:1},
          {c:100, pts:10000, st:5, ne:0, be:0, ge:1},
          {c:125, pts:11000, st:5, ne:0, be:0, ge:1},
          {c:150, pts:10000, st:5, ne:0, be:0, ge:1},
        ];
        const msMap = {normal:NORMAL_MS, hard:HARD_MS, hell:HELL_MS};
        const repeatMap = {
          normal:{pts:5000,st:4},
          hard:  {pts:7500,st:5},
          hell:  {pts:10000,st:6},
        };
        const tab = GUIDE_TABS.find(t=>t.id===guideDiff)!;
        const ms = msMap[guideDiff];
        const rep = repeatMap[guideDiff];
        return (
          <div style={{position:"fixed",inset:0,zIndex:999,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowRewardGuide(false)}>
            <div className="rogue-reward-guide" style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,padding:20,width:"min(480px,94vw)",maxHeight:"85vh",overflowY:"auto",fontFamily:FONT,animation:"rogue-in 0.22s ease-out both"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <p style={{margin:0,fontSize:16,fontWeight:800,color:C.gold,display:"flex",alignItems:"center",gap:6}}><Award size={16} color={C.gold}/>{ko?"보상 안내":ja?"報酬案内":"Reward Guide"}</p>
                <button onClick={()=>setShowRewardGuide(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim,fontSize:18,lineHeight:1}}>×</button>
              </div>

              {/* ── 일반 모드 ── */}
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:800,color:"#22c55e",display:"flex",alignItems:"center",gap:5}}><Star size={12} color="#22c55e"/>{ko?"일반 모드 누적 클리어 보상":ja?"通常モード累計クリア報酬":"Normal Mode Milestone Rewards"}</p>

              {/* 난이도 탭 */}
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {GUIDE_TABS.map(t=>(
                  <button key={t.id} onClick={()=>setGuideDiff(t.id)} style={{flex:1,padding:"5px 0",border:`1px solid ${guideDiff===t.id?t.color:C.border}`,borderRadius:7,background:guideDiff===t.id?`${t.color}22`:"transparent",color:guideDiff===t.id?t.color:C.textDim,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FONT,transition:"all 0.15s"}}>{t.label}</button>
                ))}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
                {ms.map(m => (
                  <div key={m.c} style={{background:`${tab.color}08`,border:`1px solid ${tab.color}33`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:800,color:tab.color,minWidth:44}}>{ko?`${m.c}회`:ja?`${m.c}回`:`×${m.c}`}</span>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap" as const,flex:1}}>
                      {m.pts>0&&<span style={{fontSize:10,fontWeight:700,color:C.gold,background:`${C.gold}18`,borderRadius:4,padding:"2px 6px"}}>{m.pts.toLocaleString()}P</span>}
                      {m.st>0&&<span style={{fontSize:10,fontWeight:700,color:"#60a5fa",background:"#60a5fa18",borderRadius:4,padding:"2px 6px"}}>{ko?"강화석":ja?"強化石":"Stone"} ×{m.st}</span>}
                      {m.ne>0&&<span style={{fontSize:10,fontWeight:700,color:"#94a3b8",background:"#94a3b818",borderRadius:4,padding:"2px 6px"}}>{ko?"일반알":ja?"通常卵":"Normal Egg"} ×{m.ne}</span>}
                      {m.be>0&&<span style={{fontSize:10,fontWeight:700,color:"#4ade80",background:"#4ade8018",borderRadius:4,padding:"2px 6px"}}>{ko?"고급알":ja?"上級卵":"Prem.Egg"} ×{m.be}</span>}
                      {m.ge>0&&<span style={{fontSize:10,fontWeight:700,color:C.gold,background:`${C.gold}18`,borderRadius:4,padding:"2px 6px"}}>{ko?"황금알":ja?"黄金卵":"Gold Egg"} ×{m.ge}</span>}
                    </div>
                  </div>
                ))}
                <p style={{margin:"2px 0 0",fontSize:10,color:C.textDim}}>
                  {ko?`※ 150회 이후 매 50회마다 ${rep.pts.toLocaleString()}P + 강화석×${rep.st} + 황금알×1`
                    :ja?`※ 150回以降、50回ごとに${rep.pts.toLocaleString()}P+強化石×${rep.st}+黄金卵×1`
                    :`※ After 150: every 50 clears → ${rep.pts.toLocaleString()}P + Stone×${rep.st} + Gold Egg×1`}
                </p>
              </div>

              {/* ── 도전 모드 ── */}
              <p style={{margin:"0 0 8px",fontSize:12,fontWeight:800,color:"#c084fc",display:"flex",alignItems:"center",gap:5}}><Crown size={12} color="#c084fc"/>{ko?"도전 모드 신기록 달성 보상":ja?"チャレンジモード新記録報酬":"Challenge Mode Best Record Rewards"}</p>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {([
                  {c:5,   pts:500,  st:0, ne:1, be:0, ge:0},
                  {c:10,  pts:1000, st:1, ne:1, be:0, ge:0},
                  {c:20,  pts:1800, st:1, ne:0, be:1, ge:0},
                  {c:30,  pts:2600, st:2, ne:0, be:1, ge:0},
                  {c:50,  pts:4000, st:3, ne:0, be:1, ge:0},
                  {c:75,  pts:5500, st:4, ne:0, be:0, ge:1},
                  {c:100, pts:9000, st:6, ne:0, be:0, ge:2},
                ] as {c:number;pts:number;st:number;ne:number;be:number;ge:number}[]).map(m => (
                  <div key={m.c} style={{background:"#140a20",border:"1px solid #a855f733",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:11,fontWeight:800,color:"#c084fc",minWidth:52}}>{ko?`${m.c}스테이지`:ja?`${m.c}ステージ`:`Stage ${m.c}`}</span>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap" as const,flex:1}}>
                      {m.pts>0&&<span style={{fontSize:10,fontWeight:700,color:C.gold,background:`${C.gold}18`,borderRadius:4,padding:"2px 6px"}}>{m.pts.toLocaleString()}P</span>}
                      {m.st>0&&<span style={{fontSize:10,fontWeight:700,color:"#60a5fa",background:"#60a5fa18",borderRadius:4,padding:"2px 6px"}}>{ko?"강화석":ja?"強化石":"Stone"} ×{m.st}</span>}
                      {m.ne>0&&<span style={{fontSize:10,fontWeight:700,color:"#94a3b8",background:"#94a3b818",borderRadius:4,padding:"2px 6px"}}>{ko?"일반알":ja?"通常卵":"Normal Egg"} ×{m.ne}</span>}
                      {m.be>0&&<span style={{fontSize:10,fontWeight:700,color:"#4ade80",background:"#4ade8018",borderRadius:4,padding:"2px 6px"}}>{ko?"고급알":ja?"上級卵":"Prem.Egg"} ×{m.be}</span>}
                      {m.ge>0&&<span style={{fontSize:10,fontWeight:700,color:C.gold,background:`${C.gold}18`,borderRadius:4,padding:"2px 6px"}}>{ko?"황금알":ja?"黄金卵":"Gold Egg"} ×{m.ge}</span>}
                    </div>
                  </div>
                ))}
                <p style={{margin:"2px 0 0",fontSize:10,color:C.textDim}}>{ko?"※ 신기록 갱신 시에만 지급됩니다":ja?"※ 自己記録更新時のみ支給されます":"※ Paid only when you break your personal best"}</p>
              </div>
            </div>
          </div>
        );
      })()}
      </>
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

        {/* deck + relic buttons */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setDeckOpen(true)} style={{flex:1,background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 0",color:C.textDim,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FONT}}>
            {ko?`덱 (${gs.deck.length})`:ja?`デッキ(${gs.deck.length})`:`Deck (${gs.deck.length})`}
          </button>
          <button onClick={()=>setRelicOpen(true)} style={{background:"#a855f718",border:"1px solid #a855f744",borderRadius:10,padding:"11px 14px",color:"#a855f7",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FONT,display:"flex",alignItems:"center",gap:5}}>
            <Sparkles size={14}/>{gs.relics.length}
          </button>
        </div>
        <DeckModal/>
        <GlobalModals/>
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
            <button onClick={()=>setDeckOpen(true)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 8px",color:C.textDim,cursor:"pointer",fontSize:11,fontFamily:FONT}}>
              {ko?`덱(${gs.deck.length})`:ja?`デッキ(${gs.deck.length})`:`Deck(${gs.deck.length})`}
            </button>
            <button onClick={()=>setRelicOpen(true)} style={{background:"#a855f718",border:"1px solid #a855f744",borderRadius:6,padding:"4px 8px",color:"#a855f7",cursor:"pointer",fontSize:11,fontFamily:FONT,display:"flex",alignItems:"center",gap:3}}>
              <Sparkles size={11}/>{gs.relics.length}
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
        <GlobalModals/>
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

        {/* Battle top bar */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.red}18`,borderRadius:6,padding:"3px 8px",fontSize:11,color:C.red,fontWeight:700,flexShrink:0}}>
            <Heart size={11} color={C.red}/>{gs.playerHp}/{gs.playerMaxHp}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:"#f59e0b18",borderRadius:6,padding:"3px 8px",fontSize:11,color:C.gold,fontWeight:700,flexShrink:0}}>
            <Star size={11} color={C.gold}/>{gs.gold}G
          </div>
          <div style={{flex:1}}/>
          <button onClick={()=>setDeckOpen(true)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",color:C.textDim,cursor:"pointer",fontSize:11,fontFamily:FONT,flexShrink:0}}>
            {ko?`덱(${gs.deck.length})`:ja?`デッキ(${gs.deck.length})`:`Deck(${gs.deck.length})`}
          </button>
          {gs.relics.length > 0 && (
            <button onClick={()=>setRelicOpen(true)} style={{background:"#a855f718",border:"1px solid #a855f744",borderRadius:6,padding:"3px 8px",color:"#a855f7",cursor:"pointer",fontSize:11,fontFamily:FONT,flexShrink:0,display:"flex",alignItems:"center",gap:3}}>
              <Sparkles size={11}/>{gs.relics.length}
            </button>
          )}
          <button onClick={abandonRun} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",color:C.textDim,fontSize:11,cursor:"pointer",fontFamily:FONT,flexShrink:0}}>
            {ko?"포기":ja?"放棄":"Quit"}
          </button>
        </div>

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
                {Array.from({length:Math.max(gs.maxEnergy,gs.energy)},(_,i)=>(
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
        <GlobalModals/>
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
        <CardSwapModal/>
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
              {gs.shopInflated?(
                <span style={{display:"inline-flex",alignItems:"center",gap:5}}>
                  {ko?"바가지 상점":ja?"ぼったくり商店":"Overpriced Shop"}<AlertCircle size={16}/>
                </span>
              ):(ko?"상점":ja?"商店":"Shop")}
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
        <CardSwapModal/>
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
                {ko?`${gs.floor}스테이지 도달`:ja?`${gs.floor}ステージ到達`:`Reached Stage ${gs.floor}`} <span style={{color:C.textDim,fontWeight:700}}>/ {CHALLENGE_FLOORS}</span>
              </p>
              {challengeResult?.isNewRecord && (
                <p style={{margin:"4px 0 0",fontSize:13,fontWeight:800,color:C.gold,display:"flex",alignItems:"center",gap:5}}><Award size={14} color={C.gold}/>{ko?"신기록 달성!":ja?"新記録達成！":"New Record!"}</p>
              )}
              <p style={{margin:"4px 0 0",fontSize:12,color:C.textDim}}>
                {ko?`역대 최고: ${Math.max(sessionChallengeBest, challengeResult?.challengeBest ?? 0)}스테이지`:ja?`最高: ${Math.max(sessionChallengeBest, challengeResult?.challengeBest ?? 0)}ステージ`:`Best: Stage ${Math.max(sessionChallengeBest, challengeResult?.challengeBest ?? 0)}`}
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
          <MilestoneList milestones={challengeResult!.milestones} labelOf={(n)=>ko?`${n}스테이지 돌파 보상!`:ja?`${n}ステージ突破報酬！`:`Stage ${n} Reward!`}/>
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
          <p style={{margin:0,fontSize:28,fontWeight:900,color:C.gold,letterSpacing:"0.08em"}}>{gs.mode==="challenge"?(ko?"100스테이지 완주!":ja?"100ステージ完走！":"100 Stages Cleared!"):(ko?"탐험 성공!":ja?"探検成功！":"Expedition Clear!")}</p>
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
              <MilestoneList milestones={challengeResult!.milestones} labelOf={(n)=>ko?`${n}스테이지 돌파 보상!`:ja?`${n}ステージ突破報酬！`:`Stage ${n} Reward!`}/>
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
