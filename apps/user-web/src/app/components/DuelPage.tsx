import { useEffect, useRef, useState } from "react";
import { Swords, ArrowLeft, Plus, Lock, Users, Crown, Shield, Trophy, Zap, Star, Skull, Check, ChevronRight } from "lucide-react";
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
@keyframes d-flicker{0%,100%{opacity:1;transform:scaleY(1)}25%{opacity:0.72;transform:scaleY(0.82)}50%{opacity:0.92;transform:scaleY(1.1)}75%{opacity:0.68;transform:scaleY(0.88)}}
@keyframes d-flicker2{0%,100%{opacity:0.55}33%{opacity:0.22}66%{opacity:0.4}}
@keyframes d-glow{0%,100%{opacity:1}50%{opacity:0.4}}
`;

function TavernBanner({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ position: "relative", background: "linear-gradient(180deg,#1c0d03 0%,#2a1508 55%,#1a0d02 100%)", borderBottom: "2px solid #5a2e0a", padding: "16px 16px 18px", textAlign: "center", boxShadow: "0 4px 24px rgba(180,80,0,0.2)", overflow: "hidden" }}>
      {/* Brick texture overlay */}
      <div style={{ position:"absolute", inset:0, opacity:0.04, pointerEvents:"none", backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 11px,rgba(255,210,160,1) 11px,rgba(255,210,160,1) 12px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(255,210,160,0.3) 19px,rgba(255,210,160,0.3) 20px)" }}/>
      {/* Warm radial glow */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(ellipse 70% 50% at 50% 100%,rgba(200,100,20,0.1) 0%,transparent 70%)" }}/>
      {/* Left torch glow */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(circle 100px at 8% 55%,rgba(255,140,20,0.18) 0%,transparent 70%)", animation:"d-glow 2.1s ease-in-out infinite" }}/>
      {/* Right torch glow */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:"radial-gradient(circle 100px at 92% 55%,rgba(255,140,20,0.18) 0%,transparent 70%)", animation:"d-glow 2.3s ease-in-out infinite", animationDelay:"0.6s" }}/>

      {/* Centered pixel art tavern scene */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:10, position:"relative", zIndex:1 }}>
        <svg viewBox="0 0 320 200" width={280} height={175}
          style={{ maxWidth:"90%", height:"auto", imageRendering:"pixelated", display:"block" }}>
        <defs>
          <pattern id="tv-bricks" width="40" height="30" patternUnits="userSpaceOnUse">
            <rect width="40" height="30" fill="#130903"/>
            <rect x="1" y="1" width="37" height="12" fill="#1e1208"/>
            <rect x="1" y="16" width="17" height="12" fill="#221408"/>
            <rect x="21" y="16" width="18" height="12" fill="#1a0e06"/>
          </pattern>
        </defs>

        {/* ── CEILING BEAMS ── */}
        <rect width="320" height="18" fill="#1e1208"/>
        <rect width="320" height="2" fill="#4a2c10"/>
        <rect y="16" width="320" height="2" fill="#2d1a08"/>
        {[40,90,160,230,278].map(x=><rect key={x} x={x} y="0" width="5" height="18" fill="#2a1508"/>)}

        {/* ── STONE WALL ── */}
        <rect y="18" width="320" height="126" fill="url(#tv-bricks)"/>

        {/* ── HANGING LANTERN (center top) ── */}
        {[3,8,13,18].map(y=><rect key={y} x="159" y={y} width="2" height="4" fill="#6b5028" rx="1"/>)}
        <rect x="153" y="22" width="14" height="4" fill="#7a5a18"/>
        <rect x="156" y="20" width="8" height="3" fill="#9a7a28"/>
        <rect x="152" y="26" width="16" height="18" fill="#3a2208"/>
        <rect x="154" y="28" width="12" height="14" fill="#1c1004"/>
        <rect x="154" y="28" width="12" height="14" fill="#ff8820" style={{animation:"d-flicker2 1.3s ease-in-out infinite"}}/>
        <rect x="156" y="30" width="8" height="10" fill="#ffaa40" style={{animation:"d-flicker2 1s ease-in-out infinite",animationDelay:"0.3s"}}/>
        <rect x="158" y="32" width="4" height="6" fill="#ffcc60" style={{animation:"d-flicker 0.9s ease-in-out infinite"}}/>
        <rect x="154" y="42" width="12" height="3" fill="#5a4010"/>
        <rect x="157" y="45" width="6" height="2" fill="#3d2808"/>

        {/* ── LEFT TORCH ── */}
        <rect x="12" y="62" width="12" height="3" fill="#5a3010"/>
        <rect x="12" y="62" width="12" height="1" fill="#7a4820"/>
        <rect x="17" y="46" width="4" height="20" fill="#8b5e30"/>
        <rect x="18" y="46" width="2" height="20" fill="#a07040"/>
        <rect x="15" y="41" width="8" height="8" fill="#7a3810"/>
        <rect x="16" y="41" width="6" height="8" fill="#9a4a20"/>
        <rect x="16" y="31" width="6" height="12" fill="#cc6600" style={{animation:"d-flicker 0.8s ease-in-out infinite"}}/>
        <rect x="17" y="26" width="4" height="8" fill="#ff9900" style={{animation:"d-flicker 0.8s ease-in-out infinite",animationDelay:"0.12s"}}/>
        <rect x="18" y="22" width="2" height="6" fill="#ffcc00" style={{animation:"d-flicker 0.7s ease-in-out infinite",animationDelay:"0.22s"}}/>
        <rect x="18" y="19" width="2" height="4" fill="#ffee80" style={{animation:"d-flicker 0.6s ease-in-out infinite"}}/>

        {/* ── RIGHT TORCH ── */}
        <rect x="296" y="62" width="12" height="3" fill="#5a3010"/>
        <rect x="296" y="62" width="12" height="1" fill="#7a4820"/>
        <rect x="299" y="46" width="4" height="20" fill="#8b5e30"/>
        <rect x="300" y="46" width="2" height="20" fill="#a07040"/>
        <rect x="297" y="41" width="8" height="8" fill="#7a3810"/>
        <rect x="298" y="41" width="6" height="8" fill="#9a4a20"/>
        <rect x="298" y="31" width="6" height="12" fill="#cc6600" style={{animation:"d-flicker 0.78s ease-in-out infinite",animationDelay:"0.35s"}}/>
        <rect x="299" y="26" width="4" height="8" fill="#ff9900" style={{animation:"d-flicker 0.78s ease-in-out infinite",animationDelay:"0.5s"}}/>
        <rect x="300" y="22" width="2" height="6" fill="#ffcc00" style={{animation:"d-flicker 0.68s ease-in-out infinite",animationDelay:"0.32s"}}/>
        <rect x="300" y="19" width="2" height="4" fill="#ffee80" style={{animation:"d-flicker 0.58s ease-in-out infinite",animationDelay:"0.18s"}}/>

        {/* ── SHELF ── */}
        <rect x="72" y="92" width="176" height="5" fill="#5a3010"/>
        <rect x="72" y="92" width="176" height="1" fill="#8b5020"/>
        <rect x="72" y="95" width="176" height="2" fill="#3a1e08"/>
        <rect x="74" y="95" width="3" height="16" fill="#4a2808"/>
        <rect x="160" y="95" width="3" height="16" fill="#4a2808"/>
        <rect x="243" y="95" width="3" height="16" fill="#4a2808"/>

        {/* ── BOTTLES on shelf ── */}
        {/* tall green */}
        <rect x="88" y="74" width="7" height="20" fill="#1a4a18"/>
        <rect x="89" y="72" width="5" height="4" fill="#246024"/>
        <rect x="90" y="70" width="3" height="4" fill="#0e2e0e"/>
        <rect x="89" y="75" width="2" height="10" fill="#2a6028" opacity="0.7"/>
        {/* brown squat */}
        <rect x="102" y="78" width="10" height="16" fill="#5a1e05"/>
        <rect x="104" y="76" width="6" height="4" fill="#6b2808"/>
        <rect x="105" y="74" width="4" height="4" fill="#4a1804"/>
        <rect x="103" y="78" width="2" height="9" fill="#7a3010" opacity="0.5"/>
        {/* green slim */}
        <rect x="120" y="75" width="6" height="19" fill="#1e5218"/>
        <rect x="121" y="73" width="4" height="4" fill="#1a4a14"/>
        <rect x="122" y="71" width="2" height="4" fill="#123010"/>
        {/* amber */}
        <rect x="134" y="77" width="9" height="17" fill="#8b4a08"/>
        <rect x="136" y="75" width="5" height="4" fill="#a05810"/>
        <rect x="137" y="73" width="3" height="4" fill="#6b3806"/>
        <rect x="135" y="77" width="2" height="10" fill="#c07018" opacity="0.45"/>
        {/* wine/purple */}
        <rect x="197" y="74" width="7" height="20" fill="#3a1050"/>
        <rect x="198" y="72" width="5" height="4" fill="#3a1050"/>
        <rect x="199" y="70" width="3" height="4" fill="#260a36"/>
        <rect x="198" y="74" width="2" height="10" fill="#5a1878" opacity="0.5"/>
        {/* dark green */}
        <rect x="212" y="76" width="9" height="18" fill="#2a5a08"/>
        <rect x="214" y="74" width="5" height="4" fill="#2a5a08"/>
        <rect x="215" y="72" width="3" height="4" fill="#1e4006"/>
        {/* red small */}
        <rect x="229" y="78" width="8" height="16" fill="#7a0808"/>
        <rect x="231" y="76" width="4" height="4" fill="#8b1010"/>
        <rect x="232" y="74" width="2" height="4" fill="#5a0606"/>

        {/* ── BAR COUNTER ── */}
        <rect x="0" y="150" width="320" height="50" fill="#2d1508"/>
        <rect x="0" y="140" width="320" height="14" fill="#4a2a10"/>
        <rect x="0" y="140" width="320" height="1" fill="#9b6030"/>
        <rect x="0" y="141" width="320" height="2" fill="#7a4818"/>
        {/* wood grain */}
        {[10,70,130,190,250,310].map(x=><rect key={x} x={x} y="144" width="50" height="1" fill="#3d2010" opacity="0.4"/>)}
        <rect x="0" y="153" width="320" height="2" fill="#3d1e08"/>
        <rect x="0" y="170" width="320" height="2" fill="#3d1e08"/>
        {[80,160,240].map(x=><rect key={x} x={x} y="153" width="2" height="47" fill="#221008"/>)}

        {/* ── BARRELS left ── */}
        <rect x="4" y="108" width="28" height="35" fill="#5a2e0a" rx="2"/>
        {[108,120,132,140].map(y=><rect key={y} x="4" y={y} width="28" height="3" fill="#3a2008"/>)}
        {[7,11,15,19,23,27].map(x=><rect key={x} x={x} y="108" width="2" height="35" fill="#4a2408" opacity="0.4"/>)}
        <rect x="7" y="98" width="22" height="12" fill="#4a2408" rx="2"/>
        <rect x="7" y="98" width="22" height="3" fill="#3a1e06"/>
        <rect x="7" y="106" width="22" height="3" fill="#3a1e06"/>

        {/* ── BARRELS right ── */}
        <rect x="288" y="108" width="28" height="35" fill="#5a2e0a" rx="2"/>
        {[108,120,132,140].map(y=><rect key={`r${y}`} x="288" y={y} width="28" height="3" fill="#3a2008"/>)}
        {[291,295,299,303,307,311].map(x=><rect key={x} x={x} y="108" width="2" height="35" fill="#4a2408" opacity="0.4"/>)}
        <rect x="291" y="98" width="22" height="12" fill="#4a2408" rx="2"/>
        <rect x="291" y="98" width="22" height="3" fill="#3a1e06"/>
        <rect x="291" y="106" width="22" height="3" fill="#3a1e06"/>

        {/* ── MUGS on counter ── */}
        {/* left mug */}
        <rect x="54" y="129" width="14" height="13" fill="#8b5e30"/>
        <rect x="54" y="129" width="14" height="3" fill="#a07040"/>
        <rect x="68" y="132" width="4" height="7" fill="#6b4820"/>
        <rect x="54" y="127" width="14" height="4" fill="#e8d8a0"/>
        <rect x="55" y="126" width="12" height="3" fill="#f0e4b0"/>
        <rect x="57" y="125" width="8" height="2" fill="#f8eecc"/>
        {/* right mug */}
        <rect x="250" y="129" width="14" height="13" fill="#8b5e30"/>
        <rect x="250" y="129" width="14" height="3" fill="#a07040"/>
        <rect x="264" y="132" width="4" height="7" fill="#6b4820"/>
        <rect x="250" y="127" width="14" height="4" fill="#e8d8a0"/>
        <rect x="251" y="126" width="12" height="3" fill="#f0e4b0"/>
        <rect x="253" y="125" width="8" height="2" fill="#f8eecc"/>
        {/* wine bottle on counter */}
        <rect x="148" y="122" width="6" height="20" fill="#3a1050"/>
        <rect x="149" y="120" width="4" height="4" fill="#3a1050"/>
        <rect x="150" y="118" width="2" height="4" fill="#260a36"/>
        <rect x="150" y="130" width="8" height="10" fill="#8b1818" opacity="0.8"/>
        {/* candle */}
        <rect x="172" y="129" width="5" height="13" fill="#e8e0c0"/>
        <rect x="173" y="127" width="3" height="4" fill="#ff9900" style={{animation:"d-flicker 0.7s ease-in-out infinite"}}/>
        <rect x="173" y="125" width="3" height="4" fill="#ffcc40" style={{animation:"d-flicker 0.6s ease-in-out infinite",animationDelay:"0.1s"}}/>
        <rect x="174" y="123" width="1" height="4" fill="#ffee90" style={{animation:"d-flicker 0.5s ease-in-out infinite"}}/>
        <rect x="170" y="140" width="11" height="3" fill="#5a5028"/>
        </svg>
      </div>

      {/* Title */}
      <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:5 }}>
        <Swords style={{ width:18, height:18, color:"#f59e0b", filter:"drop-shadow(0 0 4px #f59e0b)" }} />
        <h1 style={{ margin:0, fontFamily:"'Courier New',monospace", fontSize:22, fontWeight:900, letterSpacing:"0.14em", color:"#fef3c7", textShadow:"0 0 16px #92400e, 2px 2px 0 #1a0d02, -1px -1px 0 #1a0d02" }}>{title}</h1>
        <Swords style={{ width:18, height:18, color:"#f59e0b", filter:"drop-shadow(0 0 4px #f59e0b)" }} />
      </div>
      {/* Separator */}
      <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:4 }}>
        <div style={{ height:1, width:40, background:"linear-gradient(90deg,transparent,#92400e88)" }}/>
        <span style={{ fontSize:11, color:"#b45309", opacity:0.7 }}>✦</span>
        <div style={{ height:1, width:40, background:"linear-gradient(90deg,#92400e88,transparent)" }}/>
      </div>
      {/* Desc */}
      <p style={{ position:"relative", zIndex:1, margin:0, fontSize:11, letterSpacing:"0.04em", color:"rgba(251,191,36,0.45)", fontFamily:"'Courier New',monospace" }}>{desc}</p>
    </div>
  );
}

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
  const typeIcon = (type: Card["type"]) => type === "attack" ? <Swords className="inline h-2.5 w-2.5" /> : type === "skill" ? <Zap className="inline h-2.5 w-2.5" /> : <Star className="inline h-2.5 w-2.5" />;

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
      {side.strength > 0 && <span className="flex items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/20 px-1 py-0.5 text-[10px] font-bold text-amber-400"><Swords className="h-2.5 w-2.5" />+{side.strength}</span>}
      {side.poison > 0 && <span className="flex items-center gap-0.5 rounded border border-purple-500/30 bg-purple-500/20 px-1 py-0.5 text-[10px] font-bold text-purple-400"><Skull className="h-2.5 w-2.5" />{side.poison}</span>}
    </div>
  );

  // ───────── LOBBY ─────────
  if (!room) {
    return (
      <div className="-m-4 sm:-m-6" style={{ background: "#0f0701", minHeight: "calc(100dvh - 3.5rem)" }}>
        <style>{DUEL_CSS}</style>
        <TavernBanner title={t("duel.title")} desc={t("duel.desc")} />
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-5">
          {error && <div className="mb-4 rounded-lg border border-red-700/50 bg-red-950/60 px-4 py-2 text-sm text-red-300 backdrop-blur">{error}</div>}

          {/* Create room button */}
          <button onClick={() => setCreating((v) => !v)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-bold transition-all hover:scale-[1.02] hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#8b5e20,#c8a440)", color: "#1a0d03", boxShadow: "0 4px 18px rgba(200,164,64,0.35)" }}>
            <Plus className="h-5 w-5" /> {t("duel.create_room")}
          </button>

          {/* Create room form */}
          {creating && (
            <div className="mb-5 space-y-3 rounded-xl border p-4 backdrop-blur-sm"
              style={{ background: "rgba(15,8,2,0.88)", borderColor: "rgba(139,82,32,0.55)" }}>
              <div>
                <label className="text-xs font-semibold text-amber-300/70">{t("duel.room_title_label")}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} placeholder={t("duel.room_title_ph")}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ background: "rgba(8,4,1,0.75)", borderColor: "rgba(139,82,32,0.45)", color: "#e8d8b0" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-amber-300/70">{t("duel.password_opt")}</label>
                <input value={pw} onChange={(e) => setPw(e.target.value)} maxLength={20} type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ background: "rgba(8,4,1,0.75)", borderColor: "rgba(139,82,32,0.45)", color: "#e8d8b0" }} />
              </div>
              <button onClick={createRoom} className="w-full rounded-lg py-2 text-sm font-bold transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#8b5e20,#c8a440)", color: "#1a0d03" }}>
                {t("duel.create")}
              </button>
            </div>
          )}

          {/* Room list header */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-amber-300/70">{t("duel.open_rooms")} ({rooms.length})</h2>
            <button onClick={() => s.emit("duel:list")} className="text-xs text-amber-400 hover:text-amber-300 hover:underline">{t("duel.refresh")}</button>
          </div>

          {/* Room list */}
          <div className="space-y-2">
            {rooms.length === 0 && (
              <div className="rounded-xl border border-dashed py-10 text-center text-sm text-amber-200/35 backdrop-blur-sm"
                style={{ borderColor: "rgba(139,82,32,0.3)", background: "rgba(10,5,1,0.5)" }}>
                {t("duel.no_rooms")}
              </div>
            )}
            {rooms.map((r) => (
              <button key={r.id} onClick={() => joinRoom(r)} disabled={r.count >= r.max}
                className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "rgba(15,8,2,0.82)", borderColor: "rgba(139,82,32,0.45)", backdropFilter: "blur(4px)" }}>
                <Swords className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-bold text-amber-100">
                    {r.title}{r.hasPassword && <Lock className="h-3.5 w-3.5 text-amber-400/60" />}
                  </p>
                  <p className="text-xs text-amber-200/45">{t("duel.click_to_join")}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm text-amber-300/60">
                  <Users className="h-4 w-4" />{r.count}/{r.max}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ───────── WAITING / DECK ─────────
  if (room.phase === "waiting" || room.phase === "deck") {
    const isHost = room.hostId === selfId;
    const full = room.players.length >= 2;
    return (
      <div className="-m-4 sm:-m-6" style={{ background: "#0f0701", minHeight: "calc(100dvh - 3.5rem)" }}>
        <style>{DUEL_CSS}</style>
        <TavernBanner title={room.title} desc={t("duel.title")} />
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-4">
          {/* Back button */}
          <button onClick={leaveRoom} className="mb-4 flex items-center gap-1 text-sm font-medium text-amber-300/70 hover:text-amber-200">
            <ArrowLeft className="h-4 w-4" /> {t("duel.leave")}
          </button>

          {room.hasPassword && <div className="mb-3 flex items-center gap-1 text-xs text-amber-400/60"><Lock className="h-3.5 w-3.5" />{ko ? "비밀번호 방" : ja ? "パスワード部屋" : "Password room"}</div>}
          {error && <div className="my-3 rounded-lg border border-red-700/50 bg-red-950/60 px-4 py-2 text-sm text-red-300 backdrop-blur">{error}</div>}

          {/* Players */}
          <div className="my-5 grid grid-cols-2 gap-3">
            {[0, 1].map((i) => {
              const p = room.players[i];
              return (
                <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border p-5 backdrop-blur-sm"
                  style={{
                    background: p ? "rgba(15,8,2,0.88)" : "rgba(8,4,1,0.55)",
                    borderColor: p ? "rgba(200,164,64,0.45)" : "rgba(100,60,20,0.3)",
                    borderStyle: p ? "solid" : "dashed",
                  }}>
                  {p ? (
                    <>
                      <PixelSprite type={charById(p.characterId).type} colors={charById(p.characterId).colors} characterId={p.characterId} rarity={charById(p.characterId).rarity} size={56} />
                      <p className="flex items-center gap-1 text-sm font-bold text-amber-100">
                        {p.socketId === room.hostId && <Crown className="h-3.5 w-3.5 text-amber-400" />}{p.nickname}
                      </p>
                      {room.phase === "deck" && (
                        <p className="flex items-center gap-1 text-xs text-amber-200/55">{p.deckId ? <><Check className="h-3 w-3 text-green-400" />{p.deckName}</> : t("duel.choosing")}</p>
                      )}
                    </>
                  ) : (
                    <p className="py-6 text-sm text-amber-200/35">{t("duel.waiting_opp")}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action area */}
          {room.phase === "waiting" ? (
            isHost ? (
              <button onClick={() => s.emit("duel:start")} disabled={!full}
                className="w-full rounded-xl py-3 text-base font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: full ? "linear-gradient(135deg,#8b5e20,#c8a440)" : "rgba(60,30,10,0.6)", color: full ? "#1a0d03" : "#a07040", boxShadow: full ? "0 4px 18px rgba(200,164,64,0.3)" : "none" }}>
                {full ? t("duel.start") : t("duel.waiting_opp")}
              </button>
            ) : (
              <p className="text-center text-sm text-amber-200/45">{t("duel.waiting_host")}</p>
            )
          ) : (
            <div>
              <p className="mb-3 text-center text-sm font-semibold text-amber-200/70">{t("duel.choose_deck")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {room.decks.map((d) => {
                  const myPick = room.players.find((p) => p.socketId === selfId)?.deckId;
                  const picked = myPick === d.id;
                  const label = ko ? d.name : ja ? d.nameJa : d.nameEn;
                  return (
                    <button key={d.id} onClick={() => s.emit("duel:deck", { deckId: d.id })}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 backdrop-blur-sm transition-all ${picked ? "shadow-xl" : "hover:scale-[1.02]"}`}
                      style={{
                        borderColor: picked ? d.color : "rgba(139,82,32,0.4)",
                        background: picked ? `${d.color}28` : "rgba(12,6,1,0.82)",
                        boxShadow: picked ? `0 0 18px ${d.color}44` : "none",
                      }}>
                      <PixelSprite type={d.charType as never} colors={{ p: d.color, s: d.color, a: d.color }} characterId={0} rarity="common" size={40} />
                      <span className="text-sm font-bold" style={{ color: picked ? d.color : "#c8a060" }}>{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-center text-xs text-amber-200/40">{t("duel.auto_start")}</p>
            </div>
          )}
        </div>
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
            {battle.yourTurn ? <><Swords className="inline h-3.5 w-3.5 mr-1" />{t("duel.your_turn")} · {timeLeft}s</> : <><Shield className="inline h-3.5 w-3.5 mr-1" />{t("duel.opp_turn")}</>}
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
          {t("duel.end_turn")} {battle.yourTurn && !over ? <ChevronRight className="inline h-4 w-4" /> : null}
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
