import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SendNotificationDto } from "./dto/send-notification.dto";

@Injectable()
export class AdminNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async send(dto: SendNotificationDto) {
    let userIds: string[];

    if (dto.target === "user") {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (!user) throw new BadRequestException("해당 이메일의 사용자를 찾을 수 없습니다.");
      userIds = [user.id];
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
    return { sent, failed: results.length - sent, total: results.length };
  }
}
