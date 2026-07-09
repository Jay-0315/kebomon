import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 1:1 카드 배틀 (PvP) — 로그라이크 전투 로직을 그대로 사용하되 유저 vs 유저.
 * 서버 권위(server-authoritative): 모든 HP/에너지/턴/카드 효과를 서버가 계산.
 * 방 생성(제목·비밀번호) → 대기 → 덱 선택(직업별 6덱) → 교대 턴 배틀 → 승패.
 */

const MAX_PLAYERS = 2;
const TURN_MS = 60_000; // 턴 제한 60초
const START_HP = 80;
const START_ENERGY = 3;
const MAX_HAND = 7;

type CardType = "attack" | "skill" | "power";
interface Card {
  id: string;
  name: string; nameJa: string; nameEn: string;
  desc: string; descJa: string; descEn: string;
  cost: number; type: CardType;
  damage?: number; shield?: number; draw?: number;
  poison?: number; strength?: number; heal?: number;
  multiHit?: number; bonusEnergy?: number; selfDamage?: number;
}
interface CardInstance extends Card { uid: string }

// ── 카드 정의 (로그라이크 카드와 동일 컨셉) ──
const C = (
  id: string, name: string, nameJa: string, nameEn: string,
  desc: string, descJa: string, descEn: string,
  cost: number, type: CardType, extra: Partial<Card> = {},
): Card => ({ id, name, nameJa, nameEn, desc, descJa, descEn, cost, type, ...extra });

const CARDS: Record<string, Card> = Object.fromEntries([
  C("strike","스트라이크","ストライク","Strike","6 데미지","6ダメージ","Deal 6 damage",1,"attack",{damage:6}),
  C("defend","방어","ディフェンス","Defend","방어력 5","シールド5","Gain 5 shield",1,"skill",{shield:5}),
  C("bash","강타","バッシュ","Bash","14 데미지","14ダメージ","Deal 14 damage",2,"attack",{damage:14}),
  C("fortify","요새화","フォーティファイ","Fortify","방어력 12","シールド12","Gain 12 shield",2,"skill",{shield:12}),
  C("heavy_blow","묵직한 일격","重い一撃","Heavy Blow","11 데미지","11ダメージ","Deal 11 damage",2,"attack",{damage:11}),
  C("quick_guard","속방어","素早い防御","Quick Guard","방어력 3, 드로우 1","シールド3・ドロー1","Gain 3 shield, draw 1",1,"skill",{shield:3,draw:1}),
  C("power_surge","파워 서지","パワーサージ","Power Surge","20 데미지","20ダメージ","Deal 20 damage",3,"attack",{damage:20}),
  // Warrior
  C("war_howl","전쟁의 외침","戦の咆哮","War Howl","힘 +1, 드로우 1","力+1・ドロー1","Gain 1 strength, draw 1",1,"power",{strength:1,draw:1}),
  C("feral_strike","야성 연타","野性連打","Feral Strike","5 데미지 × 2","5ダメージ×2","Deal 5 damage twice",1,"attack",{damage:5,multiHit:2}),
  C("alpha_wrath","알파의 분노","アルファの怒り","Alpha's Wrath","18 데미지, 힘 +1","18ダメージ・力+1","Deal 18 damage, gain 1 strength",2,"attack",{damage:18,strength:1}),
  C("war_cry","전쟁의 함성","戦いの叫び","War Cry","힘 +3","力+3","Gain 3 strength",2,"power",{strength:3}),
  C("reckless","무모한 공격","無謀な攻撃","Reckless Swing","7 데미지, 자신 2 피해","7ダメージ・自身2","Deal 7 damage, take 2",0,"attack",{damage:7,selfDamage:2}),
  // Rogue
  C("scratch","할퀴기","引っ掻き","Scratch","4 데미지","4ダメージ","Deal 4 damage",0,"attack",{damage:4}),
  C("pounce","도약 공격","飛び掛かり","Pounce","8 데미지, 에너지 +1","8ダメージ・エナジー+1","Deal 8 damage, gain 1 energy",1,"attack",{damage:8,bonusEnergy:1}),
  C("smoke_bomb","연막탄","煙幕弾","Smoke Bomb","방어력 10, 드로우 1","シールド10・ドロー1","Gain 10 shield, draw 1",1,"skill",{shield:10,draw:1}),
  C("swift_strike","신속 공격","迅速打","Swift Strike","5 데미지, 드로우 1","5ダメージ・ドロー1","Deal 5 damage, draw 1",1,"attack",{damage:5,draw:1}),
  C("twin_fang","쌍날 송곳니","双牙","Twin Fang","5 데미지 × 2","5ダメージ×2","Deal 5 damage twice",1,"attack",{damage:5,multiHit:2}),
  // Mage
  C("soul_drain","영혼 흡수","魂の吸収","Soul Drain","10 데미지, HP +5","10ダメージ・HP+5","Deal 10 damage, heal 5 HP",2,"attack",{damage:10,heal:5}),
  C("haunt","저주","呪い","Haunt","6 데미지, 독 2","6ダメージ・毒2","Deal 6 damage, apply 2 poison",1,"attack",{damage:6,poison:2}),
  C("arcane_surge","비전 서지","アーケインサージ","Arcane Surge","16 데미지, 드로우 1","16ダメージ・ドロー1","Deal 16 damage, draw 1",2,"attack",{damage:16,draw:1}),
  C("curse_bolt","저주 번개","呪いの稲妻","Curse Bolt","18 데미지, 독 3","18ダメージ・毒3","Deal 18 damage, apply 3 poison",2,"attack",{damage:18,poison:3}),
  // Tank
  C("shell_block","등껍질 방어","甲羅防御","Shell Block","방어력 9","シールド9","Gain 9 shield",1,"skill",{shield:9}),
  C("crush_bite","분쇄 물기","砕く噛みつき","Crush Bite","13 데미지","13ダメージ","Deal 13 damage",2,"attack",{damage:13}),
  C("fortress","요새","要塞","Fortress","방어력 16, 힘 +1","シールド16・力+1","Gain 16 shield, gain 1 strength",2,"skill",{shield:16,strength:1}),
  C("body_slam","몸통 박치기","体当たり","Body Slam","10 데미지, 방어력 8","10ダメージ・シールド8","Deal 10 damage, gain 8 shield",2,"attack",{damage:10,shield:8}),
  C("iron_wall","철벽","鉄壁","Iron Wall","방어력 18","シールド18","Gain 18 shield",3,"skill",{shield:18}),
  // Nature
  C("thorn_strike","가시 공격","棘攻撃","Thorn Strike","7 데미지","7ダメージ","Deal 7 damage",1,"attack",{damage:7}),
  C("spore_cloud","포자 구름","胞子の雲","Spore Cloud","독 3, 방어력 4","毒3・シールド4","Apply 3 poison, gain 4 shield",1,"skill",{poison:3,shield:4}),
  C("rejuvenate","재생","再生","Rejuvenate","HP +14","HP+14","Heal 14 HP",2,"skill",{heal:14}),
  C("vine_lash","넝쿨 채찍","蔓の鞭","Vine Lash","8 데미지, 독 1","8ダメージ・毒1","Deal 8 damage, apply 1 poison",1,"attack",{damage:8,poison:1}),
  C("photosyn","광합성","光合成","Photosynthesis","HP +8, 드로우 2","HP+8・ドロー2","Heal 8 HP, draw 2",2,"skill",{heal:8,draw:2}),
  // Wild
  C("overclock","오버클록","オーバークロック","Overclock","에너지 +2","エナジー+2","Gain 2 energy",1,"power",{bonusEnergy:2}),
  C("self_repair","자가 수리","自己修復","Self-Repair","방어력 8, HP +8","シールド8・HP+8","Gain 8 shield, heal 8 HP",2,"skill",{shield:8,heal:8}),
  C("absorb","흡수","吸収","Absorb","방어력 8","シールド8","Gain 8 shield",1,"skill",{shield:8}),
  C("shock_blast","충격 파동","衝撃波","Shock Blast","12 데미지, 독 2","12ダメージ・毒2","Deal 12 damage, apply 2 poison",2,"attack",{damage:12,poison:2}),
  // Legendary
  C("final_strike","최후의 일격","最後の一撃","Final Strike","40 데미지","40ダメージ","Deal 40 damage",3,"attack",{damage:40}),
].map((c) => [c.id, c]));

// ── 직업별 6덱 (각 10장) ──
interface DeckDef { id: string; name: string; nameJa: string; nameEn: string; color: string; charType: string; cards: string[] }
const DECKS: DeckDef[] = [
  { id:"warrior", name:"전사", nameJa:"戦士", nameEn:"Warrior", color:"#ef4444", charType:"wolf",
    cards:["strike","strike","strike","defend","defend","bash","war_cry","alpha_wrath","feral_strike","final_strike"] },
  { id:"rogue", name:"도적", nameJa:"盗賊", nameEn:"Rogue", color:"#a855f7", charType:"fox",
    cards:["strike","strike","scratch","defend","swift_strike","pounce","twin_fang","smoke_bomb","feral_strike","power_surge"] },
  { id:"mage", name:"마법사", nameJa:"魔法使い", nameEn:"Mage", color:"#3b82f6", charType:"dragon",
    cards:["strike","strike","haunt","haunt","defend","soul_drain","arcane_surge","curse_bolt","vine_lash","power_surge"] },
  { id:"tank", name:"수호자", nameJa:"守護者", nameEn:"Guardian", color:"#22c55e", charType:"turtle",
    cards:["strike","defend","defend","shell_block","shell_block","crush_bite","body_slam","fortress","iron_wall","bash"] },
  { id:"nature", name:"자연", nameJa:"自然", nameEn:"Nature", color:"#84cc16", charType:"plant",
    cards:["strike","thorn_strike","thorn_strike","defend","spore_cloud","vine_lash","rejuvenate","photosyn","shock_blast","curse_bolt"] },
  { id:"wild", name:"야생", nameJa:"野生", nameEn:"Wild", color:"#f59e0b", charType:"robot",
    cards:["strike","strike","absorb","absorb","overclock","self_repair","shock_blast","heavy_blow","bash","power_surge"] },
];
const deckMaxEnergy = (deckId: string) => (deckId === "rogue" || deckId === "wild" ? 4 : START_ENERGY);

// ── 유틸 ──
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function uid() { return Math.random().toString(36).slice(2, 9); }
function roomId() { return Math.random().toString(36).slice(2, 8); }

interface Player {
  socketId: string;
  userId: string | null;
  nickname: string;
  characterId: number;
  deckId: string | null;
  // battle state
  hp: number; maxHp: number;
  shield: number; strength: number; poison: number;
  energy: number; maxEnergy: number;
  deck: CardInstance[]; hand: CardInstance[]; drawPile: CardInstance[]; discardPile: CardInstance[];
}

type DuelPhase = "waiting" | "deck" | "battle" | "over";
interface DuelRoom {
  id: string;
  title: string;
  password: string | null;
  hostId: string;
  phase: DuelPhase;
  players: Player[];
  turnSocketId: string | null;
  turnEndsAt: number;
  winnerSocketId: string | null;
  log: string[];
  timer: ReturnType<typeof setTimeout> | null;
}

function newPlayer(socketId: string, userId: string | null, nickname: string, characterId: number): Player {
  return {
    socketId, userId, nickname, characterId, deckId: null,
    hp: START_HP, maxHp: START_HP, shield: 0, strength: 0, poison: 0,
    energy: START_ENERGY, maxEnergy: START_ENERGY,
    deck: [], hand: [], drawPile: [], discardPile: [],
  };
}

@WebSocketGateway({ namespace: "/duel", cors: { origin: true, credentials: true }, path: "/socket.io" })
export class DuelGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private rooms = new Map<string, DuelRoom>();

  constructor(private readonly prisma: PrismaService) {}

  // ── 로비 ──
  @SubscribeMessage("duel:list")
  list(@ConnectedSocket() client: Socket) {
    client.emit("duel:lobby", this.lobby());
  }

  private lobby() {
    return {
      rooms: [...this.rooms.values()]
        .filter((r) => r.phase === "waiting")
        .map((r) => ({ id: r.id, title: r.title, hasPassword: !!r.password, count: r.players.length, max: MAX_PLAYERS })),
    };
  }
  private broadcastLobby() { this.server.emit("duel:lobby", this.lobby()); }

  @SubscribeMessage("duel:create")
  create(
    @MessageBody() data: { title?: string; password?: string; nickname?: string; userId?: string; characterId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.removeFromAnyRoom(client); // 중복 방지
    const id = roomId();
    const title = String(data?.title ?? "").trim().slice(0, 30) || "카드 배틀";
    const password = String(data?.password ?? "").trim().slice(0, 20) || null;
    const room: DuelRoom = {
      id, title, password, hostId: client.id, phase: "waiting",
      players: [newPlayer(client.id, data?.userId ?? null, this.nick(data?.nickname), Number(data?.characterId) || 1)],
      turnSocketId: null, turnEndsAt: 0, winnerSocketId: null, log: [], timer: null,
    };
    this.rooms.set(id, room);
    client.join(this.ch(id));
    client.emit("duel:self", { socketId: client.id });
    this.broadcastRoom(room);
    this.broadcastLobby();
  }

  @SubscribeMessage("duel:join")
  join(
    @MessageBody() data: { roomId: string; password?: string; nickname?: string; userId?: string; characterId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.rooms.get(String(data?.roomId));
    if (!room || room.phase !== "waiting") { client.emit("duel:error", { msg: "방을 찾을 수 없어요" }); return; }
    if (room.players.length >= MAX_PLAYERS) { client.emit("duel:error", { msg: "방이 가득 찼어요" }); return; }
    if (room.password && room.password !== String(data?.password ?? "").trim()) {
      client.emit("duel:error", { msg: "비밀번호가 틀려요" }); return;
    }
    this.removeFromAnyRoom(client);
    room.players.push(newPlayer(client.id, data?.userId ?? null, this.nick(data?.nickname), Number(data?.characterId) || 1));
    client.join(this.ch(room.id));
    client.emit("duel:self", { socketId: client.id });
    this.broadcastRoom(room);
    this.broadcastLobby();
  }

  @SubscribeMessage("duel:leave")
  leave(@ConnectedSocket() client: Socket) {
    this.removeFromAnyRoom(client);
    client.emit("duel:left", {});
  }

  // 호스트가 게임 시작 → 덱 선택 단계
  @SubscribeMessage("duel:start")
  start(@ConnectedSocket() client: Socket) {
    const room = this.findRoom(client.id);
    if (!room || room.hostId !== client.id) return;
    if (room.players.length < MAX_PLAYERS || room.phase !== "waiting") return;
    room.phase = "deck";
    this.broadcastRoom(room);
    this.broadcastLobby();
  }

  // 덱 선택 (양쪽 모두 고르면 배틀 시작)
  @SubscribeMessage("duel:deck")
  pickDeck(@MessageBody() data: { deckId: string }, @ConnectedSocket() client: Socket) {
    const room = this.findRoom(client.id);
    if (!room || room.phase !== "deck") return;
    const p = room.players.find((x) => x.socketId === client.id);
    if (!p) return;
    if (!DECKS.some((d) => d.id === data?.deckId)) return;
    p.deckId = data.deckId;
    if (room.players.length === MAX_PLAYERS && room.players.every((x) => x.deckId)) {
      this.beginBattle(room);
    } else {
      this.broadcastRoom(room);
    }
  }

  @SubscribeMessage("duel:play")
  play(@MessageBody() data: { handIdx: number }, @ConnectedSocket() client: Socket) {
    const room = this.findRoom(client.id);
    if (!room || room.phase !== "battle" || room.turnSocketId !== client.id) return;
    const me = room.players.find((x) => x.socketId === client.id)!;
    const opp = room.players.find((x) => x.socketId !== client.id)!;
    const idx = Number(data?.handIdx);
    const card = me.hand[idx];
    if (!card || me.energy < card.cost) return;

    me.energy -= card.cost;
    me.hand.splice(idx, 1);
    me.discardPile.push(card);
    this.applyCard(room, me, opp, card);

    if (opp.hp <= 0) { this.endGame(room, me.socketId); return; }
    if (me.hp <= 0) { this.endGame(room, opp.socketId); return; }
    this.broadcastState(room);
  }

  @SubscribeMessage("duel:end")
  end(@ConnectedSocket() client: Socket) {
    const room = this.findRoom(client.id);
    if (!room || room.phase !== "battle" || room.turnSocketId !== client.id) return;
    this.nextTurn(room);
  }

  handleDisconnect(client: Socket) {
    const room = this.findRoom(client.id);
    if (room && room.phase === "battle") {
      const opp = room.players.find((x) => x.socketId !== client.id);
      if (opp) { this.endGame(room, opp.socketId, true); return; }
    }
    this.removeFromAnyRoom(client);
  }

  // ── 전투 엔진 ──
  private beginBattle(room: DuelRoom) {
    for (const p of room.players) {
      const def = DECKS.find((d) => d.id === p.deckId)!;
      p.deck = def.cards.map((cid) => ({ ...CARDS[cid], uid: uid() }));
      p.maxHp = START_HP; p.hp = START_HP;
      p.shield = 0; p.strength = 0; p.poison = 0;
      p.maxEnergy = deckMaxEnergy(p.deckId!);
      p.energy = p.maxEnergy;
      p.drawPile = shuffle(p.deck);
      p.hand = []; p.discardPile = [];
    }
    room.phase = "battle";
    room.winnerSocketId = null;
    room.log = ["배틀 시작!"];
    // 선공 랜덤
    const first = room.players[Math.floor(Math.random() * room.players.length)];
    this.startTurn(room, first.socketId, true);
    this.broadcastRoom(room);
    this.broadcastLobby();
  }

  private drawN(p: Player, n: number) {
    for (let i = 0; i < n; i++) {
      if (p.drawPile.length === 0) {
        if (p.discardPile.length === 0) break;
        p.drawPile = shuffle(p.discardPile); p.discardPile = [];
      }
      if (p.drawPile.length > 0 && p.hand.length < MAX_HAND) p.hand.push(p.drawPile.shift()!);
      else if (p.drawPile.length > 0) p.drawPile.shift();
    }
  }

  private startTurn(room: DuelRoom, socketId: string, first = false) {
    const me = room.players.find((x) => x.socketId === socketId)!;
    const opp = room.players.find((x) => x.socketId !== socketId)!;
    // 이전 손패 버리기
    me.discardPile.push(...me.hand); me.hand = [];
    // 독 피해
    if (me.poison > 0) {
      me.hp = Math.max(0, me.hp - me.poison);
      room.log.push(`${me.nickname} 독 -${me.poison}`);
      me.poison = Math.max(0, me.poison - 1);
      if (me.hp <= 0) { this.endGame(room, opp.socketId); return; }
    }
    me.shield = 0;
    me.energy = me.maxEnergy;
    this.drawN(me, 5);
    room.turnSocketId = socketId;
    room.turnEndsAt = Date.now() + TURN_MS;
    if (!first) room.log.push(`${me.nickname} 턴`);
    this.armTimer(room);
    this.broadcastState(room);
  }

  private nextTurn(room: DuelRoom) {
    const cur = room.turnSocketId;
    const next = room.players.find((x) => x.socketId !== cur);
    if (next) this.startTurn(room, next.socketId);
  }

  private armTimer(room: DuelRoom) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = setTimeout(() => {
      if (room.phase === "battle") { room.log.push("⏰ 시간 초과 — 턴 종료"); this.nextTurn(room); }
    }, TURN_MS);
  }

  private applyCard(room: DuelRoom, me: Player, opp: Player, card: Card) {
    const logs: string[] = [];
    if (card.strength) { me.strength += card.strength; logs.push(`힘+${card.strength}`); }
    if (card.damage) {
      const hits = card.multiHit ?? 1;
      let total = 0;
      for (let i = 0; i < hits; i++) {
        const raw = card.damage + me.strength;
        const abs = Math.min(opp.shield, raw);
        opp.shield = Math.max(0, opp.shield - abs);
        opp.hp = Math.max(0, opp.hp - (raw - abs));
        total += raw;
      }
      logs.push(`${total} 데미지${hits > 1 ? ` ×${hits}` : ""}`);
    }
    if (card.shield) { me.shield += card.shield; logs.push(`방어+${card.shield}`); }
    if (card.heal) { const h = Math.min(card.heal, me.maxHp - me.hp); me.hp = Math.min(me.maxHp, me.hp + card.heal); if (h > 0) logs.push(`HP+${h}`); }
    if (card.poison) { opp.poison += card.poison; logs.push(`독${card.poison}`); }
    if (card.bonusEnergy) { me.energy += card.bonusEnergy; logs.push(`에너지+${card.bonusEnergy}`); }
    if (card.selfDamage) { me.hp = Math.max(0, me.hp - card.selfDamage); logs.push(`자신-${card.selfDamage}`); }
    if (card.draw) this.drawN(me, card.draw);
    room.log.push(`[${card.name}] ${logs.join(", ")}`);
    if (room.log.length > 30) room.log.splice(0, room.log.length - 30);
  }

  private endGame(room: DuelRoom, winnerSocketId: string, byForfeit = false) {
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    room.phase = "over";
    room.winnerSocketId = winnerSocketId;
    const winner = room.players.find((x) => x.socketId === winnerSocketId);
    const loser = room.players.find((x) => x.socketId !== winnerSocketId);
    room.log.push(byForfeit ? `상대가 나가 ${winner?.nickname} 승리!` : `${winner?.nickname} 승리!`);
    if (winner?.userId) void this.recordDuelResult(winner.userId, true);
    if (loser?.userId) void this.recordDuelResult(loser.userId, false);
    this.broadcastState(room);
    this.server.to(this.ch(room.id)).emit("duel:over", { winnerSocketId, byForfeit });
    this.broadcastLobby();
  }

  // ── 전적/랭킹 ──
  private async recordDuelResult(userId: string, won: boolean) {
    try {
      const ex = await this.prisma.duelStats.findUnique({ where: { userId } });
      const prev = ex ?? { wins: 0, losses: 0, winStreak: 0, bestStreak: 0 };
      const winStreak = won ? prev.winStreak + 1 : 0;
      const data = {
        wins: won ? prev.wins + 1 : prev.wins,
        losses: won ? prev.losses : prev.losses + 1,
        winStreak,
        bestStreak: Math.max(prev.bestStreak, winStreak),
      };
      await this.prisma.duelStats.upsert({
        where: { userId }, create: { userId, ...data }, update: data,
      });
    } catch {
      // 전적 갱신 실패가 게임 결과 자체에 영향을 주지 않도록 무시
    }
  }

  async getUserStats(userId: string) {
    const s = await this.prisma.duelStats.findUnique({ where: { userId } });
    return {
      wins: s?.wins ?? 0, losses: s?.losses ?? 0,
      winStreak: s?.winStreak ?? 0, bestStreak: s?.bestStreak ?? 0,
    };
  }

  async getRanking(limit = 50) {
    const rows = await this.prisma.duelStats.findMany({
      where: { wins: { gt: 0 } },
      orderBy: [{ wins: "desc" }, { bestStreak: "desc" }],
      take: limit,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.userId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      nickname: nameById.get(r.userId) ?? "플레이어",
      wins: r.wins,
      losses: r.losses,
      bestStreak: r.bestStreak,
    }));
  }

  // ── 브로드캐스트 ──
  private publicPlayer(p: Player) {
    return { socketId: p.socketId, nickname: p.nickname, characterId: p.characterId, deckId: p.deckId, deckName: p.deckId ? DECKS.find((d) => d.id === p.deckId)?.name : null };
  }

  private broadcastRoom(room: DuelRoom) {
    this.server.to(this.ch(room.id)).emit("duel:room", {
      id: room.id, title: room.title, hasPassword: !!room.password,
      phase: room.phase, hostId: room.hostId,
      players: room.players.map((p) => this.publicPlayer(p)),
      decks: DECKS.map((d) => ({ id: d.id, name: d.name, nameJa: d.nameJa, nameEn: d.nameEn, color: d.color, charType: d.charType })),
    });
    if (room.phase === "battle" || room.phase === "over") this.broadcastState(room);
  }

  private broadcastState(room: DuelRoom) {
    for (const me of room.players) {
      const opp = room.players.find((x) => x.socketId !== me.socketId);
      this.server.to(me.socketId).emit("duel:state", {
        phase: room.phase,
        roomId: room.id,
        turnSocketId: room.turnSocketId,
        yourTurn: room.turnSocketId === me.socketId,
        turnEndsAt: room.turnEndsAt,
        winnerSocketId: room.winnerSocketId,
        log: room.log.slice(-8),
        you: {
          socketId: me.socketId, nickname: me.nickname, characterId: me.characterId,
          hp: me.hp, maxHp: me.maxHp, shield: me.shield, strength: me.strength, poison: me.poison,
          energy: me.energy, maxEnergy: me.maxEnergy,
          hand: me.hand, deckCount: me.drawPile.length, discardCount: me.discardPile.length,
        },
        opp: opp ? {
          socketId: opp.socketId, nickname: opp.nickname, characterId: opp.characterId,
          hp: opp.hp, maxHp: opp.maxHp, shield: opp.shield, strength: opp.strength, poison: opp.poison,
          energy: opp.energy, maxEnergy: opp.maxEnergy, handCount: opp.hand.length, deckCount: opp.drawPile.length,
        } : null,
      });
    }
  }

  // ── helpers ──
  private ch(id: string) { return `duel:${id}`; }
  private nick(n?: string) { return (String(n ?? "").trim().slice(0, 16)) || "도전자"; }
  private findRoom(socketId: string): DuelRoom | undefined {
    for (const r of this.rooms.values()) if (r.players.some((p) => p.socketId === socketId)) return r;
    return undefined;
  }
  private removeFromAnyRoom(client: Socket) {
    const room = this.findRoom(client.id);
    if (!room) return;
    client.leave(this.ch(room.id));
    room.players = room.players.filter((p) => p.socketId !== client.id);
    if (room.players.length === 0) {
      if (room.timer) clearTimeout(room.timer);
      this.rooms.delete(room.id);
    } else {
      // 남은 사람이 새 호스트, 대기 상태로 되돌림
      if (room.hostId === client.id) room.hostId = room.players[0].socketId;
      if (room.phase === "deck") { room.phase = "waiting"; room.players.forEach((p) => (p.deckId = null)); }
      this.broadcastRoom(room);
    }
    this.broadcastLobby();
  }
}
