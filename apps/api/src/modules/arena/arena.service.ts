import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// ─── characterId → CharacterType ─────────────────────────────────────────────
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

// ─── CharacterType → arena archetype ─────────────────────────────────────────
const TYPE_ARCHETYPE: Record<string, string> = {
  wolf:"warrior", tiger:"warrior", lion:"warrior", bear:"warrior",
  cat:"rogue",    rabbit:"rogue",  deer:"rogue",   eagle:"rogue",
  ghost:"mage",   owl:"mage",      dragon:"mage",  angel:"mage",  phoenix:"mage",
  turtle:"tank",  elephant:"tank", whale:"tank",   crocodile:"tank", boar:"tank",
  plant:"nature", fish:"nature",   unicorn:"nature", horse:"nature",
  robot:"meka",   slime:"meka",    beetle:"meka",
  fox:"cursed",   monkey:"cursed", raven:"cursed", snake:"cursed", demon:"cursed",
};

// ─── characterId → rarity ─────────────────────────────────────────────────────
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

// ─── 레어리티 기본 스탯 ────────────────────────────────────────────────────────
const RARITY_BASE: Record<string, { hp: number; atk: number; spd: number }> = {
  common:    { hp: 80,  atk: 10, spd: 80  },
  uncommon:  { hp: 90,  atk: 12, spd: 85  },
  rare:      { hp: 100, atk: 15, spd: 90  },
  epic:      { hp: 115, atk: 19, spd: 95  },
  legendary: { hp: 130, atk: 24, spd: 100 },
  mythic:    { hp: 150, atk: 30, spd: 110 },
};

// ─── 직업별 스탯 배율 ─────────────────────────────────────────────────────────
const ARCHETYPE_MULT: Record<string, { hp: number; atk: number; spd: number }> = {
  warrior: { hp: 0.90, atk: 1.30, spd: 1.00 },
  tank:    { hp: 1.50, atk: 0.60, spd: 0.75 },
  mage:    { hp: 0.80, atk: 1.50, spd: 1.00 },
  rogue:   { hp: 0.85, atk: 1.10, spd: 1.40 },
  nature:  { hp: 1.30, atk: 0.75, spd: 0.85 },
  meka:    { hp: 1.10, atk: 1.00, spd: 1.10 },
  cursed:  { hp: 0.80, atk: 1.40, spd: 1.10 },
  all:     { hp: 1.00, atk: 1.00, spd: 1.00 },
};

// ─── 직업별 강화 레벨당 보너스 (%) ───────────────────────────────────────────
const ENHANCE_PER_LEVEL: Record<string, { hp: number; atk: number; spd: number }> = {
  warrior: { hp: 3, atk: 5, spd: 2 },
  tank:    { hp: 6, atk: 2, spd: 1 },
  mage:    { hp: 2, atk: 6, spd: 1 },
  rogue:   { hp: 2, atk: 3, spd: 5 },
  nature:  { hp: 5, atk: 2, spd: 2 },
  meka:    { hp: 3, atk: 3, spd: 3 },
  cursed:  { hp: 2, atk: 4, spd: 4 },
  all:     { hp: 3, atk: 3, spd: 3 },
};

export function getCharStat(charId: number, enhLevel = 0) {
  const charType = CHAR_TYPE[charId] ?? "unknown";
  const arch     = TYPE_ARCHETYPE[charType] ?? "all";
  const rarity   = CHAR_RARITY[charId] ?? "common";
  const base     = RARITY_BASE[rarity] ?? RARITY_BASE.common;
  const mult     = ARCHETYPE_MULT[arch] ?? ARCHETYPE_MULT.all;
  const enh      = ENHANCE_PER_LEVEL[arch] ?? ENHANCE_PER_LEVEL.all;
  return {
    hp:        Math.round(base.hp  * mult.hp  * (1 + enhLevel * enh.hp  / 100)),
    atk:       Math.round(base.atk * mult.atk * (1 + enhLevel * enh.atk / 100)),
    spd:       Math.round(base.spd * mult.spd * (1 + enhLevel * enh.spd / 100)),
    rarity,
    archetype: arch,
    charType,
  };
}

// ─── 스킬 시스템 ──────────────────────────────────────────────────────────────

type SkillEffect =
  | { kind: "damage_single" }
  | { kind: "damage_all" }
  | { kind: "damage_random_multi"; hits: number }
  | { kind: "damage_lowest_hp" }
  | { kind: "damage_highest_hp" }
  | { kind: "heal_lowest";      pct: number }
  | { kind: "heal_all";         pct: number }
  | { kind: "damage_single_dot"; dotPct: number; dotTurns: number }
  | { kind: "damage_all_dot";   dotPct: number; dotTurns: number }
  | { kind: "damage_all_heal_all"; healPct: number };

interface SkillDef {
  name:     string;
  type:     "basic" | "skill" | "ultimate";
  cooldown: number;
  mult:     number;   // 데미지 배율 (heal 전용 스킬은 0)
  effect:   SkillEffect;
}

const ARCHETYPE_SKILLS: Record<string, { basic: SkillDef; skill: SkillDef; ultimate: SkillDef }> = {
  warrior: {
    basic:    { name:"강타",        type:"basic",    cooldown:0, mult:1.0,  effect:{ kind:"damage_single" } },
    skill:    { name:"연격",        type:"skill",    cooldown:3, mult:1.8,  effect:{ kind:"damage_single" } },
    ultimate: { name:"폭풍검",      type:"ultimate", cooldown:5, mult:0.90, effect:{ kind:"damage_all" } },
  },
  tank: {
    basic:    { name:"방패 치기",   type:"basic",    cooldown:0, mult:0.7,  effect:{ kind:"damage_single" } },
    skill:    { name:"방어 태세",   type:"skill",    cooldown:3, mult:0,    effect:{ kind:"heal_lowest",       pct:0.20 } },
    ultimate: { name:"철벽 방어",   type:"ultimate", cooldown:5, mult:0,    effect:{ kind:"heal_all",          pct:0.15 } },
  },
  mage: {
    basic:    { name:"마법탄",      type:"basic",    cooldown:0, mult:1.0,  effect:{ kind:"damage_single" } },
    skill:    { name:"파이어볼",    type:"skill",    cooldown:3, mult:0.75, effect:{ kind:"damage_all" } },
    ultimate: { name:"메테오",      type:"ultimate", cooldown:5, mult:1.30, effect:{ kind:"damage_all" } },
  },
  rogue: {
    basic:    { name:"단검 찌르기", type:"basic",    cooldown:0, mult:1.0,  effect:{ kind:"damage_single" } },
    skill:    { name:"연속 베기",   type:"skill",    cooldown:3, mult:0.75, effect:{ kind:"damage_random_multi", hits:2 } },
    ultimate: { name:"암살",        type:"ultimate", cooldown:5, mult:2.8,  effect:{ kind:"damage_lowest_hp" } },
  },
  nature: {
    basic:    { name:"넝쿨 채찍",   type:"basic",    cooldown:0, mult:0.85, effect:{ kind:"damage_single" } },
    skill:    { name:"치유의 손길", type:"skill",    cooldown:3, mult:0,    effect:{ kind:"heal_lowest",       pct:0.28 } },
    ultimate: { name:"대자연의 힘", type:"ultimate", cooldown:5, mult:0.65, effect:{ kind:"damage_all_heal_all", healPct:0.15 } },
  },
  meka: {
    basic:    { name:"레이저",      type:"basic",    cooldown:0, mult:1.0,  effect:{ kind:"damage_single" } },
    skill:    { name:"미사일",      type:"skill",    cooldown:3, mult:0.60, effect:{ kind:"damage_random_multi", hits:3 } },
    ultimate: { name:"에너지 캐논", type:"ultimate", cooldown:5, mult:2.4,  effect:{ kind:"damage_highest_hp" } },
  },
  cursed: {
    basic:    { name:"저주 공격",   type:"basic",    cooldown:0, mult:1.0,  effect:{ kind:"damage_single" } },
    skill:    { name:"저주의 낙인", type:"skill",    cooldown:3, mult:0.9,  effect:{ kind:"damage_single_dot", dotPct:0.05, dotTurns:3 } },
    ultimate: { name:"재앙 선포",   type:"ultimate", cooldown:5, mult:0.75, effect:{ kind:"damage_all_dot",    dotPct:0.04, dotTurns:3 } },
  },
  all: {
    basic:    { name:"공격",        type:"basic",    cooldown:0, mult:1.0,  effect:{ kind:"damage_single" } },
    skill:    { name:"강화 공격",   type:"skill",    cooldown:3, mult:1.6,  effect:{ kind:"damage_single" } },
    ultimate: { name:"전력 공격",   type:"ultimate", cooldown:5, mult:0.85, effect:{ kind:"damage_all" } },
  },
};

// ─── 배틀 인터페이스 ──────────────────────────────────────────────────────────

interface Dot {
  dmgPerTurn: number;
  turnsLeft:  number;
}

interface CombatUnit {
  slot:       number;
  team:       "attacker" | "defender";
  charId:     number;
  hp:         number;
  maxHp:      number;
  atk:        number;
  spd:        number;
  cr:         number;
  alive:      boolean;
  rarity:     string;
  archetype:  string;
  charType:   string;
  skillCd:    number;   // 남은 쿨다운 (0 = 사용 가능)
  ultimateCd: number;
  dots:       Dot[];
}

export interface HitDetail {
  targetTeam: "attacker" | "defender";
  targetSlot: number;
  damage:     number;
  healed:     number;
  hpAfter:    number;
  alive:      boolean;
}

export interface BattleEvent {
  actorTeam:     "attacker" | "defender";
  actorSlot:     number;           // -1 이면 DoT 이벤트
  targetTeam:    "attacker" | "defender";
  targetSlot:    number;
  damage:        number;           // 주 타겟 데미지 (또는 DoT 데미지)
  healed:        number;           // 주 타겟 회복량
  targetHpAfter: number;
  targetMaxHp:   number;
  targetAlive:   boolean;
  skillType:     "basic" | "skill" | "ultimate" | "dot";
  skillName:     string;
  hits:          HitDetail[];      // 멀티타겟/멀티히트 세부 정보
  crs:           Array<{ team: "attacker" | "defender"; slot: number; cr: number; alive: boolean }>;
}

// ─── 효과 적용 ────────────────────────────────────────────────────────────────

function applyEffect(actor: CombatUnit, skill: SkillDef, all: CombatUnit[]): HitDetail[] {
  const enemies = () => all.filter(u => u.team !== actor.team && u.alive);
  const allies  = () => all.filter(u => u.team === actor.team && u.alive);
  const hits: HitDetail[] = [];

  const dealDmg = (target: CombatUnit) => {
    const dmg = Math.round(actor.atk * skill.mult * (0.9 + Math.random() * 0.2));
    target.hp = Math.max(0, target.hp - dmg);
    if (target.hp === 0) target.alive = false;
    hits.push({ targetTeam: target.team, targetSlot: target.slot, damage: dmg, healed: 0, hpAfter: target.hp, alive: target.alive });
    return dmg;
  };

  const doHeal = (target: CombatUnit, pct: number) => {
    const heal = Math.round(target.maxHp * pct);
    target.hp = Math.min(target.maxHp, target.hp + heal);
    hits.push({ targetTeam: target.team, targetSlot: target.slot, damage: 0, healed: heal, hpAfter: target.hp, alive: target.alive });
  };

  const addDot = (target: CombatUnit, dotPct: number, dotTurns: number) => {
    target.dots.push({ dmgPerTurn: Math.round(target.maxHp * dotPct), turnsLeft: dotTurns });
  };

  const ef = skill.effect;

  if (ef.kind === "damage_single") {
    const t = enemies().sort((a, b) => a.slot - b.slot)[0];
    if (t) dealDmg(t);
  } else if (ef.kind === "damage_all") {
    for (const t of enemies()) dealDmg(t);
  } else if (ef.kind === "damage_random_multi") {
    for (let h = 0; h < ef.hits; h++) {
      const alive = enemies();
      if (!alive.length) break;
      dealDmg(alive[Math.floor(Math.random() * alive.length)]);
    }
  } else if (ef.kind === "damage_lowest_hp") {
    const t = enemies().sort((a, b) => a.hp - b.hp)[0];
    if (t) dealDmg(t);
  } else if (ef.kind === "damage_highest_hp") {
    const t = enemies().sort((a, b) => b.hp - a.hp)[0];
    if (t) dealDmg(t);
  } else if (ef.kind === "heal_lowest") {
    const t = allies().sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
    if (t) doHeal(t, ef.pct);
  } else if (ef.kind === "heal_all") {
    for (const t of allies()) doHeal(t, ef.pct);
  } else if (ef.kind === "damage_single_dot") {
    const t = enemies().sort((a, b) => a.slot - b.slot)[0];
    if (t) { dealDmg(t); if (t.alive) addDot(t, ef.dotPct, ef.dotTurns); }
  } else if (ef.kind === "damage_all_dot") {
    for (const t of enemies()) { dealDmg(t); if (t.alive) addDot(t, ef.dotPct, ef.dotTurns); }
  } else if (ef.kind === "damage_all_heal_all") {
    for (const t of enemies()) dealDmg(t);
    for (const t of allies())  doHeal(t, ef.healPct);
  }

  return hits;
}

// ─── 배틀 시뮬레이션 ──────────────────────────────────────────────────────────

function simulateBattle(attackerUnits: CombatUnit[], defenderUnits: CombatUnit[]) {
  const all = [...attackerUnits, ...defenderUnits];
  const log: BattleEvent[] = [];
  let safety = 800;

  while (safety-- > 0) {
    const living = all.filter(u => u.alive);
    if (!living.filter(u => u.team === "attacker").length) break;
    if (!living.filter(u => u.team === "defender").length) break;

    // 다음 행동까지 최소 틱 계산
    const minTick = Math.min(...living.map(u => (100 - u.cr) / u.spd));
    for (const u of living) u.cr = Math.min(100, u.cr + minTick * u.spd);

    const ready = living
      .filter(u => u.cr >= 100)
      .sort((a, b) => b.cr - a.cr || b.spd - a.spd);

    for (const actor of ready) {
      if (!actor.alive) continue;

      // ── DoT 처리 (본인 턴 시작 시) ────────────────────────────────────────
      for (const dot of actor.dots.filter(d => d.turnsLeft > 0)) {
        const dmg = dot.dmgPerTurn;
        actor.hp = Math.max(0, actor.hp - dmg);
        if (actor.hp === 0) actor.alive = false;
        dot.turnsLeft--;

        log.push({
          actorTeam:     actor.team,
          actorSlot:     -1,   // DoT = 액터 없음
          targetTeam:    actor.team,
          targetSlot:    actor.slot,
          damage:        dmg,
          healed:        0,
          targetHpAfter: actor.hp,
          targetMaxHp:   actor.maxHp,
          targetAlive:   actor.alive,
          skillType:     "dot",
          skillName:     "저주 데미지",
          hits: [{ targetTeam: actor.team, targetSlot: actor.slot, damage: dmg, healed: 0, hpAfter: actor.hp, alive: actor.alive }],
          crs: all.map(u => ({ team: u.team, slot: u.slot, cr: Math.round(u.cr), alive: u.alive })),
        });
      }
      actor.dots = actor.dots.filter(d => d.turnsLeft > 0);

      if (!actor.alive) { actor.cr = 0; continue; }

      // ── 쿨다운 감소 ────────────────────────────────────────────────────────
      if (actor.skillCd    > 0) actor.skillCd--;
      if (actor.ultimateCd > 0) actor.ultimateCd--;

      // ── 스킬 선택: 궁극기 → 전투스킬 → 평타 ──────────────────────────────
      const skills = ARCHETYPE_SKILLS[actor.archetype] ?? ARCHETYPE_SKILLS.all;
      let chosen: SkillDef;
      if (actor.ultimateCd === 0) {
        chosen = skills.ultimate;
        actor.ultimateCd = skills.ultimate.cooldown;
      } else if (actor.skillCd === 0) {
        chosen = skills.skill;
        actor.skillCd = skills.skill.cooldown;
      } else {
        chosen = skills.basic;
      }

      // ── 효과 적용 ──────────────────────────────────────────────────────────
      const hits = applyEffect(actor, chosen, all);
      actor.cr = 0;

      if (!hits.length) continue;  // 대상 없음 (모두 사망)

      const primary    = hits[0];
      const primaryUnit = all.find(u => u.team === primary.targetTeam && u.slot === primary.targetSlot);
      const totalDmg   = hits.reduce((s, h) => s + h.damage, 0);
      const totalHeal  = hits.reduce((s, h) => s + h.healed, 0);

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
        crs: all.map(u => ({ team: u.team, slot: u.slot, cr: Math.round(u.cr), alive: u.alive })),
      });
    }
  }

  const won = all.some(u => u.team === "attacker" && u.alive);
  return { won, log };
}

// ─── 서비스 ───────────────────────────────────────────────────────────────────
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
    const clamped = slots.slice(0, 4);
    await this.prisma.arenaDeck.upsert({
      where:  { userId_deckType: { userId, deckType } },
      create: { userId, deckType, slots: clamped },
      update: { slots: clamped },
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
      const first = await this.prisma.userCharacter.findFirst({
        where: { userId: attackerId }, select: { characterId: true }, orderBy: { obtainedAt: "asc" },
      });
      if (first) atkSlots = [first.characterId];
    }
    if (defSlots.length === 0 && defReward?.equippedCharacterId) {
      defSlots = [defReward.equippedCharacterId];
    }
    if (atkSlots.length === 0) throw new Error("공격 덱이 비어있습니다");
    if (defSlots.length === 0) throw new Error("상대방의 방어 덱이 비어있습니다");

    const [atkEnhLvs, defEnhLvs] = await Promise.all([
      Promise.all(atkSlots.map(id => this.getEnhLevel(attackerId, id))),
      Promise.all(defSlots.map(id => this.getEnhLevel(defenderId, id))),
    ]);

    const makeUnit = (charId: number, i: number, team: "attacker" | "defender", enhLevel: number): CombatUnit => {
      const s      = getCharStat(charId, enhLevel);
      const skills = ARCHETYPE_SKILLS[s.archetype] ?? ARCHETYPE_SKILLS.all;
      return {
        slot: i, team, charId,
        hp: s.hp, maxHp: s.hp, atk: s.atk, spd: s.spd,
        cr: 0, alive: true,
        rarity: s.rarity, archetype: s.archetype, charType: s.charType,
        skillCd:    skills.skill.cooldown,     // 첫 턴은 쿨다운 상태로 시작
        ultimateCd: skills.ultimate.cooldown,
        dots: [],
      };
    };

    const attackerUnits = atkSlots.map((id, i) => makeUnit(id, i, "attacker", atkEnhLvs[i]));
    const defenderUnits = defSlots.map((id, i) => makeUnit(id, i, "defender", defEnhLvs[i]));

    const { won, log } = simulateBattle(attackerUnits, defenderUnits);

    const [atkResult] = await Promise.all([
      this.updateArenaStats(attackerId, won, false),
      this.updateArenaStats(defenderId, !won, true),
    ]);

    return {
      won,
      pointsDelta:   atkResult.pointsDelta,
      tierPoints:    atkResult.tierPoints,
      wins:          atkResult.wins,
      losses:        atkResult.losses,
      winStreak:     atkResult.winStreak,
      log,
      attackerChars: attackerUnits.map(u => ({
        slot: u.slot, charId: u.charId, maxHp: u.maxHp,
        atk: u.atk, spd: u.spd, rarity: u.rarity,
        archetype: u.archetype, charType: u.charType,
      })),
      defenderChars: defenderUnits.map(u => ({
        slot: u.slot, charId: u.charId, maxHp: u.maxHp,
        atk: u.atk, spd: u.spd, rarity: u.rarity,
        archetype: u.archetype, charType: u.charType,
      })),
    };
  }

  private async updateArenaStats(userId: string, won: boolean, isDefender: boolean) {
    const ex   = await this.prisma.battleStats.findUnique({ where: { userId } });
    const prev = ex ?? { tierPoints: 0, wins: 0, losses: 0, winStreak: 0, bestStreak: 0 };

    let pointsDelta: number;
    if (won) {
      pointsDelta = isDefender ? 20 : 100 + (prev.winStreak >= 1 ? 20 : 0);
    } else {
      pointsDelta = -50;
    }

    const newWinStreak = won ? (isDefender ? prev.winStreak : prev.winStreak + 1) : 0;
    const newPoints    = Math.max(0, prev.tierPoints + pointsDelta);
    const data = {
      tierPoints: newPoints,
      wins:       won ? prev.wins + 1 : prev.wins,
      losses:     won ? prev.losses   : prev.losses + 1,
      winStreak:  newWinStreak,
      bestStreak: Math.max(prev.bestStreak, newWinStreak),
    };

    await this.prisma.battleStats.upsert({
      where:  { userId },
      create: { userId, ...data },
      update: data,
    });

    return { ...data, pointsDelta };
  }
}
