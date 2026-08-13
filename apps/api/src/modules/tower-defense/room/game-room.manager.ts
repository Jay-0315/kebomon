import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";
import { TD_MAX_PLAYERS, TD_TICK_MS } from "../config/tower-defense.config";
import { GameEngine } from "../engine/game-engine";
import type { TdPlayer, TdRoom, TdTargetMode } from "../types/tower-defense.types";
import { TowerDefenseService } from "../tower-defense.service";

function roomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

@Injectable()
export class GameRoomManager {
  private rooms = new Map<string, TdRoom>();
  private codeToRoomId = new Map<string, string>();
  private userToRoomId = new Map<string, string>();

  constructor(private readonly towerDefenseService: TowerDefenseService) {}

  createRoom(player: TdPlayer) {
    this.leaveUser(player.userId);
    let code = roomCode();
    while (this.codeToRoomId.has(code)) code = roomCode();
    const room = GameEngine.createRoom(player.userId, code);
    this.addPlayer(room, player);
    this.rooms.set(room.id, room);
    this.codeToRoomId.set(code, room.id);
    return room;
  }

  joinRoom(code: string, player: TdPlayer) {
    const room = this.getByCode(code);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (room.phase !== "lobby") return { room: null, error: "이미 시작된 방입니다." };
    if (room.players.size >= TD_MAX_PLAYERS && !room.players.has(player.userId)) {
      return { room: null, error: "방이 가득 찼습니다." };
    }
    this.leaveUser(player.userId);
    this.addPlayer(room, player);
    return { room, error: null };
  }

  reconnect(player: TdPlayer) {
    const roomId = this.userToRoomId.get(player.userId);
    const room = roomId ? this.rooms.get(roomId) : null;
    if (!room) return null;
    this.addPlayer(room, player);
    return room;
  }

  setReady(userId: string, ready: boolean) {
    const room = this.getByUser(userId);
    const player = room?.players.get(userId);
    if (!room || !player) return null;
    player.ready = ready;
    return room;
  }

  async start(userId: string, server: Server, onEnd: (room: TdRoom) => void) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (room.hostUserId !== userId) return { room: null, error: "방장만 시작할 수 있습니다." };
    if (room.phase !== "lobby") return { room: null, error: "이미 시작되었습니다." };
    if ([...room.players.values()].some((p) => !p.ready && p.userId !== room.hostUserId)) {
      return { room: null, error: "준비하지 않은 참가자가 있습니다." };
    }
    const playerIds = [...room.players.values()].map((p) => p.userId);
    try {
      await this.towerDefenseService.assertRunsAvailable(playerIds);
      await this.towerDefenseService.consumeRuns(playerIds);
    } catch (e) {
      return {
        room: null,
        error: e instanceof Error ? e.message : "도전 횟수를 확인할 수 없습니다.",
      };
    }
    GameEngine.start(room);
    room.interval = setInterval(() => {
      GameEngine.tick(room);
      server.to(this.channel(room.id)).emit("td:game:snapshot", GameEngine.snapshot(room));
      if (room.ended) {
        if (room.interval) clearInterval(room.interval);
        room.interval = null;
        void this.persistResult(room).finally(() => onEnd(room));
      }
    }, TD_TICK_MS);
    return { room, error: null };
  }

  summon(userId: string, slotId: string, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.summon(room, userId, slotId);
    return { room, error: result.message ?? null };
  }

  fixedSummon(userId: string, slotId: string, characterId?: number, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.fixedSummon(room, userId, slotId, characterId);
    return { room, error: result.message ?? null };
  }

  upgrade(userId: string, towerId: string, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.upgrade(room, userId, towerId);
    return { room, error: result.message ?? null };
  }

  sell(userId: string, towerId: string, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.sell(room, userId, towerId);
    return { room, error: result.message ?? null };
  }

  move(userId: string, towerId: string, slotId: string, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.move(room, userId, towerId, slotId);
    return { room, error: result.message ?? null };
  }

  merge(userId: string, towerId: string, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.merge(room, userId, towerId);
    return { room, error: result.message ?? null };
  }

  targetMode(userId: string, towerId: string, targetMode: TdTargetMode, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.setTargetMode(room, userId, towerId, targetMode);
    return { room, error: result.message ?? null };
  }

  lock(userId: string, towerId: string, locked: boolean, actionId?: string) {
    const room = this.getByUser(userId);
    if (!room) return { room: null, error: "방을 찾을 수 없습니다." };
    if (this.isDuplicate(room, actionId)) return { room, error: null };
    const result = GameEngine.setLocked(room, userId, towerId, locked);
    return { room, error: result.message ?? null };
  }

  leaveUserRoom(userId: string) {
    const room = this.getByUser(userId);
    if (!room) return null;
    this.leaveUser(userId);
    return room;
  }

  leaveSocket(socketId: string) {
    for (const room of this.rooms.values()) {
      const userId = room.socketToUser.get(socketId);
      if (!userId) continue;
      room.socketToUser.delete(socketId);
      const player = room.players.get(userId);
      if (player) player.connected = false;
      if (room.phase === "lobby") this.leaveUser(userId);
      return room;
    }
    return null;
  }

  getByUser(userId: string) {
    const roomId = this.userToRoomId.get(userId);
    return roomId ? this.rooms.get(roomId) ?? null : null;
  }

  getById(roomId: string) {
    return this.rooms.get(roomId) ?? null;
  }

  channel(roomId: string) {
    return `td:${roomId}`;
  }

  private getByCode(code: string) {
    const roomId = this.codeToRoomId.get(code.trim().toUpperCase());
    return roomId ? this.rooms.get(roomId) ?? null : null;
  }

  private addPlayer(room: TdRoom, player: TdPlayer) {
    const prev = room.players.get(player.userId);
    room.players.set(player.userId, {
      ...player,
      ready: prev?.ready ?? player.ready,
      gold: prev?.gold ?? player.gold,
      kills: prev?.kills ?? player.kills,
      typeUpgrades: prev?.typeUpgrades ?? player.typeUpgrades,
    });
    room.socketToUser.set(player.socketId, player.userId);
    this.userToRoomId.set(player.userId, room.id);
  }

  private leaveUser(userId: string) {
    const room = this.getByUser(userId);
    if (!room) return;
    room.players.delete(userId);
    this.userToRoomId.delete(userId);
    for (const [socketId, uid] of [...room.socketToUser.entries()]) {
      if (uid === userId) room.socketToUser.delete(socketId);
    }
    if (room.hostUserId === userId) {
      const nextHost = room.players.values().next().value as TdPlayer | undefined;
      if (nextHost) room.hostUserId = nextHost.userId;
    }
    if (room.players.size === 0 && room.interval === null) {
      this.rooms.delete(room.id);
      this.codeToRoomId.delete(room.code);
    }
  }

  private isDuplicate(room: TdRoom, actionId?: string) {
    if (!actionId) return false;
    if (room.usedActionIds.has(actionId)) return true;
    room.usedActionIds.add(actionId);
    if (room.usedActionIds.size > 500) {
      const first = room.usedActionIds.values().next().value as string | undefined;
      if (first) room.usedActionIds.delete(first);
    }
    return false;
  }

  private async persistResult(room: TdRoom) {
    const wavesCleared = Math.max(0, room.wave - (room.lives > 0 ? 0 : 1));
    await Promise.all(
      [...room.players.values()]
        .filter((p) => p.userId)
        .map((p) => this.towerDefenseService.submitServerResult(p.userId, wavesCleared)),
    );
  }
}
