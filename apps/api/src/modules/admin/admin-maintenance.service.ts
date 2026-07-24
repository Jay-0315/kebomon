import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { resolveMaintenanceConfig } from "../maintenance/maintenance-config.util";
import { UpdateMaintenanceConfigDto } from "./dto/update-maintenance-config.dto";
import { logAdminAction } from "./admin-action-log.util";

@Injectable()
export class AdminMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    return resolveMaintenanceConfig(this.prisma);
  }

  async updateConfig(requesterId: string, dto: UpdateMaintenanceConfigDto) {
    let endsAt: Date | null = null;
    if (dto.enabled && dto.endsAt) {
      endsAt = new Date(dto.endsAt);
      if (endsAt.getTime() <= Date.now()) {
        throw new BadRequestException("종료 예정 시각은 현재보다 미래여야 합니다.");
      }
    }

    const data = {
      enabled: dto.enabled,
      message: dto.enabled ? (dto.message ?? null) : null,
      endsAt,
    };

    await this.prisma.maintenanceConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });

    void logAdminAction(
      this.prisma,
      requesterId,
      dto.enabled ? "MAINTENANCE_ENABLE" : "MAINTENANCE_DISABLE",
      null,
      null,
      dto.message ?? null,
    );

    return data;
  }
}
