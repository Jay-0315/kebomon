import { Module } from "@nestjs/common";
import { TowerDefenseController } from "./tower-defense.controller";
import { TowerDefenseService } from "./tower-defense.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthModule } from "../auth/jwt-auth.module";

@Module({
  imports: [NotificationsModule, JwtAuthModule],
  controllers: [TowerDefenseController],
  providers: [TowerDefenseService],
})
export class TowerDefenseModule {}
