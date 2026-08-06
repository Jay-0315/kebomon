import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ADMIN_ROLES } from "../auth/roles.constants";
import { AdminNotificationsService } from "./admin-notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_ROLES)
@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly adminNotificationsService: AdminNotificationsService) {}

  @Post()
  send(@CurrentUser() requester: { sub: string }, @Body() dto: SendNotificationDto) {
    return this.adminNotificationsService.send(requester.sub, dto);
  }
}
