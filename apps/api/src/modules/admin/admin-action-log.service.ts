import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PAGE_SIZE = 30;

@Injectable()
export class AdminActionLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(actorId?: string, action?: string, page = 1) {
    const skip = (page - 1) * PAGE_SIZE;
    const where = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
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
      logs: rows.map((r) => ({ ...r, id: r.id.toString() })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }
}
