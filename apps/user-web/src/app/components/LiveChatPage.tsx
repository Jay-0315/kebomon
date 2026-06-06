import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Radio, Users, Send, ArrowLeft, Castle, Landmark, Waves, Flame } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { getChatSocket, disconnectChatSocket } from "../lib/socket";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS } from "../data/characters";
import { useLang } from "../context/LangContext";

const CHANNELS = [1, 2, 3, 4] as const;
const BUBBLE_TTL = 5000;
const isTouchDevice = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const CHANNEL_NAMES: Record<number, string> = { 1: "폐허", 2: "광장", 3: "해변", 4: "제단" };

const CHANNEL_ICONS: Record<number, React.ReactNode> = {
  1: <Castle size={18} color="#a8a29e" />,
  2: <Landmark size={18} color="#b45309" />,
  3: <Waves size={18} color="#38bdf8" />,
  4: <Flame size={18} color="#f97316" />,
};

const BG_MAP: Record<number, { desktop: string; mobile: string; fill: string; border: string }> = {
  1: { desktop: "/bg-ruins.png",  mobile: "/bg-ruins.v.png",  fill: "#1f2a14", border: "#57534e" },
  2: { desktop: "/bg-plaza.png",  mobile: "/bg-plaza-v.png",  fill: "#8a6535", border: "#b45309" },
  3: { desktop: "/bg-beach.png",  mobile: "/bg-beach-v.png",  fill: "#1a4a6e", border: "#1a4a6e" },
  4: { desktop: "/bg-camp.png",   mobile: "/bg-camp-v.png",   fill: "#2a3a1a", border: "#2a3a1a" },
};

function ChannelBackground({ channelId }: { channelId: number }) {
  const bg = BG_MAP[channelId];
  if (!bg) return <div className="absolute inset-0 bg-gray-900" />;
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: bg.fill }} />
      <picture>
        <source media="(max-width: 768px)" srcSet={bg.mobile} />
        <img
          src={bg.desktop}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
          alt="" aria-hidden
        />
      </picture>
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
    </>
  );
}

type Pos = { x: number; y: number };
type RosterEntry = { socketId: string; characterId: number; nickname: string; x?: number; y?: number };
type SelfInfo = { socketId: string; nickname: string; characterId: number; x?: number; y?: number };
type ChatMsg = { id: string; socketId: string; nickname: string; characterId: number; text: string; bx: number; by: number };

function Joystick({ onChange }: { onChange: (dx: number, dy: number) => void }) {
  const RADIUS = 38;
  const [knob, setKnob] = useState<Pos>({ x: 0, y: 0 });
  const active = useRef(false);
  const center = useRef<Pos>({ x: 0, y: 0 });

  const update = (cx: number, cy: number) => {
    const dx = cx - center.current.x;
    const dy = cy - center.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clamped = Math.min(dist, RADIUS);
    setKnob({ x: (dx / dist) * clamped, y: (dy / dist) * clamped });
    onChange(dx / Math.max(dist, RADIUS), dy / Math.max(dist, RADIUS));
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    active.current = true;
    update(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => { if (active.current) update(e.clientX, e.clientY); };
  const onUp = () => { active.current = false; setKnob({ x: 0, y: 0 }); onChange(0, 0); };

  return (
    <div
      className="relative touch-none select-none rounded-full bg-black/30 border-2 border-white/30"
      style={{ width: RADIUS * 2 + 16, height: RADIUS * 2 + 16 }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div
        className="absolute rounded-full bg-white/60 border border-white/80"
        style={{ width: 32, height: 32, left: `calc(50% + ${knob.x}px - 16px)`, top: `calc(50% + ${knob.y}px - 16px)` }}
      />
    </div>
  );
}

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export default function LiveChatPage() {
  const { rewardSummary } = useAppData();
  const { t } = useLang();
  const location = useLocation();
  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;

  const [view, setView] = useState<"lobby" | "room">("lobby");
  const [channelId, setChannelId] = useState<number>(1);
  const [counts, setCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [self, setSelf] = useState<SelfInfo | null>(null);
  const [bubbles, setBubbles] = useState<ChatMsg[]>([]);
  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [input, setInput] = useState("");
  const [mutedUntil, setMutedUntil] = useState(0);
  const [muteLeft, setMuteLeft] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const selfIdRef = useRef<string | null>(null);
  const ownPosRef = useRef<Pos>({ x: 50, y: 78 });
  const allPosRef = useRef<Record<string, Pos>>({});
  const keysRef = useRef(new Set<string>());
  const joystickRef = useRef<Pos>({ x: 0, y: 0 });
  const lastEmitRef = useRef(0);
  const rafRef = useRef(0);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getChatSocket();

    const onCounts = (data: Record<number, number>) => setCounts((prev) => ({ ...prev, ...data }));

    const onRoster = (data: { channelId: number; participants: RosterEntry[] }) => {
      setRoster(data.participants);
      setPositions((prev) => {
        const next: Record<string, Pos> = { ...prev };
        data.participants.forEach((p) => {
          if (!next[p.socketId]) {
            const pos = { x: p.x ?? 50, y: p.y ?? 78 };
            next[p.socketId] = pos;
            allPosRef.current[p.socketId] = pos;
          }
        });
        const ids = new Set(data.participants.map((p) => p.socketId));
        Object.keys(next).forEach((id) => {
          if (!ids.has(id) && id !== selfIdRef.current) {
            delete next[id];
            delete allPosRef.current[id];
          }
        });
        return next;
      });
    };

    const onSelf = (data: SelfInfo) => {
      setSelf(data);
      selfIdRef.current = data.socketId;
      const pos = { x: data.x ?? 50, y: data.y ?? 78 };
      ownPosRef.current = pos;
      allPosRef.current[data.socketId] = pos;
      setPositions((prev) => ({ ...prev, [data.socketId]: pos }));
    };

    const onMove = (d: { socketId: string; x: number; y: number }) => {
      if (d.socketId === selfIdRef.current) return;
      const pos = { x: d.x, y: d.y };
      allPosRef.current[d.socketId] = pos;
      setPositions((prev) => ({ ...prev, [d.socketId]: pos }));
    };

    const onMessage = (m: Omit<ChatMsg, "bx" | "by">) => {
      const p = allPosRef.current[m.socketId] ?? ownPosRef.current;
      const bubble: ChatMsg = { ...m, bx: p.x, by: p.y };
      setBubbles((prev) => [...prev.slice(-30), bubble]);
      timersRef.current[bubble.id] = setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));
        delete timersRef.current[bubble.id];
      }, BUBBLE_TTL);
    };

    const onMuted = (data: { until: number }) => setMutedUntil(data.until);

    socket.on("chat:counts", onCounts);
    socket.on("chat:roster", onRoster);
    socket.on("chat:self", onSelf);
    socket.on("chat:move", onMove);
    socket.on("chat:message", onMessage);
    socket.on("chat:muted", onMuted);
    socket.emit("chat:counts");

    return () => {
      socket.off("chat:counts", onCounts);
      socket.off("chat:roster", onRoster);
      socket.off("chat:self", onSelf);
      socket.off("chat:move", onMove);
      socket.off("chat:message", onMessage);
      socket.off("chat:muted", onMuted);
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (mutedUntil <= Date.now()) { setMuteLeft(0); return; }
    const tick = () => {
      const left = Math.ceil((mutedUntil - Date.now()) / 1000);
      setMuteLeft(left > 0 ? left : 0);
      if (left <= 0) setMutedUntil(0);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [mutedUntil]);

  useEffect(() => {
    return () => {
      getChatSocket().emit("chat:leave");
      disconnectChatSocket();
    };
  }, []);

  // 입장 시 높이를 현재 innerHeight로 고정 — 키보드가 올라와도 레이아웃 불변
  useEffect(() => {
    if (view !== "room") return;
    const el = containerRef.current;
    if (!el) return;
    el.style.height = `${window.innerHeight}px`;
    return () => { el.style.height = ""; };
  }, [view]);

  useEffect(() => {
    if (view !== "room") return;
    const MOVE_KEYS = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D"]);
    const kd = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter") { e.preventDefault(); inputRef.current?.focus(); return; }
      if (MOVE_KEYS.has(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
    };
    const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      keysRef.current.clear();
    };
  }, [view]);

  useEffect(() => {
    if (view !== "room") return;
    const SPEED = 0.10;
    const loop = () => {
      const keys = keysRef.current;
      const joy = joystickRef.current;
      let { x, y } = ownPosRef.current;
      let moved = false;

      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) { x -= SPEED; moved = true; }
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) { x += SPEED; moved = true; }
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) { y -= SPEED; moved = true; }
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) { y += SPEED; moved = true; }
      if (Math.abs(joy.x) > 0.08 || Math.abs(joy.y) > 0.08) { x += joy.x * SPEED * 1.5; y += joy.y * SPEED * 1.5; moved = true; }

      if (moved) {
        x = Math.max(3, Math.min(97, x));
        y = Math.max(15, Math.min(92, y));
        ownPosRef.current = { x, y };
        const sid = selfIdRef.current;
        if (sid) {
          allPosRef.current[sid] = { x, y };
          setPositions((prev) => ({ ...prev, [sid]: { x, y } }));
          const now = Date.now();
          if (now - lastEmitRef.current > 50) {
            getChatSocket().emit("chat:move", { x, y });
            lastEmitRef.current = now;
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [view]);

  const enterChannel = (id: number) => {
    setChannelId(id);
    setBubbles([]);
    setRoster([]);
    setSelf(null);
    setPositions({});
    allPosRef.current = {};
    ownPosRef.current = { x: 50, y: 78 };
    getChatSocket().emit("chat:join", { channelId: id, characterId: myCharacterId });
    setView("room");
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = (location.state as { channelId?: number } | null)?.channelId;
    if (id) enterChannel(id);
  }, []);

  const leaveChannel = () => {
    getChatSocket().emit("chat:leave");
    setView("lobby");
    setBubbles([]);
    setRoster([]);
    setSelf(null);
    setPositions({});
    allPosRef.current = {};
  };

  const isMuted = muteLeft > 0;

  const send = () => {
    if (isMuted) return;
    const text = input.trim();
    if (!text) return;
    getChatSocket().emit("chat:message", { text });
    setInput("");
  };

  const allChars = useMemo(() => {
    const map = new Map<string, RosterEntry>();
    roster.forEach((p) => map.set(p.socketId, p));
    if (self) map.set(self.socketId, { socketId: self.socketId, characterId: self.characterId, nickname: self.nickname });
    return [...map.values()];
  }, [roster, self]);

  if (view === "lobby") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("live.title")}</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{t("live.desc")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHANNELS.map((id) => {
            const bg = BG_MAP[id];
            return (
              <button
                key={id}
                onClick={() => enterChannel(id)}
                className="group relative flex overflow-hidden rounded-2xl border text-left transition-all hover:shadow-lg"
                style={{ borderColor: bg.border, background: "transparent" }}
              >
                <div className="absolute inset-0" style={{ backgroundColor: bg.fill }} />
                <picture>
                  <source media="(max-width: 768px)" srcSet={bg.mobile} />
                  <img
                    src={bg.desktop}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ imageRendering: "pixelated" }}
                    alt="" aria-hidden
                  />
                </picture>
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative flex w-full items-center justify-between p-5">
                  <div>
                    <div className="flex items-center gap-2 text-lg font-bold text-white drop-shadow">
                      <span>{CHANNEL_ICONS[id]}</span>
                      ch.{id}
                      <span className="text-sm font-medium text-white/70">{CHANNEL_NAMES[id]}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm text-white/60">
                      <Users className="h-4 w-4" />
                      <span>{counts[id] ?? 0}{t("live.participants_suffix")}</span>
                    </div>
                  </div>
                  <div className="hidden sm:block rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-105">
                    {t("live.enter")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-x-0 top-0 z-40 flex flex-col overflow-hidden">
      <ChannelBackground channelId={channelId} />

      <div className="relative z-20 flex items-center justify-between bg-white/70 px-4 py-3 backdrop-blur dark:bg-gray-900/60">
        <button
          onClick={leaveChannel}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> {t("live.leave")}
        </button>
        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
          <Radio className="h-4 w-4 text-primary" />
          {CHANNEL_ICONS[channelId]}
          <span>ch.{channelId}</span>
          <span className="text-sm font-normal text-muted-foreground">{CHANNEL_NAMES[channelId]}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
          <Users className="h-4 w-4" /> {roster.length}
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-hidden">
        {allChars
          .slice()
          .sort((a, b) => (positions[a.socketId]?.y ?? 78) - (positions[b.socketId]?.y ?? 78))
          .map((p) => {
            const pos = positions[p.socketId] ?? { x: 50, y: 78 };
            const isSelf = p.socketId === self?.socketId;
            const def = charById(p.characterId);
            return (
              <div
                key={p.socketId}
                className="pointer-events-none absolute flex flex-col items-center"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -100%)",
                  transition: isSelf ? "none" : "left 0.06s linear, top 0.06s linear",
                  zIndex: Math.round(pos.y * 10),
                }}
              >
                <PixelSprite type={def.type} colors={def.colors} characterId={def.id} rarity={def.rarity} size={isSelf ? 58 : 42} float={isSelf} />
                <span className="mt-0.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm whitespace-nowrap">
                  {isSelf ? "★ " : ""}{p.nickname}
                </span>
              </div>
            );
          })}

        <div className="pointer-events-none absolute inset-0">
          {bubbles.map((b) => {
            const isMine = b.socketId === self?.socketId;
            const def = charById(b.characterId);
            return (
              <div
                key={b.id}
                className="absolute"
                style={{
                  left: `${b.bx}%`,
                  top: `${b.by}%`,
                  transform: "translate(calc(-100% - 10px), calc(-100% - 84px))",
                  zIndex: 999,
                }}
              >
                <div style={{ animation: `bubble-pop ${BUBBLE_TTL}ms ease-out forwards` }}>
                  <div className={`flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-md ${isMine ? "border-2 border-primary" : "border border-gray-200"}`}>
                    <PixelSprite type={def.type} colors={def.colors} characterId={def.id} rarity={def.rarity} size={20} />
                    <span className={`text-[11px] font-bold ${isMine ? "text-primary" : "text-gray-500"}`}>{b.nickname}</span>
                    <span className="text-sm font-medium text-gray-900">{b.text}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isTouchDevice && (
          <div className="absolute bottom-6 left-6 z-30">
            <Joystick onChange={(dx, dy) => { joystickRef.current = { x: dx, y: dy }; }} />
          </div>
        )}

        {!isTouchDevice && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">
            WASD / 방향키로 이동
          </div>
        )}
      </div>

      <div className="relative z-20 flex items-center gap-2 border-t border-white/40 bg-white/80 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.nativeEvent.isComposing) { send(); inputRef.current?.blur(); }
          }}
          maxLength={100}
          disabled={isMuted}
          placeholder={isMuted ? `${t("live.muted_prefix")}${muteLeft}${t("live.muted_suffix")}` : t("live.placeholder")}
          style={{ fontSize: "16px" }}
          className={`min-w-0 flex-1 rounded-full border px-3 py-1.5 outline-none ${
            isMuted
              ? "border-gray-200 bg-gray-100 text-gray-400 placeholder:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
              : "border-gray-300 bg-white text-gray-900 focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          }`}
        />
        <button
          onClick={send}
          disabled={isMuted}
          className={`shrink-0 flex items-center justify-center rounded-full p-2 text-primary-foreground transition-transform ${
            isMuted ? "cursor-not-allowed bg-gray-300 dark:bg-gray-700" : "bg-primary hover:scale-105"
          }`}
        >
          {isMuted ? (
            <span className="text-xs font-bold w-6 text-center">{muteLeft}s</span>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
