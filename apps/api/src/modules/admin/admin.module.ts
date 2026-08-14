import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationGatewayModule } from "../gateway/notification-gateway.module";
import { GatewayModule } from "../gateway/gateway.module";
import { RewardsModule } from "../rewards/rewards.module";
import { AdminActionLogController } from "./admin-action-log.controller";
import { AdminActionLogService } from "./admin-action-log.service";
import { AdminAuctionController } from "./admin-auction.controller";
import { AdminAuctionService } from "./admin-auction.service";
import { AdminSeasonController } from "./admin-season.controller";
import { AdminSeasonService } from "./admin-season.service";
import { AdminTowerDefenseController } from "./admin-tower-defense.controller";
import { AdminTowerDefenseService } from "./admin-tower-defense.service";
import { AdminBannersController } from "./admin-banners.controller";
import { AdminBannersService } from "./admin-banners.service";
import { AdminBattlesController } from "./admin-battles.controller";
import { AdminBattlesService } from "./admin-battles.service";
import { AdminCharactersController } from "./admin-characters.controller";
import { AdminCharactersService } from "./admin-characters.service";
import { AdminCommunityController } from "./admin-community.controller";
import { AdminCommunityService } from "./admin-community.service";
import { AdminDashboardController } from "./admin-dashboard.controller";
import { AdminDashboardService } from "./admin-dashboard.service";
import { AdminExpeditionController } from "./admin-expedition.controller";
import { AdminExpeditionService } from "./admin-expedition.service";
import { AdminFishingController } from "./admin-fishing.controller";
import { AdminFishingService } from "./admin-fishing.service";
import { AdminRogueController } from "./admin-rogue.controller";
import { AdminRogueService } from "./admin-rogue.service";
import { AdminGachaController } from "./admin-gacha.controller";
import { AdminGachaService } from "./admin-gacha.service";
import { AdminGuildsController } from "./admin-guilds.controller";
import { AdminGuildsService } from "./admin-guilds.service";
import { AdminInquiriesController } from "./admin-inquiries.controller";
import { AdminInquiriesService } from "./admin-inquiries.service";
import { AdminMaintenanceController } from "./admin-maintenance.controller";
import { AdminMaintenanceService } from "./admin-maintenance.service";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { AdminNotificationsService } from "./admin-notifications.service";
import { AdminOperationsController } from "./admin-operations.controller";
import { AdminOperationsService } from "./admin-operations.service";
import { AdminReportsController } from "./admin-reports.controller";
import { AdminReportsService } from "./admin-reports.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";

@Module({
  imports: [AuthModule, NotificationsModule, NotificationGatewayModule, GatewayModule, RewardsModule],
  controllers: [
    AdminUsersController,
    AdminCommunityController,
    AdminGachaController,
    AdminBattlesController,
    AdminNotificationsController,
    AdminGuildsController,
    AdminDashboardController,
    AdminCharactersController,
    AdminReportsController,
    AdminMaintenanceController,
    AdminBannersController,
    AdminInquiriesController,
    AdminActionLogController,
    AdminOperationsController,
    AdminSeasonController,
    AdminAuctionController,
    AdminTowerDefenseController,
    AdminFishingController,
    AdminRogueController,
    AdminExpeditionController,
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
    AdminReportsService,
    AdminMaintenanceService,
    AdminBannersService,
    AdminInquiriesService,
    AdminActionLogService,
    AdminOperationsService,
    AdminSeasonService,
    AdminAuctionService,
    AdminTowerDefenseService,
    AdminFishingService,
    AdminRogueService,
    AdminExpeditionService,
  ],
})
export class AdminModule {}
