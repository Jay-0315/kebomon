import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminExpeditionService {
  constructor(private readonly prisma: PrismaService) {}

  async getActive() {
    const expeditions = await this.prisma.expedition.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: "desc" },
    });

    const rows = expeditions.map((e) => ({
      userId: e.user.id,
      name: e.user.name,
      email: e.user.email,
      regionId: e.regionId,
      partySize: Array.isArray(e.partyIds) ? e.partyIds.length : 0,
      startTime: e.startTime,
      endsAt: new Date(e.startTime.getTime() + e.durationHours * 3600_000),
      eventTemplateId: e.eventTemplateId,
      eventBonusMult: e.eventBonusMult,
    }));

    return { rows, total: rows.length };
  }
}
