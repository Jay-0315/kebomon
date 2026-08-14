import type { TdPlacementSlot, TdPlacementZone, TdPoint, TdRarity, TdUnitType } from "../types/tower-defense.types";

export const TD_MAX_PLAYERS = 4;
export const TD_MAX_LIVES = 30;
export const TD_START_GOLD = 120;
export const TD_SUMMON_COST = 45;
export const TD_FIXED_SUMMON_COST = 140;
export const TD_UPGRADE_BASE_COST = 70;
export const TD_MAX_TOWER_UPGRADE = 10;
export const TD_TYPE_UPGRADE_BASE_COST = 85;
export const TD_TYPE_UPGRADE_COST_STEP = 55;
export const TD_TICK_MS = 50;
export const TD_WAVE_COUNT = 100;
export const TD_NORMAL_MODE_WAVE_COUNT = 50;
export const TD_WAVE_BREAK_MS = 4_000;
export const TD_TOWER_RANGE_MULTIPLIER = 1.5;

export const TD_POOL_CHARACTER_IDS = [
  127, 75, 84, 21, 179, 36, 121, 131, 52, 154, 69, 67, 66,
] as const;

export const TD_PATH: TdPoint[] = [
  { x: 160, y: 245 },
  { x: 780, y: 245 },
  { x: 780, y: 70 },
  { x: 780, y: 245 },
  { x: 1225, y: 245 },
  { x: 1225, y: 70 },
  { x: 1225, y: 575 },
  { x: 780, y: 575 },
  { x: 780, y: 1010 },
  { x: 230, y: 1010 },
  { x: 230, y: 590 },
  { x: 780, y: 590 },
  { x: 780, y: 760 },
  { x: 1225, y: 760 },
  { x: 1225, y: 1010 },
  { x: 1800, y: 1010 },
  { x: 1800, y: 590 },
  { x: 1225, y: 590 },
  { x: 1225, y: 245 },
  { x: 1800, y: 245 },
  { x: 1800, y: 70 },
];

function slots(zoneId: string, x: number, y: number, cols: number, rows: number, gapX = 94, gapY = 92): TdPlacementSlot[] {
  return Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: `${zoneId}-${i + 1}`,
      zoneId,
      x: x + col * gapX,
      y: y + row * gapY,
      enabled: true,
    };
  });
}

export const TD_PLACEMENT_ZONES: TdPlacementZone[] = [
  { id: "top-left", x: 360, y: 40, width: 350, height: 165, slots: slots("top-left", 430, 94, 3, 2, 96, 72) },
  { id: "top-mid", x: 850, y: 40, width: 320, height: 165, slots: slots("top-mid", 915, 94, 3, 2, 86, 72) },
  { id: "top-right", x: 1290, y: 40, width: 340, height: 165, slots: slots("top-right", 1360, 94, 3, 2, 90, 72) },

  { id: "mid-left", x: 250, y: 305, width: 470, height: 225, slots: slots("mid-left", 330, 370, 4, 2, 96, 86) },
  { id: "mid-center", x: 845, y: 315, width: 270, height: 200, slots: slots("mid-center", 910, 376, 2, 2, 98, 82) },
  { id: "mid-right", x: 1285, y: 305, width: 465, height: 225, slots: slots("mid-right", 1365, 370, 4, 2, 94, 86) },

  { id: "bot-left", x: 310, y: 660, width: 430, height: 320, slots: slots("bot-left", 390, 735, 4, 3, 94, 82) },
  { id: "bot-right", x: 1290, y: 660, width: 430, height: 320, slots: slots("bot-right", 1370, 735, 4, 3, 94, 82) },
];

export const TD_SLOTS = TD_PLACEMENT_ZONES.flatMap((zone) => zone.slots);

export const TD_RARITY_WEIGHTS: Record<TdRarity, number> = {
  common: 48,
  uncommon: 27,
  rare: 15,
  epic: 7,
  legendary: 2.5,
  mythic: 0.5,
};

export const TD_RARITY_POWER: Record<TdRarity, { damage: number; range: number; attackMs: number }> = {
  common: { damage: 16, range: 230, attackMs: 850 },
  uncommon: { damage: 24, range: 250, attackMs: 820 },
  rare: { damage: 38, range: 275, attackMs: 780 },
  epic: { damage: 58, range: 305, attackMs: 730 },
  legendary: { damage: 88, range: 340, attackMs: 680 },
  mythic: { damage: 135, range: 380, attackMs: 620 },
};

export const TD_UNIT_TYPE_LABEL: Record<TdUnitType, string> = {
  fire: "불",
  water: "물",
  nature: "풀",
};

export const TD_POOL_CHARACTER_TYPES: Record<number, TdUnitType> = {
  127: "fire",
  75: "fire",
  84: "fire",
  21: "fire",
  179: "water",
  36: "water",
  121: "water",
  131: "water",
  52: "nature",
  154: "nature",
  69: "fire",
  67: "water",
  66: "nature",
};

export const TD_POOL_CHARACTER_RARITIES: Record<number, TdRarity> = {
  127: "common",
  75: "common",
  84: "uncommon",
  21: "uncommon",
  179: "rare",
  36: "rare",
  121: "epic",
  131: "epic",
  52: "legendary",
  154: "legendary",
  69: "mythic",
  67: "mythic",
  66: "mythic",
};
