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
