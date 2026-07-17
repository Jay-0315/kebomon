import { Module } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";
import { JwtAuthModule } from "../auth/jwt-auth.module";

/**
 * AuthModule을 통째로 import하면 AuthModule → RewardsModule → NotificationsModule →
 * NotificationGatewayModule → AuthModule 순환 의존이 생긴다 (NotificationsModule이 이미
 * 이 모듈을 import함). 의존성 없는 JwtAuthModule만 가져와 순환을 원천 차단.
 */
@Module({
  imports: [JwtAuthModule],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class NotificationGatewayModule {}
