import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ArenaController } from "./arena.controller";
import { ArenaService } from "./arena.service";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [PrismaModule, NotificationsModule, JwtAuthModule],
  controllers: [ArenaController],
  providers: [ArenaService],
  exports: [ArenaService],
})
export class ArenaModule {}
