import { Module } from "@nestjs/common";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt.guard";
import { RolesGuard } from "./roles.guard";

/**
 * JwtAuthGuard/RolesGuard만 필요한 모듈들을 위한 최소 모듈.
 * 의존성이 전혀 없어(JwtStrategy는 순수 함수, RolesGuard는 Nest core의 Reflector만 사용)
 * 어떤 모듈에서 import해도 순환 의존이 생기지 않는다.
 * AuthModule 전체를 import하면 AuthModule → RewardsModule → NotificationsModule →
 * NotificationGatewayModule → AuthModule 같은 순환이 생길 수 있으므로,
 * 토큰 검증만 필요한 곳(rewards/community/arena/guild/notifications/users 등)은
 * 반드시 이 모듈을 사용할 것.
 */
@Module({
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard],
})
export class JwtAuthModule {}
