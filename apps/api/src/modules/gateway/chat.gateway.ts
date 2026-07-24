import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RewardsService } from "../rewards/rewards.service";
import { JwtStrategy } from "../auth/jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";

export const CHANNEL_IDS = [1, 2, 3, 4] as const;

interface Participant {
  socketId: string;
  characterId: number;
  nickname: string;
  // 공개 채널이면 channelId(1~4)만, 길드 채널이면 guildId만 채워짐 — 항상 둘 중 하나만 유효
  channelId: number | null;
  guildId: string | null;
  recentMessageTimes: number[];
  mutedUntil: number;
  x: number;
  y: number;
}

// rate limit: 10초 내 3회 초과 시 30초 채팅 금지
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT = 3;
const MUTE_DURATION_MS = 30_000;

const KO_ADJ = [
  "야비한", "수상한", "느긋한", "배고픈", "화려한", "소심한", "용감한", "엉뚱한",
  "까칠한", "나른한", "우아한", "발랄한", "시크한", "도도한", "능청맞은", "새침한",
  "천진한", "음흉한", "게으른", "부지런한", "수줍은", "거만한", "귀여운", "무뚝뚝한",
  "엄격한", "자유로운", "변덕스런", "진지한", "쾌활한", "침착한", "엉큼한", "낭만적인",
];
const KO_ANI = [
  "바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카",
  "카피바라", "두더지", "치타", "나무늘보", "왈라비", "오리너구리", "라쿤", "비버",
  "족제비", "다람쥐", "햄스터", "판다", "코알라", "웜뱃", "여우원숭이", "카멜레온",
  "도롱뇽", "살쾡이", "고라니", "청설모", "표범", "수리부엉이", "물범", "땅늘보",
];
const JA_ADJ = [
  "のんびり", "あやしい", "いじわるな", "ふしぎな", "ゆうかんな", "おっとりした",
  "きまぐれな", "おとなしい", "あわてんぼうの", "するどい", "なまけもの", "まじめな",
  "きさくな", "うっかりした", "ずるがしこい", "おちゃめな", "しずかな", "にぎやかな",
];
const JA_ANI = [
  "セイウチ", "タヌキ", "カワウソ", "ホッキョクグマ", "ペンギン", "ハリネズミ",
  "ミーアキャット", "アルパカ", "カピバラ", "モグラ", "チーター", "ナマケモノ",
  "カンガルー", "カモノハシ", "アライグマ", "ビーバー", "リス", "ハムスター",
  "パンダ", "コアラ", "キツネ", "カメレオン", "ヒョウ", "アザラシ",
];

function randomNickname(lang: "ko" | "ja" = "ko"): string {
  if (lang === "ja") {
    const adj = JA_ADJ[Math.floor(Math.random() * JA_ADJ.length)];
    const ani = JA_ANI[Math.floor(Math.random() * JA_ANI.length)];
    return `${adj}${ani}`;
  }
  const adj = KO_ADJ[Math.floor(Math.random() * KO_ADJ.length)];
  const ani = KO_ANI[Math.floor(Math.random() * KO_ANI.length)];
  return `${adj} ${ani}`;
}

const room = (channelId: number) => `chat:${channelId}`;
const guildRoom = (guildId: string) => `guild-chat:${guildId}`;
/** 참가자가 지금 실제로 속한 소켓 room — 공개 채널/길드 채널 어느 쪽이든 이 값 기준으로 송수신 */
const roomOf = (p: Participant) => (p.guildId ? guildRoom(p.guildId) : room(p.channelId!));

@WebSocketGateway({
  namespace: "/chat",
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly rewards: RewardsService,
    private readonly jwtStrategy: JwtStrategy,
    private readonly prisma: PrismaService,
  ) {}

  private participants = new Map<string, Participant>();

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error("no token");
      const payload = this.jwtStrategy.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage("chat:join")
  handleJoin(
    @MessageBody() data: { channelId: number; characterId: number; lang?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const channelId = CHANNEL_IDS.includes(data?.channelId as 1 | 2 | 3 | 4)
      ? data.channelId
      : 1;
    const characterId = Number(data?.characterId) || 1;

    const userId = client.data.userId as string | undefined;
    if (userId) {
      this.rewards.incrementLiveCount(userId).catch(() => undefined);
    }

    // leave previous channel if switching
    const prev = this.participants.get(client.id);
    if (prev) {
      client.leave(roomOf(prev));
      this.participants.delete(client.id);
      if (prev.guildId) this.broadcastGuildRoster(prev.guildId);
      else this.broadcastRoster(prev.channelId!);
    }

    const nickname = randomNickname(data?.lang === "ja" ? "ja" : "ko");
    this.participants.set(client.id, {
      socketId: client.id,
      characterId,
      nickname,
      channelId,
      guildId: null,
      recentMessageTimes: [],
      mutedUntil: 0,
      x: 50,
      y: 78,
    });
    client.join(room(channelId));

    client.emit("chat:self", { socketId: client.id, nickname, characterId, channelId, guildId: null, x: 50, y: 78 });
    this.broadcastRoster(channelId);
    this.broadcastCounts();
  }

  @SubscribeMessage("chat:join-guild")
  async handleJoinGuild(
    @MessageBody() data: { characterId: number; lang?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;

    const membership = await this.prisma.guildMember.findUnique({
      where: { userId },
      select: { guildId: true },
    });
    if (!membership) {
      client.emit("chat:guild-error", { message: "길드에 가입되어 있지 않습니다." });
      return;
    }

    const characterId = Number(data?.characterId) || 1;

    const prev = this.participants.get(client.id);
    if (prev) {
      client.leave(roomOf(prev));
      this.participants.delete(client.id);
      if (prev.guildId) this.broadcastGuildRoster(prev.guildId);
      else this.broadcastRoster(prev.channelId!);
    }

    const nickname = randomNickname(data?.lang === "ja" ? "ja" : "ko");
    const participant: Participant = {
      socketId: client.id,
      characterId,
      nickname,
      channelId: null,
      guildId: membership.guildId,
      recentMessageTimes: [],
      mutedUntil: 0,
      x: 50,
      y: 78,
    };
    this.participants.set(client.id, participant);
    client.join(guildRoom(membership.guildId));

    client.emit("chat:self", {
      socketId: client.id,
      nickname,
      characterId,
      channelId: null,
      guildId: membership.guildId,
      x: 50,
      y: 78,
    });
    this.broadcastGuildRoster(membership.guildId);
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

    this.server.to(roomOf(participant)).emit("chat:message", {
      id: `${client.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      socketId: client.id,
      nickname: participant.nickname,
      characterId: participant.characterId,
      text,
    });
  }

  @SubscribeMessage("chat:move")
  handleMove(
    @MessageBody() data: { x: number; y: number },
    @ConnectedSocket() client: Socket,
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;
    participant.x = Math.max(0, Math.min(100, Number(data?.x) || 50));
    participant.y = Math.max(0, Math.min(100, Number(data?.y) || 78));
    this.server.to(roomOf(participant)).emit("chat:move", {
      socketId: client.id,
      x: participant.x,
      y: participant.y,
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
    client.leave(roomOf(participant));
    this.participants.delete(client.id);
    if (participant.guildId) this.broadcastGuildRoster(participant.guildId);
    else this.broadcastRoster(participant.channelId!);
    this.broadcastCounts();
  }

  private rosterFor(channelId: number) {
    return [...this.participants.values()]
      .filter((p) => p.channelId === channelId)
      .map((p) => ({ socketId: p.socketId, characterId: p.characterId, nickname: p.nickname, x: p.x, y: p.y }));
  }

  private broadcastRoster(channelId: number) {
    const participants = this.rosterFor(channelId);
    this.server.to(room(channelId)).emit("chat:roster", { channelId, guildId: null, participants });
  }

  private guildRosterFor(guildId: string) {
    return [...this.participants.values()]
      .filter((p) => p.guildId === guildId)
      .map((p) => ({ socketId: p.socketId, characterId: p.characterId, nickname: p.nickname, x: p.x, y: p.y }));
  }

  private broadcastGuildRoster(guildId: string) {
    const participants = this.guildRosterFor(guildId);
    this.server.to(guildRoom(guildId)).emit("chat:roster", { channelId: null, guildId, participants });
  }

  private channelCounts(): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const id of CHANNEL_IDS) counts[id] = 0;
    for (const p of this.participants.values()) {
      if (p.channelId === null) continue;
      counts[p.channelId] = (counts[p.channelId] ?? 0) + 1;
    }
    return counts;
  }

  private broadcastCounts() {
    // broadcast to everyone in the chat namespace so the lobby updates live
    this.server.emit("chat:counts", this.channelCounts());
  }
}
