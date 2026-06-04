import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as https from "https";
import { RewardsService, EggType as RewardEggType } from "../rewards/rewards.service";

export const RAID_TYPES = [1, 2, 3, 4] as const;
export const MAX_PLAYERS = 5;
export const RAID_COOLDOWN_MS = 4 * 60 * 60 * 1000;

type EggType = "normal" | "big" | "golden";

const RAID_META: Record<number, { name: string; points: number; goal: number; cry: string }> = {
  1: { name: "점프 레이드", points: 30, goal: 40, cry: "내 장애물을 피할 수 있겠나?!" },
  2: { name: "끝말잇기 레이드", points: 50, goal: 30, cry: "말의 사슬을 이어보아라." },
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

// ─── 점프 레이드 ──────────────────────────────────────────────────
const JUMP_MOVES = ["점프", "슬라이드", "회피", "구르기", "방어"];
function nextJumpMove() { return JUMP_MOVES[(Math.random() * JUMP_MOVES.length) | 0]; }

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

// ─── 끝말잇기 사전 (로컬 500+ 단어) ─────────────────────────────
const WORD_DICT = new Set<string>([
  "가구","가로수","가방","가수","가슴","가을","가족","강아지","개미","개나리",
  "거울","거미","거북이","게임","고래","고구마","고기","고양이","공원","공항",
  "과일","과자","교실","교통","구름","국수","기린","기차","기둥","기와",
  "나무","나비","나라","낙타","남자","낮잠","내일","노래","노력","눈물",
  "다리","달걀","달력","당근","대나무","대문","대학","도서관","도서","도시",
  "도마뱀","돌고래","두부","드라마","등대","등산",
  "라면","리본","리듬",
  "마늘","마차","망고","매미","머리","메뚜기","면도","모자","문어","물고기",
  "물병","미소","미역",
  "바다","바나나","바람","박쥐","반지","밥상","배추","뱀","버스","벚꽃",
  "병아리","보석","봄비","부엉이","분수","불꽃","비행기","비누","빵",
  "사과","사자","사진","산수","살구","새우","서울","선물","선생","성당",
  "소금","수건","수달","수박","수영","시계","식물",
  "아기","아침","안경","여름","역사","영화","오리","우산","우유",
  "유리","은행","이불","이슬","인삼","인형",
  "자두","자전거","자석","장갑","장미","장난감","전화","정원",
  "제비","조개","종이","주사위","지구","지도","지렁이","지하철","진주",
  "참새","청소","초밥","축구","침대",
  "카메라","카페","코끼리","코코아","코알라","키위",
  "탑승","태양","토끼","토마토","통장",
  "파도","포도","표범",
  "하늘","하루","항구","행복","형광등","형제","화분","화살",
  "가게","갈매기","갈비","감자","강물","갑옷","개구리","건물","경찰","계단",
  "계란","고드름","공룡","공부","공주","과학","교복","국화","그림","근육",
  "금메달","기억","기초","김치","꽃집","나침반","낙엽","냉면","냉장고",
  "단풍","닭갈비","대화","도토리","독수리","동굴","동물원","동화","두루미",
  "딸기","땅콩","떡국","마라톤","마음","마을","맛집","먹이","메론","명절",
  "모래","모험","목도리","목욕","무지개","미래","미술관","박물관","반딧불",
  "방울","배려","배추","백합","버섯","벌판","보름달","보물","부산","분필",
  "비둘기","빙하","사막","사슴","사탕","산딸기","상자","색연필","서점",
  "석류","선인장","소나기","소나무","소방차","소풍","속담","솜사탕","수수께끼",
  "수족관","스키","시냇물","시장","식빵","신발","아이스크림","악어","야구",
  "야채","양말","양파","어항","연꽃","연필","열쇠","영웅","옥수수","와인",
  "왕관","요리","우물","우주","운동","원숭이","유산균","은하수","음악",
  "의자","이야기","일기","일출","임금","자동차","자유","작가","장어",
  "전자레인지","점프","정글","조각","지팡이","집게","차표","창문","채소",
  "책상","천둥","체육관","추억","친구","칠판","탈춤","편지","포크","피아노",
  "하마","학교","한국","한라산","한복","항아리","해바라기","호랑이","홍차",
  "화려","환경","황새","희망","슬라이드","회피","구르기","방어","출석",
  "포인트","리워드","케보몬","도감","업적","칭호","레이드","미션","보스",
]);

// Wiktionary 검증 캐시
const wiktCache = new Map<string, boolean>();

const START_WORDS = ["사과", "바다", "나무", "구름", "하늘", "보석", "강아지", "토마토", "참새", "기차"];

const ADJ = ["야비한", "수상한", "느긋한", "용감한", "엉뚱한", "도도한", "발랄한", "시크한", "엉큼한", "낭만적인", "까칠한", "천진한"];
const ANI = ["바다코끼리", "너구리", "수달", "북극곰", "펭귄", "고슴도치", "미어캣", "알파카", "카피바라", "라쿤", "다람쥐", "판다"];
const nick = () => `${ADJ[(Math.random() * ADJ.length) | 0]} ${ANI[(Math.random() * ANI.length) | 0]}`;

const lastChar = (w: string) => w.trim().slice(-1);
const firstChar = (w: string) => w.trim().slice(0, 1);

function lookupWiktionary(word: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cached = wiktCache.get(word);
    if (cached !== undefined) { resolve(cached); return; }

    const path = `/w/api.php?action=query&titles=${encodeURIComponent(word)}&format=json&prop=info`;
    const options = { hostname: "ko.wiktionary.org", path, method: "GET", timeout: 3000 };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      res.on("end", () => {
        try {
          const data = JSON.parse(body) as { query?: { pages?: Record<string, { pageid?: number }> } };
          const pages = data.query?.pages;
          const page = pages ? Object.values(pages)[0] : undefined;
          const exists = !!(page && typeof page.pageid === "number" && page.pageid > 0);
          wiktCache.set(word, exists);
          resolve(exists);
        } catch {
          resolve(false);
        }
      });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

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
  bossCharId: number;
  jumpMove: string;
  chain: string[];
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
    jumpMove: nextJumpMove(),
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
    const type = RAID_TYPES.includes(data?.raidType as 1 | 2 | 3 | 4) ? data.raidType : 1;

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

    const meta = RAID_META[player.raidType];
    let progressed = false;
    let feedback: string | null = null;

    if (player.raidType === 1) {
      const input = text.replace(/\s/g, "").replace(/!/g, "");
      if (input === r.jumpMove) {
        r.progress += 1;
        progressed = true;
        r.jumpMove = nextJumpMove();
        feedback = "회피 성공! ✓";
      } else {
        feedback = `"${r.jumpMove}"을(를) 입력해야 합니다!`;
      }
    } else if (player.raidType === 2) {
      const prev = r.chain[r.chain.length - 1];
      const w = text.replace(/\s/g, "");

      if (w.length < 2) {
        feedback = "두 글자 이상 입력해주세요";
      } else if (firstChar(w) !== lastChar(prev)) {
        feedback = `'${lastChar(prev)}'(으)로 시작하는 단어를 입력하세요`;
      } else if (r.used.has(w)) {
        feedback = "이미 사용된 단어입니다";
      } else {
        let valid = WORD_DICT.has(w);
        if (!valid) {
          valid = await lookupWiktionary(w);
          if (valid) WORD_DICT.add(w);
        }

        if (!valid) {
          feedback = "사전에 등록되어 있지 않은 단어입니다";
        } else {
          r.chain.push(w);
          r.used.add(w);
          r.progress += 1;
          progressed = true;
        }
      }
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
      if (r.progress >= meta.goal) {
        r.cleared = true;
        r.progress = meta.goal;
        this.cooldowns.set(player.raidType, Date.now() + RAID_COOLDOWN_MS);
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
    if (r.type === 1) return { label: "장애물을 피해라!", target: `${r.jumpMove}!`, hint: "점프 / 슬라이드 / 회피 / 구르기 / 방어" };
    if (r.type === 2) {
      const last = r.chain[r.chain.length - 1];
      return { label: "끝말잇기를 이어라!", target: last, hint: `'${lastChar(last)}'(으)로 시작 · 실제 단어만` };
    }
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
