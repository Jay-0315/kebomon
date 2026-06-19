import { useEffect, useRef, useState } from "react";
import { Swords, ArrowLeft, Plus, Lock, Users, Crown, Shield, Trophy } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { getStoredUser } from "../lib/auth";
import { getDuelSocket, disconnectDuelSocket } from "../lib/socket";
import { CHARACTERS } from "../data/characters";
import { PixelSprite } from "./PixelCharacter";

type DuelPhase = "waiting" | "deck" | "battle" | "over";
type DeckMeta = { id: string; name: string; nameJa: string; nameEn: string; color: string; charType: string };
type RoomPlayer = { socketId: string; nickname: string; characterId: number; deckId: string | null; deckName: string | null };
type Room = { id: string; title: string; hasPassword: boolean; phase: DuelPhase; hostId: string; players: RoomPlayer[]; decks: DeckMeta[] };
type LobbyRoom = { id: string; title: string; hasPassword: boolean; count: number; max: number };
type Card = {
  uid: string; id: string; name: string; nameJa: string; nameEn: string;
  desc: string; descJa: string; descEn: string; cost: number; type: "attack" | "skill" | "power";
};
type Side = {
  socketId: string; nickname: string; characterId: number;
  hp: number; maxHp: number; shield: number; strength: number; poison: number;
  energy: number; maxEnergy: number; hand?: Card[]; handCount?: number; deckCount: number; discardCount?: number;
};
type BattleState = {
  phase: DuelPhase; roomId: string; turnSocketId: string | null; yourTurn: boolean;
  turnEndsAt: number; winnerSocketId: string | null; log: string[]; you: Side; opp: Side | null;
};

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

const DUEL_CSS = `
@keyframes d-opp-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(50) saturate(0)}12%{transform:translateX(-9px);filter:brightness(14) saturate(0)}26%{transform:translateX(7px);filter:brightness(5) saturate(0.3)}44%{transform:translateX(-5px);filter:brightness(2.2) saturate(1)}62%{transform:translateX(4px);filter:brightness(1.3)}80%{transform:translateX(-2px);filter:brightness(1)}100%{transform:translateX(0);filter:brightness(1)}}
@keyframes d-dmg-pop{0%{opacity:1;transform:translateY(0) scale(1.8)}20%{opacity:1;transform:translateY(-10px) scale(1.4)}100%{opacity:0;transform:translateY(-52px) scale(0.9)}}
@keyframes d-you-flash{0%{opacity:0.7;background:rgba(239,68,68,0.35)}100%{opacity:0;background:rgba(239,68,68,0)}}
@keyframes d-card-play{0%{opacity:0.95;transform:scale(0.3) rotate(-18deg) translateY(20px)}28%{opacity:1;transform:scale(1.4) rotate(5deg) translateY(-5px)}65%{opacity:0.9;transform:scale(1.1) rotate(0deg)}100%{opacity:0;transform:scale(0.8) translateY(-20px)}}
@keyframes d-turn-in{from{opacity:0;transform:scale(0.85) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes d-victory{0%{transform:scale(0.5) rotate(-5deg)}50%{transform:scale(1.15) rotate(3deg)}75%{transform:scale(0.95) rotate(-1deg)}100%{transform:scale(1) rotate(0)}}
@keyframes d-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
`;

export default function DuelPage() {
  const { rewardSummary, profile } = useAppData();
  const { t, lang } = useLang();
  const ko = lang === "ko", ja = lang === "ja";
  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;

  const [selfId, setSelfId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [pw, setPw] = useState("");
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Animation state
  const [oppHit, setOppHit] = useState(0);
  const [youFlash, setYouFlash] = useState(0);
  const [cardAnim, setCardAnim] = useState<{ id: number; type: string; name: string } | null>(null);
  const [dmgNums, setDmgNums] = useState<{ id: number; val: number; forOpp: boolean }[]>([]);

  const prevOppHpRef = useRef<number | null>(null);
  const prevYouHpRef = useRef<number | null>(null);
  const animIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  const s = getDuelSocket();

  useEffect(() => {
    const onLobby = (d: { rooms: LobbyRoom[] }) => setRooms(d.rooms);
    const onSelf = (d: { socketId: string }) => setSelfId(d.socketId);
    const onRoom = (d: Room) => { setRoom(d); if (d.phase === "waiting" || d.phase === "deck") setBattle(null); };
    const onState = (d: BattleState) => setBattle(d);
    const onErr = (d: { msg: string }) => { setError(d.msg); setTimeout(() => setError(""), 2500); };
    const onLeft = () => { setRoom(null); setBattle(null); setSelIdx(null); s.emit("duel:list"); };
    s.on("duel:lobby", onLobby); s.on("duel:self", onSelf); s.on("duel:room", onRoom);
    s.on("duel:state", onState); s.on("duel:error", onErr); s.on("duel:left", onLeft);
    s.emit("duel:list");
    return () => {
      s.off("duel:lobby", onLobby); s.off("duel:self", onSelf); s.off("duel:room", onRoom);
      s.off("duel:state", onState); s.off("duel:error", onErr); s.off("duel:left", onLeft);
    };
  }, []);

  useEffect(() => () => { getDuelSocket().emit("duel:leave"); disconnectDuelSocket(); }, []);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);

  // Detect HP changes → trigger animations
  useEffect(() => {
    if (!battle?.opp) return;
    const oHp = battle.opp.hp;
    const yHp = battle.you.hp;
    if (prevOppHpRef.current !== null && oHp < prevOppHpRef.current) {
      const dmg = prevOppHpRef.current - oHp;
      setOppHit((n) => n + 1);
      const id = animIdRef.current++;
      setDmgNums((prev) => [...prev, { id, val: dmg, forOpp: true }]);
      setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== id)), 950);
    }
    if (prevYouHpRef.current !== null && yHp < prevYouHpRef.current) {
      const dmg = prevYouHpRef.current - yHp;
      setYouFlash((n) => n + 1);
      const id = animIdRef.current++;
      setDmgNums((prev) => [...prev, { id, val: dmg, forOpp: false }]);
      setTimeout(() => setDmgNums((prev) => prev.filter((d) => d.id !== id)), 950);
    }
    prevOppHpRef.current = oHp;
    prevYouHpRef.current = yHp;
  }, [battle?.opp?.hp, battle?.you?.hp]);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle?.log?.length]);

  const me = { nickname: profile.name, userId: getStoredUser()?.id, characterId: myCharacterId };

  const createRoom = () => {
    s.emit("duel:create", { title: title.trim(), password: pw.trim() || undefined, ...me });
    setCreating(false); setTitle(""); setPw("");
  };
  const joinRoom = (r: LobbyRoom) => {
    let password: string | undefined;
    if (r.hasPassword) { const p = window.prompt(t("duel.password_prompt")); if (p == null) return; password = p; }
    s.emit("duel:join", { roomId: r.id, password, ...me });
  };
  const leaveRoom = () => s.emit("duel:leave");
  const playCard = (i: number, c: Card) => {
    s.emit("duel:play", { handIdx: i });
    setSelIdx(null);
    const id = animIdRef.current++;
    setCardAnim({ id, type: c.type, name: ko ? c.name : ja ? c.nameJa : c.nameEn });
    setTimeout(() => setCardAnim(null), 650);
  };
  const cardName = (c: Card) => (ko ? c.name : ja ? c.nameJa : c.nameEn);
  const cardDesc = (c: Card) => (ko ? c.desc : ja ? c.descJa : c.descEn);
  const typeColor = (type: Card["type"]) => type === "attack" ? "#ef4444" : type === "skill" ? "#3b82f6" : "#f59e0b";
  const typeIcon = (type: Card["type"]) => type === "attack" ? "⚔" : type === "skill" ? "✦" : "★";

  const HpBar = ({ side, big }: { side: Side; big?: boolean }) => {
    const pct = Math.max(0, side.hp / side.maxHp);
    const grad = pct > 0.6 ? "from-emerald-500 to-green-400" : pct > 0.3 ? "from-yellow-500 to-amber-400" : "from-red-600 to-red-500";
    return (
      <div className={`relative overflow-hidden rounded-full border border-white/10 bg-black/50 ${big ? "h-4" : "h-3"}`}>
        <div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-500`} style={{ width: `${pct * 100}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow">{side.hp}/{side.maxHp}</span>
      </div>
    );
  };

  const EnergyDots = ({ energy, max }: { energy: number; max: number }) => (
    <div className="flex flex-wrap gap-0.5">
      {Array.from({ length: Math.min(max, 10) }).map((_, i) => (
        <span key={i} className={`h-3 w-3 rounded-full border transition-all ${i < energy ? "border-blue-200 bg-blue-400 shadow-[0_0_4px_#60a5fa]" : "border-slate-600 bg-slate-700"}`} />
      ))}
    </div>
  );

  const StatBadges = ({ side }: { side: Side }) => (
    <div className="flex flex-wrap items-center gap-1">
      {side.shield > 0 && <span className="flex items-center gap-0.5 rounded border border-sky-500/30 bg-sky-500/20 px-1 py-0.5 text-[10px] font-bold text-sky-400"><Shield className="h-2.5 w-2.5" />{side.shield}</span>}
      {side.strength > 0 && <span className="rounded border border-amber-500/30 bg-amber-500/20 px-1 py-0.5 text-[10px] font-bold text-amber-400">⚔+{side.strength}</span>}
      {side.poison > 0 && <span className="rounded border border-purple-500/30 bg-purple-500/20 px-1 py-0.5 text-[10px] font-bold text-purple-400">☠{side.poison}</span>}
    </div>
  );

  // ───────── LOBBY ─────────
  if (!room) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-2 flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("duel.title")}</h1>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">{t("duel.desc")}</p>
        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}
        <button onClick={() => setCreating((v) => !v)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.01]">
          <Plus className="h-5 w-5" /> {t("duel.create_room")}
        </button>
        {creating && (
          <div className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("duel.room_title_label")}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} placeholder={t("duel.room_title_ph")}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("duel.password_opt")}</label>
              <input value={pw} onChange={(e) => setPw(e.target.value)} maxLength={20} type="text"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <button onClick={createRoom} className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground">{t("duel.create")}</button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">{t("duel.open_rooms")} ({rooms.length})</h2>
          <button onClick={() => s.emit("duel:list")} className="text-xs text-primary hover:underline">{t("duel.refresh")}</button>
        </div>
        <div className="mt-3 space-y-2">
          {rooms.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("duel.no_rooms")}</div>}
          {rooms.map((r) => (
            <button key={r.id} onClick={() => joinRoom(r)} disabled={r.count >= r.max}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50">
              <Swords className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-bold">{r.title}{r.hasPassword && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}</p>
                <p className="text-xs text-muted-foreground">{t("duel.click_to_join")}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" />{r.count}/{r.max}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ───────── WAITING / DECK ─────────
  if (room.phase === "waiting" || room.phase === "deck") {
    const isHost = room.hostId === selfId;
    const full = room.players.length >= 2;
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button onClick={leaveRoom} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> {t("duel.leave")}</button>
        <div className="mb-1 flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{room.title}</h1>
          {room.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        {error && <div className="my-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}
        <div className="my-5 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => {
            const p = room.players[i];
            return (
              <div key={i} className={`flex flex-col items-center gap-2 rounded-2xl border p-5 ${p ? "border-primary/40 bg-card" : "border-dashed border-border bg-muted/40"}`}>
                {p ? (
                  <>
                    <PixelSprite type={charById(p.characterId).type} colors={charById(p.characterId).colors} characterId={p.characterId} rarity={charById(p.characterId).rarity} size={56} />
                    <p className="flex items-center gap-1 text-sm font-bold">{p.socketId === room.hostId && <Crown className="h-3.5 w-3.5 text-amber-500" />}{p.nickname}</p>
                    {room.phase === "deck" && <p className="text-xs text-muted-foreground">{p.deckId ? `✅ ${p.deckName}` : t("duel.choosing")}</p>}
                  </>
                ) : (
                  <p className="py-6 text-sm text-muted-foreground">{t("duel.waiting_opp")}</p>
                )}
              </div>
            );
          })}
        </div>
        {room.phase === "waiting" ? (
          isHost ? (
            <button onClick={() => s.emit("duel:start")} disabled={!full}
              className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-50">
              {full ? t("duel.start") : t("duel.waiting_opp")}
            </button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{t("duel.waiting_host")}</p>
          )
        ) : (
          <div>
            <p className="mb-3 text-center text-sm font-semibold">{t("duel.choose_deck")}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {room.decks.map((d) => {
                const myPick = room.players.find((p) => p.socketId === selfId)?.deckId;
                const picked = myPick === d.id;
                const label = ko ? d.name : ja ? d.nameJa : d.nameEn;
                return (
                  <button key={d.id} onClick={() => s.emit("duel:deck", { deckId: d.id })}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${picked ? "shadow-lg" : "hover:scale-[1.02]"}`}
                    style={{ borderColor: picked ? d.color : "var(--border)", background: picked ? `${d.color}1a` : undefined }}>
                    <PixelSprite type={d.charType as never} colors={{ p: d.color, s: d.color, a: d.color }} characterId={0} rarity="common" size={40} />
                    <span className="text-sm font-bold" style={{ color: d.color }}>{label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">{t("duel.auto_start")}</p>
          </div>
        )}
      </div>
    );
  }

  // ───────── BATTLE / OVER ─────────
  if (!battle || !battle.opp) return <div className="p-10 text-center text-muted-foreground">{t("duel.loading")}</div>;

  const you = battle.you, opp = battle.opp;
  const timeLeft = Math.max(0, Math.ceil((battle.turnEndsAt - now) / 1000));
  const over = battle.phase === "over";
  const iWon = over && battle.winnerSocketId === selfId;
  const youDef = charById(you.characterId), oppDef = charById(opp.characterId);

  return (
    <div className="relative -m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden sm:-m-6"
      style={{ background: "linear-gradient(180deg,#0f172a 0%,#1e293b 45%,#0f172a 100%)" }}>
      <style>{DUEL_CSS}</style>

      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-3 py-2 backdrop-blur">
        <button onClick={leaveRoom} className="flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t("duel.leave")}
        </button>
        {!over ? (
          <span key={battle.yourTurn ? "your" : "opp"}
            className={`rounded-full px-4 py-1 text-sm font-bold tracking-wide ${battle.yourTurn ? "bg-primary text-primary-foreground" : "bg-slate-700 text-slate-300"}`}
            style={{ animation: "d-turn-in 0.3s ease-out", boxShadow: battle.yourTurn ? "0 0 14px var(--primary)" : "none" }}>
            {battle.yourTurn ? `⚔ ${t("duel.your_turn")} · ${timeLeft}s` : `🛡 ${t("duel.opp_turn")}`}
          </span>
        ) : <span className="text-sm text-slate-400">—</span>}
        <span className="flex items-center gap-1 text-xs text-slate-400"><Swords className="h-4 w-4" />1:1</span>
      </div>

      {/* ── Opponent Zone ── */}
      <div className="shrink-0 border-b border-white/10 bg-red-950/20 px-3 py-2">
        <div className="flex items-center gap-3">
          {/* Sprite with hit animation — key change re-triggers animation */}
          <div className="relative shrink-0" key={`opp-${oppHit}`}
            style={oppHit > 0 ? { animation: "d-opp-hit 0.55s ease-out both" } : undefined}>
            <PixelSprite type={oppDef.type} colors={oppDef.colors} characterId={opp.characterId} rarity={oppDef.rarity} size={56} />
            {dmgNums.filter((d) => d.forOpp).map((d) => (
              <span key={d.id} className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-xl font-extrabold text-red-400 drop-shadow-[0_0_5px_#f00]"
                style={{ animation: "d-dmg-pop 0.95s ease-out forwards" }}>
                -{d.val}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-extrabold text-slate-100">{opp.nickname}</span>
              <span className="ml-2 shrink-0 text-[10px] text-slate-400">{t("duel.hand")} {opp.handCount} · {t("duel.deck")} {opp.deckCount}</span>
            </div>
            <HpBar side={opp} big />
            <div className="flex items-center justify-between">
              <StatBadges side={opp} />
              <EnergyDots energy={opp.energy} max={opp.maxEnergy} />
            </div>
          </div>
        </div>
        {/* Opponent face-down card backs */}
        {(opp.handCount ?? 0) > 0 && (
          <div className="mt-2 flex justify-center gap-1">
            {Array.from({ length: Math.min(opp.handCount ?? 0, 8) }).map((_, i) => (
              <div key={i} className="h-8 w-5 rounded border border-slate-500/60 bg-gradient-to-br from-slate-600 to-slate-800 shadow" />
            ))}
          </div>
        )}
      </div>

      {/* ── Battle Log ── */}
      <div ref={logRef} className="flex-1 overflow-y-auto bg-black/25 px-3 py-2">
        {battle.log.slice(-8).map((l, i, arr) => (
          <p key={i} className={`text-[11px] leading-relaxed ${i === arr.length - 1 ? "font-semibold text-slate-100" : "text-slate-400"}`}>
            {l}
          </p>
        ))}
      </div>

      {/* Card play animation overlay */}
      {cardAnim && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="rounded-xl border-4 px-8 py-5 text-center font-extrabold text-white shadow-2xl"
            style={{
              borderColor: typeColor(cardAnim.type as Card["type"]),
              background: `${typeColor(cardAnim.type as Card["type"])}22`,
              animation: "d-card-play 0.65s ease-out forwards",
              fontSize: "1.25rem",
              backdropFilter: "blur(4px)",
            }}>
            {typeIcon(cardAnim.type as Card["type"])} {cardAnim.name}
          </div>
        </div>
      )}

      {/* Screen flash when player takes damage */}
      {youFlash > 0 && (
        <div key={`flash-${youFlash}`} className="pointer-events-none absolute inset-0 z-10"
          style={{ animation: "d-you-flash 0.4s ease-out forwards" }} />
      )}

      {/* Floating damage number on player */}
      {dmgNums.filter((d) => !d.forOpp).map((d) => (
        <span key={d.id} className="pointer-events-none absolute left-1/2 top-2/3 z-20 -translate-x-1/2 -translate-y-1/2 text-3xl font-extrabold text-red-400 drop-shadow-[0_0_8px_#f00]"
          style={{ animation: "d-dmg-pop 0.95s ease-out forwards" }}>
          -{d.val}
        </span>
      ))}

      {/* ── Player Zone ── */}
      <div className="shrink-0 border-t border-white/10 bg-blue-950/20 px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ animation: "d-float 3s ease-in-out infinite" }}>
            <PixelSprite type={youDef.type} colors={youDef.colors} characterId={you.characterId} rarity={youDef.rarity} size={56} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-extrabold text-primary">{you.nickname} <span className="font-normal text-slate-400">({t("duel.you")})</span></span>
              <span className="ml-2 shrink-0 text-[10px] text-slate-400">{t("duel.deck")} {you.deckCount} · {t("duel.discard")} {you.discardCount}</span>
            </div>
            <HpBar side={you} big />
            <div className="flex items-center justify-between">
              <StatBadges side={you} />
              <EnergyDots energy={you.energy} max={you.maxEnergy} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card Hand ── */}
      <div className="shrink-0 border-t border-white/10 bg-slate-900/80">
        {(you.hand ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">{t("duel.no_cards")}</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto px-3 py-3">
            {(you.hand ?? []).map((c, i) => {
              const canPlay = battle.yourTurn && !over && you.energy >= c.cost;
              const selected = selIdx === i;
              const ac = typeColor(c.type);
              return (
                <button key={c.uid} disabled={!canPlay}
                  onClick={() => { if (selected) playCard(i, c); else setSelIdx(i); }}
                  className="shrink-0 rounded-xl transition-all duration-150"
                  style={{
                    width: 82, height: 118,
                    border: `2px solid ${selected ? "#facc15" : ac}`,
                    background: `linear-gradient(160deg,${ac}18,#0f172a)`,
                    transform: selected ? "translateY(-14px)" : "translateY(0)",
                    boxShadow: selected ? `0 10px 28px ${ac}66,0 0 14px #facc1540` : canPlay ? `0 2px 8px ${ac}44` : "none",
                    opacity: canPlay ? 1 : 0.38,
                    cursor: canPlay ? "pointer" : "default",
                  }}>
                  <div className="flex items-start justify-between px-1.5 pt-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow"
                      style={{ background: ac }}>{c.cost}</span>
                    <span className="text-[9px] opacity-50">{typeIcon(c.type)}</span>
                  </div>
                  <div className="flex flex-col items-center px-1 pt-0.5 text-center">
                    <p className="text-[10px] font-extrabold leading-tight text-white">{cardName(c)}</p>
                    <p className="mt-1 text-[9px] leading-tight text-slate-400">{cardDesc(c)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Action Bar ── */}
      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-black/50 px-3 py-2 backdrop-blur">
        {selIdx !== null && (
          <button onClick={() => setSelIdx(null)} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-600">
            {t("duel.cancel")}
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => { s.emit("duel:end"); setSelIdx(null); }} disabled={!battle.yourTurn || over}
          className="rounded-xl px-6 py-2.5 text-sm font-extrabold text-white transition-all disabled:opacity-30"
          style={{
            background: battle.yourTurn && !over ? "linear-gradient(135deg,#16a34a,#22c55e)" : "#334155",
            boxShadow: battle.yourTurn && !over ? "0 0 16px #22c55e55" : "none",
          }}>
          {t("duel.end_turn")} {battle.yourTurn && !over ? "▶" : ""}
        </button>
      </div>

      {selIdx !== null && (
        <p className="shrink-0 bg-yellow-500/10 py-0.5 text-center text-[11px] text-yellow-300">{t("duel.tap_again")}</p>
      )}

      {/* ── Result Overlay ── */}
      {over && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6 text-center"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)" }}>
          <Trophy className={`h-20 w-20 ${iWon ? "text-yellow-400" : "text-slate-500"}`}
            style={{ animation: iWon ? "d-victory 0.7s ease-out" : "d-turn-in 0.4s ease-out" }} />
          <h2 className={`text-4xl font-extrabold tracking-wide ${iWon ? "text-yellow-300" : "text-slate-400"}`}
            style={{ animation: "d-turn-in 0.45s ease-out" }}>
            {iWon ? t("duel.victory") : t("duel.defeat")}
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="font-bold text-primary">{you.nickname}</span>
            <span>HP {you.hp}/{you.maxHp}</span>
            <span className="text-slate-600">vs</span>
            <span>HP {opp.hp}/{opp.maxHp}</span>
            <span className="font-bold text-slate-200">{opp.nickname}</span>
          </div>
          <button onClick={leaveRoom} className="mt-2 rounded-full px-8 py-3 text-base font-bold transition-all hover:scale-105"
            style={{
              background: iWon ? "linear-gradient(135deg,#eab308,#f59e0b)" : "#334155",
              color: iWon ? "#000" : "#fff",
              boxShadow: iWon ? "0 0 20px #eab30866" : "none",
            }}>
            {t("duel.to_lobby")}
          </button>
        </div>
      )}
    </div>
  );
}
