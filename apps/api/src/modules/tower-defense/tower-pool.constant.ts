import type { CharacterMasterRow } from "../rewards/character-master.util";

// 타워 풀은 180종 전체가 아니라 12종으로 추린 전용 풀을 쓴다 — 예전엔 풀이 너무 넓어서
// "같은 캐릭터"가 두 장 모이는 일이 거의 없어 합성이 사실상 죽어있었다. 등급(rarity)마다
// 정확히 2종씩(7개 아키타입에 고르게 분산)을 골라둬서, 합성이 "같은 등급 아무거나 2개"로
// 바뀐 지금도 각 등급마다 뽑힐 캐릭터가 항상 존재하도록 보장한다.
export const ARCHETYPES = ["warrior", "rogue", "mage", "tank", "nature", "meka", "cursed"] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

// id: 타입(archetype) — common: 127 사자(warrior), 75 고양이(rogue)
//     uncommon: 84 드래곤(mage), 21 거북이(tank) / rare: 179 유니콘(nature), 36 로봇(meka)
//     epic: 121 여우(cursed), 131 사자(warrior) / legendary: 52 토끼(rogue), 154 드래곤(mage)
//     mythic: 83 거북이(tank), 66 식물(nature)
export const TD_POOL_CHARACTER_IDS = [
  127, 75, 84, 21, 179, 36, 121, 131, 52, 154, 83, 66,
] as const;

export interface TowerDef {
  characterId: number;
  archetype: Archetype;
  rarity: string;
}

/** TD_POOL_CHARACTER_IDS로 추린 12종만 타워 풀로 사용 (관리자 페이지에서 등급/아키타입을 바꾸면 그대로 반영됨) */
export function buildTowerPool(masterMap: Map<number, CharacterMasterRow>): TowerDef[] {
  const pool: TowerDef[] = [];
  for (const id of TD_POOL_CHARACTER_IDS) {
    const master = masterMap.get(id);
    if (!master) continue;
    const arch = (ARCHETYPES as readonly string[]).includes(master.arenaArchetype)
      ? (master.arenaArchetype as Archetype)
      : null;
    if (!arch) continue;
    pool.push({ characterId: id, archetype: arch, rarity: master.rarity });
  }
  return pool;
}

// 타워 제안 시 등급 가중치 (합 100 기준) — 커먼 위주
export const OFFER_WEIGHTS: Record<string, number> = {
  common: 45,
  uncommon: 27,
  rare: 16,
  epic: 8,
  legendary: 3.3,
  mythic: 0.7,
};

export const WAVE_COUNT = 100;
export const BOSS_WAVE_INTERVAL = 10;

// 웨이브 도달 마일스톤 — 최초 신기록 갱신 시에만 지급. 100라운드로 늘어난 만큼
// 보스 웨이브(10단위) 위주로 넓게 분산하고, 완주(100)에 큰 보상을 몰아줬다.
export const TD_MILESTONES: { wave: number; kp: number }[] = [
  { wave: 3, kp: 30 },
  { wave: 5, kp: 60 },
  { wave: 10, kp: 150 },
  { wave: 20, kp: 300 },
  { wave: 30, kp: 500 },
  { wave: 40, kp: 750 },
  { wave: 50, kp: 1100 },
  { wave: 60, kp: 1500 },
  { wave: 70, kp: 2000 },
  { wave: 80, kp: 2600 },
  { wave: 90, kp: 3400 },
  { wave: 100, kp: 5000 },
];

export const MAX_DAILY_ATTEMPTS = 3;

// 즉시제출 부정행위 방지용 최소 플레이시간 — completeRogue의 MIN_ROGUE_RUN_MS(60s)보다
// 짧게 잡음: 초반 웨이브에서 정당하게 빨리 패배하는 것도 있을 수 있어 과도한 차단 방지
export const MIN_RUN_MS = 15_000;
