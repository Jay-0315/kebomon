import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminCommunityController } from "./admin-community.controller";
import { AdminCommunityService } from "./admin-community.service";
import { AdminGachaController } from "./admin-gacha.controller";
import { AdminGachaService } from "./admin-gacha.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController, AdminCommunityController, AdminGachaController],
  providers: [AdminUsersService, AdminCommunityService, AdminGachaService],
})
export class AdminModule {}
