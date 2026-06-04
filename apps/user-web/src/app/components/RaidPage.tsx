import { useCallback, useEffect, useRef, useState } from "react";
import { Swords, Users, Send, ArrowLeft, Trophy, Egg, Sparkles, Clock, Heart } from "lucide-react";
import { useAppData, type EggType, type EggOpenResult } from "../context/AppDataContext";
import { getRaidSocket, disconnectRaidSocket } from "../lib/socket";
import { getStoredUser } from "../lib/auth";
import PixelCharacter, { PixelSprite } from "./PixelCharacter";
import { CHARACTERS, getCharName } from "../data/characters";
import EggHatchModal from "./EggHatchModal";
import { useLang } from "../context/LangContext";

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

const RAID_IDS = [1, 3, 4];
// 기여(문제 출제)를 받는 레이드 — 퀴즈·받아쓰기만 (점프·끝말잇기는 제외)
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
type Reward = { kind: "points"; points: number } | { kind: "egg"; egg: EggType };

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

// ─── 점프 액션 게임 (점프 레이드 / 타입1) ─────────────────────────────────
// 장애물이 계속 다가오고, 스페이스바(또는 터치)로 점프해서 넘으면 보스에게 데미지.
type Obstacle = { x: number; ow: number; oh: number; counted: boolean; hit: boolean };
function JumpGame({
  charDef,
  cleared,
  onClear,
}: {
  charDef: ReturnType<typeof charById>;
  cleared: boolean;
  onClear: () => void;
}) {
  const { t } = useLang();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;
  const clearedRef = useRef(cleared);
  clearedRef.current = cleared;
  const [stunned, setStunned] = useState(false);
  const [lives, setLives] = useState(5); // 남은 목숨 (5번 맞으면 사망)
  const [deadUntil, setDeadUntil] = useState(0); // 부활 시각(Date.now 기준), 0=생존
  const [deadRemain, setDeadRemain] = useState(0); // 부활까지 남은 초

  const MAX_HITS = 5;
  const REVIVE_MS = 30000; // 30초 쿨타임

  const g = useRef({
    jy: 0,
    vy: 0,
    grounded: true,
    stunUntil: 0,
    hits: 0,
    deadUntil: 0, // Date.now 기준
    obstacles: [] as Obstacle[],
    spawnAcc: 0,
    nextSpawn: 1100,
    speed: 4,
    elapsed: 0,
  });

  const doJump = useCallback(() => {
    const st = g.current;
    if (clearedRef.current) return;
    if (Date.now() < st.deadUntil) return; // 사망 중엔 점프 불가
    if (performance.now() < st.stunUntil) return;
    if (st.grounded) {
      st.vy = 11;
      st.grounded = false;
    }
  }, []);

  // 부활 카운트다운 표시
  useEffect(() => {
    if (!deadUntil) {
      setDeadRemain(0);
      return;
    }
    const tick = () => setDeadRemain(Math.max(0, Math.ceil((deadUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadUntil]);

  // 키보드(스페이스/↑) — 페이지 스크롤 방지
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        doJump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doJump]);

  // 게임 루프
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();

    const GROUND_H = 16; // 바닥 두께
    const HITX = 50; // 플레이어 히트박스 좌표
    const HITW = 30;
    const JUMP_V = 11;
    const GRAVITY = 0.6; // per frame

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
        // 부활 처리
        if (st.deadUntil !== 0 && realNow >= st.deadUntil) {
          st.deadUntil = 0;
          st.hits = 0;
          st.obstacles = [];
          st.spawnAcc = 0;
          st.jy = 0;
          st.vy = 0;
          st.grounded = true;
          setDeadUntil(0);
          setLives(MAX_HITS);
        }

        st.elapsed += dt;

        // 점프 물리
        if (!st.grounded) {
          st.jy += st.vy * dtf;
          st.vy -= GRAVITY * dtf;
          if (st.jy <= 0) {
            st.jy = 0;
            st.vy = 0;
            st.grounded = true;
          }
        }

        // 시간이 지날수록 살짝 빨라짐
        st.speed = 4 + Math.min(3.5, st.elapsed / 14000);

        // 장애물 생성
        st.spawnAcc += dt;
        if (st.spawnAcc >= st.nextSpawn) {
          st.spawnAcc = 0;
          st.nextSpawn = 850 + Math.random() * 650 - Math.min(350, st.elapsed / 40);
          const oh = 22 + Math.floor(Math.random() * 22);
          st.obstacles.push({ x: W + 12, ow: 16 + Math.floor(Math.random() * 12), oh, counted: false, hit: false });
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
              // 사망 → 30초 후 부활
              st.deadUntil = Date.now() + REVIVE_MS;
              st.obstacles = [];
              st.jy = 0;
              st.vy = 0;
              st.grounded = true;
              setDeadUntil(st.deadUntil);
              setStunned(false);
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
      // 바닥
      ctx.fillStyle = "#c9b896";
      ctx.fillRect(0, groundY, W, GROUND_H);
      ctx.fillStyle = "#a18a63";
      ctx.fillRect(0, groundY, W, 3);
      // 장애물
      for (const o of st.obstacles) {
        const topY = groundY - o.oh;
        ctx.fillStyle = o.hit ? "#9ca3af" : "#3f7d5a";
        ctx.fillRect(o.x, topY, o.ow, o.oh);
        ctx.beginPath();
        ctx.moveTo(o.x, topY);
        ctx.lineTo(o.x + o.ow / 2, topY - 9);
        ctx.lineTo(o.x + o.ow, topY);
        ctx.closePath();
        ctx.fill();
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
      {deadUntil > 0 ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 text-white">
          <div className="text-lg font-extrabold">{t("raid.jump_dead")}</div>
          <div className="mt-1 text-sm">{t("raid.jump_revive").replace("{s}", String(deadRemain))}</div>
        </div>
      ) : stunned ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600/85 px-4 py-1.5 text-sm font-extrabold text-white">
          {t("raid.jump_stun")}
        </div>
      ) : null}
    </div>
  );
}

export default function RaidPage() {
  const { rewardSummary, openEgg, refreshRewards } = useAppData();
  const { t, lang } = useLang();
  const bossName = (id: number | undefined) => (id ? getCharName(charById(id), lang) : "");
  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;

  const RAIDS: Record<number, { name: string; bossName: string; desc: string }> = {
    1: { name: t("raid.type.1.name"), bossName: t("raid.type.1.boss"), desc: t("raid.type.1.desc") },
    3: { name: t("raid.type.3.name"), bossName: t("raid.type.3.boss"), desc: t("raid.type.3.desc") },
    4: { name: t("raid.type.4.name"), bossName: t("raid.type.4.boss"), desc: t("raid.type.4.desc") },
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

  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [raidType, setRaidType] = useState(1);
  const [lobby, setLobby] = useState<Record<number, { count: number; cooldownUntil: number; bossCharId?: number }>>({
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
  const [contributed, setContributed] = useState(false);
  const [contribText, setContribText] = useState("");
  const [contribAnswer, setContribAnswer] = useState("");
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
    const onLobby = (d: Record<number, { count: number; cooldownUntil: number; bossCharId?: number }>) => setLobby((p) => ({ ...p, ...d }));
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
    const onCleared = (d: { reward: Reward }) => {
      setReward(d.reward);
      setContributed(false);
      setContribText(""); setContribAnswer("");
      // 서버가 알/포인트를 적립했으니 요약 갱신
      refreshRewards().catch(() => undefined);
    };
    const onFull = () => { setFull(true); setTimeout(() => setFull(false), 2500); };
    const onCooldown = (d: { raidType: number; until: number }) => {
      setLobby((p) => ({ ...p, [d.raidType]: { count: p[d.raidType]?.count ?? 0, cooldownUntil: d.until } }));
      setView("lobby");
    };

    s.on("raid:lobby", onLobby);
    s.on("raid:state", onState);
    s.on("raid:self", onSelf);
    s.on("raid:message", onMsg);
    s.on("raid:feedback", onFeedback);
    s.on("raid:cleared", onCleared);
    s.on("raid:full", onFull);
    s.on("raid:cooldown", onCooldown);
    s.emit("raid:counts");
    return () => {
      s.off("raid:lobby", onLobby); s.off("raid:state", onState); s.off("raid:self", onSelf);
      s.off("raid:message", onMsg); s.off("raid:feedback", onFeedback); s.off("raid:cleared", onCleared);
      s.off("raid:full", onFull); s.off("raid:cooldown", onCooldown);
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => () => { getRaidSocket().emit("raid:leave"); disconnectRaidSocket(); }, []);

  const enter = (id: number) => {
    setRaidType(id); setState(null); setSelf(null); setBubbles([]); setReward(null);
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
  const submitContribution = () => {
    const meta = CONTRIBUTE_META[raidType];
    const text = contribText.trim();
    const answer = contribAnswer.trim();
    const ok = meta.hasAnswer ? text.length >= 3 && answer.length >= 1 : text.length >= 2;
    if (ok) {
      getRaidSocket().emit("raid:contribute", { raidType, text, answer: meta.hasAnswer ? answer : undefined });
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
                </div>
              );
            })}
          </div>
        </div>

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
                className={`group rounded-2xl border p-4 text-left transition-all ${
                  disabled ? "cursor-not-allowed border-border opacity-60" : "border-border bg-card hover:border-primary hover:shadow-lg"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* boss sprite */}
                  <div className={`shrink-0 rounded-xl bg-black/5 p-1 dark:bg-white/5 ${onCooldown ? "grayscale" : ""}`}>
                    <PixelSprite type={bossDef.type} colors={bossDef.colors} characterId={bossDef.id} size={52} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-base font-bold">{RAIDS[id].name}</span>
                      <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" /> {info.count}/{MAX_PLAYERS}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">BOSS · {getCharName(bossDef, lang)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{RAIDS[id].desc}</p>
                  </div>
                </div>
                {onCooldown ? (
                  <div className="mt-2 flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive">
                    <Clock className="h-3 w-3" /> {t("raid.cooldown_prefix")} {fmtCooldown(info.cooldownUntil - now)}
                  </div>
                ) : full5 ? (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                    {t("raid.full")}
                  </div>
                ) : (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Swords className="h-3 w-3" /> {t("raid.available")}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 알 부화 연출 */}
        {eggResult && (
          <EggHatchModal eggType={eggResult.eggType} result={eggResult} onClose={() => setEggResult(null)} />
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
          {/* boss sprite */}
          <div
            className="shrink-0"
            style={{
              animation: state?.cleared ? undefined : hit ? "boss-hit 0.35s" : "boss-float 2.5s ease-in-out infinite",
              filter: state?.cleared ? "grayscale(1) opacity(0.4)" : hit ? "brightness(2)" : undefined,
            }}
          >
            {state && <PixelCharacter characterId={state.boss.characterId} size={72} />}
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
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <p className="mt-0.5 text-right text-[11px] font-semibold text-red-500">HP {state?.hp ?? 0} / {state?.maxHp ?? 0}</p>
          </div>
        </div>
        {/* boss-issued mission */}
        <div className="mt-2 rounded-lg bg-primary/10 px-3 py-2">
          <p className="text-xs font-semibold text-primary">「{bossName(state?.boss.characterId)}」 {state?.mission.label}</p>
          <p
            className={`mt-0.5 text-xl font-extrabold text-gray-900 dark:text-gray-50 ${raidType === 4 ? "select-none" : ""}`}
            style={raidType === 4 ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}
            onCopy={raidType === 4 ? (e) => e.preventDefault() : undefined}
            onContextMenu={raidType === 4 ? (e) => e.preventDefault() : undefined}
          >
            {state?.mission.target}
          </p>
          {state?.mission.hint ? <p className="text-xs text-muted-foreground">{state.mission.hint}</p> : null}
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
          {/* 함께 싸우는 동료 */}
          {others.length > 0 && (
            <div className="flex flex-wrap items-end justify-center gap-1 px-4">
              {others.map((p) => {
                const def = charById(p.characterId);
                return <div key={p.socketId} title={p.nickname}><PixelSprite type={def.type} colors={def.colors} characterId={def.id} size={32} /></div>;
              })}
            </div>
          )}
          <JumpGame charDef={charById(self?.characterId ?? myCharacterId)} cleared={state?.cleared ?? false} onClear={emitJump} />
        </div>
      ) : (
        <>
          {/* chat bubbles */}
          <div className="pointer-events-none absolute inset-x-0 top-52 bottom-40 z-30 overflow-hidden">
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
            /* ── 2단계: 보상 ── */
            <>
              <Trophy className="h-16 w-16 text-yellow-400" />
              <h2 className="mt-3 text-3xl font-extrabold text-white">{t("raid.reward_title")}</h2>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/10 px-6 py-4">
                {reward.kind === "egg" ? (
                  <>
                    <PixelEggSVG type={reward.egg} size={40} />
                    <div className="text-left">
                      <p className="text-lg font-bold text-white">{EGG_LABEL[reward.egg]}{t("raid.reward_egg_suffix")}</p>
                      <p className="text-sm text-yellow-200">{t("raid.reward_go_inventory")}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-8 w-8 text-yellow-300" />
                    <div className="text-left">
                      <p className="text-lg font-bold text-white">+{reward.points}{t("raid.reward_points_suffix")}</p>
                      <p className="text-sm text-yellow-200">{t("raid.reward_maybe_egg")}</p>
                    </div>
                  </>
                )}
              </div>
              <p className="mt-4 text-sm text-white/70">{t("raid.cooldown_hint")}</p>
              <button onClick={leave} className="mt-6 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">{t("raid.to_lobby")}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
