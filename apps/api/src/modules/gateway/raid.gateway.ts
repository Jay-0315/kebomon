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
  1: { name: "점프 레이드",      points: 30, goal: 50, cry: "내 장애물을 피할 수 있겠나?!" },
  3: { name: "퀴즈 레이드",      points: 50, goal: 50, cry: "내 물음에 답하라!" },
  4: { name: "받아쓰기 레이드",  points: 80, goal: 50, cry: "정확히 받아써라. 오차는 없다." },
  5: { name: "탄막 레이드",      points: 60, goal: 50, cry: "내 탄막을 피할 수 있겠나?!" },
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

// ─── 퀴즈 뱅크 (DB에서 onModuleInit에 로드됨) ───────────────────
const QUIZ_BANK: { q: string; a: string[] }[] = [];

// ─── 받아쓰기 문장 (언어별) ───────────────────────────────────────
const TYPING_SENTENCES_BY_LANG: Record<string, string[]> = {
  ko: [
    "천 리 길도 한 걸음부터", "시작이 반이다", "티끌 모아 태산",
    "가랑비에 옷 젖는 줄 모른다", "돌다리도 두드려 보고 건너라",
    "노력은 절대 배신하지 않는다", "오늘 할 수 있는 일을 내일로 미루지 마라",
    "실패는 성공의 어머니다", "자신을 믿는 자만이 앞으로 나아갈 수 있다",
    "작은 일에 최선을 다하는 사람이 큰 일도 해낸다",
    "현재에 충실하면 미래는 저절로 열린다",
    "꿈을 계속 간직하면 반드시 실현할 때가 온다",
    "성공은 포기하지 않는 사람의 것이다",
    "위대한 일은 작은 습관들이 쌓여 만들어진다",
    "로마는 하루아침에 이루어지지 않았다",
    "포기하지 않으면 끝난 것이 아니다",
    "백지장도 맞들면 낫다", "공든 탑이 무너지랴",
    "세 살 버릇 여든까지 간다", "우물 안 개구리",
  ],
  ja: [
    "七転び八起き", "継続は力なり", "千里の道も一歩から",
    "塵も積もれば山となる", "急がば回れ", "猿も木から落ちる",
    "一期一会", "失敗は成功のもと", "石の上にも三年",
    "案ずるより産むが易し", "三人寄れば文殊の知恵",
    "笑う門には福来たる", "出る杭は打たれる",
    "光陰矢の如し", "一石二鳥",
    "転ばぬ先の杖", "早起きは三文の徳",
    "実るほど頭を垂れる稲穂かな", "類は友を呼ぶ",
    "井の中の蛙大海を知らず",
  ],
  en: [
    "Actions speak louder than words",
    "A penny saved is a penny earned",
    "The early bird catches the worm",
    "Rome wasn't built in a day",
    "You reap what you sow",
    "Every cloud has a silver lining",
    "Practice makes perfect",
    "Don't judge a book by its cover",
    "Better late than never",
    "The pen is mightier than the sword",
    "Fortune favors the bold",
    "All that glitters is not gold",
    "No pain no gain",
    "Where there's a will there's a way",
    "Knowledge is power",
    "Look before you leap",
    "All's well that ends well",
    "Time heals all wounds",
    "An apple a day keeps the doctor away",
    "Don't put all your eggs in one basket",
  ],
};

// DB에서 로드된 한국어 기여 문장 (active:true raidType:4)
const TYPING_SENTENCES = TYPING_SENTENCES_BY_LANG.ko;

type TypingSentences = { ko: string; ja: string; en: string };

function pickTypingSentences(): TypingSentences {
  const pick = (arr: string[]) => arr[(Math.random() * arr.length) | 0] ?? arr[0];
  return {
    ko: pick(TYPING_SENTENCES_BY_LANG.ko),
    ja: pick(TYPING_SENTENCES_BY_LANG.ja),
    en: pick(TYPING_SENTENCES_BY_LANG.en),
  };
}

function typingFeedback(ok: boolean, lang: string, lives?: number): string {
  if (ok) {
    return lang === "ja" ? "正確！" : lang === "en" ? "Correct!" : "정확!";
  }
  if (!lives || lives <= 0) {
    return lang === "ja" ? "ライフ消失！退場" : lang === "en" ? "Out of lives! Eliminated" : "라이프 소진! 퇴장";
  }
  return lang === "ja" ? `不正解！残りライフ ${lives}` : lang === "en" ? `Wrong! ${lives} lives left` : `틀렸습니다! 라이프 ${lives}개 남음`;
}

const ADJ = ["야비한", "수상한", "느긋한", "용감한", "엉뚱한", "도도한", "발랄한", "시크한", "엉큼한", "낭만적인", "까칠한", "천진한"];
const ANI = ["바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카", "카피바라", "라쿤", "다람쥐", "판다"];
const nick = () => `${ADJ[(Math.random() * ADJ.length) | 0]} ${ANI[(Math.random() * ANI.length) | 0]}`;

interface Player {
  socketId: string;
  characterId: number;
  nickname: string;
  raidType: number;
  lang: string;
  userId: string | null;
  damage: number;
  lives: number; // 퀴즈·받아쓰기 전용 (5→0 소진 시 퇴장)
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
  typingSentences: TypingSentences;
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
    typingSentences: pickTypingSentences(),
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
  private lastRankings = new Map<number, { rank: number; nickname: string; damage: number }[]>();
  /** 현재 레이드 슬롯에서 입장 제한된 userId 목록 (레이드 타입 → 금지 userId Set) */
  private entryBans = new Map<number, Set<string>>();
  /** 신고 중복 방지: socketId → 이미 신고한 문제 텍스트 Set */
  private reportedBy = new Map<string, Set<string>>();
  /** 신고 쿨다운: socketId → 마지막 신고 timestamp */
  private reportCooldown = new Map<string, number>();

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
    @MessageBody() data: { raidType: number; characterId: number; userId?: string; nickname?: string; lang?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const type = RAID_TYPES.includes(data?.raidType as 1 | 3 | 4) ? data.raidType : 1;
    const userId = data?.userId ?? null;
    const lang = ["ko", "ja", "en"].includes(data?.lang ?? "") ? (data.lang as string) : "ko";

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
    r.players.set(client.id, {
      socketId: client.id,
      characterId: Number(data?.characterId) || 1,
      nickname,
      raidType: type,
      lang,
      userId,
      damage: 0,
      lives: (type === 3 || type === 4) ? 5 : 0,
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
        try {
          await this.prisma.raidContent.create({ data: { raidType: 3, text, answer: a, createdBy } });
          QUIZ_BANK.push({ q: text, a: [a] });
          if (QUIZ_BANK.length > 500) QUIZ_BANK.splice(0, QUIZ_BANK.length - 500);
        } catch { /* DB 저장 실패 시 메모리에도 추가하지 않음 */ }
      }
    }
  }

  /** 부적절한 퀴즈·받아쓰기 문제 신고 → 다음 문제로 스킵, 10회 누적 시 삭제 */
  @SubscribeMessage("raid:report")
  async report(@ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player || (player.raidType !== 3 && player.raidType !== 4)) return;
    const type = player.raidType;
    const r = this.getRoom(type);
    if (r.cleared) return;

    // 신고 쿨다운 체크 (30초)
    const now = Date.now();
    const lastReport = this.reportCooldown.get(client.id) ?? 0;
    if (now - lastReport < 30_000) {
      client.emit("raid:feedback", { text: "신고는 30초에 한 번만 가능합니다" });
      return;
    }

    // 현재 출제 중인 문제 (type 4는 신고자 언어의 문장 기준)
    const text = type === 3
      ? (QUIZ_BANK.length > 0 ? QUIZ_BANK[r.quizIndex % QUIZ_BANK.length]?.q : undefined)
      : r.typingSentences[player.lang as keyof TypingSentences] ?? r.typingSentences.ko;

    if (!text) return;

    // 같은 유저가 같은 문제를 중복 신고하는 것 방지
    const alreadyReported = this.reportedBy.get(client.id) ?? new Set<string>();
    if (alreadyReported.has(text)) {
      client.emit("raid:feedback", { text: "이미 신고한 문제입니다" });
      return;
    }
    alreadyReported.add(text);
    this.reportedBy.set(client.id, alreadyReported);
    this.reportCooldown.set(client.id, now);

    // 신고 누적 → 10회 이상 시 출제 풀에서 제거
    // active:true = 기여 문제, active:false = 하드코딩 문제 신고 기록용
    try {
      const row = await this.prisma.raidContent.findFirst({ where: { raidType: type, text } });
      if (row) {
        // 기존 행 있으면 신고 수 증가
        const updated = await this.prisma.raidContent.update({
          where: { id: row.id },
          data: { reportCount: { increment: 1 } },
        });
        if (updated.reportCount >= 10 && row.active) {
          // 기여 문제만 삭제 (active:true인 행만 제거)
          await this.prisma.raidContent.delete({ where: { id: row.id } }).catch(() => undefined);
          if (type === 3) {
            const idx = QUIZ_BANK.findIndex((q) => q.q === text);
            if (idx >= 0) QUIZ_BANK.splice(idx, 1);
          } else {
            const idx = TYPING_SENTENCES.indexOf(text);
            if (idx >= 0) TYPING_SENTENCES.splice(idx, 1);
          }
        }
      } else {
        // DB에 없는 문제(하드코딩) → 신고 기록 생성 (active:false = 출제 풀에 추가 안 됨)
        const quizAnswer = type === 3 ? (QUIZ_BANK.find((q) => q.q === text)?.a[0] ?? null) : null;
        await this.prisma.raidContent.create({
          data: { raidType: type, text, answer: quizAnswer, reportCount: 1, active: false },
        });
      }
    } catch {
      // DB 오류는 무시 (스킵은 그대로 동작)
    }

    // 다음 문제로 스킵 (뱅크가 비어있으면 스킵 생략)
    if (type === 3) {
      if (QUIZ_BANK.length > 0) {
        r.quizIndex = (r.quizIndex + 1) % QUIZ_BANK.length;
      }
    } else {
      r.typingSentences = pickTypingSentences();
    }

    // 신고한 본인에게만 피드백, 방 전체엔 상태 갱신
    client.emit("raid:feedback", { text: "🚩 신고 접수 · 다음 문제로 넘어갑니다" });
    this.broadcastState(type);
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
          title: "레이드 클리어!",
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
      const cur = QUIZ_BANK.length > 0 ? QUIZ_BANK[r.quizIndex % QUIZ_BANK.length] : undefined;
      if (!cur) return;
      if (cur.a.some((ans) =>
        text.replace(/\s/g, "").toLowerCase() === ans.replace(/\s/g, "").toLowerCase()
      )) {
        dmg = rarityDamage(player.characterId);
        r.progress += dmg;
        player.damage += dmg;
        progressed = true;
        r.quizIndex = (r.quizIndex + 1) % QUIZ_BANK.length;
        feedback = "정답!";
      } else {
        player.lives = Math.max(0, player.lives - 1);
        client.emit("raid:lives", { lives: player.lives });
        client.emit("raid:feedback", { text: player.lives > 0 ? `오답! 라이프 ${player.lives}개 남음` : "라이프 소진! 퇴장" });
        if (player.lives <= 0) {
          client.emit("raid:eliminated", {});
          this.removePlayer(client, true);
          return;
        }
      }
    } else if (player.raidType === 4) {
      const target = r.typingSentences[player.lang as keyof TypingSentences] ?? r.typingSentences.ko;
      if (text === target) {
        dmg = rarityDamage(player.characterId);
        r.progress += dmg;
        player.damage += dmg;
        progressed = true;
        r.typingSentences = pickTypingSentences();
        feedback = typingFeedback(true, player.lang);
      } else {
        player.lives = Math.max(0, player.lives - 1);
        client.emit("raid:lives", { lives: player.lives });
        client.emit("raid:feedback", { text: typingFeedback(false, player.lang, player.lives) });
        if (player.lives <= 0) {
          client.emit("raid:eliminated", {});
          this.removePlayer(client, true);
          return;
        }
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
    this.reportedBy.delete(client.id);
    this.reportCooldown.delete(client.id);
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
    if (r.type === 3) {
      const q = QUIZ_BANK.length > 0 ? (QUIZ_BANK[r.quizIndex % QUIZ_BANK.length]?.q ?? "문제를 불러오는 중...") : "문제를 불러오는 중...";
      return { label: "퀴즈를 맞혀라!", target: q, hint: "" };
    }
    if (r.type === 5) return { label: "탄막을 피하며 보석을 모아라!", target: "← → ↑ ↓ / WASD", hint: "보석 1개 = 보스 HP −데미지" };
    return { label: "이 문장을 그대로 받아써라!", target: r.typingSentences.ko, targets: r.typingSentences, hint: "" };
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
    client.emit("raid:lobby", this.getLobbyStatus());
  }

  getLobbyStatus() {
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
  private broadcastLobby() { this.server.emit("raid:lobby", this.getLobbyStatus()); }
}

function socketId(client: Socket): string { return client.id; }
