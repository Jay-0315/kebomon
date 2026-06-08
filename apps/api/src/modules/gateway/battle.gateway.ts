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

/** 레어리티 → 주사위 설정 (faces, count) */
const RARITY_DICE: Record<string, { faces: number; count: number }> = {
  common:     { faces: 6,  count: 1 },
  uncommon:   { faces: 6,  count: 1 },
  rare:       { faces: 8,  count: 1 },
  epic:       { faces: 12, count: 1 },
  legendary:  { faces: 6,  count: 2 },
  mythic:     { faces: 8,  count: 2 },
};

const CHAR_RARITY: Record<number, string> = {
  4:"common",5:"common",6:"common",7:"common",8:"common",9:"common",
  11:"common",12:"common",13:"uncommon",14:"uncommon",16:"uncommon",
  17:"uncommon",18:"uncommon",19:"uncommon",20:"uncommon",21:"uncommon",
  22:"uncommon",26:"rare",28:"rare",29:"rare",30:"rare",31:"rare",
  32:"rare",33:"rare",34:"rare",35:"rare",36:"rare",37:"epic",38:"epic",
  39:"epic",40:"epic",41:"epic",42:"epic",43:"epic",44:"epic",
  51:"legendary",52:"legendary",53:"legendary",54:"legendary",55:"legendary",
  56:"legendary",57:"legendary",58:"legendary",59:"legendary",60:"legendary",
  61:"legendary",64:"mythic",65:"mythic",66:"mythic",67:"mythic",69:"mythic",
  71:"mythic",72:"mythic",73:"mythic",74:"common",75:"common",76:"common",
  83:"mythic",84:"uncommon",90:"uncommon",91:"uncommon",96:"rare",99:"epic",
  104:"rare",105:"uncommon",116:"common",117:"rare",120:"epic",121:"epic",
  125:"common",127:"common",128:"uncommon",129:"rare",131:"epic",132:"uncommon",
  135:"legendary",136:"epic",137:"legendary",139:"common",140:"common",
  141:"common",144:"uncommon",150:"mythic",152:"common",153:"uncommon",
  154:"legendary",155:"common",156:"common",158:"mythic",159:"common",
  160:"uncommon",161:"uncommon",163:"rare",169:"rare",172:"mythic",
  173:"rare",174:"common",176:"common",177:"uncommon",178:"rare",179:"rare",
  180:"epic",191:"legendary",193:"mythic",194:"rare",204:"mythic",205:"common",
  206:"epic",208:"mythic",216:"legendary",220:"epic",221:"uncommon",
  232:"legendary",233:"legendary",235:"mythic",238:"epic",239:"mythic",
  240:"rare",241:"epic",242:"legendary",243:"mythic",252:"epic",
  253:"legendary",254:"epic",255:"mythic",258:"common",259:"uncommon",
  260:"rare",267:"legendary",268:"mythic",271:"rare",272:"epic",
  273:"legendary",274:"mythic",275:"common",276:"uncommon",277:"rare",
  278:"epic",287:"rare",288:"epic",290:"legendary",291:"mythic",292:"common",
  293:"epic",294:"uncommon",304:"uncommon",305:"rare",306:"epic",
  307:"legendary",308:"legendary",309:"mythic",313:"epic",322:"uncommon",
  323:"rare",324:"epic",331:"legendary",332:"mythic",333:"common",335:"rare",
  336:"mythic",337:"epic",338:"legendary",339:"mythic",344:"mythic",
  349:"legendary",350:"mythic",351:"common",352:"uncommon",355:"uncommon",
  372:"epic",373:"legendary",375:"mythic",377:"uncommon",378:"rare",
  388:"epic",389:"legendary",390:"mythic",391:"common",392:"uncommon",
  393:"rare",
};

function rollDice(faces: number, count: number): { rolls: number[]; total: number } {
  const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * faces));
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
    const rarity = CHAR_RARITY[characterId] ?? "common";

    // 랜덤 클론 상대 선택
    const opponent = await this.pickOpponent(userId);

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
  async onRoll(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = battles.get(client.id);
    if (!room || room.turn !== "player") return;

    const dice = RARITY_DICE[room.player.rarity] ?? RARITY_DICE.common;
    const { rolls, total } = rollDice(dice.faces, dice.count);

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

  private async runOpponentTurn(client: Socket, room: BattleRoom) {
    if (!battles.has(client.id)) return;

    const dice = RARITY_DICE[room.opponent.rarity] ?? RARITY_DICE.common;
    const { rolls, total } = rollDice(dice.faces, dice.count);

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

  /** 현재 등록된 유저 중 랜덤 1명의 장착 캐릭터를 클론으로 반환 */
  private async pickOpponent(excludeUserId: string): Promise<Fighter> {
    const rows = await this.prisma.userReward.findMany({
      where: {
        userId: { not: excludeUserId },
        equippedCharacterId: { not: null },
      },
      select: {
        userId: true,
        equippedCharacterId: true,
        user: { select: { name: true } },
      },
      take: 100,
    });

    if (rows.length === 0) {
      // 상대가 없을 경우 기본 클론
      return {
        userId: "clone",
        nickname: "케보몬 클론",
        characterId: 4,
        rarity: "common",
        hp: MAX_HP,
        isPlayer: false,
      };
    }

    const row = rows[Math.floor(Math.random() * rows.length)];
    const charId = row.equippedCharacterId!;
    return {
      userId: row.userId,
      nickname: `${row.user.name} (클론)`,
      characterId: charId,
      rarity: CHAR_RARITY[charId] ?? "common",
      hp: MAX_HP,
      isPlayer: false,
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
