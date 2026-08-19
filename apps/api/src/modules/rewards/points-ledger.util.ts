import { PrismaService } from "../prisma/prisma.service";

export type PointsLedgerSource =
  | "admin"
  | "arena"
  | "auction"
  | "community"
  | "fishing"
  | "gacha"
  | "guild"
  | "raid"
  | "rogue"
  | "shop"
  | "tower-defense"
  | "attendance"
  | "quest"
  | "expedition"
  | "system";

export type PointsLedgerMeta = {
  source?: PointsLedgerSource;
  sourceId?: string | number;
  idempotencyKey?: string;
};

function inferSource(reason: string): PointsLedgerSource {
  if (reason.includes("관리자") || reason.includes("지급") || reason.includes("조정")) return "admin";
  if (reason.includes("경매")) return "auction";
  if (reason.includes("낚시")) return "fishing";
  if (reason.includes("타워 디펜스")) return "tower-defense";
  if (reason.includes("길드")) return "guild";
  if (reason.includes("원정")) return "expedition";
  if (reason.includes("로그라이크") || reason.includes("도전 모드")) return "rogue";
  if (reason.includes("출석")) return "attendance";
  if (reason.includes("퀘스트")) return "quest";
  if (reason.includes("상점")) return "shop";
  if (reason.includes("레이드")) return "raid";
  if (reason.includes("가챠") || reason.includes("알")) return "gacha";
  if (reason.includes("게시글")) return "community";
  return "system";
}

/** KP changes are recorded in a normalized ledger for audit and reconciliation. */
export async function logPointsChange(
  prisma: PrismaService,
  userId: string,
  delta: number,
  reason: string,
  meta: PointsLedgerMeta = {},
): Promise<void> {
  if (delta === 0) return;
  await prisma.pointsLedger
    .create({
      data: {
        userId,
        delta,
        reason,
        source: meta.source ?? inferSource(reason),
        sourceId: meta.sourceId === undefined ? undefined : String(meta.sourceId),
        idempotencyKey: meta.idempotencyKey,
      },
    })
    .catch(() => undefined);
}
