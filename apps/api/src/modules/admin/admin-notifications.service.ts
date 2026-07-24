import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";
import { logAdminAction } from "./admin-action-log.util";

@Injectable()
export class AdminNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async send(requesterId: string, dto: SendNotificationDto) {
    let userIds: string[];

    if (dto.target === "user") {
      const users = await this.prisma.user.findMany({
        where: { id: { in: dto.userIds } },
        select: { id: true },
      });
      if (users.length === 0) throw new BadRequestException("선택된 사용자를 찾을 수 없습니다.");
      userIds = users.map((u) => u.id);
    } else {
      userIds = (await this.prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
    }

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        this.notifications.create({
          userId,
          type: "notice",
          title: dto.title,
          body: dto.body,
          link: dto.link ?? null,
        }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    void logAdminAction(
      this.prisma,
      requesterId,
      "NOTIFICATION_BROADCAST",
      null,
      null,
      `${dto.title} (${sent}/${results.length}명)`,
    );
    return { sent, failed: results.length - sent, total: results.length };
  }
}
