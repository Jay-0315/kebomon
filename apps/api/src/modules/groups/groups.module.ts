import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationGatewayModule } from "../gateway/notification-gateway.module";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({
  imports: [AuthModule, NotificationGatewayModule],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
