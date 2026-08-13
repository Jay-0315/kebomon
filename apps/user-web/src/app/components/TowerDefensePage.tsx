import { useEffect, useMemo, useRef, useState } from "react";
import { Coins, Copy, Crown, Hammer, Heart, Lock, LogIn, LogOut, MessageCircle, Radio, Send, Shield, ShoppingCart, Swords, Trophy, Unlock, Users, Zap } from "lucide-react";
import { api } from "../lib/api";
import { disconnectTowerDefenseSocket, getTowerDefenseSocket } from "../lib/socket";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";
import type { TdChatMessage, TdSnapshot, TdTargetMode, TdUnitType } from "../game/tower-defense/types";
import GameCanvas from "./tower-defense/GameCanvas";
import PixelCharacter from "./PixelCharacter";

interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  bestWave: number;
  characterId: number | null;
}

const TARGET_LABEL_KEY: Record<TdTargetMode, TranslationKey> = {
  front: "tower_defense.target_front",
  back: "tower_defense.target_back",
  strong: "tower_defense.target_strong",
  weak: "tower_defense.target_weak",
  boss: "tower_defense.target_boss",
};

const RANDOM_SUMMON_COST = 45;
const FIXED_SUMMON_COST = 140;
const TYPE_UPGRADE_BASE_COST = 85;
const TYPE_UPGRADE_COST_STEP = 55;
const TYPE_LABEL_KEY: Record<TdUnitType, TranslationKey> = {
  fire: "tower_defense.type_fire",
  water: "tower_defense.type_water",
  nature: "tower_defense.type_nature",
};

const TYPE_STYLE: Record<TdUnitType, string> = {
  fire: "border-red-400/40 bg-red-500/10 text-red-200",
  water: "border-cyan-300/40 bg-cyan-500/10 text-cyan-100",
  nature: "border-emerald-300/40 bg-emerald-500/10 text-emerald-100",
};

function typeUpgradeCost(level: number) {
  return TYPE_UPGRADE_BASE_COST + level * TYPE_UPGRADE_COST_STEP;
}

function actionId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatText(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);
}

export default function TowerDefensePage() {
  const { rewardSummary } = useAppData();
  const { t } = useLang();
  const [snapshot, setSnapshot] = useState<TdSnapshot | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<TdChatMessage[]>([]);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [moveTowerId, setMoveTowerId] = useState<string | null>(null);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [summonMode, setSummonMode] = useState<"random" | "fixed">("random");
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [summary, setSummary] = useState<{
    attemptsLeft: number | null;
    playMode?: "unlimited";
    bestWave: number;
    dailyKpCap?: number;
    dailyKpEarned?: number;
    dailyKpLeft?: number;
    perRunKpCap?: number;
  } | null>(null);

  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;
  const me = useMemo(
    () => snapshot?.players.find((p) => p.userId === selfUserId) ?? null,
    [snapshot, selfUserId],
  );
  const selectedTower = snapshot?.towers.find((t) => t.id === selectedTowerId) ?? null;
  const isHost = !!snapshot && snapshot.hostUserId === selfUserId;

  useEffect(() => {
    api
      .get<{
        attemptsLeft: number | null;
        playMode?: "unlimited";
        bestWave: number;
        dailyKpCap?: number;
        dailyKpEarned?: number;
        dailyKpLeft?: number;
        perRunKpCap?: number;
      }>("/tower-defense/summary")
      .then(setSummary)
      .catch(() => setSummary(null));
    api
      .get<RankingEntry[]>("/tower-defense/rankings")
      .then(setRankings)
      .catch(() => setRankings([]));
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 3_000);
    return () => window.clearTimeout(timer);
  }, [error]);

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
    socket.emit("td:room:create", { characterId: myCharacterId, speedMultiplier });
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
    if (summonMode === "fixed") {
      socket.emit("td:tower:fixed-summon", { slotId, characterId: myCharacterId, actionId: actionId() });
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

  const upgradeTower = () => {
    if (!selectedTower) return;
    socket.emit("td:tower:upgrade", { towerId: selectedTower.id, actionId: actionId() });
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
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 py-5">
      <div className="grid gap-4 rounded-md border border-border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
        <div>
          <p className="flex items-center gap-2 text-xl font-bold">
            <Shield className="h-5 w-5 text-primary" />
            {t("tower_defense.title")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("tower_defense.subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="flex min-h-14 flex-col justify-center rounded-md bg-muted px-3 py-2">
            <p className="text-muted-foreground">{t("tower_defense.best_record")}</p>
            <p className="font-bold">{summary?.bestWave ?? 0}</p>
          </div>
          <div className="flex min-h-14 flex-col justify-center rounded-md bg-muted px-3 py-2">
            <p className="text-muted-foreground">{t("tower_defense.daily_kp")}</p>
            <p className="font-bold">{summary?.dailyKpEarned ?? 0}/{summary?.dailyKpCap ?? 1200}</p>
          </div>
          <div className="flex min-h-14 flex-col justify-center rounded-md bg-muted px-3 py-2">
            <p className="text-muted-foreground">{t("tower_defense.per_run_cap")}</p>
            <p className="font-bold">{summary?.perRunKpCap ?? 400} KP</p>
          </div>
        </div>
      </div>

      {!snapshot && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-md border border-border bg-card p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold">
              <Radio className="h-4 w-4 text-primary" />
              {t("tower_defense.create_or_join")}
            </p>
            <div className="grid items-stretch gap-3 xl:grid-cols-[240px_220px_minmax(320px,1fr)]">
              <button
                onClick={createRoom}
                className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90"
              >
                {t("tower_defense.create_room")}
              </button>
              <div className="grid grid-cols-2 rounded-md border border-border bg-muted/30 p-1 text-xs font-bold">
                {([1, 2] as const).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setSpeedMultiplier(speed)}
                    className={`rounded px-2 py-2 ${speedMultiplier === speed ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {speed === 1 ? t("tower_defense.speed_default") : t("tower_defense.speed_double")}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder={t("tower_defense.room_code")}
                  className="min-w-0 flex-1 rounded-md border border-border bg-input-background px-3 py-2 text-sm"
                />
                <button
                  onClick={joinRoom}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-primary"
                >
                  <LogIn className="h-4 w-4" />
                  {t("tower_defense.join")}
                </button>
              </div>
            </div>
            {error && <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>

          <RankingPanel rankings={rankings} />
        </div>
      )}

      {snapshot && snapshot.phase === "lobby" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            <Hud snapshot={snapshot} />
            <GameCanvas
              snapshot={snapshot}
              viewUserId={selfUserId}
              selfUserId={selfUserId}
              selectedTowerId={selectedTowerId}
              onSelectTower={setSelectedTowerId}
              onSummon={summon}
            />
            {moveTowerId && (
              <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                {t("tower_defense.move_prompt")}
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

      {snapshot && snapshot.phase !== "lobby" && (
        <InGameShell
          snapshot={snapshot}
          selfUserId={selfUserId}
          selectedTower={selectedTower}
          selectedTowerId={selectedTowerId}
          moveTowerId={moveTowerId}
          summonMode={summonMode}
          myCharacterId={myCharacterId}
          error={error}
          chat={chat}
          message={message}
          setMessage={setMessage}
          onSelectTower={setSelectedTowerId}
          onSummon={summon}
          onSummonMode={setSummonMode}
          onMove={moveTower}
          onMerge={mergeTower}
          onUpgrade={upgradeTower}
          onToggleLock={toggleLockTower}
          onSell={sellTower}
          onTargetMode={setTargetMode}
          onLeave={leaveRoom}
          onSendChat={sendChat}
        />
      )}
    </div>
  );
}

function InGameShell({
  snapshot,
  selfUserId,
  selectedTower,
  selectedTowerId,
  moveTowerId,
  summonMode,
  myCharacterId,
  error,
  chat,
  message,
  setMessage,
  onSelectTower,
  onSummon,
  onSummonMode,
  onMove,
  onMerge,
  onUpgrade,
  onToggleLock,
  onSell,
  onTargetMode,
  onLeave,
  onSendChat,
}: {
  snapshot: TdSnapshot;
  selfUserId: string | null;
  selectedTower: TdSnapshot["towers"][number] | null;
  selectedTowerId: string | null;
  moveTowerId: string | null;
  summonMode: "random" | "fixed";
  myCharacterId: number;
  error: string | null;
  chat: TdChatMessage[];
  message: string;
  setMessage: (value: string) => void;
  onSelectTower: (towerId: string | null) => void;
  onSummon: (slotId: string) => void;
  onSummonMode: (mode: "random" | "fixed") => void;
  onMove: () => void;
  onMerge: () => void;
  onUpgrade: () => void;
  onToggleLock: () => void;
  onSell: () => void;
  onTargetMode: (mode: TdTargetMode) => void;
  onLeave: () => void;
  onSendChat: () => void;
}) {
  const { t } = useLang();
  const [viewUserId, setViewUserId] = useState(selfUserId);
  const me = snapshot.players.find((p) => p.userId === selfUserId) ?? null;
  const viewingPlayer = snapshot.players.find((p) => p.userId === viewUserId) ?? me;
  const myTowers = snapshot.towers.filter((tower) => tower.ownerUserId === selfUserId);
  const selectedSlot = selectedTower ? snapshot.slots.find((slot) => slot.id === selectedTower.slotId) : null;
  const canRandom = (me?.gold ?? 0) >= RANDOM_SUMMON_COST;
  const canFixed = (me?.gold ?? 0) >= FIXED_SUMMON_COST;
  const selectedTypeLevel = selectedTower ? me?.typeUpgrades?.[selectedTower.unitType] ?? selectedTower.upgradeLevel ?? 0 : 0;
  const selectedTypeCost = selectedTypeLevel >= 10 ? 0 : typeUpgradeCost(selectedTypeLevel);
  const canUpgrade = !!selectedTower && selectedTypeLevel < 10 && (me?.gold ?? 0) >= selectedTypeCost;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#03060a] text-emerald-100">
      <div className="flex h-screen min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-emerald-500/20 bg-[#071016] px-4 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <ResourcePill icon={<Coins className="h-4 w-4 text-amber-300" />} label={t("tower_defense.gold")} value={me?.gold ?? 0} tone="text-amber-200" />
            <ResourcePill icon={<Swords className="h-4 w-4 text-red-300" />} label={t("tower_defense.kills")} value={me?.kills ?? 0} tone="text-red-200" />
            <ResourcePill icon={<Heart className="h-4 w-4 text-rose-300" />} label={t("tower_defense.life")} value={`${me?.lives ?? snapshot.lives}/${me?.maxLives ?? snapshot.maxLives}`} tone="text-rose-200" />
            <ResourcePill icon={<Zap className="h-4 w-4 text-amber-300" />} label={t("tower_defense.wave")} value={snapshot.wave || 1} tone="text-amber-200" />
          </div>
          <button onClick={onLeave} className="rounded border border-emerald-500/30 px-3 py-1 font-bold text-emerald-200 hover:bg-emerald-500/10">
            {t("tower_defense.leave")}
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative min-h-0 bg-black">
            <GameCanvas
              snapshot={snapshot}
              viewUserId={viewingPlayer?.userId ?? selfUserId}
              selfUserId={selfUserId}
              selectedTowerId={selectedTowerId}
              fullHeight
              onSelectTower={onSelectTower}
              onSummon={onSummon}
            />
            <div className="absolute left-3 top-3 rounded border border-emerald-500/40 bg-black/70 px-3 py-2 text-xs text-emerald-100 backdrop-blur">
              <p className="font-bold">{formatText(t("tower_defense.player_area"), { player: viewingPlayer?.nickname ?? "PLAYER" })}</p>
              <p className="text-emerald-300/75">
                {snapshot.waveActive
                  ? t("tower_defense.wave_active")
                  : formatText(t("tower_defense.next_wave_in"), { sec: Math.ceil(snapshot.nextWaveInMs / 1000) })}
              </p>
            </div>
            {moveTowerId && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded border border-amber-300/60 bg-black/75 px-4 py-2 text-sm font-bold text-amber-200">
                {t("tower_defense.move_prompt")}
              </div>
            )}
            {error && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded border border-red-400/50 bg-black/80 px-4 py-2 text-sm font-bold text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto border-l border-emerald-500/20 bg-[#071016] p-3">
            <ScoreBoard snapshot={snapshot} selfUserId={selfUserId} viewUserId={viewingPlayer?.userId ?? null} onViewUser={setViewUserId} />
          </div>
        </div>

        <div className="grid shrink-0 border-t border-emerald-500/20 bg-[#05080d] md:grid-cols-[200px_1fr_300px]">
          <MiniMap slots={snapshot.slots.filter((slot) => slot.ownerUserId === selfUserId).length} towers={myTowers.length} />
          <CommandCard
            selectedTower={selectedTower}
            selectedSlot={selectedSlot}
            typeUpgrades={me?.typeUpgrades ?? { fire: 0, water: 0, nature: 0 }}
            selectedTypeLevel={selectedTypeLevel}
            selectedTypeCost={selectedTypeCost}
            summonMode={summonMode}
            canRandom={canRandom}
            canFixed={canFixed}
            canUpgrade={canUpgrade}
            myCharacterId={myCharacterId}
            onSummonMode={onSummonMode}
            onMove={onMove}
            onMerge={onMerge}
            onUpgrade={onUpgrade}
            onToggleLock={onToggleLock}
            onSell={onSell}
            onTargetMode={onTargetMode}
          />
          <CompactChat chat={chat} message={message} setMessage={setMessage} onSend={onSendChat} />
        </div>
      </div>
    </div>
  );
}

function ResourcePill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-emerald-500/25 bg-black/40 px-3 py-1.5">
      {icon}
      <span className="text-[10px] font-bold text-emerald-400/70">{label}</span>
      <span className={`font-mono text-base font-black ${tone}`}>{value}</span>
    </div>
  );
}

function ScoreBoard({
  snapshot,
  selfUserId,
  viewUserId,
  onViewUser,
}: {
  snapshot: TdSnapshot;
  selfUserId: string | null;
  viewUserId: string | null;
  onViewUser: (userId: string) => void;
}) {
  const { t } = useLang();
  return (
    <div className="rounded border border-emerald-500/35 bg-black/45 p-3 text-sm text-emerald-100">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-black">{t("tower_defense.players")}</p>
        <p className="text-xs text-emerald-300/70">{t("tower_defense.spectate_hint")}</p>
      </div>
      <div className="space-y-2">
        {snapshot.players.map((p) => (
          <button
            type="button"
            onClick={() => onViewUser(p.userId)}
            key={p.userId}
            className={`grid w-full grid-cols-[1fr_48px_48px_58px] items-center gap-2 rounded px-2 py-1.5 text-left transition ${
              p.userId === viewUserId
                ? "bg-cyan-500/18 text-cyan-100 ring-1 ring-cyan-300/40"
                : p.userId === selfUserId
                  ? "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/20"
                  : "bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="min-w-0">
              <p className="truncate font-bold">{p.nickname}</p>
              <p className="text-[10px] text-emerald-300/60">
                {p.userId === selfUserId ? t("tower_defense.my_area") : p.connected ? t("tower_defense.online") : t("tower_defense.reconnect")}
              </p>
            </div>
            <p className="text-right font-mono font-bold text-rose-200">{p.lives}</p>
            <p className="text-right font-mono font-bold">{p.kills}</p>
            <p className="text-right font-mono font-bold text-cyan-200">{p.gold}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniMap({ slots, towers }: { slots: number; towers: number }) {
  const { t } = useLang();
  return (
    <div className="border-r border-emerald-500/20 p-3">
      <div className="h-full rounded border border-emerald-500/35 bg-black/60 p-3">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: slots }, (_, i) => (
            <span key={i} className={`h-3 rounded-sm ${i < towers ? "bg-emerald-400" : "bg-emerald-900/50"}`} />
          ))}
        </div>
        <p className="mt-3 text-xs font-bold text-emerald-200">{formatText(t("tower_defense.deploy_status"), { towers, slots })}</p>
        <p className="mt-1 text-[10px] text-emerald-300/60">{t("tower_defense.own_slot_status")}</p>
      </div>
    </div>
  );
}

function CommandCard({
  selectedTower,
  selectedSlot,
  typeUpgrades,
  selectedTypeLevel,
  selectedTypeCost,
  summonMode,
  canRandom,
  canFixed,
  canUpgrade,
  myCharacterId,
  onSummonMode,
  onMove,
  onMerge,
  onUpgrade,
  onToggleLock,
  onSell,
  onTargetMode,
}: {
  selectedTower: TdSnapshot["towers"][number] | null;
  selectedSlot: TdSnapshot["slots"][number] | null | undefined;
  typeUpgrades: Record<TdUnitType, number>;
  selectedTypeLevel: number;
  selectedTypeCost: number;
  summonMode: "random" | "fixed";
  canRandom: boolean;
  canFixed: boolean;
  canUpgrade: boolean;
  myCharacterId: number;
  onSummonMode: (mode: "random" | "fixed") => void;
  onMove: () => void;
  onMerge: () => void;
  onUpgrade: () => void;
  onToggleLock: () => void;
  onSell: () => void;
  onTargetMode: (mode: TdTargetMode) => void;
}) {
  const { t } = useLang();
  return (
    <div className="grid gap-3 p-3 lg:grid-cols-[260px_1fr]">
      <div className="rounded border border-emerald-500/30 bg-black/55 p-3">
        <p className="mb-2 text-xs font-black text-emerald-200">{t("tower_defense.unit_info")}</p>
        {selectedTower ? (
          <div className="flex items-center gap-3">
            <PixelCharacter characterId={selectedTower.characterId} size={52} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-black text-emerald-100">#{selectedTower.characterId}</p>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-black ${TYPE_STYLE[selectedTower.unitType]}`}>
                  {formatText(t("tower_defense.type_level"), { type: t(TYPE_LABEL_KEY[selectedTower.unitType]), level: selectedTypeLevel })}
                </span>
              </div>
              <p className="text-xs text-emerald-300/70">
                {selectedTower.rarity} · DMG {selectedTower.damage} · RNG {selectedTower.range}
              </p>
              <p className="text-xs text-cyan-200">
                {formatText(t("tower_defense.next_upgrade_cost"), { cost: selectedTypeCost || "MAX" })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <PixelCharacter characterId={myCharacterId} size={52} />
            <div>
              <p className="font-black text-emerald-100">{t("tower_defense.select_slot")}</p>
              <p className="text-xs text-emerald-300/70">{t("tower_defense.select_slot_desc")}</p>
            </div>
          </div>
        )}
        {selectedSlot && <p className="mt-2 text-[10px] text-emerald-300/55">SLOT {selectedSlot.id}</p>}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {(Object.keys(TYPE_LABEL_KEY) as TdUnitType[]).map((type) => (
            <div key={type} className={`rounded border px-2 py-1 text-center text-[10px] font-black ${TYPE_STYLE[type]}`}>
              {t(TYPE_LABEL_KEY[type])} {typeUpgrades[type] ?? 0}/10
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onSummonMode("random")}
            className={`rounded border px-3 py-2 text-left text-xs font-bold ${
              summonMode === "random" ? "border-cyan-300 bg-cyan-400/10 text-cyan-100" : "border-emerald-500/25 text-emerald-200"
            } ${!canRandom ? "opacity-50" : ""}`}
          >
            <span className="flex items-center gap-1"><ShoppingCart className="h-4 w-4" /> {t("tower_defense.random_summon")}</span>
            <span className="mt-1 block font-mono text-[11px]">{formatText(t("tower_defense.cost_gold"), { cost: RANDOM_SUMMON_COST })}</span>
          </button>
          <button
            onClick={() => onSummonMode("fixed")}
            className={`rounded border px-3 py-2 text-left text-xs font-bold ${
              summonMode === "fixed" ? "border-cyan-300 bg-cyan-400/10 text-cyan-100" : "border-emerald-500/25 text-emerald-200"
            } ${!canFixed ? "opacity-50" : ""}`}
          >
            <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> {t("tower_defense.fixed_summon")}</span>
            <span className="mt-1 block font-mono text-[11px]">{formatText(t("tower_defense.cost_gold"), { cost: FIXED_SUMMON_COST })}</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <ActionButton icon={<Hammer className="h-4 w-4" />} label={t("tower_defense.type_upgrade")} disabled={!canUpgrade} onClick={onUpgrade} />
          <ActionButton label={t("tower_defense.merge")} disabled={!selectedTower || selectedTower.locked} onClick={onMerge} />
          <ActionButton label={t("tower_defense.move")} disabled={!selectedTower} onClick={onMove} />
          <ActionButton label={selectedTower?.locked ? t("tower_defense.unlock") : t("tower_defense.lock")} disabled={!selectedTower} onClick={onToggleLock} />
        </div>

        <div className="grid grid-cols-6 gap-2">
          {(Object.keys(TARGET_LABEL_KEY) as TdTargetMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onTargetMode(mode)}
              disabled={!selectedTower}
              className={`rounded border px-2 py-2 text-xs font-black ${
                selectedTower?.targetMode === mode
                  ? "border-cyan-300 bg-cyan-300/10 text-cyan-100"
                  : "border-emerald-500/25 text-emerald-200 disabled:opacity-40"
              }`}
            >
              {t(TARGET_LABEL_KEY[mode])}
            </button>
          ))}
          <button
            onClick={onSell}
            disabled={!selectedTower}
            className="rounded border border-red-400/35 px-2 py-2 text-xs font-black text-red-200 hover:bg-red-500/10 disabled:opacity-40"
          >
            {t("tower_defense.sell")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, disabled, onClick }: { icon?: React.ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 items-center justify-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/5 px-2 text-xs font-black text-emerald-100 hover:bg-emerald-500/12 disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

function CompactChat({
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
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chat.length]);

  return (
    <div className="border-l border-emerald-500/20 p-3">
      <div className="flex h-full flex-col rounded border border-emerald-500/30 bg-black/55 p-2">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-1 overflow-auto text-xs text-emerald-100">
          {chat.length === 0 ? (
            <p className="text-emerald-300/60">{t("tower_defense.no_messages")}</p>
          ) : (
            chat.slice(-5).map((m) => (
              <p key={m.id} className="truncate">
                <span className="font-bold text-emerald-300">{m.nickname}</span> {m.message}
              </p>
            ))
          )}
        </div>
        <div className="mt-2 flex gap-1">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) onSend();
            }}
            className="min-w-0 flex-1 rounded border border-emerald-500/25 bg-black px-2 py-1 text-xs text-emerald-100"
            maxLength={120}
          />
          <button onClick={onSend} className="rounded border border-emerald-500/30 px-2 text-emerald-200">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Hud({ snapshot }: { snapshot: TdSnapshot }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <HudCell icon={<Swords className="h-4 w-4" />} label={t("tower_defense.wave")} value={`${snapshot.wave || 1}`} />
      <HudCell icon={<Heart className="h-4 w-4" />} label={t("tower_defense.life")} value={`${snapshot.lives}/${snapshot.maxLives}`} />
      <HudCell icon={<Users className="h-4 w-4" />} label={t("tower_defense.players")} value={`${snapshot.players.length}/4`} />
      <HudCell icon={<Zap className="h-4 w-4" />} label={t("tower_defense.next")} value={snapshot.waveActive ? t("tower_defense.active") : `${Math.ceil(snapshot.nextWaveInMs / 1000)}s`} />
      <HudCell icon={<Trophy className="h-4 w-4" />} label={t("tower_defense.room")} value={snapshot.roomCode} />
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
  const { t } = useLang();
  const me = snapshot.players.find((p) => p.userId === selfUserId);
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold">{formatText(t("tower_defense.room_with_code"), { code: snapshot.roomCode })}</p>
        <div className="flex gap-1.5">
          <button
            onClick={() => void navigator.clipboard?.writeText(snapshot.roomCode)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-primary"
          >
            <Copy className="h-3.5 w-3.5" />
            {t("tower_defense.copy")}
          </button>
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:border-destructive hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("tower_defense.leave")}
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
                <p className="text-xs text-muted-foreground">
                  {p.connected ? t("tower_defense.online") : t("tower_defense.reconnect")} · {formatText(t("tower_defense.kills_value"), { kills: p.kills })}
                </p>
              </div>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${p.ready || p.userId === snapshot.hostUserId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {p.userId === snapshot.hostUserId ? t("tower_defense.host") : p.ready ? t("tower_defense.ready_state") : t("tower_defense.wait")}
            </span>
          </div>
        ))}
      </div>
      {snapshot.phase === "lobby" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onReady} className="rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-primary">
            {me?.ready ? t("tower_defense.unready") : t("tower_defense.ready")}
          </button>
          <button
            onClick={onStart}
            disabled={!isHost}
            className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {t("tower_defense.start")}
          </button>
        </div>
      )}
      {snapshot.phase === "ended" && snapshot.result && (
        <div className="mt-3 rounded-md bg-primary/10 p-3 text-sm">
          <p className="font-bold">{snapshot.result.won ? t("tower_defense.victory") : t("tower_defense.ended")}</p>
          <p className="text-muted-foreground">{formatText(t("tower_defense.clear_wave"), { wave: snapshot.result.wavesCleared })}</p>
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
  const { t } = useLang();
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 text-sm font-bold">{t("tower_defense.tower")}</p>
      {!tower ? (
        <p className="text-sm text-muted-foreground">{t("tower_defense.tower_empty")}</p>
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
            {(Object.keys(TARGET_LABEL_KEY) as TdTargetMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onTargetMode(mode)}
                className={`rounded border px-1 py-1 text-[11px] font-bold ${tower.targetMode === mode ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
              >
                {t(TARGET_LABEL_KEY[mode])}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={onMove}
              className={`rounded-md border px-3 py-2 text-sm font-bold ${moving ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"}`}
            >
              {t("tower_defense.move")}
            </button>
            <button
              onClick={onMerge}
              disabled={tower.locked}
              className="rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-primary hover:text-primary disabled:opacity-40"
            >
              {t("tower_defense.merge")}
            </button>
            <button
              onClick={onToggleLock}
              className={`rounded-md border px-3 py-2 text-sm font-bold ${tower.locked ? "border-amber-400/50 bg-amber-400/10 text-amber-500" : "border-border hover:border-primary"}`}
            >
              {tower.locked ? t("tower_defense.unlock") : t("tower_defense.lock")}
            </button>
            <button onClick={onSell} className="rounded-md border border-border px-3 py-2 text-sm font-bold hover:border-destructive hover:text-destructive">
              {t("tower_defense.sell")}
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
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chat.length]);

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <MessageCircle className="h-4 w-4 text-primary" />
        {t("tower_defense.room_chat")}
      </p>
      <div ref={scrollRef} className="mb-3 h-40 space-y-2 overflow-auto rounded-md bg-muted/30 p-2">
        {chat.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("tower_defense.no_messages")}</p>
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
  const { t } = useLang();
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Trophy className="h-4 w-4 text-amber-400" />
        {t("tower_defense.rankings")}
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
