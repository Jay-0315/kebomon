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
import { JwtStrategy } from "../auth/jwt.strategy";

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtStrategy: JwtStrategy) {}

  // 유저는 이 게이트웨이에 로그인 세션 내내(알림 수신용) 연결돼 있으므로, 연결 여부가
  // 곧 "사이트 접속 중" 신호로 쓰기 적합함 — 관리자페이지 회원목록의 접속상태 표시가 이걸 사용.
  // 탭을 여러 개 열 수 있어 userId당 연결 수를 세고, 0이 되면 오프라인으로 간주.
  private readonly onlineCounts = new Map<string, number>();

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error("no token");
      const payload = this.jwtStrategy.verify(token);
      client.data.userId = payload.sub;
      // 인증 성공 시 본인 알림 room에 자동 join (클라이언트가 별도로 joinUser를 보낼 필요 없음)
      client.join(`user:${payload.sub}`);
      this.onlineCounts.set(payload.sub, (this.onlineCounts.get(payload.sub) ?? 0) + 1);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) return;
    const count = this.onlineCounts.get(userId) ?? 0;
    if (count <= 1) this.onlineCounts.delete(userId);
    else this.onlineCounts.set(userId, count - 1);
  }

  isOnline(userId: string): boolean {
    return this.onlineCounts.has(userId);
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
