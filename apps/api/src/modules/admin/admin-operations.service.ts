import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 30;

type RewardLogQuery = {
  q?: string;
  reason?: string;
  direction?: "earned" | "spent" | "all";
  page?: number;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - days);
  return d;
}

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const today = startOfToday();
    const sevenDaysAgo = daysAgo(6);
    const fourteenDaysAgo = daysAgo(13);
    const now = new Date();

    const [
      activeEvents,
      scheduledEvents,
      maintenance,
      kpiRows,
      contentRows,
      rewardReasonRows,
      recentBalanceChanges,
    ] = await Promise.all([
      this.prisma.banner.count({
        where: {
          active: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
      }),
      this.prisma.banner.count({
        where: { active: true, startsAt: { gt: now } },
      }),
      this.prisma.maintenanceConfig.findUnique({ where: { id: 1 } }),
      this.prisma.$queryRaw<
        Array<{ date: Date | string; earned: bigint | number; spent: bigint | number; rewardLogs: bigint | number }>
      >`
        SELECT DATE(created_at) as date,
          SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) as earned,
          SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END) as spent,
          COUNT(*) as rewardLogs
        FROM points_ledger
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      this.prisma.$queryRaw<
        Array<{
          users: bigint | number;
          posts: bigint | number;
          comments: bigint | number;
          arenaBattles: bigint | number;
          duelPlayers: bigint | number;
          tdPlayers: bigint | number;
          fishingPlayers: bigint | number;
          roguePlayers: bigint | number;
          expeditionPlayers: bigint | number;
        }>
      >`
        SELECT
          (SELECT COUNT(*) FROM users WHERE last_login_at >= ${fourteenDaysAgo}) as users,
          (SELECT COUNT(*) FROM community_posts WHERE created_at >= ${fourteenDaysAgo}) as posts,
          (SELECT COUNT(*) FROM comments WHERE created_at >= ${fourteenDaysAgo}) as comments,
          (SELECT COUNT(*) FROM arena_attack_logs WHERE created_at >= ${fourteenDaysAgo}) as arenaBattles,
          (SELECT COUNT(*) FROM duel_stats WHERE updated_at >= ${fourteenDaysAgo}) as duelPlayers,
          (SELECT COUNT(*) FROM user_rewards WHERE td_best_wave > 0 AND updated_at >= ${fourteenDaysAgo}) as tdPlayers,
          (SELECT COUNT(*) FROM user_rewards WHERE last_fish_cast_at >= ${fourteenDaysAgo}) as fishingPlayers,
          (SELECT COUNT(*) FROM user_rewards WHERE rogue_clears > 0 AND updated_at >= ${fourteenDaysAgo}) as roguePlayers,
          (SELECT COUNT(*) FROM user_rewards WHERE expedition_count > 0 AND updated_at >= ${fourteenDaysAgo}) as expeditionPlayers
      `,
      this.prisma.pointsLedger.groupBy({
        by: ["reason"],
        where: { createdAt: { gte: fourteenDaysAgo } },
        _sum: { delta: true },
        _count: { _all: true },
        orderBy: { _count: { reason: "desc" } },
        take: 8,
      }),
      this.prisma.adminActionLog.findMany({
        where: {
          OR: [
            { action: { contains: "BALANCE" } },
            { action: { contains: "CONFIG" } },
            { action: { contains: "SEASON" } },
            { action: { contains: "REWARD" } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const content = contentRows[0] ?? {
      users: 0,
      posts: 0,
      comments: 0,
      arenaBattles: 0,
      duelPlayers: 0,
      tdPlayers: 0,
      fishingPlayers: 0,
      roguePlayers: 0,
      expeditionPlayers: 0,
    };

    return {
      eventSettings: {
        activeBanners: activeEvents,
        scheduledBanners: scheduledEvents,
        maintenanceEnabled: maintenance?.enabled ?? false,
        maintenanceEndsAt: maintenance?.endsAt ?? null,
      },
      kpis: {
        activeUsers14d: Number(content.users),
        communityPosts14d: Number(content.posts),
        comments14d: Number(content.comments),
        arenaBattles14d: Number(content.arenaBattles),
        duelPlayers14d: Number(content.duelPlayers),
        towerDefensePlayers14d: Number(content.tdPlayers),
        fishingPlayers14d: Number(content.fishingPlayers),
        roguePlayers14d: Number(content.roguePlayers),
        expeditionPlayers14d: Number(content.expeditionPlayers),
      },
      pointsTrend: kpiRows.map((r) => ({
        date: typeof r.date === "string" ? r.date.slice(0, 10) : r.date.toISOString().slice(0, 10),
        earned: Number(r.earned),
        spent: Number(r.spent),
        rewardLogs: Number(r.rewardLogs),
      })),
      rewardReasons: rewardReasonRows.map((r) => ({
        reason: r.reason,
        totalDelta: r._sum.delta ?? 0,
        count: r._count._all,
      })),
      recentBalanceChanges: recentBalanceChanges.map((r) => ({
        id: r.id.toString(),
        actorId: r.actorId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        detail: r.detail,
        createdAt: r.createdAt,
      })),
    };
  }

  async getRewardLogs(query: RewardLogQuery) {
    const page = Math.max(1, query.page ?? 1);
    const skip = (page - 1) * PAGE_SIZE;
    const where: Prisma.PointsLedgerWhereInput = {
      ...(query.reason ? { reason: { contains: query.reason } } : {}),
      ...(query.direction === "earned" ? { delta: { gt: 0 } } : {}),
      ...(query.direction === "spent" ? { delta: { lt: 0 } } : {}),
      ...(query.q
        ? {
            user: {
              OR: [
                { name: { contains: query.q } },
                { email: { contains: query.q } },
                { id: { contains: query.q } },
              ],
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.pointsLedger.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.pointsLedger.count({ where }),
    ]);

    return {
      logs: rows.map((r) => ({
        id: r.id.toString(),
        userId: r.userId,
        userName: r.user.name,
        userEmail: r.user.email,
        delta: r.delta,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async getBalanceHistory(page = 1) {
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * PAGE_SIZE;
    const where: Prisma.AdminActionLogWhereInput = {
      OR: [
        { action: { contains: "BALANCE" } },
        { action: { contains: "CONFIG" } },
        { action: { contains: "SEASON" } },
        { action: { contains: "REWARD" } },
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      this.prisma.adminActionLog.count({ where }),
    ]);

    return {
      logs: rows.map((r) => ({
        id: r.id.toString(),
        actorId: r.actorId,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        detail: r.detail,
        createdAt: r.createdAt,
      })),
      total,
      page: currentPage,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }
}
