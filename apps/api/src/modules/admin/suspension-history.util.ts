import { PrismaService } from "../prisma/prisma.service";

/** 정지/해제/자동만료를 이력에 기록 — 관리자페이지 유저 상세 "정지 이력"용. 실패해도 메인 흐름은 막지 않는다. */
export async function logSuspensionChange(
  prisma: PrismaService,
  userId: string,
  action: "SUSPENDED" | "UNSUSPENDED" | "AUTO_EXPIRED",
  reason: string | null,
  suspendedUntil: Date | null,
  actedBy: string | null,
): Promise<void> {
  await prisma.suspensionHistory
    .create({ data: { userId, action, reason, suspendedUntil, actedBy } })
    .catch(() => undefined);
}
