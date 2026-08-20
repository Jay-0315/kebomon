import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { isSuspensionExpired, reactivateIfExpired } from "../auth/suspension.util";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationGateway } from "../gateway/notification.gateway";
import { ChatGateway } from "../gateway/chat.gateway";
import { AdjustUserRewardDto } from "./dto/adjust-user-reward.dto";
import { BulkAdjustRewardDto } from "./dto/bulk-adjust-reward.dto";
import { BulkAdjustRewardSelectedDto } from "./dto/bulk-adjust-reward-selected.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { logPointsChange } from "../rewards/points-ledger.util";
import { logSuspensionChange } from "./suspension-history.util";
import { logAdminAction } from "./admin-action-log.util";
import { CHARACTER_NAMES } from "./character-names.constant";
import { toCsv } from "./csv.util";

const PAGE_SIZE = 20;

const rewardSelect = {
  missionPoints: true,
  normalEggs: true,
  bigEggs: true,
  goldenEggs: true,
  enhancementStones: true,
  breedingEssence: true,
} as const;

const REWARD_FIELD_LABELS: Record<keyof typeof rewardSelect, string> = {
  missionPoints: "KP",
  normalEggs: "일반 알",
  bigEggs: "왕알",
  goldenEggs: "황금 알",
  enhancementStones: "강화석",
  breedingEssence: "교배 재화",
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly emailService: EmailService,
    private readonly notificationGateway: NotificationGateway,
    private readonly chatGateway: ChatGateway,
  ) {}

  private buildWhere(q?: string, role?: string, status?: string) {
    return {
      ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
    };
  }

  async findAll(q?: string, role?: string, status?: string, page = 1, sortBy?: string, sortDir?: string) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = this.buildWhere(q, role, status);
    const dir = sortDir === "asc" ? "asc" : "desc";
    const selectFields = {
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
    } as const;

    let users: Awaited<ReturnType<typeof this.prisma.user.findMany<{ where: typeof where; select: typeof selectFields }>>>;
    let total: number;

    if (sortBy === "online") {
      // online은 DB 컬럼이 아니라 소켓 연결 상태라 DB 단에서 정렬할 수 없음 —
      // 전체 매칭 유저를 가져와 접속 상태 기준으로 정렬한 뒤 애플리케이션 단에서 페이지네이션
      const onlineIds = this.notificationGateway.getOnlineUserIds();
      const all = await this.prisma.user.findMany({
        where,
        select: selectFields,
        orderBy: { lastLoginAt: "desc" },
      });
      total = all.length;
      const sorted = all
        .map((u) => ({ ...u, online: onlineIds.has(u.id) }))
        .sort((a, b) => {
          const onlineDiff = dir === "asc" ? Number(a.online) - Number(b.online) : Number(b.online) - Number(a.online);
          return onlineDiff;
        });
      users = sorted.slice(skip, skip + PAGE_SIZE);
    } else {
      const orderByMap: Record<string, object> = {
        name: { name: dir },
        email: { email: dir },
        role: { role: dir },
        status: { status: dir },
        reward: { reward: { missionPoints: dir } },
        createdAt: { createdAt: dir },
        lastLoginAt: { lastLoginAt: dir },
      };
      const orderBy = orderByMap[sortBy ?? ""] ?? { createdAt: "desc" };

      [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: selectFields,
          orderBy,
          skip,
          take: PAGE_SIZE,
        }),
        this.prisma.user.count({ where }),
      ]);
    }

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
      users: users.map((u) => ({ ...u, online: this.notificationGateway.isOnline(u.id) })),
      total,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }

  async exportCsv(q?: string, role?: string, status?: string): Promise<string> {
    const where = this.buildWhere(q, role, status);
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        reward: { select: { missionPoints: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return toCsv(
      ["id", "name", "email", "role", "status", "missionPoints", "createdAt", "lastLoginAt"],
      users.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.reward?.missionPoints ?? 0,
        u.createdAt.toISOString(),
        u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      ]),
    );
  }

  async findById(id: string) {
    const [user, reportsAgainst] = await Promise.all([
      this.prisma.user.findUnique({
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
          reward: { select: rewardSelect },
          titles: { select: { titleId: true, obtainedAt: true }, orderBy: { obtainedAt: "desc" } },
          battleStats: { select: { tierPoints: true, wins: true, losses: true, winStreak: true, bestStreak: true } },
          duelStats: { select: { wins: true, losses: true, winStreak: true, bestStreak: true } },
          guildMembership: { select: { role: true, guild: { select: { id: true, name: true } } } },
          posts: {
            take: 5,
            orderBy: { createdAt: "desc" },
            select: { id: true, content: true, category: true, createdAt: true },
          },
          _count: { select: { posts: true, comments: true, characters: true } },
        },
      }),
      this.prisma.report.count({ where: { targetType: "USER", targetId: id } }),
    ]);
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    if (await reactivateIfExpired(this.prisma, user)) {
      user.status = "ACTIVE";
      user.suspendedReason = null;
      user.suspendedUntil = null;
    }

    return { ...user, reportsAgainstCount: reportsAgainst, online: this.notificationGateway.isOnline(user.id) };
  }

  /** 활동 로그 — KP 변동 내역 + 케릭터 획득 내역 (최근 50건씩) */
  async getActivityLog(userId: string) {
    const [points, characters] = await Promise.all([
      this.prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      this.prisma.userCharacter.findMany({
        where: { userId },
        orderBy: { obtainedAt: "desc" },
        take: 50,
        select: { characterId: true, obtainedAt: true },
      }),
    ]);

    return {
      points: points.map((p) => ({
        id: p.id.toString(),
        delta: p.delta,
        reason: p.reason,
        createdAt: p.createdAt,
      })),
      characters: characters.map((c) => ({
        characterId: c.characterId,
        name: CHARACTER_NAMES[c.characterId]?.korName ?? `케릭터 #${c.characterId} (삭제된 캐릭터)`,
        obtainedAt: c.obtainedAt,
      })),
    };
  }

  /** 정지 이력 — 수동 정지/해제 + 자동 만료 전부 (최근 50건) */
  async getSuspensionHistory(userId: string) {
    const rows = await this.prisma.suspensionHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id.toString(),
      action: r.action,
      reason: r.reason,
      suspendedUntil: r.suspendedUntil,
      actedBy: r.actedBy,
      createdAt: r.createdAt,
    }));
  }

  async updateRole(requesterId: string, targetId: string, dto: UpdateUserRoleDto) {
    if (requesterId === targetId) {
      throw new ForbiddenException("본인 계정의 권한은 변경할 수 없습니다.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    if (user.role === "SUPER_ADMIN") {
      throw new ForbiddenException("SUPER_ADMIN 권한은 DB에서만 변경할 수 있습니다.");
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    void logAdminAction(this.prisma, requesterId, "USER_ROLE_CHANGE", "USER", targetId, `role -> ${dto.role}`);
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
      this.chatGateway.server.in(`user:${targetId}`).disconnectSockets(true);
    }

    void logSuspensionChange(
      this.prisma,
      targetId,
      dto.status === "SUSPENDED" ? "SUSPENDED" : "UNSUSPENDED",
      dto.status === "SUSPENDED" ? (dto.reason ?? null) : null,
      dto.status === "SUSPENDED" ? suspendedUntil : null,
      requesterId,
    );
    void logAdminAction(
      this.prisma,
      requesterId,
      dto.status === "SUSPENDED" ? "USER_SUSPEND" : "USER_UNSUSPEND",
      "USER",
      targetId,
      dto.reason ?? null,
    );

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
      breedingEssence: clamp(current?.breedingEssence ?? 0, dto.breedingEssenceDelta),
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

    const pointsDelta = next.missionPoints - (current?.missionPoints ?? 0);
    void logPointsChange(this.prisma, targetId, pointsDelta, `admin_adjust${dto.reason ? `:${dto.reason}` : ""}`, {
      source: "admin",
      sourceId: `adjust:${requesterId}:${targetId}`,
    });

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

    void logAdminAction(
      this.prisma,
      requesterId,
      "USER_REWARD_ADJUST",
      "USER",
      targetId,
      changes.join(", ") + (dto.reason ? ` (사유: ${dto.reason})` : ""),
    );

    return updated;
  }

  /** 전체 유저에게 KP를 일괄 지급 — UserReward가 없는 유저는 새로 생성 */
  async bulkAdjustReward(requesterId: string, dto: BulkAdjustRewardDto) {
    const delta = dto.missionPointsDelta;

    const allUserIds = (await this.prisma.user.findMany({ select: { id: true } })).map((u) => u.id);
    const existingIds = new Set(
      (await this.prisma.userReward.findMany({ select: { userId: true } })).map((r) => r.userId),
    );
    const missingIds = allUserIds.filter((id) => !existingIds.has(id));

    await this.prisma.userReward.updateMany({
      data: { missionPoints: { increment: delta } },
    });

    if (missingIds.length > 0) {
      await this.prisma.userReward.createMany({
        data: missingIds.map((userId) => ({ userId, missionPoints: delta })),
      });
    }

    const results = await Promise.allSettled(
      allUserIds.map(async (userId) => {
        void logPointsChange(this.prisma, userId, delta, `admin_bulk_adjust${dto.reason ? `:${dto.reason}` : ""}`, {
          source: "admin",
          sourceId: `bulk:${requesterId}`,
        });
        await this.notifications.create({
          userId,
          type: "notice",
          title: "KP 지급 안내",
          body: `KP +${delta}${dto.reason ? ` (사유: ${dto.reason})` : ""}`,
        });
      }),
    );
    const notified = results.filter((r) => r.status === "fulfilled").length;

    void logAdminAction(
      this.prisma,
      requesterId,
      "USER_REWARD_BULK_ADJUST",
      null,
      null,
      `KP +${delta} × ${allUserIds.length}명${dto.reason ? ` (사유: ${dto.reason})` : ""}`,
    );

    return { total: allUserIds.length, notified, delta };
  }

  /** 선택한 유저들에게만 KP를 일괄 지급 — UserReward가 없는 유저는 새로 생성 */
  async bulkAdjustRewardSelected(requesterId: string, dto: BulkAdjustRewardSelectedDto) {
    const delta = dto.missionPointsDelta;
    const userIds = [...new Set(dto.userIds)];

    const validIds = (
      await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } })
    ).map((u) => u.id);
    if (validIds.length === 0) throw new NotFoundException("대상 사용자를 찾을 수 없습니다.");

    const existingIds = new Set(
      (await this.prisma.userReward.findMany({ where: { userId: { in: validIds } }, select: { userId: true } })).map(
        (r) => r.userId,
      ),
    );
    const missingIds = validIds.filter((id) => !existingIds.has(id));

    await this.prisma.userReward.updateMany({
      where: { userId: { in: validIds } },
      data: { missionPoints: { increment: delta } },
    });

    if (missingIds.length > 0) {
      await this.prisma.userReward.createMany({
        data: missingIds.map((userId) => ({ userId, missionPoints: delta })),
      });
    }

    const results = await Promise.allSettled(
      validIds.map(async (userId) => {
        void logPointsChange(this.prisma, userId, delta, `admin_selected_adjust${dto.reason ? `:${dto.reason}` : ""}`, {
          source: "admin",
          sourceId: `selected:${requesterId}`,
        });
        await this.notifications.create({
          userId,
          type: "notice",
          title: "KP 지급 안내",
          body: `KP +${delta}${dto.reason ? ` (사유: ${dto.reason})` : ""}`,
        });
      }),
    );
    const notified = results.filter((r) => r.status === "fulfilled").length;

    void logAdminAction(
      this.prisma,
      requesterId,
      "USER_REWARD_BULK_ADJUST",
      null,
      null,
      `KP +${delta} × 선택 ${validIds.length}명${dto.reason ? ` (사유: ${dto.reason})` : ""}`,
    );

    return { total: validIds.length, notified, delta };
  }

  async grantTitle(requesterId: string, targetId: string, titleId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    await this.prisma.userTitle.upsert({
      where: { userId_titleId: { userId: targetId, titleId } },
      create: { userId: targetId, titleId },
      update: {},
    });
    void logAdminAction(this.prisma, requesterId, "USER_TITLE_GRANT", "USER", targetId, `title ${titleId}`);
    return { userId: targetId, titleId };
  }

  async revokeTitle(requesterId: string, targetId: string, titleId: number) {
    await this.prisma.userTitle.deleteMany({ where: { userId: targetId, titleId } });
    void logAdminAction(this.prisma, requesterId, "USER_TITLE_REVOKE", "USER", targetId, `title ${titleId}`);
    return { userId: targetId, titleId };
  }
}
