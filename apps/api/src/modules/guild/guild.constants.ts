// 길드 밸런스 상수

export interface GuildLevelInfo {
  level: number;
  /** 다음 레벨까지 필요한 누적 exp (0 = 만렙) */
  expToNext: number;
  maxMembers: number;
  bossMaxHpBase: number;
}

export const GUILD_LEVELS: GuildLevelInfo[] = [
  { level: 1, expToNext: 500, maxMembers: 10, bossMaxHpBase: 3000 },
  { level: 2, expToNext: 1200, maxMembers: 12, bossMaxHpBase: 4000 },
  { level: 3, expToNext: 2200, maxMembers: 15, bossMaxHpBase: 5500 },
  { level: 4, expToNext: 3600, maxMembers: 18, bossMaxHpBase: 7500 },
  { level: 5, expToNext: 5500, maxMembers: 20, bossMaxHpBase: 10000 },
  { level: 6, expToNext: 8000, maxMembers: 24, bossMaxHpBase: 13500 },
  { level: 7, expToNext: 11500, maxMembers: 27, bossMaxHpBase: 18000 },
  { level: 8, expToNext: 16000, maxMembers: 30, bossMaxHpBase: 24000 },
  { level: 9, expToNext: 22000, maxMembers: 30, bossMaxHpBase: 32000 },
  { level: 10, expToNext: 0, maxMembers: 30, bossMaxHpBase: 42000 },
];

export function getGuildLevelInfo(level: number): GuildLevelInfo {
  return GUILD_LEVELS.find((l) => l.level === level) ?? GUILD_LEVELS[GUILD_LEVELS.length - 1];
}

/** 레벨업에 필요한 exp를 넘겼으면 다음 레벨로 — 여러 단계 한번에 오를 수 있음 */
export function applyGuildExp(level: number, exp: number, gained: number): { level: number; exp: number } {
  let newLevel = level;
  let newExp = exp + gained;
  for (;;) {
    const info = getGuildLevelInfo(newLevel);
    if (info.expToNext <= 0 || newExp < info.expToNext) break;
    newExp -= info.expToNext;
    newLevel += 1;
  }
  return { level: newLevel, exp: newExp };
}

/** 길드원 1인당 보스 HP 풀 가산치 — 인원이 많을수록 총 HP도 늘어남 */
export const BOSS_HP_PER_MEMBER = 400;

export function calcBossMaxHp(level: number, memberCount: number): number {
  const info = getGuildLevelInfo(level);
  return info.bossMaxHpBase + memberCount * BOSS_HP_PER_MEMBER;
}

/** 하루 공격 가능 횟수 */
export const DAILY_BOSS_ATTACKS = 3;

/** 공격 1회당 기본 데미지 — 장착 캐릭터 레어리티 배율 적용 */
export const BOSS_DAMAGE_BASE = 80;
export const BOSS_DAMAGE_RARITY_MULT: Record<string, number> = {
  common: 1.0,
  uncommon: 1.15,
  rare: 1.35,
  epic: 1.6,
  legendary: 2.0,
  mythic: 2.6,
};

export function calcBossDamage(rarity: string): number {
  const mult = BOSS_DAMAGE_RARITY_MULT[rarity] ?? 1.0;
  return Math.round(BOSS_DAMAGE_BASE * mult);
}

/** 보스 처치 시 길드에 지급되는 경험치 */
export const BOSS_CLEAR_GUILD_EXP = 400;

/** 주간 기여도 랭킹 보상 (등수 구간별) */
export interface GuildBossRankReward {
  minRank: number;
  maxRank: number;
  points: number;
  stones: number;
  bigEgg?: number;
  goldEgg?: number;
}

export const GUILD_BOSS_RANK_REWARDS: GuildBossRankReward[] = [
  { minRank: 1, maxRank: 1, points: 1500, stones: 5, goldEgg: 1 },
  { minRank: 2, maxRank: 3, points: 1000, stones: 4, bigEgg: 1 },
  { minRank: 4, maxRank: 10, points: 600, stones: 2, bigEgg: 1 },
  { minRank: 11, maxRank: Infinity, points: 300, stones: 1 },
];

export function getBossRankReward(rank: number): GuildBossRankReward {
  return (
    GUILD_BOSS_RANK_REWARDS.find((r) => rank >= r.minRank && rank <= r.maxRank) ??
    GUILD_BOSS_RANK_REWARDS[GUILD_BOSS_RANK_REWARDS.length - 1]
  );
}

/** KST 기준 ISO 8601 주차 키 ("YYYY-Www") */
export function getIsoWeekKey(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 3_600_000);
  const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export const GUILD_NAME_MAX_LEN = 20;
export const GUILD_NOTICE_MAX_LEN = 200;
export const APPLICATION_MESSAGE_MAX_LEN = 100;
