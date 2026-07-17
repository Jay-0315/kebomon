import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CommunityModule } from "./community/community.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RewardsModule } from "./rewards/rewards.module";
import { UsersModule } from "./users/users.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { GatewayModule } from "./gateway/gateway.module";
import { ArenaModule } from "./arena/arena.module";
import { GuildModule } from "./guild/guild.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    CommunityModule,
    RewardsModule,
    UsersModule,
    NotificationsModule,
    GatewayModule,
    ArenaModule,
    GuildModule,
    AdminModule,
  ],
})
export class AppModule {}
