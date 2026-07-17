import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationGatewayModule } from "../gateway/notification-gateway.module";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [NotificationGatewayModule, JwtAuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
