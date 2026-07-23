import { PrismaService } from "../prisma/prisma.service";
import { logSuspensionChange } from "../admin/suspension-history.util";

/** 기간 정지(suspendedUntil 지정)가 만료됐는지 확인 — null이면 영구 정지라 만료되지 않음 */
export function isSuspensionExpired(user: { status: string; suspendedUntil: Date | null }): boolean {
  return user.status === "SUSPENDED" && user.suspendedUntil !== null && user.suspendedUntil.getTime() <= Date.now();
}

/** 기간 정지가 만료된 계정을 ACTIVE로 되돌림 (영구 정지는 대상 아님) */
export async function reactivateIfExpired(
  prisma: PrismaService,
  user: { id: string; status: string; suspendedUntil: Date | null },
): Promise<boolean> {
  if (!isSuspensionExpired(user)) return false;
  await prisma.user.update({
    where: { id: user.id },
    data: { status: "ACTIVE", suspendedReason: null, suspendedUntil: null },
  });
  void logSuspensionChange(prisma, user.id, "AUTO_EXPIRED", null, null, null);
  return true;
}
