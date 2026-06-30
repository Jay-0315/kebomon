export type TitleGrade = "common" | "rare" | "epic" | "legendary" | "mythic" | "limited";
export type TitleConditionType = "raid_count" | "attendance" | "streak" | "post_count" | "points" | "col_wins" | "col_streak" | "col_points" | "season_rank" | "rogue_clears" | "expedition_count";

export interface TitleDef {
  id: number;
  name: string;
  grade: TitleGrade;
  conditionType: TitleConditionType;
  conditionValue: number;
  description: string;
  hidden?: boolean;
  variant?: "season_neon" | "season_fire"; // 시즌 한정 스타일
}


export const TITLE_GRADE_COLOR: Record<TitleGrade, string> = {
  common:    "#9CA3AF",
  rare:      "#60A5FA",
  epic:      "#C084FC",
  legendary: "#FBBF24",
  mythic:    "#f472b6",
  limited:   "#FFD700",
};

export const TITLE_GLOW: Record<TitleGrade, string> = {
  common:    "none",
  rare:      "0 0 6px rgba(96, 165, 250, 0.8), 0 0 12px rgba(96, 165, 250, 0.4)",
  epic:      "0 0 8px rgba(192, 132, 252, 0.9), 0 0 16px rgba(192, 132, 252, 0.5)",
  legendary: "0 0 10px rgba(251, 191, 36, 1), 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)",
  mythic:    "0 0 12px rgba(255, 128, 171, 1), 0 0 24px rgba(206, 147, 216, 0.8), 0 0 48px rgba(128, 222, 234, 0.5)",
  limited:   "0 0 8px rgba(255,215,0,1), 0 0 18px rgba(180,0,0,0.8), 0 0 36px rgba(90,0,150,0.55)",
};

export const TITLE_GRADE_BG: Record<TitleGrade, string> = {
  common:    "rgba(156, 163, 175, 0.12)",
  rare:      "rgba(96, 165, 250, 0.12)",
  epic:      "rgba(192, 132, 252, 0.12)",
  legendary: "rgba(251, 191, 36, 0.12)",
  mythic:    "rgba(255, 128, 171, 0.15)",
  limited:   "rgba(12, 2, 22, 0.88)",
};

export const TITLES: TitleDef[] = [
  // ── Common ──
  { id: 1,  name: "첫 도전자",       grade: "common",    conditionType: "raid_count",  conditionValue: 1,     description: "첫 레이드를 클리어한 자" },
  { id: 2,  name: "성실한 기록가",   grade: "common",    conditionType: "attendance",  conditionValue: 3,     description: "3일 출석 달성" },
  { id: 3,  name: "절약의 싹",       grade: "common",    conditionType: "points",      conditionValue: 50,    description: "포인트 50P 돌파" },
  { id: 22, name: "첫 게시글",       grade: "common",    conditionType: "post_count",  conditionValue: 1,     description: "첫 커뮤니티 글 작성" },
  { id: 23, name: "3일 개근",        grade: "common",    conditionType: "streak",      conditionValue: 3,     description: "3일 연속 출석" },
  { id: 31, name: "첫 승리",         grade: "common",    conditionType: "col_wins",    conditionValue: 1,     description: "콜로세움 첫 승리" },
  // ── Rare ──
  { id: 4,  name: "레이드 헌터",     grade: "rare",      conditionType: "raid_count",  conditionValue: 5,     description: "레이드 5회 클리어" },
  { id: 5,  name: "발걸음의 탐험가", grade: "rare",      conditionType: "attendance",  conditionValue: 20,    description: "20일 출석 달성" },
  { id: 7,  name: "커뮤니티 멤버",   grade: "rare",      conditionType: "post_count",  conditionValue: 7,     description: "커뮤니티 글 7개 작성" },
  { id: 24, name: "포인트 입문",     grade: "rare",      conditionType: "points",      conditionValue: 300,   description: "포인트 300P 돌파" },
  { id: 25, name: "습관의 시작",     grade: "rare",      conditionType: "streak",      conditionValue: 7,     description: "7일 연속 출석" },
  { id: 32, name: "전장의 신인",     grade: "rare",      conditionType: "col_wins",    conditionValue: 10,    description: "콜로세움 10승 달성" },
  { id: 33, name: "연승의 시작",     grade: "rare",      conditionType: "col_streak",  conditionValue: 3,     description: "3연승 달성" },
  // ── Epic ──
  { id: 8,  name: "레이드 베테랑",   grade: "epic",      conditionType: "raid_count",  conditionValue: 20,    description: "레이드 20회 클리어" },
  { id: 9,  name: "강철 의지",       grade: "epic",      conditionType: "streak",      conditionValue: 20,    description: "20일 연속 출석" },
  { id: 10, name: "포인트 수집가",   grade: "epic",      conditionType: "points",      conditionValue: 1000,  description: "포인트 1000P 돌파" },
  { id: 26, name: "필력가",          grade: "epic",      conditionType: "post_count",  conditionValue: 20,    description: "커뮤니티 글 20개 작성" },
  { id: 27, name: "꾸준한 탐험가",   grade: "epic",      conditionType: "attendance",  conditionValue: 60,    description: "60일 출석 달성" },
  { id: 34, name: "전장의 용사",     grade: "epic",      conditionType: "col_wins",    conditionValue: 30,    description: "콜로세움 30승 달성" },
  { id: 35, name: "철의 기세",       grade: "epic",      conditionType: "col_streak",  conditionValue: 5,     description: "5연승 달성" },
  { id: 36, name: "실버 클래스",     grade: "epic",      conditionType: "col_points",  conditionValue: 1000,  description: "콜로세움 1000pts 달성" },
  // ── Legendary ──
  { id: 12, name: "레이드 마스터",   grade: "legendary", conditionType: "raid_count",  conditionValue: 50,    description: "레이드 50회 클리어" },
  { id: 13, name: "반년의 발자국",   grade: "legendary", conditionType: "attendance",  conditionValue: 90,    description: "90일 출석 달성" },
  { id: 14, name: "포인트 영주",     grade: "legendary", conditionType: "points",      conditionValue: 5000,  description: "포인트 5000P 돌파" },
  { id: 15, name: "커뮤니티 스타",   grade: "legendary", conditionType: "post_count",  conditionValue: 50,    description: "커뮤니티 글 50개 작성" },
  { id: 28, name: "연속의 달인",     grade: "legendary", conditionType: "streak",      conditionValue: 45,    description: "45일 연속 출석" },
  { id: 37, name: "전장의 영웅",     grade: "legendary", conditionType: "col_wins",    conditionValue: 75,    description: "콜로세움 75승 달성" },
  { id: 38, name: "폭풍 연승",       grade: "legendary", conditionType: "col_streak",  conditionValue: 10,    description: "10연승 달성" },
  { id: 39, name: "다이아 클래스",   grade: "legendary", conditionType: "col_points",  conditionValue: 4000,  description: "콜로세움 4000pts 달성" },
  // ── Mythic ──
  { id: 16, name: "레이드의 신",     grade: "mythic",    conditionType: "raid_count",  conditionValue: 100,   description: "레이드 100회 클리어" },
  { id: 17, name: "일년의 기억",     grade: "mythic",    conditionType: "attendance",  conditionValue: 200,   description: "200일 출석 달성" },
  { id: 18, name: "포인트의 신",     grade: "mythic",    conditionType: "points",      conditionValue: 15000, description: "포인트 15000P 돌파" },
  { id: 19, name: "불굴의 집념",     grade: "mythic",    conditionType: "streak",      conditionValue: 60,    description: "60일 연속 출석" },
  { id: 20, name: "케보의 전설",     grade: "mythic",    conditionType: "raid_count",  conditionValue: 200,   description: "레이드 200회 클리어" },
  { id: 30, name: "케보의 시인",     grade: "mythic",    conditionType: "post_count",  conditionValue: 150,   description: "커뮤니티 글 150개 작성" },
  { id: 40, name: "콜로세움의 왕",   grade: "mythic",    conditionType: "col_wins",    conditionValue: 150,   description: "콜로세움 150승 달성" },
  { id: 41, name: "불멸의 연승",     grade: "mythic",    conditionType: "col_streak",  conditionValue: 15,    description: "15연승 달성" },
  { id: 42, name: "챌린저",          grade: "mythic",    conditionType: "col_points",  conditionValue: 8000,  description: "콜로세움 8000pts 달성" },
  // ── 시즌 랭킹 칭호 (한정) ──
  { id: 43, name: "시즌1 황제",       grade: "limited",   conditionType: "season_rank", conditionValue: 1,     description: "시즌 1 최종 1위 달성",    hidden: true, variant: "season_neon" },
  { id: 44, name: "시즌1 기사장",     grade: "limited",   conditionType: "season_rank", conditionValue: 2,     description: "시즌 1 최종 2위 달성",    hidden: true, variant: "season_neon" },
  { id: 45, name: "시즌1 용사",       grade: "limited",   conditionType: "season_rank", conditionValue: 3,     description: "시즌 1 최종 3위 달성",    hidden: true, variant: "season_neon" },
  { id: 46, name: "시즌1 투사",       grade: "limited",   conditionType: "season_rank", conditionValue: 10,    description: "시즌 1 최종 TOP 10 달성", hidden: true, variant: "season_neon" },
  { id: 58, name: "시즌2 황제",       grade: "limited",   conditionType: "season_rank", conditionValue: 1,     description: "시즌 2 최종 1위 달성",    hidden: true, variant: "season_fire" },
  { id: 59, name: "시즌2 기사장",     grade: "limited",   conditionType: "season_rank", conditionValue: 2,     description: "시즌 2 최종 2위 달성",    hidden: true, variant: "season_fire" },
  { id: 60, name: "시즌2 용사",       grade: "limited",   conditionType: "season_rank", conditionValue: 3,     description: "시즌 2 최종 3위 달성",    hidden: true, variant: "season_fire" },
  { id: 61, name: "시즌2 투사",       grade: "limited",   conditionType: "season_rank", conditionValue: 10,    description: "시즌 2 최종 TOP 10 달성", hidden: true, variant: "season_fire" },
  // ── 로그라이크 ──
  { id: 48, name: "덱의 입문자",     grade: "common",    conditionType: "rogue_clears",    conditionValue: 1,   description: "로그라이크 첫 클리어" },
  { id: 49, name: "탐험의 첫걸음",   grade: "common",    conditionType: "expedition_count",conditionValue: 1,   description: "원정 첫 완료" },
  { id: 50, name: "카드의 탐험가",   grade: "rare",      conditionType: "rogue_clears",    conditionValue: 3,   description: "로그라이크 3회 클리어" },
  { id: 51, name: "원정 전문가",     grade: "rare",      conditionType: "expedition_count",conditionValue: 5,   description: "원정 5회 완료" },
  { id: 52, name: "덱 마스터",       grade: "epic",      conditionType: "rogue_clears",    conditionValue: 10,  description: "로그라이크 10회 클리어" },
  { id: 53, name: "숙련된 원정대장", grade: "epic",      conditionType: "expedition_count",conditionValue: 20,  description: "원정 20회 완료" },
  { id: 54, name: "카드의 영웅",     grade: "legendary", conditionType: "rogue_clears",    conditionValue: 25,  description: "로그라이크 25회 클리어" },
  { id: 55, name: "전설의 원정대",   grade: "legendary", conditionType: "expedition_count",conditionValue: 50,  description: "원정 50회 완료" },
  { id: 56, name: "전설의 카드마스터",grade: "mythic",   conditionType: "rogue_clears",    conditionValue: 50,  description: "로그라이크 50회 클리어" },
  { id: 57, name: "불굴의 탐험가",   grade: "mythic",    conditionType: "expedition_count",conditionValue: 100, description: "원정 100회 완료" },
  // ── GM 전용 ──
  { id: 47, name: "GM",              grade: "limited",   conditionType: "raid_count",  conditionValue: 0,     description: "케보 운영진", hidden: true },
];

export const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));
