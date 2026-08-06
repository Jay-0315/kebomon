import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 20;

type SortKey = "count" | "species";

@Injectable()
export class AdminFishingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRankings(sort: SortKey = "count", page = 1) {
    const grouped = await this.prisma.userFish.groupBy({
      by: ["userId"],
      _sum: { count: true },
      _count: { _all: true },
    });

    const userIds = grouped.map((g) => g.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        reward: { select: { fishDexMilestoneBest: true, lastFishCastAt: true } },
      },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const rows = grouped
      .map((g) => {
        const user = userById.get(g.userId);
        return {
          userId: g.userId,
          name: user?.name ?? "-",
          email: user?.email ?? "-",
          totalCatches: g._sum.count ?? 0,
          speciesCount: g._count._all,
          fishDexMilestoneBest: user?.reward?.fishDexMilestoneBest ?? 0,
          lastFishCastAt: user?.reward?.lastFishCastAt ?? null,
        };
      })
      .sort((a, b) => (sort === "species" ? b.speciesCount - a.speciesCount : b.totalCatches - a.totalCatches));

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
