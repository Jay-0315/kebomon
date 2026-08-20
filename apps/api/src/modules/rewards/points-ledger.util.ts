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
  const normalized = reason.toLowerCase();
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("auction")) return "auction";
  if (normalized.includes("fishing")) return "fishing";
  if (normalized.includes("tower_defense") || normalized.includes("tower-defense")) return "tower-defense";
  if (normalized.includes("guild")) return "guild";
  if (normalized.includes("expedition")) return "expedition";
  if (normalized.includes("rogue")) return "rogue";
  if (normalized.includes("attendance")) return "attendance";
  if (normalized.includes("quest")) return "quest";
  if (normalized.includes("shop")) return "shop";
  if (normalized.includes("raid")) return "raid";
  if (normalized.includes("gacha") || normalized.includes("egg") || normalized.includes("breed")) return "gacha";
  if (normalized.includes("community") || normalized.includes("post")) return "community";
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
