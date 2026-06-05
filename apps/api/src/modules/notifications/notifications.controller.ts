import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Query("userId") userId: string) {
    return this.notifications.list(userId);
  }

  @Get("unread-count")
  unreadCount(@Query("userId") userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Post("read")
  markRead(@Body() body: { userId: string; id: string }) {
    return this.notifications.markRead(body.userId, body.id);
  }

  @Post("read-all")
  markAllRead(@Body() body: { userId: string }) {
    return this.notifications.markAllRead(body.userId);
  }

  @Delete(":id")
  deleteOne(@Param("id") id: string, @Query("userId") userId: string) {
    return this.notifications.deleteOne(userId, id);
  }

  @Delete()
  deleteAll(@Query("userId") userId: string) {
    return this.notifications.deleteAll(userId);
  }
}
