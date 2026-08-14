import {
  TD_MAX_LIVES,
  TD_FIXED_SUMMON_COST,
  TD_MAX_TOWER_UPGRADE,
  TD_PATH,
  TD_PLACEMENT_ZONES,
  TD_POOL_CHARACTER_IDS,
  TD_POOL_CHARACTER_RARITIES,
  TD_POOL_CHARACTER_TYPES,
  TD_RARITY_POWER,
  TD_RARITY_WEIGHTS,
  TD_SLOTS,
  TD_START_GOLD,
  TD_SUMMON_COST,
  TD_TICK_MS,
  TD_TYPE_UPGRADE_BASE_COST,
  TD_TYPE_UPGRADE_COST_STEP,
  TD_WAVE_BREAK_MS,
  TD_WAVE_COUNT,
} from "../config/tower-defense.config";
import type { TdMonster, TdRarity, TdRoom, TdSnapshot, TdTargetMode, TdTower, TdUnitType } from "../types/tower-defense.types";

const RARITY_ORDER: TdRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const DIRECT_SUMMON_RARITIES: Array<{ fromWave: number; rarities: TdRarity[] }> = [
  { fromWave: 15, rarities: ["common", "uncommon", "rare", "epic"] },
  { fromWave: 10, rarities: ["common", "uncommon", "rare"] },
  { fromWave: 5, rarities: ["common", "uncommon"] },
  { fromWave: 0, rarities: ["common"] },
];

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointOnPath(t: number) {
  const segments = TD_PATH.slice(0, -1).map((p, i) => ({ from: p, to: TD_PATH[i + 1], len: dist(p, TD_PATH[i + 1]) }));
  const total = segments.reduce((sum, s) => sum + s.len, 0);
  let remain = Math.max(0, Math.min(1, t)) * total;
  for (const s of segments) {
    if (remain <= s.len) {
      const r = s.len === 0 ? 0 : remain / s.len;
      return { x: s.from.x + (s.to.x - s.from.x) * r, y: s.from.y + (s.to.y - s.from.y) * r };
    }
    remain -= s.len;
  }
  return TD_PATH[TD_PATH.length - 1];
}

function weightedRarity(allowedRarities: TdRarity[]): TdRarity {
  const total = allowedRarities.reduce((sum, r) => sum + TD_RARITY_WEIGHTS[r], 0);
  let roll = Math.random() * total;
  for (const r of allowedRarities) {
    roll -= TD_RARITY_WEIGHTS[r];
    if (roll <= 0) return r;
  }
  return allowedRarities[0] ?? "common";
}

function nextRarity(rarity: TdRarity): TdRarity | null {
  const idx = RARITY_ORDER.indexOf(rarity);
  if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
  return RARITY_ORDER[idx + 1];
}

function upgradeCost(level: number) {
  return TD_TYPE_UPGRADE_BASE_COST + level * TD_TYPE_UPGRADE_COST_STEP;
}

function directSummonRarities(wave: number) {
  return DIRECT_SUMMON_RARITIES.find((entry) => wave >= entry.fromWave)?.rarities ?? ["common"];
}

function pickCharacterForRarity(rarity: TdRarity) {
  const pool = TD_POOL_CHARACTER_IDS.filter((id) => TD_POOL_CHARACTER_RARITIES[id] === rarity);
  return pool[Math.floor(Math.random() * pool.length)] ?? TD_POOL_CHARACTER_IDS[0];
}

function pickDirectSummon(wave: number) {
  const rarity = weightedRarity(directSummonRarities(wave));
  const characterId = pickCharacterForRarity(rarity);
  return { characterId, rarity };
}

function clampDirectPoolCharacterId(characterId: number | undefined, wave: number) {
  const parsed = Number(characterId);
  const rarity = TD_POOL_CHARACTER_RARITIES[parsed];
  if ((TD_POOL_CHARACTER_IDS as readonly number[]).includes(parsed) && rarity && directSummonRarities(wave).includes(rarity)) {
    return { characterId: parsed, rarity };
  }
  return pickDirectSummon(wave);
}

function emptyTypeUpgrades(): Record<TdUnitType, number> {
  return { fire: 0, water: 0, nature: 0 };
}

function unitTypeForCharacter(characterId: number): TdUnitType {
  return TD_POOL_CHARACTER_TYPES[characterId] ?? "nature";
}

function applyTypePower(rarity: TdRarity, level: number) {
  const base = TD_RARITY_POWER[rarity];
  return {
    damage: Math.round(base.damage * (1 + level * 0.13)),
    range: Math.round(base.range + level * 4),
    attackMs: Math.max(360, Math.round(base.attackMs * (1 - Math.min(0.25, level * 0.025)))),
  };
}

function syncTowerPower(tower: TdTower, level: number) {
  const power = applyTypePower(tower.rarity, level);
  tower.damage = power.damage;
  tower.range = power.range;
  tower.attackMs = power.attackMs;
  tower.upgradeLevel = level;
  tower.upgradeCost = level >= TD_MAX_TOWER_UPGRADE ? 0 : upgradeCost(level);
}

function buildWave(wave: number, speedMultiplier: 1 | 2): Array<Omit<TdMonster, "id" | "pathT" | "reached" | "ownerUserId">> {
  const boss = wave % 10 === 0;
  const kind = boss ? "boss" : wave % 5 === 0 ? "tough" : wave % 3 === 0 ? "fast" : "normal";
  const count = boss ? 1 : 10 + Math.min(20, wave * 2);
  const hpBase = 55 * (1 + wave * 0.14) * Math.pow(1.028, wave);
  const speedBase = kind === "fast" ? 0.08 : kind === "boss" ? 0.036 : 0.056;
  return Array.from({ length: count }, () => ({
    wave,
    kind,
    hp: boss ? hpBase * 12 : kind === "tough" ? hpBase * 2.2 : hpBase,
    maxHp: boss ? hpBase * 12 : kind === "tough" ? hpBase * 2.2 : hpBase,
    speed: speedBase * speedMultiplier,
    reward: boss ? 100 + wave * 4 : 8 + Math.floor(wave * 0.8),
  }));
}

function baseSlotId(slotId: string) {
  const idx = slotId.indexOf(":");
  return idx >= 0 ? slotId.slice(idx + 1) : slotId;
}

function slotOwner(slotId: string) {
  const idx = slotId.indexOf(":");
  return idx >= 0 ? slotId.slice(0, idx) : null;
}

function ownedSlotId(userId: string, slotId: string) {
  return `${userId}:${baseSlotId(slotId)}`;
}

export class GameEngine {
  static createRoom(hostUserId: string, code: string, speedMultiplier: 1 | 2 = 1): TdRoom {
    return {
      id: id("room"),
      code,
      hostUserId,
      phase: "lobby",
      players: new Map(),
      socketToUser: new Map(),
      usedActionIds: new Set(),
      tick: 0,
      wave: 0,
      waveActive: false,
      nextWaveAt: 0,
      lives: TD_MAX_LIVES,
      maxLives: TD_MAX_LIVES,
      speedMultiplier,
      arenas: new Map(),
      towers: new Map(),
      monsters: new Map(),
      projectiles: [],
      spawnQueue: [],
      spawnEveryMs: 520,
      nextSpawnAt: 0,
      lastTickAt: Date.now(),
      interval: null,
      ended: false,
    };
  }

  static snapshot(room: TdRoom, message?: string): TdSnapshot {
    const now = Date.now();
    const players = [...room.players.values()].map((player) => {
      const arena = room.arenas.get(player.userId);
      return {
        ...player,
        lives: arena?.lives ?? player.lives ?? TD_MAX_LIVES,
        maxLives: arena?.maxLives ?? player.maxLives ?? TD_MAX_LIVES,
      };
    });
    const lifeValues = players.map((player) => player.lives);
    const summaryLives = lifeValues.length > 0 ? Math.max(0, Math.min(...lifeValues)) : room.lives;
    return {
      roomId: room.id,
      roomCode: room.code,
      phase: room.phase,
      hostUserId: room.hostUserId,
      players,
      tick: room.tick,
      wave: room.wave,
      waveActive: room.waveActive,
      nextWaveInMs: room.waveActive ? 0 : Math.max(0, room.nextWaveAt - now),
      lives: summaryLives,
      maxLives: room.maxLives,
      speedMultiplier: room.speedMultiplier,
      path: TD_PATH,
      placementZones: TD_PLACEMENT_ZONES,
      slots: players.flatMap((player) =>
        TD_SLOTS.map((slot) => {
          const id = ownedSlotId(player.userId, slot.id);
          return {
            ...slot,
            id,
            ownerUserId: player.userId,
            occupiedBy: [...room.towers.values()].find((t) => t.slotId === id)?.id ?? null,
          };
        }),
      ),
      towers: [...room.towers.values()],
      monsters: [...room.monsters.values()],
      projectiles: room.projectiles.filter((p) => now - p.createdAt < 900),
      message,
      result: room.phase === "ended" ? { won: players.some((player) => player.lives > 0) && room.wave >= TD_WAVE_COUNT, wavesCleared: Math.max(0, room.wave - 1) } : undefined,
    };
  }

  static start(room: TdRoom) {
    room.phase = "playing";
    room.wave = 0;
    room.lives = TD_MAX_LIVES;
    room.arenas.clear();
    room.nextWaveAt = Date.now() + 1_000;
    room.players.forEach((p) => {
      p.gold = TD_START_GOLD;
      p.kills = 0;
      p.lives = TD_MAX_LIVES;
      p.maxLives = TD_MAX_LIVES;
      p.typeUpgrades = emptyTypeUpgrades();
      room.arenas.set(p.userId, {
        userId: p.userId,
        lives: TD_MAX_LIVES,
        maxLives: TD_MAX_LIVES,
        spawnQueue: [],
        nextSpawnAt: 0,
      });
    });
  }

  static summon(room: TdRoom, userId: string, slotId: string): { ok: boolean; message?: string } {
    if (room.phase !== "playing") return { ok: false, message: "게임 진행 중에만 소환할 수 있습니다." };
    const slot = TD_SLOTS.find((s) => s.id === baseSlotId(slotId));
    if (slotOwner(slotId) !== userId) return { ok: false, message: "본인 영역에만 배치할 수 있습니다." };
    if (!slot) return { ok: false, message: "유효하지 않은 슬롯입니다." };
    if ([...room.towers.values()].some((t) => t.slotId === slotId)) return { ok: false, message: "이미 사용 중인 슬롯입니다." };
    const player = room.players.get(userId);
    if (!player) return { ok: false, message: "플레이어 정보를 찾을 수 없습니다." };
    if (player.gold < TD_SUMMON_COST) return { ok: false, message: "골드가 부족합니다." };
    player.gold -= TD_SUMMON_COST;

    player.typeUpgrades ??= emptyTypeUpgrades();
    const { characterId, rarity } = pickDirectSummon(room.wave);
    const unitType = unitTypeForCharacter(characterId);
    const level = player.typeUpgrades[unitType] ?? 0;
    const power = applyTypePower(rarity, level);
    const tower: TdTower = {
      id: id("tower"),
      ownerUserId: userId,
      characterId,
      unitType,
      rarity,
      slotId,
      damage: power.damage,
      range: power.range,
      attackMs: power.attackMs,
      upgradeLevel: level,
      upgradeCost: level >= TD_MAX_TOWER_UPGRADE ? 0 : upgradeCost(level),
      targetMode: "front",
      locked: false,
      lastAttackAt: 0,
    };
    room.towers.set(tower.id, tower);
    return { ok: true };
  }

  static fixedSummon(room: TdRoom, userId: string, slotId: string, characterId?: number): { ok: boolean; message?: string } {
    if (room.phase !== "playing") return { ok: false, message: "게임 진행 중에만 배치할 수 있습니다." };
    const slot = TD_SLOTS.find((s) => s.id === baseSlotId(slotId));
    if (slotOwner(slotId) !== userId) return { ok: false, message: "본인 영역에만 배치할 수 있습니다." };
    if (!slot) return { ok: false, message: "유효하지 않은 슬롯입니다." };
    if ([...room.towers.values()].some((t) => t.slotId === slotId)) return { ok: false, message: "이미 사용 중인 슬롯입니다." };
    const player = room.players.get(userId);
    if (!player) return { ok: false, message: "플레이어 정보를 찾을 수 없습니다." };
    if (player.gold < TD_FIXED_SUMMON_COST) return { ok: false, message: "골드가 부족합니다." };
    player.gold -= TD_FIXED_SUMMON_COST;

    player.typeUpgrades ??= emptyTypeUpgrades();
    const { characterId: selectedCharacterId, rarity } = clampDirectPoolCharacterId(characterId, room.wave);
    const unitType = unitTypeForCharacter(selectedCharacterId);
    const level = player.typeUpgrades[unitType] ?? 0;
    const power = applyTypePower(rarity, level);
    const tower: TdTower = {
      id: id("tower"),
      ownerUserId: userId,
      characterId: selectedCharacterId,
      unitType,
      rarity,
      slotId,
      damage: power.damage,
      range: power.range,
      attackMs: power.attackMs,
      upgradeLevel: level,
      upgradeCost: level >= TD_MAX_TOWER_UPGRADE ? 0 : upgradeCost(level),
      targetMode: "front",
      locked: false,
      lastAttackAt: 0,
    };
    room.towers.set(tower.id, tower);
    return { ok: true };
  }

  static upgrade(room: TdRoom, userId: string, towerId: string) {
    if (room.phase !== "playing") return { ok: false, message: "게임 진행 중에만 강화할 수 있습니다." };
    const tower = room.towers.get(towerId);
    if (!tower || tower.ownerUserId !== userId) return { ok: false, message: "강화할 수 있는 타워가 아닙니다." };
    const player = room.players.get(userId);
    if (!player) return { ok: false, message: "플레이어 정보를 찾을 수 없습니다." };
    player.typeUpgrades ??= emptyTypeUpgrades();
    const currentLevel = player.typeUpgrades[tower.unitType] ?? 0;
    if (currentLevel >= TD_MAX_TOWER_UPGRADE) return { ok: false, message: "이미 최대 강화 단계입니다." };
    const cost = upgradeCost(currentLevel);
    if (player.gold < cost) return { ok: false, message: "골드가 부족합니다." };
    player.gold -= cost;
    const nextLevel = currentLevel + 1;
    player.typeUpgrades[tower.unitType] = nextLevel;
    for (const ownedTower of room.towers.values()) {
      if (ownedTower.ownerUserId === userId && ownedTower.unitType === tower.unitType) {
        syncTowerPower(ownedTower, nextLevel);
      }
    }
    return { ok: true };
  }

  static sell(room: TdRoom, userId: string, towerId: string) {
    const tower = room.towers.get(towerId);
    if (!tower || tower.ownerUserId !== userId) return { ok: false, message: "판매할 수 있는 타워가 아닙니다." };
    room.towers.delete(towerId);
    const player = room.players.get(userId);
    if (player) player.gold += Math.floor(TD_SUMMON_COST * 0.55);
    return { ok: true };
  }

  static move(room: TdRoom, userId: string, towerId: string, slotId: string) {
    if (!TD_SLOTS.some((s) => s.id === baseSlotId(slotId))) return { ok: false, message: "이동할 수 없는 슬롯입니다." };
    if (slotOwner(slotId) !== userId) return { ok: false, message: "본인 영역으로만 이동할 수 있습니다." };
    if (room.phase !== "playing") return { ok: false, message: "게임 진행 중에만 이동할 수 있습니다." };
    const tower = room.towers.get(towerId);
    if (!tower || tower.ownerUserId !== userId) return { ok: false, message: "이동할 수 있는 타워가 아닙니다." };
    if (!TD_SLOTS.some((s) => s.id === baseSlotId(slotId))) return { ok: false, message: "유효하지 않은 슬롯입니다." };
    if ([...room.towers.values()].some((t) => t.slotId === slotId)) return { ok: false, message: "이미 사용 중인 슬롯입니다." };
    tower.slotId = slotId;
    return { ok: true };
  }

  static merge(room: TdRoom, userId: string, towerId: string) {
    if (room.phase !== "playing") return { ok: false, message: "게임 진행 중에만 합성할 수 있습니다." };
    const base = room.towers.get(towerId);
    if (!base || base.ownerUserId !== userId) return { ok: false, message: "합성할 수 있는 타워가 아닙니다." };
    if (base.locked) return { ok: false, message: "잠금 상태의 타워는 합성할 수 없습니다." };
    const upgradedRarity = nextRarity(base.rarity);
    if (!upgradedRarity) return { ok: false, message: "더 이상 합성할 수 없는 등급입니다." };
    const mate = [...room.towers.values()].find(
      (t) => t.id !== base.id && t.ownerUserId === userId && t.rarity === base.rarity && !t.locked,
    );
    if (!mate) return { ok: false, message: "같은 등급의 잠금 해제 타워가 2개 필요합니다." };

    const player = room.players.get(userId);
    player && (player.typeUpgrades ??= emptyTypeUpgrades());
    const characterId = pickCharacterForRarity(upgradedRarity);
    const unitType = unitTypeForCharacter(characterId);
    const level = player?.typeUpgrades?.[unitType] ?? 0;
    const power = applyTypePower(upgradedRarity, level);
    const keepSlot = base.slotId;
    room.towers.delete(base.id);
    room.towers.delete(mate.id);
    room.towers.set(base.id, {
      ...base,
      rarity: upgradedRarity,
      slotId: keepSlot,
      characterId,
      unitType,
      damage: power.damage,
      range: power.range,
      attackMs: power.attackMs,
      upgradeLevel: level,
      upgradeCost: level >= TD_MAX_TOWER_UPGRADE ? 0 : upgradeCost(level),
      lastAttackAt: 0,
      locked: false,
    });
    return { ok: true };
  }

  static setTargetMode(room: TdRoom, userId: string, towerId: string, targetMode: TdTargetMode) {
    const tower = room.towers.get(towerId);
    if (!tower || tower.ownerUserId !== userId) return { ok: false, message: "대상을 변경할 수 있는 타워가 아닙니다." };
    tower.targetMode = targetMode;
    return { ok: true };
  }

  static setLocked(room: TdRoom, userId: string, towerId: string, locked: boolean) {
    const tower = room.towers.get(towerId);
    if (!tower || tower.ownerUserId !== userId) return { ok: false, message: "잠금을 변경할 수 있는 타워가 아닙니다." };
    tower.locked = locked;
    return { ok: true };
  }

  static tick(room: TdRoom) {
    if (room.phase !== "playing") return;
    const now = Date.now();
    const dt = Math.min(250, now - room.lastTickAt);
    room.lastTickAt = now;
    room.tick += 1;

    if (!room.waveActive && now >= room.nextWaveAt) {
      room.wave += 1;
      room.waveActive = true;
      const wave = buildWave(room.wave, room.speedMultiplier);
      for (const player of room.players.values()) {
        const arena = room.arenas.get(player.userId);
        if (!arena || arena.lives <= 0) continue;
        arena.spawnQueue = wave.map((monster) => ({ ...monster }));
        arena.nextSpawnAt = now;
      }
    }

    if (room.waveActive) {
      for (const arena of room.arenas.values()) {
        if (arena.lives <= 0 || arena.spawnQueue.length === 0 || now < arena.nextSpawnAt) continue;
        const spec = arena.spawnQueue.shift()!;
        const monster: TdMonster = { ...spec, ownerUserId: arena.userId, id: id("mon"), pathT: 0, reached: false };
        room.monsters.set(monster.id, monster);
        arena.nextSpawnAt = now + room.spawnEveryMs;
      }
    }

    for (const monster of [...room.monsters.values()]) {
      monster.pathT += monster.speed * (dt / 1000);
      if (monster.pathT >= 1) {
        room.monsters.delete(monster.id);
        const arena = room.arenas.get(monster.ownerUserId);
        if (arena) {
          arena.lives = Math.max(0, arena.lives - (monster.kind === "boss" ? 5 : 1));
          const player = room.players.get(monster.ownerUserId);
          if (player) player.lives = arena.lives;
        }
      }
    }

    for (const tower of room.towers.values()) {
      const attackIntervalMs = tower.attackMs / room.speedMultiplier;
      if (now - tower.lastAttackAt < attackIntervalMs) continue;
      const slot = TD_SLOTS.find((s) => s.id === baseSlotId(tower.slotId));
      if (!slot) continue;
      const candidates = [...room.monsters.values()].filter((m) => m.ownerUserId === tower.ownerUserId && dist(slot, pointOnPath(m.pathT)) <= tower.range);
      if (candidates.length === 0) continue;
      const target = this.pickTarget(candidates, tower.targetMode);
      const targetPoint = pointOnPath(target.pathT);
      target.hp -= tower.damage;
      tower.lastAttackAt = now;
      room.projectiles.push({
        id: id("proj"),
        ownerUserId: tower.ownerUserId,
        from: { x: slot.x, y: slot.y },
        to: targetPoint,
        toMonsterId: target.id,
        unitType: tower.unitType,
        createdAt: now,
      });
      if (target.hp <= 0) {
        room.monsters.delete(target.id);
        const owner = room.players.get(tower.ownerUserId);
        if (owner) {
          owner.gold += target.reward;
          owner.kills += 1;
        }
      }
    }

    const activeArenas = [...room.arenas.values()].filter((arena) => arena.lives > 0);
    const activeMonsterCount = [...room.monsters.values()].filter((monster) => (room.arenas.get(monster.ownerUserId)?.lives ?? 0) > 0).length;
    if (room.waveActive && activeArenas.every((arena) => arena.spawnQueue.length === 0) && activeMonsterCount === 0) {
      room.waveActive = false;
      if (room.wave >= TD_WAVE_COUNT) {
        room.phase = "ended";
        room.ended = true;
      } else {
        room.nextWaveAt = now + TD_WAVE_BREAK_MS;
      }
    }

    if (activeArenas.length === 0) {
      room.lives = 0;
      room.phase = "ended";
      room.ended = true;
    }
  }

  private static pickTarget(monsters: TdMonster[], mode: TdTargetMode) {
    const sorted = [...monsters];
    if (mode === "back") return sorted.sort((a, b) => a.pathT - b.pathT)[0];
    if (mode === "strong") return sorted.sort((a, b) => b.hp - a.hp)[0];
    if (mode === "weak") return sorted.sort((a, b) => a.hp - b.hp)[0];
    if (mode === "boss") return sorted.sort((a, b) => Number(b.kind === "boss") - Number(a.kind === "boss") || b.pathT - a.pathT)[0];
    return sorted.sort((a, b) => b.pathT - a.pathT)[0];
  }
}

export { pointOnPath, TD_SUMMON_COST, TD_TICK_MS, TD_WAVE_COUNT };
