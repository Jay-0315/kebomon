import { Module } from "@nestjs/common";
import { RewardsController } from "./rewards.controller";
import { RewardsService } from "./rewards.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [NotificationsModule, JwtAuthModule],
  controllers: [RewardsController],
  providers: [RewardsService],
  exports: [RewardsService],
})
export class RewardsModule {}
