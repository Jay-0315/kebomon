export type TdRoomPhase = "lobby" | "playing" | "ended";
export type TdTargetMode = "front" | "back" | "strong" | "weak" | "boss";
export type TdRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

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
}

export interface TdTower {
  id: string;
  ownerUserId: string;
  characterId: number;
  rarity: TdRarity;
  slotId: string;
  damage: number;
  range: number;
  attackMs: number;
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

export interface TdProjectile {
  id: string;
  from: TdPoint;
  toMonsterId: string;
  createdAt: number;
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
  projectiles: TdProjectile[];
  message?: string;
  result?: {
    won: boolean;
    wavesCleared: number;
  };
}

export interface TdRoom {
  id: string;
  code: string;
  hostUserId: string;
  phase: TdRoomPhase;
  players: Map<string, TdPlayer>;
  socketToUser: Map<string, string>;
  usedActionIds: Set<string>;
  tick: number;
  wave: number;
  waveActive: boolean;
  nextWaveAt: number;
  lives: number;
  maxLives: number;
  towers: Map<string, TdTower>;
  monsters: Map<string, TdMonster>;
  projectiles: TdProjectile[];
  spawnQueue: Array<Omit<TdMonster, "id" | "pathT" | "reached">>;
  spawnEveryMs: number;
  nextSpawnAt: number;
  lastTickAt: number;
  interval: ReturnType<typeof setInterval> | null;
  ended: boolean;
}
