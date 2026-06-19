import { useEffect, useState } from "react";
import { Swords, ArrowLeft, Plus, Lock, Users, Crown, Shield, Zap, Trophy } from "lucide-react";
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

export default function DuelPage() {
  const { rewardSummary, profile } = useAppData();
  const { lang } = useLang();
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

  const me = { nickname: profile.name, userId: getStoredUser()?.id, characterId: myCharacterId };
  const createRoom = () => {
    s.emit("duel:create", { title: title.trim(), password: pw.trim() || undefined, ...me });
    setCreating(false); setTitle(""); setPw("");
  };
  const joinRoom = (r: LobbyRoom) => {
    let password: string | undefined;
    if (r.hasPassword) { const p = window.prompt(ko ? "비밀번호" : ja ? "パスワード" : "Password"); if (p == null) return; password = p; }
    s.emit("duel:join", { roomId: r.id, password, ...me });
  };
  const leaveRoom = () => { s.emit("duel:leave"); };
  const cardName = (c: Card) => (ko ? c.name : ja ? c.nameJa : c.nameEn);
  const cardDesc = (c: Card) => (ko ? c.desc : ja ? c.descJa : c.descEn);

  // ───────── LOBBY ─────────
  if (!room) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-2 flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{ko ? "1:1 카드 배틀" : ja ? "1:1 カードバトル" : "1v1 Card Battle"}</h1>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">{ko ? "방을 만들거나 참여해 상대와 카드로 겨뤄보세요." : ja ? "部屋を作るか参加して対戦しよう。" : "Create or join a room and duel with cards."}</p>

        {error && <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        <button onClick={() => setCreating((v) => !v)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.01]">
          <Plus className="h-5 w-5" /> {ko ? "방 만들기" : ja ? "部屋を作る" : "Create Room"}
        </button>

        {creating && (
          <div className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{ko ? "방 제목" : ja ? "タイトル" : "Title"}</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} placeholder={ko ? "카드 배틀 한 판!" : ja ? "対戦しよう！" : "Let's duel!"}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{ko ? "비밀번호 (선택)" : ja ? "パスワード（任意）" : "Password (optional)"}</label>
              <input value={pw} onChange={(e) => setPw(e.target.value)} maxLength={20} type="text"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <button onClick={createRoom} className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-primary-foreground">{ko ? "생성" : ja ? "作成" : "Create"}</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-muted-foreground">{ko ? "열린 방" : ja ? "公開部屋" : "Open Rooms"} ({rooms.length})</h2>
          <button onClick={() => s.emit("duel:list")} className="text-xs text-primary hover:underline">{ko ? "새로고침" : ja ? "更新" : "Refresh"}</button>
        </div>
        <div className="mt-3 space-y-2">
          {rooms.length === 0 && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{ko ? "열린 방이 없어요. 직접 만들어보세요!" : ja ? "公開部屋がありません。" : "No open rooms yet."}</div>}
          {rooms.map((r) => (
            <button key={r.id} onClick={() => joinRoom(r)} disabled={r.count >= r.max}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50">
              <Swords className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-bold">{r.title}{r.hasPassword && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}</p>
                <p className="text-xs text-muted-foreground">{ko ? "참여하려면 클릭" : ja ? "クリックで参加" : "Click to join"}</p>
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
        <button onClick={leaveRoom} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> {ko ? "나가기" : ja ? "退出" : "Leave"}</button>
        <div className="mb-1 flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{room.title}</h1>
          {room.hasPassword && <Lock className="h-4 w-4 text-muted-foreground" />}
        </div>
        {error && <div className="my-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {/* players */}
        <div className="my-5 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => {
            const p = room.players[i];
            return (
              <div key={i} className={`flex flex-col items-center gap-2 rounded-2xl border p-5 ${p ? "border-primary/40 bg-card" : "border-dashed border-border bg-muted/40"}`}>
                {p ? (
                  <>
                    <PixelSprite type={charById(p.characterId).type} colors={charById(p.characterId).colors} characterId={p.characterId} rarity={charById(p.characterId).rarity} size={56} />
                    <p className="flex items-center gap-1 text-sm font-bold">{p.socketId === room.hostId && <Crown className="h-3.5 w-3.5 text-amber-500" />}{p.nickname}</p>
                    {room.phase === "deck" && <p className="text-xs text-muted-foreground">{p.deckId ? `✅ ${p.deckName}` : (ko ? "덱 고르는 중…" : ja ? "デッキ選択中…" : "Choosing…")}</p>}
                  </>
                ) : (
                  <p className="py-6 text-sm text-muted-foreground">{ko ? "상대를 기다리고 있습니다…" : ja ? "対戦相手を待っています…" : "Waiting for opponent…"}</p>
                )}
              </div>
            );
          })}
        </div>

        {room.phase === "waiting" ? (
          isHost ? (
            <button onClick={() => s.emit("duel:start")} disabled={!full}
              className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition-all disabled:cursor-not-allowed disabled:opacity-50">
              {full ? (ko ? "게임 시작" : ja ? "ゲーム開始" : "Start Game") : (ko ? "상대를 기다리고 있습니다…" : ja ? "対戦相手を待っています…" : "Waiting for opponent…")}
            </button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">{ko ? "방장이 시작하기를 기다리는 중…" : ja ? "ホストの開始を待っています…" : "Waiting for the host to start…"}</p>
          )
        ) : (
          // DECK SELECT
          <div>
            <p className="mb-3 text-center text-sm font-semibold">{ko ? "덱을 선택하세요" : ja ? "デッキを選択" : "Choose your deck"}</p>
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
            <p className="mt-4 text-center text-xs text-muted-foreground">{ko ? "둘 다 고르면 자동으로 배틀이 시작됩니다." : ja ? "両者選択で自動的に開始します。" : "Battle starts when both pick."}</p>
          </div>
        )}
      </div>
    );
  }

  // ───────── BATTLE / OVER ─────────
  if (!battle || !battle.opp) return <div className="p-10 text-center text-muted-foreground">로딩…</div>;
  const you = battle.you, opp = battle.opp;
  const timeLeft = Math.max(0, Math.ceil((battle.turnEndsAt - now) / 1000));
  const over = battle.phase === "over";
  const iWon = over && battle.winnerSocketId === selfId;
  const youDef = charById(you.characterId), oppDef = charById(opp.characterId);

  const StatBadges = ({ side }: { side: Side }) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {side.shield > 0 && <span className="flex items-center gap-0.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] font-bold text-sky-500"><Shield className="h-3 w-3" />{side.shield}</span>}
      {side.strength > 0 && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-500">{ko ? "힘" : ja ? "力" : "Str"}+{side.strength}</span>}
      {side.poison > 0 && <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[11px] font-bold text-purple-500">{ko ? "독" : ja ? "毒" : "Psn"} {side.poison}</span>}
    </div>
  );
  const HpBar = ({ side }: { side: Side }) => (
    <div className="h-3 w-full overflow-hidden rounded-full border border-black/10 bg-gray-200 dark:bg-gray-700">
      <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300" style={{ width: `${Math.max(0, (side.hp / side.maxHp) * 100)}%` }} />
    </div>
  );

  return (
    <div className="relative -m-4 flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden bg-gradient-to-b from-background to-muted sm:-m-6 dark:from-gray-900 dark:to-gray-950">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border bg-white/70 px-4 py-2 backdrop-blur dark:bg-gray-900/60">
        <button onClick={leaveRoom} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> {ko ? "나가기" : ja ? "退出" : "Leave"}</button>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${battle.yourTurn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
          {over ? "—" : battle.yourTurn ? (ko ? `내 턴 · ${timeLeft}s` : ja ? `自分のターン · ${timeLeft}s` : `Your turn · ${timeLeft}s`) : (ko ? "상대 턴" : ja ? "相手のターン" : "Opp turn")}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-4 w-4" />1:1</span>
      </div>

      {/* opponent */}
      <div className="border-b border-border bg-white/50 px-4 py-3 dark:bg-gray-900/40">
        <div className="flex items-center gap-3">
          <PixelSprite type={oppDef.type} colors={oppDef.colors} characterId={opp.characterId} rarity={oppDef.rarity} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-extrabold">{opp.nickname}</span>
              <span className="text-xs font-semibold text-red-500">HP {opp.hp}/{opp.maxHp}</span>
            </div>
            <div className="mt-1"><HpBar side={opp} /></div>
            <div className="mt-1 flex items-center justify-between">
              <StatBadges side={opp} />
              <span className="text-[11px] text-muted-foreground">{ko ? "손패" : ja ? "手札" : "Hand"} {opp.handCount} · ⚡{opp.energy}/{opp.maxEnergy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* log */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {battle.log.map((l, i) => (
          <p key={i} className={`text-xs leading-relaxed ${i === battle.log.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{l}</p>
        ))}
      </div>

      {/* you */}
      <div className="border-t border-border bg-white/60 px-4 py-3 backdrop-blur dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          <PixelSprite type={youDef.type} colors={youDef.colors} characterId={you.characterId} rarity={youDef.rarity} size={48} float />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-extrabold text-primary">{you.nickname} ({ko ? "나" : ja ? "自分" : "You"})</span>
              <span className="text-xs font-semibold text-red-500">HP {you.hp}/{you.maxHp}</span>
            </div>
            <div className="mt-1"><HpBar side={you} /></div>
            <div className="mt-1 flex items-center justify-between">
              <StatBadges side={you} />
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-500"><Zap className="h-3 w-3" />{you.energy}/{you.maxEnergy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* hand */}
      <div className="flex items-end gap-2 overflow-x-auto border-t border-border bg-muted/40 px-3 py-3">
        {(you.hand ?? []).length === 0 ? (
          <p className="m-auto py-6 text-sm text-muted-foreground">{ko ? "손패가 없습니다" : ja ? "手札がありません" : "No cards"}</p>
        ) : (you.hand ?? []).map((c, i) => {
          const canPlay = battle.yourTurn && !over && you.energy >= c.cost;
          const accent = c.type === "attack" ? "#ef4444" : c.type === "skill" ? "#3b82f6" : "#f59e0b";
          return (
            <button key={c.uid} disabled={!canPlay}
              onClick={() => { if (selIdx === i) { s.emit("duel:play", { handIdx: i }); setSelIdx(null); } else setSelIdx(i); }}
              className={`flex h-[126px] w-[88px] shrink-0 flex-col rounded-lg border-2 transition-transform ${selIdx === i ? "-translate-y-3" : ""} ${canPlay ? "cursor-pointer" : "cursor-default opacity-45"}`}
              style={{ borderColor: selIdx === i ? "#facc15" : accent, background: "var(--card)" }}>
              <div className="flex items-center justify-between px-1.5 py-1" style={{ background: `${accent}22`, borderBottom: `1px solid ${accent}55` }}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: accent }}>{c.cost}</span>
              </div>
              <div className="flex flex-1 flex-col px-1.5 py-1 text-center">
                <p className="text-[11px] font-extrabold leading-tight">{cardName(c)}</p>
                <p className="mt-1 text-[9px] leading-tight text-muted-foreground">{cardDesc(c)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* action bar */}
      <div className="flex items-center gap-2 border-t border-border bg-white/70 px-3 py-2 backdrop-blur dark:bg-gray-900/60">
        <span className="text-[11px] text-muted-foreground">{ko ? "덱" : ja ? "山" : "Deck"} {you.deckCount} · {ko ? "버림" : ja ? "捨" : "Disc"} {you.discardCount}</span>
        <div className="flex-1" />
        {selIdx !== null && <button onClick={() => setSelIdx(null)} className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{ko ? "취소" : ja ? "キャンセル" : "Cancel"}</button>}
        <button onClick={() => { s.emit("duel:end"); setSelIdx(null); }} disabled={!battle.yourTurn || over}
          className="rounded-lg border-2 border-green-600 bg-green-900/20 px-5 py-2 text-sm font-bold text-green-500 disabled:opacity-40">
          {ko ? "턴 종료" : ja ? "ターン終了" : "End Turn"}
        </button>
      </div>

      {selIdx !== null && <p className="bg-muted/40 pb-1 text-center text-[11px] text-muted-foreground">{ko ? "한 번 더 눌러 카드 사용" : ja ? "もう一度押して使用" : "Tap again to play"}</p>}

      {/* result overlay */}
      {over && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center">
          <Trophy className={`h-16 w-16 ${iWon ? "text-yellow-400" : "text-gray-400"}`} />
          <h2 className="text-3xl font-extrabold text-white">{iWon ? (ko ? "승리!" : ja ? "勝利！" : "Victory!") : (ko ? "패배…" : ja ? "敗北…" : "Defeat…")}</h2>
          <button onClick={leaveRoom} className="mt-2 rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">{ko ? "로비로" : ja ? "ロビーへ" : "To Lobby"}</button>
        </div>
      )}
    </div>
  );
}
