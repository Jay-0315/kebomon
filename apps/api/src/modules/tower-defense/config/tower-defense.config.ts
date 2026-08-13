import type { TdPoint, TdRarity } from "../types/tower-defense.types";

export const TD_MAX_PLAYERS = 4;
export const TD_MAX_LIVES = 30;
export const TD_START_GOLD = 120;
export const TD_SUMMON_COST = 45;
export const TD_TICK_MS = 100;
export const TD_WAVE_COUNT = 30;
export const TD_WAVE_BREAK_MS = 4_000;

export const TD_PATH: TdPoint[] = [
  { x: 650, y: 610 },
  { x: 650, y: 500 },
  { x: 515, y: 500 },
  { x: 515, y: 365 },
  { x: 650, y: 365 },
  { x: 650, y: 250 },
  { x: 785, y: 250 },
  { x: 785, y: 120 },
  { x: 650, y: 120 },
  { x: 650, y: 20 },
];

export const TD_SLOTS = [
  { id: "tl1", x: 250, y: 85 },
  { id: "tl2", x: 355, y: 85 },
  { id: "tl3", x: 460, y: 85 },
  { id: "tl4", x: 270, y: 175 },
  { id: "tl5", x: 375, y: 175 },
  { id: "tl6", x: 480, y: 175 },
  { id: "tl7", x: 375, y: 265 },

  { id: "tr1", x: 840, y: 85 },
  { id: "tr2", x: 945, y: 85 },
  { id: "tr3", x: 1050, y: 85 },
  { id: "tr4", x: 820, y: 175 },
  { id: "tr5", x: 925, y: 175 },
  { id: "tr6", x: 1030, y: 175 },
  { id: "tr7", x: 925, y: 265 },

  { id: "bl1", x: 250, y: 405 },
  { id: "bl2", x: 355, y: 405 },
  { id: "bl3", x: 460, y: 405 },
  { id: "bl4", x: 270, y: 495 },
  { id: "bl5", x: 375, y: 495 },
  { id: "bl6", x: 480, y: 495 },
  { id: "bl7", x: 375, y: 585 },

  { id: "br1", x: 840, y: 405 },
  { id: "br2", x: 945, y: 405 },
  { id: "br3", x: 1050, y: 405 },
  { id: "br4", x: 820, y: 495 },
  { id: "br5", x: 925, y: 495 },
  { id: "br6", x: 1030, y: 495 },
  { id: "br7", x: 925, y: 585 },
];

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
