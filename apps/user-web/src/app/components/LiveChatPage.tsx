import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, Users, Send, ArrowLeft, Sparkles } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { getChatSocket, disconnectChatSocket } from "../lib/socket";
import { PixelSprite } from "./PixelCharacter";
import { CHARACTERS } from "../data/characters";
import { useLang } from "../context/LangContext";

const CHANNELS = [1, 2, 3, 4] as const;
const BUBBLE_TTL = 5000;

const CHANNEL_EMOJIS: Record<number, string> = {
  1: "🏙️",
  2: "🏢",
  3: "☕",
  4: "🏕️",
};

function ChannelBackground() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-background to-muted dark:from-gray-900 dark:to-gray-950" />
  );
}

type RosterEntry = { socketId: string; characterId: number; nickname: string };
type SelfInfo = { socketId: string; nickname: string; characterId: number };
type ChatMsg = {
  id: string;
  socketId: string;
  nickname: string;
  characterId: number;
  text: string;
  x: number;
  y: number;
};

const charById = (id: number) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export default function LiveChatPage() {
  const { rewardSummary } = useAppData();
  const { t } = useLang();
  const myCharacterId = rewardSummary.equippedCharacterId ?? 1;

const [view, setView] = useState<"lobby" | "room">("lobby");
  const [channelId, setChannelId] = useState<number>(1);
  const [counts, setCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [self, setSelf] = useState<SelfInfo | null>(null);
  const [bubbles, setBubbles] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [mutedUntil, setMutedUntil] = useState(0);
  const [muteLeft, setMuteLeft] = useState(0);

  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const socket = getChatSocket();

    const onCounts = (data: Record<number, number>) => setCounts((prev) => ({ ...prev, ...data }));
    const onRoster = (data: { channelId: number; participants: RosterEntry[] }) => {
      setRoster(data.participants);
    };
    const onSelf = (data: SelfInfo) => setSelf(data);
    const onMessage = (m: Omit<ChatMsg, "x" | "y">) => {
      const bubble: ChatMsg = {
        ...m,
        x: 6 + Math.random() * 64,
        y: 10 + Math.random() * 42,
      };
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
    socket.on("chat:message", onMessage);
    socket.on("chat:muted", onMuted);
    socket.emit("chat:counts");

    return () => {
      socket.off("chat:counts", onCounts);
      socket.off("chat:roster", onRoster);
      socket.off("chat:self", onSelf);
      socket.off("chat:message", onMessage);
      socket.off("chat:muted", onMuted);
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (mutedUntil <= Date.now()) {
      setMuteLeft(0);
      return;
    }
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

  const enterChannel = (id: number) => {
    setChannelId(id);
    setBubbles([]);
    setRoster([]);
    setSelf(null);
    getChatSocket().emit("chat:join", { channelId: id, characterId: myCharacterId });
    setView("room");
  };

  const leaveChannel = () => {
    getChatSocket().emit("chat:leave");
    setView("lobby");
    setBubbles([]);
    setRoster([]);
    setSelf(null);
  };

  const isMuted = muteLeft > 0;

  const send = () => {
    if (isMuted) return;
    const text = input.trim();
    if (!text) return;
    getChatSocket().emit("chat:message", { text });
    setInput("");
  };

  const others = useMemo(
    () => roster.filter((r) => r.socketId !== self?.socketId),
    [roster, self],
  );

  if (view === "lobby") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("live.title")}</h1>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{t("live.desc")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CHANNELS.map((id) => (
            <button
              key={id}
              onClick={() => enterChannel(id)}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-lg"
            >
              <div>
                <div className="flex items-center gap-2 text-lg font-bold">
                  <span>{CHANNEL_EMOJIS[id]}</span>
                  ch.{id}
                </div>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{counts[id] ?? 0}{t("live.participants_suffix")}</span>
                </div>
              </div>
              <div className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-105">
                {t("live.enter")}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted dark:from-gray-900 dark:to-gray-950">
      <style>{`
        @keyframes chat-bubble-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          12% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; transform: translateY(-6px); }
          100% { opacity: 0; transform: translateY(-14px); }
        }
        @keyframes spotlight-pulse {
          0%,100% { opacity: 0.55; }
          50% { opacity: 0.8; }
        }
      `}</style>

      <ChannelBackground />

      <div className="relative z-20 flex items-center justify-between bg-white/70 px-4 py-3 backdrop-blur dark:bg-gray-900/60">
        <button onClick={leaveChannel} className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-primary dark:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> {t("live.leave")}
        </button>
        <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100">
          <Radio className="h-4 w-4 text-primary" />
          {CHANNEL_EMOJIS[channelId]} ch.{channelId}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
          <Users className="h-4 w-4" /> {roster.length}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30">
        {bubbles.map((b) => {
          const def = charById(b.characterId);
          const isMine = b.socketId === self?.socketId;
          return (
            <div
              key={b.id}
              className="absolute"
              style={{ left: `${b.x}%`, top: `${b.y}%`, animation: `chat-bubble-in ${BUBBLE_TTL}ms ease-out forwards` }}
            >
              <div
                className={`flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-md ${
                  isMine ? "border-2 border-primary" : "border border-gray-200"
                }`}
              >
                <span className="shrink-0">
                  <PixelSprite type={def.type} colors={def.colors} characterId={def.id} rarity={def.rarity} size={22} />
                </span>
                <span className={`whitespace-nowrap text-[11px] font-bold ${isMine ? "text-primary" : "text-gray-500"}`}>{b.nickname}</span>
                <span className="whitespace-nowrap text-sm font-medium text-gray-900">{b.text}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap items-end justify-center gap-x-1 gap-y-0 px-4 pb-2">
        {others.map((p) => {
          const def = charById(p.characterId);
          return (
            <div key={p.socketId} title={p.nickname} className="opacity-90" style={{ filter: "saturate(0.9)" }}>
              <PixelSprite type={def.type} colors={def.colors} characterId={def.id} rarity={def.rarity} size={42} />
            </div>
          );
        })}
      </div>

      {self && (
        <div className="relative z-10 flex flex-col items-center pb-4">
          <div
            className="pointer-events-none absolute -top-4 h-28 w-28"
            style={{
              background: "radial-gradient(circle at 50% 45%, rgba(255,241,170,0.9), rgba(255,241,170,0) 70%)",
              animation: "spotlight-pulse 2.5s ease-in-out infinite",
            }}
          />
          <div className="relative flex flex-col items-center">
            <div className="relative z-20 mb-4 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow">
              <Sparkles className="h-3 w-3" /> {self.nickname}
            </div>
            <div style={{ filter: "drop-shadow(0 0 8px rgba(255,213,79,0.9))" }}>
              <PixelSprite type={charById(self.characterId).type} colors={charById(self.characterId).colors} characterId={self.characterId} rarity={charById(self.characterId).rarity} size={64} float />
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 flex items-center gap-2 border-t border-white/40 bg-white/80 px-3 py-3 backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
          maxLength={100}
          disabled={isMuted}
          placeholder={
            isMuted
              ? `${t("live.muted_prefix")}${muteLeft}${t("live.muted_suffix")}`
              : t("live.placeholder")
          }
          className={`flex-1 rounded-full border px-4 py-2 text-sm outline-none ${
            isMuted
              ? "border-gray-200 bg-gray-100 text-gray-400 placeholder:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500"
              : "border-gray-300 bg-white text-gray-900 focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          }`}
        />
        <button
          onClick={send}
          disabled={isMuted}
          className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform ${
            isMuted ? "cursor-not-allowed bg-gray-300 dark:bg-gray-700" : "bg-primary hover:scale-105"
          }`}
        >
          <Send className="h-4 w-4" /> {isMuted ? `${muteLeft}s` : t("live.send")}
        </button>
      </div>
    </div>
  );
}
