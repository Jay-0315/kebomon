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
import type { TdPlayer, TdTargetMode } from "./types/tower-defense.types";

@WebSocketGateway({ namespace: "/tower-defense", cors: { origin: true, credentials: true }, path: "/socket.io" })
export class TowerDefenseGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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
    const room = this.rooms.leaveSocket(client.id);
    if (room) this.broadcast(room.id);
  }

  @SubscribeMessage("td:room:create")
  async create(@MessageBody() data: { characterId?: number }, @ConnectedSocket() client: Socket) {
    const player = await this.makePlayer(client, data?.characterId);
    const room = this.rooms.createRoom(player);
    client.join(this.rooms.channel(room.id));
    client.emit("td:self", { userId: player.userId, socketId: client.id });
    this.broadcast(room.id, "방이 생성되었습니다.");
  }

  @SubscribeMessage("td:room:join")
  async join(@MessageBody() data: { code?: string; characterId?: number }, @ConnectedSocket() client: Socket) {
    const player = await this.makePlayer(client, data?.characterId);
    const { room, error } = this.rooms.joinRoom(String(data?.code ?? ""), player);
    if (!room) {
      client.emit("td:error", { message: error });
      return;
    }
    client.join(this.rooms.channel(room.id));
    client.emit("td:self", { userId: player.userId, socketId: client.id });
    this.broadcast(room.id, `${player.nickname}님이 참가했습니다.`);
  }

  @SubscribeMessage("td:room:reconnect")
  async reconnect(@MessageBody() data: { characterId?: number }, @ConnectedSocket() client: Socket) {
    const player = await this.makePlayer(client, data?.characterId);
    const room = this.rooms.reconnect(player);
    if (!room) return;
    client.join(this.rooms.channel(room.id));
    client.emit("td:self", { userId: player.userId, socketId: client.id });
    this.broadcast(room.id, `${player.nickname}님이 재접속했습니다.`);
  }

  @SubscribeMessage("td:room:ready")
  ready(@MessageBody() data: { ready?: boolean }, @ConnectedSocket() client: Socket) {
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
    this.broadcast(room.id, "참가자가 방을 나갔습니다.");
    client.emit("td:room:left");
  }

  @SubscribeMessage("td:game:start")
  async start(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId as string;
    const { room, error } = await this.rooms.start(userId, this.server, (endedRoom) => {
      this.broadcast(endedRoom.id, endedRoom.lives > 0 ? "방어에 성공했습니다." : "공용 생명력이 모두 소진되었습니다.");
    });
    if (!room) {
      client.emit("td:error", { message: error });
      return;
    }
    this.broadcast(room.id, "게임을 시작합니다.");
  }

  @SubscribeMessage("td:tower:summon")
  summon(@MessageBody() data: { slotId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    const { room, error } = this.rooms.summon(client.data.userId as string, String(data?.slotId ?? ""), data?.actionId);
    if (!room) return;
    if (error) client.emit("td:error", { message: error });
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:sell")
  sell(@MessageBody() data: { towerId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    const { room, error } = this.rooms.sell(client.data.userId as string, String(data?.towerId ?? ""), data?.actionId);
    if (!room) return;
    if (error) client.emit("td:error", { message: error });
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:move")
  move(@MessageBody() data: { towerId?: string; slotId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    const { room, error } = this.rooms.move(
      client.data.userId as string,
      String(data?.towerId ?? ""),
      String(data?.slotId ?? ""),
      data?.actionId,
    );
    if (!room) return;
    if (error) client.emit("td:error", { message: error });
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:merge")
  merge(@MessageBody() data: { towerId?: string; actionId?: string }, @ConnectedSocket() client: Socket) {
    const { room, error } = this.rooms.merge(client.data.userId as string, String(data?.towerId ?? ""), data?.actionId);
    if (!room) return;
    if (error) client.emit("td:error", { message: error });
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:target-mode")
  targetMode(
    @MessageBody() data: { towerId?: string; targetMode?: TdTargetMode; actionId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const mode = ["front", "back", "strong", "weak", "boss"].includes(String(data?.targetMode))
      ? (data?.targetMode as TdTargetMode)
      : "front";
    const { room, error } = this.rooms.targetMode(client.data.userId as string, String(data?.towerId ?? ""), mode, data?.actionId);
    if (!room) return;
    if (error) client.emit("td:error", { message: error });
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:tower:lock")
  lock(@MessageBody() data: { towerId?: string; locked?: boolean; actionId?: string }, @ConnectedSocket() client: Socket) {
    const { room, error } = this.rooms.lock(
      client.data.userId as string,
      String(data?.towerId ?? ""),
      !!data?.locked,
      data?.actionId,
    );
    if (!room) return;
    if (error) client.emit("td:error", { message: error });
    this.broadcast(room.id);
  }

  @SubscribeMessage("td:chat:send")
  chat(@MessageBody() data: { message?: string }, @ConnectedSocket() client: Socket) {
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
    };
  }

  private broadcast(roomId: string, message?: string) {
    const room = this.rooms.getById(roomId);
    if (!room) return;
    this.server.to(this.rooms.channel(roomId)).emit("td:game:snapshot", GameEngine.snapshot(room, message));
  }
}
