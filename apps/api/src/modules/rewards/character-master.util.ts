import { PrismaService } from "../prisma/prisma.service";

// ═══════════════════════════════════════════════════════════════════════════════
// 캐릭터 마스터 데이터 — 원래 arena.service.ts/battle.gateway.ts/raid.gateway.ts에
// 각각 중복 하드코딩되어 있던 CHAR_TYPE/CHAR_RARITY(180개, 세 파일 완전 동일)와
// characters.ts의 ROGUE_TYPE_MAP을 여기 하나로 모았다. character_master 테이블에
// 행이 없는 캐릭터는 이 기본값으로 폴백 — 관리자 페이지에서 수정하기 전까지는
// 기존 밸런스와 100% 동일하게 동작한다.
// ═══════════════════════════════════════════════════════════════════════════════

export const CHAR_TYPES = [
  "slime", "cat", "rabbit", "ghost", "plant", "fish", "owl", "bear", "turtle", "fox",
  "wolf", "robot", "dragon", "phoenix", "unicorn", "horse", "tiger", "lion", "snake", "deer",
  "raven", "eagle", "whale", "boar", "elephant", "monkey", "beetle", "crocodile", "demon", "angel",
] as const;

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

export const ARENA_ARCHETYPES = ["warrior", "tank", "mage", "rogue", "nature", "meka", "cursed"] as const;

export const ROGUE_ARCHETYPES = ["energy", "attack", "defense"] as const;

const DEFAULT_CHAR_TYPE: Record<number, string> = {
  4:"ghost",5:"plant",6:"fish",7:"owl",8:"bear",9:"turtle",11:"wolf",12:"robot",
  13:"slime",14:"cat",16:"ghost",17:"plant",18:"fish",19:"owl",20:"bear",21:"turtle",
  22:"fox",26:"cat",28:"ghost",29:"plant",30:"fish",31:"owl",32:"bear",33:"turtle",
  34:"fox",35:"wolf",36:"robot",37:"slime",38:"cat",39:"rabbit",40:"ghost",41:"plant",
  42:"fish",43:"owl",44:"bear",51:"cat",52:"rabbit",53:"ghost",54:"plant",55:"fish",
  56:"owl",57:"bear",58:"turtle",59:"fox",60:"wolf",61:"robot",64:"rabbit",65:"ghost",
  66:"plant",67:"fish",69:"bear",71:"fox",72:"wolf",73:"robot",74:"slime",75:"cat",
  76:"rabbit",83:"turtle",84:"dragon",90:"phoenix",91:"rabbit",96:"dragon",99:"dragon",
  104:"rabbit",105:"wolf",116:"demon",117:"slime",120:"wolf",121:"fox",125:"tiger",
  127:"lion",128:"lion",129:"lion",131:"lion",132:"tiger",135:"lion",136:"phoenix",
  137:"phoenix",139:"snake",140:"horse",141:"deer",144:"horse",150:"phoenix",152:"boar",
  153:"deer",154:"dragon",155:"whale",156:"eagle",158:"lion",159:"crocodile",160:"snake",
  161:"whale",163:"snake",169:"horse",172:"dragon",173:"whale",174:"dragon",176:"phoenix",
  177:"boar",178:"boar",179:"unicorn",180:"horse",191:"whale",193:"whale",194:"phoenix",
  204:"owl",205:"fox",206:"whale",208:"cat",216:"horse",220:"boar",221:"robot",232:"boar",
  233:"slime",235:"boar",238:"turtle",239:"slime",240:"deer",241:"deer",242:"deer",
  243:"deer",252:"monkey",253:"monkey",254:"robot",255:"monkey",258:"monkey",259:"monkey",
  260:"monkey",267:"tiger",268:"tiger",271:"tiger",272:"tiger",273:"raven",274:"raven",
  275:"raven",276:"raven",277:"raven",278:"raven",287:"beetle",288:"beetle",290:"beetle",
  291:"beetle",292:"beetle",293:"snake",294:"beetle",304:"crocodile",305:"crocodile",
  306:"crocodile",307:"crocodile",308:"snake",309:"crocodile",313:"unicorn",322:"elephant",
  323:"elephant",324:"elephant",331:"elephant",332:"elephant",333:"elephant",335:"eagle",
  336:"snake",337:"eagle",338:"eagle",339:"eagle",344:"horse",349:"unicorn",350:"unicorn",
  351:"unicorn",352:"unicorn",355:"eagle",372:"demon",373:"demon",375:"demon",377:"demon",
  378:"demon",388:"angel",389:"angel",390:"angel",391:"angel",392:"angel",393:"angel",
};

const DEFAULT_CHAR_RARITY: Record<number, string> = {
  4:"common",5:"common",6:"common",7:"common",8:"common",9:"common",
  11:"common",12:"common",13:"uncommon",14:"uncommon",16:"uncommon",
  17:"uncommon",18:"uncommon",19:"uncommon",20:"uncommon",21:"uncommon",
  22:"uncommon",26:"rare",28:"rare",29:"rare",30:"rare",31:"rare",
  32:"rare",33:"rare",34:"rare",35:"rare",36:"rare",37:"epic",38:"epic",
  39:"epic",40:"epic",41:"epic",42:"epic",43:"epic",44:"epic",
  51:"legendary",52:"legendary",53:"legendary",54:"legendary",55:"legendary",
  56:"legendary",57:"legendary",58:"legendary",59:"legendary",60:"legendary",
  61:"legendary",64:"mythic",65:"mythic",66:"mythic",67:"mythic",69:"mythic",
  71:"mythic",72:"mythic",73:"mythic",74:"common",75:"common",76:"common",
  83:"mythic",84:"uncommon",90:"uncommon",91:"uncommon",96:"rare",99:"epic",
  104:"rare",105:"uncommon",116:"common",117:"rare",120:"epic",121:"epic",
  125:"common",127:"common",128:"uncommon",129:"rare",131:"epic",132:"uncommon",
  135:"legendary",136:"epic",137:"legendary",139:"common",140:"common",
  141:"common",144:"uncommon",150:"mythic",152:"common",153:"uncommon",
  154:"legendary",155:"common",156:"common",158:"mythic",159:"common",
  160:"uncommon",161:"uncommon",163:"rare",169:"rare",172:"mythic",
  173:"rare",174:"common",176:"common",177:"uncommon",178:"rare",179:"rare",
  180:"epic",191:"legendary",193:"mythic",194:"rare",204:"mythic",205:"common",
  206:"epic",208:"mythic",216:"legendary",220:"epic",221:"uncommon",
  232:"legendary",233:"legendary",235:"mythic",238:"epic",239:"mythic",
  240:"rare",241:"epic",242:"legendary",243:"mythic",252:"epic",
  253:"legendary",254:"epic",255:"mythic",258:"common",259:"uncommon",
  260:"rare",267:"legendary",268:"mythic",271:"rare",272:"epic",
  273:"legendary",274:"mythic",275:"common",276:"uncommon",277:"rare",
  278:"epic",287:"rare",288:"epic",290:"legendary",291:"mythic",292:"common",
  293:"epic",294:"uncommon",304:"uncommon",305:"rare",306:"epic",
  307:"legendary",308:"legendary",309:"mythic",313:"epic",322:"uncommon",
  323:"rare",324:"epic",331:"legendary",332:"mythic",333:"common",335:"rare",
  336:"mythic",337:"epic",338:"legendary",339:"mythic",344:"mythic",
  349:"legendary",350:"mythic",351:"common",352:"uncommon",355:"uncommon",
  372:"epic",373:"legendary",375:"mythic",377:"uncommon",378:"rare",
  388:"epic",389:"legendary",390:"mythic",391:"common",392:"uncommon",
  393:"rare",
};

/** 콜로세움/아레나 전투 역할 (type 단위 30→7) */
const TYPE_ARENA_ARCHETYPE: Record<string, string> = {
  wolf:"warrior", tiger:"warrior", lion:"warrior", bear:"warrior",
  cat:"rogue",    rabbit:"rogue",  deer:"rogue",   eagle:"rogue",
  ghost:"mage",   owl:"mage",      dragon:"mage",  angel:"mage",  phoenix:"mage",
  turtle:"tank",  elephant:"tank", whale:"tank",   crocodile:"tank", boar:"tank",
  plant:"nature", fish:"nature",   unicorn:"nature", horse:"nature",
  robot:"meka",   slime:"meka",    beetle:"meka",
  fox:"cursed",   monkey:"cursed", raven:"cursed", snake:"cursed", demon:"cursed",
};

/** 로그라이크 역할 (type 단위 30→3) — ⚠ 로그라이크는 프론트 정적 데이터를 그대로 쓰므로
 *  이 기본값/DB 값이 실제 게임에는 아직 반영되지 않는다 (admin 화면에 경고 표시) */
const TYPE_ROGUE_ARCHETYPE: Record<string, string> = {
  cat:"energy", fox:"energy", rabbit:"energy", monkey:"energy", raven:"energy",
  deer:"energy", robot:"energy", slime:"energy", fish:"energy", unicorn:"energy",
  wolf:"attack", tiger:"attack", lion:"attack", bear:"attack", eagle:"attack",
  boar:"attack", ghost:"attack", owl:"attack", dragon:"attack", demon:"attack",
  turtle:"defense", elephant:"defense", whale:"defense", beetle:"defense", crocodile:"defense",
  angel:"defense", phoenix:"defense", plant:"defense", snake:"defense", horse:"defense",
};

export interface CharacterMasterRow {
  id: number;
  type: string;
  rarity: string;
  arenaArchetype: string;
  rogueArchetype: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  spdMult: number;
}

const ALL_CHAR_IDS = Object.keys(DEFAULT_CHAR_TYPE).map(Number);

function computeDefault(id: number): CharacterMasterRow {
  const type = DEFAULT_CHAR_TYPE[id] ?? "slime";
  const rarity = DEFAULT_CHAR_RARITY[id] ?? "common";
  return {
    id,
    type,
    rarity,
    arenaArchetype: TYPE_ARENA_ARCHETYPE[type] ?? "all",
    rogueArchetype: TYPE_ROGUE_ARCHETYPE[type] ?? "energy",
    hpMult: 1,
    atkMult: 1,
    defMult: 1,
    spdMult: 1,
  };
}

/**
 * 전체 캐릭터(180종)의 마스터 데이터를 한 번에 불러와 Map으로 반환한다.
 * DB에 없는 캐릭터는 기존 하드코딩 기본값으로 자동 채워지므로, 마이그레이션
 * 직후(테이블이 비어있는 상태)에도 기존 밸런스와 동일하게 동작한다.
 * 배틀/레이드/가챠 로직에서 캐릭터마다 개별 쿼리하지 말고, 요청당 한 번만 호출할 것.
 */
export async function loadCharacterMasterMap(prisma: PrismaService): Promise<Map<number, CharacterMasterRow>> {
  const map = new Map<number, CharacterMasterRow>();
  for (const id of ALL_CHAR_IDS) map.set(id, computeDefault(id));

  const rows = await prisma.characterMaster.findMany().catch(() => []);
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      type: row.type,
      rarity: row.rarity,
      arenaArchetype: row.arenaArchetype,
      rogueArchetype: row.rogueArchetype,
      hpMult: row.hpMult,
      atkMult: row.atkMult,
      defMult: row.defMult,
      spdMult: row.spdMult,
    });
  }
  return map;
}

export function getDefaultCharacterMaster(id: number): CharacterMasterRow {
  return computeDefault(id);
}

export function allCharacterIds(): number[] {
  return ALL_CHAR_IDS;
}
