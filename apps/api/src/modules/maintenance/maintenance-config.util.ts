import { PrismaService } from "../prisma/prisma.service";

export type MaintenanceConfigValues = {
  enabled: boolean;
  message: string | null;
  endsAt: Date | null;
};

/**
 * 점검 모드 설정을 읽어온다. 아직 마이그레이션(maintenance_config 테이블)이 안 돌았거나
 * 행이 없으면 "점검 아님" 기본값으로 폴백 — 배포 순서(코드 vs DB 마이그레이션)에 안전하게 만들기 위함.
 */
export async function resolveMaintenanceConfig(prisma: PrismaService): Promise<MaintenanceConfigValues> {
  const row = await prisma.maintenanceConfig.findUnique({ where: { id: 1 } }).catch(() => null);

  return {
    enabled: row?.enabled ?? false,
    message: row?.message ?? null,
    endsAt: row?.endsAt ?? null,
  };
}
