// 낚시터 물고기 마스터 데이터 — 케보몬과 동일한 6등급 체계를 재사용하되 완전히 별도의
// 컬렉션(UserFish)로 관리한다. 표시용 이름/설명은 프론트 data/fish.ts에 미러링.

export const FISH_RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export type FishRarity = (typeof FISH_RARITIES)[number];

export const FISH_POOL_BY_RARITY: Record<FishRarity, number[]> = {
  common: [1, 2, 3, 4],
  uncommon: [5, 6, 7, 8],
  rare: [9, 10, 11, 12],
  epic: [13, 14, 15, 16],
  legendary: [17, 18, 19, 20],
  mythic: [21, 22, 23, 24],
};

export const FISH_ID_TO_RARITY: Record<number, FishRarity> = Object.fromEntries(
  (Object.entries(FISH_POOL_BY_RARITY) as [FishRarity, number[]][]).flatMap(([rarity, ids]) =>
    ids.map((id) => [id, rarity]),
  ),
);

export const TOTAL_FISH_COUNT = Object.values(FISH_POOL_BY_RARITY).flat().length;

// 등급(Perfect/Good)별 rarity 추첨 가중치 — 합 100 기준
export const FISH_GRADE_WEIGHTS: Record<"good" | "perfect", Record<FishRarity, number>> = {
  good: { common: 55, uncommon: 28, rare: 13, epic: 3, legendary: 0.7, mythic: 0.3 },
  perfect: { common: 20, uncommon: 28, rare: 27, epic: 15, legendary: 7, mythic: 3 },
};

// 첫 포획 KP 보상 (등급별) — 중복 포획은 절반
export const FISH_CATCH_POINTS: Record<FishRarity, number> = {
  common: 2,
  uncommon: 4,
  rare: 8,
  epic: 15,
  legendary: 30,
  mythic: 60,
};

// 낚시 도감(distinct 종 수) 마일스톤 보상
export const FISH_DEX_MILESTONES: { count: number; kp: number }[] = [
  { count: 6, kp: 100 },
  { count: 12, kp: 250 },
  { count: 18, kp: 500 },
  { count: 24, kp: 1000 },
];

export function pickWeightedRarity(weights: Record<FishRarity, number>): FishRarity {
  const total = FISH_RARITIES.reduce((sum, r) => sum + weights[r], 0);
  let roll = Math.random() * total;
  for (const rarity of FISH_RARITIES) {
    roll -= weights[rarity];
    if (roll <= 0) return rarity;
  }
  return "common";
}
