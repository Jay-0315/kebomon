import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminNotificationsService } from "./admin-notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/notifications")
export class AdminNotificationsController {
  constructor(private readonly adminNotificationsService: AdminNotificationsService) {}

  @Post()
  send(@Body() dto: SendNotificationDto) {
    return this.adminNotificationsService.send(dto);
  }
}
