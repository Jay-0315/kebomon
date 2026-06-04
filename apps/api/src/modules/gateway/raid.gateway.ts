import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { RewardsService, EggType as RewardEggType } from "../rewards/rewards.service";

export const RAID_TYPES = [1, 3, 4] as const;
export const MAX_PLAYERS = 5;
export const RAID_COOLDOWN_MS = 4 * 60 * 60 * 1000;

type EggType = "normal" | "big" | "golden";

const RAID_META: Record<number, { name: string; points: number; goal: number; cry: string }> = {
  1: { name: "점프 레이드", points: 30, goal: 40, cry: "내 장애물을 피할 수 있겠나?!" },
  3: { name: "퀴즈 레이드", points: 50, goal: 25, cry: "내 물음에 답하라!" },
  4: { name: "받아쓰기 레이드", points: 80, goal: 25, cry: "정확히 받아써라. 오차는 없다." },
};

// 도감 전체 180개 캐릭터 ID
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

type RaidReward = { kind: "points"; points: number } | { kind: "egg"; egg: RewardEggType };

function rollReward(points: number): RaidReward {
  if (Math.random() < 0.8) return { kind: "points", points };
  const r = Math.random() * 100;
  const egg: RewardEggType = r < 60 ? "normal" : r < 95 ? "big" : "golden";
  return { kind: "egg", egg };
}

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
}

interface RaidRoom {
  type: number;
  players: Map<string, Player>;
  progress: number;
  cleared: boolean;
  bossCharId: number; // 이 방의 랜덤 보스 케보몬
  // mission-specific
  quizIndex: number;
  typingSentence: string;
}

const room = (type: number) => `raid:${type}`;

function newRoom(type: number): RaidRoom {
  return {
    type,
    players: new Map(),
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
export class RaidGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly rewards: RewardsService) {}

  private rooms = new Map<number, RaidRoom>();
  private cooldowns = new Map<number, number>();

  private getRoom(type: number): RaidRoom {
    if (!this.rooms.has(type)) this.rooms.set(type, newRoom(type));
    return this.rooms.get(type)!;
  }

  @SubscribeMessage("raid:join")
  join(
    @MessageBody() data: { raidType: number; characterId: number; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const type = RAID_TYPES.includes(data?.raidType as 1 | 3 | 4) ? data.raidType : 1;

    const until = this.cooldowns.get(type) ?? 0;
    if (until > Date.now()) {
      client.emit("raid:cooldown", { raidType: type, until });
      return;
    }

    let r = this.getRoom(type);
    if (r.cleared) {
      r = newRoom(type);
      this.rooms.set(type, r);
    }

    if (r.players.size >= MAX_PLAYERS) {
      client.emit("raid:full", { raidType: type });
      return;
    }

    const nickname = nick();
    r.players.set(client.id, {
      socketId: client.id,
      characterId: Number(data?.characterId) || 1,
      nickname,
      raidType: type,
      userId: data?.userId ?? null,
    });
    client.join(room(type));
    client.emit("raid:self", { socketId: client.id, nickname, characterId: Number(data?.characterId) || 1 });
    this.broadcastState(type);
    this.broadcastCounts();
  }

  @SubscribeMessage("raid:leave")
  leave(@ConnectedSocket() client: Socket) {
    this.removePlayer(client);
  }

  @SubscribeMessage("raid:contribute")
  contribute(@MessageBody() data: { raidType: number; text: string; answer?: string }) {
    const type = data?.raidType;
    const text = String(data?.text ?? "").trim().slice(0, 80);
    if (text.length < 1) return;

    if (type === 3) {
      const a = String(data?.answer ?? "").trim().slice(0, 40);
      if (text.length >= 3 && a.length >= 1) {
        QUIZ_BANK.push({ q: text, a: [a] });
        if (QUIZ_BANK.length > 200) QUIZ_BANK.splice(0, QUIZ_BANK.length - 200);
      }
    } else if (type === 4) {
      if (text.length >= 4) {
        TYPING_SENTENCES.push(text);
        if (TYPING_SENTENCES.length > 200) TYPING_SENTENCES.splice(0, TYPING_SENTENCES.length - 200);
      }
    }
  }

  /** 점프 레이드(타입1): 장애물을 넘을 때마다 보스에게 데미지 1 */
  @SubscribeMessage("raid:jump")
  jump(@ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player || player.raidType !== 1) return;
    const r = this.getRoom(1);
    if (r.cleared) return;
    r.progress += 1;
    this.applyProgress(r, 1);
  }

  /** 진행도 증가 후 클리어 판정 + 상태 브로드캐스트 (점프/입력 공용) */
  private applyProgress(r: RaidRoom, type: number) {
    const meta = RAID_META[type];
    if (r.progress >= meta.goal) {
      r.cleared = true;
      r.progress = meta.goal;
      this.cooldowns.set(type, Date.now() + RAID_COOLDOWN_MS);
      for (const p of r.players.values()) {
        const reward = rollReward(meta.points);
        if (p.userId) {
          this.rewards.grantRaidReward(p.userId, reward).catch(() => undefined);
        }
        this.server.to(p.socketId).emit("raid:cleared", { reward });
      }
      this.broadcastLobby();
    }
    this.broadcastState(type);
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

    if (player.raidType === 1) {
      // 점프 레이드는 액션 게임(raid:jump)으로 진행 — 채팅 입력은 데미지 없음
    } else if (player.raidType === 3) {
      const cur = QUIZ_BANK[r.quizIndex % QUIZ_BANK.length];
      if (cur.a.some((ans) =>
        text.replace(/\s/g, "").toLowerCase() === ans.replace(/\s/g, "").toLowerCase()
      )) {
        r.progress += 1;
        progressed = true;
        r.quizIndex = (r.quizIndex + 1) % QUIZ_BANK.length;
        feedback = "정답!";
      }
    } else if (player.raidType === 4) {
      if (text === r.typingSentence) {
        r.progress += 1;
        progressed = true;
        r.typingSentence = TYPING_SENTENCES[(Math.random() * TYPING_SENTENCES.length) | 0];
      }
    }

    if (feedback) {
      client.emit("raid:feedback", { text: feedback });
    }

    if (progressed) {
      this.applyProgress(r, player.raidType);
    }
  }

  handleDisconnect(client: Socket) {
    this.removePlayer(client);
  }

  private findPlayer(socketId: string): Player | undefined {
    for (const r of this.rooms.values()) {
      const p = r.players.get(socketId);
      if (p) return p;
    }
    return undefined;
  }

  private removePlayer(client: Socket) {
    for (const r of this.rooms.values()) {
      if (r.players.delete(client.id)) {
        client.leave(room(r.type));
        this.broadcastState(r.type);
        this.broadcastCounts();
        return;
      }
    }
  }

  private missionView(r: RaidRoom) {
    if (r.type === 1) return { label: "장애물을 점프로 넘어라!", target: "SPACE ↑", hint: "스페이스바(또는 화면 터치)로 점프 · 넘을 때마다 데미지" };
    if (r.type === 3) return { label: "퀴즈를 맞혀라!", target: QUIZ_BANK[r.quizIndex % QUIZ_BANK.length].q, hint: "" };
    return { label: "이 문장을 그대로 받아써라!", target: r.typingSentence, hint: "" };
  }

  private broadcastState(type: number) {
    const r = this.getRoom(type);
    const meta = RAID_META[type];
    this.server.to(room(type)).emit("raid:state", {
      raidType: type,
      name: meta.name,
      boss: { characterId: r.bossCharId, name: "", cry: meta.cry },
      hp: Math.max(0, meta.goal - r.progress),
      maxHp: meta.goal,
      cleared: r.cleared,
      mission: this.missionView(r),
      participants: [...r.players.values()].map((p) => ({ socketId: p.socketId, characterId: p.characterId, nickname: p.nickname })),
      count: r.players.size,
      maxPlayers: MAX_PLAYERS,
    });
  }

  @SubscribeMessage("raid:counts")
  handleCounts(@ConnectedSocket() client: Socket) {
    client.emit("raid:lobby", this.lobby());
  }

  private lobby() {
    const info: Record<number, { count: number; cooldownUntil: number; bossCharId: number }> = {};
    for (const t of RAID_TYPES) {
      info[t] = {
        count: this.rooms.get(t)?.players.size ?? 0,
        cooldownUntil: this.cooldowns.get(t) ?? 0,
        bossCharId: this.getRoom(t).bossCharId,
      };
    }
    return info;
  }

  private broadcastCounts() { this.broadcastLobby(); }
  private broadcastLobby() { this.server.emit("raid:lobby", this.lobby()); }
}
