import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationGateway } from "../gateway/notification.gateway";
import * as webpush from "web-push";

export type NotificationType = "comment" | "achievement";

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  onModuleInit() {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
  }

  /** 푸시 구독 저장 (기존 endpoint 중복 방지) */
  async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      userId,
      sub.endpoint,
      sub.keys.p256dh,
      sub.keys.auth,
    );
    return { ok: true };
  }

  /** 푸시 구독 해제 */
  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`,
      userId,
      endpoint,
    );
    return { ok: true };
  }

  /** 알림 생성 + 실시간 소켓 + Web Push */
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
    // Web Push (실패해도 메인 플로우 중단 안 함)
    void this.sendPush(input.userId, input.title, input.body, input.link ?? undefined);
    return payload;
  }

  private async sendPush(userId: string, title: string, body: string, url?: string) {
    const subs = await this.prisma.$queryRawUnsafe<{ endpoint: string; p256dh: string; auth: string }[]>(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`,
      userId,
    );
    const payload = JSON.stringify({ title, body, url: url ?? "/" });
    await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        ).catch((err: { statusCode?: number }) => {
          // 만료된 구독 자동 삭제
          if (err.statusCode === 410 || err.statusCode === 404) {
            return this.prisma.$executeRawUnsafe(
              `DELETE FROM push_subscriptions WHERE endpoint = ?`,
              s.endpoint,
            );
          }
        }),
      ),
    );
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

  async deleteOne(userId: string, id: string) {
    await this.prisma.notification.deleteMany({
      where: { id: BigInt(id), userId },
    });
    return { ok: true };
  }

  async deleteAll(userId: string) {
    await this.prisma.notification.deleteMany({
      where: { userId },
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
