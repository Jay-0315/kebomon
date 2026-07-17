import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtStrategy } from "../auth/jwt.strategy";

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtStrategy: JwtStrategy) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error("no token");
      const payload = this.jwtStrategy.verify(token);
      client.data.userId = payload.sub;
      // 인증 성공 시 본인 알림 room에 자동 join (클라이언트가 별도로 joinUser를 보낼 필요 없음)
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage("joinRoom")
  handleJoinRoom(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`group:${data.groupId}`);
  }

  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(
    @MessageBody() data: { groupId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`group:${data.groupId}`);
  }

  emitToGroup(groupId: string, event: string, data: unknown) {
    this.server.to(`group:${groupId}`).emit(event, data);
  }

  /** 이전 프론트 호환용 — 이제 handleConnection에서 자동 join되므로 본인 확인만 하고 무시 */
  @SubscribeMessage("joinUser")
  handleJoinUser(@ConnectedSocket() client: Socket) {
    if (client.data.userId) client.join(`user:${client.data.userId}`);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
