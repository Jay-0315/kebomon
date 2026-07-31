import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  Castle,
  Coins,
  FastForward,
  GitMerge,
  Heart,
  Layers,
  Plus,
  Skull,
  Sparkles,
  Ticket,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
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
type Archetype =
  | "warrior"
  | "rogue"
  | "mage"
  | "tank"
  | "nature"
  | "meka"
  | "cursed";
type Pattern = "single" | "aoe" | "dot";
type Element =
  | "fire"
  | "earth"
  | "ice"
  | "dark"
  | "nature"
  | "lightning"
  | "shadow"
  | "light";

// 공격속도는 /1.5로 나눠서 전체 템포를 1.5배 끌어올림.
// range는 블록형 배치(패드가 경로와 최대 ~170px 떨어짐)에 맞춰 대폭 상향 — 기존 80~120은
// 경로에 바로 붙어있던 이전 레이아웃 기준이라 블록 구석 슬롯은 사거리 밖이라 공격을 못 하고 있었다.
const ARCHETYPE_STATS: Record<
  Archetype,
  { range: number; atkSpeedMs: number; damage: number; pattern: Pattern }
> = {
  warrior: { range: 190, atkSpeedMs: 467, damage: 12, pattern: "single" },
  rogue: { range: 175, atkSpeedMs: 300, damage: 7, pattern: "single" },
  tank: { range: 225, atkSpeedMs: 600, damage: 9, pattern: "single" },
  mage: { range: 245, atkSpeedMs: 667, damage: 16, pattern: "aoe" },
  meka: { range: 210, atkSpeedMs: 567, damage: 13, pattern: "aoe" },
  nature: { range: 200, atkSpeedMs: 800, damage: 6, pattern: "dot" },
  cursed: { range: 200, atkSpeedMs: 800, damage: 6, pattern: "dot" },
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
const WAVE_ELEMENTS: Element[] = [
  "fire",
  "earth",
  "ice",
  "dark",
  "nature",
  "lightning",
];
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

// ─── 골드 경제: 배치는 유료, 판매는 티어별 환불 ───
const STARTING_GOLD = 300;
const PLACE_COST = 100; // 빈 슬롯에 최하등급 랜덤 1종 배치
const KILL_GOLD = 6;
const BOSS_KILL_GOLD = 30;
const TIER_SELL_GOLD = [0, 50, 130, 300]; // index = tower.tier (1~3), 판매는 항상 원가보다 낮게
const LOWEST_RARITY = "common";

// ─── 선택배치는 골드가 아니라 "토큰"으로 — 보스를 잡을 때마다 1개씩 지급, 토큰 1개당 1회 사용 ───
// 원할 때 아무 빈 슬롯에나 써서 3종 중 상위등급 하나를 골라 배치할 수 있다.
function tokenPlaceRarities(wave: number): string[] {
  if (wave < 30) return ["uncommon", "rare", "epic"];
  if (wave < 60) return ["rare", "epic", "legendary"];
  return ["epic", "legendary", "mythic"];
}

// ─── 티어(합성 단계) 등장 확률: 20라운드까지는 1티어만, 이후로 2~3티어가 점진적으로 섞여 나온다 ───
function rollPlacementTier(wave: number): number {
  const tier3Chance = Math.min(0.15, Math.max(0, (wave - 50) / 80));
  const tier2Chance = Math.min(0.35, Math.max(0, (wave - 20) / 60));
  const roll = Math.random();
  if (roll < tier3Chance) return 3;
  if (roll < tier3Chance + tier2Chance) return 2;
  return 1;
}

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
const SLOT_COUNT = 24; // 블록 6개 × 패드 4개(2x2)
const BASE_LIVES = 20;
const SPAWN_INTERVAL_MS = 300; // 450 → 300 (스폰 템포 1.5배)
const AOE_RADIUS = 46;
const PROJECTILE_SPEED = 510; // px/sec, 340 → 510 (1.5배)
const PROJECTILE_HIT_R = 14;
const WAVE_PREP_MS = 5000; // 웨이브 클리어 후 다음 웨이브까지 정비 시간

const CANVAS_W = 1300;
const CANVAS_H = 720;

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

// "플레이어별 사각 패널 안에 건설 패드 2x2가 뭉쳐있고,
// 그 패널들 사이 통로로 몬스터가 지나가는" 구조를 그대로 재현 — 블록 6개(3x2 그리드) x 패드 4개.
const BLOCK_SIZE = 240;
const PAD_OFFSET = 55; // 블록 중심에서 2x2 패드까지의 거리

interface BlockRect {
  x: number;
  y: number;
  size: number;
}

function buildBlockSlots(centers: Point[]): Point[] {
  const slots: Point[] = [];
  for (const c of centers) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        slots.push({ x: c.x + sx * PAD_OFFSET, y: c.y + sy * PAD_OFFSET });
      }
    }
  }
  return slots;
}

type DecoShape = "grass" | "ember" | "snow" | "spark";

interface MapTheme {
  bg: string;
  tileAlt: string;
  pathFill: string;
  pathBorder: string;
  decoColor: string;
  decoShape: DecoShape;
}

interface MapDef {
  id: string;
  path: Point[];
  blocks: BlockRect[];
  slots: Point[];
  theme: MapTheme;
  decorations: Point[];
}

function scatterDecorations(w: number, h: number, count: number): Point[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
  }));
}

function defineMap(
  id: string,
  path: Point[],
  blockCenters: Point[],
  theme: MapTheme,
): MapDef {
  return {
    id,
    path,
    blocks: blockCenters.map((c) => ({ x: c.x, y: c.y, size: BLOCK_SIZE })),
    slots: buildBlockSlots(blockCenters),
    theme,
    decorations: scatterDecorations(CANVAS_W, CANVAS_H, 90),
  };
}

// 맵을 하나로 통일 — 3x2 블록 그리드 + 블록 사이 통로를 지그재그로 지나가는 몬스터 진행 경로로 구성
const MAPS: MapDef[] = [
  defineMap(
    "castle",
    [
      { x: 0, y: 40 },
      { x: 465, y: 40 },
      { x: 465, y: 680 },
      { x: 835, y: 680 },
      { x: 835, y: 40 },
      { x: 1300, y: 40 },
    ],
    [
      { x: 280, y: 200 },
      { x: 650, y: 200 },
      { x: 1020, y: 200 },
      { x: 280, y: 520 },
      { x: 650, y: 520 },
      { x: 1020, y: 520 },
    ],
    {
      bg: "#191430",
      tileAlt: "#1f1a3a",
      pathFill: "#3a2f52",
      pathBorder: "#8a6bc4",
      decoColor: "#c9a6f5",
      decoShape: "spark",
    },
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
  selectTokens: number;
  kills: number;
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
    selectTokens: 0,
    kills: 0,
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
function buildWaveSpawns(
  wave: number,
): { hp: number; speed: number; isBoss: boolean }[] {
  const count = 5 + Math.min(wave, 30);
  const hp = 18 * (1 + wave * 0.05) * Math.pow(1.025, wave);
  const speed = (32 + wave * 1.5) * 2.2; // 여전히 느리다는 피드백 반영, 1.5배 → 2.2배로 재상향
  const spawns = Array.from({ length: count }, () => ({
    hp,
    speed,
    isBoss: false,
  }));
  if (wave % BOSS_WAVE_INTERVAL === 0) {
    spawns.push({ hp: hp * 8, speed: speed * 0.7, isBoss: true });
  }
  return spawns;
}

// 지정된 등급들 중에서만 균등 랜덤 — 빈 슬롯 클릭(최하등급 전용)과 보스 보상(상위등급 전용) 둘 다 재사용
function randomTowerByRarities(
  pool: TowerDef[],
  rarities: string[],
): TowerDef | null {
  const candidates = pool.filter((t) => rarities.includes(t.rarity));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function instantiateTower(
  def: TowerDef,
  slotIndex: number,
  tier: number,
): TowerInstance {
  return { ...def, tier, slotIndex, lastAttackAt: 0, enhanceLevel: 0 };
}

// 필드에서 "같은 캐릭터 + 같은 티어"가 2개 이상인 슬롯들을 모두 찾는다 (합성 대상 하이라이트/활성화용)
function findMergeableSlots(slots: (TowerInstance | null)[]): Set<number> {
  const groups = new Map<string, number[]>();
  slots.forEach((s, idx) => {
    if (!s || s.tier >= MAX_TIER) return;
    const key = `${s.characterId}:${s.tier}`;
    const arr = groups.get(key) ?? [];
    arr.push(idx);
    groups.set(key, arr);
  });
  const result = new Set<number>();
  for (const arr of groups.values()) {
    if (arr.length >= 2) arr.forEach((i) => result.add(i));
  }
  return result;
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

const RANK_COLOR: Record<number, string> = {
  1: "#f5c542",
  2: "#c7ced8",
  3: "#c98a4e",
};

// 하단 액션 패널에서 선택하는 모드 — 선택 후 게임 화면(캔버스 오버레이 슬롯)을 클릭해 대상에 적용한다
type ActionMode = "place" | "selectPlace" | "enhance" | "sell" | "merge";
const ACTION_MODE_RING: Record<ActionMode, string> = {
  place: "ring-emerald-400",
  selectPlace: "ring-emerald-400",
  enhance: "ring-sky-400",
  sell: "ring-rose-400",
  merge: "ring-fuchsia-400",
};

// 로비 배경 장식 — 인게임 맵 테마("밤의 성채" 보라색 반짝임)와 통일감을 주기 위한 고정 좌표 반짝임
const LOBBY_SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  delay: `${(i % 8) * 0.35}s`,
  size: 2 + (i % 3),
}));

export default function TowerDefensePage() {
  const { t, lang } = useLang();
  const { refreshRewards } = useAppData();

  const [phase, setPhase] = useState<
    "loading" | "lobby" | "playing" | "result"
  >("loading");
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [towerPool, setTowerPool] = useState<TowerDef[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showRankings, setShowRankings] = useState(false);
  const [rankings, setRankings] = useState<RankingEntry[] | null>(null);

  const [hudWave, setHudWave] = useState(1);
  const [hudLives, setHudLives] = useState(BASE_LIVES);
  const [hudGold, setHudGold] = useState(STARTING_GOLD);
  const [hudTokens, setHudTokens] = useState(0);
  const [hudKills, setHudKills] = useState(0);
  const [hudPrepLeft, setHudPrepLeft] = useState(0);
  const [hudSpeed, setHudSpeed] = useState(1);
  const [tokenGainFlash, setTokenGainFlash] = useState(false);
  const [bossWarning, setBossWarning] = useState(false);
  const [waveElement, setWaveElement] = useState<Element>("fire");
  const [goldWarning, setGoldWarning] = useState(false);
  const [tokenWarning, setTokenWarning] = useState(false);
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [mergeFlash, setMergeFlash] = useState<number | null>(null);

  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [selectPlaceTarget, setSelectPlaceTarget] = useState<number | null>(
    null,
  );
  const [selectPlaceChoices, setSelectPlaceChoices] = useState<
    { def: TowerDef; tier: number }[]
  >([]);

  const [result, setResult] = useState<{
    wavesCleared: number;
    isNewRecord: boolean;
    kpEarned: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const gRef = useRef<GameState>(freshGameState(MAPS[0].id));
  const speedMultiplierRef = useRef(1);

  const charById = (id: number) => CHARACTERS.find((c) => c.id === id);
  const currentMap = MAPS[0];

  const loadSummary = () => {
    api
      .get<{
        attemptsLeft: number;
        bestWave: number;
        towerPool: TowerDef[];
        waveCount: number;
      }>("/tower-defense/summary")
      .then((s) => {
        setAttemptsLeft(s.attemptsLeft);
        setBestWave(s.bestWave);
        setTowerPool(s.towerPool);
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

  // 하단 액션 패널 단축키 — 1~5로 모드 전환, Esc로 취소
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const modeByKey: Record<string, ActionMode> = {
        "1": "place",
        "2": "selectPlace",
        "3": "enhance",
        "4": "sell",
        "5": "merge",
      };
      const mode = modeByKey[e.key];
      if (mode) {
        setActionMode((prev) => (prev === mode ? null : mode));
      } else if (e.key === "Escape") {
        setActionMode(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  const toggleSpeed = () => {
    const next = speedMultiplierRef.current === 1 ? 2 : 1;
    speedMultiplierRef.current = next;
    setHudSpeed(next);
  };

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
      await api.post<{ ok: boolean; attemptsLeft: number }>(
        "/tower-defense/start",
      );
      gRef.current = freshGameState(MAPS[0].id);
      gRef.current.wave = 1;
      gRef.current.waveElement =
        WAVE_ELEMENTS[Math.floor(Math.random() * WAVE_ELEMENTS.length)];
      gRef.current.spawnQueue = buildWaveSpawns(1);
      gRef.current.waveActive = true;
      setHudWave(1);
      setHudLives(BASE_LIVES);
      setHudGold(STARTING_GOLD);
      setHudTokens(0);
      setHudKills(0);
      setHudPrepLeft(0);
      speedMultiplierRef.current = 1;
      setHudSpeed(1);
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
      .post<{
        wavesCleared: number;
        isNewRecord: boolean;
        bestWave: number;
        kpEarned: number;
      }>("/tower-defense/submit", { wavesCleared: g.wavesCompleted })
      .then((res) => {
        setResult({
          wavesCleared: res.wavesCleared,
          isNewRecord: res.isNewRecord,
          kpEarned: res.kpEarned,
        });
        setBestWave(res.bestWave);
        if (res.isNewRecord) setRankings(null); // 순위 갱신됐을 수 있으니 다음에 다시 불러오게
        if (res.kpEarned > 0) void refreshRewards();
        setPhase("result");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("result");
        setResult({
          wavesCleared: g.wavesCompleted,
          isNewRecord: false,
          kpEarned: 0,
        });
      })
      .finally(() => setSubmitting(false));
  };

  // 2배속 토글이 게임 내 모든 시간 기반 로직(이동/공격쿨/이펙트/웨이브 전환 대기)에 일관되게
  // 적용되도록, 실시간이 아니라 배속이 곱해진 "가상 시계"를 tick/draw 양쪽에 동일하게 넘긴다.
  const startLoop = () => {
    let last = performance.now();
    let virtualNow = last;
    const loop = (real: number) => {
      const realDt = Math.min(real - last, 50);
      last = real;
      const dt = realDt * speedMultiplierRef.current;
      virtualNow += dt;
      tick(dt, virtualNow);
      draw(virtualNow);
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
        g.kills += 1;
        if (e.isBoss) g.selectTokens += 1;
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
        const elemMult =
          ELEMENT_ADVANTAGE[p.element] === target.element ? ELEMENT_BONUS : 1;
        const dmg = p.damage * elemMult;
        target.flinchUntil = now + 110;
        g.hitFx.push({
          x: tp.x,
          y: tp.y,
          color: ELEMENT_COLOR[p.element],
          createdAt: now,
        });
        if (target.isBoss) g.shakeUntil = now + 140;
        if (p.pattern === "aoe") {
          for (const e of g.enemies) {
            const ep = pointAtDistance(map.path, e.dist);
            const ddx = ep.x - tp.x;
            const ddy = ep.y - tp.y;
            if (Math.sqrt(ddx * ddx + ddy * ddy) <= AOE_RADIUS) {
              const em =
                ELEMENT_ADVANTAGE[p.element] === e.element ? ELEMENT_BONUS : 1;
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
      g.kills += 1;
      if (e.isBoss) g.selectTokens += 1;
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
    if (g.waveClearedAt !== null) {
      const elapsed = now - g.waveClearedAt;
      if (elapsed > WAVE_PREP_MS) {
        g.waveClearedAt = null;
        setHudPrepLeft(0);
        if (g.wave >= WAVE_COUNT) {
          finishGame(true);
          return;
        }
        g.wave += 1;
        g.waveElement =
          WAVE_ELEMENTS[Math.floor(Math.random() * WAVE_ELEMENTS.length)];
        g.spawnQueue = buildWaveSpawns(g.wave);
        g.waveActive = true;
        setHudWave(g.wave);
        setWaveElement(g.waveElement);
        setBossWarning(g.wave % BOSS_WAVE_INTERVAL === 0);
      } else {
        const secLeft = Math.ceil((WAVE_PREP_MS - elapsed) / 1000);
        setHudPrepLeft((prev) => (prev !== secLeft ? secLeft : prev));
      }
    }

    setHudLives((prev) => (prev !== g.lives ? g.lives : prev));
    setHudGold((prev) => (prev !== g.gold ? g.gold : prev));
    setHudKills((prev) => (prev !== g.kills ? g.kills : prev));
    setHudTokens((prev) => {
      if (g.selectTokens === prev) return prev;
      if (g.selectTokens > prev) {
        setTokenGainFlash(true);
        setTimeout(() => setTokenGainFlash(false), 1800);
      }
      return g.selectTokens;
    });
  };

  const draw = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gRef.current;
    const map = MAPS.find((m) => m.id === g.mapId) ?? MAPS[0];
    const theme = map.theme;

    ctx.save();
    if (now < g.shakeUntil) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }

    ctx.clearRect(-8, -8, CANVAS_W + 16, CANVAS_H + 16);

    // 타일 그리드 배경
    const TILE = 65;
    for (let ty = -TILE; ty < CANVAS_H + TILE; ty += TILE) {
      for (let tx = -TILE; tx < CANVAS_W + TILE; tx += TILE) {
        const alt = (Math.round(tx / TILE) + Math.round(ty / TILE)) % 2 === 0;
        ctx.fillStyle = alt ? theme.bg : theme.tileAlt;
        ctx.fillRect(tx, ty, TILE, TILE);
      }
    }

    // 블록(건설 패드 구역) 패널 — 참고 이미지처럼 통로 바닥과 구분되는 패널 바닥
    for (const b of map.blocks) {
      const half = b.size / 2;
      ctx.fillStyle = `${theme.pathBorder}22`;
      ctx.fillRect(b.x - half, b.y - half, b.size, b.size);
      ctx.strokeStyle = `${theme.pathBorder}77`;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - half, b.y - half, b.size, b.size);
    }

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
        ctx.fillStyle = `${theme.decoColor}${Math.round(30 + pulse * 50)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.5 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme.decoShape === "spark") {
        const pulse = 0.5 + 0.5 * Math.sin(now / 600 + d.x * 0.7);
        const s = 2 + pulse * 2.2;
        ctx.strokeStyle = `${theme.decoColor}${Math.round(25 + pulse * 60)
          .toString(16)
          .padStart(2, "0")}`;
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
      ctx.fillRect(
        pos.x - barW / 2,
        pos.y - r - 12,
        barW * Math.max(0, e.hp / e.maxHp),
        4,
      );
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

    ctx.restore();
  };

  const flashSlot = (idx: number) => {
    setMergeFlash(idx);
    setTimeout(() => setMergeFlash(null), 400);
  };

  const warnGold = () => {
    setGoldWarning(true);
    setTimeout(() => setGoldWarning(false), 1200);
  };

  const warnTokens = () => {
    setTokenWarning(true);
    setTimeout(() => setTokenWarning(false), 1200);
  };

  // 배치 모드: 빈 슬롯 클릭 시 100골드로 최하등급 중 랜덤 1종을 배치. 라운드가 오를수록 2~3티어로도 등장한다
  const placeRandomTower = (slotIndex: number) => {
    const g = gRef.current;
    if (g.slots[slotIndex] || towerPool.length === 0) return;
    if (g.gold < PLACE_COST) {
      warnGold();
      return;
    }
    const def = randomTowerByRarities(towerPool, [LOWEST_RARITY]);
    if (!def) return;
    g.gold -= PLACE_COST;
    g.slots[slotIndex] = instantiateTower(
      def,
      slotIndex,
      rollPlacementTier(g.wave),
    );
    flashSlot(slotIndex);
    setSlotsVersion((v) => v + 1);
  };

  // 선택배치 모드: 골드가 아니라 "토큰" 1개 소모 — 토큰은 보스를 잡을 때마다 1개씩 쌓인다.
  // 빈 슬롯을 클릭하면 상위등급 3종을 제안받아 하나를 골라 그 슬롯에 배치한다.
  const openSelectPlace = (slotIndex: number) => {
    const g = gRef.current;
    if (g.slots[slotIndex] || towerPool.length === 0) return;
    if (g.selectTokens < 1) {
      warnTokens();
      return;
    }
    const rarities = tokenPlaceRarities(g.wave);
    const choices = [0, 1, 2]
      .map(() => {
        const def = randomTowerByRarities(towerPool, rarities);
        return def ? { def, tier: rollPlacementTier(g.wave) } : null;
      })
      .filter((c): c is { def: TowerDef; tier: number } => c !== null);
    if (choices.length === 0) return;
    setSelectPlaceChoices(choices);
    setSelectPlaceTarget(slotIndex);
  };

  const confirmSelectPlace = (choice: { def: TowerDef; tier: number }) => {
    const g = gRef.current;
    if (selectPlaceTarget === null) return;
    if (g.selectTokens < 1) {
      setSelectPlaceTarget(null);
      setSelectPlaceChoices([]);
      return;
    }
    g.selectTokens -= 1;
    g.slots[selectPlaceTarget] = instantiateTower(
      choice.def,
      selectPlaceTarget,
      choice.tier,
    );
    flashSlot(selectPlaceTarget);
    setSelectPlaceTarget(null);
    setSelectPlaceChoices([]);
    setActionMode(null);
    setSlotsVersion((v) => v + 1);
  };

  const cancelSelectPlace = () => {
    setSelectPlaceTarget(null);
    setSelectPlaceChoices([]);
  };

  // 판매 모드: 채워진 슬롯 클릭 시 즉시 판매하고 환불
  const sellTowerAt = (slotIndex: number) => {
    const g = gRef.current;
    const tower = g.slots[slotIndex];
    if (!tower) return;
    g.gold +=
      TIER_SELL_GOLD[tower.tier] +
      tower.enhanceLevel * ENHANCE_SELL_REFUND_PER_LEVEL;
    g.slots[slotIndex] = null;
    setSlotsVersion((v) => v + 1);
  };

  // 강화 모드: 채워진 슬롯 클릭 시 골드를 소모해 그 자리에서 즉시 강화
  const enhanceTowerAt = (slotIndex: number) => {
    const g = gRef.current;
    const tower = g.slots[slotIndex];
    if (!tower || tower.enhanceLevel >= MAX_ENHANCE) return;
    const cost = enhanceCost(tower.enhanceLevel);
    if (g.gold < cost) {
      warnGold();
      return;
    }
    g.gold -= cost;
    tower.enhanceLevel += 1;
    setSlotsVersion((v) => v + 1);
  };

  // 합성 모드: 같은 캐릭터+같은 티어가 필드에 2개 이상이면 클릭한 쪽을 포함해 둘을 소모하고
  // 그 자리에 랜덤 캐릭터를 한 단계 위 티어로 배치한다 (합성 결과 캐릭터는 원래 캐릭터와 무관)
  const mergeTowerAt = (slotIndex: number) => {
    const g = gRef.current;
    const tower = g.slots[slotIndex];
    if (!tower || tower.tier >= MAX_TIER) return;
    const matches = g.slots
      .map((s, idx) => ({ s, idx }))
      .filter(
        (e) =>
          e.s &&
          e.s.characterId === tower.characterId &&
          e.s.tier === tower.tier,
      );
    if (matches.length < 2) return;
    const clicked = matches.find((m) => m.idx === slotIndex)!;
    const other = matches.find((m) => m.idx !== slotIndex)!;
    const carryEnhance = Math.max(
      clicked.s!.enhanceLevel,
      other.s!.enhanceLevel,
    );
    const resultDef = randomTowerByRarities(towerPool, [LOWEST_RARITY]);
    g.slots[other.idx] = null;
    if (resultDef) {
      g.slots[clicked.idx] = instantiateTower(
        resultDef,
        clicked.idx,
        tower.tier + 1,
      );
      g.slots[clicked.idx]!.enhanceLevel = carryEnhance;
    } else {
      g.slots[clicked.idx] = null;
    }
    flashSlot(clicked.idx);
    setSlotsVersion((v) => v + 1);
  };

  const handleSlotClick = (slotIndex: number) => {
    const tower = gRef.current.slots[slotIndex];
    if (actionMode === "place") {
      if (!tower) placeRandomTower(slotIndex);
    } else if (actionMode === "selectPlace") {
      if (!tower) openSelectPlace(slotIndex);
    } else if (actionMode === "sell") {
      if (tower) sellTowerAt(slotIndex);
    } else if (actionMode === "enhance") {
      if (tower) enhanceTowerAt(slotIndex);
    } else if (actionMode === "merge") {
      if (tower) mergeTowerAt(slotIndex);
    }
  };

  const toggleMode = (mode: ActionMode) => {
    setActionMode((prev) => (prev === mode ? null : mode));
  };

  const backToLobby = () => {
    setResult(null);
    setPhase("loading");
    loadSummary();
  };

  const archLabel = (arch: Archetype): string =>
    t(`td.arch_${arch}` as TranslationKey);
  const elemLabel = (elem: Element): string =>
    elem === "light" ? "" : t(`td.elem_${elem}` as TranslationKey);

  const counterArch = ELEMENT_TO_ARCH[COUNTERED_BY[waveElement] ?? "fire"];

  void slotsVersion;
  const mergeableSlots = findMergeableSlots(gRef.current.slots);
  const canMerge = mergeableSlots.size > 0;
  const hpPct = Math.round(
    (1 + hudWave * 0.05) * Math.pow(1.025, hudWave) * 100,
  );

  return (
    <div className="mx-auto max-w-[1360px] space-y-4">
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

      {phase === "loading" && (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("td.loading")}
        </p>
      )}

      {phase === "lobby" && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[#8a6bc4]/40 p-6 flex flex-col items-center gap-4"
          style={{
            background:
              "radial-gradient(ellipse 130% 90% at 50% -15%, #3a2f52 0%, #161226 55%, #0d0a17 100%)",
          }}
        >
          <style>{`@keyframes td-sparkle-twinkle { 0%,100%{opacity:0.15} 50%{opacity:0.9} }`}</style>
          {LOBBY_SPARKLES.map((s, i) => (
            <span
              key={i}
              className="pointer-events-none absolute rounded-full bg-[#c9a6f5]"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                animation: `td-sparkle-twinkle 2.4s ease-in-out infinite`,
                animationDelay: s.delay,
              }}
            />
          ))}

          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-[#c9a6f5]/25 blur-xl animate-pulse" />
            <Castle className="relative w-16 h-16 text-[#c9a6f5] drop-shadow-[0_0_14px_rgba(201,166,245,0.55)]" />
          </div>

          <div className="relative flex gap-3 w-full">
            <div className="flex-1 rounded-xl bg-black/25 border border-[#8a6bc4]/30 py-2 text-center">
              <p className="text-[10px] text-[#c9a6f5]/80">
                {t("td.best_wave")}
              </p>
              <p className="text-lg font-bold text-[#f1e8fc]">
                {bestWave}/{WAVE_COUNT}
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-black/25 border border-[#8a6bc4]/30 py-2 text-center">
              <p className="text-[10px] text-[#c9a6f5]/80">
                {t("td.attempts_left")}
              </p>
              <p className="text-lg font-bold text-[#f1e8fc]">{attemptsLeft}</p>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2 w-full">
            <div className="rounded-lg bg-black/20 border border-[#8a6bc4]/20 py-2 px-1 flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4 text-[#c9a6f5]" />
              <p className="text-[9px] text-[#c9a6f5]/80 text-center leading-tight">
                {t("td.hint_merge")}
              </p>
            </div>
            <div className="rounded-lg bg-black/20 border border-[#8a6bc4]/20 py-2 px-1 flex flex-col items-center gap-1">
              <Skull className="w-4 h-4 text-amber-400" />
              <p className="text-[9px] text-[#c9a6f5]/80 text-center leading-tight">
                {t("td.hint_boss")}
              </p>
            </div>
            <div className="rounded-lg bg-black/20 border border-[#8a6bc4]/20 py-2 px-1 flex flex-col items-center gap-1">
              <Coins className="w-4 h-4 text-amber-400" />
              <p className="text-[9px] text-[#c9a6f5]/80 text-center leading-tight">
                {t("td.hint_enhance")}
              </p>
            </div>
          </div>

          <button
            onClick={() => void handleStart()}
            disabled={attemptsLeft <= 0}
            className={`relative w-full rounded-2xl py-3 text-sm font-semibold transition ${
              attemptsLeft > 0
                ? "bg-gradient-to-r from-[#8a6bc4] to-[#c9a6f5] text-white hover:opacity-90 shadow-[0_0_18px_rgba(201,166,245,0.35)]"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
          >
            {attemptsLeft > 0 ? t("td.start") : t("td.no_attempts")}
          </button>
          <p className="relative text-[11px] text-[#c9a6f5]/70 text-center">
            {t("td.desc")}
          </p>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-2">
            <p className="text-sm font-semibold">
              {t("td.wave_label")} {hudWave}/{WAVE_COUNT}
            </p>
            <p className="flex items-center gap-1 text-sm font-semibold text-amber-400">
              <Coins className="w-4 h-4" /> {hudGold}
            </p>
            <p
              className={`flex items-center gap-1 text-sm font-semibold text-sky-400 transition ${
                tokenGainFlash ? "scale-125" : ""
              }`}
            >
              <Ticket className="w-4 h-4" /> {hudTokens}
            </p>
            <p className="flex items-center gap-1 text-sm font-semibold text-rose-400">
              <Heart className="w-4 h-4" /> {hudLives}
            </p>
            <button
              onClick={toggleSpeed}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                hudSpeed === 2
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <FastForward className="w-3.5 h-3.5" /> {hudSpeed}x
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: ELEMENT_COLOR[waveElement] }}
            />
            {t("td.wave_element_hint")
              .replace("{element}", elemLabel(waveElement))
              .replace(
                "{archetype}",
                counterArch ? archLabel(counterArch) : "",
              )}
          </p>

          {goldWarning && (
            <p className="text-center text-[11px] text-rose-400 font-semibold">
              {t("td.not_enough_gold")}
            </p>
          )}
          {tokenWarning && (
            <p className="text-center text-[11px] text-rose-400 font-semibold">
              {t("td.not_enough_tokens")}
            </p>
          )}

          {bossWarning && (
            <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-400">
              <Skull className="w-4 h-4" /> {t("td.boss_warning")}
            </p>
          )}

          <div className="overflow-x-auto">
            <div
              className="relative mx-auto"
              style={{ width: CANVAS_W, height: CANVAS_H }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="absolute inset-0 rounded-xl"
              />

              {/* 상태창 — 참고 이미지의 플레이어 목록 박스를 솔로 플레이용으로 단계/킬수/목숨/체력배율만 남겨 재구성 */}
              <div className="absolute top-2 right-2 rounded-lg border border-[#8a6bc4]/40 bg-black/70 px-3 py-2 text-[11px] space-y-1 min-w-[130px] pointer-events-none">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("td.status_stage")}
                  </span>
                  <span className="font-bold text-foreground">{hudWave}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("td.status_kills")}
                  </span>
                  <span className="font-bold text-foreground">{hudKills}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("td.status_lives")}
                  </span>
                  <span className="font-bold text-rose-400">{hudLives}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {t("td.status_hp_pct")}
                  </span>
                  <span className="font-bold text-amber-300">{hpPct}%</span>
                </div>
              </div>

              {/* 정비 시간 카운트다운 — 웨이브 클리어 후 5초 동안 표시 */}
              <div className="absolute bottom-2 left-2 rounded-lg border border-[#8a6bc4]/40 bg-black/70 px-3 py-1.5 text-[11px] font-semibold pointer-events-none">
                {hudPrepLeft > 0
                  ? t("td.prep_countdown").replace("{sec}", String(hudPrepLeft))
                  : `${t("td.status_stage")} ${hudWave}`}
              </div>
              {Array.from({ length: SLOT_COUNT }, (_, i) => {
                const pos = currentMap.slots[i];
                const tower = gRef.current.slots[i];
                void slotsVersion;
                const def = tower ? charById(tower.characterId) : null;
                const targetable =
                  actionMode === "place" || actionMode === "selectPlace"
                    ? !tower
                    : actionMode === "sell" || actionMode === "enhance"
                      ? !!tower
                      : actionMode === "merge"
                        ? mergeableSlots.has(i)
                        : false;
                return (
                  <button
                    key={i}
                    onClick={() => handleSlotClick(i)}
                    className={`absolute flex items-center justify-center rounded-full transition ${
                      mergeFlash === i ? "scale-125" : ""
                    } ${
                      def
                        ? `${RARITY_BORDER[def.rarity]} border-2 bg-card/70`
                        : "border-2 border-[#8a6bc4]/50 bg-black/25 hover:bg-white/10"
                    } ${
                      actionMode && targetable
                        ? `ring-2 ring-offset-1 ring-offset-background ${ACTION_MODE_RING[actionMode]} animate-pulse`
                        : ""
                    } ${actionMode && !targetable ? "opacity-35" : ""}`}
                    style={{
                      left: pos.x - 26,
                      top: pos.y - 26,
                      width: 52,
                      height: 52,
                    }}
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

          <div className="bg-card rounded-xl border border-border p-3 space-y-2">
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  {
                    mode: "place",
                    icon: Plus,
                    label: t("td.action_place"),
                    cost: PLACE_COST,
                    hotkey: "1",
                  },
                  {
                    mode: "selectPlace",
                    icon: Layers,
                    label: t("td.action_select_place"),
                    tokenCost: 1,
                    hotkey: "2",
                  },
                  {
                    mode: "enhance",
                    icon: Zap,
                    label: t("td.action_enhance"),
                    hotkey: "3",
                  },
                  {
                    mode: "sell",
                    icon: Banknote,
                    label: t("td.action_sell"),
                    hotkey: "4",
                  },
                  {
                    mode: "merge",
                    icon: GitMerge,
                    label: t("td.action_merge"),
                    disabled: !canMerge,
                    hotkey: "5",
                  },
                ] as {
                  mode: ActionMode;
                  icon: LucideIcon;
                  label: string;
                  cost?: number;
                  tokenCost?: number;
                  disabled?: boolean;
                  hotkey: string;
                }[]
              ).map((a) => {
                const Icon = a.icon;
                const active = actionMode === a.mode;
                return (
                  <button
                    key={a.mode}
                    onClick={() => toggleMode(a.mode)}
                    disabled={a.disabled}
                    className={`relative flex flex-col items-center gap-0.5 rounded-lg py-2 px-1 text-[10px] font-semibold transition ${
                      a.disabled
                        ? "bg-secondary text-muted-foreground opacity-50 cursor-not-allowed"
                        : active
                          ? "bg-primary text-white"
                          : "bg-secondary/60 text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] opacity-60">
                      {a.hotkey}
                    </span>
                    <Icon className="w-4 h-4" />
                    <span>{a.label}</span>
                    {a.cost !== undefined && (
                      <span className="text-[9px] text-amber-300">
                        {a.cost}G
                      </span>
                    )}
                    {a.tokenCost !== undefined && (
                      <span className="flex items-center gap-0.5 text-[9px] text-sky-300">
                        <Ticket className="w-2.5 h-2.5" />
                        {a.tokenCost}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {actionMode && (
              <p className="text-center text-[10px] text-muted-foreground">
                {t(`td.hint_mode_${actionMode}` as TranslationKey)}
              </p>
            )}
          </div>

          {selectPlaceTarget !== null && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
              onClick={cancelSelectPlace}
            >
              <div
                className="bg-card rounded-2xl border border-border p-4 w-full max-w-sm space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold text-center">
                  {t("td.select_place_title")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selectPlaceChoices.map((c, idx) => {
                    const def = charById(c.def.characterId);
                    if (!def) return null;
                    return (
                      <button
                        key={idx}
                        onClick={() => confirmSelectPlace(c)}
                        className={`relative rounded-xl border-2 ${RARITY_BORDER[def.rarity]} p-2 flex flex-col items-center gap-1`}
                      >
                        {c.tier > 1 && (
                          <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-amber-400 text-black rounded-full w-4 h-4 flex items-center justify-center">
                            {c.tier}
                          </span>
                        )}
                        <PixelCharacter characterId={def.id} size={48} />
                        <span
                          className={`text-[10px] font-semibold ${RARITY_COLOR[def.rarity]}`}
                        >
                          {getCharName(def, lang)}
                        </span>
                        <span
                          className={`text-[9px] ${RARITY_COLOR[def.rarity]}`}
                        >
                          {getRarityLabel(def.rarity, lang)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {archLabel(c.def.archetype)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={cancelSelectPlace}
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
            <p className="text-sm text-muted-foreground py-8">
              {t("td.submitting")}
            </p>
          ) : (
            result && (
              <>
                <p
                  className={`text-lg font-bold ${result.wavesCleared >= WAVE_COUNT ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {result.wavesCleared >= WAVE_COUNT
                    ? t("td.victory")
                    : t("td.defeat")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("td.wave_reached")} {result.wavesCleared}/{WAVE_COUNT}
                </p>
                {result.isNewRecord && (
                  <p className="text-xs font-semibold text-amber-400">
                    {t("td.new_record")}
                  </p>
                )}
                {result.kpEarned > 0 && (
                  <p className="text-sm font-bold text-primary">
                    +{result.kpEarned}KP
                  </p>
                )}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowRankings(false)}
        >
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
              <p className="text-xs text-muted-foreground text-center py-6">
                {t("td.loading")}
              </p>
            ) : rankings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {t("td.rankings_empty")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {rankings.map((r) => (
                  <li
                    key={r.userId}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        background: RANK_COLOR[r.rank]
                          ? `${RANK_COLOR[r.rank]}22`
                          : "var(--muted)",
                        color: RANK_COLOR[r.rank] ?? "var(--muted-foreground)",
                      }}
                    >
                      {r.rank}
                    </span>
                    <span className="flex-1 truncate font-medium">
                      {r.nickname}
                    </span>
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
