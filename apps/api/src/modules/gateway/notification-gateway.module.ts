import { Module } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";

/** 의존성 없는 독립 게이트웨이 모듈 (순환 의존 방지용) */
@Module({
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class NotificationGatewayModule {}
