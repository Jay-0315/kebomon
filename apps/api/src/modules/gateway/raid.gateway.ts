import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RewardsService } from "../rewards/rewards.service";
import { PrismaService } from "../prisma/prisma.service";
import { loadCharacterMasterMap } from "../rewards/character-master.util";
import { JwtStrategy } from "../auth/jwt.strategy";

export const RAID_TYPES = [1, 5] as const;
export const MAX_PLAYERS = 5;
export const RAID_COOLDOWN_MS = 4 * 60 * 60 * 1000;

type EggType = "normal" | "big" | "golden";

/** 레어리티 → 레이드 데미지 (rarity는 join 시 캐릭터 마스터에서 한 번 조회해 캐싱한 값) */
function rarityDamage(rarity: string): number {
  if (rarity === "mythic") return 4;
  if (rarity === "legendary") return 3;
  if (rarity === "rare" || rarity === "epic") return 2;
  return 1; // common, uncommon
}

type RaidSeason = {
  id: "dawn" | "day" | "dusk" | "night";
  label: string;
  effect: string;
  goalMult: number;
  damageMult: number;
  endsAt: number;
};

type RaidPattern = {
  id: string;
  label: string;
  hint: string;
  goalMult: number;
  damageMult: number;
  lines: ((nick: string) => string)[];
};

const RAID_META: Record<number, { name: string; points: number; goal: number; cry: string }> = {
  1: { name: "점프 미니게임",  points: 30, goal: 50, cry: "내 장애물을 피할 수 있겠나?!" },
  5: { name: "슈팅 미니게임",  points: 60, goal: 200, cry: "내 군단을 뚫을 수 있겠나?!" },
};

const RAID_PATTERNS: Record<number, RaidPattern[]> = {
  1: [
    {
      id: "rush",
      label: "연속 돌진",
      hint: "짧은 간격으로 장애물이 이어집니다. 점프 성공 피해량이 소폭 증가합니다.",
      goalMult: 1,
      damageMult: 1.1,
      lines: [
        (nick) => `${nick}, 다음 발판은 더 빠를 것이다!`,
        () => "연속 돌진을 버텨낼 수 있겠나?",
      ],
    },
    {
      id: "heavy_wall",
      label: "중압 방벽",
      hint: "보스 체력이 증가하지만 클리어 보상이 안정적으로 유지됩니다.",
      goalMult: 1.2,
      damageMult: 1,
      lines: [
        (nick) => `${nick}, 이 벽은 쉽게 무너지지 않는다.`,
        () => "방벽을 넘어야 길이 열린다!",
      ],
    },
  ],
  5: [
    {
      id: "swarm",
      label: "군단 소환",
      hint: "격추 피해량이 증가합니다. 빠르게 적을 정리하세요.",
      goalMult: 1.05,
      damageMult: 1.15,
      lines: [
        (nick) => `${nick}, 내 군단을 모두 상대해봐라!`,
        () => "사방에서 적이 몰려온다!",
      ],
    },
    {
      id: "arcane_shield",
      label: "마력 보호막",
      hint: "보스 체력이 높아집니다. 랭킹 경쟁에 적합한 패턴입니다.",
      goalMult: 1.25,
      damageMult: 1,
      lines: [
        (nick) => `${nick}, 이 보호막을 뚫을 수 있겠나?`,
        () => "마력 보호막이 보스를 감싼다!",
      ],
    },
  ],
};

function currentRaidSeason(now = new Date()): RaidSeason {
  const kstHour = (now.getUTCHours() + 9) % 24;
  const phaseStart = Math.floor(kstHour / 6) * 6;
  const currentKstHourStartUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    kstHour - 9,
    0,
    0,
    0,
  );
  const endsAt = currentKstHourStartUtc + (phaseStart + 6 - kstHour) * 60 * 60 * 1000;
  if (kstHour < 6) return { id: "night", label: "심야 시즌", effect: "보스 HP +15%, 피해량 +10%", goalMult: 1.15, damageMult: 1.1, endsAt };
  if (kstHour < 12) return { id: "dawn", label: "새벽 시즌", effect: "보스 HP -10%", goalMult: 0.9, damageMult: 1, endsAt };
  if (kstHour < 18) return { id: "day", label: "주간 시즌", effect: "기본 밸런스", goalMult: 1, damageMult: 1, endsAt };
  return { id: "dusk", label: "황혼 시즌", effect: "피해량 +15%", goalMult: 1, damageMult: 1.15, endsAt };
}

function pickRaidPattern(type: number): RaidPattern {
  const pool = RAID_PATTERNS[type] ?? RAID_PATTERNS[1];
  return pool[(Math.random() * pool.length) | 0];
}

export const BOSS_POOL = [
  75,76,116,125,127,139,140,152,155,156,159,174,176,205,258,275,292,333,351,391,
  13,14,84,90,91,105,128,132,144,153,160,161,177,221,259,276,294,304,322,352,355,377,392,
  26,28,29,30,96,104,117,129,163,169,173,178,179,194,240,260,271,277,287,305,323,335,378,393,
  41,42,43,44,99,120,121,131,136,180,206,220,238,241,252,254,272,278,288,293,306,313,324,337,372,388,
  61,135,137,154,191,216,232,233,242,253,267,273,290,307,308,331,338,349,373,389,
  64,65,66,67,69,83,150,158,172,193,204,208,235,239,243,255,268,274,291,309,332,336,339,344,350,375,390,
  4,5,6,7,8,9,74,16,17,18,19,20,21,22,31,32,33,34,35,36,37,38,39,40,51,52,53,54,55,56,57,58,59,60,71,72,73,
  11,12,141,
];
export const randomBoss = () => BOSS_POOL[(Math.random() * BOSS_POOL.length) | 0];

const BOSS_LINES = [
  (nick: string) => `엄청나군… ${nick}.`,
  (nick: string) => `흥, 운이 좋았을 뿐이야, ${nick}!`,
  (nick: string) => `${nick}… 아직 끝나지 않았다!`,
  (_n: string) => `이 정도로 날 막을 순 없어!`,
  (n: string) => `크윽… ${n}, 제법이군.`,
  (_n: string) => `방심했다! 다음엔 그러지 않겠어!`,
  (n: string) => `${n}! 각오해라!`,
  (_n: string) => `한 방 먹었구나… 기억해 둬.`,
  (_n: string) => `아프군… 하지만 이 정도야!`,
  (n: string) => `${n}이여… 강하구나. 하지만!`,
  (n: string) => `큰 데미지다! ${n}, 두렵지 않느냐?`,
  (n: string) => `...놀랍군. ${n}, 그 힘 어디서 왔나?`,
  (n: string) => `${n}! 이 상처 잊지 않겠다!`,
  (_n: string) => `흔들리지 않아! 아직이야!`,
  (n: string) => `${n}, 그 공격… 나름 아팠다.`,
  (_n: string) => `내 방어를 뚫다니… 실력이 있군!`,
  (_n: string) => `크윽! 예상치 못했어!`,
  (_n: string) => `재밌군. 더 덤벼봐!`,
  (n: string) => `${n}, 이 기세 언제까지 갈까?`,
  (_n: string) => `이번엔 내가 한 발 물러선다. 다음은 없다!`,
];
const randomBossLine = (nick: string) => BOSS_LINES[(Math.random() * BOSS_LINES.length) | 0](nick);

const ADJ = ["야비한", "수상한", "느긋한", "용감한", "엉뚱한", "도도한", "발랄한", "시크한", "엉큼한", "낭만적인", "까칠한", "천진한"];
const ANI = ["바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카", "카피바라", "라쿤", "다람쥐", "판다"];
const nick = () => `${ADJ[(Math.random() * ADJ.length) | 0]} ${ANI[(Math.random() * ANI.length) | 0]}`;

interface Player {
  socketId: string;
  characterId: number;
  rarity: string;
  nickname: string;
  raidType: number;
  userId: string | null;
  damage: number;
}

interface RaidRoom {
  type: number;
  players: Map<string, Player>;
  /** 연결 끊긴 뒤에도 랭킹에 포함되도록 기록 유지 */
  departed: { userId: string; damage: number; nickname: string }[];
  progress: number;
  cleared: boolean;
  bossCharId: number;
  season: RaidSeason;
  pattern: RaidPattern;
}

/** 랭킹 보상 결정 */
type RaidRankReward = { kind: "egg"; egg: EggType; count: number } | { kind: "points"; points: number };
function rankReward(rank: number): RaidRankReward {
  if (rank === 1) return { kind: "egg", egg: "golden", count: 1 };
  if (rank === 2) return { kind: "egg", egg: "big", count: 2 };
  if (rank === 3) return { kind: "egg", egg: "big", count: 1 };
  if (rank <= 10) return { kind: "egg", egg: "normal", count: 1 };
  return { kind: "points", points: 100 };
}

const room = (type: number) => `raid:${type}`;

function newRoom(type: number): RaidRoom {
  return {
    type,
    players: new Map(),
    departed: [],
    progress: 0,
    cleared: false,
    bossCharId: randomBoss(),
    season: currentRaidSeason(),
    pattern: pickRaidPattern(type),
  };
}

@WebSocketGateway({
  namespace: "/raid",
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class RaidGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly rewards: RewardsService,
    private readonly prisma: PrismaService,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    try {
      if (!token) throw new Error("no token");
      const payload = this.jwtStrategy.verify(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  private rooms = new Map<number, RaidRoom>();
  private cooldowns = new Map<number, number>();
  private lastRankings = new Map<number, { rank: number; nickname: string; damage: number }[]>();
  /** 현재 미니게임 슬롯에서 입장 제한된 userId 목록 (타입 → 금지 userId Set) */
  private entryBans = new Map<number, Set<string>>();
  async onModuleInit() { /* no preload needed */ }

  private getRoom(type: number): RaidRoom {
    if (!this.rooms.has(type)) this.rooms.set(type, newRoom(type));
    return this.rooms.get(type)!;
  }

  private getBans(type: number): Set<string> {
    if (!this.entryBans.has(type)) this.entryBans.set(type, new Set());
    return this.entryBans.get(type)!;
  }

  private effectiveRaidMeta(r: RaidRoom) {
    const base = RAID_META[r.type];
    return {
      ...base,
      goal: Math.max(1, Math.round(base.goal * r.season.goalMult * r.pattern.goalMult)),
    };
  }

  private calcDamage(player: Player, r: RaidRoom): number {
    return Math.max(1, Math.round(rarityDamage(player.rarity) * r.season.damageMult * r.pattern.damageMult));
  }

  @SubscribeMessage("raid:join")
  async join(
    @MessageBody() data: { raidType: number; characterId: number; nickname?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const type = RAID_TYPES.includes(data?.raidType as 1 | 5) ? data.raidType : 1;
    const userId = client.data.userId as string;

    // 쿨다운 체크
    const until = this.cooldowns.get(type) ?? 0;
    if (until > Date.now()) {
      client.emit("raid:cooldown", { raidType: type, until });
      return;
    }

    let r = this.getRoom(type);
    if (r.cleared) {
      r = newRoom(type);
      this.rooms.set(type, r);
      this.entryBans.delete(type); // 새 슬롯 → 금지 목록 초기화
    }

    // 입장 제한 체크 (로그인 유저만)
    if (userId && this.getBans(type).has(userId)) {
      client.emit("raid:banned", { raidType: type });
      return;
    }

    if (r.players.size >= MAX_PLAYERS) {
      client.emit("raid:full", { raidType: type });
      return;
    }

    // 입장 시 바로 금지 목록에 추가 (1회 입장 보장)
    if (userId) this.getBans(type).add(userId);

    const nickname = (data?.nickname ?? "").trim() || nick();
    const characterId = Number(data?.characterId) || 1;
    const masterMap = await loadCharacterMasterMap(this.prisma);
    r.players.set(client.id, {
      socketId: client.id,
      characterId,
      rarity: masterMap.get(characterId)?.rarity ?? "common",
      nickname,
      raidType: type,
      userId,
      damage: 0,
    });
    client.join(room(type));
    client.emit("raid:self", { socketId: client.id, nickname, characterId: Number(data?.characterId) || 1 });
    this.broadcastState(type);
    this.broadcastCounts();
  }

  @SubscribeMessage("raid:leave")
  leave(@ConnectedSocket() client: Socket) {
    this.removePlayer(client, true);
  }

  /** 프론트에서 라이프 전부 소진 시 호출 */
  @SubscribeMessage("raid:died")
  died(@ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player) return;
    // 라이프 소진 → 데미지 기록 보존하고 강제 퇴장
    this.removePlayer(client, true);
    // 화면은 프론트에서 게임오버로 전환됨
  }


  @SubscribeMessage("raid:gem")
  gem(@ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player || player.raidType !== 5) return;
    const r = this.getRoom(5);
    if (r.cleared) return;
    const dmg = this.calcDamage(player, r);
    r.progress += dmg;
    player.damage += dmg;
    this.applyProgress(r, 5, player.nickname, dmg);
  }

  @SubscribeMessage("raid:jump")
  jump(@ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player || player.raidType !== 1) return;
    const r = this.getRoom(1);
    if (r.cleared) return;
    const dmg = this.calcDamage(player, r);
    r.progress += dmg;
    player.damage += dmg;
    this.applyProgress(r, 1, player.nickname, dmg);
  }

  private applyProgress(r: RaidRoom, type: number, attackerNickname: string, dmg: number) {
    const meta = this.effectiveRaidMeta(r);

    if (!r.cleared) {
      const patternLine = r.pattern.lines[(Math.random() * r.pattern.lines.length) | 0];
      const line = Math.random() < 0.65 ? patternLine(attackerNickname) : randomBossLine(attackerNickname);
      const hp = Math.max(0, meta.goal - r.progress);
      this.server.to(room(type)).emit("raid:bossHit", { line, hp, maxHp: meta.goal, dmg });
    }

    if (r.progress >= meta.goal) {
      r.cleared = true;
      r.progress = meta.goal;
      this.cooldowns.set(type, Date.now() + RAID_COOLDOWN_MS);
      this.distributeRankingRewards(r, type).catch(() => undefined);
    }
    this.broadcastState(type);
    this.broadcastLobby();
  }

  /** 클리어 시 랭킹 산정 → 보상 지급 + 알림 */
  private async distributeRankingRewards(r: RaidRoom, type: number) {
    // 활성 + 이탈 플레이어 합산
    const entries: { userId: string | null; socketId: string | null; damage: number; nickname: string }[] = [
      ...[...r.players.values()].map((p) => ({
        userId: p.userId,
        socketId: p.socketId,
        damage: p.damage,
        nickname: p.nickname,
      })),
      ...r.departed.map((d) => ({
        userId: d.userId,
        socketId: null,
        damage: d.damage,
        nickname: d.nickname,
      })),
    ];

    // 데미지 내림차순 정렬
    entries.sort((a, b) => b.damage - a.damage);

    this.lastRankings.set(type, entries.map((en, idx) => ({ rank: idx + 1, nickname: en.nickname, damage: en.damage })));

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const rank = i + 1;
      const reward = rankReward(rank);

      // 소켓이 연결된 경우 즉시 전송
      if (e.socketId) {
        const rankings = entries.map((en, idx) => ({ rank: idx + 1, nickname: en.nickname, damage: en.damage }));
        this.server.to(e.socketId).emit("raid:cleared", { reward, rank, raidType: type, rankings });
      }

      // DB 보상 지급
      if (e.userId) {
        this.rewards.grantRaidRankingReward(e.userId, reward).catch(() => undefined);
        // 푸시 알림
        this.sendRaidClearedNotification(e.userId, rank).catch(() => undefined);
      }
    }
  }

  private async sendRaidClearedNotification(userId: string, rank: number) {
    try {
      const rewardText = rank === 1 ? "황금알 1개" : rank === 2 ? "큰알 2개" : rank === 3 ? "큰알 1개" : rank <= 10 ? "일반알 1개" : "100P";
      await this.prisma.notification.create({
        data: {
          userId,
          type: "achievement",
          title: "미니게임 클리어!",
          body: `${rank}위 달성! 보상: ${rewardText}`,
          link: "/raid",
        },
      });
    } catch { /* ignore */ }
  }

  @SubscribeMessage("raid:request-rankings")
  onRequestRankings(@MessageBody() data: { raidType: number }, @ConnectedSocket() client: Socket) {
    const rankings = this.lastRankings.get(Number(data.raidType)) ?? [];
    client.emit("raid:rankings", { raidType: Number(data.raidType), rankings });
  }

  @SubscribeMessage("raid:input")
  async input(@MessageBody() data: { text: string }, @ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player) return;
    const text = String(data?.text ?? "").trim().slice(0, 60);
    if (!text) return;

    this.server.to(room(player.raidType)).emit("raid:message", {
      id: `${client.id}-${Date.now()}`,
      socketId: client.id,
      nickname: player.nickname,
      characterId: player.characterId,
      text,
      ts: Date.now(),
    });
  }

  handleDisconnect(client: Socket) {
    this.removePlayer(client, false);
  }

  private findPlayer(socketId: string): Player | undefined {
    for (const r of this.rooms.values()) {
      const p = r.players.get(socketId);
      if (p) return p;
    }
    return undefined;
  }

  private removePlayer(client: Socket, voluntary: boolean) {
    for (const r of this.rooms.values()) {
      const p = r.players.get(socketId(client));
      if (p) {
        // 데미지 기록 보존 (랭킹에 포함)
        if (p.userId && p.damage > 0) {
          r.departed.push({ userId: p.userId, damage: p.damage, nickname: p.nickname });
        }
        r.players.delete(socketId(client));
        client.leave(room(r.type));
        this.broadcastState(r.type);
        this.broadcastCounts();
        // 자발적 퇴장이면 금지 목록에 이미 있으므로 추가 불필요
        if (voluntary && p.userId) {
          this.getBans(r.type).add(p.userId);
        }
        return;
      }
    }
  }

  private missionView(r: RaidRoom) {
    if (r.type === 1) return { label: "장애물을 점프로 넘어라!", target: "SPACE ↑", hint: "스페이스바(또는 화면 터치)로 점프 · 넘을 때마다 데미지" };
    if (r.type === 5) return { label: "적을 격추하여 보스를 공격하라!", target: "← → ↑ ↓ / WASD", hint: "적 격추 1기 = 보스 HP −데미지 · 자동 발사" };
    return { label: "", target: "", hint: "" };
  }

  private broadcastState(type: number) {
    const r = this.getRoom(type);
    const meta = this.effectiveRaidMeta(r);
    const participants = [...r.players.values()].map((p) => ({
      socketId: p.socketId,
      characterId: p.characterId,
      nickname: p.nickname,
      damage: p.damage,
    }));
    this.server.to(room(type)).emit("raid:state", {
      raidType: type,
      name: meta.name,
      boss: { characterId: r.bossCharId, name: "", cry: meta.cry },
      hp: Math.max(0, meta.goal - r.progress),
      maxHp: meta.goal,
      cleared: r.cleared,
      mission: this.missionView(r),
      season: {
        id: r.season.id,
        label: r.season.label,
        effect: r.season.effect,
        endsAt: r.season.endsAt,
      },
      pattern: {
        id: r.pattern.id,
        label: r.pattern.label,
        hint: r.pattern.hint,
      },
      participants,
      count: r.players.size,
      maxPlayers: MAX_PLAYERS,
    });
  }

  @SubscribeMessage("raid:counts")
  handleCounts(@ConnectedSocket() client: Socket) {
    client.emit("raid:lobby", this.getLobbyStatus());
  }

  getLobbyStatus() {
    const info: Record<number, {
      count: number;
      cooldownUntil: number;
      bossCharId: number;
      currentHp: number;
      maxHp: number;
      season: { id: string; label: string; effect: string; endsAt: number };
      pattern: { id: string; label: string; hint: string };
    }> = {};
    for (const t of RAID_TYPES) {
      const activeRoom = this.getRoom(t);
      const meta = this.effectiveRaidMeta(activeRoom);
      info[t] = {
        count: activeRoom.players.size,
        cooldownUntil: this.cooldowns.get(t) ?? 0,
        bossCharId: activeRoom.bossCharId,
        currentHp: activeRoom && !activeRoom.cleared ? Math.max(0, meta.goal - activeRoom.progress) : meta.goal,
        maxHp: meta.goal,
        season: {
          id: activeRoom.season.id,
          label: activeRoom.season.label,
          effect: activeRoom.season.effect,
          endsAt: activeRoom.season.endsAt,
        },
        pattern: {
          id: activeRoom.pattern.id,
          label: activeRoom.pattern.label,
          hint: activeRoom.pattern.hint,
        },
      };
    }
    return info;
  }

  private broadcastCounts() { this.broadcastLobby(); }
  private broadcastLobby() { this.server.emit("raid:lobby", this.getLobbyStatus()); }
}

function socketId(client: Socket): string { return client.id; }
