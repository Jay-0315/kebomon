import { PrismaService } from "../prisma/prisma.service";

export type EggType = "normal" | "big" | "golden";

export const GACHA_RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export const EGG_RARITIES: Record<EggType, readonly string[]> = {
  normal: ["common", "uncommon", "rare"],
  big: ["common", "uncommon", "rare", "epic"],
  golden: ["common", "uncommon", "rare", "epic", "legendary"],
};

export const DEFAULT_GACHA_RATES: Record<string, number> = {
  common: 45.84,
  uncommon: 30.56,
  rare: 15,
  epic: 6,
  legendary: 2,
  mythic: 0.6,
};

export const DEFAULT_EGG_RATES: Record<EggType, Record<string, number>> = {
  normal: { common: 55, uncommon: 30, rare: 15 },
  big: { common: 42, uncommon: 28, rare: 20, epic: 10 },
  golden: { common: 35, uncommon: 26, rare: 22, epic: 12, legendary: 5 },
};

export const DEFAULT_PITY_RARE_THRESHOLD = 9;
export const DEFAULT_PITY_LEGENDARY_THRESHOLD = 79;

export type GachaConfigValues = {
  gachaRates: Record<string, number>;
  normalEggRates: Record<string, number>;
  bigEggRates: Record<string, number>;
  goldenEggRates: Record<string, number>;
  pityRareThreshold: number;
  pityLegendaryThreshold: number;
};

/**
 * 관리자 페이지에서 조정한 가챠 확률/천장 설정을 읽어온다.
 * 아직 마이그레이션(gacha_config 테이블)이 안 돌았거나 행이 없으면 기본값으로 폴백 —
 * 배포 순서(코드 vs DB 마이그레이션)에 안전하게 만들기 위함.
 */
export async function resolveGachaConfig(prisma: PrismaService): Promise<GachaConfigValues> {
  const row = await prisma.gachaConfig.findUnique({ where: { id: 1 } }).catch(() => null);

  return {
    gachaRates: (row?.gachaRates as Record<string, number>) ?? DEFAULT_GACHA_RATES,
    normalEggRates: (row?.normalEggRates as Record<string, number>) ?? DEFAULT_EGG_RATES.normal,
    bigEggRates: (row?.bigEggRates as Record<string, number>) ?? DEFAULT_EGG_RATES.big,
    goldenEggRates: (row?.goldenEggRates as Record<string, number>) ?? DEFAULT_EGG_RATES.golden,
    pityRareThreshold: row?.pityRareThreshold ?? DEFAULT_PITY_RARE_THRESHOLD,
    pityLegendaryThreshold: row?.pityLegendaryThreshold ?? DEFAULT_PITY_LEGENDARY_THRESHOLD,
  };
}

export function eggRatesFor(config: GachaConfigValues, eggType: EggType): Record<string, number> {
  if (eggType === "normal") return config.normalEggRates;
  if (eggType === "big") return config.bigEggRates;
  return config.goldenEggRates;
}

/** 허용된 등급 키만, 0 이상 숫자만 골라서 기존 값 위에 덮어씌운다 (알 수 없는 키/음수 무시) */
export function mergeRates(
  current: Record<string, number>,
  patch: Record<string, unknown> | undefined,
  allowedKeys: readonly string[],
): Record<string, number> {
  if (!patch || typeof patch !== "object") return current;
  const next = { ...current };
  for (const key of allowedKeys) {
    const value = patch[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      next[key] = value;
    }
  }
  return next;
}
