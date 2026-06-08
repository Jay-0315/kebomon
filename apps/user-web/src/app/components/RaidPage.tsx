import { useCallback, useEffect, useRef, useState } from "react";
import { Swords, Users, Send, ArrowLeft, Trophy, Egg, Sparkles, Clock, Heart } from "lucide-react";
import { useAppData, type EggType, type EggOpenResult } from "../context/AppDataContext";
import { getRaidSocket, disconnectRaidSocket } from "../lib/socket";
import { getStoredUser } from "../lib/auth";
import PixelCharacter, { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName } from "../data/characters";
import EggHatchModal, { EggBatchModal } from "./EggHatchModal";
import { useLang } from "../context/LangContext";
import { TranslationKey } from "../lib/i18n";

const MAX_PLAYERS = 5;

// ─── Pixel Egg SVG ────────────────────────────────────────────────────────
function PixelEggSVG({ type, size = 48 }: { type: "normal" | "big" | "golden"; size?: number }) {
  const C = {
    normal: { body: "#ede8dd", hi: "#f8f4ee", lo: "#c4b49a" },
    big:    { body: "#7dd3fc", hi: "#dbeafe", lo: "#1d4ed8", spot: "#0369a1" },
    golden: { body: "#fbbf24", hi: "#fef9c3", lo: "#b45309" },
  }[type] as { body: string; hi: string; lo: string; spot?: string };
  return (
    <svg width={size} height={size} viewBox="0 0 16 20" style={{ imageRendering: "pixelated", display: "block", margin: "auto" }}>
      <rect x="5"  y="0"  width="6"  height="2" fill={C.body} />
      <rect x="3"  y="2"  width="10" height="2" fill={C.body} />
      <rect x="2"  y="4"  width="12" height="2" fill={C.body} />
      <rect x="1"  y="6"  width="14" height="2" fill={C.body} />
      <rect x="0"  y="8"  width="16" height="4" fill={C.body} />
      <rect x="1"  y="12" width="14" height="2" fill={C.body} />
      <rect x="2"  y="14" width="12" height="2" fill={C.body} />
      <rect x="4"  y="16" width="8"  height="2" fill={C.body} />
      <rect x="6"  y="18" width="4"  height="2" fill={C.body} />
      <rect x="4"  y="2"  width="3"  height="2" fill={C.hi} />
      <rect x="3"  y="4"  width="2"  height="2" fill={C.hi} />
      <rect x="2"  y="6"  width="2"  height="2" fill={C.hi} />
      <rect x="4"  y="14" width="4"  height="2" fill={C.lo} />
      <rect x="6"  y="16" width="3"  height="2" fill={C.lo} />
      {type === "big" && <>
        <rect x="9"  y="6"  width="2" height="2" fill={C.spot} />
        <rect x="11" y="10" width="2" height="2" fill={C.spot} />
      </>}
      {type === "golden" && <>
        <rect x="11" y="2" width="2" height="1" fill="#fff" />
        <rect x="12" y="1" width="1" height="3" fill="#fff" />
      </>}
    </svg>
  );
}

const getBossChar = (raidId: number) => CHARACTERS[(raidId * 43) % CHARACTERS.length];

const RAID_IDS = [1, 3, 4, 5];
// 기여(문제 출제)를 받는 레이드 — 퀴즈·받아쓰기만
const CONTRIBUTABLE = new Set([3, 4]);

function fmtCooldown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type RosterEntry = { socketId: string; characterId: number; nickname: string };
type SelfInfo = { socketId: string; nickname: string; characterId: number };
type Mission = { label: string; target: string; hint: string };
type Boss = { characterId: number; name: string; cry: string };
type RaidState = {
  raidType: number; name: string; boss: Boss; hp: number; maxHp: number;
  cleared: boolean; mission: Mission; participants: RosterEntry[]; count: number; maxPlayers: number;
};
type ChatMsg = { id: string; socketId: string; nickname: string; characterId: number; text: string };
type Reward = { kind: "points"; points: number } | { kind: "egg"; egg: EggType; count?: number };
type RankEntry = { userId: string; nickname: string; damage: number; rank: number };

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

// ─── 점프 액션 게임 (점프 레이드 / 타입1) ─────────────────────────────────
// 장애물이 계속 다가오고, 스페이스바(또는 터치)로 점프해서 넘으면 보스에게 데미지.
type Obstacle = { x: number; ow: number; oh: number; counted: boolean; hit: boolean; kind: number };
type PlayerLiveMap = Record<string, { lives: number; characterId: number; nickname: string }>;
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
    const GRAVITY = 0.72;       // 낙하 / 키 뗐을 때 중력
    const HOLD_GRAVITY = 0.40;  // 홀드 상승 중 중력 (낮을수록 더 높이 올라감)
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
          const grav = (st.isJumpHeld && st.vy > 0) ? HOLD_GRAVITY : GRAVITY;
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
            ? 550 + Math.random() * 300                      // 연속: 550~850ms
            : 1000 + Math.random() * 1100                    // 일반: 1000~2100ms
          st.nextSpawn -= Math.min(380, st.elapsed / 50);
          const kind = Math.floor(Math.random() * 3); // 0=단독, 1=쌍, 2=클러스터
          const oh = kind === 2 ? 22 + Math.floor(Math.random() * 10) : 26 + Math.floor(Math.random() * 18);
          const ow = kind === 1 ? 28 + Math.floor(Math.random() * 8) : 16 + Math.floor(Math.random() * 10);
          st.obstacles.push({ x: W + 12, ow, oh, counted: false, hit: false, kind });
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
              st.jy = 0; st.vy = 0; st.grounded = true;
              setDeadUntil(st.deadUntil);
              setStunned(false);
              onDiedRef.current?.();
              break;
            } else {
              st.stunUntil = now + 650;
              setStunned(true);
              window.setTimeout(() => setStunned(false), 650);
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
      ctx.beginPath(); ctx.arc(sunX, sunY, 50, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,235,120,0.35)";
      ctx.beginPath(); ctx.arc(sunX, sunY, 36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffe87a";
      ctx.beginPath(); ctx.arc(sunX, sunY, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff5c0";
      ctx.beginPath(); ctx.arc(sunX, sunY, 13, 0, Math.PI * 2); ctx.fill();

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
      for (const b of [{ x: 50, y: 38, s: 1, a: 0.9 }, { x: 260, y: 60, s: 0.65, a: 0.75 }, { x: 440, y: 28, s: 0.82, a: 0.85 }]) {
        let cx = (b.x - drift1) % span;
        if (cx < -80) cx += span;
        drawCloud(cx, b.y, b.s, b.a);
      }
      for (const b of [{ x: 140, y: 72, s: 0.55, a: 0.6 }, { x: 360, y: 48, s: 0.72, a: 0.65 }]) {
        let cx = (b.x - drift2) % span;
        if (cx < -80) cx += span;
        drawCloud(cx, b.y, b.s, b.a);
      }

      // 원거리 산 (픽셀 스타일, 2층)
      const drawMtLayer = (color: string, baseY: number, peaks: { x: number; h: number }[]) => {
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
        { x: W * 0.08, h: 38 }, { x: W * 0.23, h: 55 }, { x: W * 0.44, h: 42 },
        { x: W * 0.62, h: 60 }, { x: W * 0.8, h: 35 }, { x: W * 0.95, h: 48 },
      ]);
      drawMtLayer("rgba(130,165,100,0.55)", groundY - 22, [
        { x: W * 0.05, h: 22 }, { x: W * 0.18, h: 30 }, { x: W * 0.35, h: 24 },
        { x: W * 0.52, h: 28 }, { x: W * 0.7, h: 20 }, { x: W * 0.86, h: 26 }, { x: W * 0.98, h: 18 },
      ]);

      // 먼 언덕 (parallax)
      const hill = (color: string, baseY: number, amp: number, speed: number, wl: number) => {
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
      const drawCactus = (bx: number, by: number, w: number, h: number, hit: boolean) => {
        const dark  = hit ? "#9ca3af" : "#1b5e35";
        const mid   = hit ? "#b0b8c1" : "#2d6a4f";
        const light = hit ? "#cdd5dc" : "#52b788";
        const u = Math.max(2, Math.floor(w / 7)); // 픽셀 1칸 크기
        const sw = u * 2;                          // 줄기 두께
        const cx = bx + Math.floor(w / 2) - u;    // 줄기 중심 x

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
        ctx.fillRect(cx - aW, arm1Y, aW, sw);          // 수평
        ctx.fillRect(cx - aW, arm1Y - aH, sw, aH + sw);// 수직 (위로)
        ctx.fillStyle = light;
        ctx.fillRect(cx - aW + 1, arm1Y + 1, aW - 2, u);// 수평 하이라이트
        ctx.fillRect(cx - aW + u, arm1Y - aH + u, u, aH);// 수직 하이라이트
        ctx.fillStyle = dark;
        ctx.fillRect(cx - aW, arm1Y - aH - 1, sw, 1);  // 팔 끝 상단 테두리

        // 오른쪽 팔 (높이 58% 지점, 좌측보다 약간 낮게)
        const arm2Y = by + Math.floor(h * 0.55);
        const aW2 = Math.floor(w * 0.30);
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
          drawCactus(o.x,            groundY - h1, w1, h1, o.hit);
          drawCactus(o.x + w1 + 3,   groundY - h2, w2, h2, o.hit);
        } else if (o.kind === 2) {
          // 클러스터: 작은 3그루
          const w3 = Math.floor(o.ow * 0.36);
          const h3 = o.oh;
          drawCactus(o.x,            groundY - Math.floor(h3 * 0.85), w3, Math.floor(h3 * 0.85), o.hit);
          drawCactus(o.x + w3 + 2,   groundY - h3, w3, h3, o.hit);
          drawCactus(o.x + w3 * 2 + 4, groundY - Math.floor(h3 * 0.7), w3, Math.floor(h3 * 0.7), o.hit);
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
          filter: deadUntil > 0 ? "grayscale(1)" : stunned ? "grayscale(1) brightness(1.4)" : undefined,
        }}
      >
        <PixelSprite type={charDef.type} colors={charDef.colors} characterId={charDef.id} size={44} />
      </div>
      {/* 목숨(하트) */}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-0.5">
        {Array.from({ length: MAX_HITS }).map((_, i) => (
          <Heart key={i} className={`h-4 w-4 ${i < lives ? "fill-red-500 text-red-500" : "text-gray-400/60"}`} />
        ))}
      </div>
      {/* 안내 */}
      <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white">
        {t("raid.jump_hint")}
      </div>
      {/* 다른 플레이어 목숨 현황 (우측 하단) */}
      {Object.keys(playerLives).filter((sid) => sid !== mySocketId).length > 0 && (
        <div className="pointer-events-none absolute right-2 bottom-2 z-10 flex flex-col items-end gap-1">
          {Object.entries(playerLives)
            .filter(([sid]) => sid !== mySocketId)
            .map(([sid, info]) => {
              const def = charById(info.characterId);
              return (
                <div key={sid} className="flex items-center gap-1 rounded-full bg-black/50 px-1.5 py-0.5">
                  <PixelSprite type={def.type} colors={def.colors} characterId={def.id} size={16} />
                  <div className="flex gap-0.5">
                    {Array.from({ length: MAX_HITS }).map((_, i) => (
                      <Heart key={i} className={`h-2.5 w-2.5 ${i < info.lives ? "fill-red-400 text-red-400" : "text-gray-500/50"}`} />
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

// ─── 탄막 피하기 게임 (탄막 레이드 / 타입5) ──────────────────────────────────
type BulletT = { id: number; x: number; y: number; vx: number; vy: number; r: number; side?: boolean };
type GemT    = { id: number; x: number; y: number; born: number; life: number };

function BulletHellGame({
  charDef, cleared, onGemCollect, onDied,
}: {
  charDef: ReturnType<typeof charById>;
  cleared: boolean;
  onGemCollect: () => void;
  onDied?: () => void;
}) {
  const { t } = useLang();
  const wrapRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const onGemRef  = useRef(onGemCollect);
  onGemRef.current = onGemCollect;
  const onDiedRef = useRef(onDied);
  onDiedRef.current = onDied;
  const clearedRef = useRef(cleared);
  clearedRef.current = cleared;

  const [lives, setLives]       = useState(5);
  const [deadUntil, setDeadUntil]     = useState(0);

  const MAX_HITS  = 5;
  const P_SPEED   = 3.2;
  const P_HIT_R   = 7;
  const GEM_R     = 16;

  const g = useRef({
    px: 0, py: 0,
    keys: new Set<string>(),
    pointerX: -1, pointerY: -1,
    bullets: [] as BulletT[],
    gems:    [] as GemT[],
    nextId: 0,
    bulletPhase: 0,
    lastBullet: 0,
    lastSideBullet: 0,
    sideBulletPhase: 0,
    lastGem: 0,
    elapsed: 0,
    hits: 0,
    deadUntil: 0,
    invUntil: 0,
  });

  useEffect(() => {
    const KEYS = new Set(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","a","A","w","W","s","S","d","D"]);
    const down = (e: KeyboardEvent) => { if (KEYS.has(e.key)) { e.preventDefault(); g.current.keys.add(e.key); } };
    const up   = (e: KeyboardEvent) => g.current.keys.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    let raf = 0, last = performance.now();

    const resize = () => {
      const w = wrapRef.current?.clientWidth ?? 400;
      canvas.width  = Math.max(280, w);
      canvas.height = 300;
      g.current.px = canvas.width / 2;
      g.current.py = canvas.height - 70;
    };
    resize();
    window.addEventListener("resize", resize);

    const fireBullets = (W: number, _H: number, now: number) => {
      const st = g.current;
      const bx = W / 2, by = 55;
      const add = (vx: number, vy: number, r = 5) =>
        st.bullets.push({ id: st.nextId++, x: bx, y: by, vx, vy, r });
      const phase = st.bulletPhase % 8;
      if (phase === 0) {
        // 3-way 부채꼴
        [-25, 0, 25].forEach(a => {
          const rad = (a * Math.PI) / 180, spd = 2.4;
          add(Math.sin(rad) * spd, Math.cos(rad) * spd);
        });
      } else if (phase === 1) {
        // 8방향 폭발
        for (let i = 0; i < 8; i++) {
          const rad = (i / 8) * Math.PI * 2;
          add(Math.sin(rad) * 1.9, Math.cos(rad) * 1.9, 4);
        }
      } else if (phase === 2) {
        // 플레이어 조준 + 양옆 보조
        const dx = st.px - bx, dy = st.py - by;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / d, ny = dy / d, px = -ny, py = nx, spd = 2.9;
        add(nx * spd, ny * spd, 6);
        add((nx + px * 0.4) * spd * 0.9, (ny + py * 0.4) * spd * 0.9, 5);
        add((nx - px * 0.4) * spd * 0.9, (ny - py * 0.4) * spd * 0.9, 5);
      } else if (phase === 3) {
        // 6방향 나선
        const base = (now * 0.045) % (Math.PI * 2);
        for (let i = 0; i < 6; i++) {
          const rad = base + (i / 6) * Math.PI * 2;
          add(Math.sin(rad) * 2.0, Math.cos(rad) * 2.0, 4);
        }
      } else if (phase === 4) {
        // 5-way 웨이브
        for (let i = -2; i <= 2; i++) {
          const rad = (i * 14 * Math.PI) / 180;
          add(Math.sin(rad) * 2.5, Math.cos(rad) * 2.5, 4);
        }
      } else if (phase === 5) {
        // 12방향 전방위
        for (let i = 0; i < 12; i++) {
          const rad = (i / 12) * Math.PI * 2;
          add(Math.sin(rad) * 1.6, Math.cos(rad) * 1.6, 4);
        }
      } else if (phase === 6) {
        // 이중 링 (안 4개 빠름 + 밖 6개 느림, 역방향)
        const base = (now * 0.05) % (Math.PI * 2);
        for (let i = 0; i < 4; i++) {
          const rad = base + (i / 4) * Math.PI * 2;
          add(Math.sin(rad) * 3.0, Math.cos(rad) * 3.0, 5);
        }
        for (let i = 0; i < 6; i++) {
          const rad = -base * 0.6 + (i / 6) * Math.PI * 2;
          add(Math.sin(rad) * 1.5, Math.cos(rad) * 1.5, 4);
        }
      } else {
        // 부채꼴 스윕 (7발, 좌우 스윙)
        const sweep = Math.sin(now * 0.003) * 38;
        for (let i = -3; i <= 3; i++) {
          const rad = ((sweep + i * 11) * Math.PI) / 180;
          add(Math.sin(rad) * 2.3, Math.cos(rad) * 2.3, 4);
        }
      }
      st.bulletPhase++;
    };

    const fireSideBullets = (W: number, H: number) => {
      const st = g.current;
      const phase = st.sideBulletPhase % 6;
      const spd = Math.min(3.2, 1.8 + st.elapsed / 80000);
      const addL = (sy: number, vx: number, vy: number, r = 5) =>
        st.bullets.push({ id: st.nextId++, x: -8, y: sy, vx, vy, r, side: true });
      const addR = (sy: number, vx: number, vy: number, r = 5) =>
        st.bullets.push({ id: st.nextId++, x: W + 8, y: sy, vx, vy, r, side: true });
      const yStep = (H - 180) / 2;

      if (phase === 0) {
        // 왼쪽 3발 균등 간격 수평
        for (let i = 0; i < 3; i++) addL(100 + i * yStep, spd, 0);
      } else if (phase === 1) {
        // 오른쪽 3발 균등 간격 수평
        for (let i = 0; i < 3; i++) addR(100 + i * yStep, -spd, 0);
      } else if (phase === 2) {
        // 양쪽 동시 플레이어 조준탄
        const ly = 90 + Math.random() * (H - 160);
        const ldx = st.px + 8, ldy = st.py - ly;
        const ld = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
        addL(ly, (ldx / ld) * spd * 1.1, (ldy / ld) * spd * 1.1, 6);
        const ry = 90 + Math.random() * (H - 160);
        const rdx = st.px - (W + 8), rdy = st.py - ry;
        const rd = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        addR(ry, (rdx / rd) * spd * 1.1, (rdy / rd) * spd * 1.1, 6);
      } else if (phase === 3) {
        // 왼쪽 5-way 부채꼴
        for (let i = -2; i <= 2; i++) {
          const a = (i * 16 * Math.PI) / 180;
          addL(H / 2 + i * 28, Math.cos(a) * spd, Math.sin(a) * spd);
        }
      } else if (phase === 4) {
        // 오른쪽 5-way 부채꼴
        for (let i = -2; i <= 2; i++) {
          const a = (i * 16 * Math.PI) / 180;
          addR(H / 2 + i * 28, -Math.cos(a) * spd, Math.sin(a) * spd);
        }
      } else {
        // 양쪽 동시 2발씩 랜덤 y + 미세 각도
        for (let i = 0; i < 2; i++) {
          addL(100 + Math.random() * (H - 180), spd * 1.05, (Math.random() - 0.5) * 1.4);
          addR(100 + Math.random() * (H - 180), -spd * 1.05, (Math.random() - 0.5) * 1.4);
        }
      }
      st.sideBulletPhase++;
    };

    const spawnGem = (W: number, H: number) => {
      const st = g.current;
      st.gems.push({
        id: st.nextId++,
        x: 30 + Math.random() * (W - 60),
        y: 90 + Math.random() * (H - 170),
        born: Date.now(),
        life: 5000 + Math.random() * 3000,
      });
    };

    const loop = (now: number) => {
      const dt  = Math.min(now - last, 50); last = now;
      const dtf = dt / 16.67;
      const st  = g.current;
      const W   = canvas.width, H = canvas.height;
      const realNow = Date.now();
      const dead    = st.deadUntil > realNow;

      if (!clearedRef.current && !dead) {
        if (st.deadUntil !== 0 && realNow >= st.deadUntil) {
          st.deadUntil = 0; st.hits = 0; st.bullets = [];
          st.px = W / 2; st.py = H - 70;
          setDeadUntil(0); setLives(MAX_HITS);
        }
        st.elapsed += dt;

        // 이동
        let mx = 0, my = 0;
        const k = st.keys;
        if (k.has("ArrowLeft")  || k.has("a") || k.has("A")) mx -= 1;
        if (k.has("ArrowRight") || k.has("d") || k.has("D")) mx += 1;
        if (k.has("ArrowUp")    || k.has("w") || k.has("W")) my -= 1;
        if (k.has("ArrowDown")  || k.has("s") || k.has("S")) my += 1;
        if (st.pointerX >= 0) {
          const tdx = st.pointerX - st.px, tdy = st.pointerY - st.py;
          const td  = Math.sqrt(tdx * tdx + tdy * tdy);
          if (td > 8) { mx = tdx / td; my = tdy / td; }
        }
        if (mx !== 0 && my !== 0) { const d = Math.sqrt(mx * mx + my * my); mx /= d; my /= d; }
        const spd = P_SPEED * dtf;
        st.px = Math.max(P_HIT_R + 4, Math.min(W - P_HIT_R - 4, st.px + mx * spd));
        st.py = Math.max(82, Math.min(H - P_HIT_R - 4, st.py + my * spd));

        // 탄막 발사 (상단)
        const interval = Math.max(650, 1500 - st.elapsed / 50);
        if (realNow - st.lastBullet > interval) { st.lastBullet = realNow; fireBullets(W, H, now); }
        // 탄막 발사 (사이드)
        const sideInterval = Math.max(500, 1100 - st.elapsed / 60);
        if (realNow - st.lastSideBullet > sideInterval) { st.lastSideBullet = realNow; fireSideBullets(W, H); }

        // 탄막 이동 + 충돌
        const inv = realNow < st.invUntil;
        st.bullets = st.bullets.filter(b => {
          b.x += b.vx * dtf; b.y += b.vy * dtf;
          if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) return false;
          if (!inv) {
            const dx = b.x - st.px, dy = b.y - st.py;
            if (Math.sqrt(dx * dx + dy * dy) < P_HIT_R + b.r) {
              st.hits++;
              setLives(Math.max(0, MAX_HITS - st.hits));
              st.invUntil = realNow + 1500;
              if (st.hits >= MAX_HITS) {
                st.deadUntil = realNow + 1;
                st.bullets = []; st.px = W / 2; st.py = H - 70;
                setDeadUntil(st.deadUntil);
                onDiedRef.current?.();
              }
              return false;
            }
          }
          return true;
        });

        // 보석 생성 + 수집
        const gemInterval = Math.max(1400, 2800 - st.elapsed / 50);
        if (realNow - st.lastGem > gemInterval && st.gems.length < 4) { st.lastGem = realNow; spawnGem(W, H); }
        let collected = 0;
        st.gems = st.gems.filter(gem => {
          if (realNow - gem.born > gem.life) return false;
          const dx = gem.x - st.px, dy = gem.y - st.py;
          if (Math.sqrt(dx * dx + dy * dy) < GEM_R + P_HIT_R) { collected++; return false; }
          return true;
        });
        for (let i = 0; i < collected; i++) onGemRef.current();
      }

      // ── 렌더링 ──
      ctx.clearRect(0, 0, W, H);

      // 우주 배경
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#06060f"); bg.addColorStop(1, "#140920");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // 별
      for (let i = 0; i < 55; i++) {
        const sx = (i * 137.5 + 11) % W, sy = (i * 91.3 + 19) % H;
        ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 5) * 0.1})`;
        ctx.beginPath(); ctx.arc(sx, sy, i % 4 === 0 ? 1.4 : 0.7, 0, Math.PI * 2); ctx.fill();
      }

      // 보스 발광 영역
      const bx = W / 2, by = 55;
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, 62);
      bg2.addColorStop(0, "rgba(160,40,255,0.38)"); bg2.addColorStop(1, "rgba(80,0,160,0)");
      ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bx, by, 62, 0, Math.PI * 2); ctx.fill();

      // 경계선
      ctx.strokeStyle = "rgba(160,40,255,0.14)"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.moveTo(0, 82); ctx.lineTo(W, 82); ctx.stroke();
      ctx.setLineDash([]);

      // 보석
      const rn = Date.now();
      for (const gem of g.current.gems) {
        const age   = rn - gem.born;
        const alpha = age > gem.life - 1200 ? (gem.life - age) / 1200 : 1;
        const pulse = 1 + Math.sin(now * 0.006 + gem.id) * 0.13;
        const s     = 9 * pulse;
        const gg = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, s * 2.6);
        gg.addColorStop(0, `rgba(255,218,50,${alpha * 0.65})`); gg.addColorStop(1, "rgba(255,160,0,0)");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(gem.x, gem.y, s * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.translate(gem.x, gem.y); ctx.rotate(now * 0.0016 + gem.id * 0.9);
        ctx.fillStyle = "#FFD700";
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.65, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.65, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,180,0.72)";
        ctx.beginPath(); ctx.moveTo(0, -s * 0.45); ctx.lineTo(s * 0.28, 0); ctx.lineTo(0, s * 0.2); ctx.lineTo(-s * 0.28, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // 탄막
      for (const b of g.current.bullets) {
        const bg3 = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.6);
        if (b.side) {
          bg3.addColorStop(0, "rgba(0,210,255,0.9)"); bg3.addColorStop(0.5, "rgba(0,120,230,0.5)"); bg3.addColorStop(1, "rgba(0,60,160,0)");
          ctx.fillStyle = bg3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#00d2ff"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#aaefff"; ctx.beginPath(); ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.38, 0, Math.PI * 2); ctx.fill();
        } else {
          bg3.addColorStop(0, "rgba(255,55,80,0.9)"); bg3.addColorStop(0.5, "rgba(200,0,60,0.5)"); bg3.addColorStop(1, "rgba(140,0,50,0)");
          ctx.fillStyle = bg3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ff5577"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffaacc"; ctx.beginPath(); ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.38, 0, Math.PI * 2); ctx.fill();
        }
      }

      // 플레이어 발광
      if (!dead) {
        const inv   = rn < g.current.invUntil;
        const blink = inv && Math.floor(rn / 80) % 2 === 0;
        if (!blink) {
          const pg = ctx.createRadialGradient(st.px, st.py, 0, st.px, st.py, 22);
          pg.addColorStop(0, inv ? "rgba(255,200,80,0.55)" : "rgba(80,130,255,0.48)"); pg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(st.px, st.py, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.beginPath(); ctx.arc(st.px, st.py, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        if (playerRef.current) {
          playerRef.current.style.left    = `${Math.round(st.px - 22)}px`;
          playerRef.current.style.top     = `${Math.round(st.py - 22)}px`;
          playerRef.current.style.opacity = blink ? "0.25" : "1";
        }
      } else if (playerRef.current) {
        playerRef.current.style.opacity = "0";
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
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
    <div ref={wrapRef} className="relative mx-3 mb-2 mt-1 select-none overflow-hidden rounded-xl border border-border"
      style={{ height: 300, touchAction: "none" }}>
      <canvas ref={canvasRef} className="block h-[300px] w-full"
        onPointerDown={onPtrMove} onPointerMove={onPtrMove}
        onPointerUp={onPtrEnd}   onPointerLeave={onPtrEnd} />
      {/* 플레이어 스프라이트 */}
      <div ref={playerRef} className="pointer-events-none absolute" style={{ left: 0, top: 0 }}>
        <PixelSprite type={charDef.type} colors={charDef.colors} characterId={charDef.id} size={44} />
      </div>
      {/* 목숨 */}
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex gap-0.5">
        {Array.from({ length: MAX_HITS }).map((_, i) => (
          <Heart key={i} className={`h-4 w-4 ${i < lives ? "fill-red-500 text-red-500" : "text-gray-400/60"}`} />
        ))}
      </div>
      {/* 조작 안내 */}
      <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white">
        {t("raid.bullet_hint")}
      </div>
      {/* 사망 오버레이 */}
      {isDead && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/72 text-white">
          <div className="text-lg font-extrabold">{t("raid.eliminated")}</div>
        </div>
      )}
    </div>
  );
}

export default function RaidPage() {
  const { rewardSummary, openEgg, openEggs, refreshRewards } = useAppData();
  const { t, lang } = useLang();
  const bossName = (id: number | undefined) => (id ? getCharName(charById(id), lang) : "");
  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;

  const RAIDS: Record<number, { name: string; bossName: string; desc: string }> = {
    1: { name: t("raid.type.1.name"), bossName: t("raid.type.1.boss"), desc: t("raid.type.1.desc") },
    3: { name: t("raid.type.3.name"), bossName: t("raid.type.3.boss"), desc: t("raid.type.3.desc") },
    4: { name: t("raid.type.4.name"), bossName: t("raid.type.4.boss"), desc: t("raid.type.4.desc") },
    5: { name: t("raid.type.5.name"), bossName: t("raid.type.5.boss"), desc: t("raid.type.5.desc") },
  };
  const RAID_MISSION_LABELS: Record<number, TranslationKey> = {
    1: "raid.type.1.mission_label",
    3: "raid.type.3.mission_label",
    4: "raid.type.4.mission_label",
    5: "raid.type.5.mission_label",
  };
  const RAID_MISSION_HINTS: Partial<Record<number, TranslationKey>> = {
    1: "raid.type.1.mission_hint",
    5: "raid.type.5.mission_hint",
  };

  const CONTRIBUTE_META: Record<number, { title: string; field: string; placeholder: string; hasAnswer: boolean; answerPlaceholder?: string }> = {
    3: { title: t("raid.contrib.3.title"), field: t("raid.contrib.3.field"), placeholder: t("raid.contrib.3.placeholder"), hasAnswer: true, answerPlaceholder: t("raid.contrib.3.answer_placeholder") },
    4: { title: t("raid.contrib.4.title"), field: t("raid.contrib.4.field"), placeholder: t("raid.contrib.4.placeholder"), hasAnswer: false },
  };

  const EGG_LABEL: Record<string, string> = {
    normal: t("egg.normal"),
    big: t("egg.big"),
    golden: t("egg.golden"),
  };

  const EGG_META: { type: EggType; name: string; range: string; tint: string }[] = [
    { type: "normal", name: t("egg.normal"), range: t("egg.range.normal"), tint: "from-gray-200 to-gray-300" },
    { type: "big", name: t("egg.big"), range: t("egg.range.big"), tint: "from-sky-200 to-blue-300" },
    { type: "golden", name: t("egg.golden"), range: t("egg.range.golden"), tint: "from-amber-200 to-yellow-400" },
  ];

  const eggCounts: Record<EggType, number> = {
    normal: rewardSummary.normalEggs,
    big: rewardSummary.bigEggs,
    golden: rewardSummary.goldenEggs,
  };
  const [opening, setOpening] = useState<EggType | null>(null);
  const [eggResult, setEggResult] = useState<EggOpenResult | null>(null);
  const [eggBatchResults, setEggBatchResults] = useState<{ type: EggType; results: EggOpenResult[] } | null>(null);

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
  const [lobby, setLobby] = useState<Record<number, { count: number; cooldownUntil: number; bossCharId?: number; currentHp?: number; maxHp?: number }>>({
    1: { count: 0, cooldownUntil: 0 },
    3: { count: 0, cooldownUntil: 0 }, 4: { count: 0, cooldownUntil: 0 },
  });
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<RaidState | null>(null);
  const [self, setSelf] = useState<SelfInfo | null>(null);
  const [bubbles, setBubbles] = useState<ChatMsg[]>([]);
  const [feedback, setFeedback] = useState<string>("");
  const [reward, setReward] = useState<Reward | null>(null);
  const [full, setFull] = useState(false);
  const [input, setInput] = useState("");
  const [hit, setHit] = useState(false);
  const [bossLine, setBossLine] = useState<string>("");
  const [damageNums, setDamageNums] = useState<{ id: number; x: number; dmg: number }[]>([]);
  const [banned, setBanned] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [contributed, setContributed] = useState(false);
  const [contribText, setContribText] = useState("");
  const [contribAnswer, setContribAnswer] = useState("");
  const [jumpPlayerLives, setJumpPlayerLives] = useState<PlayerLiveMap>({});
  const [chatLives, setChatLives] = useState(5);
  const [eliminated, setEliminated] = useState(false);
  const prevHp = useRef<number | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // 보스 HP 감소 감지 → 피격 연출
  useEffect(() => {
    if (state == null) return;
    if (prevHp.current != null && state.hp < prevHp.current) {
      setHit(true);
      const t = setTimeout(() => setHit(false), 350);
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
    const onLobby = (d: Record<number, { count: number; cooldownUntil: number; bossCharId?: number; currentHp?: number; maxHp?: number }>) => setLobby((p) => ({ ...p, ...d }));
    const onState = (d: RaidState) => setState(d);
    const onSelf = (d: SelfInfo) => setSelf(d);
    const onMsg = (m: ChatMsg) => {
      setBubbles((p) => [...p.slice(-12), m]);
      timers.current[m.id] = setTimeout(() => setBubbles((p) => p.filter((b) => b.id !== m.id)), 4000);
    };
    const onFeedback = (d: { text: string }) => {
      setFeedback(d.text);
      setTimeout(() => setFeedback(""), 1500);
    };
    const onCleared = (d: { reward: Reward; rank?: number; rankings?: RankEntry[] }) => {
      setReward(d.reward);
      setMyRank(d.rank ?? null);
      setRankings(d.rankings ?? []);
      setContributed(false);
      setContribText(""); setContribAnswer("");
      refreshRewards().catch(() => undefined);
    };
    const onFull = () => { setFull(true); setTimeout(() => setFull(false), 2500); };
    const onCooldown = (d: { raidType: number; until: number }) => {
      setLobby((p) => ({ ...p, [d.raidType]: { count: p[d.raidType]?.count ?? 0, cooldownUntil: d.until } }));
      setView("lobby");
    };
    const onBanned = () => { setBanned(true); setView("lobby"); };
    const onBossHit = (d: { line: string; hp?: number; maxHp?: number; dmg?: number }) => {
      setBossLine(d.line);
      setTimeout(() => setBossLine(""), 2200);
      if (d.hp !== undefined) {
        setState((prev) => prev ? { ...prev, hp: d.hp! } : prev);
      }
      const id = Date.now();
      const x = 30 + Math.random() * 40;
      const dmg = d.dmg ?? 1;
      setDamageNums((p) => [...p.slice(-4), { id, x, dmg }]);
      setTimeout(() => setDamageNums((p) => p.filter((n) => n.id !== id)), 900);
    };
    const onJumpLives = (d: { socketId: string; lives: number; characterId: number; nickname: string }) => {
      setJumpPlayerLives((p) => ({ ...p, [d.socketId]: { lives: d.lives, characterId: d.characterId, nickname: d.nickname } }));
    };
    const onChatLives = (d: { lives: number }) => setChatLives(d.lives);
    const onEliminated = () => { setEliminated(true); setView("lobby"); };

    s.on("raid:lobby", onLobby);
    s.on("raid:state", onState);
    s.on("raid:self", onSelf);
    s.on("raid:message", onMsg);
    s.on("raid:feedback", onFeedback);
    s.on("raid:cleared", onCleared);
    s.on("raid:full", onFull);
    s.on("raid:cooldown", onCooldown);
    s.on("raid:banned", onBanned);
    s.on("raid:bossHit", onBossHit);
    s.on("raid:jump_lives", onJumpLives);
    s.on("raid:lives", onChatLives);
    s.on("raid:eliminated", onEliminated);
    s.emit("raid:counts");
    return () => {
      s.off("raid:lobby", onLobby); s.off("raid:state", onState); s.off("raid:self", onSelf);
      s.off("raid:message", onMsg); s.off("raid:feedback", onFeedback); s.off("raid:cleared", onCleared);
      s.off("raid:full", onFull); s.off("raid:cooldown", onCooldown); s.off("raid:banned", onBanned);
      s.off("raid:bossHit", onBossHit); s.off("raid:jump_lives", onJumpLives);
      s.off("raid:lives", onChatLives); s.off("raid:eliminated", onEliminated);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => () => { getRaidSocket().emit("raid:leave"); disconnectRaidSocket(); }, []);

  const enter = (id: number) => {
    setRaidType(id); setState(null); setSelf(null); setBubbles([]); setReward(null);
    setChatLives(5); setEliminated(false);
    const user = getStoredUser();
    getRaidSocket().emit("raid:join", { raidType: id, characterId: myCharacterId, userId: user?.id });
    setView("room");
  };
  const leave = () => {
    getRaidSocket().emit("raid:leave");
    setView("lobby"); setState(null); setSelf(null); setBubbles([]); setReward(null);
  };
  const send = () => {
    const text = input.trim();
    if (!text) return;
    getRaidSocket().emit("raid:input", { text });
    setInput("");
  };
  const emitJump = useCallback(() => { getRaidSocket().emit("raid:jump"); }, []);
  const emitGem  = useCallback(() => { getRaidSocket().emit("raid:gem");  }, []);
  const emitDied = useCallback(() => { getRaidSocket().emit("raid:died"); }, []);
  const submitContribution = () => {
    const meta = CONTRIBUTE_META[raidType];
    const text = contribText.trim();
    const answer = contribAnswer.trim();
    const ok = meta.hasAnswer ? text.length >= 3 && answer.length >= 1 : text.length >= 2;
    if (ok) {
      getRaidSocket().emit("raid:contribute", { raidType, text, answer: meta.hasAnswer ? answer : undefined, userId: getStoredUser()?.id });
    }
    setContributed(true);
  };

  if (view === "lobby") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-2 flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("raid.title")}</h1>
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
                <div key={e.type} className={`rounded-xl bg-gradient-to-b ${e.tint} p-3 text-center`}>
                  <PixelEggSVG type={e.type} size={48} />
                  <div className="mt-1 text-sm font-bold text-gray-800">{e.name}</div>
                  <div className="text-[11px] text-gray-700">{e.range}</div>
                  <div className="mt-1 text-lg font-extrabold text-gray-900">×{cnt}</div>
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

        {banned && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive font-semibold">{t("raid.banned_msg")}</div>}
        {eliminated && !banned && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-500">
            <Heart className="h-4 w-4 fill-red-500" />
            {lang === "ko" ? "라이프가 모두 소진되어 퇴장되었습니다. 다음 타임에 재도전하세요." : "ライフが尽きたため退場しました。次のタイムに再挑戦してください。"}
          </div>
        )}
        {full && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{t("raid.full_msg")}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RAID_IDS.map((id) => {
            const info = lobby[id] ?? { count: 0, cooldownUntil: 0 };
            const onCooldown = info.cooldownUntil > now;
            const full5 = info.count >= MAX_PLAYERS;
            const disabled = onCooldown || full5;
            const bossDef = charById(info.bossCharId ?? getBossChar(id).id);
            return (
              <button
                key={id}
                onClick={() => !disabled && enter(id)}
                disabled={disabled}
                className={`group flex flex-col rounded-2xl border p-4 text-left transition-all ${
                  disabled ? "cursor-not-allowed border-border opacity-60" : "border-border bg-card hover:border-primary hover:shadow-lg"
                }`}
              >
                {/* ── 상단: 인원 + 상태 뱃지 ── */}
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold">
                    <Users className="h-3.5 w-3.5" />
                    <span className={full5 ? "text-destructive" : "text-foreground"}>{info.count}</span>
                    <span className="text-muted-foreground font-normal">/{MAX_PLAYERS}</span>
                  </span>
                  {onCooldown ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-destructive">
                      <Clock className="h-3 w-3" /> {fmtCooldown(info.cooldownUntil - now)}
                    </span>
                  ) : full5 ? (
                    <span className="text-xs font-semibold text-muted-foreground">{t("raid.full")}</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <Swords className="h-3 w-3" /> {t("raid.available")}
                    </span>
                  )}
                </div>
                {/* ── HP 바 (상시 표시) ── */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-semibold text-muted-foreground">HP</span>
                    <span className="text-[10px] font-semibold text-red-400">
                      {info.currentHp ?? info.maxHp ?? '-'} / {info.maxHp ?? '-'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500"
                      style={{ width: `${info.maxHp ? Math.round(((info.currentHp ?? info.maxHp) / info.maxHp) * 100) : 100}%` }}
                    />
                  </div>
                </div>
                {/* ── 보스 스프라이트 ── */}
                <div className="flex justify-center mb-3">
                  <div className={`rounded-2xl bg-black/5 px-6 py-4 dark:bg-white/5 ${onCooldown ? "grayscale" : ""}`}>
                    <PixelCharacter characterId={bossDef.id} size={64} float={!onCooldown} />
                  </div>
                </div>
                {/* ── 텍스트 정보 ── */}
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{RAIDS[id].name}</p>
                  <p className="truncate text-xs text-muted-foreground">BOSS · {getCharName(bossDef, lang)}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{RAIDS[id].desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 알 부화 연출 */}
        {eggResult && (
          <EggHatchModal eggType={eggResult.eggType} result={eggResult} onClose={() => setEggResult(null)} />
        )}
        {eggBatchResults && (
          <EggBatchModal eggType={eggBatchResults.type} results={eggBatchResults.results} onClose={() => setEggBatchResults(null)} />
        )}
      </div>
    );
  }

  const hpPct = state ? Math.round((state.hp / state.maxHp) * 100) : 100;
  const others = (state?.participants ?? []).filter((p) => p.socketId !== self?.socketId);

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted dark:from-gray-900 dark:to-gray-950">
      <style>{`
        @keyframes raid-bubble{0%{opacity:0;transform:translateY(6px)}12%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateY(10px)}}
        @keyframes boss-hit{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
        @keyframes boss-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes damage-float{0%{opacity:1;transform:translateY(0) scale(1.2)}100%{opacity:0;transform:translateY(-32px) scale(0.8)}}
        @keyframes boss-talk-in{0%{opacity:0;transform:translateY(4px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}
      `}</style>

      {/* header */}
      <div className="relative z-20 flex items-center justify-between bg-white/70 px-4 py-3 backdrop-blur dark:bg-gray-900/60">
        <button onClick={leave} className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-200">
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
      <div className="relative z-20 border-b border-border bg-white/60 px-4 py-3 backdrop-blur dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          {/* boss sprite + 데미지 이펙트 */}
          <div className="relative shrink-0">
            <div
              style={{
                animation: state?.cleared ? undefined : hit ? "boss-hit 0.35s" : "boss-float 2.5s ease-in-out infinite",
                filter: state?.cleared ? "grayscale(1) opacity(0.4)" : hit ? "brightness(2)" : undefined,
              }}
            >
              {state && <PixelCharacter characterId={state.boss.characterId} size={72} />}
            </div>
            {/* 데미지 숫자 */}
            {damageNums.map((n) => (
              <span
                key={n.id}
                className="pointer-events-none absolute -top-4 font-extrabold text-red-500 text-base"
                style={{ left: `${n.x}%`, animation: "damage-float 0.9s ease-out forwards" }}
              >
                -{n.dmg}
              </span>
            ))}
          </div>
          {/* boss info + HP */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-base font-extrabold text-gray-900 dark:text-gray-50">{bossName(state?.boss.characterId)}</span>
              <span className="text-xs text-muted-foreground">BOSS</span>
            </div>
            {/* HP bar */}
            <div className="mt-1 h-4 w-full overflow-hidden rounded-full border border-black/10 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <p className="mt-0.5 text-right text-[11px] font-semibold text-red-500">HP {state?.hp ?? 0} / {state?.maxHp ?? 0}</p>
            {/* 보스 대사 */}
            {bossLine && (
              <p
                className="mt-1 text-xs font-semibold text-orange-500 dark:text-orange-400 italic"
                style={{ animation: "boss-talk-in 2.2s ease-out forwards" }}
              >
                {bossLine}
              </p>
            )}
          </div>
        </div>
        {/* boss-issued mission */}
        <div className="mt-2 rounded-lg bg-primary/10 px-3 py-2">
          <p className="text-xs font-semibold text-primary">「{bossName(state?.boss.characterId)}」 {t(RAID_MISSION_LABELS[raidType])}</p>
          <p
            className={`mt-0.5 text-xl font-extrabold text-gray-900 dark:text-gray-50 ${raidType === 4 ? "select-none" : ""}`}
            style={raidType === 4 ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}
            onCopy={raidType === 4 ? (e) => e.preventDefault() : undefined}
            onContextMenu={raidType === 4 ? (e) => e.preventDefault() : undefined}
          >
            {state?.mission.target}
          </p>
          {RAID_MISSION_HINTS[raidType] ? <p className="text-xs text-muted-foreground">{t(RAID_MISSION_HINTS[raidType]!)}</p> : null}
        </div>
      </div>

      {/* feedback toast */}
      {feedback && (
        <div className="pointer-events-none absolute left-1/2 top-52 z-40 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm font-bold text-white">
          {feedback}
        </div>
      )}

      {/* 퀴즈·받아쓰기 라이프 표시 */}
      {(raidType === 3 || raidType === 4) && (
        <div className="pointer-events-none absolute left-2 top-[220px] z-40 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart key={i} className={`h-4 w-4 transition-colors ${i < chatLives ? "fill-red-500 text-red-500" : "text-gray-400/50"}`} />
          ))}
        </div>
      )}

      {raidType === 1 ? (
        /* ── 점프 액션 게임 ── */
        <div className="relative z-10 mt-auto flex flex-1 flex-col justify-end">
          {others.length > 0 && (
            <div className="flex flex-wrap items-end justify-center gap-1 px-4">
              {others.map((p) => {
                const def = charById(p.characterId);
                return <div key={p.socketId} title={p.nickname}><PixelSprite type={def.type} colors={def.colors} characterId={def.id} size={32} /></div>;
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
        <div className="relative z-10 mt-auto flex flex-1 flex-col justify-end">
          {others.length > 0 && (
            <div className="flex flex-wrap items-end justify-center gap-1 px-4 pb-1">
              {others.map((p) => {
                const def = charById(p.characterId);
                return <div key={p.socketId} title={p.nickname}><PixelSprite type={def.type} colors={def.colors} characterId={def.id} size={28} /></div>;
              })}
            </div>
          )}
          <BulletHellGame
            charDef={charById(self?.characterId ?? myCharacterId)}
            cleared={state?.cleared ?? false}
            onGemCollect={emitGem}
            onDied={emitDied}
          />
        </div>
      ) : (
        <>
          {/* chat bubbles */}
          <div className="pointer-events-none absolute inset-x-0 top-64 bottom-40 z-30 overflow-hidden">
            {bubbles.map((b, i) => {
              const def = charById(b.characterId);
              const mine = b.socketId === self?.socketId;
              return (
                <div key={b.id} className="absolute left-1/2 -translate-x-1/2" style={{ top: `${(i % 8) * 12}%`, animation: "raid-bubble 4s ease-out forwards" }}>
                  <div className={`flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-md ${mine ? "border-2 border-primary" : "border border-gray-200"}`}>
                    <PixelSprite type={def.type} colors={def.colors} characterId={def.id} size={20} />
                    <span className={`text-[11px] font-bold ${mine ? "text-primary" : "text-gray-500"}`}>{b.nickname}</span>
                    <span className="text-sm font-medium text-gray-900">{b.text}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* party crowd */}
          <div className="relative z-10 mt-auto flex flex-wrap items-end justify-center gap-1 px-4 pb-2">
            {others.map((p) => {
              const def = charById(p.characterId);
              return <div key={p.socketId} title={p.nickname}><PixelSprite type={def.type} colors={def.colors} characterId={def.id} size={44} /></div>;
            })}
          </div>
          {self && (
            <div className="relative z-10 flex flex-col items-center pb-4">
              <div className="mb-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow">{self.nickname}</div>
              <div style={{ filter: "drop-shadow(0 0 8px rgba(255,213,79,0.8))" }}>
                <PixelSprite type={charById(self.characterId).type} colors={charById(self.characterId).colors} characterId={self.characterId} size={60} float />
              </div>
            </div>
          )}

          {/* input */}
          <div className="relative z-20 flex items-center gap-2 border-t border-white/40 bg-white/80 px-3 py-3 backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) send(); }}
              maxLength={60}
              placeholder={t("raid.input_placeholder")}
              className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <button onClick={send} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105">
              <Send className="h-4 w-4" /> {t("raid.send")}
            </button>
          </div>
        </>
      )}

      {/* clear overlay */}
      {reward && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/75 px-6 text-center">
          {!contributed && CONTRIBUTABLE.has(raidType) ? (
            /* ── 1단계: 레이드별 콘텐츠 기여 (퀴즈·받아쓰기만) ── */
            (() => {
              const meta = CONTRIBUTE_META[raidType];
              const valid = meta.hasAnswer
                ? contribText.trim().length >= 3 && contribAnswer.trim().length >= 1
                : contribText.trim().length >= 2;
              return (
                <div className="w-full max-w-md rounded-2xl bg-card p-6 text-left">
                  <h2 className="text-center text-2xl font-extrabold text-foreground">{bossName(state?.boss.characterId)}{t("raid.boss_defeated_suffix")}</h2>
                  <p className="mt-1 text-center text-sm text-muted-foreground">{meta.title}</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">{meta.field}</label>
                      <input
                        value={contribText}
                        onChange={(e) => setContribText(e.target.value)}
                        maxLength={80}
                        placeholder={meta.placeholder}
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    {meta.hasAnswer && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">{t("raid.answer")}</label>
                        <input
                          value={contribAnswer}
                          onChange={(e) => setContribAnswer(e.target.value)}
                          maxLength={40}
                          placeholder={meta.answerPlaceholder}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => setContributed(true)} className="flex-1 rounded-full bg-muted py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/70">
                      {t("raid.skip")}
                    </button>
                    <button
                      onClick={submitContribution}
                      disabled={!valid}
                      className="flex-[2] rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("raid.submit")}
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            /* ── 2단계: 보상 + 랭킹 ── */
            <div className="w-full max-w-md">
              <div className="flex flex-col items-center">
                <Trophy className="h-14 w-14 text-yellow-400" />
                <h2 className="mt-2 text-2xl font-extrabold text-white">{t("raid.reward_title")}</h2>
                {myRank && <p className="mt-1 text-sm font-bold text-yellow-300">{t("raid.my_rank").replace("{r}", String(myRank))}</p>}
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3">
                {reward.kind === "egg" ? (
                  <>
                    <PixelEggSVG type={reward.egg} size={36} />
                    <div className="text-left">
                      <p className="font-bold text-white">{reward.count && reward.count > 1 ? `×${reward.count} ` : ""}{EGG_LABEL[reward.egg]}{t("raid.reward_egg_suffix")}</p>
                      <p className="text-xs text-yellow-200">{t("raid.reward_go_inventory")}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-7 w-7 text-yellow-300" />
                    <div className="text-left">
                      <p className="font-bold text-white">+{reward.points}{t("raid.reward_points_suffix")}</p>
                      <p className="text-xs text-yellow-200">{t("raid.reward_maybe_egg")}</p>
                    </div>
                  </>
                )}
              </div>
              {rankings.length > 0 && (
                <div className="mt-3 rounded-2xl bg-white/10 p-3">
                  <p className="mb-2 text-xs font-bold text-white/70 text-center">{t("raid.ranking_title")}</p>
                  <div className="space-y-1.5">
                    {rankings.slice(0, 10).map((r) => (
                      <div key={r.userId} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${r.rank <= 3 ? "bg-yellow-400/20" : "bg-white/5"}`}>
                        <span className={`w-5 text-center text-sm font-extrabold ${r.rank === 1 ? "text-yellow-300" : r.rank === 2 ? "text-gray-300" : r.rank === 3 ? "text-amber-500" : "text-white/60"}`}>{r.rank}</span>
                        <span className="flex-1 truncate text-sm text-white">{r.nickname}</span>
                        <span className="text-xs font-bold text-red-300">{r.damage} dmg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={leave} className="mt-4 w-full rounded-full bg-primary py-2 font-semibold text-primary-foreground">{t("raid.to_lobby")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
