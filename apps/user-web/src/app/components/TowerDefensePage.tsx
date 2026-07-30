import { useEffect, useRef, useState } from "react";
import { Castle, Coins, Heart, Skull, Trophy, X } from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { api } from "../lib/api";
import PixelCharacter from "./PixelCharacter";
import {
  CHARACTERS,
  RARITY_COLOR,
  RARITY_BORDER,
  getCharName,
  getRarityLabel,
} from "../data/characters";
import type { TranslationKey } from "../lib/i18n";

// ─── 클라이언트 전투 시뮬레이션 상수 (레이드 미니게임과 동일하게 서버는 결과만 검증) ───
type Archetype = "warrior" | "rogue" | "mage" | "tank" | "nature" | "meka" | "cursed";
type Pattern = "single" | "aoe" | "dot";
type Element = "fire" | "earth" | "ice" | "dark" | "nature" | "lightning" | "shadow" | "light";

const ARCHETYPE_STATS: Record<Archetype, { range: number; atkSpeedMs: number; damage: number; pattern: Pattern }> = {
  warrior: { range: 90, atkSpeedMs: 700, damage: 12, pattern: "single" },
  rogue: { range: 80, atkSpeedMs: 450, damage: 7, pattern: "single" },
  tank: { range: 110, atkSpeedMs: 900, damage: 9, pattern: "single" },
  mage: { range: 120, atkSpeedMs: 1000, damage: 16, pattern: "aoe" },
  meka: { range: 100, atkSpeedMs: 850, damage: 13, pattern: "aoe" },
  nature: { range: 95, atkSpeedMs: 1200, damage: 6, pattern: "dot" },
  cursed: { range: 95, atkSpeedMs: 1200, damage: 6, pattern: "dot" },
};

// 콜로세움(arena.service.ts)의 원소 상성 시스템을 그대로 이식
const ARCH_ELEMENT: Record<Archetype, Element> = {
  warrior: "fire",
  tank: "earth",
  mage: "ice",
  rogue: "dark",
  nature: "nature",
  meka: "lightning",
  cursed: "shadow",
};
const ELEMENT_ADVANTAGE: Record<Element, Element> = {
  fire: "nature",
  nature: "ice",
  ice: "fire",
  dark: "light",
  light: "shadow",
  shadow: "dark",
  lightning: "earth",
  earth: "lightning",
};
const ELEMENT_BONUS = 1.15;
// ELEMENT_ADVANTAGE는 (fire→nature→ice→fire)/(dark→light→shadow→dark)/(lightning⇄earth) 세 개의
// 순환으로 이뤄져 있다. "light"는 어떤 타워 계열의 공격 속성도 아니라서(콜로세움 all-폴백 전용)
// light가 카운터인 "shadow"를 웨이브 속성으로 뽑으면 어떤 타워도 상성 보너스를 받을 수 없다 —
// 그래서 light와 shadow 둘 다 웨이브 풀에서 제외하고, 실제로 카운터 가능한 6개만 사용한다.
const WAVE_ELEMENTS: Element[] = ["fire", "earth", "ice", "dark", "nature", "lightning"];
const COUNTERED_BY: Partial<Record<Element, Element>> = Object.fromEntries(
  Object.entries(ELEMENT_ADVANTAGE).map(([atk, def]) => [def, atk]),
);
const ELEMENT_TO_ARCH: Partial<Record<Element, Archetype>> = Object.fromEntries(
  Object.entries(ARCH_ELEMENT).map(([a, e]) => [e, a]),
);
const ELEMENT_COLOR: Record<Element, string> = {
  fire: "#f87171",
  earth: "#b45309",
  ice: "#60a5fa",
  dark: "#7c3aed",
  nature: "#4ade80",
  lightning: "#facc15",
  shadow: "#64748b",
  light: "#f8fafc",
};

const RARITY_POWER_MULT: Record<string, number> = {
  common: 1,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.2,
  legendary: 2.8,
  mythic: 3.6,
};

const MERGE_TIER_MULT = [1, 1.8, 3.2];
const MAX_TIER = 3;

// ─── 골드 경제: 시작부터 슬롯을 전부 무료로 채우지 못하도록 소환 비용이 배치 수에 비례해 오른다 ───
// 판매는 티어별 고정 환불로, "다른 캐릭터만 계속 나와 슬롯이 막히는" 경우 되팔아 새로 시도할 수 있게 한다.
const STARTING_GOLD = 70;
const SUMMON_BASE_COST = 25;
const SUMMON_COST_PER_TOWER = 8;
const KILL_GOLD = 6;
const BOSS_KILL_GOLD = 30;
const TIER_SELL_GOLD = [0, 15, 40, 85]; // index = tower.tier (1~3)

// ─── 강화(Enhance): 골드를 소모해 배치된 타워를 직접 강하게 만드는 시스템 ───
// 100라운드까지 이어지는 긴 세션에서 골드를 계속 투자할 곳이 필요해서 합성(티어업)과 별개로 추가.
const MAX_ENHANCE = 12;
const ENHANCE_BASE_COST = 20;
const ENHANCE_COST_GROWTH = 1.28;
const ENHANCE_DMG_BONUS = 0.12; // 레벨당 공격력 +12%
const ENHANCE_SELL_REFUND_PER_LEVEL = 10;

function enhanceCost(level: number): number {
  return Math.round(ENHANCE_BASE_COST * Math.pow(ENHANCE_COST_GROWTH, level));
}

const WAVE_COUNT = 100;
const BOSS_WAVE_INTERVAL = 10;
const SLOT_COUNT = 12;
const BASE_LIVES = 20;
const SPAWN_INTERVAL_MS = 450;
const AOE_RADIUS = 46;
const PROJECTILE_SPEED = 340; // px/sec
const PROJECTILE_HIT_R = 14;

const CANVAS_W = 980;
const CANVAS_H = 520;

// ─── 경로 기하 헬퍼 — 웨이포인트 배열만 주면 어떤 모양의 맵이든 동작 ───
interface Point {
  x: number;
  y: number;
}

function pathTotalLength(path: Point[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return len;
}

function pointAtDistance(path: Point[], dist: number): Point {
  let remaining = Math.max(0, dist);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segLen || i === path.length - 1) {
      const t = segLen === 0 ? 0 : Math.min(1, remaining / segLen);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segLen;
  }
  return path[path.length - 1];
}

function buildSlots(path: Point[], count: number, offset: number): Point[] {
  const total = pathTotalLength(path);
  const pairs = Math.ceil(count / 2);
  const slots: Point[] = [];
  for (let i = 0; i < pairs; i++) {
    const d = total * ((i + 0.5) / pairs);
    const p = pointAtDistance(path, d);
    const p2 = pointAtDistance(path, Math.min(total, d + 1));
    const dx = p2.x - p.x;
    const dy = p2.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    slots.push({ x: p.x + nx * offset, y: p.y + ny * offset });
    slots.push({ x: p.x - nx * offset, y: p.y - ny * offset });
  }
  return slots.slice(0, count);
}

type DecoShape = "grass" | "ember" | "snow" | "spark";

interface MapTheme {
  bg: string;
  pathFill: string;
  pathBorder: string;
  decoColor: string;
  decoShape: DecoShape;
}

interface MapDef {
  id: string;
  path: Point[];
  slots: Point[];
  theme: MapTheme;
  decorations: Point[];
}

function scatterDecorations(w: number, h: number, count: number): Point[] {
  return Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h }));
}

function defineMap(id: string, path: Point[], slotOffset: number, theme: MapTheme): MapDef {
  return {
    id,
    path,
    slots: buildSlots(path, SLOT_COUNT, slotOffset),
    theme,
    decorations: scatterDecorations(CANVAS_W, CANVAS_H, 46),
  };
}

// 맵을 하나로 통일 — 대신 100라운드 긴 세션에 맞게 캔버스를 키우고, 굴곡을 늘려 슬롯 12개가
// 고르게 배치될 공간을 확보했다. 테마는 Castle 아이콘과 어울리는 "밤의 성채".
const MAPS: MapDef[] = [
  defineMap(
    "castle",
    [
      { x: 0, y: 80 },
      { x: 760, y: 80 },
      { x: 760, y: 260 },
      { x: 120, y: 260 },
      { x: 120, y: 440 },
      { x: 980, y: 440 },
    ],
    46,
    { bg: "#161226", pathFill: "#3a2f52", pathBorder: "#8a6bc4", decoColor: "#c9a6f5", decoShape: "spark" },
  ),
];

interface TowerDef {
  characterId: number;
  archetype: Archetype;
  rarity: string;
}
interface TowerInstance extends TowerDef {
  tier: number;
  slotIndex: number;
  lastAttackAt: number;
  enhanceLevel: number;
}
interface Enemy {
  id: number;
  dist: number;
  hp: number;
  maxHp: number;
  speed: number;
  isBoss: boolean;
  element: Element;
  dotUntil: number;
  dotDmgPerTick: number;
  flinchUntil: number;
}
interface HitFx {
  x: number;
  y: number;
  color: string;
  createdAt: number;
}
interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  pattern: Pattern;
  element: Element;
}

interface GameState {
  mapId: string;
  wave: number;
  wavesCompleted: number;
  waveElement: Element;
  lives: number;
  gold: number;
  slots: (TowerInstance | null)[];
  enemies: Enemy[];
  projectiles: Projectile[];
  hitFx: HitFx[];
  shakeUntil: number;
  nextEnemyId: number;
  nextProjectileId: number;
  spawnQueue: { hp: number; speed: number; isBoss: boolean }[];
  spawnTimer: number;
  waveActive: boolean;
  waveClearedAt: number | null;
  gameOver: boolean;
  won: boolean;
}

function freshGameState(mapId: string): GameState {
  return {
    mapId,
    wave: 0,
    wavesCompleted: 0,
    waveElement: "fire",
    lives: BASE_LIVES,
    gold: STARTING_GOLD,
    slots: Array(SLOT_COUNT).fill(null),
    enemies: [],
    projectiles: [],
    hitFx: [],
    shakeUntil: 0,
    nextEnemyId: 1,
    nextProjectileId: 1,
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    waveClearedAt: null,
    gameOver: false,
    won: false,
  };
}

// 100라운드까지 버텨야 하므로 초반은 완만하다가 후반으로 갈수록 급격히 세지는 곡선(선형×지수 복합).
// 적 마릿수는 30라운드 이후 늘리지 않고 체력/속도로만 난이도를 올려 후반 웨이브가 과도하게 늘어지지 않게 한다.
function buildWaveSpawns(wave: number): { hp: number; speed: number; isBoss: boolean }[] {
  const count = 5 + Math.min(wave, 30);
  const hp = 18 * (1 + wave * 0.05) * Math.pow(1.025, wave);
  const speed = 32 + wave * 1.5;
  const spawns = Array.from({ length: count }, () => ({ hp, speed, isBoss: false }));
  if (wave % BOSS_WAVE_INTERVAL === 0) {
    spawns.push({ hp: hp * 8, speed: speed * 0.7, isBoss: true });
  }
  return spawns;
}

function summonCost(g: GameState): number {
  const occupied = g.slots.filter(Boolean).length;
  return SUMMON_BASE_COST + occupied * SUMMON_COST_PER_TOWER;
}

function weightedTowerPick(pool: TowerDef[], weights: Record<string, number>): TowerDef {
  const byRarity = new Map<string, TowerDef[]>();
  for (const t of pool) {
    const list = byRarity.get(t.rarity) ?? [];
    list.push(t);
    byRarity.set(t.rarity, list);
  }
  const rarities = Object.keys(weights).filter((r) => (byRarity.get(r)?.length ?? 0) > 0);
  const total = rarities.reduce((s, r) => s + weights[r], 0);
  let roll = Math.random() * total;
  let picked = rarities[0];
  for (const r of rarities) {
    roll -= weights[r];
    if (roll <= 0) {
      picked = r;
      break;
    }
  }
  const candidates = byRarity.get(picked) ?? pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** 원형 대신 실제 몬스터처럼 보이는 블롭 실루엣 — 속성색으로 물들이고 보스는 뿔을 추가 */
function drawMonster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  bodyColor: string,
  flinch: boolean,
  isBoss: boolean,
) {
  const scale = flinch ? 1.18 : 1;
  const rr = r * scale;

  if (isBoss) {
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(x - rr * 0.55, y - rr * 1.1);
    ctx.lineTo(x - rr * 0.85, y - rr * 1.85);
    ctx.lineTo(x - rr * 0.15, y - rr * 1.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + rr * 0.55, y - rr * 1.1);
    ctx.lineTo(x + rr * 0.85, y - rr * 1.85);
    ctx.lineTo(x + rr * 0.15, y - rr * 1.05);
    ctx.fill();
  }

  // 몸통 (블롭)
  ctx.fillStyle = flinch ? "#ffffff" : bodyColor;
  ctx.beginPath();
  ctx.moveTo(x - rr, y);
  ctx.quadraticCurveTo(x - rr, y - rr * 1.3, x, y - rr * 1.3);
  ctx.quadraticCurveTo(x + rr, y - rr * 1.3, x + rr, y);
  ctx.quadraticCurveTo(x + rr, y + rr * 0.9, x, y + rr * 1.15);
  ctx.quadraticCurveTo(x - rr, y + rr * 0.9, x - rr, y);
  ctx.closePath();
  ctx.fill();

  // 눈
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - rr * 0.34, y - rr * 0.15, rr * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + rr * 0.34, y - rr * 0.15, rr * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#181818";
  ctx.beginPath();
  ctx.arc(x - rr * 0.34, y - rr * 0.1, rr * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + rr * 0.34, y - rr * 0.1, rr * 0.11, 0, Math.PI * 2);
  ctx.fill();
}

interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  bestWave: number;
  characterId: number | null;
}

const RANK_COLOR: Record<number, string> = { 1: "#f5c542", 2: "#c7ced8", 3: "#c98a4e" };

export default function TowerDefensePage() {
  const { t, lang } = useLang();
  const { refreshRewards } = useAppData();

  const [phase, setPhase] = useState<"loading" | "lobby" | "playing" | "result">("loading");
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [towerPool, setTowerPool] = useState<TowerDef[]>([]);
  const [offerWeights, setOfferWeights] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const [showRankings, setShowRankings] = useState(false);
  const [rankings, setRankings] = useState<RankingEntry[] | null>(null);

  const [hudWave, setHudWave] = useState(1);
  const [hudLives, setHudLives] = useState(BASE_LIVES);
  const [hudGold, setHudGold] = useState(STARTING_GOLD);
  const [bossWarning, setBossWarning] = useState(false);
  const [waveElement, setWaveElement] = useState<Element>("fire");
  const [offerSlot, setOfferSlot] = useState<number | null>(null);
  const [offerChoices, setOfferChoices] = useState<TowerDef[]>([]);
  const [manageSlot, setManageSlot] = useState<number | null>(null);
  const [goldWarning, setGoldWarning] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [mergeFlash, setMergeFlash] = useState<number | null>(null);

  const [result, setResult] = useState<{ wavesCleared: number; isNewRecord: boolean; kpEarned: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const gRef = useRef<GameState>(freshGameState(MAPS[0].id));

  const charById = (id: number) => CHARACTERS.find((c) => c.id === id);
  const currentMap = MAPS[0];

  const loadSummary = () => {
    api
      .get<{
        attemptsLeft: number;
        bestWave: number;
        towerPool: TowerDef[];
        offerWeights: Record<string, number>;
        waveCount: number;
      }>("/tower-defense/summary")
      .then((s) => {
        setAttemptsLeft(s.attemptsLeft);
        setBestWave(s.bestWave);
        setTowerPool(s.towerPool);
        setOfferWeights(s.offerWeights);
        setPhase("lobby");
      })
      .catch(() => setPhase("lobby"));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const openRankings = () => {
    setShowRankings(true);
    if (!rankings) {
      api
        .get<RankingEntry[]>("/tower-defense/rankings")
        .then(setRankings)
        .catch(() => setRankings([]));
    }
  };

  const handleStart = async () => {
    setError(null);
    try {
      await api.post<{ ok: boolean; attemptsLeft: number }>("/tower-defense/start");
      gRef.current = freshGameState(MAPS[0].id);
      gRef.current.wave = 1;
      gRef.current.waveElement = WAVE_ELEMENTS[Math.floor(Math.random() * WAVE_ELEMENTS.length)];
      gRef.current.spawnQueue = buildWaveSpawns(1);
      gRef.current.waveActive = true;
      setHudWave(1);
      setHudLives(BASE_LIVES);
      setHudGold(STARTING_GOLD);
      setBossWarning(false);
      setWaveElement(gRef.current.waveElement);
      setSlotsVersion((v) => v + 1);
      setPhase("playing");
      startLoop();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const finishGame = (won: boolean) => {
    const g = gRef.current;
    g.gameOver = true;
    g.won = won;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setSubmitting(true);
    api
      .post<{ wavesCleared: number; isNewRecord: boolean; bestWave: number; kpEarned: number }>(
        "/tower-defense/submit",
        { wavesCleared: g.wavesCompleted },
      )
      .then((res) => {
        setResult({ wavesCleared: res.wavesCleared, isNewRecord: res.isNewRecord, kpEarned: res.kpEarned });
        setBestWave(res.bestWave);
        if (res.isNewRecord) setRankings(null); // 순위 갱신됐을 수 있으니 다음에 다시 불러오게
        if (res.kpEarned > 0) void refreshRewards();
        setPhase("result");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("result");
        setResult({ wavesCleared: g.wavesCompleted, isNewRecord: false, kpEarned: 0 });
      })
      .finally(() => setSubmitting(false));
  };

  const startLoop = () => {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      tick(dt, now);
      draw();
      if (!gRef.current.gameOver) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const tick = (dt: number, now: number) => {
    const g = gRef.current;
    if (g.gameOver) return;
    const map = MAPS.find((m) => m.id === g.mapId) ?? MAPS[0];
    const totalLen = pathTotalLength(map.path);

    // 웨이브 스폰
    if (g.spawnQueue.length > 0) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        const spec = g.spawnQueue.shift()!;
        g.enemies.push({
          id: g.nextEnemyId++,
          dist: 0,
          hp: spec.hp,
          maxHp: spec.hp,
          speed: spec.speed,
          isBoss: spec.isBoss,
          element: g.waveElement,
          dotUntil: 0,
          dotDmgPerTick: 0,
          flinchUntil: 0,
        });
        g.spawnTimer = SPAWN_INTERVAL_MS;
      }
    }

    // 적 이동 + 도트뎀지 + 도달 판정
    g.enemies = g.enemies.filter((e) => {
      e.dist += (e.speed * dt) / 1000;
      if (e.dotUntil > now) e.hp -= (e.dotDmgPerTick * dt) / 1000;
      if (e.hp <= 0) {
        g.gold += e.isBoss ? BOSS_KILL_GOLD : KILL_GOLD;
        return false;
      }
      if (e.dist >= totalLen) {
        g.lives -= e.isBoss ? 3 : 1;
        return false;
      }
      return true;
    });

    // 타워 공격
    for (const tower of g.slots) {
      if (!tower) continue;
      const stats = ARCHETYPE_STATS[tower.archetype];
      if (now - tower.lastAttackAt < stats.atkSpeedMs) continue;
      const pos = map.slots[tower.slotIndex];
      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const e of g.enemies) {
        const ep = pointAtDistance(map.path, e.dist);
        const dx = ep.x - pos.x;
        const dy = ep.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= stats.range && dist < nearestDist) {
          nearest = e;
          nearestDist = dist;
        }
      }
      if (!nearest) continue;
      tower.lastAttackAt = now;
      const dmg =
        stats.damage *
        RARITY_POWER_MULT[tower.rarity] *
        MERGE_TIER_MULT[tower.tier - 1] *
        (1 + tower.enhanceLevel * ENHANCE_DMG_BONUS);
      g.projectiles.push({
        id: g.nextProjectileId++,
        x: pos.x,
        y: pos.y,
        targetId: nearest.id,
        damage: dmg,
        pattern: stats.pattern,
        element: ARCH_ELEMENT[tower.archetype],
      });
    }

    // 투사체 이동 + 충돌 (원소 상성 보너스 적용)
    g.projectiles = g.projectiles.filter((p) => {
      const target = g.enemies.find((e) => e.id === p.targetId);
      if (!target) return false;
      const tp = pointAtDistance(map.path, target.dist);
      const dx = tp.x - p.x;
      const dy = tp.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= PROJECTILE_HIT_R) {
        const elemMult = ELEMENT_ADVANTAGE[p.element] === target.element ? ELEMENT_BONUS : 1;
        const dmg = p.damage * elemMult;
        target.flinchUntil = now + 110;
        g.hitFx.push({ x: tp.x, y: tp.y, color: ELEMENT_COLOR[p.element], createdAt: now });
        if (target.isBoss) g.shakeUntil = now + 140;
        if (p.pattern === "aoe") {
          for (const e of g.enemies) {
            const ep = pointAtDistance(map.path, e.dist);
            const ddx = ep.x - tp.x;
            const ddy = ep.y - tp.y;
            if (Math.sqrt(ddx * ddx + ddy * ddy) <= AOE_RADIUS) {
              const em = ELEMENT_ADVANTAGE[p.element] === e.element ? ELEMENT_BONUS : 1;
              e.hp -= p.damage * em;
              e.flinchUntil = now + 110;
            }
          }
        } else if (p.pattern === "dot") {
          target.hp -= dmg * 0.4;
          target.dotUntil = now + 2500;
          target.dotDmgPerTick = dmg * 0.3;
        } else {
          target.hp -= dmg;
        }
        return false;
      }
      const step = (PROJECTILE_SPEED * dt) / 1000;
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
      return true;
    });
    g.enemies = g.enemies.filter((e) => {
      if (e.hp > 0) return true;
      g.gold += e.isBoss ? BOSS_KILL_GOLD : KILL_GOLD;
      return false;
    });
    g.hitFx = g.hitFx.filter((fx) => now - fx.createdAt < 260);

    if (g.lives <= 0) {
      finishGame(false);
      return;
    }

    // 웨이브 클리어 판정
    if (g.waveActive && g.spawnQueue.length === 0 && g.enemies.length === 0) {
      g.waveActive = false;
      g.wavesCompleted = g.wave;
      g.waveClearedAt = now;
    }
    if (g.waveClearedAt !== null && now - g.waveClearedAt > 1800) {
      g.waveClearedAt = null;
      if (g.wave >= WAVE_COUNT) {
        finishGame(true);
        return;
      }
      g.wave += 1;
      g.waveElement = WAVE_ELEMENTS[Math.floor(Math.random() * WAVE_ELEMENTS.length)];
      g.spawnQueue = buildWaveSpawns(g.wave);
      g.waveActive = true;
      setHudWave(g.wave);
      setWaveElement(g.waveElement);
      setBossWarning(g.wave % BOSS_WAVE_INTERVAL === 0);
    }

    setHudLives((prev) => (prev !== g.lives ? g.lives : prev));
    setHudGold((prev) => (prev !== g.gold ? g.gold : prev));
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gRef.current;
    const map = MAPS.find((m) => m.id === g.mapId) ?? MAPS[0];
    const now = performance.now();
    const theme = map.theme;

    ctx.save();
    if (now < g.shakeUntil) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    ctx.clearRect(-8, -8, CANVAS_W + 16, CANVAS_H + 16);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(-8, -8, CANVAS_W + 16, CANVAS_H + 16);

    // 맵 테마 배경 장식
    for (const d of map.decorations) {
      if (theme.decoShape === "grass") {
        ctx.strokeStyle = `${theme.decoColor}55`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y + 5);
        ctx.lineTo(d.x, d.y - 5);
        ctx.stroke();
      } else if (theme.decoShape === "ember") {
        const pulse = 0.5 + 0.5 * Math.sin(now / 400 + d.x);
        ctx.fillStyle = `${theme.decoColor}${Math.round(30 + pulse * 50).toString(16).padStart(2, "0")}`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.5 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.decoShape === "spark") {
        const pulse = 0.5 + 0.5 * Math.sin(now / 600 + d.x * 0.7);
        const s = 2 + pulse * 2.2;
        ctx.strokeStyle = `${theme.decoColor}${Math.round(25 + pulse * 60).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(d.x - s, d.y);
        ctx.lineTo(d.x + s, d.y);
        ctx.moveTo(d.x, d.y - s);
        ctx.lineTo(d.x, d.y + s);
        ctx.stroke();
      } else {
        ctx.fillStyle = `${theme.decoColor}66`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 경로 (웨이포인트 폴리라인)
    const drawPathLine = () => {
      ctx.beginPath();
      ctx.moveTo(map.path[0].x, map.path[0].y);
      for (const pt of map.path.slice(1)) ctx.lineTo(pt.x, pt.y);
    };
    ctx.strokeStyle = theme.pathFill;
    ctx.lineWidth = 46;
    ctx.lineJoin = "round";
    drawPathLine();
    ctx.stroke();
    ctx.strokeStyle = theme.pathBorder;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    drawPathLine();
    ctx.stroke();
    ctx.setLineDash([]);

    // 적 (몬스터 실루엣)
    for (const e of g.enemies) {
      const pos = pointAtDistance(map.path, e.dist);
      const r = e.isBoss ? 19 : 11;
      const flinch = now < e.flinchUntil;
      const bodyColor = e.dotUntil > now ? "#84cc16" : ELEMENT_COLOR[e.element];
      drawMonster(ctx, pos.x, pos.y, r, bodyColor, flinch, e.isBoss);
      // hp bar
      const barW = r * 2.2;
      ctx.fillStyle = "#00000066";
      ctx.fillRect(pos.x - barW / 2, pos.y - r - 12, barW, 4);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(pos.x - barW / 2, pos.y - r - 12, barW * Math.max(0, e.hp / e.maxHp), 4);
    }

    // 투사체
    for (const p of g.projectiles) {
      ctx.fillStyle = ELEMENT_COLOR[p.element];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 타격 이펙트 (히트스파크)
    for (const fx of g.hitFx) {
      const age = now - fx.createdAt;
      const life = Math.max(0, 1 - age / 260);
      ctx.strokeStyle = fx.color;
      ctx.globalAlpha = life;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 6 + (1 - life) * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 슬롯 테두리 (빈 슬롯 표시용 힌트)
    for (let i = 0; i < SLOT_COUNT; i++) {
      const pos = map.slots[i];
      if (!g.slots[i]) {
        ctx.strokeStyle = "#ffffff22";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(pos.x - 24, pos.y - 24, 48, 48);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  };

  const openOffer = (slotIndex: number) => {
    const g = gRef.current;
    if (g.slots[slotIndex] || towerPool.length === 0) return;
    if (g.gold < summonCost(g)) {
      setGoldWarning(true);
      setTimeout(() => setGoldWarning(false), 1200);
      return;
    }
    const choices: TowerDef[] = [];
    for (let i = 0; i < 3; i++) choices.push(weightedTowerPick(towerPool, offerWeights));
    setOfferChoices(choices);
    setOfferSlot(slotIndex);
  };

  const pickOffer = (def: TowerDef) => {
    if (offerSlot === null) return;
    const g = gRef.current;
    const cost = summonCost(g);
    if (g.gold < cost) {
      setOfferSlot(null);
      setOfferChoices([]);
      return;
    }
    g.gold -= cost;
    g.slots[offerSlot] = { ...def, tier: 1, slotIndex: offerSlot, lastAttackAt: 0, enhanceLevel: 0 };
    mergeCheck(def.characterId, 1);
    setOfferSlot(null);
    setOfferChoices([]);
    setSlotsVersion((v) => v + 1);
  };

  const sellTower = () => {
    if (manageSlot === null) return;
    const g = gRef.current;
    const tower = g.slots[manageSlot];
    if (!tower) {
      setManageSlot(null);
      return;
    }
    g.gold += TIER_SELL_GOLD[tower.tier] + tower.enhanceLevel * ENHANCE_SELL_REFUND_PER_LEVEL;
    g.slots[manageSlot] = null;
    setManageSlot(null);
    setSlotsVersion((v) => v + 1);
  };

  const enhanceTower = () => {
    if (manageSlot === null) return;
    const g = gRef.current;
    const tower = g.slots[manageSlot];
    if (!tower || tower.enhanceLevel >= MAX_ENHANCE) return;
    const cost = enhanceCost(tower.enhanceLevel);
    if (g.gold < cost) {
      setGoldWarning(true);
      setTimeout(() => setGoldWarning(false), 1200);
      return;
    }
    g.gold -= cost;
    tower.enhanceLevel += 1;
    setSlotsVersion((v) => v + 1);
  };

  const closeManage = () => setManageSlot(null);

  const mergeCheck = (characterId: number, tier: number) => {
    if (tier >= MAX_TIER) return;
    const g = gRef.current;
    const matches = g.slots
      .map((s, idx) => ({ s, idx }))
      .filter((e) => e.s && e.s.characterId === characterId && e.s.tier === tier);
    if (matches.length < 3) return;
    const [a, b, c] = matches.slice(0, 3);
    const base = g.slots[c.idx]!;
    const carryEnhance = Math.max(a.s!.enhanceLevel, b.s!.enhanceLevel, c.s!.enhanceLevel);
    g.slots[a.idx] = null;
    g.slots[b.idx] = null;
    g.slots[c.idx] = {
      characterId,
      archetype: base.archetype,
      rarity: base.rarity,
      tier: tier + 1,
      slotIndex: c.idx,
      lastAttackAt: 0,
      enhanceLevel: carryEnhance,
    };
    setMergeFlash(c.idx);
    setTimeout(() => setMergeFlash(null), 600);
    mergeCheck(characterId, tier + 1);
  };

  const closeOffer = () => {
    setOfferSlot(null);
    setOfferChoices([]);
  };

  const backToLobby = () => {
    setResult(null);
    setPhase("loading");
    loadSummary();
  };

  const archLabel = (arch: Archetype): string => t(`td.arch_${arch}` as TranslationKey);
  const elemLabel = (elem: Element): string => (elem === "light" ? "" : t(`td.elem_${elem}` as TranslationKey));

  const counterArch = ELEMENT_TO_ARCH[COUNTERED_BY[waveElement] ?? "fire"];

  const occupiedSlots = gRef.current.slots.filter(Boolean).length;
  void slotsVersion;
  const nextSummonCost = SUMMON_BASE_COST + occupiedSlots * SUMMON_COST_PER_TOWER;
  const manageTowerInstance = manageSlot !== null ? gRef.current.slots[manageSlot] : null;
  const manageDef = manageTowerInstance ? charById(manageTowerInstance.characterId) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Castle className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">{t("nav.tower_defense")}</h2>
        </div>
        {phase === "lobby" && (
          <button
            onClick={openRankings}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Trophy className="w-4 h-4" /> {t("td.rankings_btn")}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {phase === "loading" && <p className="text-sm text-muted-foreground text-center py-10">{t("td.loading")}</p>}

      {phase === "lobby" && (
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-4">
          <Castle className="w-16 h-16 text-primary/60" />
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("td.best_wave")}</p>
              <p className="text-lg font-bold">{bestWave}/{WAVE_COUNT}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("td.attempts_left")}</p>
              <p className="text-lg font-bold">{attemptsLeft}</p>
            </div>
          </div>

          <button
            onClick={() => void handleStart()}
            disabled={attemptsLeft <= 0}
            className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
              attemptsLeft > 0
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            {attemptsLeft > 0 ? t("td.start") : t("td.no_attempts")}
          </button>
          <p className="text-[11px] text-muted-foreground text-center">{t("td.desc")}</p>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-2">
            <p className="text-sm font-semibold">{t("td.wave_label")} {hudWave}/{WAVE_COUNT}</p>
            <p className="flex items-center gap-1 text-sm font-semibold text-amber-400">
              <Coins className="w-4 h-4" /> {hudGold}
            </p>
            <p className="flex items-center gap-1 text-sm font-semibold text-rose-400">
              <Heart className="w-4 h-4" /> {hudLives}
            </p>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ELEMENT_COLOR[waveElement] }} />
            {t("td.wave_element_hint")
              .replace("{element}", elemLabel(waveElement))
              .replace("{archetype}", counterArch ? archLabel(counterArch) : "")}
          </p>

          <p className={`text-center text-[11px] ${goldWarning ? "text-rose-400 font-semibold" : "text-muted-foreground"}`}>
            {goldWarning ? t("td.not_enough_gold") : t("td.summon_cost_hint").replace("{cost}", String(nextSummonCost))}
          </p>

          {bossWarning && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
              <Skull className="w-4 h-4" /> {t("td.boss_warning")}
            </p>
          )}

          <div className="overflow-x-auto">
            <div className="relative mx-auto" style={{ width: CANVAS_W, height: CANVAS_H }}>
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 rounded-xl" />
              {Array.from({ length: SLOT_COUNT }, (_, i) => {
                const pos = currentMap.slots[i];
                const tower = gRef.current.slots[i];
                void slotsVersion;
                const def = tower ? charById(tower.characterId) : null;
                return (
                  <button
                    key={i}
                    onClick={() => (tower ? setManageSlot(i) : openOffer(i))}
                    className={`absolute flex items-center justify-center rounded-xl transition ${
                      mergeFlash === i ? "scale-125" : ""
                    } ${def ? `${RARITY_BORDER[def.rarity]} border-2 bg-card/70` : "hover:bg-white/5"}`}
                    style={{ left: pos.x - 26, top: pos.y - 26, width: 52, height: 52 }}
                  >
                    {def && tower && (
                      <div className="relative">
                        <PixelCharacter characterId={def.id} size={44} />
                        {tower.tier > 1 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-amber-400 text-black rounded-full w-4 h-4 flex items-center justify-center">
                            {tower.tier}
                          </span>
                        )}
                        {tower.enhanceLevel > 0 && (
                          <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-emerald-400 text-black rounded-full px-1">
                            +{tower.enhanceLevel}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {offerSlot !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={closeOffer}>
              <div
                className="bg-card rounded-2xl border border-border p-4 w-full max-w-sm space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold text-center">{t("td.pick_offer")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {offerChoices.map((c, idx) => {
                    const def = charById(c.characterId);
                    if (!def) return null;
                    return (
                      <button
                        key={idx}
                        onClick={() => pickOffer(c)}
                        className={`rounded-xl border-2 ${RARITY_BORDER[def.rarity]} p-2 flex flex-col items-center gap-1`}
                      >
                        <PixelCharacter characterId={def.id} size={48} />
                        <span className={`text-[10px] font-semibold ${RARITY_COLOR[def.rarity]}`}>
                          {getCharName(def, lang)}
                        </span>
                        <span className={`text-[9px] ${RARITY_COLOR[def.rarity]}`}>{getRarityLabel(def.rarity, lang)}</span>
                        <span className="text-[9px] text-muted-foreground">{archLabel(c.archetype)}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={closeOffer}
                  className="w-full rounded-lg border border-border text-foreground text-xs font-semibold py-2 hover:bg-white/5"
                >
                  {t("td.cancel_offer")}
                </button>
              </div>
            </div>
          )}

          {manageSlot !== null && manageTowerInstance && manageDef && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={closeManage}>
              <div
                className="bg-card rounded-2xl border border-border p-4 w-full max-w-xs space-y-3 flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <PixelCharacter characterId={manageDef.id} size={56} />
                <span className={`text-xs font-semibold ${RARITY_COLOR[manageDef.rarity]}`}>
                  {getCharName(manageDef, lang)} · Tier {manageTowerInstance.tier} · {t("td.enhance_lv")} {manageTowerInstance.enhanceLevel}
                </span>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={enhanceTower}
                    disabled={manageTowerInstance.enhanceLevel >= MAX_ENHANCE}
                    className={`flex-1 rounded-lg text-xs font-semibold py-2 ${
                      manageTowerInstance.enhanceLevel >= MAX_ENHANCE
                        ? "bg-secondary text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
                  >
                    {manageTowerInstance.enhanceLevel >= MAX_ENHANCE
                      ? t("td.enhance_maxed")
                      : t("td.enhance_btn").replace("{cost}", String(enhanceCost(manageTowerInstance.enhanceLevel)))}
                  </button>
                  <button
                    onClick={sellTower}
                    className="flex-1 rounded-lg bg-amber-500 text-black text-xs font-semibold py-2 hover:bg-amber-400"
                  >
                    {t("td.sell_btn").replace(
                      "{gold}",
                      String(TIER_SELL_GOLD[manageTowerInstance.tier] + manageTowerInstance.enhanceLevel * ENHANCE_SELL_REFUND_PER_LEVEL),
                    )}
                  </button>
                </div>
                <button
                  onClick={closeManage}
                  className="w-full rounded-lg border border-border text-foreground text-xs font-semibold py-2 hover:bg-white/5"
                >
                  {t("td.cancel_offer")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === "result" && (
        <div className="bg-card rounded-2xl border-2 border-primary/40 p-6 flex flex-col items-center gap-3">
          {submitting ? (
            <p className="text-sm text-muted-foreground py-8">{t("td.submitting")}</p>
          ) : (
            result && (
              <>
                <p className={`text-lg font-bold ${result.wavesCleared >= WAVE_COUNT ? "text-emerald-400" : "text-rose-400"}`}>
                  {result.wavesCleared >= WAVE_COUNT ? t("td.victory") : t("td.defeat")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("td.wave_reached")} {result.wavesCleared}/{WAVE_COUNT}
                </p>
                {result.isNewRecord && <p className="text-xs font-semibold text-amber-400">{t("td.new_record")}</p>}
                {result.kpEarned > 0 && <p className="text-sm font-bold text-primary">+{result.kpEarned}KP</p>}
                <button
                  onClick={backToLobby}
                  className="mt-2 w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                >
                  {t("td.back_to_lobby")}
                </button>
              </>
            )
          )}
        </div>
      )}

      {showRankings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowRankings(false)}>
          <div
            className="bg-card rounded-2xl border border-border p-4 w-full max-w-sm max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">{t("td.rankings_title")}</p>
              <button onClick={() => setShowRankings(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {rankings === null ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("td.loading")}</p>
            ) : rankings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("td.rankings_empty")}</p>
            ) : (
              <ul className="space-y-1.5">
                {rankings.map((r) => (
                  <li key={r.userId} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: RANK_COLOR[r.rank] ? `${RANK_COLOR[r.rank]}22` : "var(--muted)",
                        color: RANK_COLOR[r.rank] ?? "var(--muted-foreground)",
                      }}
                    >
                      {r.rank}
                    </span>
                    <span className="flex-1 truncate font-medium">{r.nickname}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("td.wave_label")} {r.bestWave}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
