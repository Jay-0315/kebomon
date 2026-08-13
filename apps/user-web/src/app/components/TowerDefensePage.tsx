import { useEffect, useMemo, useState } from "react";
import { Copy, Crown, Heart, Lock, LogIn, LogOut, MessageCircle, Radio, Send, Shield, Swords, Trophy, Unlock, Users, Zap } from "lucide-react";
import { api } from "../lib/api";
import { disconnectTowerDefenseSocket, getTowerDefenseSocket } from "../lib/socket";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TdChatMessage, TdSnapshot, TdTargetMode } from "../game/tower-defense/types";
import GameCanvas from "./tower-defense/GameCanvas";
import PixelCharacter from "./PixelCharacter";

interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  bestWave: number;
  characterId: number | null;
}

const TARGET_LABEL: Record<TdTargetMode, string> = {
  front: "앞",
  back: "뒤",
  strong: "강",
  weak: "약",
  boss: "보스",
};

function actionId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function TowerDefensePage() {
  const { rewardSummary } = useAppData();
  const { lang } = useLang();
  const ko = lang === "ko";
  const [snapshot, setSnapshot] = useState<TdSnapshot | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<TdChatMessage[]>([]);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [moveTowerId, setMoveTowerId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [summary, setSummary] = useState<{ attemptsLeft: number; bestWave: number } | null>(null);

  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;
  const me = useMemo(
    () => snapshot?.players.find((p) => p.userId === selfUserId) ?? null,
    [snapshot, selfUserId],
  );
  const selectedTower = snapshot?.towers.find((t) => t.id === selectedTowerId) ?? null;
  const isHost = !!snapshot && snapshot.hostUserId === selfUserId;

  useEffect(() => {
    api
      .get<{ attemptsLeft: number; bestWave: number }>("/tower-defense/summary")
      .then(setSummary)
      .catch(() => setSummary(null));
    api
      .get<RankingEntry[]>("/tower-defense/rankings")
      .then(setRankings)
      .catch(() => setRankings([]));
  }, []);

  useEffect(() => {
    const socket = getTowerDefenseSocket();
    const onSelf = (data: { userId: string }) => setSelfUserId(data.userId);
    const onSnapshot = (data: TdSnapshot) => {
      setSnapshot(data);
      if (data.message) {
        const systemMessage = data.message;
        setChat((prev) => [
          ...prev.slice(-40),
          { id: `sys-${Date.now()}`, userId: "system", nickname: "SYSTEM", message: systemMessage, createdAt: Date.now() },
        ]);
      }
    };
    const onError = (data: { message: string }) => setError(data.message);
    const onChat = (data: TdChatMessage) => setChat((prev) => [...prev.slice(-40), data]);
    const onLeft = () => {
      setSnapshot(null);
      setSelectedTowerId(null);
      setMoveTowerId(null);
      setChat([]);
    };

    socket.on("td:self", onSelf);
    socket.on("td:game:snapshot", onSnapshot);
    socket.on("td:error", onError);
    socket.on("td:chat:message", onChat);
    socket.on("td:room:left", onLeft);
    socket.emit("td:room:reconnect", { characterId: myCharacterId });

    return () => {
      socket.off("td:self", onSelf);
      socket.off("td:game:snapshot", onSnapshot);
      socket.off("td:error", onError);
      socket.off("td:chat:message", onChat);
      socket.off("td:room:left", onLeft);
      disconnectTowerDefenseSocket();
    };
  }, [myCharacterId]);

  const socket = getTowerDefenseSocket();

  const createRoom = () => {
    setError(null);
    socket.emit("td:room:create", { characterId: myCharacterId });
  };

  const joinRoom = () => {
    setError(null);
    socket.emit("td:room:join", { code: roomCode, characterId: myCharacterId });
  };

  const setReady = () => {
    socket.emit("td:room:ready", { ready: !me?.ready });
  };

  const startGame = () => {
    socket.emit("td:game:start");
  };

  const leaveRoom = () => {
    socket.emit("td:room:leave");
  };

  const summon = (slotId: string) => {
    if (moveTowerId) {
      socket.emit("td:tower:move", { towerId: moveTowerId, slotId, actionId: actionId() });
      setMoveTowerId(null);
      return;
    }
    socket.emit("td:tower:summon", { slotId, actionId: actionId() });
  };

  const sellTower = () => {
    if (!selectedTower) return;
    socket.emit("td:tower:sell", { towerId: selectedTower.id, actionId: actionId() });
    setSelectedTowerId(null);
  };

  const moveTower = () => {
    if (!selectedTower) return;
    setMoveTowerId(selectedTower.id);
  };

  const mergeTower = () => {
    if (!selectedTower) return;
    socket.emit("td:tower:merge", { towerId: selectedTower.id, actionId: actionId() });
  };

  const toggleLockTower = () => {
    if (!selectedTower) return;
    socket.emit("td:tower:lock", { towerId: selectedTower.id, locked: !selectedTower.locked, actionId: actionId() });
  };

  const setTargetMode = (targetMode: TdTargetMode) => {
    if (!selectedTower) return;
    socket.emit("td:tower:target-mode", { towerId: selectedTower.id, targetMode, actionId: actionId() });
  };

  const sendChat = () => {
    const text = message.trim();
    if (!text) return;
    socket.emit("td:chat:send", { message: text });
    setMessage("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-5">
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xl font-bold">
            <Shield className="h-5 w-5 text-primary" />
            {ko ? "랜덤 타워 디펜스" : "Random Tower Defense"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {ko ? "서버가 전투를 계산하고, 클라이언트는 명령과 렌더링만 담당합니다." : "Server-authoritative real-time defense room."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-muted-foreground">{ko ? "최고 기록" : "Best"}</p>
            <p className="font-bold">{summary?.bestWave ?? 0}</p>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-muted-foreground">{ko ? "남은 횟수" : "Attempts"}</p>
            <p className="font-bold">{summary?.attemptsLeft ?? "-"}</p>
          </div>
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-muted-foreground">{ko ? "참가자" : "Players"}</p>
            <p className="font-bold">{snapshot?.players.length ?? 0}/4</p>
          </div>
        </div>
      </div>

      {!snapshot && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Radio className="h-4 w-4 text-primary" />
              {ko ? "방 생성 또는 코드 입장" : "Create or Join"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={createRoom}
                className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                {ko ? "새 방 만들기" : "Create Room"}
              </button>
              <div className="flex gap-2">
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder={ko ? "방 코드" : "Room code"}
                  className="min-w-0 flex-1 rounded-md border border-border bg-input-background px-3 py-2 text-sm"
                />
                <button
                  onClick={joinRoom}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-primary"
                >
                  <LogIn className="h-4 w-4" />
                  {ko ? "입장" : "Join"}
                </button>
              </div>
            </div>
            {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>

          <RankingPanel rankings={rankings} />
        </div>
      )}

      {snapshot && (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            <Hud snapshot={snapshot} />
            <GameCanvas
              snapshot={snapshot}
              selectedTowerId={selectedTowerId}
              onSelectTower={setSelectedTowerId}
              onSummon={summon}
            />
            {moveTowerId && (
              <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                이동할 빈 슬롯을 선택하세요.
              </div>
            )}
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>

          <div className="space-y-3">
            <RoomPanel
              snapshot={snapshot}
              selfUserId={selfUserId}
              isHost={isHost}
              onReady={setReady}
              onStart={startGame}
              onLeave={leaveRoom}
            />
            <TowerPanel
              tower={selectedTower}
              moving={!!moveTowerId}
              onMove={moveTower}
              onMerge={mergeTower}
              onToggleLock={toggleLockTower}
              onSell={sellTower}
              onTargetMode={setTargetMode}
            />
            <ChatPanel chat={chat} message={message} setMessage={setMessage} onSend={sendChat} />
          </div>
        </div>
      )}
    </div>
  );
}

function Hud({ snapshot }: { snapshot: TdSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <HudCell icon={<Swords className="h-4 w-4" />} label="Wave" value={`${snapshot.wave || 1}`} />
      <HudCell icon={<Heart className="h-4 w-4" />} label="Life" value={`${snapshot.lives}/${snapshot.maxLives}`} />
      <HudCell icon={<Users className="h-4 w-4" />} label="Players" value={`${snapshot.players.length}/4`} />
      <HudCell icon={<Zap className="h-4 w-4" />} label="Next" value={snapshot.waveActive ? "Active" : `${Math.ceil(snapshot.nextWaveInMs / 1000)}s`} />
      <HudCell icon={<Trophy className="h-4 w-4" />} label="Room" value={snapshot.roomCode} />
    </div>
  );
}

function HudCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-0.5 text-base font-bold">{value}</p>
    </div>
  );
}

function RoomPanel({
  snapshot,
  selfUserId,
  isHost,
  onReady,
  onStart,
  onLeave,
}: {
  snapshot: TdSnapshot;
  selfUserId: string | null;
  isHost: boolean;
  onReady: () => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const me = snapshot.players.find((p) => p.userId === selfUserId);
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold">Room {snapshot.roomCode}</p>
        <div className="flex gap-1.5">
          <button
            onClick={() => void navigator.clipboard?.writeText(snapshot.roomCode)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            나가기
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {snapshot.players.map((p) => (
          <div key={p.userId} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <PixelCharacter characterId={p.characterId} size={28} />
              <div>
                <p className="flex items-center gap-1 text-sm font-semibold">
                  {p.userId === snapshot.hostUserId && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                  {p.nickname}
                </p>
                <p className="text-xs text-muted-foreground">{p.connected ? "online" : "reconnect wait"} · {p.kills} kills</p>
              </div>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${p.ready || p.userId === snapshot.hostUserId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {p.userId === snapshot.hostUserId ? "HOST" : p.ready ? "READY" : "WAIT"}
            </span>
          </div>
        ))}
      </div>
      {snapshot.phase === "lobby" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onReady} className="rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-primary">
            {me?.ready ? "준비 취소" : "준비"}
          </button>
          <button
            onClick={onStart}
            disabled={!isHost}
            className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            시작
          </button>
        </div>
      )}
      {snapshot.phase === "ended" && snapshot.result && (
        <div className="mt-3 rounded-md bg-primary/10 p-3 text-sm">
          <p className="font-bold">{snapshot.result.won ? "성공" : "종료"}</p>
          <p className="text-muted-foreground">도달 웨이브 {snapshot.result.wavesCleared}</p>
        </div>
      )}
    </div>
  );
}

function TowerPanel({
  tower,
  moving,
  onMove,
  onMerge,
  onToggleLock,
  onSell,
  onTargetMode,
}: {
  tower: ReturnType<NonNullable<TdSnapshot["towers"]>["find"]> | null;
  moving: boolean;
  onMove: () => void;
  onMerge: () => void;
  onToggleLock: () => void;
  onSell: () => void;
  onTargetMode: (mode: TdTargetMode) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 text-sm font-bold">Tower</p>
      {!tower ? (
        <p className="text-sm text-muted-foreground">빈 슬롯을 클릭하면 랜덤 타워를 소환합니다.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <PixelCharacter characterId={tower.characterId} size={42} />
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold">
                #{tower.characterId}
                {tower.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
              </p>
              <p className="text-xs text-muted-foreground">{tower.rarity} · DMG {tower.damage} · RNG {tower.range}</p>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(TARGET_LABEL) as TdTargetMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onTargetMode(mode)}
                className={`rounded border px-1 py-1 text-[11px] font-bold ${tower.targetMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              >
                {TARGET_LABEL[mode]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={onMove}
              className={`rounded-md border px-3 py-2 text-sm font-bold ${moving ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"}`}
            >
              이동
            </button>
            <button
              onClick={onMerge}
              disabled={tower.locked}
              className="rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-primary hover:text-primary disabled:opacity-40"
            >
              합성
            </button>
            <button
              onClick={onToggleLock}
              className={`rounded-md border px-3 py-2 text-sm font-bold ${tower.locked ? "border-amber-400/50 bg-amber-400/10 text-amber-500" : "border-border hover:border-primary"}`}
            >
              {tower.locked ? "해제" : "잠금"}
            </button>
            <button onClick={onSell} className="rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-destructive hover:text-destructive">
              판매
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  chat,
  message,
  setMessage,
  onSend,
}: {
  chat: TdChatMessage[];
  message: string;
  setMessage: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <MessageCircle className="h-4 w-4 text-primary" />
        Room Chat
      </p>
      <div className="mb-3 h-40 space-y-2 overflow-auto rounded-md bg-muted/30 p-2">
        {chat.length === 0 ? (
          <p className="text-xs text-muted-foreground">메시지가 없습니다.</p>
        ) : (
          chat.map((m) => (
            <p key={m.id} className="text-xs">
              <span className={m.userId === "system" ? "font-bold text-primary" : "font-bold"}>{m.nickname}</span>
              <span className="text-muted-foreground"> · </span>
              <span>{m.message}</span>
            </p>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) onSend();
          }}
          className="min-w-0 flex-1 rounded-md border border-border bg-input-background px-3 py-2 text-sm"
          maxLength={120}
        />
        <button onClick={onSend} className="rounded-md bg-primary px-3 text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RankingPanel({ rankings }: { rankings: RankingEntry[] }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Trophy className="h-4 w-4 text-amber-400" />
        Rankings
      </p>
      <div className="space-y-2">
        {rankings.slice(0, 8).map((r) => (
          <div key={r.userId} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span>#{r.rank} {r.nickname}</span>
            <span className="font-bold">{r.bestWave}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
