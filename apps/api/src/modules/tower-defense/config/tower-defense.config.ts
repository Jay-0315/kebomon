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
export const TD_TICK_MS = 100;
export const TD_WAVE_COUNT = 30;
export const TD_WAVE_BREAK_MS = 4_000;

export const TD_PATH: TdPoint[] = [
  { x: 650, y: 24 },
  { x: 650, y: 326 },
  { x: 1218, y: 326 },
  { x: 1218, y: 716 },
  { x: 730, y: 716 },
  { x: 730, y: 1040 },
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
  { id: "top-left", x: 210, y: 54, width: 330, height: 210, slots: slots("top-left", 292, 120, 2, 2, 110, 88) },
  { id: "top-mid", x: 760, y: 48, width: 385, height: 222, slots: slots("top-mid", 840, 116, 3, 2, 104, 90) },
  { id: "top-right", x: 1320, y: 72, width: 370, height: 218, slots: slots("top-right", 1400, 140, 3, 2, 98, 88) },

  { id: "mid-left", x: 210, y: 380, width: 390, height: 246, slots: slots("mid-left", 292, 456, 3, 2, 106, 96) },
  { id: "mid-center", x: 792, y: 420, width: 330, height: 218, slots: slots("mid-center", 870, 494, 2, 2, 112, 92) },
  { id: "mid-right", x: 1290, y: 410, width: 410, height: 242, slots: slots("mid-right", 1370, 484, 3, 2, 108, 94) },

  { id: "bot-left", x: 258, y: 780, width: 390, height: 232, slots: slots("bot-left", 338, 850, 3, 2, 106, 92) },
  { id: "bot-right", x: 1178, y: 780, width: 420, height: 238, slots: slots("bot-right", 1262, 850, 3, 2, 112, 94) },
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
  common: { damage: 16, range: 150, attackMs: 850 },
  uncommon: { damage: 24, range: 160, attackMs: 820 },
  rare: { damage: 38, range: 170, attackMs: 780 },
  epic: { damage: 58, range: 180, attackMs: 730 },
  legendary: { damage: 88, range: 195, attackMs: 680 },
  mythic: { damage: 135, range: 210, attackMs: 620 },
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
  83: "nature",
  66: "nature",
};
