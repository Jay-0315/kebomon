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

export const RAID_TYPES = [1, 2, 3, 4] as const;
export const MAX_PLAYERS = 5;
export const RAID_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4시간

type EggType = "normal" | "big" | "golden";

/** 레이드 형식 메타 (1 점프 / 2 끝말잇기 / 3 퀴즈 / 4 받아쓰기)
 *  goal = 보스 HP, 미션 성공 1회 = 데미지 1 · 보스는 매 방마다 랜덤 케보몬 */
const RAID_META: Record<number, { name: string; points: number; goal: number; cry: string }> = {
  1: { name: "점프 레이드", points: 30, goal: 40, cry: "내 장애물을 피할 수 있겠나?!" },
  2: { name: "끝말잇기 레이드", points: 50, goal: 30, cry: "말의 사슬을 이어보아라." },
  3: { name: "퀴즈 레이드", points: 50, goal: 25, cry: "내 물음에 답하라!" },
  4: { name: "받아쓰기 레이드", points: 80, goal: 25, cry: "정확히 받아써라. 오차는 없다." },
};

// 보스로 등장할 케보몬 후보 (희귀도 높은 캐릭터 위주)
const BOSS_POOL = [
  70, 84, 90, 94, 96, 99, 100, 123, 150, 164, 170, 171, 172, 173, 175,
  177, 178, 180, 188, 189, 190, 192, 193, 194, 195, 197, 198, 200,
  309, 328, 331, 333, 359, 360, 385, 392, 397, 399, 400,
];
const randomBoss = () => BOSS_POOL[(Math.random() * BOSS_POOL.length) | 0];

type RaidReward = { kind: "points"; points: number } | { kind: "egg"; egg: RewardEggType };

/** 80% 포인트 / 20% 알 (알 안에서 60% 일반·35% 큰·5% 황금) */
function rollReward(points: number): RaidReward {
  if (Math.random() < 0.8) return { kind: "points", points };
  const r = Math.random() * 100;
  const egg: RewardEggType = r < 60 ? "normal" : r < 95 ? "big" : "golden";
  return { kind: "egg", egg };
}

// 점프 레이드: 장애물에 맞춰 입력할 동작
const JUMP_MOVES = ["점프", "슬라이드", "점프", "회피", "점프", "슬라이드"];

// 가변(유저 기여 문제 추가됨) · 난이도 상향
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
  { q: "1바이트는 몇 비트?", a: ["8", "8비트", "8개"] },
];
// 받아쓰기: 실제 명언 (유저 기여로 확장 가능)
const TYPING_SENTENCES = [
  "시작이 반이다",
  "아는 것이 힘이다",
  "시간은 금이다",
  "펜은 칼보다 강하다",
  "백문이 불여일견이다",
  "천 리 길도 한 걸음부터",
  "고생 끝에 낙이 온다",
  "실패는 성공의 어머니다",
  "오늘 걷지 않으면 내일은 뛰어야 한다",
  "노력은 결코 배신하지 않는다",
  "로마는 하루아침에 이루어지지 않았다",
  "지피지기면 백전백승이다",
  "구르는 돌에는 이끼가 끼지 않는다",
  "가장 큰 위험은 위험 없는 삶이다",
  "포기하지 않으면 끝난 것이 아니다",
];

// 끝말잇기 단어 사전 (실제 단어만 허용)
const WORD_DICT = new Set<string>([
  "사과", "과일", "일기", "기차", "차표", "표지", "지구", "구름", "나무", "무지개",
  "개미", "미소", "소금", "금붕어", "어부", "바다", "다리", "리본", "본부", "부산",
  "산수", "수박", "박쥐", "포도", "도시", "시계", "계란", "초밥", "밥상", "상자",
  "자전거", "거미", "하늘", "보석", "석탑", "탑승", "승리", "카메라", "라면", "면도",
  "도토리", "위장", "장미", "미역", "역사", "사자", "자석", "석류", "유리", "리듬",
  "강아지", "지팡이", "이불", "불꽃", "꽃집", "집게", "게임", "임금", "금고", "고래",
  "퍼즐", "안경", "경찰", "떡국", "국수", "수영", "영화", "화분", "분수", "수건",
  "건물", "물고기", "기린", "스키", "키위", "위성", "성당", "당근", "근육", "육지",
  "지하철", "철도", "도장", "장갑", "갑옷", "옷장", "장난감", "감자", "자두", "두부",
  "부엉이", "이마", "마차", "표범", "범선", "선물", "물병", "병아리", "리모컨", "항구",
  "구두", "두루미", "지렁이", "이슬", "드라마", "마늘", "봄비", "비누", "지우개", "개구리",
  "어른", "은행", "행복", "복숭아", "아기", "기와", "와인", "인삼", "삼각형", "형광등",
  "등대", "대나무", "무릎", "코끼리", "코코아", "아침", "침대", "대문", "문어", "어묵",
  "화살", "살구", "구슬", "선생", "생선", "선풍기", "역도", "도넛", "지도", "도서관",
  "기둥", "둥지", "우산", "산딸기", "표어", "어깨", "금메달", "달력", "토마토", "토끼",
  "은하수", "수달", "달걀", "참새", "새우", "우유", "유산균", "균형", "형제", "제비",
  "비행기", "기사", "사진", "진주", "주사위", "위인", "인형", "형사", "사슴", "베개",
  "개나리", "리어카", "더위", "구두쇠", "쇠고기", "고구마", "마차표", "장어", "어항", "별자리",
]);

// 끝말잇기 시작 단어 풀 (사전에서 추출)
const START_WORDS = ["사과", "바다", "나무", "구름", "하늘", "보석", "강아지", "토마토", "참새", "기차"];

const ADJ = ["야비한", "수상한", "느긋한", "용감한", "엉뚱한", "도도한", "발랄한", "시크한", "엉큼한", "낭만적인", "까칠한", "천진한"];
const ANI = ["바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카", "카피바라", "라쿤", "다람쥐", "판다"];
const nick = () => `${ADJ[(Math.random() * ADJ.length) | 0]} ${ANI[(Math.random() * ANI.length) | 0]}`;

const lastChar = (w: string) => w.trim().slice(-1);
const firstChar = (w: string) => w.trim().slice(0, 1);

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
  progress: number; // 0..goal
  cleared: boolean;
  bossCharId: number; // 이 방의 랜덤 보스 케보몬
  // mission-specific
  jumpMove: string; // 점프 레이드: 현재 장애물 동작
  chain: string[]; // 끝말잇기 누적
  used: Set<string>;
  quizIndex: number;
  typingSentence: string;
}

const room = (type: number) => `raid:${type}`;

function newRoom(type: number): RaidRoom {
  const start = START_WORDS[(Math.random() * START_WORDS.length) | 0];
  return {
    type,
    players: new Map(),
    progress: 0,
    cleared: false,
    bossCharId: randomBoss(),
    jumpMove: JUMP_MOVES[(Math.random() * JUMP_MOVES.length) | 0],
    chain: [start],
    used: new Set([start]),
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
  private cooldowns = new Map<number, number>(); // raidType → 재오픈 timestamp

  private getRoom(type: number): RaidRoom {
    if (!this.rooms.has(type)) this.rooms.set(type, newRoom(type));
    return this.rooms.get(type)!;
  }

  @SubscribeMessage("raid:join")
  join(
    @MessageBody() data: { raidType: number; characterId: number; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const type = RAID_TYPES.includes(data?.raidType as 1 | 2 | 3 | 4) ? data.raidType : 1;

    // 쿨타임 체크
    const until = this.cooldowns.get(type) ?? 0;
    if (until > Date.now()) {
      client.emit("raid:cooldown", { raidType: type, until });
      return;
    }

    // 클리어된 방이면 새 방으로 리셋
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
    r.players.set(client.id, { socketId: client.id, characterId: Number(data?.characterId) || 1, nickname, raidType: type, userId: data?.userId ?? null });
    client.join(room(type));
    client.emit("raid:self", { socketId: client.id, nickname, characterId: Number(data?.characterId) || 1 });
    this.broadcastState(type);
    this.broadcastCounts();
  }

  @SubscribeMessage("raid:leave")
  leave(@ConnectedSocket() client: Socket) {
    this.removePlayer(client);
  }

  /** 레이드 종료 후 유저가 해당 레이드에 쓰일 콘텐츠를 기여 */
  @SubscribeMessage("raid:contribute")
  contribute(@MessageBody() data: { raidType: number; text: string; answer?: string }) {
    const type = data?.raidType;
    const text = String(data?.text ?? "").trim().slice(0, 80);
    if (text.length < 1) return;
    const cap = (arr: unknown[], n: number) => {
      if (arr.length > n) arr.splice(0, arr.length - n);
    };

    // 점프(1)·끝말잇기(2)는 기여를 받지 않음
    if (type === 3) {
      // 퀴즈 문제 + 정답
      const a = String(data?.answer ?? "").trim().slice(0, 40);
      if (text.length >= 3 && a.length >= 1) {
        QUIZ_BANK.push({ q: text, a: [a] });
        cap(QUIZ_BANK, 200);
      }
    } else if (type === 4) {
      // 받아쓰기 문장
      if (text.length >= 4) {
        TYPING_SENTENCES.push(text);
        cap(TYPING_SENTENCES, 200);
      }
    }
  }

  @SubscribeMessage("raid:input")
  input(@MessageBody() data: { text: string }, @ConnectedSocket() client: Socket) {
    const player = this.findPlayer(client.id);
    if (!player) return;
    const text = String(data?.text ?? "").trim().slice(0, 60);
    if (!text) return;
    const r = this.getRoom(player.raidType);

    // broadcast as chat first
    this.server.to(room(player.raidType)).emit("raid:message", {
      id: `${client.id}-${Date.now()}`,
      socketId: client.id,
      nickname: player.nickname,
      characterId: player.characterId,
      text,
      ts: Date.now(),
    });

    if (r.cleared) return;

    const meta = RAID_META[player.raidType];
    let progressed = false;
    let feedback: string | null = null;

    if (player.raidType === 1) {
      // 점프: 현재 장애물 동작과 일치하면 회피 성공
      if (text.replace(/\s/g, "").replace(/!/g, "") === r.jumpMove) {
        r.progress += 1;
        progressed = true;
        r.jumpMove = JUMP_MOVES[(Math.random() * JUMP_MOVES.length) | 0];
      } else {
        feedback = "회피 실패! 장애물에 맞춰 입력하세요";
      }
    } else if (player.raidType === 2) {
      // 끝말잇기 (실제 단어만 허용)
      const prev = r.chain[r.chain.length - 1];
      const w = text.replace(/\s/g, "");
      if (w.length < 2) feedback = "두 글자 이상!";
      else if (firstChar(w) !== lastChar(prev)) feedback = `'${lastChar(prev)}'(으)로 시작!`;
      else if (r.used.has(w)) feedback = "이미 나온 단어!";
      else if (!WORD_DICT.has(w)) feedback = "사전에 없는 단어예요!";
      else {
        r.chain.push(w);
        r.used.add(w);
        r.progress += 1;
        progressed = true;
      }
    } else if (player.raidType === 3) {
      // 퀴즈
      const cur = QUIZ_BANK[r.quizIndex % QUIZ_BANK.length];
      if (cur.a.some((ans) => text.replace(/\s/g, "").toLowerCase() === ans.replace(/\s/g, "").toLowerCase())) {
        r.progress += 1;
        progressed = true;
        r.quizIndex = (r.quizIndex + 1) % QUIZ_BANK.length;
        feedback = "정답!";
      }
    } else if (player.raidType === 4) {
      // 타이핑
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
      if (r.progress >= meta.goal) {
        r.cleared = true;
        r.progress = meta.goal;
        // 4시간 쿨타임 시작
        this.cooldowns.set(player.raidType, Date.now() + RAID_COOLDOWN_MS);
        // 참가자별 개별 확률 보상 → 각자에게 결과 전송 + DB 적립
        for (const p of r.players.values()) {
          const reward = rollReward(meta.points);
          if (p.userId) {
            this.rewards.grantRaidReward(p.userId, reward).catch(() => undefined);
          }
          this.server.to(p.socketId).emit("raid:cleared", { reward });
        }
        this.broadcastLobby();
      }
      this.broadcastState(player.raidType);
    }
  }

  handleDisconnect(client: Socket) {
    this.removePlayer(client);
  }

  // ── helpers ──
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
    if (r.type === 1) return { label: "장애물을 피해라!", target: `${r.jumpMove}!`, hint: "장애물 동작을 그대로 입력" };
    if (r.type === 2) return { label: "끝말잇기를 이어라!", target: r.chain[r.chain.length - 1], hint: `'${lastChar(r.chain[r.chain.length - 1])}'(으)로 시작 · 실제 단어만` };
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

  private broadcastCounts() {
    this.broadcastLobby();
  }

  private broadcastLobby() {
    this.server.emit("raid:lobby", this.lobby());
  }
}
