import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// ═══════════════════════════════════════════════════════════════════════════════
// 캐릭터 ID → 타입 매핑
// ═══════════════════════════════════════════════════════════════════════════════
const CHAR_TYPE: Record<number, string> = {
  4:"ghost",5:"plant",6:"fish",7:"owl",8:"bear",9:"turtle",11:"wolf",12:"robot",
  13:"slime",14:"cat",16:"ghost",17:"plant",18:"fish",19:"owl",20:"bear",21:"turtle",
  22:"fox",26:"cat",28:"ghost",29:"plant",30:"fish",31:"owl",32:"bear",33:"turtle",
  34:"fox",35:"wolf",36:"robot",37:"slime",38:"cat",39:"rabbit",40:"ghost",41:"plant",
  42:"fish",43:"owl",44:"bear",51:"cat",52:"rabbit",53:"ghost",54:"plant",55:"fish",
  56:"owl",57:"bear",58:"turtle",59:"fox",60:"wolf",61:"robot",64:"rabbit",65:"ghost",
  66:"plant",67:"fish",69:"bear",71:"fox",72:"wolf",73:"robot",74:"slime",75:"cat",
  76:"rabbit",83:"turtle",84:"dragon",90:"phoenix",91:"rabbit",96:"dragon",99:"dragon",
  104:"rabbit",105:"wolf",116:"demon",117:"slime",120:"wolf",121:"fox",125:"tiger",
  127:"lion",128:"lion",129:"lion",131:"lion",132:"tiger",135:"lion",136:"phoenix",
  137:"phoenix",139:"snake",140:"horse",141:"deer",144:"horse",150:"phoenix",152:"boar",
  153:"deer",154:"dragon",155:"whale",156:"eagle",158:"lion",159:"crocodile",160:"snake",
  161:"whale",163:"snake",169:"horse",172:"dragon",173:"whale",174:"dragon",176:"phoenix",
  177:"boar",178:"boar",179:"unicorn",180:"horse",191:"whale",193:"whale",194:"phoenix",
  204:"owl",205:"fox",206:"whale",208:"cat",216:"horse",220:"boar",221:"robot",232:"boar",
  233:"slime",235:"boar",238:"turtle",239:"slime",240:"deer",241:"deer",242:"deer",
  243:"deer",252:"monkey",253:"monkey",254:"robot",255:"monkey",258:"monkey",259:"monkey",
  260:"monkey",267:"tiger",268:"tiger",271:"tiger",272:"tiger",273:"raven",274:"raven",
  275:"raven",276:"raven",277:"raven",278:"raven",287:"beetle",288:"beetle",290:"beetle",
  291:"beetle",292:"beetle",293:"snake",294:"beetle",304:"crocodile",305:"crocodile",
  306:"crocodile",307:"crocodile",308:"snake",309:"crocodile",313:"unicorn",322:"elephant",
  323:"elephant",324:"elephant",331:"elephant",332:"elephant",333:"elephant",335:"eagle",
  336:"snake",337:"eagle",338:"eagle",339:"eagle",344:"horse",349:"unicorn",350:"unicorn",
  351:"unicorn",352:"unicorn",355:"eagle",372:"demon",373:"demon",375:"demon",377:"demon",
  378:"demon",388:"angel",389:"angel",390:"angel",391:"angel",392:"angel",393:"angel",
};

const TYPE_ARCHETYPE: Record<string, string> = {
  wolf:"warrior", tiger:"warrior", lion:"warrior", bear:"warrior",
  cat:"rogue",    rabbit:"rogue",  deer:"rogue",   eagle:"rogue",
  ghost:"mage",   owl:"mage",      dragon:"mage",  angel:"mage",  phoenix:"mage",
  turtle:"tank",  elephant:"tank", whale:"tank",   crocodile:"tank", boar:"tank",
  plant:"nature", fish:"nature",   unicorn:"nature", horse:"nature",
  robot:"meka",   slime:"meka",    beetle:"meka",
  fox:"cursed",   monkey:"cursed", raven:"cursed", snake:"cursed", demon:"cursed",
};

const CHAR_RARITY: Record<number, string> = {
  4:"common",5:"common",6:"common",7:"common",8:"common",9:"common",
  11:"common",12:"common",13:"uncommon",14:"uncommon",16:"uncommon",
  17:"uncommon",18:"uncommon",19:"uncommon",20:"uncommon",21:"uncommon",
  22:"uncommon",26:"rare",28:"rare",29:"rare",30:"rare",31:"rare",
  32:"rare",33:"rare",34:"rare",35:"rare",36:"rare",37:"epic",38:"epic",
  39:"epic",40:"epic",41:"epic",42:"epic",43:"epic",44:"epic",
  51:"legendary",52:"legendary",53:"legendary",54:"legendary",55:"legendary",
  56:"legendary",57:"legendary",58:"legendary",59:"legendary",60:"legendary",
  61:"legendary",64:"mythic",65:"mythic",66:"mythic",67:"mythic",69:"mythic",
  71:"mythic",72:"mythic",73:"mythic",74:"common",75:"common",76:"common",
  83:"mythic",84:"uncommon",90:"uncommon",91:"uncommon",96:"rare",99:"epic",
  104:"rare",105:"uncommon",116:"common",117:"rare",120:"epic",121:"epic",
  125:"common",127:"common",128:"uncommon",129:"rare",131:"epic",132:"uncommon",
  135:"legendary",136:"epic",137:"legendary",139:"common",140:"common",
  141:"common",144:"uncommon",150:"mythic",152:"common",153:"uncommon",
  154:"legendary",155:"common",156:"common",158:"mythic",159:"common",
  160:"uncommon",161:"uncommon",163:"rare",169:"rare",172:"mythic",
  173:"rare",174:"common",176:"common",177:"uncommon",178:"rare",179:"rare",
  180:"epic",191:"legendary",193:"mythic",194:"rare",204:"mythic",205:"common",
  206:"epic",208:"mythic",216:"legendary",220:"epic",221:"uncommon",
  232:"legendary",233:"legendary",235:"mythic",238:"epic",239:"mythic",
  240:"rare",241:"epic",242:"legendary",243:"mythic",252:"epic",
  253:"legendary",254:"epic",255:"mythic",258:"common",259:"uncommon",
  260:"rare",267:"legendary",268:"mythic",271:"rare",272:"epic",
  273:"legendary",274:"mythic",275:"common",276:"uncommon",277:"rare",
  278:"epic",287:"rare",288:"epic",290:"legendary",291:"mythic",292:"common",
  293:"epic",294:"uncommon",304:"uncommon",305:"rare",306:"epic",
  307:"legendary",308:"legendary",309:"mythic",313:"epic",322:"uncommon",
  323:"rare",324:"epic",331:"legendary",332:"mythic",333:"common",335:"rare",
  336:"mythic",337:"epic",338:"legendary",339:"mythic",344:"mythic",
  349:"legendary",350:"mythic",351:"common",352:"uncommon",355:"uncommon",
  372:"epic",373:"legendary",375:"mythic",377:"uncommon",378:"rare",
  388:"epic",389:"legendary",390:"mythic",391:"common",392:"uncommon",
  393:"rare",
};

// ═══════════════════════════════════════════════════════════════════════════════
// 속성 시스템
// ═══════════════════════════════════════════════════════════════════════════════
const ARCH_ELEMENT: Record<string, string> = {
  warrior:"fire", tank:"earth", mage:"ice", rogue:"dark",
  nature:"nature", meka:"lightning", cursed:"shadow", all:"light",
};

// A가 B를 공격할 때 유리 (15% 추가 피해)
const ELEMENT_ADVANTAGE: Record<string, string> = {
  fire:"nature", nature:"ice", ice:"fire",
  dark:"light",  light:"shadow", shadow:"dark",
  lightning:"earth", earth:"lightning",
};
const ELEMENT_BONUS = 1.15;

// ═══════════════════════════════════════════════════════════════════════════════
// 스탯 테이블 (완전판)
// ═══════════════════════════════════════════════════════════════════════════════
interface BaseStats {
  hp: number; atk: number; def: number; spd: number;
  critRate: number; critDmg: number;
  effectiveness: number; effectResist: number;
}

const RARITY_BASE: Record<string, BaseStats> = {
  common:    { hp:2800,  atk:820,  def:580,  spd:90,  critRate:0.15, critDmg:1.50, effectiveness:0.00, effectResist:0.00 },
  uncommon:  { hp:3400,  atk:960,  def:680,  spd:95,  critRate:0.15, critDmg:1.50, effectiveness:0.00, effectResist:0.00 },
  rare:      { hp:4100,  atk:1120, def:810,  spd:100, critRate:0.15, critDmg:1.50, effectiveness:0.00, effectResist:0.00 },
  epic:      { hp:5000,  atk:1320, def:970,  spd:106, critRate:0.15, critDmg:1.50, effectiveness:0.00, effectResist:0.00 },
  legendary: { hp:6100,  atk:1580, def:1160, spd:112, critRate:0.15, critDmg:1.50, effectiveness:0.00, effectResist:0.00 },
  mythic:    { hp:7500,  atk:1950, def:1420, spd:120, critRate:0.15, critDmg:1.75, effectiveness:0.00, effectResist:0.00 },
};

interface ArchMult {
  hp: number; atk: number; def: number; spd: number;
  critRate: number; critDmg: number;
  effectiveness: number; effectResist: number;
}
const ARCHETYPE_MULT: Record<string, ArchMult> = {
  warrior: { hp:1.00, atk:1.30, def:0.90, spd:1.00, critRate:0.10, critDmg:0.25, effectiveness:0.00, effectResist:0.00 },
  tank:    { hp:1.65, atk:0.60, def:1.60, spd:0.75, critRate:0.00, critDmg:0.00, effectiveness:0.00, effectResist:0.20 },
  mage:    { hp:0.80, atk:1.55, def:0.70, spd:1.00, critRate:0.05, critDmg:0.35, effectiveness:0.25, effectResist:0.00 },
  rogue:   { hp:0.85, atk:1.15, def:0.75, spd:1.40, critRate:0.25, critDmg:0.35, effectiveness:0.10, effectResist:0.00 },
  nature:  { hp:1.30, atk:0.80, def:1.10, spd:0.90, critRate:0.00, critDmg:0.00, effectiveness:0.10, effectResist:0.10 },
  meka:    { hp:1.10, atk:1.05, def:1.10, spd:1.10, critRate:0.05, critDmg:0.10, effectiveness:0.05, effectResist:0.05 },
  cursed:  { hp:0.80, atk:1.45, def:0.75, spd:1.10, critRate:0.05, critDmg:0.20, effectiveness:0.30, effectResist:0.00 },
  all:     { hp:1.00, atk:1.00, def:1.00, spd:1.00, critRate:0.00, critDmg:0.00, effectiveness:0.00, effectResist:0.00 },
};

const ENHANCE_PER_LEVEL: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
  warrior: { hp:3, atk:5, def:3, spd:2 },
  tank:    { hp:6, atk:2, def:6, spd:1 },
  mage:    { hp:2, atk:6, def:2, spd:1 },
  rogue:   { hp:2, atk:3, def:2, spd:5 },
  nature:  { hp:5, atk:2, def:4, spd:2 },
  meka:    { hp:3, atk:3, def:3, spd:3 },
  cursed:  { hp:2, atk:4, def:2, spd:4 },
  all:     { hp:3, atk:3, def:3, spd:3 },
};

export function getCharStat(charId: number, enhLevel = 0) {
  const charType = CHAR_TYPE[charId] ?? "unknown";
  const arch     = TYPE_ARCHETYPE[charType] ?? "all";
  const rarity   = CHAR_RARITY[charId] ?? "common";
  const base     = RARITY_BASE[rarity] ?? RARITY_BASE.common;
  const mult     = ARCHETYPE_MULT[arch] ?? ARCHETYPE_MULT.all;
  const enh      = ENHANCE_PER_LEVEL[arch] ?? ENHANCE_PER_LEVEL.all;
  const enhBonus = (stat: number, pct: number) => Math.round(stat * (1 + enhLevel * pct / 100));
  return {
    hp:            enhBonus(Math.round(base.hp  * mult.hp),  enh.hp),
    atk:           enhBonus(Math.round(base.atk * mult.atk), enh.atk),
    def:           enhBonus(Math.round(base.def * mult.def), enh.def),
    spd:           enhBonus(Math.round(base.spd * mult.spd), enh.spd),
    critRate:      Math.min(1.0, base.critRate + mult.critRate),
    critDmg:       base.critDmg + mult.critDmg,
    effectiveness: base.effectiveness + mult.effectiveness,
    effectResist:  base.effectResist + mult.effectResist,
    rarity, archetype: arch, charType,
    element: ARCH_ELEMENT[arch] ?? "light",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 버프 / 디버프 타입
// ═══════════════════════════════════════════════════════════════════════════════
type BuffType =
  | "attack_up"    // ATK × 1.5
  | "defense_up"   // DEF × 1.5
  | "speed_up"     // SPD × 1.3
  | "barrier"      // 피해 흡수 (value = 남은 HP)
  | "immune"       // 디버프 면역
  | "counter"      // 피격 시 반격
  | "revive"       // 1회 부활 (30% HP)
  | "recovery"     // 매 턴 HP 5% 회복
  | "cr_boost";    // 다음 턴 CR +30

type DebuffType =
  | "defense_break" // DEF × 0.5
  | "attack_down"   // ATK × 0.7
  | "speed_down"    // SPD × 0.7
  | "stun"          // 행동 불가
  | "silence"       // S2/S3 사용 불가
  | "sleep"         // 행동 불가, 피격 시 해제
  | "provoke"       // 도발한 유닛만 공격 가능
  | "restrict"      // S3 사용 불가
  | "blind"         // 명중률 -50%
  | "burn"          // 매 턴 (value) 피해
  | "poison"        // 매 턴 maxHp × 5% 피해
  | "bleed"         // 매 턴 currentHp × 8% 피해
  | "bomb"          // N턴 후 maxHp × 60% 폭발 (value = 남은 턴)
  | "unhealable";   // 회복 불가

interface StatusEffect {
  type: BuffType | DebuffType;
  duration: number;    // 남은 턴
  value?: number;      // barrier: 남은 흡수량, burn: 턴당 피해, bomb: 남은 폭발 카운터
  fromSlot?: number;   // 도발 발동 유닛 슬롯 (provoke용)
  fromTeam?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 스킬 정의
// ═══════════════════════════════════════════════════════════════════════════════
type SkillTarget = "single" | "all" | "random_multi" | "lowest_hp" | "highest_hp" | "self" | "ally_lowest" | "all_ally";

interface BuffApply  { type: BuffType;  duration: number; value?: number }
interface DebuffApply{ type: DebuffType; duration: number; value?: number }

interface SkillDef {
  name:       string;
  type:       "s1" | "s2" | "s3";
  cooldown:   number;   // 0 = 쿨타임 없음
  mult:       number;   // 피해 배율 (회복 전용은 0)
  hits:       number;   // 멀티히트
  target:     SkillTarget;
  ignoresDef: boolean;  // 방어 무시
  healPct?:   number;   // target maxHp의 %를 회복
  selfHealPct?: number; // 시전자 회복
  buffs?:     BuffApply[];    // 시전자 또는 아군에게 버프
  debuffs?:   DebuffApply[];  // 적에게 디버프
  buffTarget?: "self" | "all_ally" | "ally_lowest";
  crSelfBonus?: number;   // 시전자 CR +N
  crEnemyPenalty?: number;// 적 CR -N (all enemies)
}

interface PassiveDef {
  name:    string;
  // 패시브는 유닛 생성 시 스탯으로 반영 (percent bonuses)
  atkBonusPct?: number;
  defBonusPct?: number;
  spdBonusPct?: number;
  critRateBonus?: number;
  hpBelowPctTrigger?: number;  // HP가 N% 이하일 때 추가 ATK
  hpBelowAtkBonus?: number;    // 위 조건 충족 시 ATK 보너스
  counterChance?: number;       // 피격 시 반격 확률
  dotDurationBonus?: number;    // 본인이 건 DoT 지속 +1
}

interface HeroDef {
  s1: SkillDef;
  s2: SkillDef;
  s3: SkillDef;
  passive: PassiveDef;
}

const HERO_SKILLS: Record<string, HeroDef> = {
  warrior: {
    s1: {
      name:"강타", type:"s1", cooldown:0, mult:1.05, hits:1, target:"single", ignoresDef:false,
    },
    s2: {
      name:"연격", type:"s2", cooldown:3, mult:0.80, hits:2, target:"single", ignoresDef:false,
      crSelfBonus:15,
    },
    s3: {
      name:"폭풍검", type:"s3", cooldown:5, mult:0.85, hits:1, target:"all", ignoresDef:false,
      buffs:[{ type:"attack_up", duration:2 }], buffTarget:"self",
      crSelfBonus:20,
    },
    passive: { name:"전투 의지", hpBelowPctTrigger:0.50, hpBelowAtkBonus:0.20 },
  },
  tank: {
    s1: {
      name:"방패 치기", type:"s1", cooldown:0, mult:0.70, hits:1, target:"single", ignoresDef:false,
      debuffs:[{ type:"provoke", duration:1 }],
    },
    s2: {
      name:"방어 태세", type:"s2", cooldown:3, mult:0, hits:0, target:"self", ignoresDef:false,
      buffs:[{ type:"defense_up", duration:2 }, { type:"barrier", duration:2, value:0 }],
      buffTarget:"self", selfHealPct:0.15,
    },
    s3: {
      name:"철벽 방어", type:"s3", cooldown:5, mult:0, hits:0, target:"all_ally", ignoresDef:false,
      buffs:[{ type:"defense_up", duration:2 }, { type:"barrier", duration:2, value:0 }],
      buffTarget:"all_ally",
    },
    passive: { name:"요새", defBonusPct:0.20, effectResistBonus:0.15 } as PassiveDef & { effectResistBonus?: number },
  },
  mage: {
    s1: {
      name:"마법탄", type:"s1", cooldown:0, mult:1.10, hits:1, target:"single", ignoresDef:true,
    },
    s2: {
      name:"파이어볼", type:"s2", cooldown:3, mult:0.75, hits:1, target:"all", ignoresDef:false,
      debuffs:[{ type:"burn", duration:2, value:0 }],
    },
    s3: {
      name:"메테오", type:"s3", cooldown:5, mult:1.25, hits:1, target:"all", ignoresDef:false,
      debuffs:[{ type:"defense_break", duration:2 }],
    },
    passive: { name:"마력 집중", atkBonusPct:0.15 },
  },
  rogue: {
    s1: {
      name:"단검 찌르기", type:"s1", cooldown:0, mult:1.00, hits:1, target:"single", ignoresDef:false,
    },
    s2: {
      name:"연속 베기", type:"s2", cooldown:3, mult:0.65, hits:3, target:"random_multi", ignoresDef:false,
    },
    s3: {
      name:"암살", type:"s3", cooldown:5, mult:2.60, hits:1, target:"lowest_hp", ignoresDef:true,
    },
    passive: { name:"그림자 걸음", spdBonusPct:0.15, critRateBonus:0.10 },
  },
  nature: {
    s1: {
      name:"넝쿨 채찍", type:"s1", cooldown:0, mult:0.85, hits:1, target:"single", ignoresDef:false,
      debuffs:[{ type:"bleed", duration:2 }],
    },
    s2: {
      name:"치유의 손길", type:"s2", cooldown:3, mult:0, hits:0, target:"ally_lowest", ignoresDef:false,
      healPct:0.30, buffs:[{ type:"recovery", duration:2 }], buffTarget:"ally_lowest",
    },
    s3: {
      name:"대자연의 힘", type:"s3", cooldown:5, mult:0, hits:0, target:"all_ally", ignoresDef:false,
      healPct:0.20, buffs:[{ type:"speed_up", duration:2 }, { type:"recovery", duration:2 }],
      buffTarget:"all_ally",
    },
    passive: { name:"생명의 기운", hpBelowPctTrigger:1.0, hpBelowAtkBonus:0 },  // handled separately
  },
  meka: {
    s1: {
      name:"레이저", type:"s1", cooldown:0, mult:1.00, hits:1, target:"single", ignoresDef:false,
      debuffs:[{ type:"defense_break", duration:1 }],
    },
    s2: {
      name:"미사일", type:"s2", cooldown:3, mult:0.60, hits:3, target:"random_multi", ignoresDef:false,
      debuffs:[{ type:"blind", duration:2 }],
    },
    s3: {
      name:"에너지 캐논", type:"s3", cooldown:5, mult:2.20, hits:1, target:"highest_hp", ignoresDef:false,
      debuffs:[{ type:"stun", duration:1 }],
      crEnemyPenalty:20,
    },
    passive: { name:"과부하", hpBelowPctTrigger:0.30, hpBelowAtkBonus:0.30 },
  },
  cursed: {
    s1: {
      name:"저주 공격", type:"s1", cooldown:0, mult:1.00, hits:1, target:"single", ignoresDef:false,
      debuffs:[{ type:"poison", duration:3 }],
    },
    s2: {
      name:"저주의 낙인", type:"s2", cooldown:3, mult:0.90, hits:1, target:"single", ignoresDef:false,
      debuffs:[{ type:"attack_down", duration:2 }, { type:"speed_down", duration:2 }],
    },
    s3: {
      name:"재앙 선포", type:"s3", cooldown:5, mult:0.70, hits:1, target:"all", ignoresDef:false,
      debuffs:[{ type:"poison", duration:3 }, { type:"defense_break", duration:2 }],
    },
    passive: { name:"저주의 연쇄", dotDurationBonus:1 },
  },
  all: {
    s1: {
      name:"공격", type:"s1", cooldown:0, mult:1.00, hits:1, target:"single", ignoresDef:false,
    },
    s2: {
      name:"강화 공격", type:"s2", cooldown:3, mult:1.55, hits:1, target:"single", ignoresDef:false,
      buffs:[{ type:"attack_up", duration:1 }], buffTarget:"self",
    },
    s3: {
      name:"전력 공격", type:"s3", cooldown:5, mult:0.80, hits:1, target:"all", ignoresDef:false,
    },
    passive: { name:"적응", counterChance:0.20 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 인터페이스
// ═══════════════════════════════════════════════════════════════════════════════
interface CombatUnit {
  slot:          number;
  team:          "attacker" | "defender";
  charId:        number;
  // base stats (before buffs)
  baseAtk:       number;
  baseDef:       number;
  baseSpd:       number;
  baseCritRate:  number;
  baseCritDmg:   number;
  effectiveness: number;
  effectResist:  number;
  // current HP
  hp:            number;
  maxHp:         number;
  cr:            number;
  alive:         boolean;
  rarity:        string;
  archetype:     string;
  charType:      string;
  element:       string;
  // cooldowns
  s1Cd:          number;
  s2Cd:          number;
  s3Cd:          number;
  // status
  buffs:         StatusEffect[];
  debuffs:       StatusEffect[];
  // passive data
  passive:       PassiveDef;
  reviveUsed:    boolean;
  counterApplied:boolean;
}

export interface HitDetail {
  targetTeam:    "attacker" | "defender";
  targetSlot:    number;
  damage:        number;
  healed:        number;
  hpAfter:       number;
  alive:         boolean;
  isCrit?:       boolean;
  barrierDmg?:   number;
  affinity?:     "advantage" | "neutral";
}

interface CrSnapshot {
  team:    "attacker" | "defender";
  slot:    number;
  cr:      number;
  alive:   boolean;
  buffs:   Array<{ type: string; duration: number }>;
  debuffs: Array<{ type: string; duration: number }>;
}

interface StatusChangeEntry {
  team:     "attacker" | "defender";
  slot:     number;
  type:     string;
  duration: number;
  value?:   number;
  action:   "apply" | "expire";
}

export interface BattleEvent {
  actorTeam:      "attacker" | "defender";
  actorSlot:      number;
  targetTeam:     "attacker" | "defender";
  targetSlot:     number;
  damage:         number;
  healed:         number;
  targetHpAfter:  number;
  targetMaxHp:    number;
  targetAlive:    boolean;
  skillType:      "s1" | "s2" | "s3" | "passive" | "dot";
  skillName:      string;
  hits:           HitDetail[];
  crs:            CrSnapshot[];
  statusChanges?: StatusChangeEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 버프 효과 계산
// ═══════════════════════════════════════════════════════════════════════════════
function getEffAtk(u: CombatUnit): number {
  let atk = u.baseAtk;
  if (u.buffs.some(b  => b.type === "attack_up"))  atk = Math.round(atk * 1.50);
  if (u.debuffs.some(d => d.type === "attack_down"))atk = Math.round(atk * 0.70);
  // 패시브: HP 조건부 ATK 증가
  if (u.passive.hpBelowPctTrigger && u.passive.hpBelowAtkBonus) {
    if (u.hp / u.maxHp <= u.passive.hpBelowPctTrigger) {
      atk = Math.round(atk * (1 + u.passive.hpBelowAtkBonus));
    }
  }
  return atk;
}

function getEffDef(u: CombatUnit): number {
  let def = u.baseDef;
  if (u.buffs.some(b  => b.type === "defense_up"))   def = Math.round(def * 1.50);
  if (u.debuffs.some(d => d.type === "defense_break"))def = Math.round(def * 0.50);
  return def;
}

function getEffSpd(u: CombatUnit): number {
  let spd = u.baseSpd;
  if (u.buffs.some(b  => b.type === "speed_up"))  spd = Math.round(spd * 1.30);
  if (u.debuffs.some(d => d.type === "speed_down"))spd = Math.round(spd * 0.70);
  return spd;
}

function canBeDebuffed(target: CombatUnit, eff: number, resist: number): boolean {
  if (target.buffs.some(b => b.type === "immune")) return false;
  const chance = Math.max(0, Math.min(1, 0.85 + eff - resist));
  return Math.random() < chance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 피해 계산
// ═══════════════════════════════════════════════════════════════════════════════
function calcDamage(
  actor: CombatUnit,
  target: CombatUnit,
  mult: number,
  ignoresDef: boolean,
): { dmg: number; isCrit: boolean; affinity: "advantage" | "neutral"; barrierDmg: number } {
  // 눈멀기 — 빗나감 판정
  if (target.debuffs.some(d => d.type === "blind") && Math.random() < 0.50) {
    return { dmg: 0, isCrit: false, affinity: "neutral", barrierDmg: 0 };
  }

  const atk  = getEffAtk(actor);
  const def  = ignoresDef ? 0 : getEffDef(target);
  const defMult = 1000 / (1000 + def);

  // 치명타
  const critRate = Math.min(1.0, actor.baseCritRate);
  const isCrit   = Math.random() < critRate;
  const critMult = isCrit ? actor.baseCritDmg : 1.0;

  // 속성 상성
  const affinity: "advantage" | "neutral" =
    ELEMENT_ADVANTAGE[actor.element] === target.element ? "advantage" : "neutral";
  const elemMult = affinity === "advantage" ? ELEMENT_BONUS : 1.0;

  // 랜덤 오차 ±5%
  const random = 0.95 + Math.random() * 0.10;

  let dmg = Math.round(atk * mult * defMult * critMult * elemMult * random);

  // 배리어 흡수
  let barrierDmg = 0;
  const barrier = target.buffs.find(b => b.type === "barrier" && (b.value ?? 0) > 0);
  if (barrier && barrier.value) {
    barrierDmg = Math.min(barrier.value, dmg);
    barrier.value -= barrierDmg;
    dmg -= barrierDmg;
    if (barrier.value <= 0) barrier.duration = 0; // 배리어 제거 처리
  }

  target.hp = Math.max(0, target.hp - dmg);

  // 부활 체크
  if (target.hp === 0 && !target.reviveUsed && target.buffs.some(b => b.type === "revive")) {
    target.hp = Math.round(target.maxHp * 0.30);
    target.reviveUsed = true;
    target.buffs = target.buffs.filter(b => b.type !== "revive");
  }

  if (target.hp === 0) target.alive = false;

  return { dmg, isCrit, affinity, barrierDmg };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 스킬 효과 적용
// ═══════════════════════════════════════════════════════════════════════════════
function applySkill(
  actor:   CombatUnit,
  skill:   SkillDef,
  all:     CombatUnit[],
  statusChanges: StatusChangeEntry[],
): HitDetail[] {
  const enemies = () => all.filter(u => u.team !== actor.team && u.alive);
  const allies  = () => all.filter(u => u.team === actor.team  && u.alive);
  const hits: HitDetail[] = [];

  // ── 피해 스킬 처리 ────────────────────────────────────────────────────────
  if (skill.mult > 0) {
    let targets: CombatUnit[] = [];

    switch (skill.target) {
      case "single": {
        // 전열(slot 0-1) 가중치 3 : 후열(slot 2-3) 가중치 1
        const alive = enemies();
        const pool = alive.map(u => ({ unit: u, w: u.slot <= 1 ? 3 : 1 }));
        const total = pool.reduce((s, p) => s + p.w, 0);
        let r = Math.random() * total;
        let picked = pool[0]?.unit;
        for (const p of pool) { r -= p.w; if (r <= 0) { picked = p.unit; break; } }
        if (picked) targets = [picked];
        break;
      }
      case "all":
        targets = enemies();
        break;
      case "lowest_hp":
        targets = [enemies().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0]].filter(Boolean);
        break;
      case "highest_hp":
        targets = [enemies().sort((a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp))[0]].filter(Boolean);
        break;
      case "random_multi": {
        for (let h = 0; h < skill.hits; h++) {
          const alive = enemies();
          if (!alive.length) break;
          targets.push(alive[Math.floor(Math.random() * alive.length)]);
        }
        break;
      }
    }

    for (const t of targets) {
      if (!t.alive) continue;
      const { dmg, isCrit, affinity, barrierDmg } = calcDamage(actor, t, skill.mult, skill.ignoresDef);
      hits.push({ targetTeam: t.team, targetSlot: t.slot, damage: dmg, healed: 0, hpAfter: t.hp, alive: t.alive, isCrit, affinity, barrierDmg });
    }
  }

  // ── 회복 스킬 처리 ────────────────────────────────────────────────────────
  if (skill.healPct) {
    let healTargets: CombatUnit[] = [];
    if (skill.target === "ally_lowest") {
      const t = allies().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (t) healTargets = [t];
    } else if (skill.target === "all_ally" || skill.target === "all") {
      healTargets = allies();
    } else if (skill.target === "self") {
      healTargets = [actor];
    }
    for (const t of healTargets) {
      if (t.debuffs.some(d => d.type === "unhealable")) continue;
      const heal = Math.round(t.maxHp * skill.healPct);
      t.hp = Math.min(t.maxHp, t.hp + heal);
      hits.push({ targetTeam: t.team, targetSlot: t.slot, damage: 0, healed: heal, hpAfter: t.hp, alive: t.alive });
    }
  }

  // ── 자기 회복 ─────────────────────────────────────────────────────────────
  if (skill.selfHealPct && !actor.debuffs.some(d => d.type === "unhealable")) {
    const heal = Math.round(actor.maxHp * skill.selfHealPct);
    actor.hp = Math.min(actor.maxHp, actor.hp + heal);
    const existing = hits.find(h => h.targetTeam === actor.team && h.targetSlot === actor.slot);
    if (existing) { existing.healed += heal; existing.hpAfter = actor.hp; }
    else hits.push({ targetTeam: actor.team, targetSlot: actor.slot, damage: 0, healed: heal, hpAfter: actor.hp, alive: actor.alive });
  }

  // ── 버프 적용 ────────────────────────────────────────────────────────────
  if (skill.buffs?.length) {
    let buffTargets: CombatUnit[] = [];
    switch (skill.buffTarget ?? "self") {
      case "self":        buffTargets = [actor]; break;
      case "all_ally":    buffTargets = allies(); break;
      case "ally_lowest": {
        const t = allies().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
        if (t) buffTargets = [t];
        break;
      }
    }
    for (const t of buffTargets) {
      for (const ba of skill.buffs) {
        // 배리어: value = maxHp × 20%
        const val = ba.type === "barrier" ? Math.round(t.maxHp * 0.20) : ba.value;
        const existing = t.buffs.find(b => b.type === ba.type);
        if (existing) { existing.duration = Math.max(existing.duration, ba.duration); }
        else { t.buffs.push({ type: ba.type, duration: ba.duration, value: val }); }
        statusChanges.push({ team: t.team, slot: t.slot, type: ba.type, duration: ba.duration, value: val, action: "apply" });
      }
    }
  }

  // ── 디버프 적용 ──────────────────────────────────────────────────────────
  if (skill.debuffs?.length) {
    const debuffTargets = skill.target === "all" ? enemies() : hits.filter(h => h.damage > 0 || h.targetTeam !== actor.team).map(h => all.find(u => u.team === h.targetTeam && u.slot === h.targetSlot)).filter((u): u is CombatUnit => !!u && u.alive);
    const uniqueTargets = [...new Map(debuffTargets.map(u => [`${u.team}-${u.slot}`, u])).values()];

    for (const t of uniqueTargets) {
      if (!t.alive) continue;
      for (const da of skill.debuffs) {
        if (!canBeDebuffed(t, actor.effectiveness, t.effectResist)) continue;
        let val = da.value;
        if (da.type === "burn") val = Math.round(getEffAtk(actor) * 0.12);
        // 패시브: 저주 지속 +1
        const dur = da.duration + (actor.passive.dotDurationBonus ?? 0);
        const existing = t.debuffs.find(d => d.type === da.type);
        if (existing) { existing.duration = Math.max(existing.duration, dur); }
        else { t.debuffs.push({ type: da.type, duration: dur, value: val, fromSlot: actor.slot, fromTeam: actor.team }); }
        statusChanges.push({ team: t.team, slot: t.slot, type: da.type, duration: dur, value: val, action: "apply" });
      }
    }
  }

  return hits;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CR 스냅샷
// ═══════════════════════════════════════════════════════════════════════════════
function crSnapshot(all: CombatUnit[]): CrSnapshot[] {
  return all.map(u => ({
    team: u.team, slot: u.slot, cr: Math.round(u.cr), alive: u.alive,
    buffs:   u.buffs.map(b  => ({ type: b.type,  duration: b.duration })),
    debuffs: u.debuffs.map(d => ({ type: d.type, duration: d.duration })),
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI 로직
// ═══════════════════════════════════════════════════════════════════════════════
function aiChooseSkill(actor: CombatUnit): SkillDef {
  const hero = HERO_SKILLS[actor.archetype] ?? HERO_SKILLS.all;

  // 침묵: S2/S3 사용 불가
  const silenced  = actor.debuffs.some(d => d.type === "silence");
  const restricted = actor.debuffs.some(d => d.type === "restrict");

  if (!silenced && !restricted && actor.s3Cd === 0) return hero.s3;
  if (!silenced && actor.s2Cd === 0) return hero.s2;
  return hero.s1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 배틀 시뮬레이션
// ═══════════════════════════════════════════════════════════════════════════════
function simulateBattle(attackerUnits: CombatUnit[], defenderUnits: CombatUnit[]) {
  const all = [...attackerUnits, ...defenderUnits];
  const log: BattleEvent[] = [];
  let safety = 1200;

  while (safety-- > 0) {
    const living = all.filter(u => u.alive);
    if (!living.some(u => u.team === "attacker")) break;
    if (!living.some(u => u.team === "defender")) break;

    const minTick = Math.min(...living.map(u => (100 - u.cr) / Math.max(1, getEffSpd(u))));
    for (const u of living) u.cr = Math.min(100, u.cr + minTick * getEffSpd(u));

    const ready = living.filter(u => u.cr >= 100)
      .sort((a, b) => b.cr - a.cr || getEffSpd(b) - getEffSpd(a));

    for (const actor of ready) {
      if (!actor.alive) continue;

      const statusChanges: StatusChangeEntry[] = [];

      // ── 잠듦 → 행동 불가 ─────────────────────────────────────────────────
      const sleeping = actor.debuffs.some(d => d.type === "sleep");
      const stunned  = actor.debuffs.some(d => d.type === "stun");

      // ── 스탯 / 상태 틱 처리 ──────────────────────────────────────────────
      // DoT 처리 (턴 시작 전)
      for (const dot of [...actor.debuffs]) {
        if (!actor.alive) break;
        let dotDmg = 0;
        if (dot.type === "poison") {
          dotDmg = Math.round(actor.maxHp * 0.05);
        } else if (dot.type === "burn") {
          dotDmg = dot.value ?? 0;
        } else if (dot.type === "bleed") {
          dotDmg = Math.round(actor.hp * 0.08);
        }
        if (dotDmg > 0) {
          actor.hp = Math.max(0, actor.hp - dotDmg);
          if (actor.hp === 0 && !actor.reviveUsed && actor.buffs.some(b => b.type === "revive")) {
            actor.hp = Math.round(actor.maxHp * 0.30);
            actor.reviveUsed = true;
            actor.buffs = actor.buffs.filter(b => b.type !== "revive");
          }
          if (actor.hp === 0) actor.alive = false;
          log.push({
            actorTeam: actor.team, actorSlot: -1,
            targetTeam: actor.team, targetSlot: actor.slot,
            damage: dotDmg, healed: 0,
            targetHpAfter: actor.hp, targetMaxHp: actor.maxHp, targetAlive: actor.alive,
            skillType: "dot", skillName: dot.type === "poison" ? "독" : dot.type === "burn" ? "화상" : "출혈",
            hits: [{ targetTeam: actor.team, targetSlot: actor.slot, damage: dotDmg, healed: 0, hpAfter: actor.hp, alive: actor.alive }],
            crs: crSnapshot(all),
          });
        }
      }

      // 회복 버프
      if (actor.alive && actor.buffs.some(b => b.type === "recovery")) {
        const heal = Math.round(actor.maxHp * 0.05);
        if (!actor.debuffs.some(d => d.type === "unhealable")) {
          actor.hp = Math.min(actor.maxHp, actor.hp + heal);
          log.push({
            actorTeam: actor.team, actorSlot: actor.slot,
            targetTeam: actor.team, targetSlot: actor.slot,
            damage: 0, healed: heal,
            targetHpAfter: actor.hp, targetMaxHp: actor.maxHp, targetAlive: actor.alive,
            skillType: "passive", skillName: "지속 회복",
            hits: [{ targetTeam: actor.team, targetSlot: actor.slot, damage: 0, healed: heal, hpAfter: actor.hp, alive: actor.alive }],
            crs: crSnapshot(all),
          });
        }
      }

      // nature 패시브: 매 턴 HP 5% 회복 (생명의 기운)
      if (actor.alive && actor.archetype === "nature" && !actor.debuffs.some(d => d.type === "unhealable")) {
        const heal = Math.round(actor.maxHp * 0.04);
        actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      }

      if (!actor.alive) { actor.cr = 0; continue; }

      // ── 행동 불가 ────────────────────────────────────────────────────────
      if (sleeping || stunned) {
        actor.cr = 0;
        // 수면: 1턴 후 자동 해제
        actor.debuffs = actor.debuffs
          .map(d => ({ ...d, duration: d.duration - 1 }))
          .filter(d => d.duration > 0);
        actor.buffs = actor.buffs
          .map(b => ({ ...b, duration: b.type === "barrier" ? b.duration : b.duration - 1 }))
          .filter(b => b.duration > 0);
        continue;
      }

      // ── 쿨타임 감소 ─────────────────────────────────────────────────────
      if (actor.s2Cd > 0) actor.s2Cd--;
      if (actor.s3Cd > 0) actor.s3Cd--;

      // ── 스킬 선택 ────────────────────────────────────────────────────────
      const chosen = aiChooseSkill(actor);
      if (chosen.type === "s2") actor.s2Cd = chosen.cooldown;
      if (chosen.type === "s3") actor.s3Cd = chosen.cooldown;

      // ── 효과 적용 ────────────────────────────────────────────────────────
      const hits = applySkill(actor, chosen, all, statusChanges);
      actor.cr = 0;

      // CR 보너스/패널티
      if (chosen.crSelfBonus) actor.cr = Math.min(100, actor.cr + chosen.crSelfBonus);
      if (chosen.crEnemyPenalty) {
        for (const u of all.filter(u => u.team !== actor.team && u.alive)) {
          u.cr = Math.max(0, u.cr - chosen.crEnemyPenalty);
        }
      }

      // ── 상태 지속시간 감소 (행동 이후) ───────────────────────────────────
      actor.debuffs = actor.debuffs.map(d => {
        if (["burn","poison","bleed"].includes(d.type)) {
          const newDur = d.duration - 1;
          if (newDur <= 0) statusChanges.push({ team: actor.team, slot: actor.slot, type: d.type, duration: 0, action: "expire" });
          return { ...d, duration: newDur };
        }
        return { ...d, duration: d.duration - 1 };
      }).filter(d => d.duration > 0);

      actor.buffs = actor.buffs.map(b => {
        if (b.type === "barrier" && (b.value ?? 0) <= 0) return { ...b, duration: 0 };
        const newDur = b.duration - 1;
        if (newDur <= 0) statusChanges.push({ team: actor.team, slot: actor.slot, type: b.type, duration: 0, action: "expire" });
        return { ...b, duration: newDur };
      }).filter(b => b.duration > 0);

      if (!hits.length) continue;

      const primary     = hits[0];
      const primaryUnit = all.find(u => u.team === primary.targetTeam && u.slot === primary.targetSlot);
      const totalDmg    = hits.reduce((s, h) => s + h.damage, 0);
      const totalHeal   = hits.reduce((s, h) => s + h.healed, 0);

      log.push({
        actorTeam:     actor.team,
        actorSlot:     actor.slot,
        targetTeam:    primary.targetTeam,
        targetSlot:    primary.targetSlot,
        damage:        totalDmg,
        healed:        totalHeal,
        targetHpAfter: primary.hpAfter,
        targetMaxHp:   primaryUnit?.maxHp ?? primary.hpAfter,
        targetAlive:   primary.alive,
        skillType:     chosen.type,
        skillName:     chosen.name,
        hits,
        crs: crSnapshot(all),
        statusChanges: statusChanges.length ? statusChanges : undefined,
      });

      // ── 반격: counter 버프 피격 시 발동 (상대방 카운터) ─────────────────
      for (const h of hits.filter(hh => hh.damage > 0)) {
        const hitUnit = all.find(u => u.team === h.targetTeam && u.slot === h.targetSlot);
        if (!hitUnit || !hitUnit.alive) continue;

        // 수면 해제
        if (hitUnit.debuffs.some(d => d.type === "sleep")) {
          hitUnit.debuffs = hitUnit.debuffs.filter(d => d.type !== "sleep");
        }

        // 반격 버프
        if (hitUnit.buffs.some(b => b.type === "counter") || (hitUnit.passive.counterChance && Math.random() < hitUnit.passive.counterChance)) {
          const counterSkill = (HERO_SKILLS[hitUnit.archetype] ?? HERO_SKILLS.all).s1;
          const counterHits  = applySkill(hitUnit, counterSkill, all, []);
          if (counterHits.length) {
            const cp = counterHits[0];
            const cu = all.find(u => u.team === cp.targetTeam && u.slot === cp.targetSlot);
            log.push({
              actorTeam: hitUnit.team, actorSlot: hitUnit.slot,
              targetTeam: cp.targetTeam, targetSlot: cp.targetSlot,
              damage: counterHits.reduce((s, hh) => s + hh.damage, 0),
              healed: 0,
              targetHpAfter: cp.hpAfter, targetMaxHp: cu?.maxHp ?? cp.hpAfter, targetAlive: cp.alive,
              skillType: "s1", skillName: `반격: ${counterSkill.name}`,
              hits: counterHits, crs: crSnapshot(all),
            });
          }
        }
      }
    }
  }

  const won = all.some(u => u.team === "attacker" && u.alive);
  return { won, log };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 유닛 생성
// ═══════════════════════════════════════════════════════════════════════════════
function makeUnit(charId: number, slot: number, team: "attacker" | "defender", enhLevel: number): CombatUnit {
  const s       = getCharStat(charId, enhLevel);
  const hero    = HERO_SKILLS[s.archetype] ?? HERO_SKILLS.all;
  const passive = hero.passive;

  // 패시브 스탯 보너스 적용
  const atkBonus = passive.atkBonusPct ?? 0;
  const defBonus = (passive as { defBonusPct?: number }).defBonusPct ?? 0;
  const spdBonus = passive.spdBonusPct ?? 0;

  // 진형 보너스: 전열(slot 0-1) HP+20%·DEF+10% / 후열(slot 2-3) ATK+15%·CritRate+8%
  const isFront = slot <= 1;
  const rowHpMult   = isFront ? 1.20 : 1.00;
  const rowDefMult  = isFront ? 1.10 : 1.00;
  const rowAtkMult  = isFront ? 1.00 : 1.15;
  const rowCritBonus = isFront ? 0.00 : 0.08;

  return {
    slot, team, charId,
    baseAtk:       Math.round(s.atk * (1 + atkBonus) * rowAtkMult),
    baseDef:       Math.round(s.def * (1 + defBonus) * rowDefMult),
    baseSpd:       Math.round(s.spd * (1 + spdBonus)),
    baseCritRate:  s.critRate + (passive.critRateBonus ?? 0) + rowCritBonus,
    baseCritDmg:   s.critDmg,
    effectiveness: s.effectiveness,
    effectResist:  s.effectResist + ((passive as { effectResistBonus?: number }).effectResistBonus ?? 0),
    hp: Math.round(s.hp * rowHpMult), maxHp: Math.round(s.hp * rowHpMult),
    cr: 0, alive: true,
    rarity: s.rarity, archetype: s.archetype, charType: s.charType, element: s.element,
    s1Cd: 0, s2Cd: 0, s3Cd: 0,
    buffs: [], debuffs: [],
    passive,
    reviveUsed: false, counterApplied: false,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 서비스
// ═══════════════════════════════════════════════════════════════════════════════
@Injectable()
export class ArenaService {
  constructor(private readonly prisma: PrismaService) {}

  private async getEnhLevel(userId: string, charId: number): Promise<number> {
    try {
      const rec = await this.prisma.userCharacter.findUnique({
        where: { userId_characterId: { userId, characterId: charId } },
        select: { enhancementLevel: true },
      });
      return rec?.enhancementLevel ?? 0;
    } catch { return 0; }
  }

  async getMyData(userId: string) {
    const [atkRow, defRow, stats, reward] = await Promise.all([
      this.prisma.arenaDeck.findUnique({ where: { userId_deckType: { userId, deckType: "attack" } } }),
      this.prisma.arenaDeck.findUnique({ where: { userId_deckType: { userId, deckType: "defense" } } }),
      this.prisma.battleStats.findUnique({ where: { userId } }),
      this.prisma.userReward.findUnique({ where: { userId }, select: { equippedCharacterId: true } }),
    ]);

    let defSlots: number[] = (defRow?.slots as number[]) ?? [];
    if (defSlots.length === 0 && reward?.equippedCharacterId) {
      defSlots = [reward.equippedCharacterId];
      await this.prisma.arenaDeck.upsert({
        where:  { userId_deckType: { userId, deckType: "defense" } },
        create: { userId, deckType: "defense", slots: defSlots },
        update: { slots: defSlots },
      });
    }

    return {
      attackSlots:  (atkRow?.slots as number[]) ?? [],
      defenseSlots: defSlots,
      tierPoints:   stats?.tierPoints  ?? 0,
      wins:         stats?.wins        ?? 0,
      losses:       stats?.losses      ?? 0,
      winStreak:    stats?.winStreak   ?? 0,
      bestStreak:   stats?.bestStreak  ?? 0,
    };
  }

  async saveDeck(userId: string, deckType: "attack" | "defense", slots: number[]) {
    await this.prisma.arenaDeck.upsert({
      where:  { userId_deckType: { userId, deckType } },
      create: { userId, deckType, slots: slots.slice(0, 4) },
      update: { slots: slots.slice(0, 4) },
    });
    return { ok: true };
  }

  async getDefenseDeck(userId: string) {
    const row = await this.prisma.arenaDeck.findUnique({
      where: { userId_deckType: { userId, deckType: "defense" } },
    });
    let slots: number[] = (row?.slots as number[]) ?? [];
    if (slots.length === 0) {
      const reward = await this.prisma.userReward.findUnique({
        where: { userId }, select: { equippedCharacterId: true },
      });
      if (reward?.equippedCharacterId) slots = [reward.equippedCharacterId];
    }
    const defenderName = (await this.prisma.user.findUnique({
      where: { id: userId }, select: { name: true },
    }))?.name ?? "플레이어";
    return { slots, defenderName };
  }

  private charInfoFromUnit(u: CombatUnit) {
    return {
      slot: u.slot, charId: u.charId, maxHp: u.maxHp,
      atk: u.baseAtk, def: u.baseDef, spd: u.baseSpd,
      critRate: u.baseCritRate, critDmg: u.baseCritDmg,
      element: u.element, rarity: u.rarity,
      archetype: u.archetype, charType: u.charType,
    };
  }

  async attack(attackerId: string, defenderId: string) {
    if (attackerId === defenderId) throw new Error("자기 자신을 공격할 수 없습니다");

    const [atkRow, defRow, defReward] = await Promise.all([
      this.prisma.arenaDeck.findUnique({ where: { userId_deckType: { userId: attackerId, deckType: "attack" } } }),
      this.prisma.arenaDeck.findUnique({ where: { userId_deckType: { userId: defenderId, deckType: "defense" } } }),
      this.prisma.userReward.findUnique({ where: { userId: defenderId }, select: { equippedCharacterId: true } }),
    ]);

    let atkSlots = (atkRow?.slots as number[]) ?? [];
    let defSlots = (defRow?.slots as number[]) ?? [];
    if (atkSlots.length === 0) {
      const first = await this.prisma.userCharacter.findFirst({ where: { userId: attackerId }, select: { characterId: true }, orderBy: { obtainedAt: "asc" } });
      if (first) atkSlots = [first.characterId];
    }
    if (defSlots.length === 0 && defReward?.equippedCharacterId) defSlots = [defReward.equippedCharacterId];
    if (atkSlots.length === 0) throw new Error("공격 덱이 비어있습니다");
    if (defSlots.length === 0) throw new Error("상대방의 방어 덱이 비어있습니다");

    const [atkEnhLvs, defEnhLvs] = await Promise.all([
      Promise.all(atkSlots.map(id => this.getEnhLevel(attackerId, id))),
      Promise.all(defSlots.map(id => this.getEnhLevel(defenderId, id))),
    ]);

    const attackerUnits = atkSlots.map((id, i) => makeUnit(id, i, "attacker", atkEnhLvs[i]));
    const defenderUnits = defSlots.map((id, i) => makeUnit(id, i, "defender", defEnhLvs[i]));
    const { won, log }  = simulateBattle(attackerUnits, defenderUnits);

    const [atkResult] = await Promise.all([
      this.updateArenaStats(attackerId, won, false),
      this.updateArenaStats(defenderId, !won, true),
    ]);

    // 공격 로그 기록 (복수 시스템용)
    try {
      await (this.prisma as any).arenaAttackLog?.create({
        data: { attackerId, defenderId, attackerWon: won, pointsDelta: atkResult.pointsDelta },
      });
    } catch { /* 테이블 미존재 시 무시 */ }

    return {
      won,
      pointsDelta:   atkResult.pointsDelta,
      tierPoints:    atkResult.tierPoints,
      wins:          atkResult.wins,
      losses:        atkResult.losses,
      winStreak:     atkResult.winStreak,
      log,
      attackerChars: attackerUnits.map(u => this.charInfoFromUnit(u)),
      defenderChars: defenderUnits.map(u => this.charInfoFromUnit(u)),
    };
  }

  async attackNpc(attackerId: string, npcSlots: number[], npcEnhLvs: number[], pointsOnWin: number, pointsOnLoss: number) {
    const atkRow = await this.prisma.arenaDeck.findUnique({ where: { userId_deckType: { userId: attackerId, deckType: "attack" } } });
    let atkSlots = (atkRow?.slots as number[]) ?? [];
    if (atkSlots.length === 0) {
      const first = await this.prisma.userCharacter.findFirst({ where: { userId: attackerId }, select: { characterId: true }, orderBy: { obtainedAt: "asc" } });
      if (first) atkSlots = [first.characterId];
    }
    if (atkSlots.length === 0) throw new Error("공격 덱이 비어있습니다");

    const atkEnhLvs = await Promise.all(atkSlots.map(id => this.getEnhLevel(attackerId, id)));
    const attackerUnits = atkSlots.map((id, i) => makeUnit(id, i, "attacker", atkEnhLvs[i]));
    const defenderUnits = npcSlots.map((id, i) => makeUnit(id, i, "defender", npcEnhLvs[i] ?? 0));
    const { won, log }  = simulateBattle(attackerUnits, defenderUnits);

    const pointsDelta = won ? pointsOnWin : pointsOnLoss;
    const ex   = await this.prisma.battleStats.findUnique({ where: { userId: attackerId } });
    const prev = ex ?? { tierPoints: 0, wins: 0, losses: 0, winStreak: 0, bestStreak: 0 };
    const newWinStreak = won ? prev.winStreak + 1 : 0;
    const newPoints    = Math.max(0, prev.tierPoints + pointsDelta);
    const data = {
      tierPoints: newPoints,
      wins:       won ? prev.wins + 1 : prev.wins,
      losses:     won ? prev.losses   : prev.losses + 1,
      winStreak:  newWinStreak,
      bestStreak: Math.max(prev.bestStreak, newWinStreak),
    };
    await this.prisma.battleStats.upsert({ where: { userId: attackerId }, create: { userId: attackerId, ...data }, update: data });

    return {
      won, pointsDelta, tierPoints: newPoints,
      wins: data.wins, losses: data.losses, winStreak: data.winStreak,
      log,
      attackerChars: attackerUnits.map(u => this.charInfoFromUnit(u)),
      defenderChars: defenderUnits.map(u => this.charInfoFromUnit(u)),
    };
  }

  async getRevengeTargets(userId: string) {
    try {
      const logs = await (this.prisma as any).arenaAttackLog?.findMany({
        where: { defenderId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { attackerId: true, attackerWon: true, createdAt: true },
      }) ?? [];
      const unique = new Map<string, { userId: string; attackerWon: boolean; at: Date }>();
      for (const l of logs) {
        if (!unique.has(l.attackerId)) unique.set(l.attackerId, { userId: l.attackerId, attackerWon: l.attackerWon, at: l.createdAt });
      }
      const targets = await Promise.all([...unique.values()].slice(0, 10).map(async entry => {
        const u = await this.prisma.user.findUnique({ where: { id: entry.userId }, select: { id: true, name: true } });
        const stats = await this.prisma.battleStats.findUnique({ where: { userId: entry.userId } });
        const deck  = await this.prisma.arenaDeck.findUnique({ where: { userId_deckType: { userId: entry.userId, deckType: "defense" } } });
        return {
          userId: entry.userId, name: u?.name ?? "알 수 없음",
          tierPoints: stats?.tierPoints ?? 0,
          defenseSlots: (deck?.slots as number[]) ?? [],
          theyWon: entry.attackerWon, at: entry.at,
        };
      }));
      return targets;
    } catch { return []; }
  }

  private async updateArenaStats(userId: string, won: boolean, isDefender: boolean) {
    const ex   = await this.prisma.battleStats.findUnique({ where: { userId } });
    const prev = ex ?? { tierPoints: 0, wins: 0, losses: 0, winStreak: 0, bestStreak: 0 };
    let pointsDelta: number;
    if (won) {
      pointsDelta = isDefender ? 20 : 600 + (prev.winStreak >= 1 ? 20 : 0);
    } else {
      pointsDelta = isDefender ? -20 : -50;
    }
    const newWinStreak = won && !isDefender ? prev.winStreak + 1 : won ? prev.winStreak : 0;
    const newPoints    = Math.max(0, prev.tierPoints + pointsDelta);
    const data = {
      tierPoints: newPoints,
      wins:       won ? prev.wins + 1 : prev.wins,
      losses:     won ? prev.losses   : prev.losses + 1,
      winStreak:  newWinStreak,
      bestStreak: Math.max(prev.bestStreak, newWinStreak),
    };
    await this.prisma.battleStats.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return { ...data, pointsDelta };
  }
}
