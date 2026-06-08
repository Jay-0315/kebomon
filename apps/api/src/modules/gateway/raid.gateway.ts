import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { RewardsService } from "../rewards/rewards.service";
import { PrismaService } from "../prisma/prisma.service";

export const RAID_TYPES = [1, 3, 4, 5] as const;
export const MAX_PLAYERS = 5;
export const RAID_COOLDOWN_MS = 4 * 60 * 60 * 1000;

type EggType = "normal" | "big" | "golden";

/** 캐릭터 ID → 레어리티 맵 (가챠+업적+스타터 전체) */
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

/** 레어리티 → 레이드 데미지 */
function rarityDamage(charId: number): number {
  const r = CHAR_RARITY[charId] ?? "common";
  if (r === "mythic") return 4;
  if (r === "legendary") return 3;
  if (r === "rare" || r === "epic") return 2;
  return 1; // common, uncommon
}

const RAID_META: Record<number, { name: string; points: number; goal: number; cry: string }> = {
  1: { name: "점프 레이드",      points: 30, goal: 40, cry: "내 장애물을 피할 수 있겠나?!" },
  3: { name: "퀴즈 레이드",      points: 50, goal: 25, cry: "내 물음에 답하라!" },
  4: { name: "받아쓰기 레이드",  points: 80, goal: 25, cry: "정확히 받아써라. 오차는 없다." },
  5: { name: "탄막 레이드",      points: 60, goal: 30, cry: "내 탄막을 피할 수 있겠나?!" },
};

const BOSS_POOL = [
  75,76,116,125,127,139,140,152,155,156,159,174,176,205,258,275,292,333,351,391,
  13,14,84,90,91,105,128,132,144,153,160,161,177,221,259,276,294,304,322,352,355,377,392,
  26,28,29,30,96,104,117,129,163,169,173,178,179,194,240,260,271,277,287,305,323,335,378,393,
  41,42,43,44,99,120,121,131,136,180,206,220,238,241,252,254,272,278,288,293,306,313,324,337,372,388,
  61,135,137,154,191,216,232,233,242,253,267,273,290,307,308,331,338,349,373,389,
  64,65,66,67,69,83,150,158,172,193,204,208,235,239,243,255,268,274,291,309,332,336,339,344,350,375,390,
  4,5,6,7,8,9,74,16,17,18,19,20,21,22,31,32,33,34,35,36,37,38,39,40,51,52,53,54,55,56,57,58,59,60,71,72,73,
  11,12,141,
];
const randomBoss = () => BOSS_POOL[(Math.random() * BOSS_POOL.length) | 0];

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

// ─── 퀴즈 뱅크 ──────────────────────────────────────────────────
const QUIZ_BANK: { q: string; a: string[] }[] = [
  { q: "1부터 100까지 모든 자연수의 합은?", a: ["5050"] },
  { q: "물의 화학식은? (영문)", a: ["H2O"] },
  { q: "원주율을 소수점 둘째 자리까지 쓰면?", a: ["3.14"] },
  { q: "지구에서 가장 깊은 해구의 이름은?", a: ["마리아나해구", "마리아나"] },
  { q: "피보나치 수열에서 13 다음 수는?", a: ["21"] },
  { q: "13 × 7 = ?", a: ["91"] },
  { q: "정육면체의 모서리 개수는?", a: ["12", "12개"] },
  { q: "셰익스피어 4대 비극 중 덴마크 왕자가 주인공인 작품은?", a: ["햄릿"] },
  { q: "2의 10제곱은?", a: ["1024"] },
  { q: "빛의 속도는 초속 약 몇 km? (숫자만)", a: ["300000", "30만"] },
  { q: "삼각형 내각의 합은 몇 도?", a: ["180", "180도"] },
  { q: "DNA 이중나선 구조를 발견한 과학자 한 명은?", a: ["왓슨", "크릭"] },
  { q: "144의 양의 제곱근은?", a: ["12"] },
  { q: "조선을 건국한 왕의 이름은?", a: ["이성계", "태조", "태조이성계"] },
  { q: "1바이트는 몇 비트?", a: ["8", "8비트"] },
  { q: "세계에서 가장 큰 대륙은?", a: ["아시아"] },
  { q: "지구의 자전 주기는 약 몇 시간?", a: ["24", "24시간"] },
  { q: "가장 가벼운 원소는?", a: ["수소"] },
  { q: "한국의 국화는?", a: ["무궁화"] },
  { q: "소설 '어린 왕자'의 작가는?", a: ["생텍쥐페리"] },
];

// ─── 받아쓰기 문장 ────────────────────────────────────────────────
const TYPING_SENTENCES = [
  "천 리 길도 한 걸음부터", "시작이 반이다", "티끌 모아 태산",
  "가랑비에 옷 젖는 줄 모른다", "돌다리도 두드려 보고 건너라",
  "노력은 절대 배신하지 않는다", "오늘 할 수 있는 일을 내일로 미루지 마라",
  "실패는 성공의 어머니다", "자신을 믿는 자만이 앞으로 나아갈 수 있다",
  "작은 일에 최선을 다하는 사람이 큰 일도 해낸다",
  "현재에 충실하면 미래는 저절로 열린다",
  "꿈을 계속 간직하면 반드시 실현할 때가 온다",
  "성공은 포기하지 않는 사람의 것이다",
  "위대한 일은 작은 습관들이 쌓여 만들어진다",
  "오늘의 절약이 내일의 풍요를 만든다",
  "지출을 기록하면 소비가 줄어든다",
  "현명한 소비가 미래를 바꾼다",
  "절약은 어려운 일이 아니라 습관의 문제다",
  "로마는 하루아침에 이루어지지 않았다",
  "포기하지 않으면 끝난 것이 아니다",
];

const ADJ = ["야비한", "수상한", "느긋한", "용감한", "엉뚱한", "도도한", "발랄한", "시크한", "엉큼한", "낭만적인", "까칠한", "천진한"];
const ANI = ["바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카", "카피바라", "라쿤", "다람쥐", "판다"];
const nick = () => `${ADJ[(Math.random() * ADJ.length) | 0]} ${ANI[(Math.random() * ANI.length) | 0]}`;

interface Player {
  socketId: string;
  characterId: number;
  nickname: string;
  raidType: number;
  userId: string | null;
  damage: number; // 이 세션에서 가한 총 데미지
}

interface RaidRoom {
  type: number;
  players: Map<string, Player>;
  /** 연결 끊긴 뒤에도 랭킹에 포함되도록 기록 유지 */
  departed: { userId: string; damage: number; nickname: string }[];
  progress: number;
  cleared: boolean;
  bossCharId: number;
  quizIndex: number;
  typingSentence: string;
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
    quizIndex: (Math.random() * QUIZ_BANK.length) | 0,
    typingSentence: TYPING_SENTENCES[(Math.random() * TYPING_SENTENCES.length) | 0],
  };
}

@WebSocketGateway({
  namespace: "/raid",
  cors: { origin: true, credentials: true },
  path: "/socket.io",
})
export class RaidGateway implements OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly rewards: RewardsService,
    private readonly prisma: PrismaService,
  ) {}

  private rooms = new Map<number, RaidRoom>();
  private cooldowns = new Map<number, number>();
  /** 현재 레이드 슬롯에서 입장 제한된 userId 목록 (레이드 타입 → 금지 userId Set) */
  private entryBans = new Map<number, Set<string>>();

  async onModuleInit() {
    try {
      const rows = await this.prisma.raidContent.findMany({ where: { active: true } });
      for (const row of rows) {
        if (row.raidType === 3 && row.answer) {
          QUIZ_BANK.push({ q: row.text, a: [row.answer] });
        } else if (row.raidType === 4) {
          TYPING_SENTENCES.push(row.text);
        }
      }
    } catch { /* ignore */ }
  }

  private getRoom(type: number): RaidRoom {
    if (!this.rooms.has(type)) this.rooms.set(type, newRoom(type));
    return this.rooms.get(type)!;
  }

  private getBans(type: number): Set<string> {
    if (!this.entryBans.has(type)) this.entryBans.set(type, new Set());
    return this.entryBans.get(type)!;
  }

  @SubscribeMessage("raid:join")
  join(
    @MessageBody() data: { raidType: number; characterId: number; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const type = RAID_TYPES.includes(data?.raidType as 1 | 3 | 4) ? data.raidType : 1;
    const userId = data?.userId ?? null;

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

    const nickname = nick();
    r.players.set(client.id, {
      socketId: client.id,
      characterId: Number(data?.characterId) || 1,
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

  @SubscribeMessage("raid:contribute")
  async contribute(@MessageBody() data: { raidType: number; text: string; answer?: string; userId?: string }) {
    const type = data?.raidType;
    const text = String(data?.text ?? "").trim().slice(0, 80);
    const createdBy = data?.userId ? String(data.userId).slice(0, 36) : null;
    if (text.length < 1) return;

    if (type === 3) {
      const a = String(data?.answer ?? "").trim().slice(0, 40);
      if (text.length >= 3 && a.length >= 1 && !QUIZ_BANK.some((q) => q.q === text)) {
        QUIZ_BANK.push({ q: text, a: [a] });
        if (QUIZ_BANK.length > 500) QUIZ_BANK.splice(0, QUIZ_BANK.length - 500);
        await this.prisma.raidContent.create({ data: { raidType: 3, text, answer: a, createdBy } }).catch(() => undefined);
      }
    } else if (type === 4) {
      if (text.length >= 4 && !TYPING_SENTENCES.includes(text)) {
        TYPING_SENTENCES.push(text);
        if (TYPING_SENTENCES.length > 500) TYPING_SENTENCES.splice(0, TYPING_SENTENCES.length - 500);
        await this.prisma.raidContent.create({ data: { raidType: 4, text, createdBy } }).catch(() => undefined);
      }
    }
  }

  @SubscribeMessage("raid:gem")
  gem(@ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player || player.raidType !== 5) return;
    const r = this.getRoom(5);
    if (r.cleared) return;
    const dmg = rarityDamage(player.characterId);
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
    const dmg = rarityDamage(player.characterId);
    r.progress += dmg;
    player.damage += dmg;
    this.applyProgress(r, 1, player.nickname, dmg);
  }

  private applyProgress(r: RaidRoom, type: number, attackerNickname: string, dmg: number) {
    const meta = RAID_META[type];

    if (!r.cleared) {
      const line = randomBossLine(attackerNickname);
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
          title: "레이드 클리어!",
          body: `${rank}위 달성! 보상: ${rewardText}`,
          link: "/raid",
        },
      });
    } catch { /* ignore */ }
  }

  @SubscribeMessage("raid:input")
  async input(@MessageBody() data: { text: string }, @ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player) return;
    const text = String(data?.text ?? "").trim().slice(0, 60);
    if (!text) return;
    const r = this.getRoom(player.raidType);

    this.server.to(room(player.raidType)).emit("raid:message", {
      id: `${client.id}-${Date.now()}`,
      socketId: client.id,
      nickname: player.nickname,
      characterId: player.characterId,
      text,
      ts: Date.now(),
    });

    if (r.cleared) return;

    let progressed = false;
    let feedback: string | null = null;
    let dmg = 0;

    if (player.raidType === 3) {
      const cur = QUIZ_BANK[r.quizIndex % QUIZ_BANK.length];
      if (cur.a.some((ans) =>
        text.replace(/\s/g, "").toLowerCase() === ans.replace(/\s/g, "").toLowerCase()
      )) {
        dmg = rarityDamage(player.characterId);
        r.progress += dmg;
        player.damage += dmg;
        progressed = true;
        r.quizIndex = (r.quizIndex + 1) % QUIZ_BANK.length;
        feedback = "정답!";
      }
    } else if (player.raidType === 4) {
      if (text === r.typingSentence) {
        dmg = rarityDamage(player.characterId);
        r.progress += dmg;
        player.damage += dmg;
        progressed = true;
        r.typingSentence = TYPING_SENTENCES[(Math.random() * TYPING_SENTENCES.length) | 0];
      }
    }

    if (feedback) {
      client.emit("raid:feedback", { text: feedback });
    }

    if (progressed) {
      this.applyProgress(r, player.raidType, player.nickname, dmg);
    }
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
    if (r.type === 3) return { label: "퀴즈를 맞혀라!", target: QUIZ_BANK[r.quizIndex % QUIZ_BANK.length].q, hint: "" };
    if (r.type === 5) return { label: "탄막을 피하며 보석을 모아라!", target: "← → ↑ ↓ / WASD", hint: "보석 1개 = 보스 HP −데미지" };
    return { label: "이 문장을 그대로 받아써라!", target: r.typingSentence, hint: "" };
  }

  private broadcastState(type: number) {
    const r = this.getRoom(type);
    const meta = RAID_META[type];
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
      participants,
      count: r.players.size,
      maxPlayers: MAX_PLAYERS,
    });
  }

  @SubscribeMessage("raid:counts")
  handleCounts(@ConnectedSocket() client: Socket) {
    client.emit("raid:lobby", this.lobby());
  }

  private lobby() {
    const info: Record<number, { count: number; cooldownUntil: number; bossCharId: number; currentHp: number; maxHp: number }> = {};
    for (const t of RAID_TYPES) {
      const r = this.rooms.get(t);
      const meta = RAID_META[t];
      info[t] = {
        count: r?.players.size ?? 0,
        cooldownUntil: this.cooldowns.get(t) ?? 0,
        bossCharId: this.getRoom(t).bossCharId,
        currentHp: r && !r.cleared ? Math.max(0, meta.goal - r.progress) : meta.goal,
        maxHp: meta.goal,
      };
    }
    return info;
  }

  private broadcastCounts() { this.broadcastLobby(); }
  private broadcastLobby() { this.server.emit("raid:lobby", this.lobby()); }
}

function socketId(client: Socket): string { return client.id; }
