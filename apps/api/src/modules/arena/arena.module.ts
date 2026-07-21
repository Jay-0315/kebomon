import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RewardsModule } from "../rewards/rewards.module";
import { ArenaController } from "./arena.controller";
import { ArenaService } from "./arena.service";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [PrismaModule, NotificationsModule, RewardsModule, JwtAuthModule],
  controllers: [ArenaController],
  providers: [ArenaService],
  exports: [ArenaService],
})
export class ArenaModule {}
