import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminBattlesController } from "./admin-battles.controller";
import { AdminBattlesService } from "./admin-battles.service";
import { AdminCharactersController } from "./admin-characters.controller";
import { AdminCharactersService } from "./admin-characters.service";
import { AdminCommunityController } from "./admin-community.controller";
import { AdminCommunityService } from "./admin-community.service";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminGachaController } from "./admin-gacha.controller";
import { AdminGachaService } from "./admin-gacha.service";
import { AdminGuildsController } from "./admin-guilds.controller";
import { AdminGuildsService } from "./admin-guilds.service";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { AdminNotificationsService } from "./admin-notifications.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [
    AdminUsersController,
    AdminCommunityController,
    AdminGachaController,
    AdminBattlesController,
    AdminNotificationsController,
    AdminGuildsController,
    AdminDashboardController,
    AdminCharactersController,
  ],
  providers: [
    AdminUsersService,
    AdminCommunityService,
    AdminGachaService,
    AdminBattlesService,
    AdminNotificationsService,
    AdminGuildsService,
    AdminDashboardService,
    AdminCharactersService,
  ],
})
export class AdminModule {}
