import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
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
import { FishingModule } from "./fishing/fishing.module";
import { AuctionModule } from "./auction/auction.module";
import { TowerDefenseModule } from "./tower-defense/tower-defense.module";
import { ReportsModule } from "./reports/reports.module";
import { BannersModule } from "./banners/banners.module";
import { InquiriesModule } from "./inquiries/inquiries.module";
import { MaintenanceModule } from "./maintenance/maintenance.module";
import { MaintenanceMiddleware } from "./maintenance/maintenance.middleware";

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
    FishingModule,
    AuctionModule,
    TowerDefenseModule,
    ReportsModule,
    BannersModule,
    InquiriesModule,
    MaintenanceModule,
    AdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MaintenanceMiddleware)
      .exclude(
        { path: "admin/(.*)", method: RequestMethod.ALL },
        { path: "auth/(.*)", method: RequestMethod.ALL },
        { path: "health", method: RequestMethod.ALL },
        { path: "maintenance/(.*)", method: RequestMethod.ALL },
      )
      .forRoutes("*");
  }
}
