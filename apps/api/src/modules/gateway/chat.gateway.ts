import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RewardsService } from "../rewards/rewards.service";

export const CHANNEL_IDS = [1, 2, 3, 4] as const;

interface Participant {
  socketId: string;
  characterId: number;
  nickname: string;
  channelId: number;
  recentMessageTimes: number[];
  mutedUntil: number;
}

// rate limit: 10초 내 3회 초과 시 30초 채팅 금지
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT = 3;
const MUTE_DURATION_MS = 30_000;

const ADJECTIVES = [
  "야비한", "수상한", "느긋한", "배고픈", "화려한", "소심한", "용감한", "엉뚱한",
  "까칠한", "나른한", "우아한", "발랄한", "시크한", "도도한", "능청맞은", "새침한",
  "천진한", "음흉한", "게으른", "부지런한", "수줍은", "거만한", "귀여운", "무뚝뚝한",
  "엄격한", "자유로운", "변덕스런", "진지한", "쾌활한", "침착한", "엉큼한", "낭만적인",
];

const ANIMALS = [
  "바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카",
  "카피바라", "두더지", "치타", "나무늘보", "왈라비", "오리너구리", "라쿤", "비버",
  "족제비", "다람쥐", "햄스터", "판다", "코알라", "웜뱃", "여우원숭이", "카멜레온",
  "도롱뇽", "살쾡이", "고라니", "청설모", "표범", "수리부엉이", "물범", "땅늘보",
];

function randomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

const room = (channelId: number) => `chat:${channelId}`;

@WebSocketGateway({
  namespace: "/chat",
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly rewards: RewardsService) {}

  private participants = new Map<string, Participant>();

  @SubscribeMessage("chat:join")
  handleJoin(
    @MessageBody() data: { channelId: number; characterId: number; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const channelId = CHANNEL_IDS.includes(data?.channelId as 1 | 2 | 3 | 4)
      ? data.channelId
      : 1;
    const characterId = Number(data?.characterId) || 1;

    if (data?.userId) {
      this.rewards.incrementLiveCount(data.userId).catch(() => undefined);
    }

    // leave previous channel if switching
    const prev = this.participants.get(client.id);
    if (prev) {
      client.leave(room(prev.channelId));
      this.participants.delete(client.id);
      this.broadcastRoster(prev.channelId);
    }

    const nickname = randomNickname();
    this.participants.set(client.id, {
      socketId: client.id,
      characterId,
      nickname,
      channelId,
      recentMessageTimes: [],
      mutedUntil: 0,
    });
    client.join(room(channelId));

    client.emit("chat:self", { socketId: client.id, nickname, characterId, channelId });
    this.broadcastRoster(channelId);
    this.broadcastCounts();
  }

  @SubscribeMessage("chat:leave")
  handleLeave(@ConnectedSocket() client: Socket) {
    this.removeParticipant(client);
  }

  @SubscribeMessage("chat:message")
  handleMessage(
    @MessageBody() data: { text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    const text = String(data?.text ?? "").trim().slice(0, 100);
    if (!text) return;

    const now = Date.now();

    // 이미 음소거 중이면 차단
    if (participant.mutedUntil > now) {
      client.emit("chat:muted", { until: participant.mutedUntil });
      return;
    }

    // 슬라이딩 윈도우 갱신
    participant.recentMessageTimes = participant.recentMessageTimes.filter(
      (t) => now - t < RATE_WINDOW_MS,
    );
    participant.recentMessageTimes.push(now);

    // 10초 내 RATE_LIMIT 초과 → 30초 음소거 + 이번 메시지도 차단
    if (participant.recentMessageTimes.length > RATE_LIMIT) {
      participant.mutedUntil = now + MUTE_DURATION_MS;
      participant.recentMessageTimes = [];
      client.emit("chat:muted", { until: participant.mutedUntil });
      return;
    }

    this.server.to(room(participant.channelId)).emit("chat:message", {
      id: `${client.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      socketId: client.id,
      nickname: participant.nickname,
      characterId: participant.characterId,
      text,
      ts: Date.now(),
    });
  }

  @SubscribeMessage("chat:counts")
  handleCounts(@ConnectedSocket() client: Socket) {
    client.emit("chat:counts", this.channelCounts());
  }

  handleDisconnect(client: Socket) {
    this.removeParticipant(client);
  }

  private removeParticipant(client: Socket) {
    const participant = this.participants.get(client.id);
    if (!participant) return;
    client.leave(room(participant.channelId));
    this.participants.delete(client.id);
    this.broadcastRoster(participant.channelId);
    this.broadcastCounts();
  }

  private rosterFor(channelId: number) {
    return [...this.participants.values()]
      .filter((p) => p.channelId === channelId)
      .map((p) => ({ socketId: p.socketId, characterId: p.characterId, nickname: p.nickname }));
  }

  private broadcastRoster(channelId: number) {
    const participants = this.rosterFor(channelId);
    this.server.to(room(channelId)).emit("chat:roster", {
      channelId,
      participants,
      count: participants.length,
    });
  }

  private channelCounts(): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const id of CHANNEL_IDS) counts[id] = 0;
    for (const p of this.participants.values()) counts[p.channelId] = (counts[p.channelId] ?? 0) + 1;
    return counts;
  }

  private broadcastCounts() {
    // broadcast to everyone in the chat namespace so the lobby updates live
    this.server.emit("chat:counts", this.channelCounts());
  }
}
