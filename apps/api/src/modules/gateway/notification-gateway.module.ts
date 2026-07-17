import { Module } from "@nestjs/common";
import { NotificationGateway } from "./notification.gateway";
import { AuthModule } from "../auth/auth.module";

/** 순환 의존 방지를 위해 AuthModule만 의존 */
@Module({
  imports: [AuthModule],
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class NotificationGatewayModule {}
