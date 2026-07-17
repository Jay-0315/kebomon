import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("push/subscribe")
  subscribe(
    @CurrentUser() user: { sub: string },
    @Body() body: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } },
  ) {
    return this.notifications.subscribe(user.sub, body.subscription);
  }

  @UseGuards(JwtAuthGuard)
  @Post("push/unsubscribe")
  unsubscribe(@CurrentUser() user: { sub: string }, @Body() body: { endpoint: string }) {
    return this.notifications.unsubscribe(user.sub, body.endpoint);
  }

  @Get("vapid-public-key")
  vapidPublicKey() {
    return { key: process.env.VAPID_PUBLIC_KEY };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: { sub: string }) {
    return this.notifications.list(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("unread-count")
  unreadCount(@CurrentUser() user: { sub: string }) {
    return this.notifications.unreadCount(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post("read")
  markRead(@CurrentUser() user: { sub: string }, @Body() body: { id: string }) {
    return this.notifications.markRead(user.sub, body.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("read-all")
  markAllRead(@CurrentUser() user: { sub: string }) {
    return this.notifications.markAllRead(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  deleteOne(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    return this.notifications.deleteOne(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  deleteAll(@CurrentUser() user: { sub: string }) {
    return this.notifications.deleteAll(user.sub);
  }
}
