export type TitleGrade = "common" | "rare" | "epic" | "legendary" | "mythic";
export type TitleConditionType = "expense_count" | "attendance" | "streak" | "share_count" | "post_count" | "points";

export interface TitleDef {
  id: number;
  name: string;
  grade: TitleGrade;
  conditionType: TitleConditionType;
  conditionValue: number;
  description: string;
}

export const TITLE_GRADE_LABEL: Record<TitleGrade, string> = {
  common:    "일반",
  rare:      "희귀",
  epic:      "영웅",
  legendary: "전설",
  mythic:    "신화",
};

// Text color per grade
export const TITLE_GRADE_COLOR: Record<TitleGrade, string> = {
  common:    "#9CA3AF",
  rare:      "#60A5FA",
  epic:      "#C084FC",
  legendary: "#FBBF24",
  mythic:    "#f472b6",
};

// CSS text-shadow glow per grade (used as inline style)
export const TITLE_GLOW: Record<TitleGrade, string> = {
  common:    "none",
  rare:      "0 0 6px rgba(96, 165, 250, 0.8), 0 0 12px rgba(96, 165, 250, 0.4)",
  epic:      "0 0 8px rgba(192, 132, 252, 0.9), 0 0 16px rgba(192, 132, 252, 0.5)",
  legendary: "0 0 10px rgba(251, 191, 36, 1), 0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)",
  mythic:    "0 0 12px rgba(255, 128, 171, 1), 0 0 24px rgba(206, 147, 216, 0.8), 0 0 48px rgba(128, 222, 234, 0.5)",
};

// Badge background per grade (subtle)
export const TITLE_GRADE_BG: Record<TitleGrade, string> = {
  common:    "rgba(156, 163, 175, 0.12)",
  rare:      "rgba(96, 165, 250, 0.12)",
  epic:      "rgba(192, 132, 252, 0.12)",
  legendary: "rgba(251, 191, 36, 0.12)",
  mythic:    "rgba(255, 128, 171, 0.15)",
};

export const TITLES: TitleDef[] = [
  // ── Common ──
  { id: 1,  name: "첫 발걸음",       grade: "common",    conditionType: "expense_count", conditionValue: 1,    description: "첫 지출을 기록한 자" },
  { id: 2,  name: "성실한 기록가",   grade: "common",    conditionType: "attendance",    conditionValue: 3,    description: "3일 출석 달성" },
  { id: 3,  name: "절약의 싹",       grade: "common",    conditionType: "points",        conditionValue: 50,   description: "포인트 50P 돌파" },
  { id: 21, name: "공유 첫걸음",     grade: "common",    conditionType: "share_count",   conditionValue: 1,    description: "첫 지출을 공유한 자" },
  { id: 22, name: "첫 게시글",       grade: "common",    conditionType: "post_count",    conditionValue: 1,    description: "첫 커뮤니티 글 작성" },
  { id: 23, name: "3일 개근",        grade: "common",    conditionType: "streak",        conditionValue: 3,    description: "3일 연속 출석" },
  // ── Rare ──
  { id: 4,  name: "지출 사냥꾼",     grade: "rare",      conditionType: "expense_count", conditionValue: 15,   description: "지출 15회 기록" },
  { id: 5,  name: "발걸음의 탐험가", grade: "rare",      conditionType: "attendance",    conditionValue: 20,   description: "20일 출석 달성" },
  { id: 6,  name: "정보 공유자",     grade: "rare",      conditionType: "share_count",   conditionValue: 5,    description: "지출 5회 공유" },
  { id: 7,  name: "커뮤니티 멤버",   grade: "rare",      conditionType: "post_count",    conditionValue: 7,    description: "커뮤니티 글 7개 작성" },
  { id: 24, name: "포인트 입문",     grade: "rare",      conditionType: "points",        conditionValue: 300,  description: "포인트 300P 돌파" },
  { id: 25, name: "습관의 시작",     grade: "rare",      conditionType: "streak",        conditionValue: 7,    description: "7일 연속 출석" },
  // ── Epic ──
  { id: 8,  name: "베테랑 기록가",   grade: "epic",      conditionType: "expense_count", conditionValue: 50,   description: "지출 50회 기록" },
  { id: 9,  name: "강철 의지",       grade: "epic",      conditionType: "streak",        conditionValue: 20,   description: "20일 연속 출석" },
  { id: 10, name: "포인트 수집가",   grade: "epic",      conditionType: "points",        conditionValue: 1000, description: "포인트 1000P 돌파" },
  { id: 11, name: "소문난 공유러",   grade: "epic",      conditionType: "share_count",   conditionValue: 20,   description: "지출 20회 공유" },
  { id: 26, name: "필력가",          grade: "epic",      conditionType: "post_count",    conditionValue: 20,   description: "커뮤니티 글 20개 작성" },
  { id: 27, name: "꾸준한 탐험가",   grade: "epic",      conditionType: "attendance",    conditionValue: 60,   description: "60일 출석 달성" },
  // ── Legendary ──
  { id: 12, name: "전설의 기록가",   grade: "legendary", conditionType: "expense_count", conditionValue: 150,  description: "지출 150회 기록" },
  { id: 13, name: "반년의 발자국",   grade: "legendary", conditionType: "attendance",    conditionValue: 90,   description: "90일 출석 달성" },
  { id: 14, name: "포인트 영주",     grade: "legendary", conditionType: "points",        conditionValue: 5000, description: "포인트 5000P 돌파" },
  { id: 15, name: "커뮤니티 스타",   grade: "legendary", conditionType: "post_count",    conditionValue: 50,   description: "커뮤니티 글 50개 작성" },
  { id: 28, name: "연속의 달인",     grade: "legendary", conditionType: "streak",        conditionValue: 45,   description: "45일 연속 출석" },
  { id: 29, name: "공유 전도사",     grade: "legendary", conditionType: "share_count",   conditionValue: 30,   description: "지출 30회 공유" },
  // ── Mythic ──
  { id: 16, name: "신화의 여행자",   grade: "mythic",    conditionType: "expense_count", conditionValue: 400,  description: "지출 400회 기록" },
  { id: 17, name: "일년의 기억",     grade: "mythic",    conditionType: "attendance",    conditionValue: 200,  description: "200일 출석 달성" },
  { id: 18, name: "포인트의 신",     grade: "mythic",    conditionType: "points",        conditionValue: 15000,description: "포인트 15000P 돌파" },
  { id: 19, name: "불굴의 집념",     grade: "mythic",    conditionType: "streak",        conditionValue: 60,   description: "60일 연속 출석" },
  { id: 20, name: "케보의 전설",     grade: "mythic",    conditionType: "expense_count", conditionValue: 1500, description: "지출 1500회 기록" },
  { id: 30, name: "케보의 시인",     grade: "mythic",    conditionType: "post_count",    conditionValue: 150,  description: "커뮤니티 글 150개 작성" },
];

export const TITLE_BY_ID = new Map(TITLES.map((t) => [t.id, t]));
