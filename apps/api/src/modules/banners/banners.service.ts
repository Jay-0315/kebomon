import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });
  }
}
