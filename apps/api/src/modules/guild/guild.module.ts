import { Module } from "@nestjs/common";
import { GuildController } from "./guild.controller";
import { GuildService } from "./guild.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { CommunityModule } from "../community/community.module";
import { ArenaModule } from "../arena/arena.module";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [NotificationsModule, CommunityModule, ArenaModule, JwtAuthModule],
  controllers: [GuildController],
  providers: [GuildService],
  exports: [GuildService],
})
export class GuildModule {}
