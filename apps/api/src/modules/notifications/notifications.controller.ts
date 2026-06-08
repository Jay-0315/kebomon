import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post("push/subscribe")
  subscribe(@Body() body: { userId: string; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }) {
    return this.notifications.subscribe(body.userId, body.subscription);
  }

  @Post("push/unsubscribe")
  unsubscribe(@Body() body: { userId: string; endpoint: string }) {
    return this.notifications.unsubscribe(body.userId, body.endpoint);
  }

  @Get("vapid-public-key")
  vapidPublicKey() {
    return { key: process.env.VAPID_PUBLIC_KEY };
  }

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
