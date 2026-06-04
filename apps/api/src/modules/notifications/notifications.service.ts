import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationGateway } from "../gateway/notification.gateway";

export type NotificationType = "comment" | "achievement";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  /** 알림 생성 + 실시간 푸시 */
  async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string | null;
  }) {
    const notif = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title.slice(0, 120),
        body: input.body.slice(0, 255),
        link: input.link ?? null,
      },
    });
    const payload = this.serialize(notif);
    this.gateway.emitToUser(input.userId, "notification", payload);
    return payload;
  }

  async list(userId: string, limit = 30) {
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return items.map((n) => this.serialize(n));
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id: BigInt(id), userId },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  private serialize(n: {
    id: bigint; userId: string; type: string; title: string;
    body: string; link: string | null; isRead: boolean; createdAt: Date;
  }) {
    return {
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
