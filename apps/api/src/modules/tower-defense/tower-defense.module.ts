import { Module } from "@nestjs/common";
import { TowerDefenseController } from "./tower-defense.controller";
import { TowerDefenseGateway } from "./tower-defense.gateway";
import { TowerDefenseService } from "./tower-defense.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { JwtAuthModule } from "../auth/jwt-auth.module";
import { GameRoomManager } from "./room/game-room.manager";

@Module({
  imports: [NotificationsModule, JwtAuthModule],
  controllers: [TowerDefenseController],
  providers: [TowerDefenseService, TowerDefenseGateway, GameRoomManager],
})
export class TowerDefenseModule {}
