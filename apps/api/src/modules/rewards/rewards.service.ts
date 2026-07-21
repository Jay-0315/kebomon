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
import { EggType, eggRatesFor, resolveGachaConfig } from "./gacha-config.util";
import { CharacterMasterRow, loadCharacterMasterMap } from "./character-master.util";

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
const RARITY_DUPLICATE_POINTS: Record<string, number> = {
  common: 5,
  uncommon: 10,
  rare: 20,
  epic: 30,
  legendary: 60,
  mythic: 120,
};

// 가챠로 뽑힐 수 있는 캐릭터 ID 목록(140종, 스타터/업적 전용 40종 제외) — 등급 정보는
// character-master.util의 마스터 맵에서 조회한다 (예전엔 여기 rarity를 직접 들고 있었음)
const GACHA_POOL_IDS: number[] = [
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

function pickGachaRarity(
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

function weightedRandom(weights: Record<string, number>): string {
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

    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);

    return { ...rewards, expeditionCount: updatedReward.expeditionCount, dexBonusMult };
  }

  // 로그라이크 한 판을 실제로 플레이하는 데 걸리는 최소 시간 — 이보다 빨리 complete가
  // 들어오면 클라이언트 검증 없이 반복 호출해 보상만 채굴하는 것으로 간주해 거부한다.
  private static readonly MIN_ROGUE_RUN_MS = 60_000;
  // 도전 모드: 스테이지당 최소 이만큼은 걸린다고 가정 (climbed stage 수에 비례해 요구)
  private static readonly MIN_MS_PER_CHALLENGE_STAGE = 3_000;

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
    }

    await Promise.all([
      this.checkAndGrantAchievements(userId),
      this.checkAndGrantTitles(userId),
    ]).catch(() => undefined);

    return { rogueClears: newClears, milestones };
  }

  /** 도전 모드 결과 제출 — 도달 스테이지가 신기록이면 갱신 + 마일스톤 보상 */
  async submitChallenge(userId: string, stage: number) {
    const s = Math.max(0, Math.min(100, Math.floor(Number(stage) || 0)));
    const reward = await this.getOrCreateReward(userId);
    if (!reward.activeRunStartedAt) {
      throw new BadRequestException("시작되지 않은 도전입니다.");
    }
    const elapsed = Date.now() - reward.activeRunStartedAt.getTime();
    const prevBest = reward.challengeBest;
    let challengeBest = prevBest;
    let milestones: RogueMilestone[] = [];

    if (s > prevBest) {
      // 신기록 갱신 시에만 시간 검증 — 보상이 걸려있는 경우만 막으면 됨
      if (elapsed < s * RewardsService.MIN_MS_PER_CHALLENGE_STAGE) {
        throw new BadRequestException("비정상적으로 빠른 진행입니다.");
      }
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
  }> {
    const nowKTC = new Date(Date.now() + 9 * 3_600_000);
    const todayKTC = nowKTC.toISOString().slice(0, 10);
    const currentMonthKey = todayKTC.slice(0, 7); // "YYYY-MM"

    const reward = await this.getOrCreateReward(userId);

    if (reward.lastAttendanceDate === todayKTC) {
      return { alreadyClaimed: true, points: 0, streakDays: reward.streakDays, attendanceDays: reward.attendanceDays, monthDays: reward.monthDays, monthWeekRewards: reward.monthWeekRewards, eggReward: null };
    }

    // 월 바뀌면 monthDays·monthWeekRewards 리셋
    const monthReset = reward.monthKey !== currentMonthKey;
    const prevMonthDays = monthReset ? 0 : reward.monthDays;
    const prevWeekRewards = monthReset ? 0 : reward.monthWeekRewards;

    const yesterdayKTC = new Date(Date.now() + 9 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
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

    return {
      alreadyClaimed: false,
      points,
      streakDays: updated.streakDays,
      attendanceDays: updated.attendanceDays,
      monthDays: updated.monthDays,
      monthWeekRewards: updated.monthWeekRewards,
      eggReward,
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

    const todayKTC = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
    const yesterdayKTC = new Date(Date.now() + 9 * 3_600_000 - 86_400_000).toISOString().slice(0, 10);
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

    if (isDuplicate) {
      await this.prisma.userReward.update({
        where: { userId },
        data: { ...eggDelta(eggType, -1), missionPoints: { increment: dupPoints } },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.userReward.update({
          where: { userId },
          data: eggDelta(eggType, -1),
        }),
        this.prisma.userCharacter.create({ data: { userId, characterId: pick.id } }),
      ]);
    }

    return {
      eggType,
      characterId: pick.id,
      rarity: pick.rarity,
      isDuplicate,
      points: dupPoints,
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

    const results: { eggType: EggType; characterId: number; rarity: string; isDuplicate: boolean; points: number }[] = [];
    const newCharIds: number[] = [];
    let totalDupPoints = 0;

    for (let i = 0; i < count; i++) {
      const rarity = weightedRandom(eggRates);
      const pick = pickFromPool(rarity, masterMap);
      const isDuplicate = ownedSet.has(pick.id);
      const dupPoints = isDuplicate ? (RARITY_DUPLICATE_POINTS[pick.rarity] ?? 0) : 0;

      if (!isDuplicate) {
        ownedSet.add(pick.id);
        newCharIds.push(pick.id);
      }
      totalDupPoints += dupPoints;
      results.push({ eggType, characterId: pick.id, rarity: pick.rarity, isDuplicate, points: dupPoints });
    }

    await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data: { ...eggDelta(eggType, -count), missionPoints: { increment: totalDupPoints } },
      }),
      ...newCharIds.map((characterId) =>
        this.prisma.userCharacter.create({ data: { userId, characterId } }),
      ),
    ]);

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

    const results: {
      characterId: number;
      rarity: string;
      isDuplicate: boolean;
      bonusPoints: number;
    }[] = [];
    let totalBonusPoints = 0;
    let pity = reward.gachaPityCount; // rare+ 보장 카운터 (consecutive non-rare)
    let legendaryPity = reward.legendaryPityCount; // 천장 카운터 (관리자 설정 회차 후 레전더리+ 보장)

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

      results.push({ characterId: char.id, rarity, isDuplicate, bonusPoints });
      totalBonusPoints += bonusPoints;

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

    // Persist new characters and point changes in a transaction
    const newChars = results.filter((r) => !r.isDuplicate);
    await this.prisma.$transaction([
      this.prisma.userReward.update({
        where: { userId },
        data: {
          missionPoints: reward.missionPoints - cost + totalBonusPoints,
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

    return {
      results,
      pointsSpent: cost,
      bonusPoints: totalBonusPoints,
      remainingPoints: reward.missionPoints - cost + totalBonusPoints,
      gachaPityCount: pity,
      legendaryPityCount: legendaryPity,
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
      select: { userId: true },
    });

    // 시즌별 한정 칭호 base ID: 시즌1=43, 시즌2=58, 시즌N(N>=2)=58+(N-2)*4
    const base = seasonId === 1 ? 43 : 58 + (seasonId - 2) * 4;
    // rank → titleId 매핑 (1위→base, 2위→base+1, 3위→base+2, 4~10위→base+3)
    const grants: { userId: string; titleId: number }[] = rows.map((r, i) => ({
      userId: r.userId,
      titleId: i === 0 ? base : i === 1 ? base + 1 : i === 2 ? base + 2 : base + 3,
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

    return { granted: grants.length, details: grants };
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

  // 매월 1일 00:00 KST에 실행 — 직전 달 시즌 종료 처리
  @Cron("0 0 1 * *", { timeZone: "Asia/Seoul" })
  async handleSeasonReset() {
    const seasonId = this.getEndingSeasonNumber();
    this.logger.log(`시즌 ${seasonId} 종료 처리 시작`);
    try {
      await this.grantSeasonRankTitles(seasonId);
      await this.grantSeasonTierBorders(seasonId);
      await this.grantSeasonKpBonus(seasonId);
      await this.resetSeasonStats();
      this.logger.log(`시즌 ${seasonId} 종료 처리 완료`);
    } catch (err) {
      this.logger.error(`시즌 ${seasonId} 종료 처리 실패`, err);
    }
  }

  /**
   * 캐릭터별 등급/로그라이크 역할 (관리자 페이지에서 조정 가능한 값 중 클라이언트가
   * 필요로 하는 것만 공개) — 로그라이크는 서버 검증 없이 클라이언트가 직접 스탯을
   * 계산하므로, admin 조정이 실제 게임에 반영되려면 프론트가 정적 데이터 대신
   * 이 값을 써야 한다. 로그인 불필요, 게임 밸런스 정보라 공개해도 무방.
   */
  async getCharacterMasterPublic() {
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const result: Record<number, { rarity: string; rogueArchetype: string }> = {};
    for (const [id, row] of masterMap) {
      result[id] = { rarity: row.rarity, rogueArchetype: row.rogueArchetype };
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
