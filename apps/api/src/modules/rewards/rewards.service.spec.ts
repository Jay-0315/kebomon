import {
  GACHA_POOL_IDS,
  RARITY_DUPLICATE_ESSENCE,
  RARITY_DUPLICATE_POINTS,
  pickGachaRarity,
  simulateGachaPulls,
  weightedRandom,
} from "./rewards.service";
import {
  DEFAULT_GACHA_RATES,
  DEFAULT_PITY_LEGENDARY_THRESHOLD,
  DEFAULT_PITY_RARE_THRESHOLD,
  GachaConfigValues,
} from "./gacha-config.util";
import { CharacterMasterRow } from "./character-master.util";

// GACHA_POOL_IDS는 코드 주석대로 common 20 / uncommon 23 / rare 24 / epic 26 / legendary 20 / mythic 27
// 순서로 이어붙어 있다 — 실제 상수를 그대로 잘라서 마스터맵을 재구성하면, 누가 IDs를 늘리거나
// 등급 구간을 잘못 바꿔도(합계가 140이 아니게 되면) 아래 length 단언에서 바로 드러난다.
const BAND_SIZES: [string, number][] = [
  ["common", 20],
  ["uncommon", 23],
  ["rare", 24],
  ["epic", 26],
  ["legendary", 20],
  ["mythic", 27],
];

function buildMasterMap(): Map<number, CharacterMasterRow> {
  const map = new Map<number, CharacterMasterRow>();
  let idx = 0;
  for (const [rarity, size] of BAND_SIZES) {
    for (let i = 0; i < size; i++) {
      const id = GACHA_POOL_IDS[idx++];
      map.set(id, {
        id,
        type: "warrior",
        rarity,
        arenaArchetype: "warrior",
        rogueArchetype: "attack",
        hpMult: 1,
        atkMult: 1,
        defMult: 1,
        spdMult: 1,
      });
    }
  }
  return map;
}

const CONFIG: GachaConfigValues = {
  gachaRates: DEFAULT_GACHA_RATES,
  normalEggRates: {},
  bigEggRates: {},
  goldenEggRates: {},
  pityRareThreshold: DEFAULT_PITY_RARE_THRESHOLD,
  pityLegendaryThreshold: DEFAULT_PITY_LEGENDARY_THRESHOLD,
};

const masterMap = buildMasterMap();
const firstIdOf = (rarity: string) =>
  GACHA_POOL_IDS.find((id) => masterMap.get(id)?.rarity === rarity)!;

describe("GACHA_POOL_IDS / masterMap fixture", () => {
  it("합계가 정확히 140종이어야 한다 (등급 구간 주석과 어긋나면 실패)", () => {
    expect(GACHA_POOL_IDS.length).toBe(140);
    expect(masterMap.size).toBe(140);
  });
});

describe("weightedRandom", () => {
  it("Math.random이 낮은 값이면 목록의 앞쪽 키를 뽑는다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1); // *100 = 10
    expect(weightedRandom({ a: 50, b: 50 })).toBe("a");
  });

  it("Math.random이 높은 값이면 목록의 뒤쪽 키를 뽑는다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9); // *100 = 90
    expect(weightedRandom({ a: 50, b: 50 })).toBe("b");
  });

  it("키가 하나뿐이면 항상 그 키를 반환한다", () => {
    jest.spyOn(Math, "random").mockReturnValue(Math.random());
    expect(weightedRandom({ only: 100 })).toBe("only");
  });

  afterEach(() => jest.restoreAllMocks());
});

describe("pickGachaRarity — 강제 플래그", () => {
  afterEach(() => jest.restoreAllMocks());

  it("forceLegendaryOrAbove=true면 항상 legendary 또는 mythic만 나온다", () => {
    for (let i = 0; i < 200; i++) {
      const r = pickGachaRarity(CONFIG.gachaRates, false, true);
      expect(["legendary", "mythic"]).toContain(r);
    }
  });

  it("forceRareOrAbove=true(천장 아님)면 항상 rare 또는 epic만 나온다", () => {
    for (let i = 0; i < 200; i++) {
      const r = pickGachaRarity(CONFIG.gachaRates, true, false);
      expect(["rare", "epic"]).toContain(r);
    }
  });

  it("강제 플래그가 없으면 설정된 gachaRates 비율을 대략적으로 따른다 (통계적 검증)", () => {
    const counts: Record<string, number> = {};
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const r = pickGachaRarity(CONFIG.gachaRates);
      counts[r] = (counts[r] ?? 0) + 1;
    }
    // 정확히 45.84%가 나올 순 없으니 절대오차 ±3%p 정도의 허용범위로 확인 (N=20000이면 충분히 안정적)
    expect((counts.common ?? 0) / N).toBeGreaterThan(0.4284);
    expect((counts.common ?? 0) / N).toBeLessThan(0.4884);
    expect((counts.mythic ?? 0) / N).toBeGreaterThan(0.001);
    expect((counts.mythic ?? 0) / N).toBeLessThan(0.02);
  });
});

describe("simulateGachaPulls — pity/천장 상태머신", () => {
  afterEach(() => jest.restoreAllMocks());

  it("단일 뽑기: pity가 임계값 미만이면 강제되지 않고, common을 뽑으면 pity가 1 증가한다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // weightedRandom → 항상 목록의 첫 키(common)
    const r = simulateGachaPulls(1, CONFIG, DEFAULT_PITY_RARE_THRESHOLD - 1, 0, new Set(), masterMap);
    expect(r.results[0].rarity).toBe("common");
    expect(r.pity).toBe(DEFAULT_PITY_RARE_THRESHOLD); // 8 -> 9
    expect(r.legendaryPity).toBe(1);
  });

  it("단일 뽑기: pity가 임계값 이상이면 rare/epic이 강제되고 pity가 즉시 0으로 리셋된다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // 강제풀 {rare:70,epic:30} 중 첫 키(rare)
    const r = simulateGachaPulls(1, CONFIG, DEFAULT_PITY_RARE_THRESHOLD, 0, new Set(), masterMap);
    expect(r.results[0].rarity).toBe("rare");
    expect(r.pity).toBe(0);
    expect(r.legendaryPity).toBe(1); // rare/epic은 리셋이 아니라 +1
  });

  it("legendaryPity가 천장 임계값에 도달하면 legendary/mythic이 강제되고 두 카운터 모두 리셋된다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // 강제풀 {legendary:85,mythic:15} 중 첫 키(legendary)
    const r = simulateGachaPulls(1, CONFIG, 3, DEFAULT_PITY_LEGENDARY_THRESHOLD, new Set(), masterMap);
    expect(r.results[0].rarity).toBe("legendary");
    expect(r.pity).toBe(0);
    expect(r.legendaryPity).toBe(0);
  });

  it("10연: pity가 쌓여도 마지막 자리 전엔 강제되지 않고, 9번까지 레어+가 없으면 10번째에만 강제된다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // 매번 common (강제 없는 한)
    const r = simulateGachaPulls(10, CONFIG, 0, 0, new Set(), masterMap);
    expect(r.results).toHaveLength(10);
    for (let i = 0; i < 9; i++) expect(r.results[i].rarity).toBe("common");
    expect(r.results[9].rarity).toBe("rare"); // 마지막 자리 강제 rare/epic 중 첫 키
    expect(r.pity).toBe(0); // 10번째가 rare라 리셋
    expect(r.legendaryPity).toBe(10); // common 9번 + rare 1번, 전부 +1
  });

  it("10연 중 이미 레어+가 나왔으면 마지막 자리를 강제하지 않는다", () => {
    // 1번째 뽑기만 rare가 나오도록 첫 호출에서 Math.random을 높게, 이후엔 낮게 반환
    const values = [0.9, ...Array(9).fill(0)]; // 1번째: rare/epic 중 뒤쪽(epic), 이후 9번은 common
    let i = 0;
    jest.spyOn(Math, "random").mockImplementation(() => values[i++] ?? 0);
    const r = simulateGachaPulls(10, CONFIG, 0, 0, new Set(), masterMap);
    expect(["rare", "epic", "legendary", "mythic"]).toContain(r.results[0].rarity);
    expect(r.results[9].rarity).toBe("common"); // 이미 레어+가 있었으니 강제 안 됨
  });

  it("이미 보유한 캐릭터가 나오면 중복 처리되어 등급별 보너스 포인트/정수를 지급한다", () => {
    const dupId = firstIdOf("common");
    jest.spyOn(Math, "random").mockReturnValue(0); // common 등급, pickFromPool도 풀의 첫 번째(dupId)를 선택
    const r = simulateGachaPulls(1, CONFIG, 0, 0, new Set([dupId]), masterMap);
    expect(r.results[0].characterId).toBe(dupId);
    expect(r.results[0].isDuplicate).toBe(true);
    expect(r.results[0].bonusPoints).toBe(RARITY_DUPLICATE_POINTS.common);
    expect(r.results[0].bonusEssence).toBe(RARITY_DUPLICATE_ESSENCE.common);
    expect(r.totalBonusPoints).toBe(RARITY_DUPLICATE_POINTS.common);
    expect(r.totalBonusEssence).toBe(RARITY_DUPLICATE_ESSENCE.common);
  });

  it("처음 보유하는 캐릭터는 보너스가 0이다", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const r = simulateGachaPulls(1, CONFIG, 0, 0, new Set(), masterMap);
    expect(r.results[0].isDuplicate).toBe(false);
    expect(r.results[0].bonusPoints).toBe(0);
    expect(r.results[0].bonusEssence).toBe(0);
  });

  it("호출자가 넘긴 ownedIds Set을 직접 변경하지 않는다 (순수 함수 계약)", () => {
    const owned = new Set<number>();
    jest.spyOn(Math, "random").mockReturnValue(0);
    simulateGachaPulls(1, CONFIG, 0, 0, owned, masterMap);
    expect(owned.size).toBe(0);
  });
});
