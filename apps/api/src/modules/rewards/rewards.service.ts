import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ARENA_TIERS, getArenaTierKey } from "../arena/arena.constants";
import {
  EXPEDITION_DURATIONS,
  EXPEDITION_EVENT_IDS,
  EXPEDITION_EVENT_SAFE_MULT,
  EXPEDITION_EVENT_TRIGGER_RATIO,
  calcExpeditionReward,
  getDexCompletionBonus,
  getExpeditionRegion,
  rarityAtLeast,
  rollExpeditionRiskyMult,
} from "./expedition.constants";
import { EggType, eggRatesFor, resolveGachaConfig, GachaConfigValues } from "./gacha-config.util";
import { CharacterMasterRow, loadCharacterMasterMap, RARITIES } from "./character-master.util";
import { getTodayKTC, getYesterdayKTC } from "./date.util";
import { getIsoWeekKey } from "../guild/guild.constants";
import { logPointsChange } from "./points-ledger.util";

const TITLE_ACHIEVEMENTS: { titleId: number; type: string; value: number }[] = [
  // 기존 칭호
  { titleId: 1,  type: "raid_count",  value: 1 },
  { titleId: 2,  type: "attendance",  value: 3 },
  { titleId: 3,  type: "points",      value: 50 },
  { titleId: 4,  type: "raid_count",  value: 5 },
  { titleId: 5,  type: "attendance",  value: 20 },
  { titleId: 7,  type: "post_count",  value: 7 },
  { titleId: 8,  type: "raid_count",  value: 20 },
  { titleId: 9,  type: "streak",      value: 20 },
  { titleId: 10, type: "points",      value: 1000 },
  { titleId: 12, type: "raid_count",  value: 50 },
  { titleId: 13, type: "attendance",  value: 90 },
  { titleId: 14, type: "points",      value: 5000 },
  { titleId: 15, type: "post_count",  value: 50 },
  { titleId: 16, type: "raid_count",  value: 100 },
  { titleId: 17, type: "attendance",  value: 200 },
  { titleId: 18, type: "points",      value: 15000 },
  { titleId: 19, type: "streak",      value: 60 },
  { titleId: 20, type: "raid_count",  value: 200 },
  { titleId: 22, type: "post_count",  value: 1 },
  { titleId: 23, type: "streak",      value: 3 },
  { titleId: 24, type: "points",      value: 300 },
  { titleId: 25, type: "streak",      value: 7 },
  { titleId: 26, type: "post_count",  value: 20 },
  { titleId: 27, type: "attendance",  value: 60 },
  { titleId: 28, type: "streak",      value: 45 },
  { titleId: 30, type: "post_count",  value: 150 },
  // 배틀(콜로세움) 칭호
  { titleId: 31, type: "col_wins",    value: 1 },
  { titleId: 32, type: "col_wins",    value: 10 },
  { titleId: 33, type: "col_streak",  value: 3 },
  { titleId: 34, type: "col_wins",    value: 30 },
  { titleId: 35, type: "col_streak",  value: 5 },
  { titleId: 36, type: "col_points",  value: 1000 },
  { titleId: 37, type: "col_wins",    value: 75 },
  { titleId: 38, type: "col_streak",  value: 10 },
  { titleId: 39, type: "col_points",  value: 4000 },
  { titleId: 40, type: "col_wins",    value: 150 },
  { titleId: 41, type: "col_streak",     value: 15 },
  { titleId: 42, type: "col_points",     value: 8000 },
  // 로그라이크 / 원정 칭호
  { titleId: 48, type: "rogue_clears",   value: 1 },
  { titleId: 49, type: "expedition_count", value: 1 },
  { titleId: 50, type: "rogue_clears",   value: 3 },
  { titleId: 51, type: "expedition_count", value: 5 },
  { titleId: 52, type: "rogue_clears",   value: 10 },
  { titleId: 53, type: "expedition_count", value: 20 },
  { titleId: 54, type: "rogue_clears",   value: 25 },
  { titleId: 55, type: "expedition_count", value: 50 },
  { titleId: 56, type: "rogue_clears",   value: 50 },
  { titleId: 57, type: "expedition_count", value: 100 },
];

// Character rarity duplicate point values (mirrors frontend constants)
// 기존 값의 일부를 교배의 정수(breedingEssence)로 대체 — 중복 획득이 합성 재료로도 쌓이게 함
export const RARITY_DUPLICATE_POINTS: Record<string, number> = {
  common: 3,
  uncommon: 6,
  rare: 12,
  epic: 18,
  legendary: 35,
  mythic: 70,
};

export const RARITY_DUPLICATE_ESSENCE: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 5,
  legendary: 10,
  mythic: 20,
};

// 가챠로 뽑힐 수 있는 캐릭터 ID 목록(140종, 스타터/업적 전용 40종 제외) — 등급 정보는
// character-master.util의 마스터 맵에서 조회한다 (예전엔 여기 rarity를 직접 들고 있었음)
export const GACHA_POOL_IDS: number[] = [
  // Common (20)
  75, 76, 116, 125, 127, 139, 140, 152, 155, 156, 159, 174, 176, 205, 258, 275, 292, 333, 351, 391,
  // Uncommon (23)
  13, 14, 84, 90, 91, 105, 128, 132, 144, 153, 160, 161, 177, 221, 259, 276, 294, 304, 322, 352, 355, 377, 392,
  // Rare (24)
  26, 28, 29, 30, 96, 104, 117, 129, 163, 169, 173, 178, 179, 194, 240, 260, 271, 277, 287, 305, 323, 335, 378, 393,
  // Epic (26)
  41, 42, 43, 44, 99, 120, 121, 131, 136, 180, 206, 220, 238, 241, 252, 254, 272, 278, 288, 293, 306, 313, 324, 337, 372, 388,
  // Legendary (20)
  61, 135, 137, 154, 191, 216, 232, 233, 242, 253, 267, 273, 290, 307, 308, 331, 338, 349, 373, 389,
  // Mythic (27)
  64, 65, 66, 67, 69, 83, 150, 158, 172, 193, 204, 208, 235, 239, 243, 255, 268, 274, 291, 309, 332, 336, 339, 344, 350, 375, 390,
];

const GACHA_COST_SINGLE = 120;
const GACHA_COST_TEN = 1200;
const STARTER_IDS = [141, 11, 12];

// 도감 컴플리트 마일스톤 — 전체 수집 가능 캐릭터 180종 기준 (누적 보유 종 수)
const DEX_MILESTONES: { count: number; kp: number; normalEgg?: number; bigEgg?: number; goldenEgg?: number; stones?: number }[] = [
  { count: 25,  kp: 300 },
  { count: 50,  kp: 600,  normalEgg: 1 },
  { count: 75,  kp: 1000 },
  { count: 100, kp: 1500, bigEgg: 1 },
  { count: 125, kp: 2200 },
  { count: 150, kp: 3000, goldenEgg: 1 },
  { count: 175, kp: 4500 },
  { count: 180, kp: 8000, goldenEgg: 2, stones: 3 },
];

// Achievement definitions: which stat value unlocks which character
const ACHIEVEMENTS: { characterId: number; type: string; value: number }[] = [
  // ── Block 1 ───────────────────────────────────────────────
  { characterId: 4,   type: "raid_count", value: 1 },
  { characterId: 5,   type: "attendance", value: 3 },
  { characterId: 6,   type: "post_count", value: 2 },
  { characterId: 7,   type: "raid_count", value: 3 },
  { characterId: 8,   type: "attendance", value: 7 },
  { characterId: 9,   type: "post_count", value: 1 },
  { characterId: 16,  type: "live_count", value: 3 },
  { characterId: 17,  type: "streak",     value: 3 },
  { characterId: 18,  type: "points",     value: 100 },
  { characterId: 19,  type: "post_count", value: 3 },
  { characterId: 20,  type: "live_count", value: 1 },
  { characterId: 21,  type: "attendance", value: 14 },
  { characterId: 22,  type: "raid_count", value: 8 },
  { characterId: 31,  type: "raid_count", value: 12 },
  { characterId: 32,  type: "attendance", value: 21 },
  { characterId: 33,  type: "points",     value: 200 },
  { characterId: 34,  type: "attendance", value: 30 },
  { characterId: 35,  type: "streak",     value: 7 },
  { characterId: 36,  type: "post_count", value: 10 },
  { characterId: 37,  type: "live_count", value: 10 },
  { characterId: 38,  type: "points",     value: 500 },
  { characterId: 39,  type: "streak",     value: 14 },
  { characterId: 40,  type: "streak",     value: 21 },
  { characterId: 51,  type: "points",     value: 1000 },
  { characterId: 52,  type: "raid_count", value: 25 },
  { characterId: 53,  type: "attendance", value: 50 },
  { characterId: 54,  type: "post_count", value: 20 },
  { characterId: 55,  type: "post_count", value: 30 },
  { characterId: 56,  type: "streak",     value: 30 },
  { characterId: 57,  type: "points",     value: 2000 },
  { characterId: 58,  type: "live_count", value: 20 },
  { characterId: 59,  type: "attendance", value: 90 },
  { characterId: 60,  type: "raid_count", value: 20 },
  { characterId: 71,  type: "points",     value: 5000 },
  { characterId: 72,  type: "raid_count", value: 40 },
  { characterId: 73,  type: "attendance", value: 180 },
  { characterId: 74,  type: "streak",     value: 60 },
  { characterId: 75,  type: "post_count", value: 50 },
  { characterId: 76,  type: "post_count", value: 100 },
  { characterId: 91,  type: "points",     value: 50000 },
  // ── Block 2 ───────────────────────────────────────────────
  { characterId: 104, type: "raid_count", value: 2 },
  { characterId: 105, type: "attendance", value: 5 },
  { characterId: 116, type: "raid_count", value: 6 },
  { characterId: 117, type: "streak",     value: 10 },
  { characterId: 120, type: "live_count", value: 6 },
  { characterId: 121, type: "attendance", value: 28 },
  { characterId: 131, type: "live_count", value: 12 },
  { characterId: 132, type: "attendance", value: 42 },
  { characterId: 135, type: "streak",     value: 28 },
  { characterId: 136, type: "post_count", value: 15 },
  { characterId: 137, type: "raid_count", value: 22 },
  { characterId: 139, type: "streak",     value: 45 },
  { characterId: 140, type: "streak",     value: 50 },
  { characterId: 152, type: "live_count", value: 18 },
  { characterId: 153, type: "attendance", value: 75 },
  { characterId: 154, type: "post_count", value: 25 },
  { characterId: 155, type: "post_count", value: 40 },
  { characterId: 156, type: "streak",     value: 35 },
  { characterId: 158, type: "raid_count", value: 30 },
  { characterId: 159, type: "attendance", value: 120 },
  { characterId: 160, type: "live_count", value: 22 },
  { characterId: 172, type: "raid_count", value: 50 },
  { characterId: 173, type: "attendance", value: 270 },
  { characterId: 174, type: "streak",     value: 75 },
  { characterId: 176, type: "post_count", value: 120 },
  { characterId: 177, type: "points",     value: 15000 },
  { characterId: 178, type: "live_count", value: 50 },
  { characterId: 179, type: "attendance", value: 400 },
  { characterId: 180, type: "streak",     value: 120 },
  { characterId: 191, type: "points",     value: 75000 },
  { characterId: 193, type: "raid_count", value: 150 },
  { characterId: 194, type: "streak",     value: 400 },
  // ── Block 3 ───────────────────────────────────────────────
  { characterId: 204, type: "raid_count", value: 2 },
  { characterId: 205, type: "attendance", value: 6 },
  { characterId: 206, type: "post_count", value: 6 },
  { characterId: 208, type: "attendance", value: 12 },
  { characterId: 216, type: "raid_count", value: 7 },
  { characterId: 220, type: "live_count", value: 8 },
  { characterId: 221, type: "attendance", value: 35 },
  { characterId: 232, type: "attendance", value: 45 },
  { characterId: 233, type: "points",     value: 400 },
  { characterId: 235, type: "streak",     value: 15 },
  { characterId: 238, type: "points",     value: 900 },
  { characterId: 239, type: "streak",     value: 42 },
  { characterId: 240, type: "streak",     value: 55 },
  { characterId: 252, type: "live_count", value: 18 },
  { characterId: 253, type: "attendance", value: 80 },
  { characterId: 254, type: "post_count", value: 28 },
  { characterId: 255, type: "post_count", value: 45 },
  { characterId: 258, type: "raid_count", value: 35 },
  { characterId: 259, type: "attendance", value: 135 },
  { characterId: 260, type: "live_count", value: 25 },
  { characterId: 271, type: "points",     value: 12500 },
  { characterId: 272, type: "raid_count", value: 60 },
  { characterId: 273, type: "attendance", value: 300 },
  { characterId: 274, type: "streak",     value: 80 },
  { characterId: 275, type: "post_count", value: 75 },
  { characterId: 276, type: "post_count", value: 150 },
  { characterId: 277, type: "points",     value: 20000 },
  { characterId: 278, type: "live_count", value: 55 },
  { characterId: 291, type: "points",     value: 100000 },
  { characterId: 292, type: "raid_count", value: 110 },
  { characterId: 293, type: "raid_count", value: 170 },
  { characterId: 294, type: "streak",     value: 450 },
  // ── Block 4 ───────────────────────────────────────────────
  { characterId: 304, type: "raid_count", value: 3 },
  { characterId: 305, type: "attendance", value: 9 },
  { characterId: 306, type: "post_count", value: 9 },
  { characterId: 307, type: "live_count", value: 4 },
  { characterId: 308, type: "attendance", value: 16 },
  { characterId: 309, type: "streak",     value: 8 },
  { characterId: 322, type: "raid_count", value: 20 },
  { characterId: 331, type: "live_count", value: 15 },
  { characterId: 332, type: "attendance", value: 50 },
  { characterId: 333, type: "points",     value: 450 },
  { characterId: 335, type: "streak",     value: 18 },
  { characterId: 336, type: "post_count", value: 22 },
  { characterId: 337, type: "raid_count", value: 28 },
  { characterId: 338, type: "points",     value: 800 },
  { characterId: 339, type: "streak",     value: 48 },
  { characterId: 351, type: "points",     value: 2250 },
  { characterId: 352, type: "live_count", value: 22 },
  { characterId: 355, type: "post_count", value: 48 },
  { characterId: 372, type: "raid_count", value: 65 },
  { characterId: 373, type: "attendance", value: 330 },
  { characterId: 375, type: "post_count", value: 80 },
  { characterId: 377, type: "points",     value: 30000 },
  { characterId: 378, type: "live_count", value: 60 },
  { characterId: 391, type: "points",     value: 125000 },
  { characterId: 392, type: "raid_count", value: 120 },
  { characterId: 393, type: "raid_count", value: 180 },
];

export function pickGachaRarity(
  gachaRates: Record<string, number>,
  forceRareOrAbove = false,
  forceLegendaryOrAbove = false,
): string {
  if (forceLegendaryOrAbove) {
    return weightedRandom({ legendary: 85, mythic: 15 });
  }
  if (forceRareOrAbove) {
    return weightedRandom({ rare: 70, epic: 30 });
  }
  return weightedRandom(gachaRates);
}

export function weightedRandom(weights: Record<string, number>): string {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);
  let rand = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) return key;
  }
  return Object.keys(weights)[Object.keys(weights).length - 1];
}

function pickFromPool(rarity: string, masterMap: Map<number, CharacterMasterRow>): { id: number; rarity: string } {
  const pool = GACHA_POOL_IDS.filter((id) => (masterMap.get(id)?.rarity ?? "common") === rarity);
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { id, rarity };
}

export interface GachaPullResult {
  characterId: number;
  rarity: string;
  isDuplicate: boolean;
  bonusPoints: number;
  bonusEssence: number;
}

export interface GachaSimulationResult {
  results: GachaPullResult[];
  pity: number;
  legendaryPity: number;
  totalBonusPoints: number;
  totalBonusEssence: number;
}

/**
 * 가챠 확률/천장(pity) 핵심 로직 — 실제 재화 지급과 분리된 순수 함수라 DB 없이 유닛테스트 가능.
 * performGacha()가 조회한 상태(reward, 보유 캐릭터, 설정)를 그대로 넘겨받아 count번 굴리고
 * 최종 pity 상태와 결과 목록만 돌려준다. 여기 로직이 바뀌면 확률/천장 동작이 바뀌므로
 * rewards.service.spec.ts의 회귀 테스트가 반드시 커버해야 하는 지점.
 */
export function simulateGachaPulls(
  count: 1 | 10,
  config: GachaConfigValues,
  startPity: number,
  startLegendaryPity: number,
  ownedIds: ReadonlySet<number>,
  masterMap: Map<number, CharacterMasterRow>,
): GachaSimulationResult {
  const ownedSet = new Set(ownedIds);
  const results: GachaPullResult[] = [];
  let totalBonusPoints = 0;
  let totalBonusEssence = 0;
  let pity = startPity; // rare+ 보장 카운터 (consecutive non-rare)
  let legendaryPity = startLegendaryPity; // 천장 카운터 (관리자 설정 회차 후 레전더리+ 보장)

  for (let i = 0; i < count; i++) {
    const isLastInTen = count === 10 && i === 9;
    const hasRarePlus = results.some((r) =>
      ["rare", "epic", "legendary", "mythic"].includes(r.rarity),
    );
    // 10연: 마지막 자리에서 레어+ 없으면 강제 / 단일: 누적 pity가 설정 임계값 이상이면 다음 뽑기에서 강제
    const forceRare =
      (isLastInTen && !hasRarePlus) || (count === 1 && pity >= config.pityRareThreshold);
    // 천장: 설정 회차 누적 시 다음 뽑기에서 레전더리+ 확정
    const forceLegendary = legendaryPity >= config.pityLegendaryThreshold;

    const rarity = pickGachaRarity(config.gachaRates, forceRare, forceLegendary);
    const char = pickFromPool(rarity, masterMap);
    const isDuplicate = ownedSet.has(char.id);
    const bonusPoints = isDuplicate
      ? (RARITY_DUPLICATE_POINTS[rarity] ?? 0)
      : 0;
    const bonusEssence = isDuplicate
      ? (RARITY_DUPLICATE_ESSENCE[rarity] ?? 0)
      : 0;

    results.push({ characterId: char.id, rarity, isDuplicate, bonusPoints, bonusEssence });
    totalBonusPoints += bonusPoints;
    totalBonusEssence += bonusEssence;

    if (!isDuplicate) ownedSet.add(char.id);

    if (["legendary", "mythic"].includes(rarity)) {
      pity = 0;
      legendaryPity = 0; // 천장 리셋
    } else if (["rare", "epic"].includes(rarity)) {
      pity = 0;
      legendaryPity += 1;
    } else {
      pity += 1;
      legendaryPity += 1;
    }
  }

  return { results, pity, legendaryPity, totalBonusPoints, totalBonusEssence };
}

function eggDelta(eggType: EggType, delta: number) {
  if (eggType === "normal") return { normalEggs: { increment: delta } };
  if (eggType === "big") return { bigEggs: { increment: delta } };
  return { goldenEggs: { increment: delta } };
}
function eggCount(reward: { normalEggs: number; bigEggs: number; goldenEggs: number }, eggType: EggType): number {
  if (eggType === "normal") return reward.normalEggs;
  if (eggType === "big") return reward.bigEggs;
  return reward.goldenEggs;
}

interface RogueMilestone {
  clears: number;
  points: number;
  stones: number;
  normalEgg: number;
  bigEgg: number;
  goldEgg: number;
}

const ROGUE_MILESTONES_NORMAL: RogueMilestone[] = [
  { clears:   1, points:   500, stones: 0, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:   3, points:  1000, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:   5, points:  1500, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:  10, points:  2000, stones: 1, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  20, points:  3000, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  30, points:  3500, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  40, points:  4000, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  50, points:  4500, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  75, points:  5000, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 100, points:  5000, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 125, points:  5500, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 150, points:  5000, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
];
const ROGUE_MILESTONES_HARD: RogueMilestone[] = [
  { clears:   1, points:   800, stones: 0, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:   3, points:  1500, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:   5, points:  2000, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  10, points:  3000, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  20, points:  4500, stones: 3, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  30, points:  5000, stones: 3, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  40, points:  6000, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears:  50, points:  6500, stones: 3, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears:  75, points:  7500, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 100, points:  7500, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 125, points:  8000, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 150, points:  7500, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
];
const ROGUE_MILESTONES_HELL: RogueMilestone[] = [
  { clears:   1, points:  1000, stones: 0, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:   3, points:  2000, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:   5, points:  3000, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  10, points:  4000, stones: 3, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  20, points:  6000, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears:  30, points:  7000, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears:  40, points:  8000, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears:  50, points:  9000, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears:  75, points: 10000, stones: 5, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 100, points: 10000, stones: 5, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 125, points: 11000, stones: 5, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 150, points: 10000, stones: 5, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
];

function getRogueMilestones(prev: number, next: number, difficulty = "normal"): RogueMilestone[] {
  const table =
    difficulty === "hell" ? ROGUE_MILESTONES_HELL :
    difficulty === "hard" ? ROGUE_MILESTONES_HARD :
    ROGUE_MILESTONES_NORMAL;
  const hit = table.filter(m => m.clears > prev && m.clears <= next);
  // 150회 이후 매 50회 반복 보상 (난이도별 차등)
  const repeatPts   = difficulty === "hell" ? 10000 : difficulty === "hard" ? 7500 : 5000;
  const repeatSt    = difficulty === "hell" ? 6 : difficulty === "hard" ? 5 : 4;
  for (let n = 200; n <= next; n += 50) {
    if (n > prev) hit.push({ clears: n, points: repeatPts, stones: repeatSt, normalEgg: 0, bigEgg: 0, goldEgg: 1 });
  }
  return hit;
}

// 도전 모드 마일스톤 (clears = 도달 스테이지). 신기록 갱신 시 새로 넘은 구간만 지급
const CHALLENGE_MILESTONES: RogueMilestone[] = [
  { clears:   5, points:  500, stones: 0, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:  10, points: 1000, stones: 1, normalEgg: 1, bigEgg: 0, goldEgg: 0 },
  { clears:  20, points: 1800, stones: 1, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  30, points: 2600, stones: 2, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  50, points: 4000, stones: 3, normalEgg: 0, bigEgg: 1, goldEgg: 0 },
  { clears:  75, points: 5500, stones: 4, normalEgg: 0, bigEgg: 0, goldEgg: 1 },
  { clears: 100, points: 9000, stones: 6, normalEgg: 0, bigEgg: 0, goldEgg: 2 },
];
function getChallengeMilestones(prev: number, next: number): RogueMilestone[] {
  return CHALLENGE_MILESTONES.filter(m => m.clears > prev && m.clears <= next);
}

interface RankingRow {
  rank: number;
  userId: string;
  nickname: string;
  tierPoints: number;
  wins: number;
  winStreak: number;
  characterId: number | null;
}

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getOrCreateReward(userId: string) {
    let reward = await this.prisma.userReward.findUnique({ where: { userId } });
    if (!reward) {
      reward = await this.prisma.userReward.create({ data: { userId } });
    }
    return reward;
  }

  async recordAttendance(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return;
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  // ─── 원정 (서버 권위 상태 — 보상은 클라이언트가 아닌 서버가 계산) ──────────────────
  private formatExpedition(exp: {
    regionId: string; partyIds: unknown; startTime: Date; durationHours: number;
    eventTemplateId: string | null; eventBonusMult: number | null;
  }) {
    return {
      regionId: exp.regionId,
      partyIds: exp.partyIds as number[],
      startTime: exp.startTime.getTime(),
      durationHours: exp.durationHours,
      durationMs: exp.durationHours * 3600000,
      eventTemplateId: exp.eventTemplateId,
      eventBonusMult: exp.eventBonusMult,
    };
  }

  async startExpedition(userId: string, regionId: string, partyIds: number[], durationHours: number) {
    const region = getExpeditionRegion(regionId);
    if (!region) throw new BadRequestException("존재하지 않는 지역입니다.");
    if (!(durationHours in EXPEDITION_DURATIONS)) {
      throw new BadRequestException("올바르지 않은 원정 시간입니다.");
    }

    const existing = await this.prisma.expedition.findUnique({ where: { userId } });
    if (existing) throw new BadRequestException("이미 진행 중인 원정이 있습니다.");

    const reward = await this.getOrCreateReward(userId);
    if (region.unlockRaidCount > 0 && reward.raidCount < region.unlockRaidCount) {
      throw new BadRequestException("아직 해금되지 않은 지역입니다.");
    }

    const uniqueParty = [...new Set(partyIds)];
    if (uniqueParty.length < region.minParty || uniqueParty.length > 5) {
      throw new BadRequestException("원정대 인원이 올바르지 않습니다.");
    }
    const owned = await this.prisma.userCharacter.findMany({
      where: { userId, characterId: { in: uniqueParty } },
      select: { characterId: true },
    });
    if (owned.length !== uniqueParty.length) {
      throw new BadRequestException("보유하지 않은 케보몬이 포함되어 있습니다.");
    }
    const masterMap = await loadCharacterMasterMap(this.prisma);
    for (const id of uniqueParty) {
      if (!rarityAtLeast(masterMap.get(id)?.rarity ?? "common", region.minRarity)) {
        throw new BadRequestException("등급 조건을 만족하지 않는 케보몬이 있습니다.");
      }
    }

    const expedition = await this.prisma.expedition.create({
      data: { userId, regionId, partyIds: uniqueParty, startTime: new Date(), durationHours },
    });
    return this.formatExpedition(expedition);
  }

  /** 진행 중인 원정 조회 — 50% 경과 시 이 시점에서 랜덤 이벤트를 지연 확정(lazy) 시킴 */
  async getExpeditionState(userId: string) {
    const exp = await this.prisma.expedition.findUnique({ where: { userId } });
    if (!exp) return null;
    if (!exp.eventTemplateId) {
      const elapsed = Date.now() - exp.startTime.getTime();
      if (elapsed >= exp.durationHours * 3600000 * EXPEDITION_EVENT_TRIGGER_RATIO) {
        const templateId = EXPEDITION_EVENT_IDS[Math.floor(Math.random() * EXPEDITION_EVENT_IDS.length)];
        const updated = await this.prisma.expedition.update({
          where: { userId },
          data: { eventTemplateId: templateId },
        });
        return this.formatExpedition(updated);
      }
    }
    return this.formatExpedition(exp);
  }

  async resolveExpeditionEvent(userId: string, risky: boolean) {
    const exp = await this.prisma.expedition.findUnique({ where: { userId } });
    if (!exp) throw new BadRequestException("진행 중인 원정이 없습니다.");
    if (!exp.eventTemplateId) throw new BadRequestException("아직 이벤트가 발생하지 않았습니다.");
    if (exp.eventBonusMult !== null) throw new BadRequestException("이미 선택을 완료했습니다.");

    const mult = risky ? rollExpeditionRiskyMult() : EXPEDITION_EVENT_SAFE_MULT;
    await this.prisma.expedition.update({ where: { userId }, data: { eventBonusMult: mult } });
    return { eventBonusMult: mult };
  }

  async completeExpedition(userId: string) {
    const exp = await this.prisma.expedition.findUnique({ where: { userId } });
    if (!exp) throw new BadRequestException("진행 중인 원정이 없습니다.");
    const elapsed = Date.now() - exp.startTime.getTime();
    if (elapsed < exp.durationHours * 3600000) {
      throw new BadRequestException("아직 원정이 끝나지 않았습니다.");
    }

    const region = getExpeditionRegion(exp.regionId)!;
    const durationMultiplier = EXPEDITION_DURATIONS[exp.durationHours] ?? 1;
    const partyIds = exp.partyIds as number[];
    const currentReward = await this.getOrCreateReward(userId);
    const dexBonusMult = getDexCompletionBonus(currentReward.dexMilestoneBest);
    const base = calcExpeditionReward(region, partyIds.length, durationMultiplier, dexBonusMult);
    const eventMult = exp.eventBonusMult ?? 1;
    const rewards = eventMult === 1 ? base : {
      points:    Math.round(base.points * eventMult),
      stones:    Math.round(base.stones * eventMult),
      normalEgg: Math.round(base.normalEgg * eventMult),
      bigEgg:    Math.round(base.bigEgg * eventMult),
      goldEgg:   Math.round(base.goldEgg * eventMult),
    };

    const [updatedReward] = await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data: {
          expeditionCount:   { increment: 1 },
          missionPoints:     { increment: rewards.points },
          enhancementStones: { increment: rewards.stones },
          normalEggs:        { increment: rewards.normalEgg },
          bigEggs:           { increment: rewards.bigEgg },
          goldenEggs:        { increment: rewards.goldEgg },
        },
      }),
      this.prisma.expedition.delete({ where: { userId } }),
    ]);
    void logPointsChange(this.prisma, userId, rewards.points, "원정 완료 보상");

    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);

    return { ...rewards, expeditionCount: updatedReward.expeditionCount, dexBonusMult };
  }

  // 로그라이크 한 판을 실제로 플레이하는 데 걸리는 최소 시간 — 이보다 빨리 complete가
  // 들어오면 클라이언트 검증 없이 반복 호출해 보상만 채굴하는 것으로 간주해 거부한다.
  private static readonly MIN_ROGUE_RUN_MS = 60_000;

  /** 로그라이크/도전 모드 런 시작 기록 — 이후 complete/submit에서 경과 시간을 검증하는 데 사용 */
  async startRun(userId: string) {
    await this.getOrCreateReward(userId);
    const startedAt = new Date();
    await this.prisma.userReward.update({
      where: { userId },
      data: { activeRunStartedAt: startedAt },
    });
    return { startedAt: startedAt.toISOString() };
  }

  async completeRogue(userId: string, difficulty = "normal") {
    const reward = await this.getOrCreateReward(userId);
    if (!reward.activeRunStartedAt) {
      throw new BadRequestException("시작되지 않은 런입니다.");
    }
    const elapsed = Date.now() - reward.activeRunStartedAt.getTime();
    if (elapsed < RewardsService.MIN_ROGUE_RUN_MS) {
      throw new BadRequestException("비정상적으로 빠른 진행입니다.");
    }
    const prevClears = reward.rogueClears;

    const updated = await this.prisma.userReward.update({
      where: { userId },
      data: { rogueClears: { increment: 1 }, activeRunStartedAt: null },
    });
    const newClears = updated.rogueClears;

    const milestones = getRogueMilestones(prevClears, newClears, difficulty);
    if (milestones.length > 0) {
      const pts     = milestones.reduce((s, m) => s + m.points,    0);
      const stones  = milestones.reduce((s, m) => s + m.stones,    0);
      const normals = milestones.reduce((s, m) => s + m.normalEgg, 0);
      const bigs    = milestones.reduce((s, m) => s + m.bigEgg,    0);
      const golds   = milestones.reduce((s, m) => s + m.goldEgg,   0);
      await this.prisma.userReward.update({
        where: { userId },
        data: {
          missionPoints:     { increment: pts },
          enhancementStones: { increment: stones },
          normalEggs:        { increment: normals },
          bigEggs:           { increment: bigs },
          goldenEggs:        { increment: golds },
        },
      });
      void logPointsChange(this.prisma, userId, pts, "로그라이크 마일스톤 보상");
    }

    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);
    void this.markQuestDone(userId, "battle").catch(() => undefined);
    void this.incrementWeeklyQuestProgress(userId, "battle").catch(() => undefined);

    return { rogueClears: newClears, milestones };
  }

  /** 도전 모드 결과 제출 — 도달 스테이지가 신기록이면 갱신 + 마일스톤 보상 */
  async submitChallenge(userId: string, stage: number) {
    const s = Math.max(0, Math.min(100, Math.floor(Number(stage) || 0)));
    const reward = await this.getOrCreateReward(userId);
    if (!reward.activeRunStartedAt) {
      throw new BadRequestException("시작되지 않은 도전입니다.");
    }
    const prevBest = reward.challengeBest;
    let challengeBest = prevBest;
    let milestones: RogueMilestone[] = [];

    if (s > prevBest) {
      const updated = await this.prisma.userReward.update({
        where: { userId },
        data: { challengeBest: s, activeRunStartedAt: null },
      });
      challengeBest = updated.challengeBest;
      milestones = getChallengeMilestones(prevBest, s);
      if (milestones.length > 0) {
        const pts     = milestones.reduce((a, m) => a + m.points,    0);
        const stones  = milestones.reduce((a, m) => a + m.stones,    0);
        const normals = milestones.reduce((a, m) => a + m.normalEgg, 0);
        const bigs    = milestones.reduce((a, m) => a + m.bigEgg,    0);
        const golds   = milestones.reduce((a, m) => a + m.goldEgg,   0);
        await this.prisma.userReward.update({
          where: { userId },
          data: {
            missionPoints:     { increment: pts },
            enhancementStones: { increment: stones },
            normalEggs:        { increment: normals },
            bigEggs:           { increment: bigs },
            goldenEggs:        { increment: golds },
          },
        });
        void logPointsChange(this.prisma, userId, pts, "도전 모드 마일스톤 보상");
      }
    } else {
      await this.prisma.userReward.update({
        where: { userId },
        data: { activeRunStartedAt: null },
      });
    }

    return { challengeBest, prevBest, stage: s, isNewRecord: s > prevBest, milestones };
  }

  /** 도전 모드 역대 최고 기록 랭킹 (상위 20명) */
  async getChallengeRankings() {
    const rows = await this.prisma.userReward.findMany({
      where: { challengeBest: { gt: 0 } },
      take: 20,
      orderBy: { challengeBest: "desc" },
      select: {
        userId: true,
        challengeBest: true,
        equippedCharacterId: true,
        user: { select: { name: true } },
      },
    });
    const rankings = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: r.user?.name ?? "???",
      best: r.challengeBest,
      characterId: r.equippedCharacterId ?? null,
    }));
    return { rankings };
  }

  async incrementLiveCount(userId: string): Promise<void> {
    await this.getOrCreateReward(userId);
    await this.prisma.userReward.update({
      where: { userId },
      data: { liveCount: { increment: 1 } },
    });
    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);
  }

  /** 출석 버튼 클릭 — 하루 1회, 월 단위 출석판, 7일마다 알 지급 */
  async claimAttendance(userId: string): Promise<{
    alreadyClaimed: boolean;
    points: number;
    streakDays: number;
    attendanceDays: number;
    monthDays: number;
    monthWeekRewards: number;
    eggReward: "big" | "golden" | null;
    newlyUnlockedAchievements: number[];
  }> {
    const todayKTC = getTodayKTC();
    const currentMonthKey = todayKTC.slice(0, 7); // "YYYY-MM"

    const reward = await this.getOrCreateReward(userId);

    if (reward.lastAttendanceDate === todayKTC) {
      return { alreadyClaimed: true, points: 0, streakDays: reward.streakDays, attendanceDays: reward.attendanceDays, monthDays: reward.monthDays, monthWeekRewards: reward.monthWeekRewards, eggReward: null, newlyUnlockedAchievements: [] };
    }

    // 월 바뀌면 monthDays·monthWeekRewards 리셋
    const monthReset = reward.monthKey !== currentMonthKey;
    const prevMonthDays = monthReset ? 0 : reward.monthDays;
    const prevWeekRewards = monthReset ? 0 : reward.monthWeekRewards;

    const yesterdayKTC = getYesterdayKTC();
    const isConsecutive = !monthReset && reward.lastAttendanceDate === yesterdayKTC;
    const newStreak = isConsecutive ? reward.streakDays + 1 : 1;

    const pointOptions = [50, 100, 150];
    const basePoints = pointOptions[Math.floor(Math.random() * pointOptions.length)];
    const streakBonus = isConsecutive && newStreak > 1 ? 20 : 0;
    const points = basePoints + streakBonus;

    const newMonthDays = prevMonthDays + 1;

    // 7일 단위 알 보상 체크 (주차별: 1~2주=큰알, 3~4주=황금알)
    let eggReward: "big" | "golden" | null = null;
    let newWeekRewards = prevWeekRewards;
    const weekIndex = Math.floor((newMonthDays - 1) / 7); // 0-based: 0=1주차, 1=2주차, 2=3주차, 3=4주차
    const weekBit = 1 << weekIndex;
    if (newMonthDays % 7 === 0 && weekIndex < 4 && !(prevWeekRewards & weekBit)) {
      eggReward = weekIndex < 2 ? "big" : "golden";
      newWeekRewards |= weekBit;
    }

    const eggUpdate = eggReward === "big" ? { bigEggs: { increment: 1 } } : eggReward === "golden" ? { goldenEggs: { increment: 1 } } : {};

    const updated = await this.prisma.userReward.update({
      where: { userId },
      data: {
        attendanceDays: { increment: 1 },
        streakDays: newStreak,
        missionPoints: { increment: points },
        lastAttendanceDate: todayKTC,
        monthKey: currentMonthKey,
        monthDays: newMonthDays,
        monthWeekRewards: newWeekRewards,
        ...eggUpdate,
      },
    });
    void logPointsChange(this.prisma, userId, points, "출석 체크 보상");
    void this.markQuestDone(userId, "login").catch(() => undefined);
    void this.incrementWeeklyQuestProgress(userId, "login").catch(() => undefined);

    const newlyUnlockedAchievements = await this.grantAchievementsAndTitles(userId);

    return {
      alreadyClaimed: false,
      points,
      streakDays: updated.streakDays,
      attendanceDays: updated.attendanceDays,
      monthDays: updated.monthDays,
      monthWeekRewards: updated.monthWeekRewards,
      eggReward,
      newlyUnlockedAchievements,
    };
  }

  async getSummary(userId: string) {
    const reward = await this.getOrCreateReward(userId);

    const ownedChars = await this.prisma.userCharacter.findMany({
      where: { userId },
      select: { characterId: true, enhancementLevel: true },
    });

    const ownedTitles = await this.prisma.userTitle.findMany({
      where: { userId },
      select: { titleId: true },
    });

    const ownedBorders = await this.prisma.userBorder.findMany({
      where: { userId },
      select: { borderId: true },
    });

    const todayKTC = getTodayKTC();
    const yesterdayKTC = getYesterdayKTC();
    // 오늘 또는 어제 출석한 경우에만 연속 기록 유효 — 그 외엔 0
    const effectiveStreak =
      reward.lastAttendanceDate === todayKTC || reward.lastAttendanceDate === yesterdayKTC
        ? reward.streakDays
        : 0;
    return {
      attendanceDays: reward.attendanceDays,
      missionPoints: reward.missionPoints,
      streakDays: effectiveStreak,
      equippedCharacterId: reward.equippedCharacterId,
      equippedTitleId: reward.equippedTitleId,
      equippedBorderId: reward.equippedBorderId,
      ownedCharacterIds: ownedChars.map((c) => c.characterId),
      ownedTitleIds: ownedTitles.map((t) => t.titleId),
      ownedBorderIds: ownedBorders.map((b) => b.borderId),
      gachaPityCount: reward.gachaPityCount,
      legendaryPityCount: reward.legendaryPityCount,
      totalPointsUsed: reward.totalPointsUsed,
      normalEggs: reward.normalEggs,
      bigEggs: reward.bigEggs,
      goldenEggs: reward.goldenEggs,
      enhancementStones: reward.enhancementStones,
      breedingEssence: reward.breedingEssence,
      raidCount: reward.raidCount,
      liveCount: reward.liveCount,
      expeditionCount: reward.expeditionCount,
      rogueClears: reward.rogueClears,
      dexMilestoneBest: reward.dexMilestoneBest,
      attendanceClaimedToday: reward.lastAttendanceDate === todayKTC,
      monthDays: reward.monthKey === todayKTC.slice(0, 7) ? reward.monthDays : 0,
      monthWeekRewards: reward.monthKey === todayKTC.slice(0, 7) ? reward.monthWeekRewards : 0,
      characterEnhancements: Object.fromEntries(ownedChars.map((c) => [c.characterId, c.enhancementLevel])),
    };
  }

  // ─── 일일 퀘스트 (하루 4개 체크리스트 — achievements/titles처럼 하드코딩, 관리자 편집 불가) ──
  private static readonly DAILY_QUEST_KEYS = ["login", "gacha", "battle", "community"] as const;
  private static readonly DAILY_QUEST_BONUS_POINTS = 80;
  private static readonly DAILY_QUEST_META = {
    login: {
      title: "접속 확인",
      description: "오늘 서비스에 접속하면 완료됩니다.",
      action: "로그인 또는 세션 갱신",
    },
    gacha: {
      title: "뽑기 이용",
      description: "뽑기를 1회 이상 이용하면 완료됩니다.",
      action: "뽑기 1회 이상",
    },
    battle: {
      title: "전투 콘텐츠 참여",
      description: "전투 계열 콘텐츠를 1회 이상 진행하면 완료됩니다.",
      action: "전투 1회 이상",
    },
    community: {
      title: "커뮤니티 활동",
      description: "게시글 또는 댓글을 작성하면 완료됩니다.",
      action: "게시글/댓글 1회",
    },
  } as const;
  private static readonly DAILY_QUEST_COLUMN = {
    login: "loginDone",
    gacha: "gachaDone",
    battle: "battleDone",
    community: "communityDone",
  } as const;

  /** 오늘자 행을 조회하고 없으면 생성 — upsert라 동시에 여러 요청이 첫 행을 만들려 해도 안전 */
  private async getOrCreateTodayQuestRow(userId: string) {
    const dateKey = getTodayKTC();
    return this.prisma.dailyQuestProgress.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      create: { userId, dateKey },
      update: {},
    });
  }

  private toQuestProgress(row: {
    loginDone: boolean;
    gachaDone: boolean;
    battleDone: boolean;
    communityDone: boolean;
  }) {
    return { login: row.loginDone, gacha: row.gachaDone, battle: row.battleDone, community: row.communityDone };
  }

  async getTodayQuests(userId: string) {
    const row = await this.getOrCreateTodayQuestRow(userId);
    const progress = this.toQuestProgress(row);
    const allDone = RewardsService.DAILY_QUEST_KEYS.every((k) => progress[k]);
    const items = RewardsService.DAILY_QUEST_KEYS.map((key) => ({
      key,
      ...RewardsService.DAILY_QUEST_META[key],
      done: progress[key],
      rewardPointHint: allDone ? RewardsService.DAILY_QUEST_BONUS_POINTS : 0,
    }));
    return {
      progress,
      items,
      allDone,
      bonusClaimed: row.bonusClaimed,
      reward: { points: RewardsService.DAILY_QUEST_BONUS_POINTS, claimType: "all_done" },
    };
  }

  /**
   * 퀘스트 항목 완료 처리(idempotent) — 액션 발생 지점에서 fire-and-forget으로 호출.
   * 컬럼 하나만 직접 SET하는 upsert라 다른 퀘스트가 거의 동시에 완료돼도 서로의 값을
   * 덮어쓰지 않는다 (JSON 컬럼을 읽어서 통째로 다시 쓰는 방식의 레이스를 피함).
   */
  async markQuestDone(userId: string, questKey: (typeof RewardsService.DAILY_QUEST_KEYS)[number]) {
    const dateKey = getTodayKTC();
    const column = RewardsService.DAILY_QUEST_COLUMN[questKey];
    await this.prisma.dailyQuestProgress.upsert({
      where: { userId_dateKey: { userId, dateKey } },
      create: { userId, dateKey, [column]: true },
      update: { [column]: true },
    });
  }

  async claimQuestBonus(userId: string) {
    const row = await this.getOrCreateTodayQuestRow(userId);
    const progress = this.toQuestProgress(row);
    const allDone = RewardsService.DAILY_QUEST_KEYS.every((k) => progress[k]);
    if (!allDone) throw new BadRequestException("아직 모든 퀘스트를 완료하지 않았습니다.");
    if (row.bonusClaimed) throw new BadRequestException("이미 보상을 받았습니다.");

    // bonusClaimed=false 조건을 WHERE에 걸어 원자적으로 선점 — 동시에 두 번 호출돼도
    // 딱 한 요청만 count=1을 받아 포인트를 지급하고, 나머지는 0을 받아 거부됨(중복 지급 방지)
    await this.getOrCreateReward(userId);
    const claimed = await this.prisma.dailyQuestProgress.updateMany({
      where: { id: row.id, bonusClaimed: false },
      data: { bonusClaimed: true },
    });
    if (claimed.count === 0) {
      throw new BadRequestException("이미 보상을 받았습니다.");
    }
    await this.prisma.userReward.update({
      where: { userId },
      data: { missionPoints: { increment: RewardsService.DAILY_QUEST_BONUS_POINTS } },
    });
    void logPointsChange(this.prisma, userId, RewardsService.DAILY_QUEST_BONUS_POINTS, "일일 퀘스트 보너스");

    void this.notifications
      .create({
        userId,
        type: "quest",
        title: "일일 퀘스트 완료!",
        body: `모든 일일 퀘스트를 완료해 ${RewardsService.DAILY_QUEST_BONUS_POINTS}P를 받았습니다.`,
        titleJa: "デイリークエスト達成！",
        bodyJa: `すべてのデイリークエストを達成し、${RewardsService.DAILY_QUEST_BONUS_POINTS}Pを獲得しました。`,
        titleEn: "Daily Quests Complete!",
        bodyEn: `You completed all daily quests and earned ${RewardsService.DAILY_QUEST_BONUS_POINTS}P.`,
      })
      .catch(() => undefined);

    const newlyUnlockedAchievements = await this.grantAchievementsAndTitles(userId);

    return {
      points: RewardsService.DAILY_QUEST_BONUS_POINTS,
      newlyUnlockedAchievements,
      rewardPresentation: {
        title: "일일 퀘스트 보상 수령",
        points: RewardsService.DAILY_QUEST_BONUS_POINTS,
      },
    };
  }

  // ─── 주간 퀘스트 (일일 퀘스트와 동일한 4개 항목, 주 단위 누적 카운트 + 더 큰 보상) ──
  private static readonly WEEKLY_QUEST_TARGETS = { login: 5, gacha: 3, battle: 10, community: 3 } as const;
  private static readonly WEEKLY_QUEST_BONUS_POINTS = 400;
  private static readonly WEEKLY_ROTATIONS = [
    {
      id: "core-loop",
      title: "기본 이용 순환",
      description: "접속, 보상, 전투, 커뮤니티 활동을 균형 있게 진행합니다.",
      focus: ["login", "gacha", "battle", "community"],
    },
    {
      id: "combat-community",
      title: "참여 강화 순환",
      description: "전투 참여와 커뮤니티 상호작용 비중을 높여 진행합니다.",
      focus: ["battle", "community"],
    },
    {
      id: "collection-loop",
      title: "수집 강화 순환",
      description: "접속 유지와 보상 사용 흐름을 중심으로 진행합니다.",
      focus: ["login", "gacha"],
    },
  ] as const;
  private static readonly WEEKLY_QUEST_COLUMN = {
    login: "loginCount",
    gacha: "gachaCount",
    battle: "battleCount",
    community: "communityCount",
  } as const;

  private async getOrCreateThisWeekRow(userId: string) {
    const weekKey = getIsoWeekKey(new Date());
    return this.prisma.weeklyQuestProgress.upsert({
      where: { userId_weekKey: { userId, weekKey } },
      create: { userId, weekKey },
      update: {},
    });
  }

  private toWeeklyProgress(row: {
    loginCount: number;
    gachaCount: number;
    battleCount: number;
    communityCount: number;
  }) {
    return { login: row.loginCount, gacha: row.gachaCount, battle: row.battleCount, community: row.communityCount };
  }

  async getThisWeekQuests(userId: string) {
    const row = await this.getOrCreateThisWeekRow(userId);
    const progress = this.toWeeklyProgress(row);
    const targets = RewardsService.WEEKLY_QUEST_TARGETS;
    const allDone = (Object.keys(targets) as (keyof typeof targets)[]).every((k) => progress[k] >= targets[k]);
    const rotation = RewardsService.WEEKLY_ROTATIONS[
      Math.abs(row.weekKey.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % RewardsService.WEEKLY_ROTATIONS.length
    ];
    const items = RewardsService.DAILY_QUEST_KEYS.map((key) => ({
      key,
      ...RewardsService.DAILY_QUEST_META[key],
      count: progress[key],
      target: targets[key],
      done: progress[key] >= targets[key],
      focused: (rotation.focus as readonly string[]).includes(key),
    }));
    return {
      progress,
      targets,
      items,
      rotation,
      allDone,
      bonusClaimed: row.bonusClaimed,
      reward: { points: RewardsService.WEEKLY_QUEST_BONUS_POINTS, claimType: "all_done" },
    };
  }

  /** 일일 퀘스트의 markQuestDone과 나란히 호출되는 주간 카운터 증가 — 컬럼 단위 increment라 레이스에 안전 */
  async incrementWeeklyQuestProgress(userId: string, questKey: (typeof RewardsService.DAILY_QUEST_KEYS)[number]) {
    const weekKey = getIsoWeekKey(new Date());
    const column = RewardsService.WEEKLY_QUEST_COLUMN[questKey];
    await this.prisma.weeklyQuestProgress.upsert({
      where: { userId_weekKey: { userId, weekKey } },
      create: { userId, weekKey, [column]: 1 },
      update: { [column]: { increment: 1 } },
    });
  }

  async claimWeeklyQuestBonus(userId: string) {
    const row = await this.getOrCreateThisWeekRow(userId);
    const progress = this.toWeeklyProgress(row);
    const targets = RewardsService.WEEKLY_QUEST_TARGETS;
    const allDone = (Object.keys(targets) as (keyof typeof targets)[]).every((k) => progress[k] >= targets[k]);
    if (!allDone) throw new BadRequestException("아직 모든 주간 퀘스트를 완료하지 않았습니다.");
    if (row.bonusClaimed) throw new BadRequestException("이미 보상을 받았습니다.");

    await this.getOrCreateReward(userId);
    const claimed = await this.prisma.weeklyQuestProgress.updateMany({
      where: { id: row.id, bonusClaimed: false },
      data: { bonusClaimed: true },
    });
    if (claimed.count === 0) {
      throw new BadRequestException("이미 보상을 받았습니다.");
    }
    await this.prisma.userReward.update({
      where: { userId },
      data: { missionPoints: { increment: RewardsService.WEEKLY_QUEST_BONUS_POINTS } },
    });
    void logPointsChange(this.prisma, userId, RewardsService.WEEKLY_QUEST_BONUS_POINTS, "주간 퀘스트 보너스");

    void this.notifications
      .create({
        userId,
        type: "quest",
        title: "주간 퀘스트 완료!",
        body: `모든 주간 퀘스트를 완료해 ${RewardsService.WEEKLY_QUEST_BONUS_POINTS}P를 받았습니다.`,
        titleJa: "ウィークリークエスト達成！",
        bodyJa: `すべてのウィークリークエストを達成し、${RewardsService.WEEKLY_QUEST_BONUS_POINTS}Pを獲得しました。`,
        titleEn: "Weekly Quests Complete!",
        bodyEn: `You completed all weekly quests and earned ${RewardsService.WEEKLY_QUEST_BONUS_POINTS}P.`,
      })
      .catch(() => undefined);

    const newlyUnlockedAchievements = await this.grantAchievementsAndTitles(userId);

    return {
      points: RewardsService.WEEKLY_QUEST_BONUS_POINTS,
      newlyUnlockedAchievements,
      rewardPresentation: {
        title: "주간 퀘스트 보상 수령",
        points: RewardsService.WEEKLY_QUEST_BONUS_POINTS,
      },
    };
  }

  // ─── 포인트 상점 ─────────────────────────────────────────────────────────────
  private static readonly SHOP_ITEMS: Record<string, { price: number; label: string }> = {
    enhancement_stone: { price: 600, label: "강화석" },
  };

  async buyShopItem(userId: string, itemId: string, quantity = 1) {
    const item = RewardsService.SHOP_ITEMS[itemId];
    if (!item) throw new BadRequestException("유효하지 않은 상품입니다.");
    if (quantity < 1 || quantity > 99) throw new BadRequestException("구매 수량이 올바르지 않습니다.");

    const totalCost = item.price * quantity;
    const reward = await this.getOrCreateReward(userId);
    if (reward.missionPoints < totalCost) throw new BadRequestException("포인트가 부족합니다.");

    const updated = await this.prisma.userReward.update({
      where: { userId },
      data: {
        missionPoints:     { decrement: totalCost },
        totalPointsUsed:   { increment: totalCost },
        enhancementStones: { increment: quantity },
      },
    });
    void logPointsChange(this.prisma, userId, -totalCost, `상점 구매 (${item.label} x${quantity})`);

    return { success: true, enhancementStones: updated.enhancementStones, remainingPoints: updated.missionPoints };
  }

  // ─── 케보몬 강화 ─────────────────────────────────────────────────────────────
  private static readonly MAX_ENHANCE: Record<string, number> = {
    common: 3, uncommon: 3, rare: 4, epic: 4, legendary: 5, mythic: 6,
  };
  private static readonly ENHANCE_RATES = [1.0, 0.9, 0.8, 0.6, 0.4, 0.2]; // +1 ~ +6

  async enhanceCharacter(userId: string, characterId: number) {
    const reward = await this.getOrCreateReward(userId);
    const charRecord = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    if (!charRecord) throw new BadRequestException("해당 캐릭터를 보유하고 있지 않습니다.");

    const masterMap = await loadCharacterMasterMap(this.prisma);
    const rarity   = masterMap.get(characterId)?.rarity ?? "common";
    const maxLevel = RewardsService.MAX_ENHANCE[rarity] ?? 3;
    if (charRecord.enhancementLevel >= maxLevel) throw new BadRequestException("최대 강화 단계입니다.");

    const nextLevel = charRecord.enhancementLevel + 1;
    const cost      = nextLevel;
    if (reward.enhancementStones < cost) throw new BadRequestException("강화석이 부족합니다.");

    const rate    = RewardsService.ENHANCE_RATES[nextLevel - 1] ?? 0.1;
    const success = Math.random() < rate;

    const [updatedReward, updatedChar] = await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data:  { enhancementStones: { decrement: cost } },
      }),
      this.prisma.userCharacter.update({
        where: { userId_characterId: { userId, characterId } },
        data:  { enhancementLevel: success ? nextLevel : charRecord.enhancementLevel },
      }),
    ]);

    return {
      success,
      newLevel: updatedChar.enhancementLevel,
      remainingStones: updatedReward.enhancementStones,
      nextLevel,
      rate,
    };
  }

  // ─── 케보몬 교배(합성) ───────────────────────────────────────────────────
  private static readonly BREEDING_ESSENCE_COST: Record<string, number> = {
    common: 8, uncommon: 15, rare: 30, epic: 60, legendary: 150, mythic: 400,
  };

  /** 정수를 소모해 선택한 등급의 "미보유" 케보몬 1종을 확정 랜덤 지급 */
  async breedCharacter(userId: string, rarity: string) {
    if (!(RARITIES as readonly string[]).includes(rarity)) {
      throw new BadRequestException("유효하지 않은 등급입니다.");
    }

    const reward = await this.getOrCreateReward(userId);
    const cost = RewardsService.BREEDING_ESSENCE_COST[rarity] ?? 0;
    if (reward.breedingEssence < cost) {
      throw new BadRequestException(
        `정수가 부족합니다. 필요: ${cost}, 보유: ${reward.breedingEssence}`,
      );
    }

    const owned = await this.prisma.userCharacter.findMany({
      where: { userId },
      select: { characterId: true },
    });
    const ownedSet = new Set(owned.map((c) => c.characterId));
    const masterMap = await loadCharacterMasterMap(this.prisma);

    const candidates = GACHA_POOL_IDS.filter(
      (id) => masterMap.get(id)?.rarity === rarity && !ownedSet.has(id),
    );
    if (candidates.length === 0) {
      throw new BadRequestException("이미 해당 등급의 케보몬을 모두 보유하고 있습니다.");
    }

    const characterId = candidates[Math.floor(Math.random() * candidates.length)];

    const [updatedReward] = await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data: { breedingEssence: { decrement: cost } },
      }),
      this.prisma.userCharacter.create({ data: { userId, characterId } }),
    ]);

    void this.checkAndGrantAchievements(userId).catch(() => undefined);

    return {
      characterId,
      rarity,
      remainingEssence: updatedReward.breedingEssence,
    };
  }

  async selectStarter(userId: string, characterId: number) {
    if (!STARTER_IDS.includes(characterId)) {
      throw new BadRequestException("유효한 스타팅 캐릭터가 아닙니다.");
    }

    const alreadyOwnsStarter = await this.prisma.userCharacter.findFirst({
      where: { userId, characterId: { in: STARTER_IDS } },
    });
    if (alreadyOwnsStarter) {
      throw new BadRequestException("이미 스타팅 캐릭터를 선택했습니다.");
    }

    await this.prisma.$transaction([
      this.prisma.userCharacter.create({ data: { userId, characterId } }),
      this.prisma.userReward.upsert({
        where: { userId },
        create: { userId, equippedCharacterId: characterId },
        update: { equippedCharacterId: characterId },
      }),
    ]);

    return { characterId };
  }

  async equipCharacter(userId: string, characterId: number) {
    const owned = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    if (!owned) {
      throw new BadRequestException(
        `캐릭터 #${characterId}를 보유하고 있지 않습니다.`,
      );
    }

    const updated = await this.prisma.userReward.update({
      where: { userId },
      data: { equippedCharacterId: characterId },
    });

    return { equippedCharacterId: updated.equippedCharacterId };
  }

  /** 레이드 클리어 보상: 포인트 또는 알 (확률은 게이트웨이에서 결정) */
  async grantRaidReward(
    userId: string,
    reward: { kind: "points"; points: number } | { kind: "egg"; egg: EggType },
  ) {
    await this.getOrCreateReward(userId);
    if (reward.kind === "points") {
      await this.prisma.userReward.update({
        where: { userId },
        data: { missionPoints: { increment: Math.max(0, reward.points) }, raidCount: { increment: 1 } },
      });
      void logPointsChange(this.prisma, userId, Math.max(0, reward.points), "레이드 클리어 보상");
    } else {
      await this.prisma.userReward.update({
        where: { userId },
        data: { ...eggDelta(reward.egg, 1), raidCount: { increment: 1 } },
      });
    }
    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);
    void this.markQuestDone(userId, "battle").catch(() => undefined);
    void this.incrementWeeklyQuestProgress(userId, "battle").catch(() => undefined);
  }

  /** 레이드 랭킹 보상 지급 (알 여러 개 또는 포인트) */
  async grantRaidRankingReward(
    userId: string,
    reward: { kind: "egg"; egg: EggType; count: number } | { kind: "points"; points: number },
  ) {
    await this.getOrCreateReward(userId);
    if (reward.kind === "points") {
      await this.prisma.userReward.update({
        where: { userId },
        data: { missionPoints: { increment: Math.max(0, reward.points) }, raidCount: { increment: 1 } },
      });
      void logPointsChange(this.prisma, userId, Math.max(0, reward.points), "레이드 랭킹 보상");
    } else {
      await this.prisma.userReward.update({
        where: { userId },
        data: { ...eggDelta(reward.egg, reward.count), raidCount: { increment: 1 } },
      });
    }
    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);
  }

  /** 알 까기: 알 1개 소비 → 등급별 가챠로 캐릭터 1개 (중복이면 포인트 환급) */
  async openEgg(userId: string, eggType: EggType) {
    const reward = await this.getOrCreateReward(userId);
    if (eggCount(reward, eggType) <= 0) {
      throw new BadRequestException("보유한 알이 없습니다.");
    }

    const config = await resolveGachaConfig(this.prisma);
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const rarity = weightedRandom(eggRatesFor(config, eggType));
    const pick = pickFromPool(rarity, masterMap);

    const owned = await this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId: pick.id } },
    });
    const isDuplicate = !!owned;
    const dupPoints = isDuplicate ? (RARITY_DUPLICATE_POINTS[pick.rarity] ?? 0) : 0;
    const dupEssence = isDuplicate ? (RARITY_DUPLICATE_ESSENCE[pick.rarity] ?? 0) : 0;

    if (isDuplicate) {
      await this.prisma.userReward.update({
        where: { userId },
        data: {
          ...eggDelta(eggType, -1),
          missionPoints: { increment: dupPoints },
          breedingEssence: { increment: dupEssence },
        },
      });
      void logPointsChange(this.prisma, userId, dupPoints, "알 까기 중복 환급");
    } else {
      await this.prisma.$transaction([
        this.prisma.userReward.update({
          where: { userId },
          data: eggDelta(eggType, -1),
        }),
        this.prisma.userCharacter.create({ data: { userId, characterId: pick.id } }),
      ]);
    }

    const newlyUnlockedAchievements = await this.grantAchievementsAndTitles(userId);

    return {
      eggType,
      characterId: pick.id,
      rarity: pick.rarity,
      isDuplicate,
      points: dupPoints,
      essence: dupEssence,
      newlyUnlockedAchievements,
    };
  }

  /** 알 여러 개 한번에 까기 */
  async openEggBatch(userId: string, eggType: EggType, count: number) {
    if (count < 2 || count > 10) throw new BadRequestException("한번에 2~10개만 가능합니다.");
    const reward = await this.getOrCreateReward(userId);
    if (eggCount(reward, eggType) < count) {
      throw new BadRequestException("보유한 알이 부족합니다.");
    }

    const owned = await this.prisma.userCharacter.findMany({
      where: { userId },
      select: { characterId: true },
    });
    const ownedSet = new Set(owned.map((c) => c.characterId));
    const config = await resolveGachaConfig(this.prisma);
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const eggRates = eggRatesFor(config, eggType);

    const results: { eggType: EggType; characterId: number; rarity: string; isDuplicate: boolean; points: number; essence: number }[] = [];
    const newCharIds: number[] = [];
    let totalDupPoints = 0;
    let totalDupEssence = 0;

    for (let i = 0; i < count; i++) {
      const rarity = weightedRandom(eggRates);
      const pick = pickFromPool(rarity, masterMap);
      const isDuplicate = ownedSet.has(pick.id);
      const dupPoints = isDuplicate ? (RARITY_DUPLICATE_POINTS[pick.rarity] ?? 0) : 0;
      const dupEssence = isDuplicate ? (RARITY_DUPLICATE_ESSENCE[pick.rarity] ?? 0) : 0;

      if (!isDuplicate) {
        ownedSet.add(pick.id);
        newCharIds.push(pick.id);
      }
      totalDupPoints += dupPoints;
      totalDupEssence += dupEssence;
      results.push({ eggType, characterId: pick.id, rarity: pick.rarity, isDuplicate, points: dupPoints, essence: dupEssence });
    }

    await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data: {
          ...eggDelta(eggType, -count),
          missionPoints: { increment: totalDupPoints },
          breedingEssence: { increment: totalDupEssence },
        },
      }),
      ...newCharIds.map((characterId) =>
        this.prisma.userCharacter.create({ data: { userId, characterId } }),
      ),
    ]);
    void logPointsChange(this.prisma, userId, totalDupPoints, "알 일괄 까기 중복 환급");

    // 결과 배열 형태(results)는 프론트가 그대로 쓰고 있어 그대로 유지 — 새로 지급된 업적
    // 캐릭터는 프론트에서 /rewards/summary 재조회로 감지(완료된 원정/로그라이크와 동일 패턴)
    await this.grantAchievementsAndTitles(userId);

    return results;
  }

  async performGacha(userId: string, count: 1 | 10) {
    const cost = count === 10 ? GACHA_COST_TEN : GACHA_COST_SINGLE;
    const reward = await this.getOrCreateReward(userId);

    if (reward.missionPoints < cost) {
      throw new BadRequestException(
        `포인트가 부족합니다. 필요: ${cost}P, 보유: ${reward.missionPoints}P`,
      );
    }

    // Load already-owned characters to detect duplicates
    const owned = await this.prisma.userCharacter.findMany({
      where: { userId },
      select: { characterId: true },
    });
    const ownedSet = new Set(owned.map((c) => c.characterId));
    const config = await resolveGachaConfig(this.prisma);
    const masterMap = await loadCharacterMasterMap(this.prisma);

    const {
      results,
      pity,
      legendaryPity,
      totalBonusPoints,
      totalBonusEssence,
    } = simulateGachaPulls(count, config, reward.gachaPityCount, reward.legendaryPityCount, ownedSet, masterMap);

    // Persist new characters and point changes in a transaction
    const newChars = results.filter((r) => !r.isDuplicate);
    await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data: {
          missionPoints: reward.missionPoints - cost + totalBonusPoints,
          breedingEssence: { increment: totalBonusEssence },
          gachaPityCount: pity,
          legendaryPityCount: legendaryPity,
          totalPointsUsed: { increment: cost },
        },
      }),
      ...newChars.map((r) =>
        this.prisma.userCharacter.create({
          data: { userId, characterId: r.characterId },
        }),
      ),
    ]);
    void logPointsChange(this.prisma, userId, -cost + totalBonusPoints, "가챠 뽑기");

    void this.markQuestDone(userId, "gacha").catch(() => undefined);
    void this.incrementWeeklyQuestProgress(userId, "gacha").catch(() => undefined);

    const newlyUnlockedAchievements = await this.grantAchievementsAndTitles(userId);

    return {
      results,
      pointsSpent: cost,
      bonusPoints: totalBonusPoints,
      bonusEssence: totalBonusEssence,
      remainingPoints: reward.missionPoints - cost + totalBonusPoints,
      gachaPityCount: pity,
      legendaryPityCount: legendaryPity,
      newlyUnlockedAchievements,
    };
  }

  async equipTitle(userId: string, titleId: number) {
    const owned = await this.prisma.userTitle.findUnique({
      where: { userId_titleId: { userId, titleId } },
    });
    if (!owned) {
      throw new BadRequestException(
        `칭호 #${titleId}를 보유하고 있지 않습니다.`,
      );
    }
    const updated = await this.prisma.userReward.update({
      where: { userId },
      data: { equippedTitleId: titleId },
    });
    return { equippedTitleId: updated.equippedTitleId };
  }

  async unequipTitle(userId: string) {
    const updated = await this.prisma.userReward.update({
      where: { userId },
      data: { equippedTitleId: null },
    });
    return { equippedTitleId: updated.equippedTitleId };
  }

  async equipBorder(userId: string, borderId: string) {
    const owned = await this.prisma.userBorder.findUnique({
      where: { userId_borderId: { userId, borderId } },
    });
    if (!owned) throw new BadRequestException(`테두리 ${borderId}를 보유하고 있지 않습니다.`);
    const updated = await this.prisma.userReward.upsert({
      where: { userId },
      create: { userId, equippedBorderId: borderId },
      update: { equippedBorderId: borderId },
    });
    return { equippedBorderId: updated.equippedBorderId };
  }

  async unequipBorder(userId: string) {
    const updated = await this.prisma.userReward.upsert({
      where: { userId },
      create: { userId, equippedBorderId: null },
      update: { equippedBorderId: null },
    });
    return { equippedBorderId: updated.equippedBorderId };
  }

  async checkAndGrantTitles(userId: string) {
    const reward = await this.getOrCreateReward(userId);
    const postCount = await this.prisma.communityPost.count({ where: { userId } });
    const battleStats = await this.prisma.battleStats.findUnique({ where: { userId } });

    const stats: Record<string, number> = {
      raid_count:       reward.raidCount,
      live_count:       reward.liveCount,
      expedition_count: reward.expeditionCount,
      rogue_clears:     reward.rogueClears,
      post_count:       postCount,
      attendance:       reward.attendanceDays,
      streak:           reward.streakDays,
      points:           reward.totalPointsUsed,
      col_wins:         battleStats?.wins ?? 0,
      col_streak:       battleStats?.bestStreak ?? 0,
      col_points:       battleStats?.tierPoints ?? 0,
    };

    const ownedTitles = await this.prisma.userTitle.findMany({
      where: { userId },
      select: { titleId: true },
    });
    const ownedSet = new Set(ownedTitles.map((t) => t.titleId));

    const newlyUnlocked: number[] = [];
    for (const ach of TITLE_ACHIEVEMENTS) {
      if (!ownedSet.has(ach.titleId) && (stats[ach.type] ?? 0) >= ach.value) {
        newlyUnlocked.push(ach.titleId);
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.prisma.$transaction(
        newlyUnlocked.map((titleId) =>
          this.prisma.userTitle.upsert({
            where: { userId_titleId: { userId, titleId } },
            create: { userId, titleId },
            update: {},
          }),
        ),
      );
    }

    return { newlyUnlocked };
  }

  async onPostCreated(userId: string) {
    await this.getOrCreateReward(userId);
    await this.prisma.userReward.update({
      where: { userId },
      data: { missionPoints: { increment: 50 } },
    });
    void logPointsChange(this.prisma, userId, 50, "게시글 작성 보상");
  }

  async checkAndGrantAchievements(userId: string) {
    const reward = await this.getOrCreateReward(userId);

    const postCount = await this.prisma.communityPost.count({ where: { userId } });

    const stats: Record<string, number> = {
      raid_count:       reward.raidCount,
      live_count:       reward.liveCount,
      expedition_count: reward.expeditionCount,
      rogue_clears:     reward.rogueClears,
      post_count:       postCount,
      attendance:       reward.attendanceDays,
      streak:           reward.streakDays,
      points:           reward.totalPointsUsed,
    };

    const owned = await this.prisma.userCharacter.findMany({
      where: { userId },
      select: { characterId: true },
    });
    const ownedSet = new Set(owned.map((c) => c.characterId));

    const newlyUnlocked: number[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (
        !ownedSet.has(ach.characterId) &&
        (stats[ach.type] ?? 0) >= ach.value
      ) {
        newlyUnlocked.push(ach.characterId);
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.prisma.$transaction(
        newlyUnlocked.map((characterId) =>
          this.prisma.userCharacter.upsert({
            where: { userId_characterId: { userId, characterId } },
            create: { userId, characterId },
            update: {},
          }),
        ),
      );
      // 업적 달성 알림
      for (const _characterId of newlyUnlocked) {
        void this.notifications.create({
          userId,
          type: "achievement",
          title: "업적 달성!",
          body: "새로운 케보몬을 획득했어요. 도감에서 확인해보세요.",
          titleKey: "notification.achievement_title",
          bodyKey: "notification.achievement_body",
          titleJa: "実績達成！",
          bodyJa: "新しいケボモンを獲得しました。図鑑で確認してみてください。",
          titleEn: "Achievement Unlocked!",
          bodyEn: "New Kebomon obtained. Check your Collection!",
          link: "/kebomon",
        }).catch(() => undefined);
      }
    }

    // 도감 컴플리트 마일스톤 — 방금 새로 얻은 캐릭터까지 포함한 총 보유 종 수 기준
    const dexReward = await this.checkAndGrantDexMilestones(userId, ownedSet.size + newlyUnlocked.length);

    return { newlyUnlocked, dexMilestones: dexReward.milestones, dexReward };
  }

  /** 업적/칭호를 함께 재확인 — 실패해도 메인 흐름은 막지 않고, 새로 획득한 업적 캐릭터 id만 반환 */
  private async grantAchievementsAndTitles(userId: string): Promise<number[]> {
    const [achResult] = await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => [{ newlyUnlocked: [] as number[] }] as [{ newlyUnlocked: number[] }]);
    return achResult.newlyUnlocked;
  }

  /** 도감 보유 종 수가 마일스톤을 새로 넘겼으면 KP/알/강화석을 지급 */
  private async checkAndGrantDexMilestones(userId: string, ownedCount: number) {
    const reward = await this.getOrCreateReward(userId);
    const crossed = DEX_MILESTONES.filter(
      (m) => m.count > reward.dexMilestoneBest && ownedCount >= m.count,
    );
    const empty = { milestones: [] as number[], kp: 0, normalEgg: 0, bigEgg: 0, goldenEgg: 0, stones: 0 };
    if (crossed.length === 0) return empty;

    const totals = crossed.reduce(
      (acc, m) => ({
        kp: acc.kp + m.kp,
        normalEgg: acc.normalEgg + (m.normalEgg ?? 0),
        bigEgg: acc.bigEgg + (m.bigEgg ?? 0),
        goldenEgg: acc.goldenEgg + (m.goldenEgg ?? 0),
        stones: acc.stones + (m.stones ?? 0),
      }),
      { kp: 0, normalEgg: 0, bigEgg: 0, goldenEgg: 0, stones: 0 },
    );
    const newBest = Math.max(...crossed.map((m) => m.count));

    await this.prisma.userReward.update({
      where: { userId },
      data: {
        missionPoints:     { increment: totals.kp },
        normalEggs:        { increment: totals.normalEgg },
        bigEggs:           { increment: totals.bigEgg },
        goldenEggs:        { increment: totals.goldenEgg },
        enhancementStones: { increment: totals.stones },
        dexMilestoneBest:  newBest,
      },
    });
    void logPointsChange(this.prisma, userId, totals.kp, "도감 마일스톤 보상");

    void this.notifications.create({
      userId,
      type: "achievement",
      title: "도감 마일스톤 달성!",
      body: `케보몬 ${newBest}종을 수집해 보상을 받았어요. 도감에서 확인해보세요.`,
      titleKey: "notification.dex_milestone_title",
      bodyKey: "notification.dex_milestone_body",
      titleJa: "図鑑マイルストーン達成！",
      bodyJa: `ケボモンを${newBest}種収集して報酬を獲得しました。図鑑で確認してみてください。`,
      titleEn: "Collection Milestone Reached!",
      bodyEn: `Collected ${newBest} Kebomon and earned rewards. Check your Collection!`,
      link: "/kebomon?tab=collection",
    }).catch(() => undefined);

    return { milestones: crossed.map((m) => m.count), ...totals };
  }

  // ─── 콜로세움 랭킹 (1시간 서버캐시) ────────────────────────────────────
  private rankingsCache: { data: RankingRow[]; updatedAt: number } | null = null;
  private getCurrentHourStartMs(now = Date.now()) {
    const hour = new Date(now);
    hour.setMinutes(0, 0, 0);
    return hour.getTime();
  }

  async getColosseumRankings() {
    const now = Date.now();
    const currentHourStart = this.getCurrentHourStartMs(now);
    if (this.rankingsCache && this.rankingsCache.updatedAt >= currentHourStart) {
      return { rankings: this.rankingsCache.data, updatedAt: this.rankingsCache.updatedAt };
    }
    const rows = await this.prisma.battleStats.findMany({
      take: 20,
      orderBy: { tierPoints: "desc" },
      select: {
        userId: true,
        tierPoints: true,
        wins: true,
        winStreak: true,
        user: { select: { name: true, reward: { select: { equippedCharacterId: true } } } },
      },
    });
    const data: RankingRow[] = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: r.user.name,
      tierPoints: r.tierPoints,
      wins: r.wins,
      winStreak: r.winStreak,
      characterId: r.user.reward?.equippedCharacterId ?? null,
    }));
    this.rankingsCache = { data, updatedAt: currentHourStart };
    return { rankings: data, updatedAt: currentHourStart };
  }

  async getBattleStats(userId: string) {
    const [stats, postCount] = await Promise.all([
      this.prisma.battleStats.findUnique({ where: { userId } }),
      this.prisma.communityPost.count({ where: { userId } }),
    ]);
    if (!stats) {
      return { tierPoints: 0, wins: 0, losses: 0, winStreak: 0, bestStreak: 0, postCount };
    }
    return {
      tierPoints: stats.tierPoints,
      wins: stats.wins,
      losses: stats.losses,
      winStreak: stats.winStreak,
      bestStreak: stats.bestStreak,
      postCount,
    };
  }

  async grantSeasonRankTitles(seasonId: number) {
    const rows = await this.prisma.battleStats.findMany({
      take: 10,
      orderBy: { tierPoints: "desc" },
      select: {
        userId: true,
        tierPoints: true,
        wins: true,
        losses: true,
        winStreak: true,
        user: { select: { name: true } },
      },
    });

    // 시즌별 한정 칭호 base ID: 시즌1=43, 시즌2=58, 시즌N(N>=2)=58+(N-2)*4
    const base = seasonId === 1 ? 43 : 58 + (seasonId - 2) * 4;
    // rank → titleId 매핑 (1위→base, 2위→base+1, 3위→base+2, 4~10위→base+3)
    const grants: { userId: string; titleId: number }[] = rows.map((r, i) => ({
      userId: r.userId,
      titleId: i === 0 ? base : i === 1 ? base + 1 : i === 2 ? base + 2 : base + 3,
    }));
    // resetSeasonStats()가 곧 tierPoints/wins/losses/winStreak를 0으로 되돌리므로, 명예의 전당
    // 스냅샷용으로 리셋 전 값을 여기서 같이 들고 반환한다(랭킹 쿼리를 한 번 더 안 날림)
    const topRankers = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      // SeasonHallOfFame.nickname은 VARCHAR(50)인데 User.name엔 길이 제한이 없어서 자름
      // (여기서 실패하면 스냅샷 이후의 티어테두리/KP보상/스탯리셋까지 전부 안 돌아감)
      nickname: r.user.name.slice(0, 50),
      tierPoints: r.tierPoints,
      wins: r.wins,
      losses: r.losses,
      winStreak: r.winStreak,
    }));

    await this.prisma.$transaction(
      grants.map(({ userId, titleId }) =>
        this.prisma.userTitle.upsert({
          where: { userId_titleId: { userId, titleId } },
          create: { userId, titleId },
          update: {},
        }),
      ),
    );

    // 알림 발송
    for (const { userId } of grants) {
      void this.notifications.create({
        userId,
        type: "achievement",
        title: `시즌 ${seasonId} 랭킹 칭호 획득!`,
        body: "시즌 최종 랭킹 칭호가 지급되었습니다. 칭호 목록에서 확인하세요.",
        titleKey: "notification.season_title",
        bodyKey: "notification.season_body",
        titleJa: `シーズン${seasonId} ランキング称号獲得！`,
        bodyJa: "シーズン最終ランキング称号が付与されました。称号一覧で確認してください。",
        titleEn: `Season ${seasonId} Ranking Title Earned!`,
        bodyEn: "Season final ranking title awarded. Check your titles!",
        link: "/mypage?titles=1",
      }).catch(() => undefined);
    }

    return { granted: grants.length, details: grants, topRankers };
  }

  async updateBattleStats(userId: string, won: boolean) {
    const existing = await this.prisma.battleStats.findUnique({ where: { userId } });
    const prev = existing ?? { tierPoints: 0, wins: 0, losses: 0, winStreak: 0, bestStreak: 0 };

    const newWinStreak = won ? prev.winStreak + 1 : 0;
    const streakBonus = won && newWinStreak > 1 ? 20 : 0;
    const pointsDelta = won ? 100 + streakBonus : -50;
    const newPoints = Math.max(0, prev.tierPoints + pointsDelta);
    const newBestStreak = Math.max(prev.bestStreak, newWinStreak);

    const data = {
      tierPoints: newPoints,
      wins: won ? prev.wins + 1 : prev.wins,
      losses: won ? prev.losses : prev.losses + 1,
      winStreak: newWinStreak,
      bestStreak: newBestStreak,
    };

    await this.prisma.battleStats.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    return { ...data, pointsDelta };
  }

  // ─── 시즌 자동 리셋 ────────────────────────────────────────────────────────
  private readonly logger = new Logger(RewardsService.name);

  // 시즌 1 시작: 2026년 6월 (기준점)
  private readonly SEASON_BASE = { year: 2026, month: 6 };

  private getEndingSeasonNumber(): number {
    // 크론이 매월 1일 00:00 KST에 실행되므로 직전 달이 종료 시즌
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth() + 1; // 1~12
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return (prevYear - this.SEASON_BASE.year) * 12 + (prevMonth - this.SEASON_BASE.month) + 1;
  }

  /** 지금 이 순간 진행 중인 시즌 번호 — 월중에 관리자가 수동 종료할 때는 "직전 달"이 아니라
   *  "이번 달"이 끝나는 시즌이므로 getEndingSeasonNumber()와 분리해서 계산한다. */
  private getCurrentSeasonNumber(): number {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth() + 1;
    return (year - this.SEASON_BASE.year) * 12 + (month - this.SEASON_BASE.month) + 1;
  }

  async grantSeasonTierBorders(seasonId: number) {
    const rows = await this.prisma.battleStats.findMany({
      where: { tierPoints: { gte: 3000 } },
      select: { userId: true, tierPoints: true },
    });

    const grants = rows.map((r) => ({
      userId: r.userId,
      borderId: `s${seasonId}_${getArenaTierKey(r.tierPoints)}`,
    }));

    if (grants.length === 0) return { granted: 0 };

    await this.prisma.userBorder.createMany({
      data: grants.map(({ userId, borderId }) => ({ userId, borderId })),
      skipDuplicates: true,
    });

    for (const { userId } of grants) {
      void this.notifications.create({
        userId,
        type: "achievement",
        title: `시즌 ${seasonId} 티어 테두리 획득!`,
        body: "시즌 종료 보상으로 프로필 테두리가 지급되었습니다.",
        titleKey: "notification.season_border_title",
        bodyKey: "notification.season_border_body",
        titleJa: `シーズン${seasonId} ティアボーダー獲得！`,
        bodyJa: "シーズン終了報酬としてプロフィールボーダーが付与されました。",
        titleEn: `Season ${seasonId} Tier Border Earned!`,
        bodyEn: "Profile border awarded as season-end reward.",
        link: "/mypage",
      }).catch(() => undefined);
    }

    return { granted: grants.length };
  }

  // 시즌 티어 칭호 base ID: 시즌1=66(실버66~챌린저71), 시즌2=72~77, 시즌N=66+(N-1)*6
  // (프론트 data/titles.ts의 TIER_ORDER/TitleDef 66~83과 반드시 동일하게 유지)
  private static readonly SEASON_TIER_TITLE_BASE = 66;
  private static readonly TIER_KEY_ORDER = ["silver", "gold", "platinum", "diamond", "master", "challenger"];

  /** 시즌 티어 테두리와 별개로, 영구 기록용 칭호도 함께 지급 — 테두리는 다음 시즌 것으로
   *  바뀌어도(장착 기준) 칭호는 "시즌N 실버" 식으로 영원히 남아 예전 시즌 성과를 증명한다 */
  async grantSeasonTierTitles(seasonId: number) {
    const rows = await this.prisma.battleStats.findMany({
      where: { tierPoints: { gte: 3000 } },
      select: { userId: true, tierPoints: true },
    });

    const grants = rows
      .map((r) => {
        const tierKey = getArenaTierKey(r.tierPoints);
        const tierIndex = tierKey ? RewardsService.TIER_KEY_ORDER.indexOf(tierKey) : -1;
        if (tierIndex < 0) return null;
        const titleId = RewardsService.SEASON_TIER_TITLE_BASE + (seasonId - 1) * 6 + tierIndex;
        return { userId: r.userId, titleId };
      })
      .filter((g): g is { userId: string; titleId: number } => g !== null);

    if (grants.length === 0) return { granted: 0 };

    await this.prisma.$transaction(
      grants.map(({ userId, titleId }) =>
        this.prisma.userTitle.upsert({
          where: { userId_titleId: { userId, titleId } },
          create: { userId, titleId },
          update: {},
        }),
      ),
    );

    for (const { userId } of grants) {
      void this.notifications.create({
        userId,
        type: "achievement",
        title: `시즌 ${seasonId} 티어 칭호 획득!`,
        body: "시즌 종료 보상으로 티어 칭호가 지급되었습니다. 칭호 목록에서 확인하세요.",
        titleKey: "notification.season_tier_title_title",
        bodyKey: "notification.season_tier_title_body",
        titleJa: `シーズン${seasonId} ティア称号獲得！`,
        bodyJa: "シーズン終了報酬としてティア称号が付与されました。称号一覧で確認してください。",
        titleEn: `Season ${seasonId} Tier Title Earned!`,
        bodyEn: "Tier title awarded as season-end reward. Check your titles!",
        link: "/mypage?titles=1",
      }).catch(() => undefined);
    }

    return { granted: grants.length };
  }

  // 시즌 종료 티어 KP 보너스 — 티어 임계값/보너스액은 arena.constants.ts의 ARENA_TIERS 하나로 관리
  // (프론트 ColosseumPage.tsx의 SEASON_REWARDS와는 별도 패키지라 값 동기화는 여전히 수동)
  async grantSeasonKpBonus(seasonId: number) {
    const rows = await this.prisma.battleStats.findMany({
      where: { tierPoints: { gte: 3000 } },
      select: { userId: true, tierPoints: true },
    });

    const grants = rows
      .map((r) => ({ userId: r.userId, tier: ARENA_TIERS.find((t) => r.tierPoints >= t.min) }))
      .filter((g): g is { userId: string; tier: (typeof ARENA_TIERS)[number] } => !!g.tier);

    await this.prisma.$transaction(
      grants.map(({ userId, tier }) =>
        this.prisma.userReward.update({
          where: { userId },
          data: { missionPoints: { increment: tier.kpBonus } },
        }),
      ),
    );

    for (const { userId, tier } of grants) {
      void logPointsChange(this.prisma, userId, tier.kpBonus, `시즌 ${seasonId} 티어 보상`);
      void this.notifications.create({
        userId,
        type: "achievement",
        title: `시즌 ${seasonId} 티어 보상 획득!`,
        body: `${tier.key} 티어 달성으로 KP ${tier.kpBonus}가 지급되었습니다.`,
        titleKey: "notification.season_kp_title",
        bodyKey: "notification.season_kp_body",
        titleJa: `シーズン${seasonId} ティア報酬獲得！`,
        bodyJa: `${tier.key}ティア達成でKP${tier.kpBonus}が支給されました。`,
        titleEn: `Season ${seasonId} Tier Reward!`,
        bodyEn: `${tier.kpBonus} KP granted for reaching ${tier.key} tier.`,
        link: "/mypage",
      }).catch(() => undefined);
    }

    return { granted: grants.length };
  }

  async resetSeasonStats() {
    await this.prisma.battleStats.updateMany({
      data: { tierPoints: 0, wins: 0, losses: 0, winStreak: 0 },
    });
    this.rankingsCache = null;
  }

  /** resetSeasonStats()가 리셋하기 전 top10 스냅샷을 명예의 전당에 영구 보관 (동일 시즌 재실행 시 덮어씀) */
  private async snapshotSeasonHallOfFame(
    seasonId: number,
    topRankers: { rank: number; userId: string; nickname: string; tierPoints: number; wins: number; losses: number; winStreak: number }[],
  ) {
    if (topRankers.length === 0) return;
    await this.prisma.$transaction(
      topRankers.map((r) =>
        this.prisma.seasonHallOfFame.upsert({
          where: { seasonId_rank: { seasonId, rank: r.rank } },
          create: { seasonId, ...r },
          update: { ...r },
        }),
      ),
    );
  }

  async getHallOfFame() {
    return this.prisma.seasonHallOfFame.findMany({
      orderBy: [{ seasonId: "desc" }, { rank: "asc" }],
    });
  }

  /** 시즌 종료 처리 본체 — 크론과 관리자 수동 강제종료가 공유한다 */
  private async runSeasonReset(seasonId: number) {
    this.logger.log(`시즌 ${seasonId} 종료 처리 시작`);
    const { topRankers } = await this.grantSeasonRankTitles(seasonId);
    await this.snapshotSeasonHallOfFame(seasonId, topRankers);
    await this.grantSeasonTierBorders(seasonId);
    await this.grantSeasonTierTitles(seasonId);
    await this.grantSeasonKpBonus(seasonId);
    await this.resetSeasonStats();
    this.logger.log(`시즌 ${seasonId} 종료 처리 완료`);
  }

  /** 관리자 수동 강제종료 — 실패 시 그대로 던져서 관리자 화면에 에러가 보이게 한다(크론과 달리 조용히 삼키지 않음) */
  async forceEndCurrentSeason() {
    const seasonId = this.getCurrentSeasonNumber();
    await this.runSeasonReset(seasonId);
    return { seasonId };
  }

  async getSeasonPreview() {
    const seasonId = this.getCurrentSeasonNumber();
    const { rankings } = await this.getColosseumRankings();
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const nextResetKst = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth() + 1, 1));
    const nextResetAt = new Date(nextResetKst.getTime() - 9 * 60 * 60 * 1000);
    return { seasonId, topRankers: rankings.slice(0, 10), nextResetAt };
  }

  // 매월 1일 00:00 KST에 실행 — 직전 달 시즌 종료 처리
  @Cron("0 0 1 * *", { timeZone: "Asia/Seoul" })
  async handleSeasonReset() {
    const seasonId = this.getEndingSeasonNumber();
    try {
      await this.runSeasonReset(seasonId);
    } catch (err) {
      this.logger.error(`시즌 ${seasonId} 종료 처리 실패`, err);
    }
  }

  /**
   * 캐릭터별 등급/아레나·로그라이크 역할 (관리자 페이지에서 조정 가능한 값 중 클라이언트가
   * 필요로 하는 것만 공개) — 로그라이크는 서버 검증 없이 클라이언트가 직접 스탯을
   * 계산하고, 아레나 역할 아이콘도 프론트가 직접 표시하므로, admin 조정이 실제
   * 화면에 반영되려면 프론트가 정적 데이터 대신 이 값을 써야 한다. 로그인 불필요,
   * 게임 밸런스 정보라 공개해도 무방.
   */
  async getCharacterMasterPublic() {
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const result: Record<number, { rarity: string; arenaArchetype: string; rogueArchetype: string }> = {};
    for (const [id, row] of masterMap) {
      result[id] = { rarity: row.rarity, arenaArchetype: row.arenaArchetype, rogueArchetype: row.rogueArchetype };
    }
    return result;
  }

  /**
   * 뽑기 확률/천장 (관리자 페이지에서 조정 가능한 값) — 유저웹 확률 표시용.
   * 로그인 불필요, 게임 밸런스 정보라 공개해도 무방.
   */
  async getGachaConfigPublic() {
    return resolveGachaConfig(this.prisma);
  }
}
