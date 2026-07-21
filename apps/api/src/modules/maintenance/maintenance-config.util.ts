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

  if (row?.enabled && row.endsAt && row.endsAt.getTime() <= Date.now()) {
    // 종료 예정 시각이 지났으면 자동 해제 — best-effort로 DB에도 반영해 관리자페이지 상태를 동기화한다.
    prisma.maintenanceConfig
      .update({ where: { id: 1 }, data: { enabled: false, endsAt: null } })
      .catch(() => {});
    return { enabled: false, message: null, endsAt: null };
  }

  return {
    enabled: row?.enabled ?? false,
    message: row?.message ?? null,
    endsAt: row?.endsAt ?? null,
  };
}
