import { Module } from "@nestjs/common";
import { RewardsModule } from "../rewards/rewards.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CommunityController } from "./community.controller";
import { CommunityService } from "./community.service";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [RewardsModule, NotificationsModule, JwtAuthModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
