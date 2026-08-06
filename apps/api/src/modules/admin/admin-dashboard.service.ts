import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const TREND_DAYS = 14;

function lastNDates(n: number): string[] {
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function fillTrend(rows: { date: Date | string; count: bigint | number }[], days: string[]) {
  const byDate = new Map(
    rows.map((r) => [
      typeof r.date === "string" ? r.date.slice(0, 10) : r.date.toISOString().slice(0, 10),
      Number(r.count),
    ]),
  );
  return days.map((date) => ({ date, count: byDate.get(date) ?? 0 }));
}

function fillDualTrend(
  rows: { date: Date | string; earned: bigint | number; spent: bigint | number }[],
  days: string[],
) {
  const byDate = new Map(
    rows.map((r) => [
      typeof r.date === "string" ? r.date.slice(0, 10) : r.date.toISOString().slice(0, 10),
      { earned: Number(r.earned), spent: Number(r.spent) },
    ]),
  );
  return days.map((date) => ({ date, ...(byDate.get(date) ?? { earned: 0, spent: 0 }) }));
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const days = lastNDates(TREND_DAYS);

    const [totalUsers, totalPosts, totalComments, dau, signupRows, postRows, pointsRows] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.communityPost.count(),
        this.prisma.comment.count(),
        this.prisma.user.count({
          where: { lastLoginAt: { gte: new Date(new Date().toISOString().slice(0, 10)) } },
        }),
        this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= (CURDATE() - INTERVAL ${TREND_DAYS - 1} DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM community_posts
        WHERE created_at >= (CURDATE() - INTERVAL ${TREND_DAYS - 1} DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        this.prisma.$queryRaw<{ date: Date; earned: bigint; spent: bigint }[]>`
        SELECT DATE(created_at) as date,
          SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) as earned,
          SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END) as spent
        FROM points_ledger
        WHERE created_at >= (CURDATE() - INTERVAL ${TREND_DAYS - 1} DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      ]);

    return {
      totalUsers,
      totalPosts,
      totalComments,
      dau,
      signupTrend: fillTrend(signupRows, days),
      postTrend: fillTrend(postRows, days),
      pointsTrend: fillDualTrend(pointsRows, days),
    };
  }
}
