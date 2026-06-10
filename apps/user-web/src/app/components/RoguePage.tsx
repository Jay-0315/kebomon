import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Layers, Swords, Shield, Heart, RefreshCw,
  ShoppingCart, Skull, Trophy, Star, X, Flame, ChevronRight, Crown,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, type CharacterType, type CharacterRarity, getCharName } from "../data/characters";
import { useLang } from "../context/LangContext";
import type { RogueMilestone } from "../types/domain";

const FONT = "'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif";

const C = {
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
  id: string; name: string; nameJa: string;
  cost: number; type: CardType; rarity: CardRarity;
  desc: string; descJa: string; archetype: string;
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
  id: string; name: string; nameJa: string;
  charType: CharacterType; hp: number;
  patterns: EnemyPattern[]; isBoss?: boolean;
}
interface EnemyState extends EnemyDef {
  currentHp: number; currentShield: number;
  currentStrength: number; poisonStacks: number; patternIdx: number;
}
interface GameState {
  phase: Phase; floor: number;
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
}

// ── Card pool ─────────────────────────────────────────────────────────────
const CARDS: CardDef[] = [
  // Universal
  { id:"strike",       name:"스트라이크",   nameJa:"ストライク",       cost:1,type:"attack",rarity:"common",   desc:"6 데미지",           descJa:"6ダメージ",          archetype:"all",     damage:6 },
  { id:"defend",       name:"방어",         nameJa:"ディフェンス",      cost:1,type:"skill", rarity:"common",   desc:"방어력 5",           descJa:"シールド5",          archetype:"all",     shield:5 },
  { id:"bash",         name:"강타",         nameJa:"バッシュ",          cost:2,type:"attack",rarity:"uncommon", desc:"14 데미지",          descJa:"14ダメージ",         archetype:"all",     damage:14 },
  { id:"fortify",      name:"요새화",       nameJa:"フォーティファイ",  cost:2,type:"skill", rarity:"uncommon", desc:"방어력 12",          descJa:"シールド12",         archetype:"all",     shield:12 },
  { id:"dual_strike",  name:"연타",         nameJa:"二連打",            cost:1,type:"attack",rarity:"uncommon", desc:"4 데미지 × 2",      descJa:"4ダメージ×2",        archetype:"all",     damage:4, multiHit:2 },
  { id:"quick_guard",  name:"속방어",       nameJa:"素早い防御",        cost:1,type:"skill", rarity:"common",   desc:"방어력 3, 드로우 1", descJa:"シールド3・ドロー1", archetype:"all",     shield:3,draw:1 },
  { id:"power_surge",  name:"파워 서지",    nameJa:"パワーサージ",      cost:3,type:"attack",rarity:"rare",     desc:"20 데미지",          descJa:"20ダメージ",         archetype:"all",     damage:20 },
  { id:"iron_wall",    name:"철벽",         nameJa:"鉄壁",              cost:3,type:"skill", rarity:"rare",     desc:"방어력 18",          descJa:"シールド18",         archetype:"all",     shield:18 },
  { id:"battle_cry",   name:"전투 함성",    nameJa:"バトルクライ",      cost:1,type:"power", rarity:"rare",     desc:"힘 +2 (영구)",       descJa:"力+2（永続）",       archetype:"all",     strength:2 },
  { id:"second_wind",  name:"재기",         nameJa:"セカンドウィンド",  cost:2,type:"skill", rarity:"epic",     desc:"방어력 8, 드로우 2", descJa:"シールド8・ドロー2", archetype:"all",     shield:8,draw:2 },
  // Warrior
  { id:"war_howl",     name:"전쟁의 외침",  nameJa:"戦の咆哮",          cost:1,type:"power", rarity:"uncommon", desc:"힘 +1, 드로우 1",    descJa:"力+1・ドロー1",     archetype:"warrior", strength:1,draw:1 },
  { id:"feral_strike", name:"야성 연타",    nameJa:"野性連打",          cost:1,type:"attack",rarity:"rare",     desc:"5 데미지 × 2",      descJa:"5ダメージ×2",        archetype:"warrior", damage:5,multiHit:2 },
  { id:"alpha_wrath",  name:"알파의 분노",  nameJa:"アルファの怒り",    cost:2,type:"attack",rarity:"epic",     desc:"18 데미지, 힘 +1",   descJa:"18ダメージ・力+1",   archetype:"warrior", damage:18,strength:1 },
  { id:"war_cry",      name:"전쟁의 함성",  nameJa:"戦いの叫び",        cost:2,type:"power", rarity:"rare",     desc:"힘 +3",              descJa:"力+3",              archetype:"warrior", strength:3 },
  { id:"reckless",     name:"무모한 공격",  nameJa:"無謀な攻撃",        cost:0,type:"attack",rarity:"uncommon", desc:"7 데미지, 자신 2 피해",descJa:"7ダメージ・自身2",  archetype:"warrior", damage:7,selfDamage:2 },
  // Rogue
  { id:"scratch",      name:"할퀴기",       nameJa:"引っ掻き",          cost:0,type:"attack",rarity:"common",   desc:"4 데미지",           descJa:"4ダメージ",          archetype:"rogue",   damage:4 },
  { id:"pounce",       name:"도약 공격",    nameJa:"飛び掛かり",        cost:1,type:"attack",rarity:"uncommon", desc:"8 데미지, 에너지 +1",descJa:"8ダメージ・エナジー+1",archetype:"rogue", damage:8,bonusEnergy:1 },
  { id:"smoke_bomb",   name:"연막탄",       nameJa:"煙幕弾",            cost:1,type:"skill", rarity:"rare",     desc:"방어력 10, 드로우 1",descJa:"シールド10・ドロー1",archetype:"rogue",  shield:10,draw:1 },
  { id:"swift_strike", name:"신속 공격",    nameJa:"迅速打",            cost:1,type:"attack",rarity:"common",   desc:"5 데미지, 드로우 1", descJa:"5ダメージ・ドロー1", archetype:"rogue",   damage:5,draw:1 },
  { id:"backflip",     name:"백플립",       nameJa:"バックフリップ",    cost:1,type:"skill", rarity:"uncommon", desc:"방어력 6, 드로우 2", descJa:"シールド6・ドロー2", archetype:"rogue",   shield:6,draw:2 },
  // Mage
  { id:"soul_drain",   name:"영혼 흡수",    nameJa:"魂の吸収",          cost:2,type:"attack",rarity:"uncommon", desc:"10 데미지, HP +5",   descJa:"10ダメージ・HP+5",   archetype:"mage",    damage:10,heal:5 },
  { id:"haunt",        name:"저주",         nameJa:"呪い",              cost:1,type:"attack",rarity:"uncommon", desc:"6 데미지, 독 2",     descJa:"6ダメージ・毒2",     archetype:"mage",    damage:6,poison:2 },
  { id:"arcane_surge", name:"비전 서지",    nameJa:"アーケインサージ",  cost:2,type:"attack",rarity:"rare",     desc:"16 데미지, 드로우 1",descJa:"16ダメージ・ドロー1",archetype:"mage",   damage:16,draw:1 },
  { id:"phantom_ward", name:"환영 방벽",    nameJa:"幻影の防壁",        cost:1,type:"skill", rarity:"rare",     desc:"방어력 12",          descJa:"シールド12",         archetype:"mage",    shield:12 },
  { id:"curse_bolt",   name:"저주 번개",    nameJa:"呪いの稲妻",        cost:2,type:"attack",rarity:"epic",     desc:"18 데미지, 독 3",    descJa:"18ダメージ・毒3",    archetype:"mage",    damage:18,poison:3 },
  // Tank
  { id:"shell_block",  name:"등껍질 방어",  nameJa:"甲羅防御",          cost:1,type:"skill", rarity:"common",   desc:"방어력 9",           descJa:"シールド9",          archetype:"tank",    shield:9 },
  { id:"crush_bite",   name:"분쇄 물기",    nameJa:"砕く噛みつき",      cost:2,type:"attack",rarity:"uncommon", desc:"13 데미지",          descJa:"13ダメージ",         archetype:"tank",    damage:13 },
  { id:"fortress",     name:"요새",         nameJa:"要塞",              cost:2,type:"skill", rarity:"rare",     desc:"방어력 16, 힘 +1",   descJa:"シールド16・力+1",   archetype:"tank",    shield:16,strength:1 },
  { id:"body_slam",    name:"몸통 박치기",  nameJa:"体当たり",          cost:2,type:"attack",rarity:"rare",     desc:"10 데미지, 방어력 8",descJa:"10ダメージ・シールド8",archetype:"tank",  damage:10,shield:8 },
  { id:"endure",       name:"인내",         nameJa:"忍耐",              cost:0,type:"skill", rarity:"rare",     desc:"방어력 7",           descJa:"シールド7",          archetype:"tank",    shield:7 },
  // Nature
  { id:"thorn_strike", name:"가시 공격",    nameJa:"棘攻撃",            cost:1,type:"attack",rarity:"common",   desc:"7 데미지",           descJa:"7ダメージ",          archetype:"nature",  damage:7 },
  { id:"spore_cloud",  name:"포자 구름",    nameJa:"胞子の雲",          cost:1,type:"skill", rarity:"uncommon", desc:"독 3, 방어력 4",     descJa:"毒3・シールド4",     archetype:"nature",  poison:3,shield:4 },
  { id:"rejuvenate",   name:"재생",         nameJa:"再生",              cost:2,type:"skill", rarity:"rare",     desc:"HP +14",             descJa:"HP+14",              archetype:"nature",  heal:14 },
  { id:"vine_lash",    name:"넝쿨 채찍",    nameJa:"蔓の鞭",            cost:1,type:"attack",rarity:"uncommon", desc:"8 데미지, 독 1",     descJa:"8ダメージ・毒1",     archetype:"nature",  damage:8,poison:1 },
  { id:"photosyn",     name:"광합성",       nameJa:"光合成",            cost:2,type:"skill", rarity:"epic",     desc:"HP +8, 드로우 2",    descJa:"HP+8・ドロー2",      archetype:"nature",  heal:8,draw:2 },
  // Wild
  { id:"overclock",    name:"오버클록",     nameJa:"オーバークロック",  cost:1,type:"power", rarity:"uncommon", desc:"에너지 +2",          descJa:"エナジー+2",         archetype:"wild",    bonusEnergy:2 },
  { id:"self_repair",  name:"자가 수리",    nameJa:"自己修復",          cost:2,type:"skill", rarity:"rare",     desc:"방어력 8, HP +8",    descJa:"シールド8・HP+8",    archetype:"wild",    shield:8,heal:8 },
  { id:"absorb",       name:"흡수",         nameJa:"吸収",              cost:1,type:"skill", rarity:"uncommon", desc:"방어력 8",           descJa:"シールド8",          archetype:"wild",    shield:8 },
  { id:"replicate",    name:"복제",         nameJa:"複製",              cost:2,type:"skill", rarity:"epic",     desc:"드로우 3",           descJa:"ドロー3",            archetype:"wild",    draw:3 },
  { id:"shock_blast",  name:"충격 파동",    nameJa:"衝撃波",            cost:2,type:"attack",rarity:"rare",     desc:"12 데미지, 독 2",    descJa:"12ダメージ・毒2",    archetype:"wild",    damage:12,poison:2 },
  // Legendary
  { id:"final_strike", name:"최후의 일격",  nameJa:"最後の一撃",        cost:3,type:"attack",rarity:"legendary",desc:"25 데미지",          descJa:"25ダメージ",         archetype:"all",     damage:25 },
  { id:"immortal",     name:"불멸",         nameJa:"不滅",              cost:3,type:"skill", rarity:"legendary",desc:"방어력 20, HP +20",  descJa:"シールド20・HP+20",  archetype:"all",     shield:20,heal:20 },
  { id:"berserker",    name:"광전사",       nameJa:"バーサーカー",      cost:2,type:"attack",rarity:"legendary",desc:"6 데미지 × 4",      descJa:"6ダメージ×4",        archetype:"warrior", damage:6,multiHit:4 },
  { id:"shadow_realm", name:"암흑 영역",    nameJa:"暗黒領域",          cost:3,type:"attack",rarity:"legendary",desc:"20 데미지, 독 5",    descJa:"20ダメージ・毒5",    archetype:"mage",    damage:20,poison:5 },
  { id:"ancient_armor",name:"고대의 갑옷",  nameJa:"古代の鎧",          cost:3,type:"skill", rarity:"legendary",desc:"방어력 25, 힘 +2",   descJa:"シールド25・力+2",   archetype:"tank",    shield:25,strength:2 },
];

// ── Enemies ────────────────────────────────────────────────────────────────
const ENEMY_DEFS: EnemyDef[] = [
  { id:"goblin",      name:"슬라임 고블린",  nameJa:"スライムゴブリン",  charType:"slime",  hp:30,  patterns:[{intent:"attack",value:6},{intent:"attack",value:6},{intent:"defend",value:0,shield:5},{intent:"attack",value:8}] },
  { id:"skeleton",    name:"해골 전사",      nameJa:"スケルトン戦士",    charType:"ghost",  hp:38,  patterns:[{intent:"attack",value:7},{intent:"defend",value:0,shield:6},{intent:"attack",value:9},{intent:"attack",value:7}] },
  { id:"orc",         name:"오크 투사",      nameJa:"オーク戦士",        charType:"bear",   hp:55,  patterns:[{intent:"attack",value:10},{intent:"attack",value:10},{intent:"defend",value:0,shield:8},{intent:"attack",value:13}] },
  { id:"darkknight",  name:"흑기사",         nameJa:"黒騎士",            charType:"wolf",   hp:80,  patterns:[{intent:"defend",value:0,shield:10},{intent:"attack",value:12},{intent:"attack",value:12},{intent:"buff",value:0,strength:2},{intent:"attack",value:14}] },
  { id:"poisonwitch", name:"독 마녀",        nameJa:"毒の魔女",          charType:"plant",  hp:65,  patterns:[{intent:"poison",value:7,poison:2},{intent:"poison",value:7,poison:2},{intent:"buff",value:0,strength:2},{intent:"attack",value:10}] },
  { id:"shadowdragon",name:"그림자 드래곤",  nameJa:"シャドウドラゴン",  charType:"dragon", hp:95,  patterns:[{intent:"attack",value:14},{intent:"attack",value:14},{intent:"defend",value:0,shield:12},{intent:"attack",value:18},{intent:"defend",value:0,shield:8}] },
  { id:"chaosboss",   name:"카오스 드래곤",  nameJa:"カオスドラゴン",    charType:"demon",  hp:160, isBoss:true, patterns:[{intent:"attack",value:16},{intent:"attack",value:16},{intent:"defend",value:0,shield:15},{intent:"poison",value:12,poison:3},{intent:"buff",value:0,strength:3},{intent:"attack",value:20}] },
];

// ── Maps ───────────────────────────────────────────────────────────────────
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
function generateMap(): { options: NodeType[] }[] {
  return [
    { options: shuffle(["fight","treasure"] as NodeType[]) },
    { options: shuffle(["fight","shop"]     as NodeType[]) },
    { options: shuffle(["fight","rest"]     as NodeType[]) },
    { options: shuffle(["elite","treasure"] as NodeType[]) },
    { options: shuffle(["elite","shop"]     as NodeType[]) },
    { options: shuffle(["rest","fight"]     as NodeType[]) },
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

function pickRewards(floor: number, arch: string): CardDef[] {
  const allowLeg = floor >= 5;
  const pool = CARDS.filter(c => {
    if (c.rarity==="legendary" && !allowLeg) return false;
    if (c.rarity==="epic" && floor<3) return false;
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

function makeShopItems(arch: string) {
  const pool = shuffle(CARDS.filter(c=>c.archetype===arch||c.archetype==="all")).slice(0,3);
  return pool.map(card=>({ card, price: CARD_PRICE[card.rarity]??60, bought:false }));
}

function spawnEnemyForFloor(floor: number, nodeType: "fight"|"elite"|"boss"): EnemyState {
  let pool: string[];
  if (nodeType==="boss") {
    pool = ["chaosboss"];
  } else if (nodeType==="elite") {
    pool = ELITE_POOL[Math.min(floor, ELITE_POOL.length-1)];
  } else {
    pool = FIGHT_POOL[Math.min(floor, FIGHT_POOL.length-1)];
  }
  const id = pool[Math.floor(Math.random()*pool.length)];
  const def = ENEMY_DEFS.find(e=>e.id===id) ?? ENEMY_DEFS[0];
  return { ...def, currentHp:def.hp, currentShield:0, currentStrength:0, poisonStacks:0, patternIdx:0 };
}

// ── Card Component ─────────────────────────────────────────────────────────
function CardView({ card, canPlay, onClick, selected }: {
  card: CardDef; canPlay: boolean; onClick?: () => void; selected?: boolean;
}) {
  const rs = RARITY_STYLE[card.rarity] ?? RARITY_STYLE.common;
  const accent = TYPE_ACCENT[card.type] ?? "#94a3b8";
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
        }}>{card.type==="attack"?"공격":card.type==="skill"?"기술":"파워"}</div>
      </div>

      {/* Name */}
      <div style={{
        padding:"5px 7px 3px", fontSize:10, fontWeight:800,
        color: C.textBright, lineHeight:1.3,
      }}>{card.name}</div>

      {/* Rarity dot */}
      <div style={{ padding:"0 7px 4px", display:"flex", gap:3 }}>
        {["legendary","epic","rare","uncommon","common"].indexOf(card.rarity) < 3 ? (
          <span style={{
            fontSize:9, fontWeight:700, color: rs.badge,
            background:`${rs.badge}20`, borderRadius:3, padding:"1px 4px",
          }}>
            {card.rarity==="legendary"?"전설":card.rarity==="epic"?"에픽":"레어"}
          </span>
        ) : null}
      </div>

      {/* Desc */}
      <div style={{
        flex:1, padding:"0 7px 6px", fontSize:10, color: C.textDim,
        lineHeight:1.4, overflow:"hidden",
      }}>{card.desc}</div>

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
function IntentBadge({ pattern, ko }: { pattern: EnemyPattern; ko: boolean }) {
  const intentInfo: Record<Intent,{label:string;labelJa:string;color:string;icon:React.ReactNode}> = {
    attack:  { label:"공격", labelJa:"攻撃", color:"#ef4444", icon:<Swords size={12}/> },
    defend:  { label:"방어", labelJa:"防御", color:"#3b82f6", icon:<Shield size={12}/> },
    buff:    { label:"강화", labelJa:"強化", color:"#f59e0b", icon:<Star size={12}/> },
    poison:  { label:"독 공격", labelJa:"毒攻撃", color:"#a855f7", icon:<Flame size={12}/> },
  };
  const info = intentInfo[pattern.intent] ?? intentInfo.attack;
  const val = pattern.intent==="attack"||pattern.intent==="poison" ? pattern.value
    : pattern.shield ?? pattern.strength ?? pattern.value;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:5,
      background:`${info.color}18`, border:`1px solid ${info.color}44`,
      borderRadius:6, padding:"4px 10px", color: info.color,
      fontFamily:FONT, fontSize:12, fontWeight:700,
    }}>
      {info.icon}
      {ko ? info.label : info.labelJa} {val}
      {pattern.poison ? ` + 독${pattern.poison}` : ""}
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
  const { rewardSummary, completeRogue } = useAppData();
  const { lang } = useLang();
  const ko = lang === "ko";

  const equippedId = rewardSummary.equippedCharacterId ?? CHARACTERS[0].id;
  const myChar = CHARACTERS.find(c=>c.id===equippedId) ?? CHARACTERS[0];
  const arch = ARCHETYPE_MAP[myChar.type] ?? "all";

  const [gs, setGs] = useState<GameState | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [rogueMilestones, setRogueMilestones] = useState<RogueMilestone[]>([]);
  const victoryCountedRef = useRef(false);
  const completeRogueRef = useRef(completeRogue);
  completeRogueRef.current = completeRogue;

  useEffect(() => {
    if (gs?.phase === "victory" && !victoryCountedRef.current) {
      victoryCountedRef.current = true;
      const prev = parseInt(localStorage.getItem("kebo_rogue_clears") ?? "0", 10);
      localStorage.setItem("kebo_rogue_clears", String(prev + 1));
      completeRogueRef.current()
        .then(result => { if (result?.milestones.length) setRogueMilestones(result.milestones); })
        .catch(() => undefined);
    }
    if (gs === null) {
      victoryCountedRef.current = false;
      setRogueMilestones([]);
    }
  }, [gs?.phase]);

  // ── Start run ────────────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    const maxHp = RARITY_HP[myChar.rarity] ?? 75;
    const deck = makeStarterDeck(myChar.type);
    setGs({
      phase:"map", floor:-1,
      mapLayout: generateMap(),
      chosenPath: [],
      playerHp:maxHp, playerMaxHp:maxHp,
      shield:0, strength:0, poison:0,
      energy:3, maxEnergy:3,
      deck, hand:[], drawPile:shuffle(deck), discardPile:[],
      gold:0, enemy:null, log:[],
      rewardCards:[], shopItems:[], turnCount:0,
    });
    setSelIdx(null);
  }, [myChar]);

  // ── Enter a map node ─────────────────────────────────────────────────────
  const enterNode = useCallback((floorIdx: number, nodeType: NodeType) => {
    setGs(prev => {
      if (!prev || prev.phase !== "map") return prev;
      const newChosenPath = [...prev.chosenPath, nodeType];

      if (nodeType==="fight"||nodeType==="elite"||nodeType==="boss") {
        const enemy = spawnEnemyForFloor(floorIdx, nodeType as "fight"|"elite"|"boss");
        const drawPile = shuffle([...prev.deck]);
        const drawn = drawN([], drawPile, [], 5);
        return {
          ...prev, phase:"battle", floor:floorIdx,
          chosenPath:newChosenPath,
          shield:0, energy:prev.maxEnergy, enemy,
          hand:drawn.hand, drawPile:drawn.drawPile, discardPile:drawn.discardPile,
          log:[ko?"전투 시작!":"バトル開始！"], turnCount:1,
        };
      }
      if (nodeType==="treasure") {
        return { ...prev, phase:"reward", floor:floorIdx, chosenPath:newChosenPath, rewardCards:pickRewards(floorIdx, arch) };
      }
      if (nodeType==="shop") {
        return { ...prev, phase:"shop", floor:floorIdx, chosenPath:newChosenPath, shopItems:makeShopItems(arch) };
      }
      if (nodeType==="rest") {
        return { ...prev, phase:"rest", floor:floorIdx, chosenPath:newChosenPath };
      }
      return prev;
    });
    setSelIdx(null);
  }, [ko, arch]);

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
      if (card.strength) { strength += card.strength; logs.push(ko?`힘 +${card.strength}`:`力+${card.strength}`); }

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
        logs.push(ko?`${total} 데미지${hitStr}`:`${total}ダメージ${hitStr}`);
      }

      // 3. Shield
      if (card.shield) { shield += card.shield; logs.push(ko?`방어력 +${card.shield}`:`シールド+${card.shield}`); }

      // 4. Heal
      if (card.heal) {
        const h = Math.min(card.heal, prev.playerMaxHp - playerHp);
        playerHp = Math.min(prev.playerMaxHp, playerHp + card.heal);
        if (h>0) logs.push(ko?`HP +${h}`:`HP+${h}`);
      }

      // 5. Poison on enemy
      if (card.poison) { enemy.poisonStacks += card.poison; logs.push(ko?`독 ${card.poison}`:`毒${card.poison}`); }

      // 6. Self damage
      if (card.selfDamage) {
        const abs = Math.min(shield, card.selfDamage);
        shield = Math.max(0, shield - card.selfDamage);
        const direct = card.selfDamage - abs;
        playerHp = Math.max(0, playerHp - direct);
        if (direct>0) logs.push(ko?`자신 -${direct}`:`自身-${direct}`);
      }

      // 7. Bonus energy
      if (card.bonusEnergy) { energy += card.bonusEnergy; logs.push(ko?`에너지 +${card.bonusEnergy}`:`エナジー+${card.bonusEnergy}`); }

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
        if (nodeType==="boss") {
          return { ...prev, playerHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:[...newLog, ko?"승리!":"クリア！"], phase:"victory" };
        }
        const goldGain = nodeType==="elite" ? 35 : 20;
        const rewards = pickRewards(prev.floor, arch);
        return { ...prev, playerHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:[...newLog, ko?"처치!":"撃破！"], phase:"reward", gold:prev.gold+goldGain, rewardCards:rewards };
      }

      // Player dead?
      if (playerHp<=0) {
        return { ...prev, playerHp:0, phase:"gameover", log:newLog, hand:finalHand, drawPile, discardPile };
      }

      return { ...prev, playerHp, shield, strength, energy, enemy, hand:finalHand, drawPile, discardPile, log:newLog };
    });
    setSelIdx(null);
  }, [ko, arch]);

  // ── End turn ─────────────────────────────────────────────────────────────
  const endTurn = useCallback(() => {
    setGs(prev => {
      if (!prev || prev.phase!=="battle" || !prev.enemy) return prev;

      let enemy = { ...prev.enemy };
      let playerHp = prev.playerHp;
      let playerPoison = prev.poison;
      const logs: string[] = [];
      const eName = ko ? enemy.name : enemy.nameJa;

      // Enemy poison tick
      if (enemy.poisonStacks > 0) {
        const pd = enemy.poisonStacks;
        enemy.currentHp = Math.max(0, enemy.currentHp - pd);
        enemy.poisonStacks = Math.max(0, enemy.poisonStacks - 1);
        logs.push(ko?`[독] -${pd} HP`:`[毒] -${pd} HP`);
      }

      if (enemy.currentHp <= 0) {
        const nodeType = prev.chosenPath[prev.floor];
        if (nodeType==="boss") {
          return { ...prev, enemy:{...enemy,currentHp:0}, phase:"victory", log:[...prev.log.slice(-5), ko?"승리!":"クリア！"], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
        }
        const goldGain = nodeType==="elite" ? 35 : 20;
        return { ...prev, enemy:{...enemy,currentHp:0}, phase:"reward", gold:prev.gold+goldGain, rewardCards:pickRewards(prev.floor, arch), log:[...prev.log.slice(-5),...logs,ko?"처치!":"撃破！"], hand:[], discardPile:[...prev.discardPile,...prev.hand] };
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
        logs.push(`[${eName}] ${ko?"공격":"攻撃"} ${atk}${direct<atk?` (${ko?"방어":"盾"}${abs})`:""}${direct>0?` → -${direct}HP`:""}`);
        if (pattern.poison) { playerPoison += pattern.poison; logs.push(ko?`독 ${pattern.poison} 적용`:`毒${pattern.poison}`); }
      }
      if (pattern.intent==="defend") {
        const sh = pattern.shield ?? 0;
        enemy.currentShield = sh;
        logs.push(`[${eName}] ${ko?`방어력 ${sh}`:`シールド${sh}`}`);
      }
      if (pattern.intent==="buff") {
        const str = pattern.strength ?? 0;
        enemy.currentStrength += str;
        logs.push(`[${eName}] ${ko?`힘 +${str}`:`力+${str}`}`);
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
        logs.push(ko?`[나] 독 -${pd} HP`:`[自分] 毒-${pd}HP`);
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
        log:[...prev.log.slice(-4),...logs, ko?`— 턴 ${prev.turnCount+1}`:`— ターン${prev.turnCount+1}`],
        turnCount:prev.turnCount+1,
      };
    });
    setSelIdx(null);
  }, [ko, arch]);

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
      const heal = Math.floor(prev.playerMaxHp * 0.3);
      return { ...prev, playerHp: Math.min(prev.playerMaxHp, prev.playerHp+heal), phase:"map" };
    });
  }, []);

  const abandonRun = useCallback(() => { setGs(null); setSelIdx(null); }, []);

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @keyframes rogue-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes rogue-in{from{opacity:0;transform:scale(0.9) translateY(8px)}to{opacity:1;transform:none}}
    @keyframes rogue-slide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
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
            <p style={{margin:0,color:C.textBright,fontWeight:800,fontSize:15}}>{ko?"덱 보기":"デッキ確認"} ({gs.deck.length}{ko?"장":"枚"})</p>
            <button onClick={()=>setDeckOpen(false)} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim}}><X size={18}/></button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {gs.deck.map((c,i)=>(
              <CardView key={c.uid??i} card={c} canPlay={false}/>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════
  if (!gs) {
    const archLabel: Record<string,string> = { warrior:ko?"전사형":"戦士型", rogue:ko?"도적형":"盗賊型", mage:ko?"마법사형":"魔法使い型", tank:ko?"수호자형":"守護者型", nature:ko?"자연형":"自然型", wild:ko?"야생형":"野生型", all:ko?"만능형":"万能型" };
    const archColor: Record<string,string> = { warrior:"#ef4444", rogue:"#a855f7", mage:"#3b82f6", tank:"#22c55e", nature:"#84cc16", wild:"#f59e0b", all:"#94a3b8" };
    const ac = archColor[arch] ?? "#94a3b8";
    const RARITY_KO: Record<string,string> = { common:"커먼",uncommon:"언커먼",rare:"레어",epic:"에픽",legendary:"레전더리",mythic:"신화" };
    const RARITY_JA: Record<string,string> = { common:"コモン",uncommon:"アンコモン",rare:"レア",epic:"エピック",legendary:"レジェンダリー",mythic:"ミシック" };
    const rarityLabel = ko ? RARITY_KO[myChar.rarity] : RARITY_JA[myChar.rarity];
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
            <p style={{margin:0,fontSize:12,color:C.textDim}}>{ko?"카드 배틀 로그라이크":"カードバトルローグライク"}</p>
          </div>

          {/* Character card */}
          <div style={{background:C.panel,border:`2px solid ${ac}44`,borderRadius:12,padding:20,display:"flex",alignItems:"center",gap:20,overflow:"hidden",animation:"rogue-in 0.4s 0.05s ease-out both"}}>
            <div style={{animation:"rogue-float 3s ease-in-out infinite",flexShrink:0}}>
              <PixelSprite type={myChar.type} colors={myChar.colors} characterId={myChar.id} rarity={myChar.rarity} size={72}/>
            </div>
            <div style={{flex:1}}>
              <p style={{margin:0,fontSize:16,fontWeight:800,color:C.textBright}}>{getCharName(myChar, lang)}</p>
              <p style={{margin:"2px 0 6px",fontSize:11,color:ac}}>{rarityLabel} · {archLabel[arch]}</p>
              <div style={{display:"flex",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.red}18`,borderRadius:6,padding:"3px 8px"}}>
                  <Heart size={11} color={C.red}/>
                  <span style={{fontSize:11,color:C.red,fontWeight:700}}>{RARITY_HP[myChar.rarity]??75}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,background:"#22c55e18",borderRadius:6,padding:"3px 8px"}}>
                  <Layers size={11} color="#22c55e"/>
                  <span style={{fontSize:11,color:"#22c55e",fontWeight:700}}>{ko?"덱 10장":"デッキ10枚"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:16,fontSize:12,color:C.textDim,animation:"rogue-in 0.4s 0.1s ease-out both"}}>
            <p style={{margin:"0 0 8px",color:C.textBright,fontWeight:700}}>{ko?"규칙":"ルール"}</p>
            {[
              ko?"10개의 방을 클리어해 최종 보스를 처치하세요":"10部屋をクリアして最終ボスを倒そう",
              ko?"전투 후 카드 3장 중 1장을 선택해 덱에 추가":"戦闘後、カード3枚から1枚をデッキに追加",
              ko?"에너지를 소비해 카드를 사용":"エナジーを消費してカードを使用",
              ko?"매 턴 방어력은 초기화됩니다":"毎ターン防御力はリセットされます",
            ].map((rule, i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,lineHeight:1.7}}>
                <ChevronRight size={11} color={C.textDim} style={{flexShrink:0,marginTop:3}}/>
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={startRun}
            style={{
              background:`linear-gradient(135deg,${C.gold}cc,${C.gold}88)`,
              border:`2px solid ${C.gold}`,borderRadius:10,padding:"14px 0",
              color:"#1c1500",fontWeight:900,fontSize:16,cursor:"pointer",
              fontFamily:FONT,letterSpacing:"0.05em",
              animation:"rogue-in 0.4s 0.15s ease-out both",
            }}
          >{ko?"탐험 시작!":"探検開始！"}</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // MAP
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "map") {
    const nodeLabel: Record<NodeType,[string,string]> = {
      fight:    [ko?"전투":"戦闘",         "#ef4444"],
      elite:    [ko?"엘리트":"エリート",    "#f97316"],
      treasure: [ko?"보물":"宝物",          "#f59e0b"],
      shop:     [ko?"상점":"商店",          "#22c55e"],
      rest:     [ko?"휴식":"休憩",          "#60a5fa"],
      boss:     [ko?"최종 보스":"最終ボス", "#ec4899"],
    };
    const nodeDesc: Record<NodeType,string> = {
      fight:    ko?"카드 보상":"カード報酬",
      elite:    ko?"35G + 카드":"35G+カード",
      treasure: ko?"카드 선택":"カード選択",
      shop:     ko?"카드 구매":"購入",
      rest:     ko?"HP 30% 회복":"HP30%回復",
      boss:     ko?"최종 보스 처치":"ボス撃破",
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
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:4,background:"#f59e0b18",borderRadius:6,padding:"4px 8px"}}>
              <Star size={12} color={C.gold}/><span style={{fontSize:12,color:C.gold,fontWeight:700}}>{gs.gold}G</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,background:`${C.red}18`,borderRadius:6,padding:"4px 8px"}}>
              <Heart size={12} color={C.red}/><span style={{fontSize:12,color:C.red,fontWeight:700}}>{gs.playerHp}/{gs.playerMaxHp}</span>
            </div>
            <button onClick={()=>setDeckOpen(true)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 10px",color:C.textDim,cursor:"pointer",fontSize:11,fontFamily:FONT}}>
              {ko?`덱 (${gs.deck.length}장)`:`デッキ(${gs.deck.length}枚)`}
            </button>
            <button onClick={abandonRun} style={{background:"none",border:"none",cursor:"pointer",color:C.textDim,fontSize:11,fontFamily:FONT,padding:"4px 6px"}}>
              {ko?"포기":"放棄"}
            </button>
          </div>
        </div>

        {/* Progress + HP */}
        <div style={{maxWidth:520,margin:"0 auto 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
            <span style={{fontSize:11,color:C.textDim,fontWeight:600}}>
              {ko?`${nextFloor}/${totalFloors}층`:`${nextFloor}/${totalFloors}F`}
            </span>
            <div style={{display:"flex",gap:8}}>
              {gs.poison>0&&<span style={{fontSize:11,color:"#a855f7"}}>독 {gs.poison}</span>}
              {gs.strength>0&&<span style={{fontSize:11,color:C.gold}}>힘 +{gs.strength}</span>}
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
                  {isCurrent&&<span style={{fontSize:10,color:"#facc15",fontWeight:700,flexShrink:0}}>{ko?"선택":"選択"}</span>}
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
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",padding:12,gap:10,maxWidth:640,margin:"0 auto"}}>
        <style>{`${css} .rogue-card-hover{transition:transform 0.12s,box-shadow 0.12s}`}</style>

        {/* Enemy area */}
        <div style={{background:C.panelDark,border:`1px solid #3a0a0a`,borderRadius:12,padding:14,animation:"rogue-in 0.3s ease-out both"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{flexShrink:0,animation:"rogue-float 2.5s ease-in-out infinite"}}>
              <PixelSprite type={e.charType} colors={CHARACTERS.find(c=>c.type===e.charType)?.colors ?? {p:"#888",s:"#666",a:"#aaa"}} characterId={0} rarity="common" size={64}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <p style={{margin:0,fontSize:14,fontWeight:800,color:"#fca5a5",display:"flex",alignItems:"center",gap:5}}>
                  {ko?e.name:e.nameJa}
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
                    <span style={{fontSize:11,color:C.gold,fontWeight:700}}>힘+{e.currentStrength}</span>
                  </div>
                )}
                {e.poisonStacks>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:3,background:"#7e22ce20",border:"1px solid #7e22ce",borderRadius:5,padding:"2px 6px"}}>
                    <span style={{fontSize:11,color:"#a855f7",fontWeight:700}}>독{e.poisonStacks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,color:C.textDim,fontWeight:600}}>{ko?"다음 행동:":"次の行動:"}</span>
            <IntentBadge pattern={nextP} ko={ko}/>
          </div>
        </div>

        {/* Battle log */}
        <div style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"8px 12px"}}>
            {gs.log.slice(-3).map((l,i,arr)=>(
              <p key={i} style={{margin:0,fontSize:11,color:i===arr.length-1?C.text:C.textDim,lineHeight:1.7}}>{l}</p>
            ))}
          </div>
          {gs.log.length > 0 && (
            <button
              onClick={()=>setLogExpanded(true)}
              style={{width:"100%",background:"none",border:"none",borderTop:`1px solid ${C.border}22`,padding:"4px 12px",color:C.textDim,fontSize:10,cursor:"pointer",fontFamily:FONT,textAlign:"left",display:"flex",alignItems:"center",gap:4}}
            >
              <ChevronRight size={10} style={{transform:"rotate(90deg)",flexShrink:0}}/>
              {ko?`전체 로그 (${gs.log.length}줄)`:`全ログ(${gs.log.length}行)`}
            </button>
          )}
        </div>

        {/* Log modal */}
        {logExpanded && (
          <div style={{position:"fixed",inset:0,zIndex:999,background:"#000a",display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setLogExpanded(false)}>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:"12px 12px 0 0",width:"100%",maxWidth:640,maxHeight:"60vh",display:"flex",flexDirection:"column",fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                <p style={{margin:0,color:C.textBright,fontWeight:700,fontSize:13}}>{ko?"전투 로그":"戦闘ログ"}</p>
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
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
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
                  <span style={{fontSize:11,color:C.gold,fontWeight:700}}>힘+{gs.strength}</span>
                </div>
              )}
              {gs.poison>0&&(
                <div style={{background:"#7e22ce20",borderRadius:5,padding:"2px 6px"}}>
                  <span style={{fontSize:11,color:"#a855f7",fontWeight:700}}>독{gs.poison}</span>
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

        {/* How-to hint */}
        <div style={{display:"flex",flexDirection:"column",gap:4,padding:"4px 2px",opacity:0.45}}>
          <p style={{margin:0,fontSize:10,color:C.textDim,textAlign:"center"}}>
            {ko?"카드 클릭 → 즉시 사용  ·  흐린 카드는 에너지 부족  ·  턴 종료하면 적이 행동":"カードタップ→即使用  ·  暗いカードはエナジー不足  ·  ターン終了で敵行動"}
          </p>
        </div>

        {/* Hand */}
        <div style={{flex:1,overflowX:"auto",display:"flex",gap:8,padding:"4px 0 8px",alignItems:"flex-end"}}>
          {gs.hand.length===0
            ? <p style={{color:C.textDim,fontSize:13,margin:"auto"}}>{ko?"패가 없습니다":"手札がありません"}</p>
            : gs.hand.map((card, i) => (
              <div key={card.uid} className="rogue-card-hover">
                <CardView
                  card={card}
                  canPlay={gs.energy >= card.cost}
                  onClick={() => {
                    if (selIdx===i) { playCard(i); setSelIdx(null); }
                    else setSelIdx(i);
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
            {ko?`덱:${gs.drawPile.length} / 버림:${gs.discardPile.length}`:`山:${gs.drawPile.length} / 捨:${gs.discardPile.length}`}
          </div>
          <div style={{flex:1}}/>
          {selIdx!==null&&(
            <button onClick={()=>setSelIdx(null)} style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:12}}>
              {ko?"취소":"キャンセル"}
            </button>
          )}
          <button
            onClick={endTurn}
            style={{background:"#1d3a1d",border:"2px solid #15803d",borderRadius:10,padding:"10px 22px",color:"#4ade80",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >
            {ko?"턴 종료":"ターン終了"}
          </button>
        </div>

        {selIdx!==null&&(
          <p style={{textAlign:"center",fontSize:12,color:C.textDim,margin:0}}>
            {ko?"한 번 더 클릭해서 카드 사용":"もう一度タップしてカード使用"}
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
          <p style={{margin:0,fontSize:20,fontWeight:900,color:C.gold}}>{ko?"카드 보상":"カード報酬"}</p>
          <p style={{margin:"4px 0 0",fontSize:12,color:C.textDim}}>{ko?"1장을 선택해 덱에 추가하세요":"1枚選んでデッキに追加してください"}</p>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",animation:"rogue-in 0.3s 0.05s ease-out both"}}>
          {gs.rewardCards.map((card,i)=>(
            <div key={i} onClick={()=>pickReward(card)} style={{cursor:"pointer",animation:`rogue-in 0.3s ${0.05+i*0.05}s ease-out both`}}>
              <CardView card={card} canPlay={true}/>
            </div>
          ))}
        </div>
        <button onClick={skipReward} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 20px",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
          {ko?"건너뛰기":"スキップ"}
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
            <ShoppingCart size={20} color="#22c55e"/>
            <p style={{margin:0,fontSize:20,fontWeight:900,color:"#22c55e"}}>{ko?"상점":"商店"}</p>
          </div>
          <p style={{margin:0,fontSize:13,color:C.gold,fontWeight:700}}>{ko?`보유 골드: ${gs.gold}G`:`所持ゴールド: ${gs.gold}G`}</p>
        </div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
          {gs.shopItems.map((item,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div style={{opacity:item.bought?0.4:1}}>
                <CardView card={item.card} canPlay={!item.bought&&gs.gold>=item.price}/>
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
                {item.bought?(ko?"구매완료":"購入済"):ko?`${item.price}G로 구매`:`${item.price}Gで購入`}
              </button>
            </div>
          ))}
        </div>
        <button onClick={leaveShop} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 24px",color:C.textDim,cursor:"pointer",fontFamily:FONT,fontSize:13}}>
          {ko?"상점 나가기":"商店を出る"}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // REST
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "rest") {
    const healAmt = Math.floor(gs.playerMaxHp * 0.3);
    return (
      <div style={{minHeight:"100vh",background:C.bg,fontFamily:FONT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:20}}>
        <style>{css}</style>
        <Flame size={48} color="#60a5fa" style={{animation:"rogue-float 2s ease-in-out infinite"}}/>
        <div style={{textAlign:"center"}}>
          <p style={{margin:0,fontSize:20,fontWeight:900,color:"#60a5fa"}}>{ko?"모닥불":"焚き火"}</p>
          <p style={{margin:"4px 0",fontSize:13,color:C.textDim}}>{ko?`현재 HP: ${gs.playerHp} / ${gs.playerMaxHp}`:`現在HP: ${gs.playerHp} / ${gs.playerMaxHp}`}</p>
        </div>
        <button
          onClick={doRest}
          style={{background:"#082030",border:"2px solid #60a5fa",borderRadius:10,padding:"12px 28px",color:"#60a5fa",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FONT}}
        >
          {ko?`HP ${healAmt} 회복하기 (30%)`:`HP ${healAmt} 回復する（30%）`}
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
          <p style={{margin:0,fontSize:26,fontWeight:900,color:C.red}}>{ko?"탐험 실패":"探検失敗"}</p>
          <p style={{margin:"6px 0 0",fontSize:13,color:C.textDim}}>
            {ko?`${gs.floor+1}번째 방에서 쓰러졌습니다`:`${gs.floor+1}部屋目で倒れました`}
          </p>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textDim}}>
            {ko?`덱: ${gs.deck.length}장`:`デッキ: ${gs.deck.length}枚`}
          </p>
        </div>
        <div style={{display:"flex",gap:10,animation:"rogue-in 0.4s 0.2s ease-out both"}}>
          <button
            onClick={startRun}
            style={{background:"#1c0a0a",border:`2px solid ${C.red}`,borderRadius:10,padding:"12px 24px",color:C.red,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >
            <div style={{display:"flex",alignItems:"center",gap:6}}><RefreshCw size={16}/>{ko?"다시 도전":"再挑戦"}</div>
          </button>
          <button
            onClick={abandonRun}
            style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 24px",color:C.textDim,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >{ko?"처음으로":"トップへ"}</button>
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
          <p style={{margin:0,fontSize:28,fontWeight:900,color:C.gold,letterSpacing:"0.08em"}}>{ko?"탐험 성공!":"探検成功！"}</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:8}}>
            <Skull size={16} color="#4ade80"/>
            <p style={{margin:0,fontSize:14,color:"#4ade80"}}>
              {ko?"카오스 드래곤을 처치했습니다":"カオスドラゴンを撃破しました"}
            </p>
          </div>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textDim}}>
            {ko?`HP ${gs.playerHp} / ${gs.playerMaxHp} · 덱 ${gs.deck.length}장`:`HP ${gs.playerHp} / ${gs.playerMaxHp} · デッキ${gs.deck.length}枚`}
          </p>
          <p style={{margin:"4px 0 0",fontSize:12,color:C.textDim}}>
            {ko?`누적 클리어: ${totalClears}회`:`累計クリア: ${totalClears}回`}
          </p>
        </div>

        {/* 마일스톤 보상 */}
        {rogueMilestones.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:360,animation:"rogue-in 0.4s 0.1s ease-out both"}}>
            {rogueMilestones.map((m, i) => (
              <div key={i} style={{
                background:"#0a1a0a", border:"1px solid #22c55e44",
                borderRadius:10, padding:"10px 14px",
              }}>
                <p style={{margin:"0 0 7px",fontSize:13,fontWeight:800,color:"#22c55e"}}>
                  🎉 {ko?`${m.clears}회 달성 보상!`:`${m.clears}回達成報酬！`}
                </p>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {m.points>0&&<span style={{fontSize:11,fontWeight:700,color:C.gold,background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:5,padding:"2px 8px"}}>{ko?"포인트":"ポイント"} ×{m.points.toLocaleString()}</span>}
                  {m.stones>0&&<span style={{fontSize:11,fontWeight:700,color:"#60a5fa",background:"#60a5fa15",border:"1px solid #60a5fa44",borderRadius:5,padding:"2px 8px"}}>{ko?"강화석":"強化石"} ×{m.stones}</span>}
                  {m.normalEgg>0&&<span style={{fontSize:11,fontWeight:700,color:"#94a3b8",background:"#94a3b815",border:"1px solid #94a3b844",borderRadius:5,padding:"2px 8px"}}>{ko?"일반 알":"通常卵"} ×{m.normalEgg}</span>}
                  {m.bigEgg>0&&<span style={{fontSize:11,fontWeight:700,color:"#4ade80",background:"#4ade8015",border:"1px solid #4ade8044",borderRadius:5,padding:"2px 8px"}}>{ko?"고급 알":"上級卵"} ×{m.bigEgg}</span>}
                  {m.goldEgg>0&&<span style={{fontSize:11,fontWeight:700,color:C.gold,background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:5,padding:"2px 8px"}}>{ko?"황금 알":"黄金卵"} ×{m.goldEgg}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:10,animation:"rogue-in 0.4s 0.2s ease-out both"}}>
          <button
            onClick={startRun}
            style={{background:`linear-gradient(135deg,${C.gold}cc,${C.gold}88)`,border:`2px solid ${C.gold}`,borderRadius:10,padding:"12px 28px",color:"#1c1500",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:FONT}}
          >
            <div style={{display:"flex",alignItems:"center",gap:6}}><RefreshCw size={16}/>{ko?"다시 하기":"もう一度"}</div>
          </button>
          <button
            onClick={abandonRun}
            style={{background:C.panelDark,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 24px",color:C.textDim,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FONT}}
          >{ko?"메인으로":"メインへ"}</button>
        </div>
      </div>
    );
  }

  return null;
}
