export type TdRoomPhase = "lobby" | "playing" | "ended";
export type TdTargetMode = "front" | "back" | "strong" | "weak" | "boss";
export type TdUnitType = "fire" | "water" | "nature";

export interface TdPoint {
  x: number;
  y: number;
}

export interface TdPlayer {
  socketId: string;
  userId: string;
  nickname: string;
  characterId: number;
  ready: boolean;
  connected: boolean;
  gold: number;
  kills: number;
  typeUpgrades: Record<TdUnitType, number>;
}

export interface TdTower {
  id: string;
  ownerUserId: string;
  characterId: number;
  unitType: TdUnitType;
  rarity: string;
  slotId: string;
  damage: number;
  range: number;
  attackMs: number;
  upgradeLevel: number;
  upgradeCost: number;
  targetMode: TdTargetMode;
  locked: boolean;
  lastAttackAt: number;
}

export interface TdMonster {
  id: string;
  wave: number;
  kind: "normal" | "fast" | "tough" | "boss";
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  pathT: number;
  reached: boolean;
}

export interface TdSnapshot {
  roomId: string;
  roomCode: string;
  phase: TdRoomPhase;
  hostUserId: string;
  players: TdPlayer[];
  tick: number;
  wave: number;
  waveActive: boolean;
  nextWaveInMs: number;
  lives: number;
  maxLives: number;
  path: TdPoint[];
  slots: { id: string; x: number; y: number; occupiedBy: string | null }[];
  towers: TdTower[];
  monsters: TdMonster[];
  projectiles: { id: string; from: TdPoint; toMonsterId: string; createdAt: number }[];
  message?: string;
  result?: { won: boolean; wavesCleared: number };
}

export interface TdChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  createdAt: number;
}
