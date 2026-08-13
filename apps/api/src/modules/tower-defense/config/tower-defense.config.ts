import type { TdPoint, TdRarity } from "../types/tower-defense.types";

export const TD_MAX_PLAYERS = 4;
export const TD_MAX_LIVES = 30;
export const TD_START_GOLD = 120;
export const TD_SUMMON_COST = 45;
export const TD_TICK_MS = 100;
export const TD_WAVE_COUNT = 30;
export const TD_WAVE_BREAK_MS = 4_000;

export const TD_PATH: TdPoint[] = [
  { x: 40, y: 220 },
  { x: 180, y: 220 },
  { x: 180, y: 360 },
  { x: 360, y: 360 },
  { x: 360, y: 150 },
  { x: 560, y: 150 },
  { x: 560, y: 440 },
  { x: 790, y: 440 },
  { x: 790, y: 250 },
  { x: 980, y: 250 },
  { x: 1100, y: 360 },
  { x: 1240, y: 360 },
];

export const TD_SLOTS = [
  { id: "s1", x: 120, y: 135 },
  { id: "s2", x: 255, y: 275 },
  { id: "s3", x: 265, y: 455 },
  { id: "s4", x: 430, y: 255 },
  { id: "s5", x: 470, y: 70 },
  { id: "s6", x: 650, y: 245 },
  { id: "s7", x: 665, y: 545 },
  { id: "s8", x: 875, y: 350 },
  { id: "s9", x: 900, y: 145 },
  { id: "s10", x: 1045, y: 445 },
  { id: "s11", x: 1125, y: 240 },
  { id: "s12", x: 1190, y: 480 },
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
