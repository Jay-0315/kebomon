import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { isSuspensionExpired, reactivateIfExpired } from "../auth/suspension.util";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationGateway } from "../gateway/notification.gateway";
import { AdjustUserRewardDto } from "./dto/adjust-user-reward.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

const PAGE_SIZE = 20;

const rewardSelect = {
  missionPoints: true,
  normalEggs: true,
  bigEggs: true,
  goldenEggs: true,
  enhancementStones: true,
} as const;

const REWARD_FIELD_LABELS: Record<keyof typeof rewardSelect, string> = {
  missionPoints: "KP",
  normalEggs: "일반 알",
  bigEggs: "왕알",
  goldenEggs: "황금 알",
  enhancementStones: "강화석",
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async findAll(q?: string, role?: string, status?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          suspendedReason: true,
          suspendedUntil: true,
          createdAt: true,
          lastLoginAt: true,
          reward: { select: rewardSelect },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);

    // 목록 조회 시점에 기간 정지가 만료된 계정은 화면에도 실제 상태(ACTIVE)로 보이도록 정리
    await Promise.all(
      users
        .filter((u) => isSuspensionExpired(u))
        .map(async (u) => {
          await reactivateIfExpired(this.prisma, u);
          u.status = "ACTIVE";
          u.suspendedReason = null;
          u.suspendedUntil = null;
        }),
    );

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        suspendedReason: true,
        suspendedUntil: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    if (await reactivateIfExpired(this.prisma, user)) {
      user.status = "ACTIVE";
      user.suspendedReason = null;
      user.suspendedUntil = null;
    }
    return user;
  }

  async updateRole(requesterId: string, targetId: string, dto: UpdateUserRoleDto) {
    if (requesterId === targetId) {
      throw new ForbiddenException("본인 계정의 권한은 변경할 수 없습니다.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    return updated;
  }

  async updateStatus(requesterId: string, targetId: string, dto: UpdateUserStatusDto) {
    if (requesterId === targetId) {
      throw new ForbiddenException("본인 계정은 정지할 수 없습니다.");
    }
    if (dto.status === "SUSPENDED" && !dto.reason) {
      throw new BadRequestException("정지 사유를 입력해주세요.");
    }

    let suspendedUntil: Date | null = null;
    if (dto.status === "SUSPENDED" && dto.suspendedUntil) {
      suspendedUntil = new Date(dto.suspendedUntil);
      if (suspendedUntil.getTime() <= Date.now()) {
        throw new BadRequestException("정지 종료 시각은 현재보다 미래여야 합니다.");
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { settings: { select: { language: true } } },
    });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: {
        status: dto.status,
        suspendedReason: dto.status === "SUSPENDED" ? dto.reason : null,
        suspendedUntil: dto.status === "SUSPENDED" ? suspendedUntil : null,
      },
      select: { id: true, name: true, email: true, role: true, status: true, suspendedReason: true, suspendedUntil: true },
    });

    // 정지된 계정은 로그인이 막혀 인앱 알림을 볼 수 없으므로, 사유는 이메일로만 전달 가능
    if (dto.status === "SUSPENDED" && dto.reason) {
      const lang = (user.settings?.language as "ko" | "ja" | "en" | undefined) ?? "ko";
      void this.emailService.sendSuspensionNotice(user.email, dto.reason, lang, suspendedUntil).catch(() => undefined);
    }

    // 이미 로그인된 세션도 즉시 튕겨내도록 강제 로그아웃 이벤트 전송 후 소켓 연결 강제 종료
    if (dto.status === "SUSPENDED") {
      this.notificationGateway.emitToUser(targetId, "force-logout", { reason: dto.reason ?? null, suspendedUntil });
      this.notificationGateway.server.in(`user:${targetId}`).disconnectSockets(true);
    }

    return updated;
  }

  async adjustReward(requesterId: string, targetId: string, dto: AdjustUserRewardDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    const current = await this.prisma.userReward.findUnique({ where: { userId: targetId } });
    const clamp = (base: number, delta?: number) => Math.max(0, base + (delta ?? 0));

    const next = {
      missionPoints: clamp(current?.missionPoints ?? 0, dto.missionPointsDelta),
      normalEggs: clamp(current?.normalEggs ?? 0, dto.normalEggsDelta),
      bigEggs: clamp(current?.bigEggs ?? 0, dto.bigEggsDelta),
      goldenEggs: clamp(current?.goldenEggs ?? 0, dto.goldenEggsDelta),
      enhancementStones: clamp(current?.enhancementStones ?? 0, dto.enhancementStonesDelta),
    };

    const updated = await this.prisma.userReward.upsert({
      where: { userId: targetId },
      create: { userId: targetId, ...next },
      update: next,
      select: rewardSelect,
    });

    console.log(
      `[admin] ${requesterId} adjusted reward for ${targetId}${dto.reason ? ` (${dto.reason})` : ""}:`,
      dto,
    );

    const changes = (Object.keys(REWARD_FIELD_LABELS) as (keyof typeof rewardSelect)[])
      .map((key) => {
        const delta = next[key] - (current?.[key] ?? 0);
        return delta !== 0 ? `${REWARD_FIELD_LABELS[key]} ${delta > 0 ? "+" : ""}${delta}` : null;
      })
      .filter((s): s is string => s !== null);

    if (changes.length > 0) {
      void this.notifications
        .create({
          userId: targetId,
          type: "notice",
          title: "재화 지급/차감 안내",
          body: changes.join(", ") + (dto.reason ? ` (사유: ${dto.reason})` : ""),
        })
        .catch(() => undefined);
    }

    return updated;
  }
}
