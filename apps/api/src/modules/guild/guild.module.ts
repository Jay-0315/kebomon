import { Module } from "@nestjs/common";
import { GuildController } from "./guild.controller";
import { GuildService } from "./guild.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { RewardsModule } from "../rewards/rewards.module";
import { CommunityModule } from "../community/community.module";

@Module({
  imports: [NotificationsModule, RewardsModule, CommunityModule],
  controllers: [GuildController],
  providers: [GuildService],
  exports: [GuildService],
})
export class GuildModule {}
