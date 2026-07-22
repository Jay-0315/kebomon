import { PrismaService } from "../prisma/prisma.service";

/** KP 변동을 원장에 기록 — 관리자페이지 유저 상세 "활동 로그"용. 실패해도 메인 흐름은 막지 않는다. */
export async function logPointsChange(
  prisma: PrismaService,
  userId: string,
  delta: number,
  reason: string,
): Promise<void> {
  if (delta === 0) return;
  await prisma.pointsLedger.create({ data: { userId, delta, reason } }).catch(() => undefined);
}
