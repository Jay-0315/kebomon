export type TdRoomPhase = "lobby" | "playing" | "ended";
export type TdUnitType = "fire" | "water" | "nature";
export type TdSpeedMultiplier = 1 | 1.5 | 2;

export interface TdPoint {
  x: number;
  y: number;
}

export interface TdPlacementSlot {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  enabled: boolean;
  ownerUserId?: string;
}

export interface TdPlacementZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  slots: TdPlacementSlot[];
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
  lives: number;
  maxLives: number;
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
  locked: boolean;
  lastAttackAt: number;
}

export interface TdMonster {
  id: string;
  ownerUserId: string;
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
  speedMultiplier: TdSpeedMultiplier;
  path: TdPoint[];
  placementZones: TdPlacementZone[];
  slots: (TdPlacementSlot & { ownerUserId: string; occupiedBy: string | null })[];
  towers: TdTower[];
  monsters: TdMonster[];
  projectiles: { id: string; ownerUserId: string; from: TdPoint; to: TdPoint; toMonsterId: string; unitType: TdUnitType; createdAt: number }[];
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
