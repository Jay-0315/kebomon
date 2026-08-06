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

/** 코호트가 0이면 비율 계산이 무의미하므로 null 반환 */
function ratio(retained: bigint | number, cohort: bigint | number): number | null {
  const c = Number(cohort);
  return c > 0 ? Number(retained) / c : null;
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const days = lastNDates(TREND_DAYS);

    const [totalUsers, totalPosts, totalComments, dau, signupRows, postRows, retentionRows, pointsRows] =
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
        this.prisma.$queryRaw<
          { d1Cohort: bigint; d1Retained: bigint; d7Cohort: bigint; d7Retained: bigint }[]
        >`
        SELECT
          SUM(CASE WHEN created_at <= NOW() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS d1Cohort,
          SUM(CASE WHEN created_at <= NOW() - INTERVAL 1 DAY AND last_login_at >= created_at + INTERVAL 1 DAY THEN 1 ELSE 0 END) AS d1Retained,
          SUM(CASE WHEN created_at <= NOW() - INTERVAL 7 DAY THEN 1 ELSE 0 END) AS d7Cohort,
          SUM(CASE WHEN created_at <= NOW() - INTERVAL 7 DAY AND last_login_at >= created_at + INTERVAL 7 DAY THEN 1 ELSE 0 END) AS d7Retained
        FROM users
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

    const retentionSummary = retentionRows[0];

    return {
      totalUsers,
      totalPosts,
      totalComments,
      dau,
      signupTrend: fillTrend(signupRows, days),
      postTrend: fillTrend(postRows, days),
      retention: {
        d1: retentionSummary ? ratio(retentionSummary.d1Retained, retentionSummary.d1Cohort) : null,
        d7: retentionSummary ? ratio(retentionSummary.d7Retained, retentionSummary.d7Cohort) : null,
      },
      pointsTrend: fillDualTrend(pointsRows, days),
    };
  }
}
