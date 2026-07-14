// 원정 밸런스 상수 — 값 변경 시 이 파일만 고치면 됨.
// 프론트 apps/user-web/src/app/components/ExpeditionPage.tsx의 REGIONS/DURATIONS는
// 별도 패키지라 이 파일을 import할 수 없음 — 값을 바꿀 땐 그쪽도 함께 맞춰야 함.
// (이름/설명/아이콘 등 표시용 텍스트는 프론트에만 있으면 되고, 여기엔 보상 계산에
// 필요한 값만 둔다.)

export type ExpeditionDifficulty = "low" | "medium" | "high" | "extreme";

export interface ExpeditionRegion {
  id: string;
  difficulty: ExpeditionDifficulty;
  minParty: number;
  minRarity: string;
  /** 이 지역을 해금하는 데 필요한 누적 레이드 클리어 횟수 (0 = 항상 해금) */
  unlockRaidCount: number;
  rewardBase: {
    points: number;
    stones: number;
    normalEgg: number;
    bigEgg: number;
    goldEgg: number;
  };
}

export const EXPEDITION_REGIONS: ExpeditionRegion[] = [
  {
    id: "grassland",
    difficulty: "low",
    minParty: 2,
    minRarity: "common",
    unlockRaidCount: 0,
    rewardBase: { points: 80, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  },
  {
    id: "forest",
    difficulty: "low",
    minParty: 2,
    minRarity: "common",
    unlockRaidCount: 0,
    rewardBase: { points: 100, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  },
  {
    id: "ruins",
    difficulty: "medium",
    minParty: 3,
    minRarity: "uncommon",
    unlockRaidCount: 1,
    rewardBase: { points: 150, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  },
  {
    id: "altar",
    difficulty: "extreme",
    minParty: 4,
    minRarity: "rare",
    unlockRaidCount: 5,
    rewardBase: { points: 280, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  },
];

export function getExpeditionRegion(id: string): ExpeditionRegion | undefined {
  return EXPEDITION_REGIONS.find((r) => r.id === id);
}

/** durationHours → 보상 배율 */
export const EXPEDITION_DURATIONS: Record<number, number> = {
  2: 1.0,
  4: 1.6,
  6: 2.1,
};

const RARITY_ORDER = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

export function rarityAtLeast(rarity: string, min: string): boolean {
  return RARITY_ORDER.indexOf(rarity) >= RARITY_ORDER.indexOf(min);
}

/** 도감 완성도(dexMilestoneBest) 구간별 원정 보상 배율 보너스 */
export const DEX_COMPLETION_BONUS: Record<number, number> = {
  0: 1.0,
  25: 1.02,
  50: 1.04,
  75: 1.06,
  100: 1.08,
  125: 1.1,
  150: 1.13,
  175: 1.16,
  180: 1.2,
};

export function getDexCompletionBonus(dexMilestoneBest: number): number {
  let bonus = 1.0;
  for (const [threshold, mult] of Object.entries(DEX_COMPLETION_BONUS)) {
    if (dexMilestoneBest >= Number(threshold)) bonus = mult;
  }
  return bonus;
}

export function calcExpeditionReward(
  region: ExpeditionRegion,
  partySize: number,
  durationMultiplier: number,
  dexBonusMult = 1,
) {
  const diffBonus =
    region.difficulty === "extreme"
      ? 1.5
      : region.difficulty === "high"
        ? 1.3
        : region.difficulty === "medium"
          ? 1.1
          : 1.0;
  const partyBonus = 1 + (partySize - region.minParty) * 0.12;
  const mult = durationMultiplier * diffBonus * partyBonus * dexBonusMult;
  const b = region.rewardBase;
  return {
    points: Math.round(b.points * mult),
    stones: Math.round(b.stones * mult),
    normalEgg: b.normalEgg > 0 ? Math.round(b.normalEgg * mult) : 0,
    bigEgg: b.bigEgg > 0 ? Math.round(b.bigEgg * mult) : 0,
    goldEgg: b.goldEgg > 0 ? Math.round(b.goldEgg * mult) : 0,
  };
}

// ─── 원정 중 랜덤 이벤트 (조우) ────────────────────────────────────────────────
// 프론트 EVENT_TEMPLATES의 id와 동일하게 유지 — 실제 아이콘/문구는 프론트 전용.
export const EXPEDITION_EVENT_IDS = ["fork", "cave", "merchant", "storm"];
export const EXPEDITION_EVENT_TRIGGER_RATIO = 0.5;
export const EXPEDITION_EVENT_SAFE_MULT = 1.1;

/** 0.85 ~ 1.7 사이, 평균이 안전 선택(1.1)보다 높도록 설계된 도박 */
export function rollExpeditionRiskyMult(): number {
  return Math.round((0.85 + Math.random() * 0.85) * 100) / 100;
}
