import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationGateway } from "../gateway/notification.gateway";
import * as webpush from "web-push";

export type NotificationType = "comment" | "achievement" | "title" | "notice" | "quest";

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  onModuleInit() {
    const { VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
    if (VAPID_EMAIL && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    }
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
    titleKey?: string;
    bodyKey?: string;
    titleJa?: string;
    bodyJa?: string;
    titleEn?: string;
    bodyEn?: string;
    link?: string | null;
  }) {
    const settings = await this.prisma.appSetting.findUnique({
      where: { userId: input.userId },
      select: { language: true, notifications: true },
    });
    const lang = settings?.language ?? "ko";
    const title =
      lang === "ja" && input.titleJa ? input.titleJa
      : lang === "en" && input.titleEn ? input.titleEn
      : input.title;
    const body =
      lang === "ja" && input.bodyJa ? input.bodyJa
      : lang === "en" && input.bodyEn ? input.bodyEn
      : input.body;

    const notif = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: title.slice(0, 120),
        body: body.slice(0, 255),
        // titleKey/bodyKey 저장 (마이그레이션 후 적용됨 — migration.sql 참조)
        ...(input.titleKey ? { titleKey: input.titleKey } : {}),
        ...(input.bodyKey ? { bodyKey: input.bodyKey } : {}),
        link: input.link ?? null,
      },
    });
    const payload = this.serialize(notif);
    this.gateway.emitToUser(input.userId, "notification", payload);
    // Web Push (알람 설정 꺼져있으면 발송 안 함, 실패해도 메인 플로우 중단 안 함)
    if (settings?.notifications !== false) {
      void this.sendPush(input.userId, input.title, input.body, input.link ?? undefined).catch(() => undefined);
    }
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
    body: string; titleKey?: string | null; bodyKey?: string | null;
    link: string | null; isRead: boolean; createdAt: Date;
  }) {
    return {
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      titleKey: n.titleKey ?? null,
      bodyKey: n.bodyKey ?? null,
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
