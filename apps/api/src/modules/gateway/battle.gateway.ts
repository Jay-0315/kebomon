import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RewardsService } from "../rewards/rewards.service";
import { PrismaService } from "../prisma/prisma.service";
import { CharacterMasterRow, loadCharacterMasterMap } from "../rewards/character-master.util";

/** 레어리티 → 주사위 설정 (faces, count) */
const RARITY_DICE: Record<string, { faces: number; count: number }> = {
  common:     { faces: 6,  count: 1 },
  uncommon:   { faces: 6,  count: 1 },
  rare:       { faces: 8,  count: 1 },
  epic:       { faces: 12, count: 1 },
  legendary:  { faces: 6,  count: 2 },
  mythic:     { faces: 8,  count: 2 },
};

/** 강화 레벨 → 최소 주사위 값 */
function enhanceMinRoll(level: number): number {
  if (level >= 4) return 5;
  if (level >= 3) return 4;
  if (level >= 2) return 3;
  if (level >= 1) return 2;
  return 1;
}

/** 강화 레벨 → 보너스 주사위 면 수 (0=없음) */
function enhanceBonusFaces(level: number): number {
  if (level >= 6) return 8;
  if (level >= 5) return 6;
  return 0;
}

function rollDice(faces: number, count: number, enhLevel = 0): { rolls: number[]; total: number } {
  const minRoll = enhanceMinRoll(enhLevel);
  const rolls: number[] = Array.from({ length: count }, () =>
    Math.max(minRoll, Math.ceil(Math.random() * faces)),
  );
  const bonusFaces = enhanceBonusFaces(enhLevel);
  if (bonusFaces > 0) {
    rolls.push(Math.max(minRoll, Math.ceil(Math.random() * bonusFaces)));
  }
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

const MAX_HP = 150;

interface Fighter {
  userId: string;
  nickname: string;
  characterId: number;
  rarity: string;
  hp: number;
  isPlayer: boolean; // true = real user, false = clone opponent
  enhancementLevel: number;
}

interface BattleRoom {
  id: string;
  player: Fighter;
  opponent: Fighter;
  turn: "player" | "opponent"; // whose turn to roll
  playerGoesFirst: boolean;
  log: string[];
}

const battles = new Map<string, BattleRoom>(); // socketId → room

@WebSocketGateway({
  namespace: "/battle",
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class BattleGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly rewards: RewardsService,
    private readonly prisma: PrismaService,
  ) {}

  handleDisconnect(client: Socket) {
    battles.delete(client.id);
  }

  /** 배틀 시작: 코인 던져 선공 결정, 클론 매칭 */
  @SubscribeMessage("battle:start")
  async onStart(
    @MessageBody() data: { userId: string; characterId: number; nickname: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 이미 배틀 중이면 기존 방 반환
    if (battles.has(client.id)) {
      const r = battles.get(client.id)!;
      return client.emit("battle:state", roomToState(r, client.id));
    }

    const { userId, characterId, nickname } = data;
    const masterMap = await loadCharacterMasterMap(this.prisma);
    const rarity = masterMap.get(characterId)?.rarity ?? "common";

    // 플레이어 강화 레벨 조회
    let enhancementLevel = 0;
    try {
      const charRecord = await this.prisma.userCharacter.findUnique({
        where: { userId_characterId: { userId, characterId } },
        select: { enhancementLevel: true },
      });
      enhancementLevel = charRecord?.enhancementLevel ?? 0;
    } catch { /* silent */ }

    // 랜덤 클론 상대 선택
    const opponent = await this.pickOpponent(userId, masterMap);

    // 동전 던지기: true = player 선공
    const playerGoesFirst = Math.random() < 0.5;
    const coinResult = playerGoesFirst ? "heads" : "tails";

    const room: BattleRoom = {
      id: client.id,
      player: {
        userId,
        nickname,
        characterId,
        rarity,
        hp: MAX_HP,
        isPlayer: true,
        enhancementLevel,
      },
      opponent,
      turn: playerGoesFirst ? "player" : "opponent",
      playerGoesFirst,
      log: [],
    };

    battles.set(client.id, room);

    client.emit("battle:started", {
      coinResult,
      playerGoesFirst,
      player: publicFighter(room.player),
      opponent: publicFighter(room.opponent),
      turn: room.turn,
      maxHp: MAX_HP,
    });

  }

  /** 플레이어 턴: 주사위 굴리기 */
  @SubscribeMessage("battle:roll")
  async onRoll(@ConnectedSocket() client: Socket) {
    const room = battles.get(client.id);
    if (!room || room.turn !== "player") return;

    const dice = RARITY_DICE[room.player.rarity] ?? RARITY_DICE.common;
    const { rolls, total } = rollDice(dice.faces, dice.count, room.player.enhancementLevel);

    room.opponent.hp = Math.max(0, room.opponent.hp - total);
    room.log.push(`플레이어: ${rolls.join("+")} = ${total} 데미지`);

    client.emit("battle:rolled", {
      attacker: "player",
      rolls,
      total,
      playerHp: room.player.hp,
      opponentHp: room.opponent.hp,
    });

    if (room.opponent.hp <= 0) {
      await this.endBattle(client, room, true);
      return;
    }

    room.turn = "opponent";
    client.emit("battle:turn", { turn: "opponent" });
  }

  /** 플레이어 확인 후 상대 턴 실행 */
  @SubscribeMessage("battle:ack")
  async onAck(@ConnectedSocket() client: Socket) {
    const room = battles.get(client.id);
    if (!room || room.turn !== "opponent") return;
    await this.runOpponentTurn(client, room);
  }

  @SubscribeMessage("battle:forfeit")
  async onForfeit(@ConnectedSocket() client: Socket) {
    const room = battles.get(client.id);
    if (!room) return;
    await this.endBattle(client, room, false);
  }

  private async runOpponentTurn(client: Socket, room: BattleRoom) {
    if (!battles.has(client.id)) return;

    const dice = RARITY_DICE[room.opponent.rarity] ?? RARITY_DICE.common;
    const { rolls, total } = rollDice(dice.faces, dice.count, room.opponent.enhancementLevel);

    room.player.hp = Math.max(0, room.player.hp - total);
    room.log.push(`상대: ${rolls.join("+")} = ${total} 데미지`);

    client.emit("battle:rolled", {
      attacker: "opponent",
      rolls,
      total,
      playerHp: room.player.hp,
      opponentHp: room.opponent.hp,
    });

    if (room.player.hp <= 0) {
      await this.endBattle(client, room, false);
      return;
    }

    room.turn = "player";
    client.emit("battle:turn", { turn: "player" });
  }

  private async endBattle(client: Socket, room: BattleRoom, playerWon: boolean) {
    battles.delete(client.id);

    const result = await this.rewards.updateBattleStats(room.player.userId, playerWon);
    const stats = await this.rewards.getBattleStats(room.player.userId);

    client.emit("battle:ended", {
      won: playerWon,
      pointsDelta: result.pointsDelta,
      tierPoints: stats.tierPoints,
      wins: stats.wins,
      losses: stats.losses,
      winStreak: stats.winStreak,
    });
  }

  /** 유저 클론 상대 선택: 0~2999점은 전체 유저 랜덤, 3000점 이상은 유사 점수대 */
  private async pickOpponent(excludeUserId: string, masterMap: Map<number, CharacterMasterRow>): Promise<Fighter> {
    const playerStats = await this.prisma.battleStats.findUnique({
      where: { userId: excludeUserId },
      select: { tierPoints: true },
    });
    const playerPts = playerStats?.tierPoints ?? 0;

    if (playerPts < 3000) {
      // 0~2999점: 콜로세움 참가 여부 관계없이 DB 등록 전체 유저 중 랜덤
      const allUsers = await this.prisma.user.findMany({
        where: {
          id: { not: excludeUserId },
          reward: { is: { equippedCharacterId: { not: null } } },
        },
        select: {
          id: true,
          name: true,
          reward: { select: { equippedCharacterId: true } },
        },
        take: 200,
      });

      if (allUsers.length > 0) {
        const picked = allUsers[Math.floor(Math.random() * allUsers.length)];
        const charId = picked.reward!.equippedCharacterId!;

        let enhancementLevel = 0;
        try {
          const charRecord = await this.prisma.userCharacter.findUnique({
            where: { userId_characterId: { userId: picked.id, characterId: charId } },
            select: { enhancementLevel: true },
          });
          enhancementLevel = charRecord?.enhancementLevel ?? 0;
        } catch { /* silent */ }

        return {
          userId: picked.id,
          nickname: `${picked.name ?? "유저"} (클론)`,
          characterId: charId,
          rarity: masterMap.get(charId)?.rarity ?? "common",
          hp: MAX_HP,
          isPlayer: false,
          enhancementLevel,
        };
      }

      // 장착 캐릭터가 있는 유저 없으면 폴백
      const allCharIds = Array.from(masterMap.keys());
      const fallbackCharId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      return {
        userId: "clone",
        nickname: "케보몬 클론",
        characterId: fallbackCharId,
        rarity: masterMap.get(fallbackCharId)?.rarity ?? "common",
        hp: MAX_HP,
        isPlayer: false,
        enhancementLevel: 0,
      };
    }

    const userSelect = {
      userId: true,
      tierPoints: true,
      user: {
        select: {
          name: true,
          reward: { select: { equippedCharacterId: true } },
        },
      },
    } as const;

    // 3000점 이상: ±1000점 범위 내 유사 점수대 탐색, 점수 차 작은 순 상위 5명 중 랜덤
    let rows: { userId: string; tierPoints: number; user: { name: string | null; reward: { equippedCharacterId: number | null } | null } }[] = [];
    rows = await this.prisma.battleStats.findMany({
      where: {
        userId: { not: excludeUserId },
        user: { reward: { is: { equippedCharacterId: { not: null } } } },
        tierPoints: { gte: playerPts - 1000, lte: playerPts + 1000 },
      },
      select: userSelect,
      take: 30,
    });
    if (rows.length > 0) {
      rows.sort((a, b) => Math.abs(a.tierPoints - playerPts) - Math.abs(b.tierPoints - playerPts));
      rows = rows.slice(0, Math.min(5, rows.length));
      rows = [rows[Math.floor(Math.random() * rows.length)]];
    }

    // 매칭 유저 없으면 도감 캐릭터 클론으로 폴백
    if (rows.length === 0) {
      const allCharIds = Array.from(masterMap.keys());
      const fallbackCharId = allCharIds[Math.floor(Math.random() * allCharIds.length)];
      return {
        userId: "clone",
        nickname: "케보몬 클론",
        characterId: fallbackCharId,
        rarity: masterMap.get(fallbackCharId)?.rarity ?? "common",
        hp: MAX_HP,
        isPlayer: false,
        enhancementLevel: 0,
      };
    }

    const row = rows[0];
    const charId = row.user.reward!.equippedCharacterId!;

    let enhancementLevel = 0;
    try {
      const charRecord = await this.prisma.userCharacter.findUnique({
        where: { userId_characterId: { userId: row.userId, characterId: charId } },
        select: { enhancementLevel: true },
      });
      enhancementLevel = charRecord?.enhancementLevel ?? 0;
    } catch { /* silent */ }

    return {
      userId: row.userId,
      nickname: `${row.user.name ?? "유저"} (클론)`,
      characterId: charId,
      rarity: masterMap.get(charId)?.rarity ?? "common",
      hp: MAX_HP,
      isPlayer: false,
      enhancementLevel,
    };
  }
}

function publicFighter(f: Fighter) {
  return {
    userId: f.userId,
    nickname: f.nickname,
    characterId: f.characterId,
    rarity: f.rarity,
    hp: f.hp,
  };
}

function roomToState(r: BattleRoom, _socketId: string) {
  return {
    player: publicFighter(r.player),
    opponent: publicFighter(r.opponent),
    turn: r.turn,
    maxHp: MAX_HP,
  };
}
