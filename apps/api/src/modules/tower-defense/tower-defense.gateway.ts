import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtStrategy } from "../auth/jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { GameEngine } from "./engine/game-engine";
import { GameRoomManager } from "./room/game-room.manager";
import type { TdMessageParams, TdPlayer, TdSpeedMultiplier } from "./types/tower-defense.types";

type TdRateBucket = {
  count: number;
  windowStartedAt: number;
  lastAcceptedAt: number;
};

const TD_RATE_LIMITS: Record<string, { minIntervalMs: number; windowMs: number; maxInWindow: number }> = {
  room: { minIntervalMs: 250, windowMs: 5_000, maxInWindow: 12 },
  command: { minIntervalMs: 80, windowMs: 2_000, maxInWindow: 24 },
  chat: { minIntervalMs: 800, windowMs: 10_000, maxInWindow: 8 },
};

@WebSocketGateway({ namespace: "/tower-defense", cors: { origin: true, credentials: true }, path: "/socket.io" })
export class TowerDefenseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly rateBuckets = new Map<string, TdRateBucket>();

  constructor(
    private readonly jwtStrategy: JwtStrategy,
    private readonly prisma: PrismaService,
    private readonly rooms: GameRoomManager,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error("no token");
      const payload = this.jwtStrategy.verify(token);
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.clearRateBuckets(client.id);
    const room = this.rooms.leaveSocket(client.id);
    if (room) this.broadcast(room.id);
  }

  @SubscribeMessage("td:room:create")
  async create(@MessageBody() data: { characterId?: number; speedMultiplier?: number }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "room")) return;
    const player = await this.makePlayer(client, data?.characterId);
    const rawSpeed = Number(data?.speedMultiplier);
    const speedMultiplier: TdSpeedMultiplier = rawSpeed === 2 ? 2 : rawSpeed === 1.5 ? 1.5 : 1;
    const room = this.rooms.createRoom(player, speedMultiplier);
    client.join(this.rooms.channel(room.id));
    client.emit("td:self", { userId: player.userId, socketId: client.id });
    this.broadcast(room.id, "tower_defense.msg_room_created");
  }

  @SubscribeMessage("td:room:join")
  async join(@MessageBody() data: { code?: string; characterId?: number }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "room")) return;
    const player = await this.makePlayer(client, data?.characterId);
    const { room, errorKey } = this.rooms.joinRoom(String(data?.code ?? ""), player);
    if (!room) {
      this.emitError(client, errorKey);
      return;
    }
    client.join(this.rooms.channel(room.id));
    client.emit("td:self", { userId: player.userId, socketId: client.id });
    this.broadcast(room.id, "tower_defense.msg_player_joined", { player: player.nickname });
  }

  @SubscribeMessage("td:room:reconnect")
  async reconnect(@MessageBody() data: { characterId?: number }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "room")) return;
    const player = await this.makePlayer(client, data?.characterId);
    const room = this.rooms.reconnect(player);
    if (!room) return;
    client.join(this.rooms.channel(room.id));
    client.emit("td:self", { userId: player.userId, socketId: client.id });
    this.broadcast(room.id, "tower_defense.msg_player_reconnected", { player: player.nickname });
  }

  @SubscribeMessage("td:room:ready")
  ready(@MessageBody() data: { ready?: boolean }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "room")) return;
    const userId = client.data.userId as string;
    const room = this.rooms.setReady(userId, !!data?.ready);
    if (room) this.broadcast(room.id);
  }

  @SubscribeMessage("td:room:leave")
  leave(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string;
    const room = this.rooms.leaveUserRoom(userId);
    if (!room) return;
    client.leave(this.rooms.channel(room.id));
    this.broadcast(room.id, "tower_defense.msg_player_left");
    client.emit("td:room:left");
  }

  @SubscribeMessage("td:game:start")
  async start(@ConnectedSocket() client: Socket) {
    if (!this.allow(client, "room")) return;
    const userId = client.data.userId as string;
    const { room, errorKey } = await this.rooms.start(userId, this.server, (endedRoom) => {
      this.broadcast(endedRoom.id, endedRoom.lives > 0 ? "tower_defense.msg_defense_success" : "tower_defense.msg_lives_depleted");
    });
    if (!room) {
      this.emitError(client, errorKey);
      return;
    }
    this.broadcast(room.id, "tower_defense.msg_game_started");
  }

  @SubscribeMessage("td:tower:summon")
  summon(@MessageBody() data: { slotId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.summon(client.data.userId as string, String(data?.slotId ?? ""), data?.actionId);
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:fixed-summon")
  fixedSummon(@MessageBody() data: { slotId?: string; characterId?: number; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.fixedSummon(
      client.data.userId as string,
      String(data?.slotId ?? ""),
      Number(data?.characterId),
      data?.actionId,
    );
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:upgrade")
  upgrade(@MessageBody() data: { towerId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.upgrade(client.data.userId as string, String(data?.towerId ?? ""), data?.actionId);
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:sell")
  sell(@MessageBody() data: { towerId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.sell(client.data.userId as string, String(data?.towerId ?? ""), data?.actionId);
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:move")
  move(@MessageBody() data: { towerId?: string; slotId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.move(
      client.data.userId as string,
      String(data?.towerId ?? ""),
      String(data?.slotId ?? ""),
      data?.actionId,
    );
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:merge")
  merge(@MessageBody() data: { towerId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.merge(client.data.userId as string, String(data?.towerId ?? ""), data?.actionId);
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:lock")
  lock(@MessageBody() data: { towerId?: string; locked?: boolean; actionId?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "command")) return;
    const { room, errorKey } = this.rooms.lock(
      client.data.userId as string,
      String(data?.towerId ?? ""),
      !!data?.locked,
      data?.actionId,
    );
    if (!room) return;
    this.emitError(client, errorKey);
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:chat:send")
  chat(@MessageBody() data: { message?: string }, @ConnectedSocket() client: Socket) {
    if (!this.allow(client, "chat")) return;
    const room = this.rooms.getByUser(client.data.userId as string);
    if (!room) return;
    const player = room.players.get(client.data.userId as string);
    const message = String(data?.message ?? "").trim().slice(0, 120);
    if (!player || !message) return;
    this.server.to(this.rooms.channel(room.id)).emit("td:chat:message", {
      id: `${client.id}-${Date.now()}`,
      userId: player.userId,
      nickname: player.nickname,
      message,
      createdAt: Date.now(),
    });
  }

  private async makePlayer(client: Socket, characterId?: number): Promise<TdPlayer> {
    const userId = client.data.userId as string;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return {
      socketId: client.id,
      userId,
      nickname: user?.name ?? "Player",
      characterId: Number(characterId) || 1,
      ready: false,
      connected: true,
      gold: 0,
      kills: 0,
      lives: 30,
      maxLives: 30,
      typeUpgrades: { fire: 0, water: 0, nature: 0 },
    };
  }

  private broadcast(roomId: string, messageKey?: string, messageParams?: TdMessageParams) {
    const room = this.rooms.getById(roomId);
    if (!room) return;
    this.server.to(this.rooms.channel(roomId)).emit("td:game:snapshot", GameEngine.snapshot(room, messageKey, messageParams));
  }

  private emitError(client: Socket, messageKey?: string | null, messageParams?: TdMessageParams) {
    if (!messageKey) return;
    client.emit("td:error", { messageKey, messageParams });
  }

  private allow(client: Socket, bucketName: keyof typeof TD_RATE_LIMITS) {
    const limit = TD_RATE_LIMITS[bucketName];
    const now = Date.now();
    const key = `${client.id}:${bucketName}`;
    const bucket = this.rateBuckets.get(key);
    if (!bucket || now - bucket.windowStartedAt >= limit.windowMs) {
      this.rateBuckets.set(key, { count: 1, windowStartedAt: now, lastAcceptedAt: now });
      return true;
    }
    if (now - bucket.lastAcceptedAt < limit.minIntervalMs || bucket.count >= limit.maxInWindow) {
      this.emitError(client, "tower_defense.msg_too_fast");
      return false;
    }
    bucket.count += 1;
    bucket.lastAcceptedAt = now;
    return true;
  }

  private clearRateBuckets(socketId: string) {
    for (const key of this.rateBuckets.keys()) {
      if (key.startsWith(`${socketId}:`)) this.rateBuckets.delete(key);
    }
  }
}
