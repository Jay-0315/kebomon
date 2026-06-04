import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { CommunityModule } from "./community/community.module";
import { ExchangeRatesModule } from "./exchange-rates/exchange-rates.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { GroupsModule } from "./groups/groups.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RewardsModule } from "./rewards/rewards.module";
import { UsersModule } from "./users/users.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { GatewayModule } from "./gateway/gateway.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    ExpensesModule,
    GroupsModule,
    CommunityModule,
    RewardsModule,
    ExchangeRatesModule,
    UsersModule,
    NotificationsModule,
    GatewayModule,
  ],
})
export class AppModule {}
