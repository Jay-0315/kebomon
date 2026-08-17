import { useCallback, useEffect, useRef, useState } from "react";
import {
  Swords,
  Users,
  ArrowLeft,
  Trophy,
  Egg,
  Sparkles,
  Clock,
  Heart,
  Medal,
  TriangleAlert,
} from "lucide-react";
import {
  useAppData,
  type EggType,
  type EggOpenResult,
} from "../context/AppDataContext";
import { getRaidSocket, disconnectRaidSocket } from "../lib/socket";
import { getStoredUser } from "../lib/auth";
import PixelCharacter, { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName } from "../data/characters";
import EggHatchModal, { EggBatchModal } from "./EggHatchModal";
import { useLang } from "../context/LangContext";
import { TranslationKey } from "../lib/i18n";

const MAX_PLAYERS = 5;

// ─── Pixel Egg SVG ────────────────────────────────────────────────────────
function PixelEggSVG({
  type,
  size = 48,
}: {
  type: "normal" | "big" | "golden";
  size?: number;
}) {
  const C = {
    normal: { body: "#ede8dd", hi: "#f8f4ee", lo: "#c4b49a" },
    big: { body: "#7dd3fc", hi: "#dbeafe", lo: "#1d4ed8", spot: "#0369a1" },
    golden: { body: "#fbbf24", hi: "#fef9c3", lo: "#b45309" },
  }[type] as { body: string; hi: string; lo: string; spot?: string };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 20"
      style={{ imageRendering: "pixelated", display: "block", margin: "auto" }}
    >
      <rect x="5" y="0" width="6" height="2" fill={C.body} />
      <rect x="3" y="2" width="10" height="2" fill={C.body} />
      <rect x="2" y="4" width="12" height="2" fill={C.body} />
      <rect x="1" y="6" width="14" height="2" fill={C.body} />
      <rect x="0" y="8" width="16" height="4" fill={C.body} />
      <rect x="1" y="12" width="14" height="2" fill={C.body} />
      <rect x="2" y="14" width="12" height="2" fill={C.body} />
      <rect x="4" y="16" width="8" height="2" fill={C.body} />
      <rect x="6" y="18" width="4" height="2" fill={C.body} />
      <rect x="4" y="2" width="3" height="2" fill={C.hi} />
      <rect x="3" y="4" width="2" height="2" fill={C.hi} />
      <rect x="2" y="6" width="2" height="2" fill={C.hi} />
      <rect x="4" y="14" width="4" height="2" fill={C.lo} />
      <rect x="6" y="16" width="3" height="2" fill={C.lo} />
      {type === "big" && (
        <>
          <rect x="9" y="6" width="2" height="2" fill={C.spot} />
          <rect x="11" y="10" width="2" height="2" fill={C.spot} />
        </>
      )}
      {type === "golden" && (
        <>
          <rect x="11" y="2" width="2" height="1" fill="#fff" />
          <rect x="12" y="1" width="1" height="3" fill="#fff" />
        </>
      )}
    </svg>
  );
}

const getBossChar = (raidId: number) =>
  CHARACTERS[(raidId * 43) % CHARACTERS.length];

const RAID_IDS = [1, 5];

function fmtCooldown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type RosterEntry = { socketId: string; characterId: number; nickname: string };
type SelfInfo = { socketId: string; nickname: string; characterId: number };
type Mission = { label: string; target: string; hint: string; targets?: Record<string, string> };
type Boss = { characterId: number; name: string; cry: string };
type RaidSeasonInfo = { id: string; label: string; effect: string; endsAt: number };
type RaidPatternInfo = { id: string; label: string; hint: string };
type RaidState = {
  raidType: number;
  name: string;
  boss: Boss;
  hp: number;
  maxHp: number;
  cleared: boolean;
  mission: Mission;
  season?: RaidSeasonInfo;
  pattern?: RaidPatternInfo;
  participants: RosterEntry[];
  count: number;
  maxPlayers: number;
};
type Reward =
  | { kind: "points"; points: number }
  | { kind: "egg"; egg: EggType; count?: number };
type RankEntry = {
  userId: string;
  nickname: string;
  damage: number;
  rank: number;
};

const charById = (id: number) =>
  CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

// ─── 점프 액션 게임 (점프 레이드 / 타입1) ─────────────────────────────────
// 장애물이 계속 다가오고, 스페이스바(또는 터치)로 점프해서 넘으면 보스에게 데미지.
type Obstacle = {
  x: number;
  ow: number;
  oh: number;
  counted: boolean;
  hit: boolean;
  kind: number;
};
type PlayerLiveMap = Record<
  string,
  { lives: number; characterId: number; nickname: string }
>;
function JumpGame({
  charDef,
  cleared,
  onClear,
  onDied,
  playerLives = {},
  mySocketId,
}: {
  charDef: ReturnType<typeof charById>;
  cleared: boolean;
  onClear: () => void;
  onDied?: () => void;
  playerLives?: PlayerLiveMap;
  mySocketId?: string;
}) {
  const { t } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;
  const onDiedRef = useRef(onDied);
  onDiedRef.current = onDied;
  const clearedRef = useRef(cleared);
  clearedRef.current = cleared;
  const stunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stunned, setStunned] = useState(false);
  const [lives, setLives] = useState(5);
  const [deadUntil, setDeadUntil] = useState(0);

  const MAX_HITS = 5;

  const g = useRef({
    jy: 0,
    vy: 0,
    grounded: true,
    isJumpHeld: false,
    stunUntil: 0,
    hits: 0,
    deadUntil: 0, // Date.now 기준
    obstacles: [] as Obstacle[],
    spawnAcc: 0,
    nextSpawn: 900,
    speed: 4,
    elapsed: 0,
  });

  const doJump = useCallback(() => {
    const st = g.current;
    if (clearedRef.current) return;
    if (Date.now() < st.deadUntil) return;
    if (performance.now() < st.stunUntil) return;
    if (st.grounded) {
      st.vy = 9.5;
      st.grounded = false;
      st.isJumpHeld = true;
    }
  }, []);

  const releaseJump = useCallback(() => {
    g.current.isJumpHeld = false;
  }, []);

  // 키보드(스페이스/↑) — 페이지 스크롤 방지
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        if (!e.repeat) doJump();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
        releaseJump();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [doJump, releaseJump]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const GROUND_H = 16;
    const GRAVITY = 0.72; // 낙하 / 키 뗐을 때 중력
    const HOLD_GRAVITY = 0.4; // 홀드 상승 중 중력 (낮을수록 더 높이 올라감)
    const HITX = 50; // 플레이어 히트박스 좌표
    const HITW = 30;

    const resize = () => {
      const w = wrapRef.current?.clientWidth ?? 600;
      canvas.width = Math.max(280, w);
      canvas.height = 200;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      let dt = now - last;
      last = now;
      if (dt > 50) dt = 50;
      const dtf = dt / 16.67;
      const st = g.current;
      const W = canvas.width;
      const H = canvas.height;
      const groundY = H - GROUND_H;

      const realNow = Date.now();
      const dead = st.deadUntil > realNow;

      if (!clearedRef.current && dead) {
        // 사망 중 — 부활 대기 (게임 정지)
      } else if (!clearedRef.current) {
        st.elapsed += dt;

        // 점프 물리 — 홀드 중(상승)이면 중력 감소, 키 떼면 즉시 빠르게 낙하
        if (!st.grounded) {
          st.jy += st.vy * dtf;
          const grav = st.isJumpHeld && st.vy > 0 ? HOLD_GRAVITY : GRAVITY;
          st.vy -= grav * dtf;
          if (st.jy <= 0) {
            st.jy = 0;
            st.vy = 0;
            st.grounded = true;
            st.isJumpHeld = false;
          }
        }

        // 시간이 지날수록 빨라짐
        st.speed = 4.2 + Math.min(3.0, st.elapsed / 18000);

        // 장애물 생성
        st.spawnAcc += dt;
        if (st.spawnAcc >= st.nextSpawn) {
          st.spawnAcc = 0;
          // 들쑥날쑥: 25% 확률로 짧은 간격(연속 장애물), 75%는 일반 간격
          const burst = Math.random() < 0.25;
          st.nextSpawn = burst
            ? 550 + Math.random() * 300 // 연속: 550~850ms
            : 1000 + Math.random() * 1100; // 일반: 1000~2100ms
          st.nextSpawn -= Math.min(380, st.elapsed / 50);
          const kind = Math.floor(Math.random() * 3); // 0=단독, 1=쌍, 2=클러스터
          const oh =
            kind === 2
              ? 22 + Math.floor(Math.random() * 10)
              : 26 + Math.floor(Math.random() * 18);
          const ow =
            kind === 1
              ? 28 + Math.floor(Math.random() * 8)
              : 16 + Math.floor(Math.random() * 10);
          st.obstacles.push({
            x: W + 12,
            ow,
            oh,
            counted: false,
            hit: false,
            kind,
          });
        }

        // 이동 / 충돌 / 통과 판정
        for (const o of st.obstacles) {
          o.x -= st.speed * dtf;
          const overlapX = o.x < HITX + HITW && o.x + o.ow > HITX;
          if (overlapX && !o.hit && !o.counted && st.jy < o.oh) {
            // 충돌 → 목숨 감소
            o.hit = true;
            st.hits += 1;
            setLives(Math.max(0, MAX_HITS - st.hits));
            if (st.hits >= MAX_HITS) {
              // 사망 → 재입장 불가
              st.deadUntil = Date.now() + 1;
              st.obstacles = [];
              st.jy = 0;
              st.vy = 0;
              st.grounded = true;
              setDeadUntil(st.deadUntil);
              setStunned(false);
              onDiedRef.current?.();
              break;
            } else {
              st.stunUntil = now + 650;
              setStunned(true);
              if (stunTimerRef.current) clearTimeout(stunTimerRef.current);
              stunTimerRef.current = window.setTimeout(() => setStunned(false), 650);
            }
          }
          if (!o.counted && !o.hit && o.x + o.ow < HITX) {
            // 무사히 넘김 → 보스 데미지
            o.counted = true;
            onClearRef.current();
          }
        }
        st.obstacles = st.obstacles.filter((o) => o.x + o.ow > -30);
      }

      // ── 그리기 ──
      ctx.clearRect(0, 0, W, H);

      // 하늘 그라데이션
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#4a90d9");
      sky.addColorStop(0.45, "#85c1f0");
      sky.addColorStop(0.75, "#c9e8f8");
      sky.addColorStop(1, "#e8f5e0");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // 태양 (광선 포함)
      const sunX = W - 60;
      const sunY = 38;
      ctx.fillStyle = "rgba(255,230,100,0.18)";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,235,120,0.35)";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe87a";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff5c0";
      ctx.beginPath();
      ctx.arc(sunX, sunY, 13, 0, Math.PI * 2);
      ctx.fill();

      // 구름 (속도 다른 2레이어)
      const drawCloud = (cx: number, cy: number, s: number, alpha: number) => {
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 11 * s, 0, Math.PI * 2);
        ctx.arc(cx + 14 * s, cy + 4 * s, 14 * s, 0, Math.PI * 2);
        ctx.arc(cx + 32 * s, cy + 1 * s, 11 * s, 0, Math.PI * 2);
        ctx.arc(cx + 17 * s, cy - 7 * s, 12 * s, 0, Math.PI * 2);
        ctx.fill();
      };
      const span = W + 160;
      const drift1 = now * 0.013;
      const drift2 = now * 0.007;
      for (const b of [
        { x: 50, y: 38, s: 1, a: 0.9 },
        { x: 260, y: 60, s: 0.65, a: 0.75 },
        { x: 440, y: 28, s: 0.82, a: 0.85 },
      ]) {
        let cx = (b.x - drift1) % span;
        if (cx < -80) cx += span;
        drawCloud(cx, b.y, b.s, b.a);
      }
      for (const b of [
        { x: 140, y: 72, s: 0.55, a: 0.6 },
        { x: 360, y: 48, s: 0.72, a: 0.65 },
      ]) {
        let cx = (b.x - drift2) % span;
        if (cx < -80) cx += span;
        drawCloud(cx, b.y, b.s, b.a);
      }

      // 원거리 산 (픽셀 스타일, 2층)
      const drawMtLayer = (
        color: string,
        baseY: number,
        peaks: { x: number; h: number }[],
      ) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, baseY);
        for (const p of peaks) {
          ctx.lineTo(p.x - p.h * 0.7, baseY);
          ctx.lineTo(p.x, baseY - p.h);
          ctx.lineTo(p.x + p.h * 0.7, baseY);
        }
        ctx.lineTo(W, baseY);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      };
      drawMtLayer("rgba(150,185,215,0.45)", groundY - 40, [
        { x: W * 0.08, h: 38 },
        { x: W * 0.23, h: 55 },
        { x: W * 0.44, h: 42 },
        { x: W * 0.62, h: 60 },
        { x: W * 0.8, h: 35 },
        { x: W * 0.95, h: 48 },
      ]);
      drawMtLayer("rgba(130,165,100,0.55)", groundY - 22, [
        { x: W * 0.05, h: 22 },
        { x: W * 0.18, h: 30 },
        { x: W * 0.35, h: 24 },
        { x: W * 0.52, h: 28 },
        { x: W * 0.7, h: 20 },
        { x: W * 0.86, h: 26 },
        { x: W * 0.98, h: 18 },
      ]);

      // 먼 언덕 (parallax)
      const hill = (
        color: string,
        baseY: number,
        amp: number,
        speed: number,
        wl: number,
      ) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, H);
        const off = (now * speed) % wl;
        for (let x = -off; x <= W + 4; x += 6) {
          ctx.lineTo(x, baseY - Math.sin(((x + off) / wl) * Math.PI * 2) * amp);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      };
      hill("#b8dba0", groundY - 16, 11, 0.009, 260);
      hill("#98cb7e", groundY - 3, 18, 0.018, 360);

      // 바닥: 잔디 + 흙
      ctx.fillStyle = "#b8864e";
      ctx.fillRect(0, groundY, W, GROUND_H);
      ctx.fillStyle = "#6dc057";
      ctx.fillRect(0, groundY, W, 7);
      ctx.fillStyle = "#52a040";
      ctx.fillRect(0, groundY + 7, W, 2);
      // 잔디 줄기 픽셀 (속도감)
      ctx.fillStyle = "rgba(82,160,64,0.6)";
      const gscroll = (now * 0.2) % 24;
      for (let x = -gscroll; x < W; x += 24) {
        ctx.fillRect(x, groundY + 9, 3, 3);
        ctx.fillRect(x + 8, groundY + 10, 2, 2);
        ctx.fillRect(x + 16, groundY + 9, 3, 3);
      }

      // 장애물 — 도트 선인장
      const drawCactus = (
        bx: number,
        by: number,
        w: number,
        h: number,
        hit: boolean,
      ) => {
        const dark = hit ? "#9ca3af" : "#1b5e35";
        const mid = hit ? "#b0b8c1" : "#2d6a4f";
        const light = hit ? "#cdd5dc" : "#52b788";
        const u = Math.max(2, Math.floor(w / 7)); // 픽셀 1칸 크기
        const sw = u * 2; // 줄기 두께
        const cx = bx + Math.floor(w / 2) - u; // 줄기 중심 x

        // 줄기
        ctx.fillStyle = mid;
        ctx.fillRect(cx, by, sw, h);
        // 줄기 하이라이트
        ctx.fillStyle = light;
        ctx.fillRect(cx + u, by + u, u, h - u * 2);
        // 줄기 테두리
        ctx.fillStyle = dark;
        ctx.fillRect(cx - 1, by, 1, h);
        ctx.fillRect(cx + sw, by, 1, h);

        // 왼쪽 팔 (높이 40% 지점)
        const arm1Y = by + Math.floor(h * 0.38);
        const aW = Math.floor(w * 0.38);
        const aH = Math.floor(h * 0.32);
        ctx.fillStyle = mid;
        ctx.fillRect(cx - aW, arm1Y, aW, sw); // 수평
        ctx.fillRect(cx - aW, arm1Y - aH, sw, aH + sw); // 수직 (위로)
        ctx.fillStyle = light;
        ctx.fillRect(cx - aW + 1, arm1Y + 1, aW - 2, u); // 수평 하이라이트
        ctx.fillRect(cx - aW + u, arm1Y - aH + u, u, aH); // 수직 하이라이트
        ctx.fillStyle = dark;
        ctx.fillRect(cx - aW, arm1Y - aH - 1, sw, 1); // 팔 끝 상단 테두리

        // 오른쪽 팔 (높이 58% 지점, 좌측보다 약간 낮게)
        const arm2Y = by + Math.floor(h * 0.55);
        const aW2 = Math.floor(w * 0.3);
        const aH2 = Math.floor(h * 0.24);
        ctx.fillStyle = mid;
        ctx.fillRect(cx + sw, arm2Y, aW2, sw);
        ctx.fillRect(cx + sw + aW2 - sw, arm2Y - aH2, sw, aH2 + sw);
        ctx.fillStyle = light;
        ctx.fillRect(cx + sw + 1, arm2Y + 1, aW2 - 2, u);
        ctx.fillRect(cx + sw + aW2 - sw + u, arm2Y - aH2 + u, u, aH2);
        ctx.fillStyle = dark;
        ctx.fillRect(cx + sw + aW2 - sw, arm2Y - aH2 - 1, sw, 1);

        // 꼭대기 뾰족점 (도트 1픽셀)
        ctx.fillStyle = dark;
        ctx.fillRect(cx + u - Math.floor(u / 2), by - u, u, u);
      };

      for (const o of st.obstacles) {
        const topY = groundY - o.oh;
        if (o.kind === 1) {
          // 쌍 선인장: 크기 다른 두 그루
          const w1 = Math.floor(o.ow * 0.55);
          const w2 = Math.floor(o.ow * 0.48);
          const h1 = o.oh;
          const h2 = Math.floor(o.oh * 0.78);
          drawCactus(o.x, groundY - h1, w1, h1, o.hit);
          drawCactus(o.x + w1 + 3, groundY - h2, w2, h2, o.hit);
        } else if (o.kind === 2) {
          // 클러스터: 작은 3그루
          const w3 = Math.floor(o.ow * 0.36);
          const h3 = o.oh;
          drawCactus(
            o.x,
            groundY - Math.floor(h3 * 0.85),
            w3,
            Math.floor(h3 * 0.85),
            o.hit,
          );
          drawCactus(o.x + w3 + 2, groundY - h3, w3, h3, o.hit);
          drawCactus(
            o.x + w3 * 2 + 4,
            groundY - Math.floor(h3 * 0.7),
            w3,
            Math.floor(h3 * 0.7),
            o.hit,
          );
        } else {
          // 단독 선인장
          drawCactus(o.x, topY, o.ow, o.oh, o.hit);
        }
      }

      // 플레이어(DOM) 위치 갱신
      if (playerRef.current) {
        playerRef.current.style.bottom = `${GROUND_H + st.jy}px`;
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      if (stunTimerRef.current) clearTimeout(stunTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      onPointerDown={doJump}
      onPointerUp={releaseJump}
      onPointerLeave={releaseJump}
      className="relative mx-3 mb-2 mt-1 select-none overflow-hidden rounded-xl border border-border bg-gradient-to-b from-sky-100 to-amber-50 dark:from-slate-800 dark:to-slate-900"
      style={{ height: 200, touchAction: "none", cursor: "pointer" }}
    >
      <canvas ref={canvasRef} className="block h-[200px] w-full" />
      {/* 플레이어 캐릭터 */}
      <div
        ref={playerRef}
        className="pointer-events-none absolute"
        style={{
          left: 40,
          bottom: 16,
          transition: "filter 0.1s, opacity 0.2s",
          opacity: deadUntil > 0 ? 0.35 : 1,
          filter:
            deadUntil > 0
              ? "grayscale(1)"
              : stunned
                ? "grayscale(1) brightness(1.4)"
                : undefined,
        }}
      >
        <PixelSprite
          type={charDef.type}
          colors={charDef.colors}
          characterId={charDef.id}
          size={44}
        />
      </div>
      {/* 목숨(하트) */}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-0.5">
        {Array.from({ length: MAX_HITS }).map((_, i) => (
          <Heart
            key={i}
            className={`h-4 w-4 ${i < lives ? "fill-red-500 text-red-500" : "text-gray-400/60"}`}
          />
        ))}
      </div>
      {/* 안내 */}
      <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white">
        {t("raid.jump_hint")}
      </div>
      {/* 다른 플레이어 목숨 현황 (우측 하단) */}
      {Object.keys(playerLives).filter((sid) => sid !== mySocketId).length >
        0 && (
        <div className="pointer-events-none absolute right-2 bottom-2 z-10 flex flex-col items-end gap-1">
          {Object.entries(playerLives)
            .filter(([sid]) => sid !== mySocketId)
            .map(([sid, info]) => {
              const def = charById(info.characterId);
              return (
                <div
                  key={sid}
                  className="flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5"
                >
                  <PixelSprite
                    type={def.type}
                    colors={def.colors}
                    characterId={def.id}
                    size={16}
                  />
                  <div className="flex gap-0.5">
                    {Array.from({ length: MAX_HITS }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`h-2.5 w-2.5 ${i < info.lives ? "fill-red-400 text-red-400" : "text-gray-500/50"}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      {deadUntil > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white">
          <div className="text-lg font-extrabold">{t("raid.eliminated")}</div>
        </div>
      ) : stunned ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/85 px-4 py-1.5 text-sm font-extrabold text-white">
          {t("raid.jump_stun")}
        </div>
      ) : null}
    </div>
  );
}

// ─── 슈팅 게임 (갤로그 스타일 / 타입5) ────────────────────────────────────────
type PBullet = { id: number; x: number; y: number };
type EBullet = { id: number; x: number; y: number; vx: number; vy: number; kind: number };
// eType: 0=오렌지리더, 1=퍼플, 2=그린, 3=방패(시안), 4=봄버(황금), 5=스피더(핑크), 6=팬텀, 7=엘리트(레드)
// 8=미사일러(주황), 9=스플리터(라임), 10=실더(파랑, 배리어), 11=힐러(연두, 회복)
type SGEnemy = {
  id: number; col: number; row: number;
  hp: number; maxHp: number; alive: boolean;
  eType: number;
  divePhase: 0 | 1;
  diveX: number; diveY: number;
  diveVX: number; diveVY: number;
  diveAngle: number;
  lastFire: number;
  blinkVis: boolean; blinkNext: number;
  formX: number; formY: number;
  shieldHp?: number;
  healNext?: number;
};

// 중간보스: 대형/다이브와 무관한 독립 개체
type SGBoss = {
  x: number; y: number; vx: number;
  hp: number; maxHp: number;
  phase: "enter" | "fight";
  lastFire: number;
  lastBurst: number;
  bossCount: number;
};

function ShootingGame({
  charDef,
  cleared,
  onGemCollect,
  onDied,
  onGameOver,
}: {
  charDef: ReturnType<typeof charById>;
  cleared: boolean;
  onGemCollect: () => void;
  onDied?: () => void;
  onGameOver?: () => void;
}) {
  const { t } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const onKillRef = useRef(onGemCollect);
  onKillRef.current = onGemCollect;
  const onDiedRef = useRef(onDied);
  onDiedRef.current = onDied;
  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const clearedRef = useRef(cleared);
  clearedRef.current = cleared;

  const [lives, setLives] = useState(5);
  const [deadUntil, setDeadUntil] = useState(0);
  const [bossAlert, setBossAlert] = useState(false);
  const bossAlertTimeoutRef = useRef<number | undefined>(undefined);

  const MAX_HITS = 5;
  const P_SPEED = 3.8;
  const P_HIT_R = 7;
  const E_CW = 38;
  const E_RH = 30;

  const g = useRef({
    px: 0, py: 0,
    keys: new Set<string>(),
    pointerX: -1, pointerY: -1,
    pBullets: [] as PBullet[],
    eBullets: [] as EBullet[],
    enemies: [] as SGEnemy[],
    nextId: 0,
    lastFire: 0,
    hits: 0,
    invUntil: 0,
    deadUntil: 0,
    elapsed: 0,
    formOX: 0,
    formVX: 0.6,
    formDY: 0,
    wave: 1,
    waveTimer: -1,
    lastDive: 0,
    waveHistory: [] as number[],
    killCount: 0,
    bossThreshold: 60,
    bossCount: 0,
    boss: null as SGBoss | null,
    healFx: [] as { x: number; y: number; until: number }[],
  });

  useEffect(() => {
    const KEYS = new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","a","A","w","W","s","S","d","D"]);
    const down = (e: KeyboardEvent) => { if (KEYS.has(e.key)) { e.preventDefault(); g.current.keys.add(e.key); } };
    const up = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0, last = performance.now();

    // eType별 기본 HP (신규 패턴에서 재사용)
    const hpForType = (eType: number): number =>
      ({ 0: 2, 1: 1, 2: 1, 3: 3, 4: 4, 5: 1, 6: 2, 7: 4, 8: 2, 9: 2, 10: 2, 11: 2 })[eType] ?? 1;

    const PATTERN_COUNT = 12;

    const buildPattern = (pat: number, CW: number, RH: number) => {
      type Spec = { fx: number; fy: number; eType: number; hp: number; shieldHp?: number };
      const specs: Spec[] = [];
      if (pat === 0) {
        // 클래식 3×4 그리드
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          const eType = r === 0 ? 0 : r === 1 ? 1 : 2;
          specs.push({ fx: (c - 1.5) * CW, fy: 22 + r * RH, eType, hp: eType === 0 ? 2 : 1 });
        }
      } else if (pat === 1) {
        // 방패 선봉 3×5 (방패→리더→그린)
        for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
          const eType = r === 0 ? 3 : r === 1 ? 0 : 2;
          const hp = eType === 3 ? 3 : eType === 0 ? 2 : 1;
          specs.push({ fx: (c - 2) * CW, fy: 22 + r * RH, eType, hp });
        }
      } else if (pat === 2) {
        // 봄버 V자 대형
        const v: [number, number, number][] = [
          [-2*CW, 22, 4], [-CW, 22, 2], [0, 22, 2], [CW, 22, 2], [2*CW, 22, 4],
          [-1.5*CW, 22+RH, 4], [-0.5*CW, 22+RH, 1], [0.5*CW, 22+RH, 1], [1.5*CW, 22+RH, 4],
          [-0.5*CW, 22+RH*2, 2], [0.5*CW, 22+RH*2, 2],
        ];
        for (const [fx, fy, eType] of v) specs.push({ fx, fy, eType, hp: 1 });
      } else if (pat === 3) {
        // 스피더 군집 4×5
        for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++)
          specs.push({ fx: (c - 2) * CW, fy: 14 + r * RH, eType: 5, hp: 1 });
      } else if (pat === 4) {
        // 팬텀 혼성 3×4
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          const eType = r <= 1 ? 6 : 2;
          specs.push({ fx: (c - 1.5) * CW, fy: 22 + r * RH, eType, hp: eType === 6 ? 2 : 1 });
        }
      } else if (pat === 5) {
        // 엘리트 정예대 2×3
        for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++)
          specs.push({ fx: (c - 1) * CW * 1.4, fy: 26 + r * RH * 1.6, eType: 7, hp: 4 });
      } else if (pat === 6) {
        // 카오스 혼합 4행
        const chaos = [7, 3, 6, 4, 5, 7, 3, 4, 6, 5, 0, 1, 2, 7, 3, 4, 5, 6, 2, 1];
        let ti = 0;
        const rowCols = [3, 4, 5, 4];
        for (let r = 0; r < 4; r++) {
          const cols = rowCols[r];
          for (let c = 0; c < cols; c++) {
            const eType = chaos[ti++ % chaos.length];
            specs.push({ fx: (c - (cols - 1) / 2) * CW, fy: 14 + r * RH, eType, hp: hpForType(eType) });
          }
        }
      } else if (pat === 7) {
        // 실더 방벽진: 실더 5기가 전열을 이루고 리더가 후방 지원
        for (let c = 0; c < 5; c++)
          specs.push({ fx: (c - 2) * CW, fy: 22, eType: 10, hp: 2, shieldHp: 2 });
        for (let c = 0; c < 3; c++)
          specs.push({ fx: (c - 1) * CW * 1.4, fy: 22 + RH, eType: 0, hp: 2 });
      } else if (pat === 8) {
        // 힐러 호위 대형: 힐러를 뒤에 두고 퍼플·그린이 호위
        specs.push({ fx: -0.6 * CW, fy: 12, eType: 11, hp: 2 });
        specs.push({ fx: 0.6 * CW, fy: 12, eType: 11, hp: 2 });
        for (const c of [-1.5, -0.5, 0.5, 1.5])
          specs.push({ fx: c * CW, fy: 12 + RH, eType: 1, hp: 1 });
        for (let c = 0; c < 5; c++)
          specs.push({ fx: (c - 2) * CW, fy: 12 + RH * 2, eType: 2, hp: 1 });
      } else if (pat === 9) {
        // 스플리터 산개진: 스플리터와 그런트가 성기게 분산 배치
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
          const eType = (r + c) % 2 === 0 ? 9 : 2;
          specs.push({ fx: (c - 1.5) * CW * 1.25, fy: 18 + r * RH * 1.3, eType, hp: hpForType(eType) });
        }
      } else if (pat === 10) {
        // 미사일러 협공진: 양 측면 미사일러 + 중앙 리더 호위
        for (let r = 0; r < 3; r++) {
          specs.push({ fx: -2.3 * CW, fy: 18 + r * RH, eType: 8, hp: 2 });
          specs.push({ fx: 2.3 * CW, fy: 18 + r * RH, eType: 8, hp: 2 });
        }
        specs.push({ fx: 0, fy: 16, eType: 0, hp: 2 });
        specs.push({ fx: -0.7 * CW, fy: 16 + RH, eType: 1, hp: 1 });
        specs.push({ fx: 0.7 * CW, fy: 16 + RH, eType: 1, hp: 1 });
      } else {
        // 풀 카오스 믹스: 신규 적을 포함한 전 종류 혼합 4행
        const chaos2 = [7, 3, 6, 4, 5, 8, 9, 10, 11, 0, 1, 2, 7, 9, 4, 10, 6, 11, 5, 8, 3, 2, 1, 0];
        let ti = 0;
        const rowCols = [4, 5, 5, 4];
        for (let r = 0; r < 4; r++) {
          const cols = rowCols[r];
          for (let c = 0; c < cols; c++) {
            const eType = chaos2[ti++ % chaos2.length];
            specs.push({
              fx: (c - (cols - 1) / 2) * CW, fy: 12 + r * RH, eType,
              hp: hpForType(eType), shieldHp: eType === 10 ? 2 : undefined,
            });
          }
        }
      }
      return specs;
    };

    const pickPattern = (wave: number): number => {
      if (wave === 1) return 0;
      const recent = g.current.waveHistory;
      const candidates = Array.from({ length: PATTERN_COUNT }, (_, i) => i).filter(i => !recent.includes(i));
      const pool = candidates.length > 0 ? candidates : Array.from({ length: PATTERN_COUNT }, (_, i) => i);
      return pool[(Math.random() * pool.length) | 0];
    };

    const spawnWave = (wave: number) => {
      const W = canvas.width;
      const st = g.current;
      st.enemies = [];
      const now = Date.now();
      const CW = E_CW, RH = E_RH;
      const pat = pickPattern(wave);
      st.waveHistory = [...st.waveHistory, pat].slice(-3);
      const specs = buildPattern(pat, CW, RH);

      for (let i = 0; i < specs.length; i++) {
        const s = specs[i];
        st.enemies.push({
          id: st.nextId++, col: i, row: 0,
          hp: s.hp, maxHp: s.hp, alive: true,
          eType: s.eType,
          divePhase: 0,
          diveX: W / 2 + s.fx, diveY: s.fy,
          diveVX: 0, diveVY: 0, diveAngle: 0,
          lastFire: now + 500 + Math.random() * 2500,
          blinkVis: true, blinkNext: now + 800 + Math.random() * 400,
          formX: s.fx, formY: s.fy,
          shieldHp: s.shieldHp,
          healNext: s.eType === 11 ? now + 1500 + Math.random() * 1500 : undefined,
        });
      }

      st.formOX = 0;
      st.formVX = Math.min(2.8, 0.9 + (wave - 1) * 0.22);
      st.formDY = 0;
      st.waveTimer = -1;
      st.wave = wave;
      st.eBullets = [];
      st.boss = null;
    };

    const spawnBoss = () => {
      const st = g.current;
      st.enemies = [];
      st.eBullets = [];
      st.bossCount += 1;
      const maxHp = 40 + (st.bossCount - 1) * 20;
      st.boss = {
        x: canvas.width / 2, y: -40, vx: 1.6,
        hp: maxHp, maxHp,
        phase: "enter",
        lastFire: Date.now() + 900,
        lastBurst: Date.now() + 1600,
        bossCount: st.bossCount,
      };
      st.waveTimer = -1;
      setBossAlert(true);
      if (bossAlertTimeoutRef.current) window.clearTimeout(bossAlertTimeoutRef.current);
      bossAlertTimeoutRef.current = window.setTimeout(() => setBossAlert(false), 1800);
    };

    const enemyX = (e: SGEnemy, W: number) =>
      e.divePhase === 1 ? e.diveX : W / 2 + e.formX + g.current.formOX;
    const enemyY = (e: SGEnemy) =>
      e.divePhase === 1 ? e.diveY : e.formY + g.current.formDY;

    const drawEnemy = (x: number, y: number, e: SGEnemy) => {
      const { eType, hp, maxHp, blinkVis } = e;
      if (eType === 6 && !blinkVis) return;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      if (eType === 6) ctx.globalAlpha = 0.55;
      const p = 2;
      if (eType === 0) {
        // 오렌지 리더
        ctx.fillStyle = hp >= 2 ? "#f97316" : "#fde68a";
        ctx.fillRect(-6*p,-3*p,12*p,6*p);
        ctx.fillRect(-4*p,-5*p,8*p,2*p);
        ctx.fillRect(-4*p,-7*p,2*p,2*p);
        ctx.fillRect(2*p,-7*p,2*p,2*p);
        ctx.fillRect(-8*p,0,2*p,4*p);
        ctx.fillRect(6*p,0,2*p,4*p);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(-3*p,-2*p,2*p,2*p);
        ctx.fillRect(1*p,-2*p,2*p,2*p);
      } else if (eType === 1) {
        // 퍼플 미드
        ctx.fillStyle = "#a78bfa";
        ctx.fillRect(-5*p,-3*p,10*p,6*p);
        ctx.fillRect(-3*p,-5*p,6*p,2*p);
        ctx.fillRect(-4*p,-7*p,2*p,2*p);
        ctx.fillRect(2*p,-7*p,2*p,2*p);
        ctx.fillRect(-7*p,1*p,2*p,3*p);
        ctx.fillRect(-2*p,1*p,2*p,3*p);
        ctx.fillRect(2*p,1*p,2*p,3*p);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(-2*p,-2*p,2*p,2*p);
        ctx.fillRect(1*p,-2*p,2*p,2*p);
      } else if (eType === 2) {
        // 그린 그런트
        ctx.fillStyle = "#34d399";
        ctx.fillRect(-4*p,-2*p,8*p,5*p);
        ctx.fillRect(-3*p,-4*p,6*p,2*p);
        ctx.fillRect(-3*p,-6*p,2*p,2*p);
        ctx.fillRect(1*p,-6*p,2*p,2*p);
        ctx.fillRect(-6*p,2*p,2*p,3*p);
        ctx.fillRect(4*p,2*p,2*p,3*p);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(-2*p,-1*p,2*p,2*p);
        ctx.fillRect(1*p,-1*p,2*p,2*p);
      } else if (eType === 3) {
        // 방패병 (시안, 3HP)
        ctx.fillStyle = hp >= 2 ? "#06b6d4" : "#67e8f9";
        ctx.fillRect(-6*p,-4*p,12*p,7*p);
        ctx.fillRect(-4*p,-6*p,8*p,2*p);
        ctx.fillRect(-4*p,-8*p,2*p,2*p);
        ctx.fillRect(2*p,-8*p,2*p,2*p);
        if (hp > 1) {
          ctx.fillStyle = "rgba(186,248,255,0.9)";
          ctx.fillRect(-8*p,2*p,16*p,2*p);
          ctx.fillRect(-9*p,-1*p,2*p,7*p);
          ctx.fillRect(7*p,-1*p,2*p,7*p);
        }
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillRect(-3*p,-3*p,2*p,2*p);
        ctx.fillRect(1*p,-3*p,2*p,2*p);
      } else if (eType === 4) {
        // 봄버 (황금, 넓은 날개)
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-8*p,-2*p,16*p,5*p);
        ctx.fillRect(-5*p,-5*p,10*p,3*p);
        ctx.fillRect(-2*p,-7*p,4*p,2*p);
        ctx.fillRect(-12*p,0,4*p,3*p);
        ctx.fillRect(8*p,0,4*p,3*p);
        ctx.fillRect(-10*p,3*p,2*p,2*p);
        ctx.fillRect(8*p,3*p,2*p,2*p);
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(-2*p,-4*p,4*p,3*p);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(-1*p,-3*p,2*p,2*p);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-6*p,2*p,2*p,2*p);
        ctx.fillRect(-1*p,2*p,2*p,2*p);
        ctx.fillRect(4*p,2*p,2*p,2*p);
      } else if (eType === 5) {
        // 스피더 (핑크, 슬림)
        ctx.fillStyle = "#f472b6";
        ctx.fillRect(-3*p,-6*p,6*p,10*p);
        ctx.fillRect(-5*p,-2*p,10*p,4*p);
        ctx.fillRect(-9*p,0,4*p,2*p);
        ctx.fillRect(5*p,0,4*p,2*p);
        ctx.fillRect(-8*p,-2*p,2*p,2*p);
        ctx.fillRect(6*p,-2*p,2*p,2*p);
        ctx.fillRect(-1*p,-8*p,2*p,2*p);
        ctx.fillStyle = "#c026d3";
        ctx.fillRect(-2*p,4*p,4*p,2*p);
        ctx.fillStyle = "rgba(255,200,255,0.85)";
        ctx.fillRect(-1*p,-4*p,2*p,2*p);
      } else if (eType === 6) {
        // 팬텀 (반투명 유령)
        ctx.fillStyle = "rgba(200,200,255,0.95)";
        ctx.fillRect(-5*p,-4*p,10*p,8*p);
        ctx.fillRect(-3*p,-6*p,6*p,2*p);
        ctx.fillRect(-5*p,2*p,2*p,4*p);
        ctx.fillRect(3*p,2*p,2*p,4*p);
        ctx.fillRect(-3*p,4*p,2*p,3*p);
        ctx.fillRect(1*p,4*p,2*p,3*p);
        ctx.fillStyle = hp <= 1 ? "rgba(255,80,80,1)" : "rgba(140,60,255,1)";
        ctx.fillRect(-3*p,-2*p,2*p,2*p);
        ctx.fillRect(1*p,-2*p,2*p,2*p);
      } else if (eType === 7) {
        // 엘리트 (레드, 4HP, 대형)
        const hf = hp / maxHp;
        ctx.fillStyle = hf > 0.5 ? "#dc2626" : hf > 0.25 ? "#f97316" : "#fde68a";
        ctx.fillRect(-7*p,-4*p,14*p,8*p);
        ctx.fillRect(-5*p,-7*p,10*p,3*p);
        ctx.fillRect(-3*p,-9*p,6*p,2*p);
        ctx.fillRect(-2*p,-11*p,4*p,2*p);
        ctx.fillRect(-11*p,0,4*p,5*p);
        ctx.fillRect(7*p,0,4*p,5*p);
        ctx.fillRect(-13*p,2*p,2*p,3*p);
        ctx.fillRect(11*p,2*p,2*p,3*p);
        ctx.fillStyle = "#450a0a";
        ctx.fillRect(-6*p,4*p,2*p,4*p);
        ctx.fillRect(4*p,4*p,2*p,4*p);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(-4*p,-2*p,2*p,3*p);
        ctx.fillRect(2*p,-2*p,2*p,3*p);
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-6*p,-13*p,12*p,2*p);
        ctx.fillStyle = hf > 0.5 ? "#22c55e" : hf > 0.25 ? "#f59e0b" : "#ef4444";
        ctx.fillRect(-6*p,-13*p,Math.round(12*hf)*p,2*p);
      } else if (eType === 8) {
        // 미사일러 (주황, 로켓형)
        ctx.fillStyle = "#ea580c";
        ctx.fillRect(-4*p,-8*p,8*p,12*p);
        ctx.fillStyle = "#7c2d12";
        ctx.fillRect(-4*p,-8*p,8*p,3*p);
        ctx.fillRect(-7*p,2*p,3*p,4*p);
        ctx.fillRect(4*p,2*p,3*p,4*p);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(-2*p,-6*p,4*p,3*p);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(-2*p,5*p,4*p,3*p);
      } else if (eType === 9) {
        // 스플리터 (라임, 이중 로브 — 죽으면 분열)
        ctx.fillStyle = "#a3e635";
        ctx.beginPath(); ctx.arc(-3*p,0,5*p,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3*p,0,5*p,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "#4d7c0f";
        ctx.beginPath(); ctx.arc(-3*p,0,2*p,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3*p,0,2*p,0,Math.PI*2); ctx.fill();
      } else if (eType === 10) {
        // 실더 (파랑, 배리어 보유)
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(-5*p,-4*p,10*p,8*p);
        ctx.fillRect(-3*p,-6*p,6*p,2*p);
        ctx.fillRect(-7*p,0,2*p,4*p);
        ctx.fillRect(5*p,0,2*p,4*p);
        if ((e.shieldHp ?? 0) > 0) {
          ctx.strokeStyle = "rgba(125,211,252,0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0,0,11*p*0.75,0,Math.PI*2); ctx.stroke();
        }
      } else if (eType === 11) {
        // 힐러 (연두, 십자 — 아군 회복)
        ctx.fillStyle = "#6ee7b7";
        ctx.fillRect(-5*p,-4*p,10*p,8*p);
        ctx.fillRect(-3*p,-6*p,6*p,2*p);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-1*p,-2*p,2*p,6*p);
        ctx.fillRect(-3*p,0,6*p,2*p);
      }
      ctx.restore();
    };

    const drawBoss = (b: SGBoss) => {
      const p = 3;
      const hf = b.hp / b.maxHp;
      ctx.save();
      ctx.translate(Math.round(b.x), Math.round(b.y));
      ctx.fillStyle = hf > 0.5 ? "#450a0a" : hf > 0.25 ? "#7f1d1d" : "#dc2626";
      ctx.fillRect(-10*p,-6*p,20*p,10*p);
      ctx.fillRect(-6*p,-9*p,12*p,3*p);
      ctx.fillRect(-3*p,-12*p,6*p,3*p);
      ctx.fillRect(-16*p,-2*p,6*p,4*p);
      ctx.fillRect(10*p,-2*p,6*p,4*p);
      ctx.fillRect(-18*p,2*p,3*p,4*p);
      ctx.fillRect(15*p,2*p,3*p,4*p);
      ctx.fillStyle = "#111827";
      ctx.fillRect(-6*p,4*p,3*p,5*p);
      ctx.fillRect(3*p,4*p,3*p,5*p);
      ctx.fillStyle = "rgba(255,60,60,0.95)";
      ctx.fillRect(-5*p,-3*p,3*p,3*p);
      ctx.fillRect(2*p,-3*p,3*p,3*p);
      // 항상 표시되는 HP바
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(-20*p,-20*p,40*p,4*p);
      ctx.fillStyle = hf > 0.5 ? "#22c55e" : hf > 0.25 ? "#f59e0b" : "#ef4444";
      ctx.fillRect(-20*p,-20*p,Math.max(0,Math.round(40*hf))*p,4*p);
      ctx.restore();
    };

    // 캔버스 버퍼 크기를 실제 렌더링 박스(wrapRef)와 동기화.
    // window resize 이벤트만 감시하면 flex 레이아웃 리플로우(보스 알림/미션 텍스트 줄바뀜 등)로
    // 박스 크기가 바뀌어도 버퍼가 갱신되지 않아 canvas가 CSS로 스케일되고, 플레이어 위치(DOM
    // 오버레이, 버퍼 좌표 기준)가 화면 밖으로 밀려나는 문제가 있었음 — ResizeObserver로 교체.
    const syncCanvasSize = () => {
      const w = wrapRef.current?.clientWidth ?? 400;
      const h = wrapRef.current?.clientHeight ?? 440;
      const newW = Math.max(280, w);
      const newH = Math.max(360, h);
      if (canvas.width !== newW) canvas.width = newW;
      if (canvas.height !== newH) canvas.height = newH;
    };
    syncCanvasSize();
    g.current.px = canvas.width / 2;
    g.current.py = canvas.height - 60;

    const resizeObserver = new ResizeObserver(() => syncCanvasSize());
    if (wrapRef.current) resizeObserver.observe(wrapRef.current);
    window.addEventListener("resize", syncCanvasSize);

    spawnWave(1);

    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const dtf = dt / 16.67;
      const st = g.current;
      const W = canvas.width, H = canvas.height;
      const realNow = Date.now();
      const dead = st.deadUntil > realNow;

      if (!clearedRef.current && !dead) {
        st.elapsed += dt;

        // 플레이어 이동
        let mx = 0, my = 0;
        const k = st.keys;
        if (k.has("ArrowLeft") || k.has("a") || k.has("A")) mx -= 1;
        if (k.has("ArrowRight") || k.has("d") || k.has("D")) mx += 1;
        if (k.has("ArrowUp") || k.has("w") || k.has("W")) my -= 1;
        if (k.has("ArrowDown") || k.has("s") || k.has("S")) my += 1;
        if (st.pointerX >= 0) {
          const tdx = st.pointerX - st.px, tdy = st.pointerY - st.py;
          const td = Math.sqrt(tdx*tdx + tdy*tdy);
          if (td > 8) { mx = tdx/td; my = tdy/td; }
        }
        if (mx !== 0 && my !== 0) { const d = Math.sqrt(mx*mx+my*my); mx/=d; my/=d; }
        const spd = P_SPEED * dtf;
        st.px = Math.max(P_HIT_R+4, Math.min(W-P_HIT_R-4, st.px + mx*spd));
        st.py = Math.max(H*0.32, Math.min(H-40, st.py + my*spd));

        // 자동 발사
        const fireInterval = 260;
        if (realNow - st.lastFire > fireInterval) {
          st.lastFire = realNow;
          st.pBullets.push({ id: st.nextId++, x: st.px, y: st.py - 20 });
        }

        // 플레이어 탄 이동 + 적/보스 충돌
        const aliveEnemies = st.enemies.filter(e => e.alive);
        st.pBullets = st.pBullets.filter(b => {
          b.y -= 9 * dtf;
          if (b.y < -10) return false;
          for (const e of aliveEnemies) {
            if (e.eType === 6 && !e.blinkVis) continue; // 팬텀 비가시 = 무적
            const ex = enemyX(e, W), ey = enemyY(e);
            const dx = b.x - ex, dy = b.y - ey;
            const hitR = e.eType === 5 ? 10 : e.eType === 7 ? 16 : 13;
            if (Math.sqrt(dx*dx+dy*dy) < hitR) {
              if (e.eType === 10 && (e.shieldHp ?? 0) > 0) {
                e.shieldHp = (e.shieldHp ?? 0) - 1;
                return false;
              }
              e.hp--;
              if (e.hp <= 0) {
                e.alive = false;
                st.killCount++;
                const kills = e.eType === 7 ? 3 : e.eType === 3 ? 2 : 1;
                for (let k = 0; k < kills; k++) onKillRef.current();
                if (e.eType === 9) {
                  // 스플리터: 격추 시 미니 그런트 2기로 분열
                  for (const sgn of [-1, 1]) {
                    st.enemies.push({
                      id: st.nextId++, col: e.col, row: e.row,
                      hp: 1, maxHp: 1, alive: true,
                      eType: 2,
                      divePhase: 1,
                      diveX: ex + sgn * 14, diveY: ey,
                      diveVX: sgn * 1.2, diveVY: 3.4,
                      diveAngle: Math.atan2(3.4, sgn * 1.2),
                      lastFire: realNow + 400 + Math.random() * 800,
                      blinkVis: true, blinkNext: realNow + 1000,
                      formX: e.formX, formY: e.formY,
                    });
                  }
                }
              }
              return false;
            }
          }
          if (st.boss && st.boss.hp > 0) {
            const dx = b.x - st.boss.x, dy = b.y - st.boss.y;
            if (Math.sqrt(dx*dx+dy*dy) < 30) {
              st.boss.hp--;
              if (st.boss.hp <= 0) {
                // 중간보스 처치 보상: 일반 몹보다 훨씬 큰 레이드 데미지 버스트
                const burst = Math.min(50, 15 + 5 * st.boss.bossCount);
                for (let k = 0; k < burst; k++) onKillRef.current();
                st.boss = null;
                st.waveTimer = 1000;
              }
              return false;
            }
          }
          return true;
        });

        // 편대 이동
        const inForm = st.enemies.filter(e => e.alive && e.divePhase === 0);
        if (inForm.length > 0) {
          st.formOX += st.formVX * dtf;
          const maxFormX = inForm.reduce((m, e) => Math.max(m, Math.abs(e.formX)), 0);
          const maxOX = Math.max(16, W / 2 - maxFormX - 24);
          if (st.formOX > maxOX) st.formVX = -Math.abs(st.formVX);
          if (st.formOX < -maxOX) st.formVX = Math.abs(st.formVX);
          st.formDY = Math.min(60, st.formDY + 0.012 * dtf);
        }

        // 다이브 공격 (갤로그 스타일)
        const diveInterval = Math.max(1200, 3500 - st.elapsed / 90);
        if (realNow - st.lastDive > diveInterval) {
          const speeders = inForm.filter(e => e.eType === 5);
          const maxFY = inForm.reduce((m, e) => Math.max(m, e.formY + st.formDY), 0);
          const frontRow = inForm.filter(e => e.formY + st.formDY >= maxFY - 4);
          const pool = speeders.length > 0 ? speeders : frontRow.length > 0 ? frontRow : inForm;
          if (pool.length > 0) {
            st.lastDive = realNow;
            // 봄버·엘리트는 2기 동시 다이브
            const chosen = pool[(Math.random() * pool.length) | 0];
            const diveCount = (chosen.eType === 4 || chosen.eType === 7) ? Math.min(2, pool.length) : 1;
            const shuffled = pool.slice().sort(() => Math.random() - 0.5);
            for (let d = 0; d < diveCount; d++) {
              const e = shuffled[d];
              if (e.divePhase === 1) continue;
              e.divePhase = 1;
              e.diveX = enemyX(e, W);
              e.diveY = enemyY(e);
              const dspd = e.eType === 5 ? 6.5 : e.eType === 7 ? 4.5 : 3.8;
              e.diveAngle = Math.PI * 0.9 + (Math.random() - 0.5) * 0.7;
              e.diveVX = Math.sin(e.diveAngle) * dspd;
              e.diveVY = Math.cos(e.diveAngle) * dspd;
            }
          }
        }

        // 다이버 이동
        for (const e of st.enemies) {
          if (!e.alive || e.divePhase === 0) continue;
          const angleRate = e.eType === 5 ? 0.07 : 0.04;
          e.diveAngle += angleRate * dtf;
          const dspd = e.eType === 5 ? 6.5 : e.eType === 7 ? 4.5 : 3.8;
          e.diveVX = Math.sin(e.diveAngle) * dspd;
          e.diveVY = Math.cos(e.diveAngle) * dspd;
          e.diveX += e.diveVX * dtf;
          e.diveY += e.diveVY * dtf;
          if (e.diveY > H + 20 || e.diveX < -20 || e.diveX > W + 20) {
            e.divePhase = 0;
            e.diveX = enemyX(e, W);
            e.diveY = enemyY(e);
          }
        }

        // 팬텀 깜빡임
        for (const e of st.enemies) {
          if (!e.alive || e.eType !== 6) continue;
          if (realNow >= e.blinkNext) {
            e.blinkVis = !e.blinkVis;
            e.blinkNext = realNow + (e.blinkVis ? 700 + Math.random() * 600 : 300 + Math.random() * 300);
          }
        }

        // 힐러 회복 (대형 내 hp가 가장 낮은 아군을 우선 회복)
        for (const e of st.enemies) {
          if (!e.alive || e.eType !== 11 || e.divePhase !== 0) continue;
          if (realNow >= (e.healNext ?? 0)) {
            const targets = st.enemies.filter(o => o.alive && o !== e && o.hp < o.maxHp && o.divePhase === 0);
            if (targets.length > 0) {
              targets.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
              const tgt = targets[0];
              tgt.hp = Math.min(tgt.maxHp, tgt.hp + 1);
              st.healFx.push({ x: enemyX(tgt, W), y: enemyY(tgt), until: realNow + 500 });
            }
            e.healNext = realNow + 3000 + Math.random() * 1500;
          }
        }

        // 적 탄막 발사
        const fireRate = Math.max(380, 1500 - st.elapsed / 16);
        for (const e of st.enemies) {
          if (!e.alive) continue;
          if (e.eType === 11) continue; // 힐러는 공격하지 않음
          if (realNow - e.lastFire > fireRate) {
            e.lastFire = realNow + Math.random() * 350;
            const ex = enemyX(e, W), ey = enemyY(e);
            const dx = st.px - ex, dy = st.py - ey;
            const d = Math.sqrt(dx*dx+dy*dy) || 1;
            const baseSpd = Math.min(5.0, 2.4 + st.elapsed / 45000);
            if (e.eType === 4) {
              // 봄버: 3방향 부채꼴 탄막
              const baseAng = Math.atan2(dy, dx);
              for (const offset of [-0.32, 0, 0.32]) {
                const ang = baseAng + offset;
                st.eBullets.push({ id: st.nextId++, x: ex, y: ey+8, vx: Math.cos(ang)*baseSpd, vy: Math.sin(ang)*baseSpd, kind: 1 });
              }
            } else if (e.eType === 7) {
              // 엘리트: 좌우 쌍발
              st.eBullets.push({ id: st.nextId++, x: ex-4, y: ey+8, vx: (dx/d)*(baseSpd+0.8), vy: (dy/d)*(baseSpd+0.8), kind: 2 });
              st.eBullets.push({ id: st.nextId++, x: ex+4, y: ey+8, vx: (dx/d)*(baseSpd+0.8), vy: (dy/d)*(baseSpd+0.8), kind: 2 });
            } else if (e.eType === 5) {
              // 스피더: 고속 단발
              st.eBullets.push({ id: st.nextId++, x: ex, y: ey+8, vx: (dx/d)*(baseSpd*1.7), vy: (dy/d)*(baseSpd*1.7), kind: 3 });
            } else if (e.eType === 8) {
              // 미사일러: 5방향 링 탄막
              for (let i = 0; i < 5; i++) {
                const ang = (i / 5) * Math.PI * 2;
                st.eBullets.push({ id: st.nextId++, x: ex, y: ey+8, vx: Math.cos(ang)*baseSpd*0.9, vy: Math.sin(ang)*baseSpd*0.9, kind: 4 });
              }
            } else {
              st.eBullets.push({ id: st.nextId++, x: ex, y: ey+8, vx: (dx/d)*baseSpd, vy: (dy/d)*baseSpd, kind: 0 });
            }
          }
        }

        // 중간보스 이동 + 공격
        if (st.boss) {
          const b = st.boss;
          if (b.phase === "enter") {
            b.y += 1.2 * dtf;
            if (b.y >= 70) { b.y = 70; b.phase = "fight"; }
          } else {
            b.x += b.vx * dtf;
            if (b.x < 60) { b.x = 60; b.vx = Math.abs(b.vx); }
            if (b.x > W - 60) { b.x = W - 60; b.vx = -Math.abs(b.vx); }
            const burstInterval = Math.max(1500, 3200 - b.bossCount * 150);
            if (realNow - b.lastBurst > burstInterval) {
              b.lastBurst = realNow;
              for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2;
                st.eBullets.push({ id: st.nextId++, x: b.x, y: b.y+10, vx: Math.cos(ang)*3.2, vy: Math.sin(ang)*3.2, kind: 5 });
              }
            }
            if (realNow - b.lastFire > 650) {
              b.lastFire = realNow;
              const dx = st.px - b.x, dy = st.py - b.y;
              const baseAng = Math.atan2(dy, dx);
              for (const offset of [-0.18, 0, 0.18]) {
                const ang = baseAng + offset;
                st.eBullets.push({ id: st.nextId++, x: b.x, y: b.y+10, vx: Math.cos(ang)*4.4, vy: Math.sin(ang)*4.4, kind: 6 });
              }
            }
          }
        }

        // 적 탄 이동 + 플레이어 충돌
        const inv = realNow < st.invUntil;
        st.eBullets = st.eBullets.filter(b => {
          b.x += b.vx * dtf;
          b.y += b.vy * dtf;
          if (b.x < -10 || b.x > W+10 || b.y < -10 || b.y > H+10) return false;
          if (!inv) {
            const dx = b.x - st.px, dy = b.y - st.py;
            if (Math.sqrt(dx*dx+dy*dy) < P_HIT_R + 4) {
              st.hits++;
              setLives(Math.max(0, MAX_HITS - st.hits));
              st.invUntil = realNow + 1500;
              if (st.hits >= MAX_HITS) {
                // 체력 소진 → 게임 종료(재입장 불가), 잠시 후 로비로 복귀
                st.deadUntil = Infinity;
                st.eBullets = [];
                st.pBullets = [];
                setDeadUntil(Infinity);
                onDiedRef.current?.();
                window.setTimeout(() => onGameOverRef.current?.(), 1600);
              }
              return false;
            }
          }
          return true;
        });

        // 웨이브 클리어 체크 (보스 인카운터 중에는 별도 처리)
        if (!st.boss) {
          if (st.enemies.length > 0 && st.enemies.every(e => !e.alive) && st.waveTimer < 0) {
            st.waveTimer = 1400;
          }
          if (st.waveTimer >= 0) {
            st.waveTimer -= dt;
            if (st.waveTimer < 0) {
              if (st.killCount >= st.bossThreshold) {
                st.killCount = 0;
                spawnBoss();
              } else {
                spawnWave(st.wave + 1);
              }
            }
          }
        }
      }

      // ── 렌더링 ──
      ctx.clearRect(0, 0, W, H);

      // 배경
      const bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,"#06060f");
      bg.addColorStop(1,"#0d1020");
      ctx.fillStyle = bg;
      ctx.fillRect(0,0,W,H);

      // 별
      for (let i=0;i<60;i++) {
        const sx=(i*137.5+11)%W, sy=(i*91.3+19)%H;
        ctx.fillStyle=`rgba(255,255,255,${0.2+(i%5)*0.1})`;
        ctx.beginPath();
        ctx.arc(sx,sy,i%4===0?1.4:0.7,0,Math.PI*2);
        ctx.fill();
      }

      // 적 렌더링
      for (const e of g.current.enemies) {
        if (!e.alive) continue;
        drawEnemy(enemyX(e, W), enemyY(e), e);
      }

      // 중간보스 렌더링
      if (g.current.boss) drawBoss(g.current.boss);

      // 힐 이펙트
      g.current.healFx = g.current.healFx.filter(fx => fx.until > realNow);
      for (const fx of g.current.healFx) {
        const life = 1 - (fx.until - realNow) / 500;
        ctx.strokeStyle = `rgba(110,231,183,${Math.max(0, 1 - life)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, 6 + life * 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 플레이어 탄
      for (const b of g.current.pBullets) {
        const bgrad = ctx.createLinearGradient(b.x, b.y-14, b.x, b.y+2);
        bgrad.addColorStop(0,"rgba(80,255,160,0)");
        bgrad.addColorStop(0.5,"rgba(80,255,160,0.6)");
        bgrad.addColorStop(1,"rgba(120,255,200,0.9)");
        ctx.fillStyle = bgrad;
        ctx.fillRect(b.x-3, b.y-14, 6, 16);
        ctx.fillStyle = "#ccffe8";
        ctx.fillRect(Math.round(b.x)-1, Math.round(b.y)-10, 2, 10);
      }

      // 적 탄 (종류별 색상)
      for (const b of g.current.eBullets) {
        if (b.kind === 1) {
          // 봄버 탄 (황금)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,8);
          eg.addColorStop(0,"rgba(255,210,0,0.95)");
          eg.addColorStop(0.5,"rgba(200,140,0,0.5)");
          eg.addColorStop(1,"rgba(120,80,0,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,8,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#ffe066"; ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
        } else if (b.kind === 2) {
          // 엘리트 탄 (보라)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,6);
          eg.addColorStop(0,"rgba(180,50,255,0.95)");
          eg.addColorStop(0.5,"rgba(120,0,200,0.5)");
          eg.addColorStop(1,"rgba(60,0,120,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,6,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#d580ff"; ctx.beginPath(); ctx.arc(b.x,b.y,2.5,0,Math.PI*2); ctx.fill();
        } else if (b.kind === 3) {
          // 스피더 탄 (핑크, 소형 고속)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,5);
          eg.addColorStop(0,"rgba(255,100,200,0.95)");
          eg.addColorStop(0.5,"rgba(200,0,120,0.4)");
          eg.addColorStop(1,"rgba(120,0,60,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#ff80cc"; ctx.beginPath(); ctx.arc(b.x,b.y,2,0,Math.PI*2); ctx.fill();
        } else if (b.kind === 4) {
          // 미사일러 탄 (주황 링)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,7);
          eg.addColorStop(0,"rgba(255,150,50,0.95)");
          eg.addColorStop(0.5,"rgba(220,90,0,0.5)");
          eg.addColorStop(1,"rgba(140,50,0,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,7,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#ffcc80"; ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill();
        } else if (b.kind === 5) {
          // 보스 방사형 탄 (진홍)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,8);
          eg.addColorStop(0,"rgba(255,40,40,0.95)");
          eg.addColorStop(0.5,"rgba(140,0,0,0.5)");
          eg.addColorStop(1,"rgba(60,0,0,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,8,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#ff9999"; ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill();
        } else if (b.kind === 6) {
          // 보스 조준탄 (크림슨)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,7);
          eg.addColorStop(0,"rgba(255,255,255,0.95)");
          eg.addColorStop(0.5,"rgba(220,20,60,0.6)");
          eg.addColorStop(1,"rgba(120,0,30,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,7,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#ffe6e6"; ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill();
        } else {
          // 기본 탄 (빨강)
          const eg = ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,7);
          eg.addColorStop(0,"rgba(255,80,50,0.95)");
          eg.addColorStop(0.5,"rgba(220,20,0,0.5)");
          eg.addColorStop(1,"rgba(140,0,0,0)");
          ctx.fillStyle=eg; ctx.beginPath(); ctx.arc(b.x,b.y,7,0,Math.PI*2); ctx.fill();
          ctx.fillStyle="#ff8866"; ctx.beginPath(); ctx.arc(b.x,b.y,3,0,Math.PI*2); ctx.fill();
        }
      }

      // 플레이어 발광
      if (!dead) {
        const inv2 = realNow < g.current.invUntil;
        const blink = inv2 && Math.floor(realNow/80)%2===0;
        if (!blink) {
          const pg = ctx.createRadialGradient(st.px,st.py,0,st.px,st.py,22);
          pg.addColorStop(0,inv2?"rgba(255,200,80,0.55)":"rgba(80,200,255,0.45)");
          pg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=pg;
          ctx.beginPath();
          ctx.arc(st.px,st.py,22,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.85)";
          ctx.beginPath();
          ctx.arc(st.px,st.py,2.5,0,Math.PI*2);
          ctx.fill();
        }
        if (playerRef.current) {
          playerRef.current.style.left=`${Math.round(st.px-22)}px`;
          playerRef.current.style.top=`${Math.round(st.py-22)}px`;
          playerRef.current.style.opacity=blink?"0.25":"1";
        }
      } else if (playerRef.current) {
        playerRef.current.style.opacity="0";
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncCanvasSize);
      if (bossAlertTimeoutRef.current) window.clearTimeout(bossAlertTimeoutRef.current);
    };
  }, []);

  const onPtrMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    g.current.pointerX = e.clientX - rect.left;
    g.current.pointerY = e.clientY - rect.top;
  }, []);
  const onPtrEnd = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    g.current.pointerX = -1;
    g.current.pointerY = -1;
  }, []);

  const isDead = deadUntil > 0;

  return (
    <div
      ref={wrapRef}
      className="relative mx-3 mb-2 mt-1 flex-1 select-none overflow-hidden rounded-xl border border-border"
      style={{ minHeight: 360, touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        onPointerDown={onPtrMove}
        onPointerMove={onPtrMove}
        onPointerUp={onPtrEnd}
        onPointerLeave={onPtrEnd}
      />
      <div
        ref={playerRef}
        className="pointer-events-none absolute"
        style={{ left: 0, top: 0 }}
      >
        <PixelSprite
          type={charDef.type}
          colors={charDef.colors}
          characterId={charDef.id}
          size={44}
        />
      </div>
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-0.5">
        {Array.from({ length: MAX_HITS }).map((_, i) => (
          <Heart
            key={i}
            className={`h-4 w-4 ${i < lives ? "fill-red-500 text-red-500" : "text-gray-400/60"}`}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white">
        {t("raid.bullet_hint")}
      </div>
      {bossAlert && (
        <div className="pointer-events-none absolute left-1/2 top-10 z-20 -translate-x-1/2 animate-pulse rounded-full bg-red-600/85 px-4 py-1.5 text-sm font-extrabold text-white shadow-lg flex items-center gap-1.5">
          <TriangleAlert className="h-4 w-4" /> {t("raid.boss_incoming")}
        </div>
      )}
      {isDead && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-black/72 text-center text-white">
          <div className="text-lg font-extrabold">{t("raid.eliminated")}</div>
          <div className="px-6 text-xs text-white/80">{t("raid.eliminated_msg")}</div>
        </div>
      )}
    </div>
  );
}

export default function RaidPage() {
  const { rewardSummary, openEgg, openEggs, refreshRewardsWithCheck } =
    useAppData();
  const { t, lang } = useLang();
  const bossName = (id: number | undefined) =>
    id ? getCharName(charById(id), lang) : "";
  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;

  const RAIDS: Record<
    number,
    { name: string; bossName: string; desc: string }
  > = {
    1: {
      name: t("raid.type.1.name"),
      bossName: t("raid.type.1.boss"),
      desc: t("raid.type.1.desc"),
    },
    5: {
      name: t("raid.type.5.name"),
      bossName: t("raid.type.5.boss"),
      desc: t("raid.type.5.desc"),
    },
  };
  const RAID_MISSION_LABELS: Record<number, TranslationKey> = {
    1: "raid.type.1.mission_label",
    5: "raid.type.5.mission_label",
  };
  const RAID_MISSION_HINTS: Partial<Record<number, TranslationKey>> = {
    1: "raid.type.1.mission_hint",
    5: "raid.type.5.mission_hint",
  };
  const seasonCopy = (season?: RaidSeasonInfo) => {
    if (!season) return null;
    const map: Record<string, { ko: string; ja: string; en: string; effectKo: string; effectJa: string; effectEn: string }> = {
      dawn: {
        ko: "새벽 시즌",
        ja: "夜明けシーズン",
        en: "Dawn Season",
        effectKo: "보스 HP -10%",
        effectJa: "ボスHP -10%",
        effectEn: "Boss HP -10%",
      },
      day: {
        ko: "주간 시즌",
        ja: "昼シーズン",
        en: "Day Season",
        effectKo: "기본 밸런스",
        effectJa: "基本バランス",
        effectEn: "Standard balance",
      },
      dusk: {
        ko: "황혼 시즌",
        ja: "夕暮れシーズン",
        en: "Dusk Season",
        effectKo: "피해량 +15%",
        effectJa: "ダメージ +15%",
        effectEn: "Damage +15%",
      },
      night: {
        ko: "심야 시즌",
        ja: "深夜シーズン",
        en: "Night Season",
        effectKo: "보스 HP +15%, 피해량 +10%",
        effectJa: "ボスHP +15%、ダメージ +10%",
        effectEn: "Boss HP +15%, damage +10%",
      },
    };
    const item = map[season.id];
    if (!item) return { label: season.label, effect: season.effect };
    return {
      label: lang === "ja" ? item.ja : lang === "en" ? item.en : item.ko,
      effect: lang === "ja" ? item.effectJa : lang === "en" ? item.effectEn : item.effectKo,
    };
  };
  const patternCopy = (pattern?: RaidPatternInfo) => {
    if (!pattern) return null;
    const map: Record<string, { ko: string; ja: string; en: string; hintKo: string; hintJa: string; hintEn: string }> = {
      rush: {
        ko: "연속 돌진",
        ja: "連続突進",
        en: "Rush Chain",
        hintKo: "점프 성공 피해량이 소폭 증가합니다.",
        hintJa: "ジャンプ成功時のダメージが少し増加します。",
        hintEn: "Successful jumps deal slightly more damage.",
      },
      heavy_wall: {
        ko: "중압 방벽",
        ja: "重圧障壁",
        en: "Heavy Wall",
        hintKo: "보스 체력이 증가합니다.",
        hintJa: "ボスHPが増加します。",
        hintEn: "Boss HP is increased.",
      },
      swarm: {
        ko: "군단 소환",
        ja: "軍団召喚",
        en: "Swarm Call",
        hintKo: "격추 피해량이 증가합니다.",
        hintJa: "撃墜ダメージが増加します。",
        hintEn: "Kill damage is increased.",
      },
      arcane_shield: {
        ko: "마력 보호막",
        ja: "魔力バリア",
        en: "Arcane Shield",
        hintKo: "보스 체력이 크게 증가합니다.",
        hintJa: "ボスHPが大きく増加します。",
        hintEn: "Boss HP is heavily increased.",
      },
    };
    const item = map[pattern.id];
    if (!item) return { label: pattern.label, hint: pattern.hint };
    return {
      label: lang === "ja" ? item.ja : lang === "en" ? item.en : item.ko,
      hint: lang === "ja" ? item.hintJa : lang === "en" ? item.hintEn : item.hintKo,
    };
  };

  const EGG_LABEL: Record<string, string> = {
    normal: t("egg.normal"),
    big: t("egg.big"),
    golden: t("egg.golden"),
  };

  const EGG_META: {
    type: EggType;
    name: string;
    range: string;
    tint: string;
  }[] = [
    {
      type: "normal",
      name: t("egg.normal"),
      range: t("egg.range.normal"),
      tint: "from-gray-200 to-gray-300",
    },
    {
      type: "big",
      name: t("egg.big"),
      range: t("egg.range.big"),
      tint: "from-sky-200 to-blue-300",
    },
    {
      type: "golden",
      name: t("egg.golden"),
      range: t("egg.range.golden"),
      tint: "from-amber-200 to-yellow-400",
    },
  ];

  const eggCounts: Record<EggType, number> = {
    normal: rewardSummary.normalEggs,
    big: rewardSummary.bigEggs,
    golden: rewardSummary.goldenEggs,
  };
  const [opening, setOpening] = useState<EggType | null>(null);
  const [eggResult, setEggResult] = useState<EggOpenResult | null>(null);
  const [eggBatchResults, setEggBatchResults] = useState<{
    type: EggType;
    results: EggOpenResult[];
  } | null>(null);

  const handleOpenEgg = async (type: EggType) => {
    if (eggCounts[type] <= 0 || opening) return;
    setOpening(type);
    try {
      const result = await openEgg(type);
      setEggResult(result);
    } catch {
      /* ignore */
    } finally {
      setOpening(null);
    }
  };

  const handleOpenEgg10 = async (type: EggType) => {
    if (eggCounts[type] < 10 || opening) return;
    setOpening(type);
    try {
      const results = await openEggs(type, 10);
      setEggBatchResults({ type, results });
    } catch {
      /* ignore */
    } finally {
      setOpening(null);
    }
  };

  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [raidType, setRaidType] = useState(1);
  const [lobby, setLobby] = useState<
    Record<
      number,
      {
        count: number;
        cooldownUntil: number;
        bossCharId?: number;
        currentHp?: number;
        maxHp?: number;
        season?: RaidSeasonInfo;
        pattern?: RaidPatternInfo;
      }
    >
  >({
    1: { count: 0, cooldownUntil: 0 },
    5: { count: 0, cooldownUntil: 0 },
  });
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<RaidState | null>(null);
  const [self, setSelf] = useState<SelfInfo | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [reward, setReward] = useState<Reward | null>(null);
  const [full, setFull] = useState(false);
  const [hit, setHit] = useState(false);
  const [bossLine, setBossLine] = useState<string>("");
  const [damageNums, setDamageNums] = useState<
    { id: number; x: number; dmg: number }[]
  >([]);
  const [banned, setBanned] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [rankingsModal, setRankingsModal] = useState<{
    raidType: number;
    rankings: RankEntry[];
  } | null>(null);
  const [jumpPlayerLives, setJumpPlayerLives] = useState<PlayerLiveMap>({});
  const [eliminated, setEliminated] = useState(false);
  const [showRewardGuide, setShowRewardGuide] = useState(false);
  const prevHp = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const refreshRewardsRef = useRef(refreshRewardsWithCheck);
  refreshRewardsRef.current = refreshRewardsWithCheck;

  // 보스 HP 감소 감지 → 피격 연출
  useEffect(() => {
    if (state == null) return;
    if (prevHp.current != null && state.hp < prevHp.current) {
      setHit(true);
      const t = setTimeout(() => setHit(false), 380);
      prevHp.current = state.hp;
      return () => clearTimeout(t);
    }
    prevHp.current = state.hp;
  }, [state?.hp]);

  // 쿨타임 카운트다운용 now 갱신
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const s = getRaidSocket();
    const onLobby = (
      d: Record<
        number,
        {
          count: number;
          cooldownUntil: number;
          bossCharId?: number;
          currentHp?: number;
          maxHp?: number;
          season?: RaidSeasonInfo;
          pattern?: RaidPatternInfo;
        }
      >,
    ) => setLobby((p) => ({ ...p, ...d }));
    const onState = (d: RaidState) => setState(d);
    const onSelf = (d: SelfInfo) => setSelf(d);
    const onFeedback = (d: { text: string }) => {
      setFeedback(d.text);
      timers.current.push(setTimeout(() => setFeedback(""), 1500));
    };
    const onCleared = (d: {
      reward: Reward;
      rank?: number;
      rankings?: RankEntry[];
      raidType?: number;
    }) => {
      setReward(d.reward);
      setMyRank(d.rank ?? null);
      setRankings(d.rankings ?? []);
      refreshRewardsRef.current().catch(() => undefined);
      if (d.raidType != null) {
        const raw = localStorage.getItem("kebo_raid_first_clears");
        const clears: Record<number, boolean> = raw ? JSON.parse(raw) : {};
        if (!clears[d.raidType]) {
          clears[d.raidType] = true;
          localStorage.setItem(
            "kebo_raid_first_clears",
            JSON.stringify(clears),
          );
        }
      }
    };
    const onFull = () => {
      setFull(true);
      timers.current.push(setTimeout(() => setFull(false), 2500));
    };
    const onCooldown = (d: { raidType: number; until: number }) => {
      setLobby((p) => ({
        ...p,
        [d.raidType]: {
          ...p[d.raidType],
          count: p[d.raidType]?.count ?? 0,
          cooldownUntil: d.until,
        },
      }));
      setView("lobby");
    };
    const onBanned = () => {
      setBanned(true);
      setView("lobby");
    };
    const onBossHit = (d: {
      line: string;
      hp?: number;
      maxHp?: number;
      dmg?: number;
    }) => {
      setBossLine(d.line);
      timers.current.push(setTimeout(() => setBossLine(""), 2200));
      if (d.hp !== undefined) {
        setState((prev) => (prev ? { ...prev, hp: d.hp! } : prev));
      }
      const id = Date.now();
      const x = 30 + Math.random() * 40;
      const dmg = d.dmg ?? 1;
      setDamageNums((p) => [...p.slice(-4), { id, x, dmg }]);
      timers.current.push(setTimeout(() => setDamageNums((p) => p.filter((n) => n.id !== id)), 900));
    };
    const onJumpLives = (d: {
      socketId: string;
      lives: number;
      characterId: number;
      nickname: string;
    }) => {
      setJumpPlayerLives((p) => ({
        ...p,
        [d.socketId]: {
          lives: d.lives,
          characterId: d.characterId,
          nickname: d.nickname,
        },
      }));
    };
    const onEliminated = () => {
      setEliminated(true);
      setView("lobby");
    };

    const onRankings = (d: { raidType: number; rankings: RankEntry[] }) => {
      setRankingsModal({ raidType: d.raidType, rankings: d.rankings });
    };

    s.on("raid:lobby", onLobby);
    s.on("raid:state", onState);
    s.on("raid:self", onSelf);
    s.on("raid:feedback", onFeedback);
    s.on("raid:cleared", onCleared);
    s.on("raid:full", onFull);
    s.on("raid:cooldown", onCooldown);
    s.on("raid:banned", onBanned);
    s.on("raid:bossHit", onBossHit);
    s.on("raid:jump_lives", onJumpLives);
    s.on("raid:eliminated", onEliminated);
    s.on("raid:rankings", onRankings);
    s.emit("raid:counts");
    return () => {
      s.off("raid:lobby", onLobby);
      s.off("raid:state", onState);
      s.off("raid:self", onSelf);
      s.off("raid:feedback", onFeedback);
      s.off("raid:cleared", onCleared);
      s.off("raid:full", onFull);
      s.off("raid:cooldown", onCooldown);
      s.off("raid:banned", onBanned);
      s.off("raid:bossHit", onBossHit);
      s.off("raid:jump_lives", onJumpLives);
      s.off("raid:eliminated", onEliminated);
      s.off("raid:rankings", onRankings);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(
    () => () => {
      getRaidSocket().emit("raid:leave");
      disconnectRaidSocket();
    },
    [],
  );

  const enter = (id: number) => {
    setRaidType(id);
    setState(null);
    setSelf(null);
    setReward(null);
    setEliminated(false);
    const user = getStoredUser();
    getRaidSocket().emit("raid:join", {
      raidType: id,
      characterId: myCharacterId,
      userId: user?.id,
      nickname: user?.name,
      lang,
    });
    setView("room");
  };
  const leave = () => {
    getRaidSocket().emit("raid:leave");
    setView("lobby");
    setState(null);
    setSelf(null);
    setReward(null);
  };
  const emitJump = useCallback(() => {
    getRaidSocket().emit("raid:jump");
  }, []);
  const emitGem = useCallback(() => {
    getRaidSocket().emit("raid:gem");
  }, []);
  const emitDied = useCallback(() => {
    getRaidSocket().emit("raid:died");
  }, []);
  const handleGameOver = useCallback(() => {
    setEliminated(true);
    leave();
  }, []);
  if (view === "lobby") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("raid.title")}</h1>
          </div>
          <button
            onClick={() => setShowRewardGuide(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Trophy className="h-3.5 w-3.5" />
            {lang === "ko" ? "보상 안내" : lang === "ja" ? "報酬案内" : "Reward Guide"}
          </button>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{t("raid.desc")}</p>

        {/* ── 알 인벤토리 ── */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Egg className="h-5 w-5 text-primary" />
            <h2 className="font-bold">{t("egg.inventory")}</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {EGG_META.map((e) => {
              const cnt = eggCounts[e.type];
              return (
                <div
                  key={e.type}
                  className={`rounded-xl bg-gradient-to-b ${e.tint} p-3 text-center`}
                >
                  <PixelEggSVG type={e.type} size={48} />
                  <div className="mt-1 text-sm font-bold text-gray-800">
                    {e.name}
                  </div>
                  <div className="text-[11px] text-gray-700">{e.range}</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">
                    ×{cnt}
                  </div>
                  <button
                    onClick={() => handleOpenEgg(e.type)}
                    disabled={cnt <= 0 || !!opening}
                    className={`mt-2 w-full rounded-full py-1.5 text-xs font-bold transition-all ${
                      cnt > 0 && !opening
                        ? "bg-gray-900/85 text-white hover:bg-gray-900"
                        : "cursor-not-allowed bg-gray-400/50 text-gray-600"
                    }`}
                  >
                    {opening === e.type ? t("egg.opening") : t("egg.open")}
                  </button>
                  <button
                    onClick={() => handleOpenEgg10(e.type)}
                    disabled={cnt < 10 || !!opening}
                    className={`mt-1 w-full rounded-full py-1.5 text-xs font-bold transition-all ${
                      cnt >= 10 && !opening
                        ? "bg-amber-600/90 text-white hover:bg-amber-600"
                        : "cursor-not-allowed bg-gray-400/50 text-gray-600"
                    }`}
                  >
                    {t("egg.open_10")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {banned && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive font-semibold">
            {t("raid.banned_msg")}
          </div>
        )}
        {eliminated && !banned && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">
            <Heart className="h-4 w-4 fill-red-500" />
            {t("raid.eliminated_msg")}
          </div>
        )}
        {full && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {t("raid.full_msg")}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RAID_IDS.map((id) => {
            const info = lobby[id] ?? { count: 0, cooldownUntil: 0 };
            const onCooldown = info.cooldownUntil > now;
            const full5 = info.count >= MAX_PLAYERS;
            const disabled = onCooldown || full5;
            const bossDef = charById(info.bossCharId ?? getBossChar(id).id);
            const seasonInfo = seasonCopy(info.season);
            const patternInfo = patternCopy(info.pattern);
            const cardClass = `group flex flex-col rounded-2xl border p-4 text-left transition-all ${
              disabled
                ? "border-border opacity-60"
                : "border-border bg-card hover:border-primary hover:shadow-lg cursor-pointer"
            }`;
            const cardContent = (
              <>
                {/* ── 상단: 인원 + 상태 뱃지 ── */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold">
                    <Users className="h-3.5 w-3.5" />
                    <span
                      className={full5 ? "text-destructive" : "text-foreground"}
                    >
                      {info.count}
                    </span>
                    <span className="text-muted-foreground font-normal">
                      /{MAX_PLAYERS}
                    </span>
                  </span>
                  {onCooldown ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                      <Clock className="h-3 w-3" />{" "}
                      {fmtCooldown(info.cooldownUntil - now)}
                    </span>
                  ) : full5 ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {t("raid.full")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Swords className="h-3 w-3" /> {t("raid.available")}
                    </span>
                  )}
                </div>
                {/* ── HP 바 (상시 표시) ── */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      HP
                    </span>
                    <span className="text-[10px] font-semibold text-red-400">
                      {info.currentHp ?? info.maxHp ?? "-"} /{" "}
                      {info.maxHp ?? "-"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                      style={{
                        width: `${info.maxHp ? Math.round(((info.currentHp ?? info.maxHp) / info.maxHp) * 100) : 100}%`,
                      }}
                    />
                  </div>
                </div>
                {/* ── 보스 스프라이트 + 쿨타임 시 랭킹보기 ── */}
                <div className="flex justify-center mb-3 relative">
                  <div
                    className={`rounded-2xl bg-black/5 px-6 py-4 dark:bg-white/5 ${onCooldown ? "grayscale" : ""}`}
                  >
                    <PixelCharacter
                      characterId={bossDef.id}
                      size={64}
                      float={!onCooldown}
                    />
                  </div>
                  {onCooldown && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        getRaidSocket().emit("raid:request-rankings", {
                          raidType: id,
                        });
                      }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-black/75 transition-colors">
                        <Trophy className="h-3.5 w-3.5 text-amber-400" />
                        {t("raid.ranking_title")}
                      </span>
                    </button>
                  )}
                </div>
                {/* ── 텍스트 정보 ── */}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">
                    {RAIDS[id].name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    BOSS · {getCharName(bossDef, lang)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {RAIDS[id].desc}
                  </p>
                  {(seasonInfo || patternInfo) && (
                    <div className="mt-3 grid gap-1.5 text-[10px]">
                      {seasonInfo && (
                        <div className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
                          <span className="font-bold text-primary">{seasonInfo.label}</span>
                          <span className="ml-1 text-muted-foreground">{seasonInfo.effect}</span>
                        </div>
                      )}
                      {patternInfo && (
                        <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1">
                          <span className="font-bold text-amber-500">{patternInfo.label}</span>
                          <span className="ml-1 text-muted-foreground">{patternInfo.hint}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
            return onCooldown ? (
              <div key={id} className={cardClass}>
                {cardContent}
              </div>
            ) : (
              <button
                key={id}
                onClick={() => !disabled && enter(id)}
                disabled={disabled}
                className={cardClass}
              >
                {cardContent}
              </button>
            );
          })}
        </div>

        {/* ── 랭킹 모달 ── */}
        {rankingsModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setRankingsModal(null)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="font-bold text-lg">{t("raid.ranking_title")}</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {RAIDS[rankingsModal.raidType]?.name}
                </span>
              </div>

              {rankingsModal.rankings.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  {t("col.no_records")}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {rankingsModal.rankings.map((entry) => {
                    const medalColor =
                      entry.rank === 1
                        ? "#fbbf24"
                        : entry.rank === 2
                          ? "#94a3b8"
                          : entry.rank === 3
                            ? "#cd7f32"
                            : null;
                    return (
                      <div
                        key={entry.rank}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          entry.rank <= 3
                            ? "bg-amber-500/10 border border-amber-500/20"
                            : "bg-muted/50"
                        }`}
                      >
                        <span className="w-6 shrink-0 flex items-center justify-center font-bold text-muted-foreground">
                          {medalColor ? (
                            <Medal size={16} color={medalColor} />
                          ) : (
                            entry.rank
                          )}
                        </span>
                        <span className="flex-1 truncate font-medium">
                          {entry.nickname}
                        </span>
                        <span className="shrink-0 font-bold text-red-400">
                          {entry.damage.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => setRankingsModal(null)}
                className="mt-4 w-full rounded-lg bg-muted py-2 text-sm font-semibold hover:bg-muted/70 transition-colors"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        )}

        {/* ── 보상 안내 모달 ── */}
        {showRewardGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRewardGuide(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h2 className="font-bold text-lg">
                  {lang === "ko" ? "보상 안내" : lang === "ja" ? "報酬案内" : "Reward Guide"}
                </h2>
                <button
                  onClick={() => setShowRewardGuide(false)}
                  className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* 순위 보상 */}
              <p className="mb-2 text-xs font-bold text-amber-400">
                {lang === "ko" ? "순위 보상" : lang === "ja" ? "順位報酬" : "Rank Rewards"}
              </p>
              <div className="mb-4 space-y-1.5">
                {[
                  { rank: lang === "ko" ? "1위" : lang === "ja" ? "1位" : "1st",  reward: lang === "ko" ? "황금 알 ×1" : lang === "ja" ? "黄金卵 ×1" : "Golden Egg ×1",  color: "#fbbf24" },
                  { rank: lang === "ko" ? "2위" : lang === "ja" ? "2位" : "2nd",  reward: lang === "ko" ? "고급 알 ×2" : lang === "ja" ? "上級卵 ×2" : "Premium Egg ×2", color: "#94a3b8" },
                  { rank: lang === "ko" ? "3위" : lang === "ja" ? "3位" : "3rd",  reward: lang === "ko" ? "고급 알 ×1" : lang === "ja" ? "上級卵 ×1" : "Premium Egg ×1", color: "#cd7f32" },
                  { rank: lang === "ko" ? "4~10위" : lang === "ja" ? "4~10位" : "4th~10th", reward: lang === "ko" ? "일반 알 ×1" : lang === "ja" ? "通常卵 ×1" : "Normal Egg ×1", color: "#64748b" },
                  { rank: lang === "ko" ? "11위~" : lang === "ja" ? "11位~" : "11th+", reward: lang === "ko" ? "포인트 ×100" : lang === "ja" ? "ポイント ×100" : "Points ×100", color: "#64748b" },
                ].map((row) => (
                  <div key={row.rank} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-bold" style={{ color: row.color }}>{row.rank}</span>
                    <span className="text-foreground font-medium">{row.reward}</span>
                  </div>
                ))}
              </div>

              {/* 참여 보상 */}
              <p className="mb-2 text-xs font-bold text-blue-400">
                {lang === "ko" ? "참여 포인트 (미니게임별)" : lang === "ja" ? "参加ポイント（ミニゲーム別）" : "Participation Points (per Minigame)"}
              </p>
              <div className="space-y-1.5">
                {[
                  { name: lang === "ko" ? "점프 미니게임" : lang === "ja" ? "ジャンプミニゲーム" : "Jump Minigame", pts: 30 },
                  { name: lang === "ko" ? "탄막 미니게임" : lang === "ja" ? "弾幕ミニゲーム" : "Bullet Minigame", pts: 60 },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-foreground">{row.name}</span>
                    <span className="font-bold text-blue-400">+{row.pts}P</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowRewardGuide(false)}
                className="mt-4 w-full rounded-lg bg-muted py-2 text-sm font-semibold hover:bg-muted/70 transition-colors"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        )}

        {/* 알 부화 연출 */}
        {eggResult && (
          <EggHatchModal
            eggType={eggResult.eggType}
            result={eggResult}
            onClose={() => setEggResult(null)}
          />
        )}
        {eggBatchResults && (
          <EggBatchModal
            eggType={eggBatchResults.type}
            results={eggBatchResults.results}
            onClose={() => setEggBatchResults(null)}
          />
        )}
      </div>
    );
  }

  const hpPct = state ? Math.round((state.hp / state.maxHp) * 100) : 100;
  const others = (state?.participants ?? []).filter(
    (p) => p.socketId !== self?.socketId,
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted dark:from-gray-900 dark:to-gray-950">
      <style>{`
        @keyframes raid-bubble{0%{opacity:0;transform:translateY(6px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateY(10px)}}
        @keyframes ut-boss-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(50) saturate(0)}12%{transform:translateX(-9px);filter:brightness(14) saturate(0)}26%{transform:translateX(7px);filter:brightness(5) saturate(0.3)}44%{transform:translateX(-5px);filter:brightness(2.2) saturate(1)}62%{transform:translateX(4px);filter:brightness(1.3)}80%{transform:translateX(-2px);filter:brightness(1)}100%{transform:translateX(0);filter:brightness(1)}}
        @keyframes boss-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes ut-dmg-pop{0%{opacity:1;transform:translateY(0) scale(1.8)}20%{opacity:1;transform:translateY(-8px) scale(1.3)}100%{opacity:0;transform:translateY(-46px) scale(0.85)}}
        @keyframes boss-talk-in{0%{opacity:0;transform:translateY(4px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}
        @keyframes ut-panel-shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-5px)}35%{transform:translateX(5px)}55%{transform:translateX(-3px)}75%{transform:translateX(2px)}}
      `}</style>

      {/* header */}
      <div className="relative z-20 flex items-center justify-between bg-white/70 px-4 py-3 backdrop-blur dark:bg-gray-900/60">
        <button
          onClick={leave}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> {t("raid.leave")}
        </button>
        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
          <Swords className="h-4 w-4 text-primary" /> {RAIDS[raidType].name}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
          <Users className="h-4 w-4" /> {state?.count ?? 0}/{MAX_PLAYERS}
        </div>
      </div>

      {/* boss panel */}
      <div
        className="relative z-20 border-b border-border bg-white/60 px-4 py-3 backdrop-blur dark:bg-gray-900/50"
        style={{ animation: hit ? "ut-panel-shake 0.38s" : undefined }}
      >
        <div className="flex items-center gap-3">
          {/* boss sprite + 데미지 이펙트 */}
          <div className="relative shrink-0">
            <div
              style={{
                animation: state?.cleared
                  ? undefined
                  : hit
                    ? "ut-boss-hit 0.38s ease-out"
                    : "boss-float 2.5s ease-in-out infinite",
                filter: state?.cleared
                  ? "grayscale(1) opacity(0.4)"
                  : undefined,
              }}
            >
              {state && (
                <PixelCharacter
                  characterId={state.boss.characterId}
                  size={72}
                />
              )}
            </div>
            {/* 데미지 숫자 */}
            {damageNums.map((n) => (
              <span
                key={n.id}
                className="pointer-events-none absolute -top-6 font-extrabold text-xl"
                style={{
                  left: `${n.x}%`,
                  animation: "ut-dmg-pop 0.9s ease-out forwards",
                  color: "#faff00",
                  textShadow:
                    "0 0 10px #ffffff, 0 0 5px #ffd700, 1px 1px 0 #000",
                  fontFamily: "monospace",
                  letterSpacing: "0.04em",
                  zIndex: 10,
                }}
              >
                -{n.dmg}
              </span>
            ))}
          </div>
          {/* boss info + HP */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-base font-extrabold text-gray-900 dark:text-gray-50">
                {bossName(state?.boss.characterId)}
              </span>
              <span className="text-xs text-muted-foreground">BOSS</span>
            </div>
            {/* HP bar */}
            <div className="mt-1 h-4 w-full overflow-hidden rounded-full border border-black/10 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <p className="mt-0.5 text-right text-[11px] font-semibold text-red-500">
              HP {state?.hp ?? 0} / {state?.maxHp ?? 0}
            </p>
            {/* 보스 대사 */}
            {bossLine && (
              <p
                className="mt-1 text-xs font-semibold text-orange-500 dark:text-orange-400 italic"
                style={{ animation: "boss-talk-in 2.2s ease-out forwards" }}
              >
                {bossLine}
              </p>
            )}
            {(seasonCopy(state?.season) || patternCopy(state?.pattern)) && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                {seasonCopy(state?.season) && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    {seasonCopy(state?.season)!.label} · {seasonCopy(state?.season)!.effect}
                  </span>
                )}
                {patternCopy(state?.pattern) && (
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 font-semibold text-amber-500">
                    {patternCopy(state?.pattern)!.label}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* boss-issued mission */}
        <div className="mt-2 rounded-lg bg-primary/10 px-3 py-2">
          <p className="text-xs font-semibold text-primary">
            「{bossName(state?.boss.characterId)}」{" "}
            {t(RAID_MISSION_LABELS[raidType])}
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-gray-900 dark:text-gray-50">
            {state?.mission.target}
          </p>
          {RAID_MISSION_HINTS[raidType] ? (
            <p className="text-xs text-muted-foreground">
              {t(RAID_MISSION_HINTS[raidType]!)}
            </p>
          ) : null}
        </div>
      </div>

      {/* feedback toast */}
      {feedback && (
        <div className="pointer-events-none absolute left-1/2 top-52 z-40 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold text-white">
          {feedback}
        </div>
      )}

      {raidType === 1 ? (
        /* ── 점프 액션 게임 ── */
        <div className="relative z-10 mt-auto flex flex-1 flex-col justify-end">
          {others.length > 0 && (
            <div className="flex flex-wrap items-end justify-center gap-1 px-4">
              {others.map((p) => {
                const def = charById(p.characterId);
                return (
                  <div key={p.socketId} title={p.nickname}>
                    <PixelSprite
                      type={def.type}
                      colors={def.colors}
                      characterId={def.id}
                      size={32}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <JumpGame
            charDef={charById(self?.characterId ?? myCharacterId)}
            cleared={state?.cleared ?? false}
            onClear={emitJump}
            onDied={emitDied}
            playerLives={jumpPlayerLives}
            mySocketId={self?.socketId}
          />
        </div>
      ) : raidType === 5 ? (
        /* ── 탄막 피하기 게임 ── */
        <div className="relative z-10 mt-auto flex flex-1 flex-col">
          {others.length > 0 && (
            <div className="flex flex-wrap items-end justify-center gap-1 px-4 pb-1">
              {others.map((p) => {
                const def = charById(p.characterId);
                return (
                  <div key={p.socketId} title={p.nickname}>
                    <PixelSprite
                      type={def.type}
                      colors={def.colors}
                      characterId={def.id}
                      size={28}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <ShootingGame
            charDef={charById(self?.characterId ?? myCharacterId)}
            cleared={state?.cleared ?? false}
            onGemCollect={emitGem}
            onDied={emitDied}
            onGameOver={handleGameOver}
          />
        </div>
      ) : null}

      {/* clear overlay */}
      {reward && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 px-6 text-center">
            <div className="w-full max-w-md">
              <div className="flex flex-col items-center">
                <Trophy className="h-14 w-14 text-yellow-400" />
                <h2 className="mt-2 text-2xl font-extrabold text-white">
                  {t("raid.reward_title")}
                </h2>
                {myRank && (
                  <p className="mt-1 text-sm font-bold text-yellow-300">
                    {t("raid.my_rank").replace("{r}", String(myRank))}
                  </p>
                )}
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
                {reward.kind === "egg" ? (
                  <>
                    <PixelEggSVG type={reward.egg} size={36} />
                    <div className="text-left">
                      <p className="font-bold text-white">
                        {reward.count && reward.count > 1
                          ? `×${reward.count} `
                          : ""}
                        {EGG_LABEL[reward.egg]}
                        {t("raid.reward_egg_suffix")}
                      </p>
                      <p className="text-xs text-yellow-200">
                        {t("raid.reward_go_inventory")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-7 w-7 text-yellow-300" />
                    <div className="text-left">
                      <p className="font-bold text-white">
                        +{reward.points}
                        {t("raid.reward_points_suffix")}
                      </p>
                      <p className="text-xs text-yellow-200">
                        {t("raid.reward_maybe_egg")}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {rankings.length > 0 && (
                <div className="mt-3 rounded-2xl bg-white/10 p-3">
                  <p className="mb-2 text-xs font-bold text-white/70 text-center">
                    {t("raid.ranking_title")}
                  </p>
                  <div className="space-y-1.5">
                    {rankings.slice(0, 10).map((r) => (
                      <div
                        key={r.userId}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${r.rank <= 3 ? "bg-yellow-400/20" : "bg-white/5"}`}
                      >
                        <span
                          className={`w-5 text-center text-sm font-extrabold ${r.rank === 1 ? "text-yellow-300" : r.rank === 2 ? "text-gray-300" : r.rank === 3 ? "text-amber-500" : "text-white/60"}`}
                        >
                          {r.rank}
                        </span>
                        <span className="flex-1 truncate text-sm text-white">
                          {r.nickname}
                        </span>
                        <span className="text-xs font-bold text-red-300">
                          {r.damage} dmg
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={leave}
                className="mt-4 w-full rounded-full bg-primary py-2 font-semibold text-primary-foreground"
              >
                {t("raid.to_lobby")}
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
