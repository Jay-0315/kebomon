// 콜로세움(아레나) 전투/시즌 밸런스 상수 — 값 변경 시 이 파일만 고치면 됨.
// 프론트 apps/user-web/src/app/components/ColosseumPage.tsx의 TIERS/SEASON_REWARDS는
// 별도 패키지라 이 파일을 import할 수 없음 — 값을 바꿀 땐 그쪽도 함께 맞춰야 함.

/** 공격/방어 승패에 따른 티어 포인트 증감량 */
export const ARENA_POINTS = {
  attackerWin: 600,
  attackerLoss: -50,
  defenderWin: 20,
  defenderLoss: -20,
  /** 공격자가 연승(2연승 이상) 중일 때 추가로 붙는 보너스 */
  streakBonus: 20,
} as const;

export interface ArenaTier {
  key: string;
  /** 이 티어로 인정되는 최소 티어 포인트 */
  min: number;
  /** 시즌 종료 시 이 티어 달성자에게 지급되는 KP 보너스 */
  kpBonus: number;
}

/** 티어 포인트 내림차순 — getArenaTierKey()가 첫 매치를 최고 티어로 취급함 */
export const ARENA_TIERS: ArenaTier[] = [
  { key: "challenger", min: 18000, kpBonus: 6000 },
  { key: "master",     min: 15000, kpBonus: 4500 },
  { key: "diamond",    min: 12000, kpBonus: 3000 },
  { key: "platinum",   min: 9000,  kpBonus: 2100 },
  { key: "gold",       min: 6000,  kpBonus: 1500 },
  { key: "silver",     min: 3000,  kpBonus: 900 },
];

export function getArenaTierKey(tierPoints: number): string | null {
  return ARENA_TIERS.find((t) => tierPoints >= t.min)?.key ?? null;
}

// ─── NPC 전투 상대 ──────────────────────────────────────────────────────────
// 프론트 ColosseumPage.tsx의 NPC_OPPONENTS와 id/slots/enhLvs/winPts/lossPts를
// 반드시 동일하게 유지할 것 — 여기 값이 실제 전투에 쓰이는 서버 검증 기준임.
export interface ArenaNpc {
  id: string;
  slots: number[];
  enhLvs: number[];
  winPts: number;
  lossPts: number;
}

export const ARENA_NPCS: ArenaNpc[] = [
  { id: "npc_1",  slots: [4, 7, 8, 9],        enhLvs: [0, 0, 0, 0], winPts: 50,  lossPts: 0 },
  { id: "npc_2",  slots: [5, 6, 11, 12],      enhLvs: [0, 0, 0, 0], winPts: 60,  lossPts: 0 },
  { id: "npc_3",  slots: [20, 14, 22, 84],    enhLvs: [0, 0, 0, 0], winPts: 90,  lossPts: 0 },
  { id: "npc_4",  slots: [16, 91, 90, 21],    enhLvs: [1, 1, 0, 0], winPts: 100, lossPts: 0 },
  { id: "npc_5",  slots: [26, 35, 33, 36],    enhLvs: [2, 2, 1, 1], winPts: 150, lossPts: 0 },
  { id: "npc_6",  slots: [40, 39, 99, 131],   enhLvs: [2, 2, 3, 2], winPts: 180, lossPts: 0 },
  { id: "npc_7",  slots: [57, 53, 52, 135],   enhLvs: [3, 3, 3, 4], winPts: 250, lossPts: 0 },
  { id: "npc_8",  slots: [137, 154, 191, 216],enhLvs: [4, 4, 3, 4], winPts: 280, lossPts: 0 },
  { id: "npc_9",  slots: [64, 72, 83, 150],   enhLvs: [5, 5, 5, 5], winPts: 350, lossPts: 0 },
  { id: "npc_10", slots: [158, 204, 208, 235],enhLvs: [6, 6, 6, 6], winPts: 500, lossPts: 0 },
];

export function getArenaNpc(id: string): ArenaNpc | undefined {
  return ARENA_NPCS.find((n) => n.id === id);
}
