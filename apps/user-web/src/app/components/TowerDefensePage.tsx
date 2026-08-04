import { useEffect, useRef, useState } from "react";
import {
  Castle,
  FastForward,
  GitMerge,
  Heart,
  Shield,
  Skull,
  Sparkles,
  Swords,
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

// ═══════════════════════════════════════════════════════════════════════════
// 명일방주식 타워디펜스 — 클라이언트 전투 시뮬레이션 (서버는 최종 wavesCleared만 검증)
// 클래식 TD(경로 밖 고정 슬롯)에서 "타일 그리드 + 물리적 블로킹 + DP 실시간 배치 경제"로
// 전면 교체. 기존 7아키타입/원소 상성/등급 합성 체계는 그대로 재사용하고 역할만 재해석했다.
// ═══════════════════════════════════════════════════════════════════════════

type Archetype =
  | "warrior"
  | "rogue"
  | "mage"
  | "tank"
  | "nature"
  | "meka"
  | "cursed";
type Pattern = "single" | "aoe" | "dot";
type DmgType = "physical" | "magic" | "true";
type Element =
  | "fire"
  | "earth"
  | "ice"
  | "dark"
  | "nature"
  | "lightning"
  | "shadow"
  | "light";

// 아키타입 역할 재해석표 — 전사/도적/수호자는 경로 타일에 직접 서서 적을 막는 근접
// 블로커, 나머지 4종은 고지대 전용 원거리 딜러. blockCount는 동시에 막을 수 있는 적 수.
interface ArchetypeRole {
  isBlocker: boolean;
  blockCount: number;
  range: number;
  atkSpeedMs: number;
  damage: number;
  pattern: Pattern;
  dmgType: DmgType;
  hp: number;
  spPerAttack: number;
}
const ARCHETYPE_STATS: Record<Archetype, ArchetypeRole> = {
  warrior: { isBlocker: true, blockCount: 1, range: 70, atkSpeedMs: 500, damage: 15, pattern: "single", dmgType: "physical", hp: 150, spPerAttack: 22 },
  rogue: { isBlocker: true, blockCount: 1, range: 70, atkSpeedMs: 320, damage: 9, pattern: "single", dmgType: "physical", hp: 95, spPerAttack: 22 },
  tank: { isBlocker: true, blockCount: 2, range: 70, atkSpeedMs: 650, damage: 9, pattern: "single", dmgType: "physical", hp: 280, spPerAttack: 20 },
  mage: { isBlocker: false, blockCount: 0, range: 260, atkSpeedMs: 700, damage: 20, pattern: "aoe", dmgType: "magic", hp: 60, spPerAttack: 25 },
  meka: { isBlocker: false, blockCount: 0, range: 240, atkSpeedMs: 550, damage: 15, pattern: "aoe", dmgType: "magic", hp: 65, spPerAttack: 25 },
  nature: { isBlocker: false, blockCount: 0, range: 250, atkSpeedMs: 800, damage: 7, pattern: "dot", dmgType: "true", hp: 55, spPerAttack: 25 },
  cursed: { isBlocker: false, blockCount: 0, range: 250, atkSpeedMs: 800, damage: 7, pattern: "dot", dmgType: "true", hp: 55, spPerAttack: 25 },
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

// ─── 에셋(CC0) 로딩 — 몬스터 슬라임 스프라이트/공격 이펙트/바닥 타일 ───
function loadTdImage(path: string): HTMLImageElement {
  const img = new Image();
  img.src = `/td/${path}`;
  return img;
}
const ELEMENTS: Element[] = ["fire", "earth", "ice", "dark", "nature", "lightning", "shadow", "light"];
const MONSTER_WALK_IMG = Object.fromEntries(
  ELEMENTS.map((e) => [e, loadTdImage(`monsters/slime_${e}_walk.png`)]),
) as Record<Element, HTMLImageElement>;
const MONSTER_HURT_IMG = Object.fromEntries(
  ELEMENTS.map((e) => [e, loadTdImage(`monsters/slime_${e}_hurt.png`)]),
) as Record<Element, HTMLImageElement>;
const EFFECT_ORB_IMG = Object.fromEntries(
  ELEMENTS.map((e) => [e, loadTdImage(`effects/orb_${e}.png`)]),
) as Record<Element, HTMLImageElement>;
const EFFECT_BURST_IMG = Object.fromEntries(
  ELEMENTS.map((e) => [e, loadTdImage(`effects/burst_${e}.png`)]),
) as Record<Element, HTMLImageElement>;
const FLOOR_BG_IMG = loadTdImage("tiles/floor_bg.png");
const FLOOR_ALT_IMG = loadTdImage("tiles/floor_alt.png");

const MONSTER_WALK_FRAME_W = 35;
const MONSTER_WALK_FRAME_H = 32;
const MONSTER_HURT_FRAME_W = 31;
const MONSTER_HURT_FRAME_H = 28;
const MONSTER_WALK_COLS = 8;
const MONSTER_ANIM_MS = 110;

function hpBarColor(pct: number): string {
  if (pct > 0.5) return "#4ade80";
  if (pct > 0.25) return "#facc15";
  return "#f87171";
}

function drawIfLoaded(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
}

const RARITY_POWER_MULT: Record<string, number> = {
  common: 1,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.2,
  legendary: 2.8,
  mythic: 3.6,
};

// ─── 등급(rarity) 사다리 — 합성은 "같은 등급 2개 → 다음 등급 1개(랜덤 캐릭터)" ───
const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
function nextRarity(rarity: string): string | null {
  const idx = RARITY_ORDER.indexOf(rarity as (typeof RARITY_ORDER)[number]);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
  return RARITY_ORDER[idx + 1];
}

// ─── DP(배치 포인트) 경제 — 골드/강화/판매를 전부 대체. 실시간으로 차오르는 자원 하나로
// "언제 누구를 배치할지" 판단이 계속 필요하게 만든다 ───
const DP_MAX = 30;
const DP_START = 10;
const DP_REGEN_PER_SEC = 1;
const RARITY_DP_COST: Record<string, number> = {
  common: 6,
  uncommon: 8,
  rare: 10,
  epic: 13,
  legendary: 17,
  mythic: 22,
};
const RETREAT_REFUND_RATIO = 0.6; // 죽기 전에 철수하면 DP 비용의 60% 환급
const RETREAT_COOLDOWN_MS = 5000; // 철수한 타일 재배치 쿨다운
const DEATH_COOLDOWN_MS = 15000; // 전사한 타일 재배치 쿨다운 (환급 없음)
const BOSS_DP_BONUS = 8; // 보스 처치 시 즉시 DP 보너스 (기존 "토큰" 시스템을 대체)

// ─── SP 게이지 + 수동 스킬 — 공격할 때마다 충전되고(offensive recovery), 꽉 차면
// 클릭으로 즉시 발동. 정예화/스킬 마스터리 같은 런 밖 성장은 이번 범위에서 제외 ───
const SP_MAX = 100;

const WAVE_COUNT = 100;
const BOSS_WAVE_INTERVAL = 10;
const BASE_LIVES = 20;
const SPAWN_INTERVAL_MS = 500;
const AOE_RADIUS = 130;
const PROJECTILE_SPEED = 620;
const PROJECTILE_HIT_R = 14;
const WAVE_PREP_MS = 5000;

const CANVAS_W = 1300;
const CANVAS_H = 720;

// ─── 타일 그리드 — 경로(path, 근접 블로커 배치 가능) + 고지대(highground, 원거리 전용) ───
type TileType = "path" | "highground" | "empty";
interface TileCoord {
  col: number;
  row: number;
}
const GRID_COLS = 11;
const GRID_ROWS = 6;
const TILE = 100;
const GRID_OFFSET_X = (CANVAS_W - GRID_COLS * TILE) / 2;
const GRID_OFFSET_Y = (CANVAS_H - GRID_ROWS * TILE) / 2;

function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: GRID_OFFSET_X + col * TILE + TILE / 2,
    y: GRID_OFFSET_Y + row * TILE + TILE / 2,
  };
}

// 입구(왼쪽)에서 출구(오른쪽)까지 지그재그로 지나가는 고정 경로
const PATH_TILES: TileCoord[] = [
  { col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 1 }, { col: 4, row: 1 }, { col: 5, row: 1 },
  { col: 5, row: 2 }, { col: 5, row: 3 }, { col: 5, row: 4 },
  { col: 6, row: 4 }, { col: 7, row: 4 }, { col: 8, row: 4 }, { col: 9, row: 4 },
  { col: 9, row: 3 }, { col: 9, row: 2 }, { col: 9, row: 1 },
  { col: 10, row: 1 },
];

// 경로 타일에 인접한 칸을 자동으로 "고지대"로 지정 — 맵을 손으로 한 칸씩 안 그려도 됨
function buildTileGrid(): Map<string, TileType> {
  const grid = new Map<string, TileType>();
  const pathSet = new Set(PATH_TILES.map((p) => tileKey(p.col, p.row)));
  for (const k of pathSet) grid.set(k, "path");
  for (const p of PATH_TILES) {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = p.col + dc;
      const nr = p.row + dr;
      if (nc < 0 || nc >= GRID_COLS || nr < 0 || nr >= GRID_ROWS) continue;
      const nk = tileKey(nc, nr);
      if (!pathSet.has(nk) && grid.get(nk) !== "path") grid.set(nk, "highground");
    }
  }
  return grid;
}
const TILE_GRID = buildTileGrid();

interface TowerDef {
  characterId: number;
  archetype: Archetype;
  rarity: string;
}
interface Operator extends TowerDef {
  tileKey: string;
  hp: number;
  maxHp: number;
  lastAttackAt: number;
  sp: number;
  blockedEnemyIds: number[];
  shieldUntil: number; // 수호자 스킬(피해 감소) 등 임시 버프 만료 시각
  hitFlashUntil: number; // 피격 시 DOM 테두리 플래시 만료 시각
  deployedAt: number; // 배치 등장 애니메이션용
}
interface Enemy {
  id: number;
  pathIdx: number; // 현재 위치한 PATH_TILES 인덱스
  moveT: number; // 다음 타일로의 진행률(0~1), 블로킹되면 0에서 멈춤
  blockedByTileKey: string | null;
  hp: number;
  maxHp: number;
  speed: number; // px/sec
  atk: number;
  atkIntervalMs: number;
  lastAttackAt: number;
  def: number;
  res: number;
  isBoss: boolean;
  element: Element;
  dotUntil: number;
  dotDmgPerTick: number;
  flinchUntil: number;
  slowUntil: number;
}
interface HitFx {
  x: number;
  y: number;
  color: string;
  element: Element;
  createdAt: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  createdAt: number;
}
interface DamageText {
  x: number;
  y: number;
  value: number;
  color: string;
  weak: boolean;
  trueDmg: boolean;
  createdAt: number;
}
interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  pattern: Pattern;
  dmgType: DmgType;
  element: Element;
}

interface GameState {
  wave: number;
  wavesCompleted: number;
  waveElement: Element;
  lives: number;
  dp: number;
  dpAccum: number; // 초당 회복량 누적용 (정수 DP만 실제로 씀)
  kills: number;
  operators: Map<string, Operator>; // key: tileKey
  tileCooldowns: Map<string, number>; // key: tileKey, value: 재배치 가능 시각
  enemies: Enemy[];
  projectiles: Projectile[];
  hitFx: HitFx[];
  sparks: Spark[];
  dmgTexts: DamageText[];
  shakeUntil: number;
  nextEnemyId: number;
  nextProjectileId: number;
  spawnQueue: { hp: number; speed: number; atk: number; def: number; res: number; isBoss: boolean }[];
  spawnTimer: number;
  waveActive: boolean;
  waveClearedAt: number | null;
  gameOver: boolean;
  won: boolean;
}

function freshGameState(): GameState {
  return {
    wave: 0,
    wavesCompleted: 0,
    waveElement: "fire",
    lives: BASE_LIVES,
    dp: DP_START,
    dpAccum: 0,
    kills: 0,
    operators: new Map(),
    tileCooldowns: new Map(),
    enemies: [],
    projectiles: [],
    hitFx: [],
    sparks: [],
    dmgTexts: [],
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

// 100라운드까지 버텨야 하므로 초반은 완만하다가 후반으로 갈수록 급격히 세지는 곡선.
// def/res는 방어형이 아닌 딜러를 계속 쓰면 후반에 데미지가 안 박히도록 만드는 축 —
// 물리(def, 고정 경감)와 마법(res, %경감)을 둘 다 올려서 한 속성만 파면 손해 보게 한다.
function buildWaveSpawns(
  wave: number,
): { hp: number; speed: number; atk: number; def: number; res: number; isBoss: boolean }[] {
  const count = 5 + Math.min(wave, 30);
  const hp = 18 * (1 + wave * 0.05) * Math.pow(1.025, wave);
  const speed = (32 + wave * 1.5) * 2.2;
  const atk = 4 + wave * 0.4;
  const def = 2 + wave * 0.3;
  const res = Math.min(0.45, 0.05 + wave * 0.0035);
  const spawns = Array.from({ length: count }, () => ({ hp, speed, atk, def, res, isBoss: false }));
  if (wave % BOSS_WAVE_INTERVAL === 0) {
    spawns.push({ hp: hp * 8, speed: speed * 0.7, atk: atk * 2, def: def * 1.5, res: Math.min(0.6, res + 0.1), isBoss: true });
  }
  return spawns;
}

function randomTowerByRarities(pool: TowerDef[], rarities: string[]): TowerDef | null {
  const candidates = pool.filter((t) => rarities.includes(t.rarity));
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function instantiateOperator(def: TowerDef, tileKey: string): Operator {
  const hp = ARCHETYPE_STATS[def.archetype].hp * RARITY_POWER_MULT[def.rarity];
  return {
    ...def,
    tileKey,
    hp,
    maxHp: hp,
    lastAttackAt: 0,
    sp: 0,
    blockedEnemyIds: [],
    shieldUntil: 0,
    hitFlashUntil: 0,
    deployedAt: performance.now(),
  };
}

// 필드에서 "같은 등급"이 2개 이상 배치돼 있으면 합성 가능 (캐릭터 종류는 무관)
function findMergeableTiles(operators: Map<string, Operator>): Set<string> {
  const groups = new Map<string, string[]>();
  for (const [key, op] of operators) {
    if (!nextRarity(op.rarity)) continue;
    const arr = groups.get(op.rarity) ?? [];
    arr.push(key);
    groups.set(op.rarity, arr);
  }
  const result = new Set<string>();
  for (const arr of groups.values()) {
    if (arr.length >= 2) arr.forEach((k) => result.add(k));
  }
  return result;
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

type ActionMode = "deploy" | "retreat" | "merge";
// 모드별 액센트 — 타일 위 타겟팅 표시(은은한 인셋 링+글로우)와 하단 액션 버튼(활성 시 그라데이션)에 공용으로 사용
const ACTION_MODE_TARGET: Record<ActionMode, string> = {
  deploy: "ring-1 ring-inset ring-emerald-400/80 shadow-[0_0_14px_-3px_rgba(52,211,153,0.8)]",
  retreat: "ring-1 ring-inset ring-rose-400/80 shadow-[0_0_14px_-3px_rgba(251,113,133,0.8)]",
  merge: "ring-1 ring-inset ring-fuchsia-400/80 shadow-[0_0_14px_-3px_rgba(232,121,249,0.8)]",
};
const ACTION_MODE_BUTTON_ACTIVE: Record<ActionMode, string> = {
  deploy: "bg-gradient-to-b from-emerald-500 to-emerald-600 border-emerald-300/40 shadow-[0_0_16px_-4px_rgba(16,185,129,0.7)]",
  retreat: "bg-gradient-to-b from-rose-500 to-rose-600 border-rose-300/40 shadow-[0_0_16px_-4px_rgba(244,63,94,0.7)]",
  merge: "bg-gradient-to-b from-fuchsia-500 to-fuchsia-600 border-fuchsia-300/40 shadow-[0_0_16px_-4px_rgba(217,70,239,0.7)]",
};

const LOBBY_SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  delay: `${(i % 8) * 0.35}s`,
  size: 2 + (i % 3),
}));

export default function TowerDefensePage() {
  const { t, lang } = useLang();
  const { refreshRewards } = useAppData();

  const [phase, setPhase] = useState<"loading" | "lobby" | "playing" | "result">("loading");
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [bestWave, setBestWave] = useState(0);
  const [towerPool, setTowerPool] = useState<TowerDef[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showRankings, setShowRankings] = useState(false);
  const [rankings, setRankings] = useState<RankingEntry[] | null>(null);

  const [hudWave, setHudWave] = useState(1);
  const [hudLives, setHudLives] = useState(BASE_LIVES);
  const [hudDp, setHudDp] = useState(DP_START);
  const [hudKills, setHudKills] = useState(0);
  const [hudEnemiesLeft, setHudEnemiesLeft] = useState(0);
  const [hudPrepLeft, setHudPrepLeft] = useState(0);
  const [hudSpeed, setHudSpeed] = useState(1);
  const [dpGainFlash, setDpGainFlash] = useState(false);
  const [bossWarning, setBossWarning] = useState(false);
  const [waveElement, setWaveElement] = useState<Element>("fire");
  const [dpWarning, setDpWarning] = useState(false);
  const [opsVersion, setOpsVersion] = useState(0);
  const [actionFlash, setActionFlash] = useState<string | null>(null);

  const [actionMode, setActionMode] = useState<ActionMode | null>(null);
  const [deployTarget, setDeployTarget] = useState<string | null>(null);
  const [deployChoices, setDeployChoices] = useState<TowerDef[]>([]);

  const [result, setResult] = useState<{ wavesCleared: number; isNewRecord: boolean; kpEarned: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const gRef = useRef<GameState>(freshGameState());
  const speedMultiplierRef = useRef(1);

  // 모바일 대응 — 보드는 내부적으로 항상 CANVAS_W x CANVAS_H 해상도로 그리고,
  // 화면 폭에 맞춰 CSS transform으로만 축소한다.
  const BOARD_MIN_SCALE = 0.5;
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const [boardScale, setBoardScale] = useState(1);
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const update = () => {
      const scale = Math.max(BOARD_MIN_SCALE, Math.min(1, el.clientWidth / CANVAS_W));
      setBoardScale(scale);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const charById = (id: number) => CHARACTERS.find((c) => c.id === id);

  const loadSummary = () => {
    api
      .get<{ attemptsLeft: number; bestWave: number; towerPool: TowerDef[]; waveCount: number }>(
        "/tower-defense/summary",
      )
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

  // 하단 액션 패널 단축키 — 1~3으로 모드 전환, Esc로 취소
  useEffect(() => {
    if (phase !== "playing") return;
    const handler = (e: KeyboardEvent) => {
      const modeByKey: Record<string, ActionMode> = { "1": "deploy", "2": "retreat", "3": "merge" };
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
      api.get<RankingEntry[]>("/tower-defense/rankings").then(setRankings).catch(() => setRankings([]));
    }
  };

  const handleStart = async () => {
    setError(null);
    try {
      await api.post<{ ok: boolean; attemptsLeft: number }>("/tower-defense/start");
      gRef.current = freshGameState();
      gRef.current.wave = 1;
      gRef.current.waveElement = WAVE_ELEMENTS[Math.floor(Math.random() * WAVE_ELEMENTS.length)];
      gRef.current.spawnQueue = buildWaveSpawns(1);
      gRef.current.waveActive = true;
      setHudWave(1);
      setHudLives(BASE_LIVES);
      setHudDp(DP_START);
      setHudKills(0);
      setHudPrepLeft(0);
      speedMultiplierRef.current = 1;
      setHudSpeed(1);
      setBossWarning(false);
      setWaveElement(gRef.current.waveElement);
      setOpsVersion((v) => v + 1);
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
        if (res.isNewRecord) setRankings(null);
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

  // 물리(def, 고정 경감) / 마법(res, %경감) / 고정피해(true, 무시) — 아키타입별 dmgType에 따라
  // 적의 방어 스탯을 다르게 적용한다. 한 속성만 밀어붙이면 후반에 안 통하게 만드는 축.
  const applyMitigation = (raw: number, dmgType: DmgType, enemy: Enemy): number => {
    if (dmgType === "physical") return Math.max(1, raw - enemy.def);
    if (dmgType === "magic") return raw * (1 - enemy.res);
    return raw; // true
  };

  // 타격 피드백 — 데미지 숫자 팝업 + 스파크 파티클을 한 번에 생성 (오퍼레이터 공격/스킬/역공 공용)
  const spawnHitFeedback = (
    g: GameState,
    x: number,
    y: number,
    value: number,
    color: string,
    now: number,
    opts?: { weak?: boolean; trueDmg?: boolean },
  ) => {
    g.dmgTexts.push({ x, y, value: Math.round(value), color, weak: !!opts?.weak, trueDmg: !!opts?.trueDmg, createdAt: now });
    const count = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      g.sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, createdAt: now });
    }
  };

  const tick = (dt: number, now: number) => {
    const g = gRef.current;
    if (g.gameOver) return;

    // DP 실시간 회복
    g.dpAccum += (DP_REGEN_PER_SEC * dt) / 1000;
    while (g.dpAccum >= 1 && g.dp < DP_MAX) {
      g.dp += 1;
      g.dpAccum -= 1;
    }
    if (g.dp > DP_MAX) g.dp = DP_MAX;

    // 웨이브 스폰
    if (g.spawnQueue.length > 0) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        const spec = g.spawnQueue.shift()!;
        g.enemies.push({
          id: g.nextEnemyId++,
          pathIdx: 0,
          moveT: 0,
          blockedByTileKey: null,
          hp: spec.hp,
          maxHp: spec.hp,
          speed: spec.speed,
          atk: spec.atk,
          atkIntervalMs: 700,
          lastAttackAt: 0,
          def: spec.def,
          res: spec.res,
          isBoss: spec.isBoss,
          element: g.waveElement,
          dotUntil: 0,
          dotDmgPerTick: 0,
          flinchUntil: 0,
          slowUntil: 0,
        });
        g.spawnTimer = SPAWN_INTERVAL_MS;
      }
    }

    // ─── 적 이동 + 블로킹 판정 ───
    for (const e of g.enemies) {
      if (e.dotUntil > now) e.hp -= (e.dotDmgPerTick * dt) / 1000;
      if (e.hp <= 0) continue;

      if (e.blockedByTileKey) {
        // 블로킹된 적은 이동하지 않고 자기 공격 주기에 맞춰 블로커를 공격
        const blocker = g.operators.get(e.blockedByTileKey);
        if (!blocker) {
          e.blockedByTileKey = null; // 블로커가 사라졌으면(전사/철수) 풀어줌
        } else if (now - e.lastAttackAt >= e.atkIntervalMs) {
          e.lastAttackAt = now;
          const shielded = now < blocker.shieldUntil;
          const dmgToBlocker = shielded ? e.atk * 0.4 : e.atk; // 수호자 스킬 방어막 중엔 40%만
          blocker.hp -= dmgToBlocker;
          blocker.hitFlashUntil = now + 160;
          const bp = tileCenter(...(e.blockedByTileKey.split(",").map(Number) as [number, number]));
          spawnHitFeedback(g, bp.x, bp.y - 20, dmgToBlocker, shielded ? "#60a5fa" : "#f87171", now);
        }
        continue;
      }

      const speedMult = now < e.slowUntil ? 0.5 : 1;
      const tileTimeMs = (TILE / (e.speed * speedMult)) * 1000;
      e.moveT += dt / tileTimeMs;
      if (e.moveT >= 1) {
        e.moveT = 0;
        e.pathIdx += 1;
        if (e.pathIdx >= PATH_TILES.length - 1) {
          e.pathIdx = PATH_TILES.length - 1;
          g.lives -= e.isBoss ? 3 : 1;
          e.hp = 0; // 도달한 적은 제거 대상으로 표시
          continue;
        }
        const nextTile = PATH_TILES[e.pathIdx];
        const nextKey = tileKey(nextTile.col, nextTile.row);
        const blocker = g.operators.get(nextKey);
        if (blocker && blocker.blockedEnemyIds.length < ARCHETYPE_STATS[blocker.archetype].blockCount) {
          blocker.blockedEnemyIds.push(e.id);
          e.blockedByTileKey = nextKey;
        }
      }
    }
    g.enemies = g.enemies.filter((e) => {
      if (e.hp > 0) return true;
      if (e.pathIdx >= PATH_TILES.length - 1 && e.moveT === 0 && e.blockedByTileKey === null) {
        // 이미 위에서 lives 처리된 도달 케이스는 그대로 제거
      } else {
        g.dp = Math.min(DP_MAX, g.dp + (e.isBoss ? BOSS_DP_BONUS : 0));
        g.kills += 1;
      }
      for (const op of g.operators.values()) {
        op.blockedEnemyIds = op.blockedEnemyIds.filter((id) => id !== e.id);
      }
      return false;
    });

    // ─── 오퍼레이터 공격 (근접 블로커는 자기가 막은 적만, 원거리는 사거리 내 최근접) ───
    for (const [key, op] of g.operators) {
      if (op.hp <= 0) continue;
      const stats = ARCHETYPE_STATS[op.archetype];
      if (now - op.lastAttackAt < stats.atkSpeedMs) continue;
      const pos = tileCenter(...(key.split(",").map(Number) as [number, number]));

      let target: Enemy | null = null;
      if (stats.isBlocker) {
        target = g.enemies.find((e) => op.blockedEnemyIds.includes(e.id)) ?? null;
      } else {
        let nearestDist = Infinity;
        for (const e of g.enemies) {
          const ep = enemyPos(e);
          const dist = Math.hypot(ep.x - pos.x, ep.y - pos.y);
          if (dist <= stats.range && dist < nearestDist) {
            target = e;
            nearestDist = dist;
          }
        }
      }
      if (!target) continue;
      op.lastAttackAt = now;
      op.sp = Math.min(SP_MAX, op.sp + stats.spPerAttack);
      const dmg = stats.damage * RARITY_POWER_MULT[op.rarity];
      g.projectiles.push({
        id: g.nextProjectileId++,
        x: pos.x,
        y: pos.y,
        targetId: target.id,
        damage: dmg,
        pattern: stats.pattern,
        dmgType: stats.dmgType,
        element: ARCH_ELEMENT[op.archetype],
      });
    }

    // 오퍼레이터 전사 처리
    for (const [key, op] of g.operators) {
      if (op.hp <= 0) {
        for (const eid of op.blockedEnemyIds) {
          const e = g.enemies.find((en) => en.id === eid);
          if (e) e.blockedByTileKey = null;
        }
        g.operators.delete(key);
        g.tileCooldowns.set(key, now + DEATH_COOLDOWN_MS);
        setOpsVersion((v) => v + 1);
      }
    }

    // 투사체 이동 + 충돌
    g.projectiles = g.projectiles.filter((p) => {
      const target = g.enemies.find((e) => e.id === p.targetId);
      if (!target) return false;
      const tp = enemyPos(target);
      const dx = tp.x - p.x;
      const dy = tp.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= PROJECTILE_HIT_R) {
        const weak = ELEMENT_ADVANTAGE[p.element] === target.element;
        const elemMult = weak ? ELEMENT_BONUS : 1;
        const dmg = applyMitigation(p.damage * elemMult, p.dmgType, target);
        target.flinchUntil = now + 110;
        g.hitFx.push({ x: tp.x, y: tp.y, color: ELEMENT_COLOR[p.element], element: p.element, createdAt: now });
        if (target.isBoss) g.shakeUntil = now + 140;
        if (p.pattern === "aoe") {
          for (const e of g.enemies) {
            const ep = enemyPos(e);
            if (Math.hypot(ep.x - tp.x, ep.y - tp.y) <= AOE_RADIUS) {
              const em = ELEMENT_ADVANTAGE[p.element] === e.element ? ELEMENT_BONUS : 1;
              const aoeDmg = applyMitigation(p.damage * em, p.dmgType, e);
              e.hp -= aoeDmg;
              e.flinchUntil = now + 110;
              spawnHitFeedback(g, ep.x, ep.y - 16, aoeDmg, ELEMENT_COLOR[p.element], now, { weak: em > 1, trueDmg: p.dmgType === "true" });
            }
          }
        } else if (p.pattern === "dot") {
          const tick0 = dmg * 0.4;
          target.hp -= tick0;
          target.dotUntil = now + 2500;
          target.dotDmgPerTick = dmg * 0.3;
          spawnHitFeedback(g, tp.x, tp.y - 16, tick0, ELEMENT_COLOR[p.element], now, { weak, trueDmg: true });
        } else {
          target.hp -= dmg;
          spawnHitFeedback(g, tp.x, tp.y - 16, dmg, ELEMENT_COLOR[p.element], now, { weak, trueDmg: p.dmgType === "true" });
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
      g.dp = Math.min(DP_MAX, g.dp + (e.isBoss ? BOSS_DP_BONUS : 0));
      g.kills += 1;
      for (const op of g.operators.values()) {
        op.blockedEnemyIds = op.blockedEnemyIds.filter((id) => id !== e.id);
      }
      const dp = enemyPos(e);
      const burst = e.isBoss ? 18 : 8;
      for (let i = 0; i < burst; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 160;
        g.sparks.push({ x: dp.x, y: dp.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: ELEMENT_COLOR[e.element], createdAt: now });
      }
      return false;
    });
    g.hitFx = g.hitFx.filter((fx) => now - fx.createdAt < 260);
    for (const s of g.sparks) {
      s.x += (s.vx * dt) / 1000;
      s.y += (s.vy * dt) / 1000;
      s.vx *= 0.92;
      s.vy *= 0.92;
    }
    g.sparks = g.sparks.filter((s) => now - s.createdAt < 420);
    g.dmgTexts = g.dmgTexts.filter((d) => now - d.createdAt < 700);

    if (g.lives <= 0) {
      finishGame(false);
      return;
    }

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
        g.waveElement = WAVE_ELEMENTS[Math.floor(Math.random() * WAVE_ELEMENTS.length)];
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
    setHudKills((prev) => (prev !== g.kills ? g.kills : prev));
    const enemiesLeft = g.spawnQueue.length + g.enemies.length;
    setHudEnemiesLeft((prev) => (prev !== enemiesLeft ? enemiesLeft : prev));
    setHudDp((prev) => {
      const cur = Math.floor(g.dp);
      if (cur === prev) return prev;
      if (cur > prev) {
        setDpGainFlash(true);
        setTimeout(() => setDpGainFlash(false), 500);
      }
      return cur;
    });
  };

  // 적의 현재 픽셀 위치 — 블로킹 중이면 블로커가 서있는 타일 중심에 고정, 아니면 두 타일 사이 보간
  function enemyPos(e: Enemy): { x: number; y: number } {
    const cur = PATH_TILES[e.pathIdx];
    if (e.blockedByTileKey || e.pathIdx >= PATH_TILES.length - 1) {
      return tileCenter(cur.col, cur.row);
    }
    const nxt = PATH_TILES[e.pathIdx + 1];
    const a = tileCenter(cur.col, cur.row);
    const b = tileCenter(nxt.col, nxt.row);
    return { x: a.x + (b.x - a.x) * e.moveT, y: a.y + (b.y - a.y) * e.moveT };
  }

  const draw = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gRef.current;

    ctx.save();
    if (now < g.shakeUntil) {
      ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
    }
    ctx.clearRect(-8, -8, CANVAS_W + 16, CANVAS_H + 16);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0d0a17";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 배틀필드 바깥 은은한 보라 글로우 프레임 — 여러 겹 stroke로 발광 효과를 흉내낸다
    const gridW = GRID_COLS * TILE;
    const gridH = GRID_ROWS * TILE;
    for (let i = 4; i >= 0; i--) {
      ctx.strokeStyle = `rgba(201, 166, 245, ${0.05 + i * 0.02})`;
      ctx.lineWidth = 2 + i * 2.5;
      ctx.strokeRect(GRID_OFFSET_X - 6, GRID_OFFSET_Y - 6, gridW + 12, gridH + 12);
    }

    // 그리드 타일 — path는 바닥 텍스처 체크무늬 + 흐름 화살표, highground는 같은 텍스처 위에
    // 채도 높은 하이라이트+명암을 얹어 "한 단 높은 지형"처럼 보이게 한다. empty는 배경만.
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const type = TILE_GRID.get(tileKey(col, row));
        if (!type) continue;
        const x = GRID_OFFSET_X + col * TILE;
        const y = GRID_OFFSET_Y + row * TILE;
        const alt = (col + row) % 2 === 0;
        drawIfLoaded(ctx, alt ? FLOOR_BG_IMG : FLOOR_ALT_IMG, x, y, TILE, TILE);
        if (type === "highground") {
          const grad = ctx.createLinearGradient(x, y, x, y + TILE);
          grad.addColorStop(0, "rgba(201, 166, 245, 0.22)");
          grad.addColorStop(1, "rgba(30, 20, 50, 0.22)");
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + TILE - 2);
          ctx.lineTo(x + 2, y + 2);
          ctx.lineTo(x + TILE - 2, y + 2);
          ctx.stroke();
          ctx.strokeStyle = "rgba(0,0,0,0.28)";
          ctx.beginPath();
          ctx.moveTo(x + TILE - 2, y + 2);
          ctx.lineTo(x + TILE - 2, y + TILE - 2);
          ctx.lineTo(x + 2, y + TILE - 2);
          ctx.stroke();
        }
        ctx.strokeStyle = type === "path" ? "#8a6bc477" : "#8a6bc433";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, y + 0.75, TILE - 1.5, TILE - 1.5);
      }
    }

    // 경로 진행 방향 화살표 — 적이 어느 쪽으로 흐르는지 은은하게 안내
    ctx.save();
    const arrowPulse = 0.35 + 0.25 * Math.sin(now / 500);
    ctx.fillStyle = `rgba(255, 255, 255, ${arrowPulse})`;
    for (let i = 0; i < PATH_TILES.length - 1; i++) {
      const a = tileCenter(PATH_TILES[i].col, PATH_TILES[i].row);
      const b = tileCenter(PATH_TILES[i + 1].col, PATH_TILES[i + 1].row);
      if (g.operators.has(tileKey(PATH_TILES[i].col, PATH_TILES[i].row))) continue;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // 재배치 쿨다운 오버레이
    for (const [key, readyAt] of g.tileCooldowns) {
      if (readyAt <= now) continue;
      const [col, row] = key.split(",").map(Number);
      const x = GRID_OFFSET_X + col * TILE;
      const y = GRID_OFFSET_Y + row * TILE;
      ctx.fillStyle = "#00000088";
      ctx.fillRect(x, y, TILE, TILE);
    }

    // 오퍼레이터
    for (const [key, op] of g.operators) {
      const [col, row] = key.split(",").map(Number);
      const pos = tileCenter(col, row);
      const def = charById(op.characterId);
      if (def) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        // PixelCharacter는 React 컴포넌트라 캔버스엔 자리 표시만 — 실제 아이콘은 DOM 오버레이로 그림
        ctx.restore();
      }
      if (now < op.hitFlashUntil) {
        const t = 1 - (now - (op.hitFlashUntil - 160)) / 160;
        ctx.strokeStyle = `rgba(255, 90, 90, ${Math.max(0, t) * 0.9})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30 + (1 - t) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      const barW = 46;
      ctx.fillStyle = "#00000066";
      ctx.fillRect(pos.x - barW / 2, pos.y - 42, barW, 5);
      ctx.fillStyle = now < op.shieldUntil ? "#60a5fa" : hpBarColor(op.hp / op.maxHp);
      ctx.fillRect(pos.x - barW / 2, pos.y - 42, barW * Math.max(0, op.hp / op.maxHp), 5);
      if (op.sp >= SP_MAX) {
        const pulse = 0.6 + 0.4 * Math.sin(now / 150);
        ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
        ctx.beginPath();
        ctx.arc(pos.x + 24, pos.y - 24, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (op.sp > 0) {
        ctx.strokeStyle = "#facc1599";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x + 24, pos.y - 24, 6, -Math.PI / 2, -Math.PI / 2 + (op.sp / SP_MAX) * Math.PI * 2);
        ctx.stroke();
      }
    }

    // 적
    for (const e of g.enemies) {
      const pos = enemyPos(e);
      const r = e.isBoss ? 19 : 11;
      const flinch = now < e.flinchUntil;
      const frameW = flinch ? MONSTER_HURT_FRAME_W : MONSTER_WALK_FRAME_W;
      const frameH = flinch ? MONSTER_HURT_FRAME_H : MONSTER_WALK_FRAME_H;
      const drawH = r * 4.2;
      const drawW = drawH * (frameW / frameH);
      const sheet = flinch ? MONSTER_HURT_IMG[e.element] : MONSTER_WALK_IMG[e.element];
      const frame = flinch ? 0 : Math.floor(now / MONSTER_ANIM_MS) % MONSTER_WALK_COLS;
      if (sheet.complete && sheet.naturalWidth > 0) {
        ctx.drawImage(sheet, frame * frameW, 0, frameW, frameH, pos.x - drawW / 2, pos.y - drawH / 2, drawW, drawH);
      }
      if (e.isBoss) {
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.moveTo(pos.x - drawH * 0.3, pos.y - drawH * 0.5);
        ctx.lineTo(pos.x - drawH * 0.42, pos.y - drawH * 0.86);
        ctx.lineTo(pos.x - drawH * 0.08, pos.y - drawH * 0.46);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pos.x + drawH * 0.3, pos.y - drawH * 0.5);
        ctx.lineTo(pos.x + drawH * 0.42, pos.y - drawH * 0.86);
        ctx.lineTo(pos.x + drawH * 0.08, pos.y - drawH * 0.46);
        ctx.fill();
      }
      if (e.blockedByTileKey) {
        ctx.strokeStyle = "#ff6b6b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, drawH * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.dotUntil > now) {
        ctx.strokeStyle = "#84cc16";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, drawH * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      const barW = r * 2.2;
      const hpPct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "#00000066";
      ctx.fillRect(pos.x - barW / 2, pos.y - r - 12, barW, 4);
      ctx.fillStyle = hpBarColor(hpPct);
      ctx.fillRect(pos.x - barW / 2, pos.y - r - 12, barW * hpPct, 4);
    }

    ctx.globalCompositeOperation = "lighter";
    for (const p of g.projectiles) {
      ctx.globalAlpha = 0.5;
      drawIfLoaded(ctx, EFFECT_ORB_IMG[p.element], p.x - 20, p.y - 20, 40, 40);
      ctx.globalAlpha = 1;
      drawIfLoaded(ctx, EFFECT_ORB_IMG[p.element], p.x - 14, p.y - 14, 28, 28);
    }
    for (const fx of g.hitFx) {
      const age = now - fx.createdAt;
      const life = Math.max(0, 1 - age / 260);
      const size = 38 + (1 - life) * 54;
      ctx.globalAlpha = Math.min(1, life * 1.4);
      drawIfLoaded(ctx, EFFECT_BURST_IMG[fx.element], fx.x - size / 2, fx.y - size / 2, size, size);
      ctx.globalAlpha = 1;
    }
    for (const s of g.sparks) {
      const age = now - s.createdAt;
      const life = Math.max(0, 1 - age / 420);
      ctx.globalAlpha = life;
      ctx.fillStyle = s.color;
      const sz = 2.5 + life * 2.5;
      ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "source-over";

    // 데미지 숫자 팝업 — 가산 블렌딩 없이 또렷하게, 위로 떠오르며 페이드
    ctx.textAlign = "center";
    ctx.font = "bold 15px sans-serif";
    for (const d of g.dmgTexts) {
      const age = now - d.createdAt;
      const life = Math.max(0, 1 - age / 700);
      const riseY = d.y - age * 0.045;
      ctx.globalAlpha = Math.min(1, life * 1.6);
      const label = d.trueDmg ? `${d.value}` : d.weak ? `${d.value}!` : `${d.value}`;
      const scale = d.weak ? 1.25 : 1;
      ctx.save();
      ctx.translate(d.x, riseY);
      ctx.scale(scale, scale);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = d.weak ? "#fde047" : d.color;
      ctx.fillText(label, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  };

  const flashTile = (key: string) => {
    setActionFlash(key);
    setTimeout(() => setActionFlash(null), 400);
  };
  const warnDp = () => {
    setDpWarning(true);
    setTimeout(() => setDpWarning(false), 1200);
  };

  // 스킬 발동 — 아키타입당 1개, SP 100% 찼을 때 오퍼레이터를 클릭하면 즉시 발동 (모드 무관, 최우선)
  const triggerSkill = (key: string) => {
    const g = gRef.current;
    const op = g.operators.get(key);
    if (!op || op.sp < SP_MAX) return false;
    op.sp = 0;
    const now = performance.now();
    const pos = tileCenter(...(key.split(",").map(Number) as [number, number]));
    const stats = ARCHETYPE_STATS[op.archetype];
    const basePower = stats.damage * RARITY_POWER_MULT[op.rarity];
    const inRange = (e: Enemy) => Math.hypot(enemyPos(e).x - pos.x, enemyPos(e).y - pos.y) <= stats.range;
    const skillColor = ELEMENT_COLOR[ARCH_ELEMENT[op.archetype]];
    const hitEnemy = (e: Enemy, dmg: number, trueDmg: boolean) => {
      e.hp -= dmg;
      e.flinchUntil = now + 110;
      const ep = enemyPos(e);
      spawnHitFeedback(g, ep.x, ep.y - 16, dmg, skillColor, now, { trueDmg });
    };

    switch (op.archetype) {
      case "warrior": {
        const target = g.enemies.find((e) => op.blockedEnemyIds.includes(e.id));
        if (target) hitEnemy(target, applyMitigation(basePower * 3, stats.dmgType, target), false);
        break;
      }
      case "rogue": {
        const target = g.enemies.find((e) => op.blockedEnemyIds.includes(e.id));
        if (target) for (let i = 0; i < 3; i++) hitEnemy(target, applyMitigation(basePower, stats.dmgType, target), false);
        break;
      }
      case "tank": {
        op.hp = Math.min(op.maxHp, op.hp + op.maxHp * 0.5);
        op.shieldUntil = now + 4000;
        spawnHitFeedback(g, pos.x, pos.y - 20, op.maxHp * 0.5, "#60a5fa", now);
        break;
      }
      case "mage": {
        for (const e of g.enemies) {
          if (inRange(e)) hitEnemy(e, applyMitigation(basePower * 2, stats.dmgType, e), false);
        }
        break;
      }
      case "meka": {
        for (const e of g.enemies) {
          if (inRange(e)) {
            hitEnemy(e, applyMitigation(basePower * 1.2, stats.dmgType, e), false);
            e.slowUntil = now + 3000;
          }
        }
        break;
      }
      case "nature":
      case "cursed": {
        for (const e of g.enemies) {
          if (inRange(e)) {
            hitEnemy(e, basePower * 0.9, true); // true damage
            e.dotUntil = now + 3000;
            e.dotDmgPerTick = basePower * 0.3;
          }
        }
        break;
      }
    }
    g.hitFx.push({ x: pos.x, y: pos.y, color: skillColor, element: ARCH_ELEMENT[op.archetype], createdAt: now });
    flashTile(key);
    setOpsVersion((v) => v + 1);
    return true;
  };

  // 배치 모드: 빈 타일 클릭 → 그 타일에 맞는(근접=경로, 원거리=고지대) 캐릭터 중 DP로
  // 감당 가능한 것들을 보여주고 직접 골라 배치한다 (명일방주처럼 항상 직접 선택)
  const openDeploy = (key: string) => {
    const g = gRef.current;
    if (g.operators.has(key) || towerPool.length === 0) return;
    const readyAt = g.tileCooldowns.get(key);
    if (readyAt && readyAt > performance.now()) return;
    const type = TILE_GRID.get(key);
    const wantBlocker = type === "path";
    const choices = towerPool.filter((d) => ARCHETYPE_STATS[d.archetype].isBlocker === wantBlocker);
    if (choices.length === 0) return;
    setDeployChoices(choices);
    setDeployTarget(key);
  };

  const confirmDeploy = (def: TowerDef) => {
    const g = gRef.current;
    if (deployTarget === null) return;
    const cost = RARITY_DP_COST[def.rarity];
    if (g.dp < cost) {
      warnDp();
      return;
    }
    g.dp -= cost;
    g.operators.set(deployTarget, instantiateOperator(def, deployTarget));
    flashTile(deployTarget);
    setDeployTarget(null);
    setDeployChoices([]);
    setOpsVersion((v) => v + 1);
  };

  const cancelDeploy = () => {
    setDeployTarget(null);
    setDeployChoices([]);
  };

  // 철수 모드: 배치된 오퍼레이터 클릭 시 즉시 회수, DP 일부 환급 + 짧은 재배치 쿨다운
  const retreatAt = (key: string) => {
    const g = gRef.current;
    const op = g.operators.get(key);
    if (!op) return;
    g.dp = Math.min(DP_MAX, g.dp + Math.round(RARITY_DP_COST[op.rarity] * RETREAT_REFUND_RATIO));
    for (const eid of op.blockedEnemyIds) {
      const e = g.enemies.find((en) => en.id === eid);
      if (e) e.blockedByTileKey = null;
    }
    g.operators.delete(key);
    g.tileCooldowns.set(key, performance.now() + RETREAT_COOLDOWN_MS);
    setOpsVersion((v) => v + 1);
  };

  // 합성 모드: 같은 등급 2기를 소모해 한 단계 위 등급의 랜덤 캐릭터를 배치
  const mergeAt = (key: string) => {
    const g = gRef.current;
    const op = g.operators.get(key);
    if (!op) return;
    const promoted = nextRarity(op.rarity);
    if (!promoted) return;
    const matches = [...g.operators.entries()].filter(([, o]) => o.rarity === op.rarity);
    if (matches.length < 2) return;
    const [, other] = matches.find(([k]) => k !== key)!;
    const resultDef = randomTowerByRarities(towerPool, [promoted]);
    const otherKey = matches.find(([k]) => k !== key)![0];
    g.operators.delete(otherKey);
    if (resultDef) {
      const merged = instantiateOperator(resultDef, key);
      merged.hp = Math.max(merged.hp, other.hp); // 합성 직전 체력 중 더 높은 쪽 승계
      g.operators.set(key, merged);
    } else {
      g.operators.delete(key);
    }
    flashTile(key);
    setOpsVersion((v) => v + 1);
  };

  const handleTileClick = (key: string) => {
    const g = gRef.current;
    const op = g.operators.get(key);
    if (op && triggerSkill(key)) return; // SP 꽉 찬 오퍼레이터는 모드 무관 최우선 발동
    if (actionMode === "deploy") {
      if (!op) openDeploy(key);
    } else if (actionMode === "retreat") {
      if (op) retreatAt(key);
    } else if (actionMode === "merge") {
      if (op) mergeAt(key);
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

  const archLabel = (arch: Archetype): string => t(`td.arch_${arch}` as TranslationKey);
  const elemLabel = (elem: Element): string => (elem === "light" ? "" : t(`td.elem_${elem}` as TranslationKey));
  const counterArch = ELEMENT_TO_ARCH[COUNTERED_BY[waveElement] ?? "fire"];

  void opsVersion;
  const mergeableTiles = findMergeableTiles(gRef.current.operators);
  const canMerge = mergeableTiles.size > 0;
  const hpPct = Math.round((1 + hudWave * 0.05) * Math.pow(1.025, hudWave) * 100);
  const allTileKeys = [...TILE_GRID.keys()].filter((k) => TILE_GRID.get(k) !== "empty");

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
        <p className="text-sm text-muted-foreground text-center py-10">{t("td.loading")}</p>
      )}

      {phase === "lobby" && (
        <div
          className="relative overflow-hidden rounded-2xl border border-[#8a6bc4]/40 p-6 flex flex-col items-center gap-4"
          style={{ background: "radial-gradient(ellipse 130% 90% at 50% -15%, #3a2f52 0%, #161226 55%, #0d0a17 100%)" }}
        >
          <style>{`@keyframes td-sparkle-twinkle { 0%,100%{opacity:0.15} 50%{opacity:0.9} }`}</style>
          {LOBBY_SPARKLES.map((s, i) => (
            <span
              key={i}
              className="pointer-events-none absolute rounded-full bg-[#c9a6f5]"
              style={{ left: s.left, top: s.top, width: s.size, height: s.size, animation: `td-sparkle-twinkle 2.4s ease-in-out infinite`, animationDelay: s.delay }}
            />
          ))}

          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-[#c9a6f5]/25 blur-xl animate-pulse" />
            <Castle className="relative w-16 h-16 text-[#c9a6f5] drop-shadow-[0_0_14px_rgba(201,166,245,0.55)]" />
          </div>

          <div className="relative flex gap-3 w-full">
            <div className="flex-1 rounded-xl bg-black/25 border border-[#8a6bc4]/30 py-2 text-center">
              <p className="text-[10px] text-[#c9a6f5]/80">{t("td.best_wave")}</p>
              <p className="text-lg font-bold text-[#f1e8fc]">{bestWave}/{WAVE_COUNT}</p>
            </div>
            <div className="flex-1 rounded-xl bg-black/25 border border-[#8a6bc4]/30 py-2 text-center">
              <p className="text-[10px] text-[#c9a6f5]/80">{t("td.attempts_left")}</p>
              <p className="text-lg font-bold text-[#f1e8fc]">{attemptsLeft}</p>
            </div>
          </div>

          <div className="relative grid grid-cols-3 gap-2 w-full">
            <div className="rounded-lg bg-black/20 border border-[#8a6bc4]/20 py-2 px-1 flex flex-col items-center gap-1">
              <Shield className="w-4 h-4 text-[#c9a6f5]" />
              <p className="text-[9px] text-[#c9a6f5]/80 text-center leading-tight">{t("td.hint_block")}</p>
            </div>
            <div className="rounded-lg bg-black/20 border border-[#8a6bc4]/20 py-2 px-1 flex flex-col items-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <p className="text-[9px] text-[#c9a6f5]/80 text-center leading-tight">{t("td.hint_dp")}</p>
            </div>
            <div className="rounded-lg bg-black/20 border border-[#8a6bc4]/20 py-2 px-1 flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4 text-[#c9a6f5]" />
              <p className="text-[9px] text-[#c9a6f5]/80 text-center leading-tight">{t("td.hint_merge")}</p>
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
          <p className="relative text-[11px] text-[#c9a6f5]/70 text-center">{t("td.desc")}</p>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-card rounded-xl border border-border px-4 py-2">
            <p className="text-sm font-semibold">{t("td.wave_label")} {hudWave}/{WAVE_COUNT}</p>
            <div className={`flex flex-col items-center gap-0.5 transition ${dpGainFlash ? "scale-110" : ""}`}>
              <p className="flex items-center gap-1 text-sm font-semibold text-amber-400">
                <Zap className="w-4 h-4" /> {hudDp}/{DP_MAX}
              </p>
              <div className="w-20 h-1.5 rounded-full bg-black/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                  style={{ width: `${(hudDp / DP_MAX) * 100}%` }}
                />
              </div>
            </div>
            <p className="flex items-center gap-1 text-sm font-semibold text-rose-400">
              <Heart className="w-4 h-4" /> {hudLives}
            </p>
            <button
              onClick={toggleSpeed}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                hudSpeed === 2 ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <FastForward className="w-3.5 h-3.5" /> {hudSpeed}x
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ELEMENT_COLOR[waveElement] }} />
            {t("td.wave_element_hint").replace("{element}", elemLabel(waveElement)).replace("{archetype}", counterArch ? archLabel(counterArch) : "")}
          </p>

          {dpWarning && <p className="text-center text-[11px] text-rose-400 font-semibold">{t("td.not_enough_dp")}</p>}
          {bossWarning && (
            <div className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600/90 via-rose-500 to-rose-600/90 shadow-[0_0_16px_-2px_rgba(244,63,94,0.6)] animate-pulse">
              <Skull className="w-4 h-4" /> {t("td.boss_warning")}
            </div>
          )}

          <div ref={boardWrapRef} className="w-full overflow-x-auto">
            <div className="mx-auto" style={{ width: CANVAS_W * boardScale, height: CANVAS_H * boardScale }}>
              <div
                className="relative"
                style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${boardScale})`, transformOrigin: "top left" }}
              >
                <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="absolute inset-0 rounded-xl" />

                <div className="absolute top-2 right-2 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 shadow-lg px-3 py-2 text-[11px] space-y-1 min-w-[132px] pointer-events-none tabular-nums">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 uppercase tracking-wide text-[9px]">{t("td.status_stage")}</span>
                    <span className="font-bold text-white">{hudWave}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 uppercase tracking-wide text-[9px]">{t("td.status_kills")}</span>
                    <span className="font-bold text-white">{hudKills}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 uppercase tracking-wide text-[9px]">{t("td.status_remaining")}</span>
                    <span className="font-bold text-white">{hudEnemiesLeft}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10">
                    <span className="text-white/50 uppercase tracking-wide text-[9px]">{t("td.status_lives")}</span>
                    <span className="font-bold text-rose-400">{hudLives}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 uppercase tracking-wide text-[9px]">{t("td.status_hp_pct")}</span>
                    <span className="font-bold text-amber-300">{hpPct}%</span>
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 shadow-lg px-3 py-1.5 text-[11px] font-semibold text-white pointer-events-none">
                  {hudPrepLeft > 0 ? t("td.prep_countdown").replace("{sec}", String(hudPrepLeft)) : `${t("td.status_stage")} ${hudWave}`}
                </div>

                {allTileKeys.map((key) => {
                  const [col, row] = key.split(",").map(Number);
                  const pos = tileCenter(col, row);
                  const op = gRef.current.operators.get(key);
                  void opsVersion;
                  const def = op ? charById(op.characterId) : null;
                  const onCooldown = (gRef.current.tileCooldowns.get(key) ?? 0) > performance.now();
                  const targetable = onCooldown
                    ? false
                    : actionMode === "deploy"
                      ? !op
                      : actionMode === "retreat"
                        ? !!op
                        : actionMode === "merge"
                          ? mergeableTiles.has(key)
                          : false;
                  return (
                    <button
                      key={key}
                      onClick={() => handleTileClick(key)}
                      disabled={onCooldown && !op}
                      className={`absolute flex items-center justify-center rounded-lg transition-all active:scale-90 ${
                        actionFlash === key ? "scale-110" : ""
                      } ${
                        def
                          ? `border-[1.5px] ${RARITY_BORDER[def.rarity]} bg-black/10`
                          : "border border-transparent hover:bg-white/10 hover:border-white/20"
                      } ${
                        actionMode && targetable ? `${ACTION_MODE_TARGET[actionMode]} animate-pulse` : ""
                      } ${actionMode && !targetable ? "opacity-35" : ""}`}
                      style={{ left: pos.x - 38, top: pos.y - 38, width: 76, height: 76 }}
                    >
                      {def && op && (
                        <div className="relative">
                          <PixelCharacter characterId={def.id} size={52} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-3 space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { mode: "deploy", icon: Swords, label: t("td.action_deploy"), hotkey: "1" },
                  { mode: "retreat", icon: Shield, label: t("td.action_retreat"), hotkey: "2" },
                  { mode: "merge", icon: GitMerge, label: t("td.action_merge"), disabled: !canMerge, hotkey: "3" },
                ] as { mode: ActionMode; icon: LucideIcon; label: string; disabled?: boolean; hotkey: string }[]
              ).map((a) => {
                const Icon = a.icon;
                const active = actionMode === a.mode;
                return (
                  <button
                    key={a.mode}
                    onClick={() => toggleMode(a.mode)}
                    disabled={a.disabled}
                    className={`relative flex flex-col items-center gap-0.5 rounded-lg py-2.5 px-1 text-[10px] font-semibold border transition-all active:scale-95 ${
                      a.disabled
                        ? "bg-secondary/40 border-border text-muted-foreground opacity-50 cursor-not-allowed"
                        : active
                          ? `${ACTION_MODE_BUTTON_ACTIVE[a.mode]} text-white`
                          : "bg-secondary/80 border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="absolute top-0.5 left-1 text-[8px] opacity-60">{a.hotkey}</span>
                    <Icon className="w-4 h-4" />
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
            {actionMode && (
              <p className="text-center text-[10px] text-muted-foreground">{t(`td.hint_mode_${actionMode}` as TranslationKey)}</p>
            )}
            <p className="text-center text-[9px] text-muted-foreground/70">{t("td.hint_skill")}</p>
          </div>

          {deployTarget !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={cancelDeploy}>
              <div className="bg-card rounded-2xl border border-border p-4 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-semibold text-center">{t("td.deploy_title")}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
                  {deployChoices.map((c) => {
                    const def = charById(c.characterId);
                    if (!def) return null;
                    const cost = RARITY_DP_COST[c.rarity];
                    const affordable = gRef.current.dp >= cost;
                    return (
                      <button
                        key={c.characterId}
                        onClick={() => confirmDeploy(c)}
                        disabled={!affordable}
                        className={`relative rounded-xl border-2 ${RARITY_BORDER[def.rarity]} p-2 flex flex-col items-center gap-1 min-h-[92px] active:scale-95 transition-transform ${!affordable ? "opacity-40" : ""}`}
                      >
                        <PixelCharacter characterId={def.id} size={48} />
                        <span className={`text-[10px] font-semibold ${RARITY_COLOR[def.rarity]}`}>{getCharName(def, lang)}</span>
                        <span className={`text-[9px] ${RARITY_COLOR[def.rarity]}`}>{getRarityLabel(def.rarity, lang)}</span>
                        <span className="text-[9px] text-muted-foreground">{archLabel(c.archetype)}</span>
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-300">
                          <Zap className="w-2.5 h-2.5" /> {cost}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={cancelDeploy}
                  className="w-full rounded-lg border border-border text-foreground text-xs font-semibold py-2.5 hover:bg-white/5 active:scale-95 transition-transform"
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
                <p className="text-sm text-muted-foreground">{t("td.wave_reached")} {result.wavesCleared}/{WAVE_COUNT}</p>
                {result.isNewRecord && <p className="text-xs font-semibold text-amber-400">{t("td.new_record")}</p>}
                {result.kpEarned > 0 && <p className="text-sm font-bold text-primary">+{result.kpEarned}KP</p>}
                <button onClick={backToLobby} className="mt-2 w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-white hover:bg-primary/90">
                  {t("td.back_to_lobby")}
                </button>
              </>
            )
          )}
        </div>
      )}

      {showRankings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setShowRankings(false)}>
          <div className="bg-card rounded-2xl border border-border p-4 w-full max-w-sm max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                      style={{ background: RANK_COLOR[r.rank] ? `${RANK_COLOR[r.rank]}22` : "var(--muted)", color: RANK_COLOR[r.rank] ?? "var(--muted-foreground)" }}
                    >
                      {r.rank}
                    </span>
                    <span className="flex-1 truncate font-medium">{r.nickname}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t("td.wave_label")} {r.bestWave}</span>
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
