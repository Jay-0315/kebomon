import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 20;

type SortKey = "clears" | "challenge";

@Injectable()
export class AdminRogueService {
  constructor(private readonly prisma: PrismaService) {}

  async getRankings(sort: SortKey = "clears", page = 1) {
    const rewards = await this.prisma.userReward.findMany({
      where: { OR: [{ rogueClears: { gt: 0 } }, { activeRunStartedAt: { not: null } }] },
      select: {
        rogueClears: true,
        challengeBest: true,
        activeRunStartedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const rows = rewards
      .map((r) => ({
        userId: r.user.id,
        name: r.user.name,
        email: r.user.email,
        rogueClears: r.rogueClears,
        challengeBest: r.challengeBest,
        activeRunStartedAt: r.activeRunStartedAt,
      }))
      .sort((a, b) => (sort === "challenge" ? b.challengeBest - a.challengeBest : b.rogueClears - a.rogueClears));

    const total = rows.length;
    const start = (page - 1) * PAGE_SIZE;
    return {
      rows: rows.slice(start, start + PAGE_SIZE),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }
}
