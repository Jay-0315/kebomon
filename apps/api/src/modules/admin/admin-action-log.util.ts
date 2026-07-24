import { PrismaService } from "../prisma/prisma.service";

/** 관리자 액션 전반을 감사 로그에 기록 — 실패해도 메인 흐름은 막지 않는다. */
export async function logAdminAction(
  prisma: PrismaService,
  actorId: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  detail: string | null,
): Promise<void> {
  await prisma.adminActionLog
    .create({ data: { actorId, action, targetType, targetId, detail } })
    .catch(() => undefined);
}
