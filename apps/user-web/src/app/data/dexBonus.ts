// 도감 완성도(dexMilestoneBest) 구간별 원정 보상 배율 보너스 — 서버 expedition.constants.ts와 맞출 것
export const DEX_COMPLETION_BONUS: Record<number, number> = {
  0: 1.0, 25: 1.02, 50: 1.04, 75: 1.06, 100: 1.08, 125: 1.1, 150: 1.13, 175: 1.16, 180: 1.2,
};

export function getDexCompletionBonus(dexMilestoneBest: number): number {
  let bonus = 1.0;
  for (const [threshold, mult] of Object.entries(DEX_COMPLETION_BONUS)) {
    if (dexMilestoneBest >= Number(threshold)) bonus = mult;
  }
  return bonus;
}
