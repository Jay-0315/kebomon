import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  Layers,
  Swords,
  Shield,
  Heart,
  RefreshCw,
  ShoppingCart,
  Skull,
  Trophy,
  Star,
  X,
  Flame,
  ChevronRight,
  Crown,
  Sparkles,
  Award,
  AlertCircle,
  BookOpen,
  Info,
  FlaskConical,
  Check,
  Circle,
} from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS,
  ROGUE_TYPE_MAP,
  type CharacterRarity,
  getCharName,
} from "../data/characters";
import { useLang } from "../context/LangContext";
import type {
  RogueMilestone,
  ChallengeResult,
  ChallengeRankRow,
} from "../types/domain";
import {
  CardSwapModal,
  DeckModal,
  GlobalModals,
  MilestoneList,
  RelicCard,
} from "./RogueModals";

import {
  FONT,
  C_DARK,
  C_LIGHT,
  useIsDark,
  MagicOrb,
  DungeonGate,
  CardRarity,
  NodeType,
  Phase,
  RelicGrade,
  RelicDef,
  CardDef,
  CardInstance,
  ShopConsumableId,
  GameState,
  CARDS,
  RELICS,
  Difficulty,
  RunMode,
  DIFF_GOLD_FIGHT,
  DIFF_GOLD_ELITE,
  CHALLENGE_FLOORS,
  generateChallengeMap,
  infiniteFloorOptions,
  generateMap,
  ARCHETYPE_MAP,
  RARITY_HP,
  shuffle,
  toInst,
  hasRelic,
  getEffectiveRelics,
  pickRelicOffer,
  pickBossRelicOffer,
  drawN,
  makeStarterDeck,
  pickRewards,
  CONSUMABLE_DEFS,
  makeShopItems,
  spawnEnemyForFloor,
  PixelPotionIcon,
  PixelCrystalIcon,
  PixelRelicShopIcon,
  CardView,
  HpBar,
  IntentBadge,
  NodeIcon,
} from "./RogueGameData";
// ── Main ───────────────────────────────────────────────────────────────────
export default function RoguePage() {
  const {
    rewardSummary,
    characterMasterMap,
    startGameRun,
    completeRogue,
    submitChallenge,
    fetchChallengeRankings,
  } = useAppData();
  const navigate = useNavigate();
  const { lang } = useLang();
  const ko = lang === "ko";
  const ja = lang === "ja";
  const isDark = useIsDark();
  const C = isDark ? C_DARK : C_LIGHT;

  const equippedId = rewardSummary.equippedCharacterId ?? CHARACTERS[0].id;
  const myChar = CHARACTERS.find((c) => c.id === equippedId) ?? CHARACTERS[0];
  const arch = ARCHETYPE_MAP[myChar.type] ?? "all";
  // 관리자 페이지에서 조정 가능한 값 — 로드 전이거나 값이 없으면 프론트 정적 데이터로 폴백
  const myCharRarity: CharacterRarity =
    (characterMasterMap[myChar.id]?.rarity as CharacterRarity | undefined) ?? myChar.rarity;
  const myRogueArchetype =
    characterMasterMap[myChar.id]?.rogueArchetype ?? ROGUE_TYPE_MAP[myChar.type] ?? "energy";

  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [gs, setGs] = useState<GameState | null>(null);
  const [selIdx, setSelIdx] = useState<number | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [rogueMilestones, setRogueMilestones] = useState<RogueMilestone[]>([]);
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [rogueDmgNums, setRogueDmgNums] = useState<
    { id: number; dmg: number; side: "enemy" | "player" }[]
  >([]);
  const [cardEffect, setCardEffect] = useState<{
    effectType: "attack" | "shield" | "heal" | "power";
    multiHit?: number;
    id: number;
  } | null>(null);
  const prevEnemyHpRef = useRef<number | null>(null);
  const prevPlayerHpRef = useRef<number | null>(null);
  const victoryCountedRef = useRef(false);
  const completeRogueRef = useRef(completeRogue);
  completeRogueRef.current = completeRogue;
  const [challengeResult, setChallengeResult] =
    useState<ChallengeResult | null>(null);
  const [challengeRanks, setChallengeRanks] = useState<ChallengeRankRow[]>([]);
  const challengeSubmittedRef = useRef(false);
  const submitChallengeRef = useRef(submitChallenge);
  submitChallengeRef.current = submitChallenge;

  const [sessionChallengeBest, setSessionChallengeBest] = useState(
    rewardSummary.challengeBest ?? 0,
  );
  const [relicOpen, setRelicOpen] = useState(false);
  const [pendingRelicOffer, setPendingRelicOffer] = useState<RelicDef[] | null>(
    null,
  );
  const [pendingRelicSwap, setPendingRelicSwap] = useState<RelicDef | null>(
    null,
  );
  const [pendingCardSwap, setPendingCardSwap] = useState<CardInstance | null>(
    null,
  );
  const [showRewardGuide, setShowRewardGuide] = useState(false);
  const [guideDiff, setGuideDiff] = useState<"normal" | "hard" | "hell">(
    "normal",
  );
  const [showRelicGuide, setShowRelicGuide] = useState(false);
  const [showCardGuide, setShowCardGuide] = useState(false);
  const [cardGuideArch, setCardGuideArch] = useState<string>("all");
  const [relicGuideGrade, setRelicGuideGrade] = useState<RelicGrade | "all">("all");
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showStarterCards, setShowStarterCards] = useState(false);
  const [hoveredPotionIdx, setHoveredPotionIdx] = useState<number | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const immortalHeartUsedRef = useRef(false);
  const gsRef = useRef(gs);
  gsRef.current = gs;
  const handScrollRef = useRef<HTMLDivElement>(null);
  const handDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false, justDragged: false });

  // 전투/보상 phase 중 페이지 스크롤 방지
  useEffect(() => {
    const inGame = gs != null;
    if (inGame) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [gs?.phase]);

  // 피격 이펙트 — gs 변경 시 HP 델타 감지
  useEffect(() => {
    if (!gs || gs.phase !== "battle") {
      prevEnemyHpRef.current = null;
      prevPlayerHpRef.current = null;
      return;
    }
    const cleanups: Array<() => void> = [];

    const enemyHp = gs.enemy?.currentHp ?? null;
    if (
      enemyHp !== null &&
      prevEnemyHpRef.current !== null &&
      enemyHp < prevEnemyHpRef.current
    ) {
      const dmg = prevEnemyHpRef.current - enemyHp;
      setEnemyHit(true);
      const id = Date.now() + Math.random();
      setRogueDmgNums((p) => [
        ...p.slice(-4),
        { id, dmg, side: "enemy" as const },
      ]);
      const t1 = setTimeout(() => setEnemyHit(false), 380);
      const t2 = setTimeout(
        () => setRogueDmgNums((p) => p.filter((n) => n.id !== id)),
        900,
      );
      cleanups.push(() => {
        clearTimeout(t1);
        clearTimeout(t2);
      });
    }
    prevEnemyHpRef.current = enemyHp;

    const playerHp = gs.playerHp;
    if (
      prevPlayerHpRef.current !== null &&
      playerHp < prevPlayerHpRef.current
    ) {
      const dmg = prevPlayerHpRef.current - playerHp;
      setPlayerHit(true);
      const id = Date.now() + Math.random();
      setRogueDmgNums((p) => [
        ...p.slice(-4),
        { id, dmg, side: "player" as const },
      ]);
      const t1 = setTimeout(() => setPlayerHit(false), 380);
      const t2 = setTimeout(
        () => setRogueDmgNums((p) => p.filter((n) => n.id !== id)),
        900,
      );
      cleanups.push(() => {
        clearTimeout(t1);
        clearTimeout(t2);
      });
    }
    prevPlayerHpRef.current = playerHp;

    if (cleanups.length) return () => cleanups.forEach((fn) => fn());
  }, [gs]);

  useEffect(() => {
    // 스토리 모드 클리어 → 로그라이크 클리어 카운트
    if (
      gs?.phase === "victory" &&
      gs.mode === "story" &&
      !victoryCountedRef.current
    ) {
      victoryCountedRef.current = true;
      const prev = parseInt(
        localStorage.getItem("kebo_rogue_clears") ?? "0",
        10,
      );
      localStorage.setItem("kebo_rogue_clears", String(prev + 1));
      completeRogueRef
        .current(gs.difficulty ?? "normal")
        .then((result) => {
          if (result?.milestones.length) setRogueMilestones(result.milestones);
        })
        .catch(() => undefined);
    }
    // 도전 모드 종료(사망/완주) → 도달 스테이지 제출
    if (
      gs &&
      gs.mode === "challenge" &&
      (gs.phase === "gameover" || gs.phase === "victory") &&
      !challengeSubmittedRef.current
    ) {
      challengeSubmittedRef.current = true;
      const cleared = Math.max(
        0,
        gs.phase === "victory" ? gs.floor + 1 : gs.floor,
      );
      submitChallengeRef
        .current(cleared)
        .then((res) => {
          if (res) setChallengeResult(res);
        })
        .catch(() => undefined);
    }
    if (gs === null) {
      victoryCountedRef.current = false;
      challengeSubmittedRef.current = false;
      setRogueMilestones([]);
      setChallengeResult(null);
    }
  }, [gs?.phase]);

  // Track session best for challenge mode (rewardSummary may not refresh)
  useEffect(() => {
    if (challengeResult?.challengeBest != null) {
      setSessionChallengeBest((prev) =>
        Math.max(prev, challengeResult.challengeBest),
      );
    }
  }, [challengeResult?.challengeBest]);

  useEffect(() => {
    setSessionChallengeBest((prev) =>
      Math.max(prev, rewardSummary.challengeBest ?? 0),
    );
  }, [rewardSummary.challengeBest]);

  // Relic offer after elite/boss/treasure reward
  useEffect(() => {
    if (
      gs?.phase === "map" &&
      gs.relicPending &&
      !pendingRelicOffer &&
      !pendingRelicSwap
    ) {
      const nodeType = gs.chosenPath[gs.floor];
      if (nodeType === "boss") {
        const excludeForCurse = gs.cursedRelic ? [gs.cursedRelic] : [];
        setPendingRelicOffer(pickBossRelicOffer([...excludeForCurse]));
      } else {
        setPendingRelicOffer(pickRelicOffer(gs.relics, 2));
      }
      setGs((prev) => (prev ? { ...prev, relicPending: false } : prev));
    }
  }, [gs?.phase, gs?.relicPending]);

  // 도전 모드 랭킹 로드 (마운트 시 + 런 종료 후 갱신)
  const fetchRanksRef = useRef(fetchChallengeRankings);
  fetchRanksRef.current = fetchChallengeRankings;
  useEffect(() => {
    fetchRanksRef
      .current()
      .then(setChallengeRanks)
      .catch(() => undefined);
  }, [challengeResult]);

  // ── Start run ────────────────────────────────────────────────────────────
  const startRun = useCallback(
    (mode: RunMode = "story") => {
      void startGameRun(); // 서버에 런 시작 시각 기록 — complete/submit 시 실제 플레이 시간 검증용
      const maxHp = RARITY_HP[myCharRarity] ?? 75;
      const deck = makeStarterDeck(myChar.type);
      const startEnergy = myRogueArchetype === "energy" ? 4 : 3;
      const startStrength = 0; // attack type: +1 per battle (applied at each battle start)
      const startShield = 0; // defense type: +5 shield applied at each battle start
      const diff: Difficulty = mode === "challenge" ? "challenge" : difficulty;
      setGs({
        phase: "map",
        floor: -1,
        mode,
        difficulty: diff,
        mapLayout:
          mode === "challenge" ? generateChallengeMap() : generateMap(diff),
        chosenPath: [],
        playerHp: maxHp,
        playerMaxHp: maxHp,
        shield: startShield,
        strength: startStrength,
        poison: 0,
        energy: startEnergy,
        maxEnergy: startEnergy,
        deck,
        hand: [],
        drawPile: shuffle(deck),
        discardPile: [],
        gold: 0,
        enemy: null,
        log: [],
        rewardCards: [],
        shopItems: [],
        turnCount: 0,
        cardsPlayedCosts: [],
        comboCountMult: 1,
        chainPending: null,
        cursedRest: false,
        shopInflated: false,
        relics: [],
        cursedRelic: null,
        relicPending: false,
        potions: [null, null, null],
        infiniteMode: false,
      });
      setSelIdx(null);
      immortalHeartUsedRef.current = false;
    },
    [myChar, myCharRarity, myRogueArchetype, difficulty, startGameRun],
  );

  // ── Enter a map node ─────────────────────────────────────────────────────
  const enterNode = useCallback(
    (floorIdx: number, nodeType: NodeType) => {
      setGs((prev) => {
        if (!prev || prev.phase !== "map") return prev;
        const newChosenPath = [...prev.chosenPath, nodeType];

        if (
          nodeType === "fight" ||
          nodeType === "elite" ||
          nodeType === "boss"
        ) {
          const enemy = spawnEnemyForFloor(
            floorIdx,
            nodeType as "fight" | "elite" | "boss",
            prev.difficulty,
          );
          const drawPile = shuffle([...prev.deck]);
          // Relic: extra draws at battle start
          const extraDraw =
            (hasRelic(getEffectiveRelics(prev), "compass") ? 1 : 0) +
            (hasRelic(getEffectiveRelics(prev), "hourglass") ? 2 : 0);
          const handSizeMod = hasRelic(getEffectiveRelics(prev), "iron_heart") ? -1 : 0;
          const drawn = drawN([], drawPile, [], 5 + extraDraw + handSizeMod);
          // 억까: 연전 - elite floor4+ 20% 확률로 2연전
          const chainPending =
            nodeType === "elite" && floorIdx >= 4 && Math.random() < 0.2
              ? spawnEnemyForFloor(floorIdx, "fight", prev.difficulty)
              : null;
          // 전투 시작 패시브
          const attackStrBonus =
            myRogueArchetype === "attack" ? 1 : 0;
          const isDefenseType =
            myRogueArchetype === "defense";
          const battleStartShield =
            (isDefenseType ? prev.shield : 0) +
            (hasRelic(getEffectiveRelics(prev), "iron_flask") ? 5 : 0) +
            (hasRelic(getEffectiveRelics(prev), "gilded_shield") ? 10 : 0) +
            (hasRelic(getEffectiveRelics(prev), "iron_heart") ? 25 : 0);
          const manaBonus = hasRelic(getEffectiveRelics(prev), "mana_shard") ? 1 : 0;
          if (hasRelic(getEffectiveRelics(prev), "battle_horn")) enemy.poisonStacks += 3;
          // 저주기물: cursed_sigil — 적 독 +12, 본인 독 +2
          if (hasRelic(getEffectiveRelics(prev), "cursed_sigil")) enemy.poisonStacks += 12;
          const sigilSelfPoison = hasRelic(getEffectiveRelics(prev), "cursed_sigil") ? 2 : 0;
          // boss relic: berserker_crown — 전투 시작 체력 -15%
          const berserkDmg = hasRelic(getEffectiveRelics(prev), "berserker_crown")
            ? Math.floor(prev.playerMaxHp * 0.15) : 0;
          const battleStartHp = Math.max(1, prev.playerHp - berserkDmg);
          const battleLog: string[] = [
            attackStrBonus > 0
              ? ko
                ? "전투 시작! (힘 +1)"
                : ja
                  ? "バトル開始！(力+1)"
                  : "Battle start! (Strength +1)"
              : ko
                ? "전투 시작!"
                : ja
                  ? "バトル開始！"
                  : "Battle start!",
            ...(hasRelic(getEffectiveRelics(prev), "battle_horn")
              ? [ko ? "[전투 뿔피리] 독 3" : ja ? "[戦闘の角笛] 毒3" : "[Battle Horn] +3 poison"]
              : []),
            ...(hasRelic(getEffectiveRelics(prev), "cursed_sigil")
              ? [ko ? "[저주의 인장] 적 독 +5, 내 독 +3" : ja ? "[呪いの印章] 敵毒+5, 自毒+3" : "[Cursed Sigil] Enemy +5 poison, self +3 poison"]
              : []),
            ...(berserkDmg > 0
              ? [ko ? `[광전사의 왕관] 체력 -${berserkDmg} (-20%)` : ja ? `[狂戦士の王冠] HP-${berserkDmg} (-20%)` : `[Berserker Crown] -${berserkDmg} HP (-20%)`]
              : []),
          ];
          return {
            ...prev,
            phase: "battle",
            floor: floorIdx,
            chosenPath: newChosenPath,
            shield: battleStartShield,
            energy: prev.maxEnergy + manaBonus,
            strength: prev.strength + attackStrBonus,
            playerHp: battleStartHp,
            poison: sigilSelfPoison,
            enemy,
            hand: drawn.hand,
            drawPile: drawn.drawPile,
            discardPile: drawn.discardPile,
            log: battleLog,
            turnCount: 1,
            cardsPlayedCosts: [],
            chainPending,
            cursedRest: false,
            shopInflated: false,
          };
        }
        if (nodeType === "treasure") {
          // 억까: 함정 보물 - 25% 확률로 적 매복 (master_key 기물로 방지)
          if (!hasRelic(getEffectiveRelics(prev), "master_key") && Math.random() < 0.25) {
            const enemy = spawnEnemyForFloor(
              floorIdx,
              "fight",
              prev.difficulty,
            );
            const drawPile = shuffle([...prev.deck]);
            const extraDraw =
              (hasRelic(getEffectiveRelics(prev), "compass") ? 1 : 0) +
              (hasRelic(getEffectiveRelics(prev), "hourglass") ? 2 : 0);
            const drawn = drawN([], drawPile, [], 5 + extraDraw);
            const attackStrBonus =
              myRogueArchetype === "attack" ? 1 : 0;
            const isDefenseTypeA =
              myRogueArchetype === "defense";
            const battleStartShieldA =
              (isDefenseTypeA ? prev.shield : 0) +
              (hasRelic(getEffectiveRelics(prev), "iron_flask") ? 5 : 0) +
              (hasRelic(getEffectiveRelics(prev), "gilded_shield") ? 10 : 0);
            const manaBonus = hasRelic(getEffectiveRelics(prev), "mana_shard") ? 1 : 0;
            if (hasRelic(getEffectiveRelics(prev), "battle_horn")) enemy.poisonStacks += 3;
            return {
              ...prev,
              phase: "battle",
              floor: floorIdx,
              chosenPath: newChosenPath,
              shield: battleStartShieldA,
              energy: prev.maxEnergy + manaBonus,
              strength: prev.strength + attackStrBonus,
              poison: 0,
              enemy,
              hand: drawn.hand,
              drawPile: drawn.drawPile,
              discardPile: drawn.discardPile,
              log: [
                ko
                  ? "[!] 함정이다! 적이 숨어 있었다!"
                  : ja
                    ? "[!] トラップ！敵が潜んでいた！"
                    : "[!] Ambush! An enemy was hiding!",
              ],
              turnCount: 1,
              cardsPlayedCosts: [],
              chainPending: null,
              cursedRest: false,
              shopInflated: false,
            };
          }
          const extraCard =
            hasRelic(getEffectiveRelics(prev), "lucky_coin") ||
            hasRelic(getEffectiveRelics(prev), "fate_dice");
          const fateDice = hasRelic(getEffectiveRelics(prev), "fate_dice");
          return {
            ...prev,
            phase: "reward",
            floor: floorIdx,
            chosenPath: newChosenPath,
            rewardCards: pickRewards(
              floorIdx,
              arch,
              prev.difficulty,
              extraCard,
              fateDice,
              prev.deck,
            ),
            relicPending: true,
          };
        }
        if (nodeType === "shop") {
          // 억까: 바가지 상점 - 30% 확률로 가격 1.5배
          const inflated = Math.random() < 0.3;
          const discount = hasRelic(getEffectiveRelics(prev), "philosopher");
          return {
            ...prev,
            phase: "shop",
            floor: floorIdx,
            chosenPath: newChosenPath,
            shopItems: makeShopItems(arch, inflated, discount, prev.deck, prev.relics),
            shopInflated: inflated,
          };
        }
        if (nodeType === "rest") {
          // 억까: 저주받은 휴식소 - floor4+ 25% 확률
          const cursedRest = floorIdx >= 4 && Math.random() < 0.25;
          return {
            ...prev,
            phase: "rest",
            floor: floorIdx,
            chosenPath: newChosenPath,
            cursedRest,
          };
        }
        return prev;
      });
      setSelIdx(null);
    },
    [ko, ja, arch, myRogueArchetype],
  );

  // ── Play a card ──────────────────────────────────────────────────────────
  const playCard = useCallback(
    (handIdx: number) => {
      setGs((prev) => {
        if (!prev || prev.phase !== "battle" || !prev.enemy) return prev;
        const card = prev.hand[handIdx];
        if (!card || prev.energy < card.cost) return prev;

        let playerHp = prev.playerHp;
        let playerMaxHp = prev.playerMaxHp;
        let shield = prev.shield;
        let strength = prev.strength;
        let energy = prev.energy - card.cost;
        let comboCountMult = prev.comboCountMult;
        let enemy = { ...prev.enemy };
        const logs: string[] = [];

        // Meka: from turn 3, all damage is doubled
        const mekaDoubled = arch === "meka" && prev.turnCount >= 3;

        // 1. Strength first
        if (card.strength) {
          strength += card.strength;
          logs.push(
            ko
              ? `힘 +${card.strength}`
              : ja
                ? `力+${card.strength}`
                : `Strength +${card.strength}`,
          );
        }

        // 2. Damage
        if (card.damage) {
          const baseHits = card.multiHit ?? 1;
          const hasGauntlet = card.type === "attack" && hasRelic(getEffectiveRelics(prev), "titan_gauntlet");
          const gauntletBonus = hasGauntlet ? 8 : 0;
          const hits = hasGauntlet ? baseHits + 2 : baseHits;
          let total = 0;
          for (let i = 0; i < hits; i++) {
            const raw = Math.floor((card.damage + strength + gauntletBonus) * (mekaDoubled ? 2 : 1));
            const abs = Math.min(enemy.currentShield, raw);
            enemy.currentShield = Math.max(0, enemy.currentShield - abs);
            enemy.currentHp = Math.max(0, enemy.currentHp - (raw - abs));
            total += raw;
          }
          const hitStr = hits > 1 ? ` ×${hits}` : "";
          const doubledStr = mekaDoubled ? (ko ? " [메카×2]" : ja ? " [メカ×2]" : " [Meka×2]") : "";
          logs.push(
            ko
              ? `${total} 데미지${hitStr}${doubledStr}`
              : ja
                ? `${total}ダメージ${hitStr}${doubledStr}`
                : `${total} damage${hitStr}${doubledStr}`,
          );
        }

        // 2b. Combo Finisher: damage = cards played this turn × mult
        if (card.comboFinisherMult) {
          const cardCount = Math.floor(prev.cardsPlayedCosts.length * comboCountMult);
          const comboDmg = Math.floor(cardCount * card.comboFinisherMult * (mekaDoubled ? 2 : 1));
          if (comboDmg > 0) {
            const abs = Math.min(enemy.currentShield, comboDmg);
            enemy.currentShield = Math.max(0, enemy.currentShield - abs);
            enemy.currentHp = Math.max(0, enemy.currentHp - (comboDmg - abs));
          }
          logs.push(
            ko
              ? `${comboDmg} 콤보 데미지 (${cardCount}장 × ${card.comboFinisherMult})`
              : ja
                ? `${comboDmg} コンボダメージ (${cardCount}枚 × ${card.comboFinisherMult})`
                : `${comboDmg} combo damage (${cardCount} × ${card.comboFinisherMult})`,
          );
        }

        // 2c. Double combo count
        if (card.doubleComboCount) {
          comboCountMult = comboCountMult * 2;
          logs.push(
            ko
              ? `콤보 카운트 2배 (현재 ×${comboCountMult})`
              : ja
                ? `コンボカウント2倍 (現在 ×${comboCountMult})`
                : `Combo count doubled (now ×${comboCountMult})`,
          );
        }

        // 2d. Missing-HP damage (minimum 5)
        if (card.missingHpDamage) {
          const missingHp = prev.playerMaxHp - playerHp;
          const rawMissingDmg = Math.max(5, missingHp);
          const finalMissingDmg = Math.floor(rawMissingDmg * (mekaDoubled ? 2 : 1));
          if (finalMissingDmg > 0) {
            const abs = Math.min(enemy.currentShield, finalMissingDmg);
            enemy.currentShield = Math.max(0, enemy.currentShield - abs);
            enemy.currentHp = Math.max(0, enemy.currentHp - (finalMissingDmg - abs));
          }
          logs.push(
            ko
              ? `${finalMissingDmg} 데미지 (잃은 HP)`
              : ja
                ? `${finalMissingDmg}ダメージ (失いHP)`
                : `${finalMissingDmg} damage (missing HP)`,
          );
        }

        // 2d. Shield-proportional damage (현재 방어도 비례)
        if (card.shieldStrike && shield > 0) {
          const shieldDmg = Math.floor(shield * card.shieldStrike);
          if (shieldDmg > 0) {
            const abs = Math.min(enemy.currentShield, shieldDmg);
            enemy.currentShield = Math.max(0, enemy.currentShield - abs);
            enemy.currentHp = Math.max(0, enemy.currentHp - (shieldDmg - abs));
            logs.push(
              ko
                ? `방어력 ${shieldDmg} 피해 (×${card.shieldStrike})`
                : ja
                  ? `シールド${shieldDmg}ダメージ (×${card.shieldStrike})`
                  : `Shield ${shieldDmg} damage (×${card.shieldStrike})`,
            );
          }
        }

        // 3. Shield
        if (card.shield) {
          shield += card.shield;
          logs.push(
            ko
              ? `방어력 +${card.shield}`
              : ja
                ? `シールド+${card.shield}`
                : `Shield +${card.shield}`,
          );
        }

        // 4. Heal
        if (card.heal) {
          const h = Math.min(card.heal, prev.playerMaxHp - playerHp);
          playerHp = Math.min(prev.playerMaxHp, playerHp + card.heal);
          if (h > 0) logs.push(`HP +${h}`);
        }

        // Status-effect apply chance (60%)
        const tryApply = (stacks: number) => Math.random() < 0.6 ? stacks : 0;

        // 5. Poison on enemy
        if (card.poison) {
          const applied = tryApply(card.poison);
          if (applied > 0) {
            enemy.poisonStacks += applied;
            logs.push(ko ? `독 ${applied}` : ja ? `毒${applied}` : `Poison ${applied}`);
          } else {
            logs.push(ko ? "독 (실패)" : ja ? "毒(失敗)" : "Poison (missed)");
          }
        }

        // 5b. New status effects on enemy
        if (card.bleed) {
          const a = tryApply(card.bleed);
          if (a > 0) { enemy.bleedStacks += a; logs.push(ko ? `출혈 ${a}` : ja ? `出血${a}` : `Bleed ${a}`); }
          else logs.push(ko ? "출혈 (실패)" : ja ? "出血(失敗)" : "Bleed (missed)");
        }
        if (card.burn) {
          const a = tryApply(card.burn);
          if (a > 0) { enemy.burnStacks += a; logs.push(ko ? `화상 ${a}` : ja ? `火傷${a}` : `Burn ${a}`); }
          else logs.push(ko ? "화상 (실패)" : ja ? "火傷(失敗)" : "Burn (missed)");
        }
        if (card.fear) {
          const a = tryApply(card.fear);
          if (a > 0) { enemy.fearStacks += a; logs.push(ko ? `공포 ${a}턴` : ja ? `恐怖${a}ターン` : `Fear ${a}t`); }
          else logs.push(ko ? "공포 (실패)" : ja ? "恐怖(失敗)" : "Fear (missed)");
        }
        if (card.bind) {
          const a = tryApply(card.bind);
          if (a > 0) { enemy.bindStacks += a; logs.push(ko ? `속박 ${a}턴` : ja ? `束縛${a}ターン` : `Bind ${a}t`); }
          else logs.push(ko ? "속박 (실패)" : ja ? "束縛(失敗)" : "Bind (missed)");
        }
        if (card.shock) {
          const a = tryApply(card.shock);
          if (a > 0) { enemy.shockStacks += a; logs.push(ko ? `감전 ${a}턴` : ja ? `感電${a}ターン` : `Shock ${a}t`); }
          else logs.push(ko ? "감전 (실패)" : ja ? "感電(失敗)" : "Shock (missed)");
        }
        if (card.curseDebuff) {
          const a = tryApply(card.curseDebuff);
          if (a > 0) { enemy.curseStacks += a; logs.push(ko ? `저주 ${a}` : ja ? `呪い${a}` : `Curse ${a}`); }
          else logs.push(ko ? "저주 (실패)" : ja ? "呪い(失敗)" : "Curse (missed)");
        }

        // 5c. Status-combo damage or heal (total stacks)
        if (card.statusCombo) {
          const total = enemy.poisonStacks + enemy.bleedStacks + enemy.burnStacks +
            enemy.fearStacks + enemy.bindStacks + enemy.shockStacks + enemy.curseStacks;
          if (card.id === "hex_drain") {
            // heal variant: recover total*3 HP
            const healAmt = Math.min(total * 3, playerMaxHp - playerHp);
            playerHp = Math.min(playerMaxHp, playerHp + total * 3);
            if (healAmt > 0) logs.push(ko ? `HP +${healAmt} (저주 흡수)` : ja ? `HP+${healAmt} (呪い吸収)` : `HP +${healAmt} (hex drain)`);
          } else {
            const comboDmg = Math.floor(total * (mekaDoubled ? 2 : 1));
            if (comboDmg > 0) {
              const abs = Math.min(enemy.currentShield, comboDmg);
              enemy.currentShield = Math.max(0, enemy.currentShield - abs);
              enemy.currentHp = Math.max(0, enemy.currentHp - (comboDmg - abs));
            }
            logs.push(ko ? `${comboDmg} 상태이상 연폭 (${total}스택)` : ja ? `${comboDmg} 状態異常爆発(${total}スタック)` : `${comboDmg} status burst (${total} stacks)`);
          }
        }

        // 5d. MaxHP gain
        if (card.maxHpGain) {
          playerMaxHp += card.maxHpGain;
          logs.push(ko ? `최대HP +${card.maxHpGain}` : ja ? `最大HP+${card.maxHpGain}` : `Max HP +${card.maxHpGain}`);
        }

        // 5e. MaxHP-scale damage
        if (card.maxHpScale) {
          const scaleDmg = Math.floor(playerMaxHp * card.maxHpScale * (mekaDoubled ? 2 : 1));
          if (scaleDmg > 0) {
            const abs = Math.min(enemy.currentShield, scaleDmg);
            enemy.currentShield = Math.max(0, enemy.currentShield - abs);
            enemy.currentHp = Math.max(0, enemy.currentHp - (scaleDmg - abs));
          }
          logs.push(ko ? `${scaleDmg} 생명력 데미지 (최대HP×${card.maxHpScale})` : ja ? `${scaleDmg} 生命力ダメージ(最大HP×${card.maxHpScale})` : `${scaleDmg} life force dmg (maxHP×${card.maxHpScale})`);
        }

        // 6. Self damage (shield absorbs self-damage too, and is consumed)
        if (card.selfDamage) {
          const selfAbsorbed = Math.min(shield, card.selfDamage);
          shield = Math.max(0, shield - selfAbsorbed);
          const direct = Math.max(0, card.selfDamage - selfAbsorbed);
          playerHp = Math.max(0, playerHp - direct);
          if (direct > 0)
            logs.push(ko ? `자신 -${direct}` : ja ? `自身-${direct}` : `Self -${direct}`);
        }

        // 7. Bonus energy
        if (card.bonusEnergy) {
          energy += card.bonusEnergy;
          logs.push(
            ko
              ? `에너지 +${card.bonusEnergy}`
              : ja
                ? `エナジー+${card.bonusEnergy}`
                : `Energy +${card.bonusEnergy}`,
          );
        }

        // Update hand / discard
        const newHand = prev.hand.filter((_, i) => i !== handIdx);
        let disc = [...prev.discardPile, card];
        let {
          hand: finalHand,
          drawPile,
          discardPile,
        } = { hand: newHand, drawPile: prev.drawPile, discardPile: disc };

        // Draw cards
        if (card.draw) {
          const d = drawN(finalHand, drawPile, discardPile, card.draw);
          finalHand = d.hand;
          drawPile = d.drawPile;
          discardPile = d.discardPile;
        }

        const logEntry = `[${card.name}] ${logs.join(", ")}`;
        const newLog = [...prev.log.slice(-5), logEntry];
        const newCardsPlayedCosts = [...prev.cardsPlayedCosts, card.cost];

        // Enemy dead?
        if (enemy.currentHp <= 0) {
          const nodeType = prev.chosenPath[prev.floor];
          const isFinal =
            !prev.infiniteMode &&
            (prev.mode !== "challenge" || prev.floor >= CHALLENGE_FLOORS - 1);
          // Relic: permanent stat gain on kill
          const killMaxHpGain =
            (hasRelic(getEffectiveRelics(prev), "bandage") ? 1 : 0) +
            (hasRelic(getEffectiveRelics(prev), "vampire_ring") ? 2 : 0) +
            (hasRelic(getEffectiveRelics(prev), "health_potion") ? 2 : 0) +
            (hasRelic(getEffectiveRelics(prev), "titan_core") ? 3 : 0) +
            (hasRelic(getEffectiveRelics(prev), "abyss_crown") ? 10 : 0);
          const killStrGain =
            (hasRelic(getEffectiveRelics(prev), "blade_ring") ? 1 : 0) +
            (hasRelic(getEffectiveRelics(prev), "berserker_axe") ? 2 : 0) +
            (hasRelic(getEffectiveRelics(prev), "abyss_crown") ? 1 : 0) +
            (hasRelic(getEffectiveRelics(prev), "berserker_crown") ? 2 : 0);
          const newMaxHp = prev.playerMaxHp + killMaxHpGain;
          const hpAfterKill = Math.min(newMaxHp, playerHp + killMaxHpGain);
          if (nodeType === "boss" && isFinal) {
            return {
              ...prev,
              playerHp: hpAfterKill,
              playerMaxHp: newMaxHp,
              shield,
              strength: strength + killStrGain,
              energy,
              enemy,
              hand: finalHand,
              drawPile,
              discardPile,
              log: [...newLog, ko ? "승리!" : ja ? "クリア！" : "Victory!"],
              phase: "victory",
              cardsPlayedCosts: newCardsPlayedCosts,
              comboCountMult: 1,
            };
          }
          if (prev.chainPending) {
            const chainDrawPile = shuffle([...prev.deck]);
            const extraDraw =
              (hasRelic(getEffectiveRelics(prev), "compass") ? 1 : 0) +
              (hasRelic(getEffectiveRelics(prev), "hourglass") ? 2 : 0);
            const chainDrawn = drawN([], chainDrawPile, [], 5 + extraDraw);
            const chainStrBonus =
              myRogueArchetype === "attack" ? 1 : 0;
            const chainIsDefense =
              myRogueArchetype === "defense";
            return {
              ...prev,
              playerHp: hpAfterKill,
              playerMaxHp: newMaxHp,
              shield: chainIsDefense ? prev.shield : 0,
              strength: strength + killStrGain + chainStrBonus,
              energy: prev.maxEnergy,
              enemy: prev.chainPending,
              chainPending: null,
              hand: chainDrawn.hand,
              drawPile: chainDrawn.drawPile,
              discardPile: [],
              log: [
                ...newLog,
                ko
                  ? `[!] 연전! 새로운 적이 나타났다!${chainStrBonus ? " (힘 +1)" : ""}`
                  : ja
                    ? `[!] 連戦！新たな敵が出現！${chainStrBonus ? " (力+1)" : ""}`
                    : `[!] Chain battle! A new enemy appears!${chainStrBonus ? " (Strength +1)" : ""}`,
              ],
              turnCount: 1,
              cardsPlayedCosts: [],
              comboCountMult: 1,
            };
          }
          const baseGold =
            nodeType === "elite"
              ? DIFF_GOLD_ELITE[prev.difficulty]
              : DIFF_GOLD_FIGHT[prev.difficulty];
          const bonusGold =
            (hasRelic(getEffectiveRelics(prev), "old_wallet") ? 15 : 0) +
            (hasRelic(getEffectiveRelics(prev), "rabbit_foot") ? 20 : 0);
          const finalGold =
            (hasRelic(getEffectiveRelics(prev), "gold_pouch")
              ? Math.floor(baseGold * 1.3)
              : baseGold) + bonusGold;
          const extraCard =
            hasRelic(getEffectiveRelics(prev), "lucky_coin") ||
            hasRelic(getEffectiveRelics(prev), "fate_dice");
          const rewards = pickRewards(
            prev.floor,
            arch,
            prev.difficulty,
            extraCard,
            hasRelic(getEffectiveRelics(prev), "fate_dice"),
            prev.deck,
          );
          const newRelicPending = nodeType === "elite" || nodeType === "boss";
          return {
            ...prev,
            playerHp: hpAfterKill,
            playerMaxHp: newMaxHp,
            shield,
            strength: strength + killStrGain,
            energy,
            enemy,
            hand: finalHand,
            drawPile,
            discardPile,
            log: [...newLog, ko ? "처치!" : ja ? "撃破！" : "Defeated!"],
            phase: "reward",
            gold: prev.gold + finalGold,
            rewardCards: rewards,
            relicPending: newRelicPending,
            cardsPlayedCosts: newCardsPlayedCosts,
            comboCountMult: 1,
          };
        }

        // Player dead?
        if (playerHp <= 0) {
          if (
            hasRelic(getEffectiveRelics(prev), "immortal_heart") &&
            !immortalHeartUsedRef.current
          ) {
            immortalHeartUsedRef.current = true;
            playerHp = 1;
            logs.push(
              ko
                ? "[불멸의 심장] 치사 데미지 무효!"
                : ja
                  ? "[不滅の心臓] 致死無効！"
                  : "[Immortal Heart] Lethal blocked!",
            );
          } else {
            return {
              ...prev,
              playerHp: 0,
              phase: "gameover",
              log: newLog,
              hand: finalHand,
              drawPile,
              discardPile,
              cardsPlayedCosts: newCardsPlayedCosts,
              comboCountMult: 1,
            };
          }
        }

        return {
          ...prev,
          playerHp,
          playerMaxHp,
          shield,
          strength,
          energy,
          enemy,
          hand: finalHand,
          drawPile,
          discardPile,
          log: newLog,
          cardsPlayedCosts: newCardsPlayedCosts,
          comboCountMult,
        };
      });
      setSelIdx(null);
    },
    [ko, ja, arch, myRogueArchetype],
  );

  // ── End turn ─────────────────────────────────────────────────────────────
  const endTurn = useCallback(() => {
    setGs((prev) => {
      if (!prev || prev.phase !== "battle" || !prev.enemy) return prev;

      let enemy = { ...prev.enemy };
      let playerHp = prev.playerHp;
      let playerPoison = prev.poison;
      let shield = prev.shield;
      const logs: string[] = [];
      const eName = ko ? enemy.name : ja ? enemy.nameJa : enemy.nameEn;

      // Curse amplifier
      const curseAmp = enemy.curseStacks > 0 ? 1.5 : 1;

      // Status ticks decay every 2 turns (odd turnCount = decay turn)
      const decayTurn = prev.turnCount % 2 === 1;

      // Enemy poison tick (nature: stacks don't decrease)
      if (enemy.poisonStacks > 0) {
        const pd = Math.floor(enemy.poisonStacks * curseAmp);
        enemy.currentHp = Math.max(0, enemy.currentHp - pd);
        if (arch !== "nature" && decayTurn) {
          enemy.poisonStacks = Math.max(0, enemy.poisonStacks - 1);
        }
        logs.push(ko ? `[독] -${pd} HP` : ja ? `[毒] -${pd} HP` : `[Poison] -${pd} HP`);
      }

      // Bleed tick (decreases every 2 turns)
      if (enemy.bleedStacks > 0) {
        const bd = Math.floor(enemy.bleedStacks * 2 * curseAmp);
        enemy.currentHp = Math.max(0, enemy.currentHp - bd);
        if (decayTurn) enemy.bleedStacks = Math.max(0, enemy.bleedStacks - 1);
        logs.push(ko ? `[출혈] -${bd} HP` : ja ? `[出血] -${bd} HP` : `[Bleed] -${bd} HP`);
      }

      // Burn tick (decreases every 2 turns)
      if (enemy.burnStacks > 0) {
        const fd = Math.floor(enemy.burnStacks * 3 * curseAmp);
        enemy.currentHp = Math.max(0, enemy.currentHp - fd);
        if (decayTurn) enemy.burnStacks = Math.max(0, enemy.burnStacks - 1);
        logs.push(ko ? `[화상] -${fd} HP` : ja ? `[火傷] -${fd} HP` : `[Burn] -${fd} HP`);
      }

      // Curse tick & decay every 2 turns
      if (enemy.curseStacks > 0) {
        const cd = Math.floor(enemy.curseStacks * 4);
        enemy.currentHp = Math.max(0, enemy.currentHp - cd);
        if (decayTurn) enemy.curseStacks = Math.max(0, enemy.curseStacks - 1);
        logs.push(ko ? `[저주] -${cd} HP` : ja ? `[呪い] -${cd} HP` : `[Curse] -${cd} HP`);
      }

      if (enemy.currentHp <= 0) {
        const nodeType = prev.chosenPath[prev.floor];
        const isFinal =
          prev.mode !== "challenge" || prev.floor >= CHALLENGE_FLOORS - 1;
        const killMaxHpGain =
          (hasRelic(getEffectiveRelics(prev), "bandage") ? 1 : 0) +
          (hasRelic(getEffectiveRelics(prev), "vampire_ring") ? 2 : 0) +
          (hasRelic(getEffectiveRelics(prev), "health_potion") ? 2 : 0) +
          (hasRelic(getEffectiveRelics(prev), "titan_core") ? 3 : 0) +
          (hasRelic(getEffectiveRelics(prev), "abyss_crown") ? 8 : 0);
        const killStrGain =
          (hasRelic(getEffectiveRelics(prev), "blade_ring") ? 1 : 0) +
          (hasRelic(getEffectiveRelics(prev), "berserker_axe") ? 2 : 0) +
          (hasRelic(getEffectiveRelics(prev), "abyss_crown") ? 1 : 0);
        const newMaxHp = prev.playerMaxHp + killMaxHpGain;
        const hpAfterKill = Math.min(newMaxHp, playerHp + killMaxHpGain);
        if (nodeType === "boss" && isFinal) {
          return {
            ...prev,
            playerHp: hpAfterKill,
            playerMaxHp: newMaxHp,
            strength: prev.strength + killStrGain,
            enemy: { ...enemy, currentHp: 0 },
            phase: "victory",
            log: [
              ...prev.log.slice(-5),
              ko ? "승리!" : ja ? "クリア！" : "Victory!",
            ],
            hand: [],
            discardPile: [...prev.discardPile, ...prev.hand],
          };
        }
        if (prev.chainPending) {
          const chainDrawPile = shuffle([...prev.deck]);
          const extraDraw =
            (hasRelic(getEffectiveRelics(prev), "compass") ? 1 : 0) +
            (hasRelic(getEffectiveRelics(prev), "hourglass") ? 2 : 0);
          const chainDrawn = drawN([], chainDrawPile, [], 5 + extraDraw);
          const chainStrBonus =
            myRogueArchetype === "attack" ? 1 : 0;
          const chainIsDefense2 =
            myRogueArchetype === "defense";
          return {
            ...prev,
            playerHp: hpAfterKill,
            playerMaxHp: newMaxHp,
            enemy: prev.chainPending,
            chainPending: null,
            shield: chainIsDefense2 ? prev.shield : 0,
            strength: prev.strength + killStrGain + chainStrBonus,
            energy: prev.maxEnergy,
            hand: chainDrawn.hand,
            drawPile: chainDrawn.drawPile,
            discardPile: [],
            log: [
              ...prev.log.slice(-3),
              ...logs,
              ko
                ? `[!] 연전! 새로운 적이 나타났다!${chainStrBonus ? " (힘 +1)" : ""}`
                : ja
                  ? `[!] 連戦！新たな敵が出現！${chainStrBonus ? " (力+1)" : ""}`
                  : `[!] Chain battle! A new enemy appears!${chainStrBonus ? " (Strength +1)" : ""}`,
            ],
            turnCount: 1,
            cardsPlayedCosts: [],
          };
        }
        const baseGold =
          nodeType === "elite"
            ? DIFF_GOLD_ELITE[prev.difficulty]
            : DIFF_GOLD_FIGHT[prev.difficulty];
        const bonusGold =
          (hasRelic(getEffectiveRelics(prev), "old_wallet") ? 15 : 0) +
          (hasRelic(getEffectiveRelics(prev), "rabbit_foot") ? 20 : 0);
        const finalGold =
          (hasRelic(getEffectiveRelics(prev), "gold_pouch")
            ? Math.floor(baseGold * 1.3)
            : baseGold) + bonusGold;
        const extraCard =
          hasRelic(getEffectiveRelics(prev), "lucky_coin") ||
          hasRelic(getEffectiveRelics(prev), "fate_dice");
        const newRelicPending = nodeType === "elite" || nodeType === "boss";
        return {
          ...prev,
          playerHp: hpAfterKill,
          playerMaxHp: newMaxHp,
          strength: prev.strength + killStrGain,
          enemy: { ...enemy, currentHp: 0 },
          phase: "reward",
          gold: prev.gold + finalGold,
          rewardCards: pickRewards(
            prev.floor,
            arch,
            prev.difficulty,
            extraCard,
            hasRelic(getEffectiveRelics(prev), "fate_dice"),
            prev.deck,
          ),
          relicPending: newRelicPending,
          log: [
            ...prev.log.slice(-5),
            ...logs,
            ko ? "처치!" : ja ? "撃破！" : "Defeated!",
          ],
          hand: [],
          discardPile: [...prev.discardPile, ...prev.hand],
        };
      }

      // Enemy action
      enemy.currentShield = 0;
      const pattern = enemy.patterns[enemy.patternIdx % enemy.patterns.length];

      // Bind: enemy skips entire turn
      if (enemy.bindStacks > 0) {
        enemy.bindStacks = Math.max(0, enemy.bindStacks - 1);
        enemy.patternIdx++;
        logs.push(ko ? `[속박] ${eName} 행동 불가!` : ja ? `[束縛] ${eName} 行動不能！` : `[Bind] ${eName} cannot act!`);
      } else if (enemy.fearStacks > 0 && (pattern.intent === "attack" || pattern.intent === "poison")) {
        // Fear: skip attack patterns only
        enemy.fearStacks = Math.max(0, enemy.fearStacks - 1);
        enemy.patternIdx++;
        logs.push(ko ? `[공포] ${eName} 공격 포기!` : ja ? `[恐怖] ${eName} 攻撃を諦めた！` : `[Fear] ${eName} skips attack!`);
      } else {
      enemy.patternIdx++;

      // Shock tick
      if (enemy.shockStacks > 0) enemy.shockStacks = Math.max(0, enemy.shockStacks - 1);

      if (pattern.intent === "attack" || pattern.intent === "poison") {
        // Armor system: shield absorbs damage and is consumed
        const atkBase = pattern.value + enemy.currentStrength;
        const atk = enemy.shockStacks > 0 ? Math.floor(atkBase / 2) : atkBase;
        const absorbed = Math.min(shield, atk);
        shield = Math.max(0, shield - absorbed);
        const direct = Math.max(0, atk - absorbed);
        playerHp = Math.max(0, playerHp - direct);
        // Relic: thorn bracelet reflects 1 damage when hit
        if (direct > 0 && hasRelic(getEffectiveRelics(prev), "thorn_bracelet")) {
          enemy.currentHp = Math.max(0, enemy.currentHp - 1);
          logs.push(
            ko
              ? "[가시 팔찌] 반사 1"
              : ja
                ? "[棘腕輪] 反射1"
                : "[Thorn Bracelet] Reflect 1",
          );
        }
        // Relic: soul mirror reflects 30% of direct damage
        if (direct > 0 && hasRelic(getEffectiveRelics(prev), "soul_mirror")) {
          const mirrorDmg = Math.floor(direct * 0.3);
          if (mirrorDmg > 0) {
            enemy.currentHp = Math.max(0, enemy.currentHp - mirrorDmg);
            logs.push(
              ko
                ? `[영혼의 거울] 반사 ${mirrorDmg}`
                : ja
                  ? `[魂の鏡] 反射${mirrorDmg}`
                  : `[Soul Mirror] Reflect ${mirrorDmg}`,
            );
          }
        }
        const shieldStr = shield > 0 ? ` (${ko ? "방어" : ja ? "防御" : "Armor"} ${shield})` : "";
        const shockStr = enemy.shockStacks > 0 ? (ko ? " [감전½]" : ja ? " [感電½]" : " [Shock½]") : "";
        logs.push(
          `[${eName}] ${ko ? "공격" : ja ? "攻撃" : "Attack"} ${atkBase}${shockStr}${shieldStr}${direct > 0 ? ` → -${direct}HP` : ` → ${ko ? "막힘" : ja ? "防御" : "blocked"}`}`,
        );
        if (pattern.poison) {
          playerPoison += pattern.poison;
          logs.push(
            ko
              ? `독 ${pattern.poison} 적용`
              : ja
                ? `毒${pattern.poison}`
                : `Poison ${pattern.poison} applied`,
          );
        }
      }
      if (pattern.intent === "defend") {
        const sh = pattern.shield ?? 0;
        enemy.currentShield = sh;
        logs.push(
          `[${eName}] ${ko ? `방어력 ${sh}` : ja ? `シールド${sh}` : `Shield ${sh}`}`,
        );
      }
      if (pattern.intent === "buff") {
        const str = pattern.strength ?? 0;
        enemy.currentStrength += str;
        logs.push(
          `[${eName}] ${ko ? `힘 +${str}` : ja ? `力+${str}` : `Strength +${str}`}`,
        );
      }
      } // end else (not bound/feared)

      // Player death check
      if (playerHp <= 0) {
        if (
          hasRelic(getEffectiveRelics(prev), "immortal_heart") &&
          !immortalHeartUsedRef.current
        ) {
          immortalHeartUsedRef.current = true;
          playerHp = 1;
          logs.push(
            ko
              ? "[불멸의 심장] 치사 데미지 무효!"
              : ja
                ? "[不滅の心臓] 致死無効！"
                : "[Immortal Heart] Lethal blocked!",
          );
        } else {
          return {
            ...prev,
            playerHp: 0,
            poison: playerPoison,
            enemy,
            phase: "gameover",
            log: [...prev.log.slice(-5), ...logs],
            hand: [],
            discardPile: [...prev.discardPile, ...prev.hand],
          };
        }
      }

      // Player poison tick
      if (playerPoison > 0) {
        const pd = playerPoison;
        playerHp = Math.max(0, playerHp - pd);
        playerPoison = Math.max(0, playerPoison - 1);
        logs.push(
          ko
            ? `[나] 독 -${pd} HP`
            : ja
              ? `[自分] 毒-${pd}HP`
              : `[You] Poison -${pd} HP`,
        );
        if (playerHp <= 0) {
          if (
            hasRelic(getEffectiveRelics(prev), "immortal_heart") &&
            !immortalHeartUsedRef.current
          ) {
            immortalHeartUsedRef.current = true;
            playerHp = 1;
            logs.push(
              ko
                ? "[불멸의 심장] 치사 데미지 무효!"
                : ja
                  ? "[不滅の心臓] 致死無効！"
                  : "[Immortal Heart] Lethal blocked!",
            );
          } else {
            return {
              ...prev,
              playerHp: 0,
              poison: playerPoison,
              enemy,
              phase: "gameover",
              log: [...prev.log.slice(-5), ...logs],
              hand: [],
              discardPile: [...prev.discardPile, ...prev.hand],
            };
          }
        }
      }

      // Start new player turn: draw 5 (remaining shield carries over within battle)
      const newDisc = [...prev.discardPile, ...prev.hand];
      const extraDraw =
        (hasRelic(getEffectiveRelics(prev), "compass") ? 1 : 0) +
        (hasRelic(getEffectiveRelics(prev), "hourglass") ? 2 : 0);
      const drawn = drawN([], prev.drawPile, newDisc, 5 + extraDraw);

      // Relic: dragon scale - add shield on turn start
      const dragonShield = hasRelic(getEffectiveRelics(prev), "dragon_scale") ? 3 : 0;
      // Relic: poison bangle / cursed tome - apply poison to enemy on turn start
      let turnStartEnemy = { ...enemy };
      const turnLogs: string[] = [];
      if (
        hasRelic(getEffectiveRelics(prev), "poison_bangle") &&
        turnStartEnemy.currentHp > 0
      ) {
        turnStartEnemy.poisonStacks += 1;
        turnLogs.push(
          ko
            ? "[독침 팔찌] 독 1"
            : ja
              ? "[毒針腕輪] 毒1"
              : "[Poison Bangle] +1 poison",
        );
      }
      if (
        hasRelic(getEffectiveRelics(prev), "cursed_tome") &&
        turnStartEnemy.currentHp > 0
      ) {
        turnStartEnemy.poisonStacks += 2;
        turnLogs.push(
          ko
            ? "[저주받은 책] 독 2"
            : ja
              ? "[呪われた本] 毒2"
              : "[Cursed Tome] +2 poison",
        );
      }

      return {
        ...prev,
        playerHp,
        poison: playerPoison,
        shield: shield + dragonShield,
        energy: prev.maxEnergy,
        enemy: turnStartEnemy,
        hand: drawn.hand,
        drawPile: drawn.drawPile,
        discardPile: drawn.discardPile,
        log: [
          ...prev.log.slice(-4),
          ...logs,
          ...turnLogs,
          ko
            ? `— 턴 ${prev.turnCount + 1}`
            : ja
              ? `— ターン${prev.turnCount + 1}`
              : `— Turn ${prev.turnCount + 1}`,
        ],
        turnCount: prev.turnCount + 1,
        cardsPlayedCosts: [],
        comboCountMult: 1,
      };
    });
    setSelIdx(null);
  }, [ko, ja, arch, myRogueArchetype]);

  // ── Pick reward ──────────────────────────────────────────────────────────
  const pickReward = useCallback((card: CardDef) => {
    const gs = gsRef.current;
    if (!gs) return;
    const maxCopies = card.archetype === "all" ? 3 : 2;
    const copies = gs.deck.filter((c) => c.id === card.id).length;
    if (copies >= maxCopies) return; // 이미 최대 보유
    const newCard = toInst(card);
    if (gs.deck.length >= 20) {
      setPendingCardSwap(newCard);
      return;
    }
    setGs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        deck: [...prev.deck, newCard],
        phase: "map",
        rewardCards: [],
      };
    });
  }, []);
  const skipReward = useCallback(
    () => setGs((p) => (p ? { ...p, phase: "map", rewardCards: [] } : p)),
    [],
  );

  // ── Shop ─────────────────────────────────────────────────────────────────
  const buyItem = useCallback((idx: number) => {
    const cur = gsRef.current;
    if (!cur) return;
    const item = cur.shopItems[idx];
    if (!item || item.bought || cur.gold < item.price) return;
    const newItems = cur.shopItems.map((it, i) =>
      i === idx ? { ...it, bought: true } : it,
    );

    if (item.kind === "card" && item.card) {
      const maxCopies = item.card.archetype === "all" ? 3 : 2;
      const copies = cur.deck.filter((c) => c.id === item.card!.id).length;
      if (copies >= maxCopies) return; // 이미 최대 보유
      if (cur.deck.length >= 20) {
        setGs((prev) =>
          prev ? { ...prev, gold: prev.gold - item.price, shopItems: newItems } : prev,
        );
        setPendingCardSwap(toInst(item.card));
        return;
      }
      setGs((prev) =>
        prev ? { ...prev, deck: [...prev.deck, toInst(item.card!)], gold: prev.gold - item.price, shopItems: newItems } : prev,
      );
      return;
    }

    if (item.kind === "consumable" && item.consumableId) {
      const id = item.consumableId;
      setGs((prev) => {
        if (!prev) return prev;
        // Elixirs & antidote → store in potion slot
        if (id === "elixir_30" || id === "elixir_50" || id === "elixir_100" || id === "antidote") {
          const slotIdx = prev.potions.findIndex((p) => p === null);
          if (slotIdx === -1) return prev;
          const newPotions = [...prev.potions] as (ShopConsumableId | null)[];
          newPotions[slotIdx] = id;
          return { ...prev, potions: newPotions, gold: prev.gold - item.price, shopItems: newItems };
        }
        // Stat crystals → apply immediately
        let { playerHp, playerMaxHp, shield, strength } = prev;
        if (id === "stat_str") strength += 2;
        if (id === "stat_def") shield += 2;
        if (id === "stat_maxhp") { playerMaxHp += 15; playerHp = Math.min(playerMaxHp, playerHp + 15); }
        return { ...prev, playerHp, playerMaxHp, shield, strength, gold: prev.gold - item.price, shopItems: newItems };
      });
      return;
    }

    if (item.kind === "relic" && item.relic) {
      if (cur.relics.length >= 5) {
        setGs((prev) =>
          prev ? { ...prev, gold: prev.gold - item.price, shopItems: newItems } : prev,
        );
        setPendingRelicSwap(item.relic);
      } else {
        setGs((prev) =>
          prev ? { ...prev, relics: [...prev.relics, item.relic!], gold: prev.gold - item.price, shopItems: newItems } : prev,
        );
      }
      return;
    }
  }, []);
  const usePotion = useCallback((slotIdx: number) => {
    setGs((prev) => {
      if (!prev || prev.phase !== "battle") return prev;
      const potionId = prev.potions[slotIdx];
      if (!potionId) return prev;
      let { playerHp, playerMaxHp } = prev;
      if (potionId === "elixir_30") playerHp = Math.min(playerMaxHp, playerHp + Math.floor(playerMaxHp * 0.3));
      if (potionId === "elixir_50") playerHp = Math.min(playerMaxHp, playerHp + Math.floor(playerMaxHp * 0.5));
      if (potionId === "elixir_100") playerHp = playerMaxHp;
      const newPotions = [...prev.potions] as (ShopConsumableId | null)[];
      newPotions[slotIdx] = null;
      if (potionId === "antidote") {
        return { ...prev, poison: 0, potions: newPotions };
      }
      return { ...prev, playerHp, potions: newPotions };
    });
  }, []);

  const enterInfiniteMode = useCallback(() => {
    challengeSubmittedRef.current = false; // allow re-submit when dying in infinite mode
    setGs((prev) =>
      prev ? { ...prev, phase: "map", infiniteMode: true } : prev,
    );
  }, []);

  const leaveShop = useCallback(
    () => setGs((p) => (p ? { ...p, phase: "map" } : p)),
    [],
  );

  // ── Rest ─────────────────────────────────────────────────────────────────
  const doRest = useCallback(() => {
    setGs((prev) => {
      if (!prev) return prev;
      const healPct = prev.cursedRest ? 0.1 : 0.3;
      const heal = Math.floor(prev.playerMaxHp * healPct);
      return {
        ...prev,
        playerHp: Math.min(prev.playerMaxHp, prev.playerHp + heal),
        phase: "map",
        cursedRest: false,
      };
    });
  }, []);

  const abandonRun = useCallback(() => {
    setGs(null);
    setSelIdx(null);
    setPendingRelicOffer(null);
    setPendingRelicSwap(null);
    setPendingCardSwap(null);
  }, []);

  // ── Relic offer handlers ──────────────────────────────────────────────────
  const handlePickRelic = useCallback((relic: RelicDef) => {
    if (!gsRef.current) return;
    // 저주기물(boss)은 별도 cursedRelic 슬롯에 저장 (일반 5슬롯 미사용)
    if (relic.grade === "boss") {
      setGs((prev) => {
        if (!prev) return prev;
        let next = { ...prev, cursedRelic: relic };
        if (relic.id === "berserker_crown")
          next = { ...next, strength: next.strength + 10 };
        if (relic.id === "titan_gauntlet")
          next = {
            ...next,
            playerMaxHp: Math.max(1, next.playerMaxHp - 30),
            playerHp: Math.min(Math.max(1, next.playerMaxHp - 30), next.playerHp),
          };
        if (relic.id === "abyss_crown")
          next = { ...next, playerHp: Math.max(1, Math.floor(next.playerHp / 2)) };
        return next;
      });
      setPendingRelicOffer(null);
      return;
    }
    if (gsRef.current.relics.length >= 5) {
      setPendingRelicSwap(relic);
      return;
    }
    setGs((prev) => {
      if (!prev) return prev;
      let next = { ...prev, relics: [...prev.relics, relic] };
      if (relic.id === "magic_cloak")
        next = {
          ...next,
          playerMaxHp: next.playerMaxHp + 100,
          playerHp: Math.min(next.playerMaxHp + 100, next.playerHp + 100),
        };
      if (relic.id === "energy_crystal")
        next = {
          ...next,
          maxEnergy: next.maxEnergy + 1,
          energy: next.energy + 1,
        };
      if (relic.id === "storm_sword")
        next = {
          ...next,
          maxEnergy: next.maxEnergy + 1,
          energy: next.energy + 1,
        };
      if (relic.id === "titan_heart")
        next = {
          ...next,
          playerMaxHp: next.playerMaxHp + 40,
          playerHp: Math.min(next.playerMaxHp + 40, next.playerHp + 40),
        };
      if (relic.id === "void_crystal")
        next = {
          ...next,
          maxEnergy: next.maxEnergy + 2,
          energy: next.energy + 2,
        };
      return next;
    });
    setPendingRelicOffer(null);
  }, []);

  const handleSkipRelic = useCallback(() => {
    setPendingRelicOffer(null);
  }, []);

  const handleRelicSwap = useCallback(
    (slotIdx: number) => {
      if (!pendingRelicSwap) return;
      const newRelic = pendingRelicSwap;
      setGs((prev) => {
        if (!prev) return prev;
        const oldRelic = prev.relics[slotIdx];
        const newRelics = [...prev.relics];
        newRelics[slotIdx] = newRelic;
        let next = { ...prev, relics: newRelics };
        // Reverse old relic immediate effects
        if (oldRelic.id === "magic_cloak")
          next = {
            ...next,
            playerMaxHp: next.playerMaxHp - 100,
            playerHp: Math.min(next.playerHp, next.playerMaxHp - 100),
          };
        if (oldRelic.id === "energy_crystal")
          next = {
            ...next,
            maxEnergy: Math.max(1, next.maxEnergy - 1),
            energy: Math.max(1, next.energy - 1),
          };
        if (oldRelic.id === "storm_sword")
          next = {
            ...next,
            maxEnergy: Math.max(1, next.maxEnergy - 1),
            energy: Math.max(1, next.energy - 1),
          };
        if (oldRelic.id === "titan_heart")
          next = {
            ...next,
            playerMaxHp: next.playerMaxHp - 40,
            playerHp: Math.min(next.playerHp, next.playerMaxHp - 40),
          };
        if (oldRelic.id === "void_crystal")
          next = {
            ...next,
            maxEnergy: Math.max(1, next.maxEnergy - 2),
            energy: Math.max(1, next.energy - 2),
          };
        // Apply new relic immediate effects
        if (newRelic.id === "magic_cloak")
          next = {
            ...next,
            playerMaxHp: next.playerMaxHp + 100,
            playerHp: Math.min(next.playerMaxHp + 100, next.playerHp + 100),
          };
        if (newRelic.id === "energy_crystal")
          next = {
            ...next,
            maxEnergy: next.maxEnergy + 1,
            energy: next.energy + 1,
          };
        if (newRelic.id === "storm_sword")
          next = {
            ...next,
            maxEnergy: next.maxEnergy + 1,
            energy: next.energy + 1,
          };
        if (newRelic.id === "titan_heart")
          next = {
            ...next,
            playerMaxHp: next.playerMaxHp + 40,
            playerHp: Math.min(next.playerMaxHp + 40, next.playerHp + 40),
          };
        if (newRelic.id === "void_crystal")
          next = {
            ...next,
            maxEnergy: next.maxEnergy + 2,
            energy: next.energy + 2,
          };
        return next;
      });
      setPendingRelicSwap(null);
      setPendingRelicOffer(null);
    },
    [pendingRelicSwap],
  );

  const handleRelicSwapSkip = useCallback(() => {
    setPendingRelicSwap(null);
    setPendingRelicOffer(null);
  }, []);

  // ── Card swap handlers (deck full) ────────────────────────────────────────
  const handleCardSwap = useCallback(
    (replaceIdx: number) => {
      if (!pendingCardSwap) return;
      const newCard = pendingCardSwap;
      setGs((prev) => {
        if (!prev) return prev;
        const newDeck = [...prev.deck];
        newDeck[replaceIdx] = newCard;
        // If we're in reward phase, go back to map; if in shop, stay in shop
        const nextPhase = prev.phase === "reward" ? "map" : prev.phase;
        return {
          ...prev,
          deck: newDeck,
          phase: nextPhase as Phase,
          rewardCards: nextPhase === "map" ? [] : prev.rewardCards,
        };
      });
      setPendingCardSwap(null);
    },
    [pendingCardSwap],
  );

  const handleCardSwapSkip = useCallback(() => {
    setGs((prev) => {
      if (!prev) return prev;
      const nextPhase = prev.phase === "reward" ? "map" : prev.phase;
      return {
        ...prev,
        phase: nextPhase as Phase,
        rewardCards: nextPhase === "map" ? [] : prev.rewardCards,
      };
    });
    setPendingCardSwap(null);
  }, []);

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @keyframes rogue-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes rogue-in{from{opacity:0;transform:scale(0.9) translateY(8px)}to{opacity:1;transform:none}}
    @keyframes rogue-slide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
    @keyframes ut-enemy-hit{0%{transform:translateX(0) scale(1.06);filter:brightness(50) saturate(0)}12%{transform:translateX(-9px);filter:brightness(14) saturate(0)}26%{transform:translateX(7px);filter:brightness(5) saturate(0.3)}44%{transform:translateX(-5px);filter:brightness(2.2) saturate(1)}62%{transform:translateX(4px);filter:brightness(1.3)}80%{transform:translateX(-2px);filter:brightness(1)}100%{transform:translateX(0);filter:brightness(1)}}
    @keyframes ut-dmg-pop{0%{opacity:1;transform:translateY(0) scale(1.8)}20%{opacity:1;transform:translateY(-8px) scale(1.3)}100%{opacity:0;transform:translateY(-48px) scale(0.85)}}
    @keyframes ut-player-flash{0%{opacity:0.55}100%{opacity:0}}
    @keyframes ut-card-panel-flash{0%{opacity:0.85}50%{opacity:0.55}100%{opacity:0}}
    @keyframes ut-card-icon{0%{opacity:0.95;transform:scale(0.3) rotate(-18deg)}28%{opacity:1;transform:scale(1.35) rotate(6deg)}60%{opacity:0.85;transform:scale(1.05) rotate(0)}100%{opacity:0;transform:scale(0.8) rotate(0)}}
    @keyframes ut-multihit-badge{0%{opacity:0;transform:scale(0.4) translateY(4px)}30%{opacity:1;transform:scale(1.2) translateY(-2px)}70%{opacity:1;transform:scale(1) translateY(0)}100%{opacity:0;transform:scale(0.8) translateY(-6px)}}
    .rogue-card-hover:hover{transform:translateY(-6px)!important;box-shadow:0 8px 24px #00000055!important}
    .rogue-log::-webkit-scrollbar{display:none}
    .rogue-log{scrollbar-width:none;-ms-overflow-style:none}
    .rogue-reward-guide::-webkit-scrollbar{display:none}
    .rogue-reward-guide{scrollbar-width:none;-ms-overflow-style:none}
    .rogue-guide-scroll::-webkit-scrollbar{display:none}
    .rogue-guide-scroll{scrollbar-width:none;-ms-overflow-style:none}
    .rogue-hand::-webkit-scrollbar{display:none}
    .rogue-hand{scrollbar-width:none;-ms-overflow-style:none;cursor:grab;user-select:none}
    .rogue-hand.dragging{cursor:grabbing}
  `;

  // 분리된 모달/마일스톤 컴포넌트 — RogueModals.tsx (모달 6종 + RelicCard + 헬퍼) 참고

  // ════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════
  if (!gs) {
    const archLabel: Record<string, string> = {
      warrior: ko ? "전사형" : ja ? "戦士型" : "Warrior",
      rogue: ko ? "도적형" : ja ? "盗賊型" : "Rogue",
      mage: ko ? "마법사형" : ja ? "魔法使い型" : "Mage",
      tank: ko ? "수호자형" : ja ? "守護者型" : "Guardian",
      nature: ko ? "자연형" : ja ? "自然型" : "Nature",
      meka: ko ? "메카형" : ja ? "メカ型" : "Meka",
      cursed: ko ? "저주술사형" : ja ? "呪術師型" : "Cursed",
      all: ko ? "만능형" : ja ? "万能型" : "All-rounder",
    };
    const archColor: Record<string, string> = {
      warrior: "#ef4444",
      rogue: "#a855f7",
      mage: "#3b82f6",
      tank: "#22c55e",
      nature: "#84cc16",
      meka: "#f59e0b",
      cursed: "#7c3aed",
      all: "#94a3b8",
    };
    const ac = archColor[arch] ?? "#94a3b8";
    const RARITY_KO: Record<string, string> = {
      common: "커먼",
      uncommon: "언커먼",
      rare: "레어",
      epic: "에픽",
      legendary: "레전더리",
      mythic: "신화",
    };
    const RARITY_JA: Record<string, string> = {
      common: "コモン",
      uncommon: "アンコモン",
      rare: "レア",
      epic: "エピック",
      legendary: "レジェンダリー",
      mythic: "ミシック",
    };
    const RARITY_EN_L: Record<string, string> = {
      common: "Common",
      uncommon: "Uncommon",
      rare: "Rare",
      epic: "Epic",
      legendary: "Legendary",
      mythic: "Mythic",
    };
    const rarityLabel = ko
      ? RARITY_KO[myCharRarity]
      : ja
        ? RARITY_JA[myCharRarity]
        : RARITY_EN_L[myCharRarity];
    return (
      <>
        <div
          style={{
            minHeight: "100vh",
            background: C.bg,
            fontFamily: FONT,
            padding: "0 0 40px",
          }}
        >
          <style>{css}</style>
          {/* ── 미궁 입구 배너 ── */}
          <div
            style={{
              position: "relative",
              background:
                "linear-gradient(180deg,#0e0025 0%,#0a001c 55%,#080018 100%)",
              borderBottom: "2px solid #4a1a88",
              padding: "18px 16px 16px",
              textAlign: "center",
              boxShadow: "0 4px 32px #5a0a9933",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.04,
                pointerEvents: "none",
                backgroundImage:
                  "repeating-linear-gradient(0deg,transparent,transparent 15px,#fff 15px,#fff 16px),repeating-linear-gradient(90deg,transparent,transparent 23px,rgba(255,255,255,0.35) 23px,rgba(255,255,255,0.35) 24px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 100%,#5a0aaa18 0%,transparent 70%)",
              }}
            />
            <p
              style={{
                margin: "0 0 6px",
                fontFamily: FONT,
                fontSize: 10,
                letterSpacing: "0.5em",
                color: "#7a3aaa",
                fontWeight: 900,
                position: "relative",
                zIndex: 1,
              }}
            >
              {ko
                ? "카드 배틀 로그라이크"
                : ja
                  ? "カードバトルローグライク"
                  : "CARD BATTLE ROGUELIKE"}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                gap: 12,
                marginBottom: 6,
                position: "relative",
                zIndex: 1,
              }}
            >
              <MagicOrb />
              <DungeonGate />
              <MagicOrb flip />
            </div>
            <h1
              style={{
                margin: "0 0 8px",
                position: "relative",
                zIndex: 1,
                fontFamily: "'Courier New',monospace",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "0.18em",
                color: "#c084fc",
                textShadow:
                  "0 0 20px #9333ea, 2px 2px 0 #1a0040, -1px -1px 0 #1a0040",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <Layers size={20} color="#c084fc" strokeWidth={2.5} />
              CARD EXPEDITION
              <Layers size={20} color="#c084fc" strokeWidth={2.5} />
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 12,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  height: 1,
                  width: 32,
                  background: "linear-gradient(90deg,transparent,#9333ea77)",
                }}
              />
              <span style={{ fontSize: 11, color: "#c084fc", opacity: 0.6 }}>
                ◈
              </span>
              <div
                style={{
                  height: 1,
                  width: 32,
                  background: "linear-gradient(90deg,#9333ea77,transparent)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <button
                onClick={() => setShowRewardGuide(true)}
                style={{
                  background: "rgba(42,10,74,0.7)",
                  border: "1px solid #6a1a99",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#c084fc",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap" as const,
                }}
              >
                <Award size={12} />
                {ko ? "보상 안내" : ja ? "報酬案内" : "Rewards"}
              </button>
              <button
                onClick={() => setShowRelicGuide(true)}
                style={{
                  background: "rgba(42,10,74,0.7)",
                  border: "1px solid #6a1a99",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#c084fc",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap" as const,
                }}
              >
                <Sparkles size={12} />
                {ko ? "기물 도감" : ja ? "遺物図鑑" : "Relics"}
              </button>
              <button
                onClick={() => setShowCardGuide(true)}
                style={{
                  background: "rgba(42,10,74,0.7)",
                  border: "1px solid #6a1a99",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#c084fc",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap" as const,
                }}
              >
                <BookOpen size={12} />
                {ko ? "카드 도감" : ja ? "カード図鑑" : "Cards"}
              </button>
              <button
                onClick={() => setShowRulesModal(true)}
                style={{
                  background: "rgba(42,10,74,0.7)",
                  border: "1px solid #6a1a99",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#c084fc",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: FONT,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap" as const,
                }}
              >
                <Info size={12} />
                {ko ? "규칙" : ja ? "ルール" : "Rules"}
              </button>
            </div>
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              margin: "0 auto",
              padding: "20px 20px 0",
            }}
          >
            {/* Character card */}
            {(() => {
              const ARCH_UNIQUE: Record<string, string[]> = {
                warrior: ["war_howl", "reckless"],
                rogue: ["swift_strike", "scratch"],
                mage: ["haunt", "soul_drain"],
                tank: ["shell_block", "endure"],
                nature: ["life_force", "pulse_heal"],
                wild: ["absorb", "overclock"],
                all: ["quick_guard", "battle_cry"],
              };
              const uniqueIds = ARCH_UNIQUE[arch] ?? ARCH_UNIQUE.all;
              const uniqueCards = uniqueIds
                .map((id) => CARDS.find((c) => c.id === id)!)
                .filter(Boolean);
              const cardTypeColor = (t: string) =>
                t === "attack"
                  ? "#ef4444"
                  : t === "skill"
                    ? "#3b82f6"
                    : "#a855f7";
              const cardTypeName = (t: string) =>
                t === "attack"
                  ? ko
                    ? "공격"
                    : ja
                      ? "攻撃"
                      : "Atk"
                  : t === "skill"
                    ? ko
                      ? "스킬"
                      : ja
                        ? "スキル"
                        : "Skill"
                    : ko
                      ? "기술"
                      : ja
                        ? "技"
                        : "Power";
              return (
                <div
                  style={{
                    background: C.panel,
                    border: `2px solid ${ac}44`,
                    borderRadius: 12,
                    padding: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    animation: "rogue-in 0.4s 0.05s ease-out both",
                    position: "relative",
                  }}
                  onMouseLeave={() => setShowStarterCards(false)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: C.textBright,
                      }}
                    >
                      {getCharName(myChar, lang)}
                    </p>
                    <p style={{ margin: "2px 0 6px", fontSize: 11, color: ac }}>
                      {rarityLabel} · {archLabel[arch]}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap" as const,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          background: `${C.red}18`,
                          borderRadius: 6,
                          padding: "3px 8px",
                        }}
                      >
                        <Heart size={11} color={C.red} />
                        <span
                          style={{
                            fontSize: 11,
                            color: C.red,
                            fontWeight: 700,
                          }}
                        >
                          {RARITY_HP[myCharRarity] ?? 75}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          background: "#22c55e18",
                          borderRadius: 6,
                          padding: "3px 8px",
                        }}
                      >
                        <Layers size={11} color="#22c55e" />
                        <span
                          style={{
                            fontSize: 11,
                            color: "#22c55e",
                            fontWeight: 700,
                          }}
                        >
                          {ko ? "덱 10장" : ja ? "デッキ10枚" : "10 Cards"}
                        </span>
                      </div>
                      {(() => {
                        const rt = myRogueArchetype;
                        const tColor =
                          rt === "energy"
                            ? "#38bdf8"
                            : rt === "attack"
                              ? "#ef4444"
                              : "#3b82f6";
                        const tIcon =
                          rt === "energy" ? (
                            <Swords size={11} />
                          ) : rt === "attack" ? (
                            <Swords size={11} />
                          ) : (
                            <Shield size={11} />
                          );
                        const tLabel =
                          rt === "energy"
                            ? ko
                              ? "에너지형"
                              : ja
                                ? "エナジー型"
                                : "Energy"
                            : rt === "attack"
                              ? ko
                                ? "공격형"
                                : ja
                                  ? "アタック型"
                                  : "Attack"
                              : ko
                                ? "방어형"
                                : ja
                                  ? "ディフェンス型"
                                  : "Defense";
                        const tBonus =
                          rt === "energy"
                            ? ko
                              ? "+1에너지"
                              : ja
                                ? "+1エナジー"
                                : "+1 Energy"
                            : rt === "attack"
                              ? ko
                                ? "전투마다 힘+1"
                                : ja
                                  ? "戦闘ごと力+1"
                                  : "Str+1/battle"
                              : ko
                                ? "방어도 영구 유지"
                                : ja
                                  ? "防御永続"
                                  : "Shield persists";
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              background: `${tColor}18`,
                              borderRadius: 6,
                              padding: "3px 8px",
                            }}
                          >
                            <span style={{ color: tColor, display: "flex" }}>
                              {tIcon}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: tColor,
                                fontWeight: 700,
                              }}
                            >
                              {tLabel} {tBonus}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Sprite on the right — hover shows starter cards */}
                  <div
                    style={{
                      flexShrink: 0,
                      cursor: "help",
                      position: "relative",
                    }}
                    onMouseEnter={() => setShowStarterCards(true)}
                  >
                    <div
                      style={{
                        animation: "rogue-float 3s ease-in-out infinite",
                      }}
                    >
                      <PixelSprite
                        type={myChar.type}
                        colors={myChar.colors}
                        characterId={myChar.id}
                        rarity={myCharRarity}
                        size={72}
                      />
                    </div>
                    <p
                      style={{
                        margin: "3px 0 0",
                        textAlign: "center" as const,
                        fontSize: 9,
                        color: C.textDim,
                      }}
                    >
                      {ko ? "카드 확인" : ja ? "カード確認" : "Cards"}
                    </p>
                  </div>
                  {showStarterCards && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 20,
                        background: C.panelDark,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: 10,
                        width: 200,
                        boxShadow: "0 8px 24px #000a",
                        animation: "rogue-in 0.15s ease-out both",
                        overflowY: "auto",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 6px",
                          fontSize: 10,
                          fontWeight: 800,
                          color: C.textBright,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Layers size={10} color={ac} />
                        {ko
                          ? "전용 스타터 카드"
                          : ja
                            ? "専用スターターカード"
                            : "Unique Starter Cards"}
                      </p>
                      {uniqueCards.map((card) => (
                        <div
                          key={card.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            marginBottom: 5,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: "#0a0a0a",
                              background: cardTypeColor(card.type),
                              borderRadius: 3,
                              padding: "1px 4px",
                              flexShrink: 0,
                              lineHeight: 1.6,
                            }}
                          >
                            {cardTypeName(card.type)}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.textBright,
                                lineHeight: 1.2,
                              }}
                            >
                              [{card.cost}]{" "}
                              {ko
                                ? card.name
                                : ja
                                  ? card.nameJa
                                  : card.nameEn}
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 9,
                                color: C.textDim,
                                lineHeight: 1.3,
                              }}
                            >
                              {ko
                                ? card.desc
                                : ja
                                  ? card.descJa
                                  : card.descEn}
                            </p>
                          </div>
                        </div>
                      ))}
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: 9,
                          color: C.textDim,
                          borderTop: `1px solid ${C.border}`,
                          paddingTop: 4,
                        }}
                      >
                        {ko
                          ? "공통: 스트라이크×4, 방어×3"
                          : ja
                            ? "共通: ストライク×4, ディフェンス×3"
                            : "Common: Strike×4, Defend×3"}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Difficulty selector */}
            <div
              style={{
                background: C.panelDark,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 16,
                animation: "rogue-in 0.4s 0.08s ease-out both",
              }}
            >
              <p
                style={{
                  margin: "0 0 10px",
                  color: C.textBright,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {ko ? "난이도 선택" : ja ? "難易度選択" : "Difficulty"}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    [
                      "normal",
                      ko ? "노말" : ja ? "ノーマル" : "Normal",
                      ko
                        ? "7스테이지 · 입문"
                        : ja
                          ? "7ステージ・入門"
                          : "7 stages · Beginner",
                      "#22c55e",
                      7,
                    ],
                    [
                      "hard",
                      ko ? "하드" : ja ? "ハード" : "Hard",
                      ko
                        ? "10스테이지 · 고급"
                        : ja
                          ? "10ステージ・上級"
                          : "10 stages · Advanced",
                      "#f59e0b",
                      10,
                    ],
                    [
                      "hell",
                      ko ? "지옥" : ja ? "ヘル" : "Hell",
                      ko
                        ? "15스테이지 · 극한"
                        : ja
                          ? "15ステージ・極限"
                          : "15 stages · Extreme",
                      "#ef4444",
                      15,
                    ],
                  ] as [Difficulty, string, string, string, number][]
                ).map(([d, label, desc, col, stages]) => {
                  const active = difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        padding: "10px 6px",
                        background: active ? `${col}22` : "transparent",
                        border: `2px solid ${active ? col : C.border}`,
                        cursor: "pointer",
                        fontFamily: FONT,
                        textAlign: "center" as const,
                        boxShadow: active ? `0 0 12px ${col}44` : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 2px",
                          fontSize: 13,
                          fontWeight: 900,
                          color: active ? col : C.textDim,
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          margin: "0 0 4px",
                          fontSize: 9,
                          color: active ? col : C.textDim,
                          fontWeight: 600,
                        }}
                      >
                        {stages}
                        {ko ? "스테이지" : ja ? "ステージ" : " stages"}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 9,
                          color: C.textDim,
                          lineHeight: 1.3,
                        }}
                      >
                        {desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Run guide shortcuts */}
            <div
              style={{
                background: C.panelDark,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
                animation: "rogue-in 0.4s 0.09s ease-out both",
              }}
            >
              {(() => {
                const storyDifficulty: "normal" | "hard" | "hell" =
                  difficulty === "hard" || difficulty === "hell" ? difficulty : "normal";
                const meta = {
                  normal: {
                    color: "#22c55e",
                    stages: 7,
                    repeat: { kp: 5000, stones: 4 },
                  },
                  hard: {
                    color: "#f59e0b",
                    stages: 10,
                    repeat: { kp: 7500, stones: 5 },
                  },
                  hell: {
                    color: "#ef4444",
                    stages: 15,
                    repeat: { kp: 10000, stones: 6 },
                  },
                }[storyDifficulty];
                const fightGold = DIFF_GOLD_FIGHT[storyDifficulty];
                const eliteGold = DIFF_GOLD_ELITE[storyDifficulty];
                const info = [
                  {
                    label: ko ? "층수" : ja ? "階層" : "Stages",
                    value: `${meta.stages}`,
                  },
                  {
                    label: ko ? "일반전" : ja ? "通常戦" : "Fight",
                    value: `${fightGold}G`,
                  },
                  {
                    label: ko ? "엘리트" : ja ? "エリート" : "Elite",
                    value: `${eliteGold}G`,
                  },
                  {
                    label: ko ? "반복 보상" : ja ? "反復報酬" : "Repeat",
                    value: `${meta.repeat.kp.toLocaleString()}KP · ${meta.repeat.stones}`,
                  },
                ];
                return (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
                      {info.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            background: "#00000018",
                            padding: "7px 6px",
                            minWidth: 0,
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 9, color: C.textDim, fontWeight: 700 }}>{item.label}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: meta.color, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 6, marginTop: 8 }}>
                      {[
                        { label: ko ? "보상판" : ja ? "報酬表" : "Rewards", onClick: () => { setGuideDiff(storyDifficulty); setShowRewardGuide(true); }, icon: <Trophy size={13} /> },
                        { label: ko ? "카드 도감" : ja ? "カード図鑑" : "Cards", onClick: () => setShowCardGuide(true), icon: <BookOpen size={13} /> },
                        { label: ko ? "기물 도감" : ja ? "遺物図鑑" : "Relics", onClick: () => setShowRelicGuide(true), icon: <Sparkles size={13} /> },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          onClick={btn.onClick}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            background: C.panel,
                            color: C.textBright,
                            padding: "8px 4px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            fontFamily: FONT,
                          }}
                        >
                          {btn.icon}
                          <span>{btn.label}</span>
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 10, color: C.textDim, lineHeight: 1.4 }}>
                      {ko
                        ? "시작/완료 제출은 서버에 기록되며, 비정상적으로 빠른 완료는 보상 검증에서 제외됩니다."
                        : ja
                          ? "開始/完了はサーバーに記録され、異常に速い完了は報酬検証で除外されます。"
                          : "Run start/completion is recorded on the server; abnormally fast clears are excluded from reward validation."}
                    </p>
                  </>
                );
              })()}
            </div>

            {/* Start button */}
            <button
              onClick={() => startRun("story")}
              style={{
                width: "100%",
                background: `linear-gradient(135deg,${C.gold}cc,${C.gold}88)`,
                border: `2px solid ${C.gold}`,
                borderRadius: 10,
                padding: "15px 0",
                color: "#1c1500",
                fontWeight: 900,
                fontSize: 17,
                cursor: "pointer",
                fontFamily: FONT,
                letterSpacing: "0.05em",
                animation: "rogue-in 0.4s 0.1s ease-out both",
              }}
            >
              {ko ? "탐험 시작!" : ja ? "探検開始！" : "Start Expedition!"}
            </button>

            {/* 도전 모드 */}
            <div
              style={{
                background: C.panelDark,
                border: "1px solid #7c3aed55",
                borderRadius: 10,
                padding: "12px 14px",
                animation: "rogue-in 0.4s 0.13s ease-out both",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* 좌: 타이틀 + 설명 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <Crown size={14} color="#a855f7" />
                    <span
                      style={{
                        color: "#c084fc",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {ko ? "도전 모드" : ja ? "チャレンジモード" : "Challenge"}
                    </span>
                    {sessionChallengeBest > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: C.textDim,
                          marginLeft: "auto",
                        }}
                      >
                        {ko ? "최고" : ja ? "最高" : "Best"}{" "}
                        <b style={{ color: "#c084fc" }}>{sessionChallengeBest}</b>
                        {ko ? "스테이지" : ja ? "ステージ" : "st."}
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: C.textDim,
                      lineHeight: 1.5,
                    }}
                  >
                    {ko ? (
                      <>
                        점점 강해지는 적과 싸우며 100스테이지에 도전!
                        <br />
                        사망 시 즉시 종료.
                      </>
                    ) : ja ? (
                      <>
                        強化し続ける敵と戦い、100ステージに挑戦！
                        <br />
                        死亡で即終了。
                      </>
                    ) : (
                      <>
                        Fight ever-stronger foes up to Stage 100.
                        <br />
                        Death ends the run.
                      </>
                    )}
                  </p>
                </div>
                {/* 우: 도전 시작 버튼 */}
                <button
                  onClick={() => startRun("challenge")}
                  style={{
                    flexShrink: 0,
                    background: "linear-gradient(135deg,#7c3aedcc,#a855f7aa)",
                    border: "2px solid #a855f7",
                    borderRadius: 10,
                    padding: "10px 16px",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: FONT,
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {ko ? "도전 시작!" : ja ? "挑戦開始！" : "Challenge!"}
                </button>
              </div>
              {challengeRanks.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    borderTop: `1px solid ${C.border}`,
                    paddingTop: 8,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.textBright,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Trophy size={12} color={C.gold} />
                    {ko ? "역대 랭킹" : ja ? "ランキング" : "Rankings"}
                  </p>
                  {challengeRanks.slice(0, 5).map((r) => (
                    <div
                      key={r.userId}
                      onClick={() => navigate(`/profile/${r.userId}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "2px 0",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: 18,
                          textAlign: "right",
                          fontWeight: 800,
                          color: r.rank <= 3 ? "#fbbf24" : C.textDim,
                        }}
                      >
                        {r.rank}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          color: C.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.nickname}
                      </span>
                      <span style={{ color: "#c084fc", fontWeight: 700 }}>
                        {r.best}
                        {ko ? "스테이지" : ja ? "ステージ" : " stages"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 기물 도감 모달 ── */}
        {showRelicGuide && (() => {
          const GRADE_TABS: Array<{ key: RelicGrade | "all"; label: string; color: string }> = [
            { key: "all",    label: ko ? "전체" : ja ? "全部" : "All",      color: C.text },
            { key: "common", label: ko ? "커먼" : ja ? "コモン" : "Common",  color: "#64748b" },
            { key: "rare",   label: ko ? "레어" : ja ? "レア" : "Rare",      color: "#2563eb" },
            { key: "unique", label: ko ? "유니크" : ja ? "ユニーク" : "Unique", color: "#a855f7" },
            { key: "boss",   label: ko ? "저주" : ja ? "呪い" : "Cursed",    color: "#ef4444" },
          ];
          const visibleRelics = relicGuideGrade === "all"
            ? RELICS
            : RELICS.filter((r) => r.grade === relicGuideGrade);
          return (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 999, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setShowRelicGuide(false)}
            >
              <div
                className="rogue-reward-guide"
                style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, width: "min(520px,96vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", fontFamily: FONT, animation: "rogue-in 0.22s ease-out both" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 0" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.gold, display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={16} color={C.gold} />
                    {ko ? "기물 도감" : ja ? "遺物図鑑" : "Relic Encyclopedia"}
                  </p>
                  <button onClick={() => setShowRelicGuide(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 20, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
                {/* 등급 탭 */}
                <div className="rogue-guide-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 18px 0", flexShrink: 0 }}>
                  {GRADE_TABS.map((g) => {
                    const cnt = g.key === "all" ? RELICS.length : RELICS.filter((r) => r.grade === g.key).length;
                    const active = relicGuideGrade === g.key;
                    return (
                      <button key={g.key} onClick={() => setRelicGuideGrade(g.key)}
                        style={{ flexShrink: 0, border: `1px solid ${active ? g.color : C.border}`, background: active ? `${g.color}22` : "transparent", color: active ? g.color : C.textDim, borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 4 }}
                      >
                        {g.label}
                        <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 600 }}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>
                {/* 구분선 */}
                <div style={{ height: 1, background: C.border, margin: "10px 0 0" }} />
                {/* 기물 목록 */}
                <div className="rogue-guide-scroll" style={{ overflowY: "auto", padding: "12px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {relicGuideGrade === "boss" && (
                    <p style={{ margin: "0 0 4px", fontSize: 10, color: C.textDim, background: "#ef444412", border: "1px solid #ef444430", borderRadius: 6, padding: "5px 8px" }}>
                      {ko ? "별도 슬롯 1개 · 보스 처치 후 제공 · 획득 선택 가능" : ja ? "専用スロット×1・ボス撃破後提供・取得は任意" : "Separate slot ×1 · Offered after boss · Optional to acquire"}
                    </p>
                  )}
                  {visibleRelics.map((r) => <RelicCard key={r.id} relic={r} ko={ko} ja={ja} />)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 보상 안내 모달 ── */}
        {showRewardGuide &&
          (() => {
            const GUIDE_TABS = [
              {
                id: "normal" as const,
                label: ko ? "노말" : ja ? "ノーマル" : "Normal",
                color: "#22c55e",
              },
              {
                id: "hard" as const,
                label: ko ? "하드" : ja ? "ハード" : "Hard",
                color: "#f97316",
              },
              {
                id: "hell" as const,
                label: ko ? "지옥" : ja ? "ヘル" : "Hell",
                color: "#ef4444",
              },
            ] as const;
            const NORMAL_MS = [
              { c: 1, pts: 500, st: 0, ne: 1, be: 0, ge: 0 },
              { c: 3, pts: 1000, st: 1, ne: 1, be: 0, ge: 0 },
              { c: 5, pts: 1500, st: 1, ne: 1, be: 0, ge: 0 },
              { c: 10, pts: 2000, st: 1, ne: 0, be: 1, ge: 0 },
              { c: 20, pts: 3000, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 30, pts: 3500, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 40, pts: 4000, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 50, pts: 4500, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 75, pts: 5000, st: 3, ne: 0, be: 0, ge: 1 },
              { c: 100, pts: 5000, st: 3, ne: 0, be: 0, ge: 1 },
              { c: 125, pts: 5500, st: 3, ne: 0, be: 0, ge: 1 },
              { c: 150, pts: 5000, st: 3, ne: 0, be: 0, ge: 1 },
            ];
            const HARD_MS = [
              { c: 1, pts: 800, st: 0, ne: 1, be: 0, ge: 0 },
              { c: 3, pts: 1500, st: 1, ne: 1, be: 0, ge: 0 },
              { c: 5, pts: 2000, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 10, pts: 3000, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 20, pts: 4500, st: 3, ne: 0, be: 1, ge: 0 },
              { c: 30, pts: 5000, st: 3, ne: 0, be: 1, ge: 0 },
              { c: 40, pts: 6000, st: 3, ne: 0, be: 0, ge: 1 },
              { c: 50, pts: 6500, st: 3, ne: 0, be: 0, ge: 1 },
              { c: 75, pts: 7500, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 100, pts: 7500, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 125, pts: 8000, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 150, pts: 7500, st: 4, ne: 0, be: 0, ge: 1 },
            ];
            const HELL_MS = [
              { c: 1, pts: 1000, st: 0, ne: 1, be: 0, ge: 0 },
              { c: 3, pts: 2000, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 5, pts: 3000, st: 2, ne: 0, be: 1, ge: 0 },
              { c: 10, pts: 4000, st: 3, ne: 0, be: 1, ge: 0 },
              { c: 20, pts: 6000, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 30, pts: 7000, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 40, pts: 8000, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 50, pts: 9000, st: 4, ne: 0, be: 0, ge: 1 },
              { c: 75, pts: 10000, st: 5, ne: 0, be: 0, ge: 1 },
              { c: 100, pts: 10000, st: 5, ne: 0, be: 0, ge: 1 },
              { c: 125, pts: 11000, st: 5, ne: 0, be: 0, ge: 1 },
              { c: 150, pts: 10000, st: 5, ne: 0, be: 0, ge: 1 },
            ];
            const msMap = { normal: NORMAL_MS, hard: HARD_MS, hell: HELL_MS };
            const repeatMap = {
              normal: { pts: 5000, st: 4 },
              hard: { pts: 7500, st: 5 },
              hell: { pts: 10000, st: 6 },
            };
            const tab = GUIDE_TABS.find((t) => t.id === guideDiff)!;
            const ms = msMap[guideDiff];
            const rep = repeatMap[guideDiff];
            return (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 999,
                  background: "#000a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setShowRewardGuide(false)}
              >
                <div
                  className="rogue-reward-guide"
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    padding: 20,
                    width: "min(480px,94vw)",
                    maxHeight: "85vh",
                    overflowY: "auto",
                    fontFamily: FONT,
                    animation: "rogue-in 0.22s ease-out both",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: C.gold,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Award size={16} color={C.gold} />
                      {ko ? "보상 안내" : ja ? "報酬案内" : "Reward Guide"}
                    </p>
                    <button
                      onClick={() => setShowRewardGuide(false)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: C.textDim,
                        fontSize: 18,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* ── 일반 모드 ── */}
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Star size={12} color="#22c55e" />
                    {ko
                      ? "일반 모드 누적 클리어 보상"
                      : ja
                        ? "通常モード累計クリア報酬"
                        : "Normal Mode Milestone Rewards"}
                  </p>

                  {/* 난이도 탭 */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {GUIDE_TABS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setGuideDiff(t.id)}
                        style={{
                          flex: 1,
                          padding: "5px 0",
                          border: `1px solid ${guideDiff === t.id ? t.color : C.border}`,
                          borderRadius: 7,
                          background:
                            guideDiff === t.id ? `${t.color}22` : "transparent",
                          color: guideDiff === t.id ? t.color : C.textDim,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: FONT,
                          transition: "all 0.15s",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      marginBottom: 16,
                    }}
                  >
                    {ms.map((m) => (
                      <div
                        key={m.c}
                        style={{
                          background: `${tab.color}08`,
                          border: `1px solid ${tab.color}33`,
                          borderRadius: 8,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: tab.color,
                            minWidth: 44,
                          }}
                        >
                          {ko ? `${m.c}회` : ja ? `${m.c}回` : `×${m.c}`}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                            flexWrap: "wrap" as const,
                            flex: 1,
                          }}
                        >
                          {m.pts > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.gold,
                                background: `${C.gold}18`,
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {m.pts.toLocaleString()}KP
                            </span>
                          )}
                          {m.st > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#60a5fa",
                                background: "#60a5fa18",
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "강화석" : ja ? "強化石" : "Stone"} ×{m.st}
                            </span>
                          )}
                          {m.ne > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#94a3b8",
                                background: "#94a3b818",
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "일반알" : ja ? "通常卵" : "Normal Egg"} ×
                              {m.ne}
                            </span>
                          )}
                          {m.be > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#4ade80",
                                background: "#4ade8018",
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "고급알" : ja ? "上級卵" : "Prem.Egg"} ×
                              {m.be}
                            </span>
                          )}
                          {m.ge > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.gold,
                                background: `${C.gold}18`,
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "황금알" : ja ? "黄金卵" : "Gold Egg"} ×
                              {m.ge}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 10,
                        color: C.textDim,
                      }}
                    >
                      {ko
                        ? `※ 150회 이후 매 50회마다 ${rep.pts.toLocaleString()}KP + 강화석×${rep.st} + 황금알×1`
                        : ja
                          ? `※ 150回以降、50回ごとに${rep.pts.toLocaleString()}KP+強化石×${rep.st}+黄金卵×1`
                          : `※ After 150: every 50 clears → ${rep.pts.toLocaleString()}KP + Stone×${rep.st} + Gold Egg×1`}
                    </p>
                  </div>

                  {/* ── 도전 모드 ── */}
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#c084fc",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Crown size={12} color="#c084fc" />
                    {ko
                      ? "도전 모드 신기록 달성 보상"
                      : ja
                        ? "チャレンジモード新記録報酬"
                        : "Challenge Mode Best Record Rewards"}
                  </p>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {(
                      [
                        { c: 5, pts: 500, st: 0, ne: 1, be: 0, ge: 0 },
                        { c: 10, pts: 1000, st: 1, ne: 1, be: 0, ge: 0 },
                        { c: 20, pts: 1800, st: 1, ne: 0, be: 1, ge: 0 },
                        { c: 30, pts: 2600, st: 2, ne: 0, be: 1, ge: 0 },
                        { c: 50, pts: 4000, st: 3, ne: 0, be: 1, ge: 0 },
                        { c: 75, pts: 5500, st: 4, ne: 0, be: 0, ge: 1 },
                        { c: 100, pts: 9000, st: 6, ne: 0, be: 0, ge: 2 },
                      ] as {
                        c: number;
                        pts: number;
                        st: number;
                        ne: number;
                        be: number;
                        ge: number;
                      }[]
                    ).map((m) => (
                      <div
                        key={m.c}
                        style={{
                          background: "#140a20",
                          border: "1px solid #a855f733",
                          borderRadius: 8,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#c084fc",
                            minWidth: 52,
                          }}
                        >
                          {ko
                            ? `${m.c}스테이지`
                            : ja
                              ? `${m.c}ステージ`
                              : `Stage ${m.c}`}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            gap: 5,
                            flexWrap: "wrap" as const,
                            flex: 1,
                          }}
                        >
                          {m.pts > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.gold,
                                background: `${C.gold}18`,
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {m.pts.toLocaleString()}KP
                            </span>
                          )}
                          {m.st > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#60a5fa",
                                background: "#60a5fa18",
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "강화석" : ja ? "強化石" : "Stone"} ×{m.st}
                            </span>
                          )}
                          {m.ne > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#94a3b8",
                                background: "#94a3b818",
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "일반알" : ja ? "通常卵" : "Normal Egg"} ×
                              {m.ne}
                            </span>
                          )}
                          {m.be > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#4ade80",
                                background: "#4ade8018",
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "고급알" : ja ? "上級卵" : "Prem.Egg"} ×
                              {m.be}
                            </span>
                          )}
                          {m.ge > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.gold,
                                background: `${C.gold}18`,
                                borderRadius: 4,
                                padding: "2px 6px",
                              }}
                            >
                              {ko ? "황금알" : ja ? "黄金卵" : "Gold Egg"} ×
                              {m.ge}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 10,
                        color: C.textDim,
                      }}
                    >
                      {ko
                        ? "※ 신기록 갱신 시에만 지급됩니다"
                        : ja
                          ? "※ 自己記録更新時のみ支給されます"
                          : "※ Paid only when you break your personal best"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* ── 카드 도감 모달 ── */}
        {showCardGuide && (() => {
          const CARD_RARITY_ORDER: CardRarity[] = ["common", "uncommon", "rare", "epic", "legendary"];
          const CARD_RARITY_COLOR: Record<string, string> = {
            common: "#64748b", uncommon: "#16a34a", rare: "#2563eb", epic: "#9333ea", legendary: "#d97706",
          };
          const CARD_RARITY_LABEL = (r: string) =>
            r === "common" ? (ko ? "커먼" : ja ? "コモン" : "Common")
            : r === "uncommon" ? (ko ? "언커먼" : ja ? "アンコモン" : "Uncommon")
            : r === "rare" ? (ko ? "레어" : ja ? "レア" : "Rare")
            : r === "epic" ? (ko ? "에픽" : ja ? "エピック" : "Epic")
            : (ko ? "레전드" : ja ? "レジェンド" : "Legendary");
          const CARD_TYPE_COLOR: Record<string, string> = {
            attack: "#ef4444", skill: "#3b82f6", power: "#f59e0b",
          };
          const CARD_TYPE_LABEL = (t: string) =>
            t === "attack" ? (ko ? "공격" : ja ? "攻撃" : "Atk")
            : t === "skill" ? (ko ? "스킬" : ja ? "スキル" : "Skill")
            : (ko ? "파워" : ja ? "パワー" : "Pwr");
          const ARCH_TABS = [
            { key: "",        label: ko ? "전체" : ja ? "全部" : "All",        color: C.text },
            { key: "all",     label: ko ? "공용" : ja ? "汎用" : "Universal",  color: "#f59e0b" },
            { key: "warrior", label: ko ? "전사" : ja ? "戦士" : "Warrior",    color: "#f97316" },
            { key: "rogue",   label: ko ? "로그" : ja ? "ローグ" : "Rogue",    color: "#c084fc" },
            { key: "mage",    label: ko ? "마법사" : ja ? "魔法使い" : "Mage", color: "#60a5fa" },
            { key: "tank",    label: ko ? "탱커" : ja ? "タンク" : "Tank",     color: "#94a3b8" },
            { key: "nature",  label: ko ? "자연" : ja ? "自然" : "Nature",     color: "#4ade80" },
            { key: "meka",    label: ko ? "메카" : ja ? "メカ" : "Meka",       color: "#2dd4bf" },
            { key: "cursed",  label: ko ? "저주술사" : ja ? "呪術師" : "Cursed", color: "#7c3aed" },
          ];
          const filtered = (cardGuideArch === ""
            ? CARDS
            : CARDS.filter((c) => c.archetype === cardGuideArch)
          ).slice().sort((a, b) =>
            CARD_RARITY_ORDER.indexOf(a.rarity) - CARD_RARITY_ORDER.indexOf(b.rarity)
          );
          return (
            <div
              style={{ position: "fixed", inset: 0, zIndex: 999, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={() => setShowCardGuide(false)}
            >
              <div
                className="rogue-reward-guide"
                style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, width: "min(540px,96vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", fontFamily: FONT, animation: "rogue-in 0.22s ease-out both" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 0" }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.gold, display: "flex", alignItems: "center", gap: 6 }}>
                    <BookOpen size={16} color={C.gold} />
                    {ko ? "카드 도감" : ja ? "カード図鑑" : "Card Encyclopedia"}
                  </p>
                  <button onClick={() => setShowCardGuide(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textDim, fontSize: 20, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
                {/* 아키타입 탭 — 2줄 wrap */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "10px 18px 0", flexShrink: 0 }}>
                  {ARCH_TABS.map((a) => {
                    const cnt = a.key === "" ? CARDS.length : CARDS.filter((c) => c.archetype === a.key).length;
                    const active = cardGuideArch === a.key;
                    return (
                      <button key={a.key} onClick={() => setCardGuideArch(a.key)}
                        style={{ flexShrink: 0, border: `1px solid ${active ? a.color : C.border}`, background: active ? `${a.color}22` : "transparent", color: active ? a.color : C.textDim, borderRadius: 20, padding: "4px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 4 }}
                      >
                        {a.label}
                        <span style={{ fontSize: 9, opacity: 0.65, fontWeight: 600 }}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>
                {/* 구분선 + 카운트 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px 0" }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 10, color: C.textDim, flexShrink: 0 }}>
                    {filtered.length}{ko ? "장" : ja ? "枚" : " cards"}
                  </span>
                </div>
                {/* 카드 목록 */}
                <div className="rogue-guide-scroll" style={{ overflowY: "auto", padding: "8px 18px 18px", display: "flex", flexDirection: "column", gap: 5 }}>
                  {filtered.map((c) => {
                    const rc = CARD_RARITY_COLOR[c.rarity];
                    const tc = CARD_TYPE_COLOR[c.type];
                    const archColor = ARCH_TABS.find((a) => a.key === c.archetype)?.color ?? C.textDim;
                    return (
                      <div key={c.id} style={{ display: "flex", gap: 10, padding: "9px 10px", borderRadius: 9, background: `${rc}0d`, borderLeft: `3px solid ${rc}`, border: `1px solid ${rc}22`, borderLeftWidth: 3 }}>
                        {/* 코스트 */}
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.panelDark, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#94a3b8", flexShrink: 0, marginTop: 1 }}>
                          {c.cost}
                        </div>
                        {/* 내용 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" as const }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: C.text, marginRight: "auto" }}>
                              {ko ? c.name : ja ? c.nameJa : c.nameEn}
                            </span>
                            {cardGuideArch === "" && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: archColor, background: `${archColor}18`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                                {ARCH_TABS.find((a) => a.key === c.archetype)?.label ?? c.archetype}
                              </span>
                            )}
                            <span style={{ fontSize: 9, fontWeight: 800, color: rc, background: `${rc}20`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                              {CARD_RARITY_LABEL(c.rarity)}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: tc, background: `${tc}18`, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                              {CARD_TYPE_LABEL(c.type)}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: C.textDim, lineHeight: 1.45 }}>
                            {ko ? c.desc : ja ? c.descJa : c.descEn}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 규칙 모달 ── */}
        {showRulesModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "#000a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setShowRulesModal(false)}
          >
            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 20,
                width: "min(680px,95vw)",
                maxHeight: "90vh",
                overflowY: "auto",
                fontFamily: FONT,
                animation: "rogue-in 0.22s ease-out both",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: C.gold,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Info size={16} color={C.gold} />
                  {ko ? "규칙" : ja ? "ルール" : "Rules"}
                </p>
                <button
                  onClick={() => setShowRulesModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.textDim,
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(
                  [
                    {
                      icon: <Layers size={14} color="#c084fc" />,
                      title: ko ? "덱 & 카드" : ja ? "デッキ & カード" : "Deck & Cards",
                      desc: ko
                        ? "매 전투 후 카드 3장 중 1장을 선택해 덱에 추가합니다. 덱이 강해질수록 더 먼 스테이지에 도달할 수 있습니다."
                        : ja
                          ? "毎戦闘後、カード3枚から1枚を選んでデッキに追加。デッキが強くなるほど先のステージへ進めます。"
                          : "After each battle, pick 1 of 3 cards to add to your deck. A stronger deck carries you further.",
                    },
                    {
                      icon: <Flame size={14} color="#f97316" />,
                      title: ko ? "에너지" : ja ? "エナジー" : "Energy",
                      desc: ko
                        ? "매 턴 에너지 3으로 시작합니다. 카드마다 소비량이 다르며, 남은 에너지는 다음 턴으로 이월되지 않습니다."
                        : ja
                          ? "毎ターン3エナジーから開始。カードごとにコストが異なり、余ったエナジーは次ターンに持ち越せません。"
                          : "Each turn starts with 3 energy. Cards have individual costs — unused energy does not carry over.",
                    },
                    {
                      icon: <Shield size={14} color="#60a5fa" />,
                      title: ko ? "방어력 (아머)" : ja ? "防御力（アーマー）" : "Armor",
                      desc: ko
                        ? "방어력은 피해를 받아도 줄어들지 않으며, 초과분만 HP가 감소합니다. (예: 방어력 5, 공격 8 → HP -3) 방어형 캐릭터는 전투가 끝나도 방어력이 유지됩니다."
                        : ja
                          ? "防御力はダメージを受けても減らず、超過分のみHPが減少します。（例: 防御5, 攻撃8 → HP-3）防御型キャラは戦闘後も防御力が維持されます。"
                          : "Armor doesn't decrease when hit — only damage exceeding armor reduces HP. (e.g. 5 armor vs 8 atk → -3 HP) Defense-type characters keep armor between battles.",
                    },
                    {
                      icon: <Heart size={14} color="#f87171" />,
                      title: "HP",
                      desc: ko
                        ? "HP가 0이 되면 탐험이 종료됩니다. 휴식 노드나 일부 카드·기물·포션으로 HP를 회복할 수 있습니다."
                        : ja
                          ? "HPが0になると探検終了。休憩ノードや一部のカード・遺物・ポーションでHPを回復できます。"
                          : "Reaching 0 HP ends the run. Restore HP at rest nodes or via cards, relics, or potions.",
                    },
                    {
                      icon: <FlaskConical size={14} color="#60a5fa" />,
                      title: ko ? "포션 슬롯" : ja ? "ポーションスロット" : "Potions",
                      desc: ko
                        ? "상점에서 구매한 엘릭서·해독제는 포션 슬롯(최대 3)에 보관됩니다. 전투 중 버튼을 눌러 즉시 사용할 수 있습니다. 해독제는 모든 상태이상을 즉시 해제합니다."
                        : ja
                          ? "商店で購入したエリクサー・解毒剤はポーションスロット（最大3）に保管されます。戦闘中ボタンを押して即使用できます。解毒剤は全状態異常を即座に解除します。"
                          : "Elixirs and Antidotes from the shop are stored in potion slots (max 3). Use mid-battle with a tap. Antidote instantly clears all status effects.",
                    },
                    {
                      icon: <Skull size={14} color="#f97316" />,
                      title: ko ? "상태이상" : ja ? "状態異常" : "Status Effects",
                      desc: ko
                        ? "독·출혈·화상·저주는 방어력 무시 트루 데미지로 2턴간 유지됩니다. 독 1스택=1, 출혈=×2, 화상=×3, 저주=×4 피해. 공포: 1턴 공격 불가. 속박: 1턴 행동 불가. 감전: 1턴 공격력 절반. 저주 스택 있으면 다른 상태이상 피해 1.5배."
                        : ja
                          ? "毒・出血・火傷・呪いは防御無視のトゥルーダメージで2ターン持続します。毒1スタック=1, 出血=×2, 火傷=×3, 呪い=×4ダメージ。恐怖:1ターン攻撃不可。束縛:1ターン行動不可。感電:1ターン攻撃半減。呪いスタックがあると他状態異常1.5倍。"
                          : "Poison/Bleed/Burn/Curse deal true damage (ignores armor) and last 2 turns per stack. Poison=×1, Bleed=×2, Burn=×3, Curse=×4. Fear: skip attack 1t. Bind: skip actions 1t. Shock: half attack 1t. Curse stacks amplify other DoT ×1.5.",
                    },
                    {
                      icon: <Star size={14} color={C.gold} />,
                      title: ko ? "골드 & 상점" : ja ? "ゴールド & 商店" : "Gold & Shop",
                      desc: ko
                        ? "전투마다 골드를 획득합니다. 상점에서 카드·엘릭서·스탯 결정·기물 등을 구매할 수 있습니다."
                        : ja
                          ? "戦闘ごとにゴールドを獲得。商店でカード・エリクサー・ステータス結晶・遺物などを購入できます。"
                          : "Earn gold from battles. Buy cards, elixirs, stat crystals, and relics at the shop.",
                    },
                    {
                      icon: <Sparkles size={14} color="#a78bfa" />,
                      title: ko ? "기물" : ja ? "遺物" : "Relics",
                      desc: ko
                        ? "기물을 획득하면 탐험 내내 지속되는 특수 효과가 적용됩니다. 보스 처치 시 저주 기물 3개 중 1개를 선택할 수 있습니다 (별도 슬롯, 선택 포기 가능). 저주 기물은 강력한 이득과 함께 패널티가 따릅니다."
                        : ja
                          ? "遺物を入手すると探検中ずっと続く特殊効果が発動します。ボス撃破時に呪い遺物3個から1つ選択できます（別スロット、スキップ可）。呪い遺物は強力な恩恵と引き換えにデメリットがあります。"
                          : "Relics grant persistent effects. After beating a boss, choose 1 of 3 cursed relics (separate slot, skippable). Cursed relics come with strong bonuses — and notable drawbacks.",
                    },
                    {
                      icon: <Crown size={14} color="#ef4444" />,
                      title: ko ? "도전 모드 & 무한 모드" : ja ? "チャレンジ & 無限モード" : "Challenge & Infinite Mode",
                      desc: ko
                        ? "도전 모드는 100층 클리어를 목표로 합니다. 100층 완주 후 무한 모드로 진입할 수 있습니다. 무한 모드는 매 스테이지 보스만 등장하며 5스테이지마다 상점이 열립니다. 더 멀리 갈수록 랭킹이 높아집니다."
                        : ja
                          ? "チャレンジモードは100層クリアが目標です。完走後に無限モードへ移行できます。無限モードは毎ステージボスのみ登場し5ステージごとに商店が開きます。遠くまで進むほどランキングが上がります。"
                          : "Challenge mode aims for 100 floors. After clearing, enter Infinite Mode: boss every stage, shop every 5 stages. Go further for a higher ranking.",
                    },
                  ] as { icon: React.ReactNode; title: string; desc: string }[]
                ).map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      background: C.panelDark,
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                    <div>
                      <p
                        style={{
                          margin: "0 0 3px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: C.textBright,
                          fontFamily: FONT,
                        }}
                      >
                        {item.title}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: C.textDim,
                          lineHeight: 1.6,
                          fontFamily: FONT,
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // gs가 non-null로 좁혀진 이후부터 쓰는 공용 모달 props — 단계별 화면(맵/전투/상점 등)에서
  // <DeckModal/>과 <GlobalModals/>를 반복 렌더링할 때 매번 새로 나열하지 않도록 한 번만 구성
  const deckModalProps = { gs, deckOpen, setDeckOpen, C, FONT, ko, ja, lang };
  const globalModalsProps = {
    gs,
    C,
    FONT,
    ko,
    ja,
    lang,
    relicOpen,
    setRelicOpen,
    pendingRelicOffer,
    pendingRelicSwap,
    pendingCardSwap,
    confirmQuit,
    setConfirmQuit,
    handlePickRelic,
    handleSkipRelic,
    handleRelicSwap,
    handleRelicSwapSkip,
    handleCardSwap,
    handleCardSwapSkip,
    abandonRun,
  };
  const milestoneListExtraProps = { C, ko, ja };
  const cardSwapModalProps = {
    pendingCardSwap,
    gs,
    C,
    FONT,
    ko,
    ja,
    lang,
    handleCardSwap,
    handleCardSwapSkip,
  };

  // ════════════════════════════════════════════════════════════
  // MAP
  // ════════════════════════════════════════════════════════════
  // ── Challenge mode: 일직선 진행 화면 ──
  if (gs.phase === "map" && gs.mode === "challenge") {
    const nextFloor = gs.floor + 1;
    const cleared = gs.floor + 1;
    const isInfiniteMap = gs.infiniteMode;
    const options: NodeType[] = isInfiniteMap && nextFloor >= CHALLENGE_FLOORS
      ? infiniteFloorOptions(nextFloor)
      : (gs.mapLayout[nextFloor]?.options ?? (["fight"] as NodeType[]));
    const cfg = DIFF_GOLD_FIGHT.challenge,
      ceg = DIFF_GOLD_ELITE.challenge;
    const ntMeta: Record<string, [string, string]> = {
      fight: [ko ? "전투" : ja ? "戦闘" : "Fight", "#ef4444"],
      elite: [ko ? "엘리트" : ja ? "エリート" : "Elite", "#f97316"],
      boss: [ko ? "보스" : ja ? "ボス" : "Boss", "#ec4899"],
      rest: [ko ? "휴식" : ja ? "休憩" : "Rest", "#60a5fa"],
      shop: [ko ? "상점" : ja ? "商店" : "Shop", "#22c55e"],
      treasure: [ko ? "보물" : ja ? "宝物" : "Treasure", "#f59e0b"],
    };
    const ntDesc: Record<string, string> = {
      fight: ko ? `${cfg}G + 카드` : ja ? `${cfg}G+カード` : `${cfg}G + card`,
      elite: ko ? `${ceg}G + 카드` : ja ? `${ceg}G+カード` : `${ceg}G + card`,
      boss: ko ? "최종 보스" : ja ? "最終ボス" : "Final Boss",
      rest: ko ? "HP 30% 회복" : ja ? "HP30%回復" : "Heal 30%",
      shop: ko ? "카드 구매" : ja ? "購入" : "Buy cards",
      treasure: ko ? "카드 선택" : ja ? "カード選択" : "Pick a card",
    };
    return (
      <div
        style={{
          minHeight: "calc(100dvh - 96px)",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          padding: "14px 16px",
          gap: 14,
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <style>{css}</style>
        {/* header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Crown size={18} color={isInfiniteMap ? "#ef4444" : "#a855f7"} />
            <span style={{ color: isInfiniteMap ? "#fca5a5" : "#c084fc", fontWeight: 800, fontSize: 15 }}>
              {isInfiniteMap
                ? (ko ? "무한 모드" : ja ? "無限モード" : "Infinite Mode")
                : (ko ? "도전 모드" : ja ? "チャレンジ" : "Challenge")}
            </span>
          </div>
          <button
            onClick={() => setConfirmQuit(true)}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "5px 10px",
              color: C.textDim,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {ko ? "포기" : ja ? "放棄" : "Abandon"}
          </button>
        </div>

        {/* progress */}
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: "6px 0 2px", fontSize: 13, color: C.textDim }}>
            {ko ? "클리어" : ja ? "クリア" : "Cleared"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 44,
              fontWeight: 900,
              color: isInfiniteMap ? "#fca5a5" : "#c084fc",
              lineHeight: 1,
            }}
          >
            {cleared}
            {!isInfiniteMap && (
              <span style={{ fontSize: 20, color: C.textDim }}> / {CHALLENGE_FLOORS}</span>
            )}
            {isInfiniteMap && (
              <span style={{ fontSize: 18, color: "#ef4444", marginLeft: 6 }}>∞</span>
            )}
          </p>
          {!isInfiniteMap && (
            <div
              style={{
                height: 8,
                background: C.panelDark,
                borderRadius: 6,
                overflow: "hidden",
                margin: "12px 0 0",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(cleared / CHALLENGE_FLOORS) * 100}%`,
                  background: "linear-gradient(90deg,#7c3aed,#c084fc)",
                  borderRadius: 6,
                  transition: "width 0.3s",
                }}
              />
            </div>
          )}
        </div>

        {/* HP */}
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                color: C.textDim,
              }}
            >
              <Heart size={13} color={C.red} />
              HP
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
              {gs.playerHp}/{gs.playerMaxHp}
            </span>
          </div>
          <HpBar hp={gs.playerHp} max={gs.playerMaxHp} />
        </div>

        {/* 선택지 (랜덤 2갈래) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: C.textDim,
              textAlign: "center",
            }}
          >
            {ko ? "다음 길을 선택" : ja ? "次の道を選択" : "Choose your path"} ·{" "}
            {isInfiniteMap
              ? (ko ? `무한 ${nextFloor - CHALLENGE_FLOORS + 1}스테이지` : ja ? `無限${nextFloor - CHALLENGE_FLOORS + 1}ステージ` : `Infinite Stage ${nextFloor - CHALLENGE_FLOORS + 1}`)
              : `${ko ? "스테이지" : ja ? "ステージ" : "Stage"} ${nextFloor + 1}`}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {options.map((opt, idx) => {
              const [label, color] = ntMeta[opt] ?? ntMeta.fight;
              return (
                <button
                  key={idx}
                  onClick={() => enterNode(nextFloor, opt)}
                  style={{
                    flex: 1,
                    maxWidth: 200,
                    border: `2px solid ${color}`,
                    background: `${color}18`,
                    borderRadius: 14,
                    padding: "20px 12px",
                    textAlign: "center",
                    cursor: "pointer",
                    fontFamily: FONT,
                    transition: "transform 0.12s",
                    boxShadow: `0 0 12px ${color}33`,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 5px",
                      fontSize: 18,
                      fontWeight: 900,
                      color,
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: C.textDim }}>
                    {ntDesc[opt] ?? ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* deck + relic buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setDeckOpen(true)}
            style={{
              flex: 1,
              background: C.panelDark,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "11px 0",
              color: C.textDim,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {ko
              ? `덱 (${gs.deck.length})`
              : ja
                ? `デッキ(${gs.deck.length})`
                : `Deck (${gs.deck.length})`}
          </button>
          <button
            onClick={() => setRelicOpen(true)}
            style={{
              background: "#a855f718",
              border: "1px solid #a855f744",
              borderRadius: 10,
              padding: "11px 14px",
              color: "#a855f7",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={14} />
            {gs.relics.length}
          </button>
        </div>
        <DeckModal {...deckModalProps} />
        <GlobalModals {...globalModalsProps} />
      </div>
    );
  }

  if (gs.phase === "map") {
    const nodeLabel: Record<NodeType, [string, string]> = {
      fight: [ko ? "전투" : ja ? "戦闘" : "Fight", "#ef4444"],
      elite: [ko ? "엘리트" : ja ? "エリート" : "Elite", "#f97316"],
      treasure: [ko ? "보물" : ja ? "宝物" : "Treasure", "#f59e0b"],
      shop: [ko ? "상점" : ja ? "商店" : "Shop", "#22c55e"],
      rest: [ko ? "휴식" : ja ? "休憩" : "Rest", "#60a5fa"],
      boss: [ko ? "최종 보스" : ja ? "最終ボス" : "Final Boss", "#ec4899"],
    };
    const eg = DIFF_GOLD_ELITE[gs.difficulty];
    const fg = DIFF_GOLD_FIGHT[gs.difficulty];
    const nodeDesc: Record<NodeType, string> = {
      fight: ko ? `${fg}G + 카드` : ja ? `${fg}G+カード` : `${fg}G + card`,
      elite: ko ? `${eg}G + 카드` : ja ? `${eg}G+カード` : `${eg}G + card`,
      treasure: ko ? "카드 선택" : ja ? "カード選択" : "Pick a card",
      shop: ko ? "카드 구매" : ja ? "購入" : "Buy cards",
      rest: ko ? "HP 30% 회복" : ja ? "HP30%回復" : "Heal 30% HP",
      boss: ko ? "최종 보스 처치" : ja ? "ボス撃破" : "Defeat final boss",
    };
    const nextFloor = gs.floor + 1;
    const totalFloors = gs.mapLayout.length;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          padding: "16px 16px 32px",
        }}
      >
        <style>{css}</style>
        {/* Header */}
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={18} color={C.gold} />
            <span style={{ color: C.gold, fontWeight: 800, fontSize: 15 }}>
              CARD EXPEDITION
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 4,
                background:
                  gs.difficulty === "hell"
                    ? "#ef444422"
                    : gs.difficulty === "hard"
                      ? "#f59e0b22"
                      : "#22c55e22",
                color:
                  gs.difficulty === "hell"
                    ? "#ef4444"
                    : gs.difficulty === "hard"
                      ? "#f59e0b"
                      : "#22c55e",
                border: `1px solid ${gs.difficulty === "hell" ? "#ef444444" : gs.difficulty === "hard" ? "#f59e0b44" : "#22c55e44"}`,
              }}
            >
              {ko
                ? gs.difficulty === "hell"
                  ? "지옥"
                  : gs.difficulty === "hard"
                    ? "하드"
                    : "노말"
                : ja
                  ? gs.difficulty === "hell"
                    ? "ヘル"
                    : gs.difficulty === "hard"
                      ? "ハード"
                      : "ノーマル"
                  : gs.difficulty === "hell"
                    ? "Hell"
                    : gs.difficulty === "hard"
                      ? "Hard"
                      : "Normal"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "#f59e0b18",
                borderRadius: 6,
                padding: "4px 8px",
              }}
            >
              <Star size={12} color={C.gold} />
              <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>
                {gs.gold}G
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: `${C.red}18`,
                borderRadius: 6,
                padding: "4px 8px",
              }}
            >
              <Heart size={12} color={C.red} />
              <span style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>
                {gs.playerHp}/{gs.playerMaxHp}
              </span>
            </div>
            <button
              onClick={() => setDeckOpen(true)}
              style={{
                background: C.panelDark,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "4px 8px",
                color: C.textDim,
                cursor: "pointer",
                fontSize: 11,
                fontFamily: FONT,
              }}
            >
              {ko
                ? `덱(${gs.deck.length})`
                : ja
                  ? `デッキ(${gs.deck.length})`
                  : `Deck(${gs.deck.length})`}
            </button>
            <button
              onClick={() => setRelicOpen(true)}
              style={{
                background: "#a855f718",
                border: "1px solid #a855f744",
                borderRadius: 6,
                padding: "4px 8px",
                color: "#a855f7",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Sparkles size={11} />
              {gs.relics.length}
            </button>
            <button
              onClick={() => setConfirmQuit(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.textDim,
                fontSize: 11,
                fontFamily: FONT,
                padding: "4px 6px",
              }}
            >
              {ko ? "포기" : ja ? "放棄" : "Quit"}
            </button>
          </div>
        </div>

        {/* Progress + HP */}
        <div style={{ maxWidth: 520, margin: "0 auto 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>
              {ko
                ? `${nextFloor}/${totalFloors}층`
                : ja
                  ? `${nextFloor}/${totalFloors}F`
                  : `Floor ${nextFloor}/${totalFloors}`}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {gs.poison > 0 && (
                <span style={{ fontSize: 11, color: "#a855f7" }}>
                  {ko ? "독" : ja ? "毒" : "Poison"} {gs.poison}
                </span>
              )}
              {gs.strength > 0 && (
                <span style={{ fontSize: 11, color: C.gold }}>
                  {ko ? "힘" : ja ? "力" : "Str"} +{gs.strength}
                </span>
              )}
            </div>
          </div>
          <HpBar hp={gs.playerHp} max={gs.playerMaxHp} />
        </div>

        {/* Floor list */}
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {gs.mapLayout.map((mapFloor, floorIdx) => {
            const isDone = floorIdx < nextFloor;
            const isCurrent = floorIdx === nextFloor;
            const isFuture = floorIdx > nextFloor;
            const chosen = isDone ? gs.chosenPath[floorIdx] : undefined;
            return (
              <div
                key={floorIdx}
                style={{
                  animation: isCurrent
                    ? "rogue-in 0.25s ease-out both"
                    : undefined,
                }}
              >
                {/* Floor number row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: isDone
                        ? "#1e3a5f"
                        : isCurrent
                          ? "#facc15"
                          : "transparent",
                      border: `2px solid ${isDone ? "#334155" : isCurrent ? "#facc15" : C.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 900,
                      color: isDone
                        ? "#4ade80"
                        : isCurrent
                          ? "#1c1500"
                          : C.textDim,
                    }}
                  >
                    {isDone ? <Check size={8} /> : floorIdx + 1}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: isDone ? "#1e3a5f33" : C.border + "44",
                    }}
                  />
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#facc15",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {ko ? "선택" : ja ? "選択" : "Pick"}
                    </span>
                  )}
                </div>

                {/* Options row */}
                <div style={{ display: "flex", gap: 8, paddingLeft: 28 }}>
                  {mapFloor.options.map((nodeType, optIdx) => {
                    const [label, col] = nodeLabel[nodeType];
                    const isChosen = chosen === nodeType;
                    const isRejected = isDone && !isChosen;
                    return (
                      <button
                        key={optIdx}
                        disabled={!isCurrent}
                        onClick={() =>
                          isCurrent && enterNode(floorIdx, nodeType)
                        }
                        style={{
                          flex: 1,
                          background: isChosen
                            ? "#0a1a2e"
                            : isCurrent
                              ? `${col}14`
                              : C.panelDark,
                          border: `1px solid ${isChosen ? col + "66" : isCurrent ? col : C.border}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: isCurrent ? "pointer" : "default",
                          opacity: isRejected ? 0.25 : isFuture ? 0.45 : 1,
                          fontFamily: FONT,
                          textAlign: "left",
                          boxShadow: isCurrent ? `0 0 12px ${col}22` : "none",
                        }}
                      >
                        <NodeIcon type={nodeType} size={16} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              fontWeight: 800,
                              color: isRejected
                                ? "#334155"
                                : isCurrent || isChosen
                                  ? col
                                  : C.textDim,
                            }}
                          >
                            {label}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 10,
                              color: C.textDim,
                            }}
                          >
                            {nodeDesc[nodeType]}
                          </p>
                        </div>
                        {isChosen && (
                          <Check
                            size={12}
                            color="#4ade80"
                            style={{ flexShrink: 0 }}
                          />
                        )}
                        {isCurrent && (
                          <ChevronRight
                            size={14}
                            color={col}
                            style={{ flexShrink: 0 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DeckModal {...deckModalProps} />
        <GlobalModals {...globalModalsProps} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // BATTLE
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "battle" && gs.enemy) {
    const e = gs.enemy;
    const nextP = e.patterns[e.patternIdx % e.patterns.length];
    const pHpPct = gs.playerHp / gs.playerMaxHp;
    return (
      <div
        style={{
          height: "calc(100dvh - 96px)",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          padding: "8px 10px",
          gap: 6,
          maxWidth: 640,
          margin: "0 auto",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <style>{`${css} .rogue-card-hover{transition:transform 0.12s,box-shadow 0.12s}`}</style>

        {/* Battle top bar */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: `${C.red}18`,
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11,
              color: C.red,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Heart size={11} color={C.red} />
            {gs.playerHp}/{gs.playerMaxHp}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "#f59e0b18",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11,
              color: C.gold,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Star size={11} color={C.gold} />
            {gs.gold}G
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => setDeckOpen(true)}
            style={{
              background: C.panelDark,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "3px 8px",
              color: C.textDim,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: FONT,
              flexShrink: 0,
            }}
          >
            {ko
              ? `덱(${gs.deck.length})`
              : ja
                ? `デッキ(${gs.deck.length})`
                : `Deck(${gs.deck.length})`}
          </button>
          {gs.relics.length > 0 && (
            <button
              onClick={() => setRelicOpen(true)}
              style={{
                background: "#a855f718",
                border: "1px solid #a855f744",
                borderRadius: 6,
                padding: "3px 8px",
                color: "#a855f7",
                cursor: "pointer",
                fontSize: 11,
                fontFamily: FONT,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <Sparkles size={11} />
              {gs.relics.length}
            </button>
          )}
          <button
            onClick={() => setConfirmQuit(true)}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "3px 8px",
              color: C.textDim,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: FONT,
              flexShrink: 0,
            }}
          >
            {ko ? "포기" : ja ? "放棄" : "Quit"}
          </button>
        </div>

        {/* 플레이어 피격 레드 플래시 */}
        {playerHit && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: "rgba(220,0,0,0.28)",
              animation: "ut-player-flash 0.38s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        )}
        {rogueDmgNums
          .filter((n) => n.side === "player")
          .map((n) => (
            <span
              key={n.id}
              style={{
                position: "fixed",
                top: "42%",
                left: "50%",
                transform: "translateX(-50%)",
                fontWeight: 900,
                fontSize: 28,
                color: "#ff4444",
                textShadow: "0 0 12px #ff0000,0 0 6px #ff8888,1px 1px 0 #000",
                animation: "ut-dmg-pop 0.9s ease-out forwards",
                pointerEvents: "none",
                fontFamily: "monospace",
                zIndex: 60,
                whiteSpace: "nowrap",
              }}
            >
              -{n.dmg}
            </span>
          ))}

        {/* Enemy area */}
        <div style={{ position: "relative" }}>
          {cardEffect?.effectType === "attack" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 25,
                borderRadius: 12,
                overflow: "hidden",
                pointerEvents: "none",
                background: "rgba(239,68,68,0.18)",
                animation: "ut-card-panel-flash 0.55s ease-out forwards",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    animation: "ut-card-icon 0.55s ease-out forwards",
                    filter: "drop-shadow(0 0 10px rgba(239,68,68,0.95))",
                    color: "rgba(239,68,68,0.95)",
                    display: "flex",
                  }}
                >
                  <Swords size={38} />
                </div>
                {cardEffect.multiHit && cardEffect.multiHit > 1 && (
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: "#faff00",
                      fontFamily: "monospace",
                      textShadow: "0 0 8px #fff,1px 1px 0 #000",
                      animation: "ut-multihit-badge 0.55s ease-out forwards",
                    }}
                  >
                    ×{cardEffect.multiHit}
                  </span>
                )}
              </div>
            </div>
          )}
          <div
            style={{
              background: C.panelDark,
              border: `1px solid #3a0a0a`,
              borderRadius: 12,
              padding: 10,
              animation: "rogue-in 0.3s ease-out both",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    animation: enemyHit
                      ? "ut-enemy-hit 0.38s ease-out"
                      : "rogue-float 2.5s ease-in-out infinite",
                  }}
                >
                  <PixelSprite
                    type={e.charType}
                    colors={
                      CHARACTERS.find((c) => c.type === e.charType)?.colors ?? {
                        p: "#888",
                        s: "#666",
                        a: "#aaa",
                      }
                    }
                    characterId={0}
                    rarity="common"
                    size={52}
                  />
                </div>
                {rogueDmgNums
                  .filter((n) => n.side === "enemy")
                  .map((n) => (
                    <span
                      key={n.id}
                      style={{
                        position: "absolute",
                        top: -10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontWeight: 900,
                        fontSize: 22,
                        color: "#faff00",
                        textShadow:
                          "0 0 10px #fff,0 0 5px #ffd700,1px 1px 0 #000",
                        animation: "ut-dmg-pop 0.9s ease-out forwards",
                        pointerEvents: "none",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      -{n.dmg}
                    </span>
                  ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#fca5a5",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {ko ? e.name : ja ? e.nameJa : e.nameEn}
                    {e.isBoss && <Crown size={13} color="#f59e0b" />}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "#ef4444",
                      fontWeight: 700,
                    }}
                  >
                    {e.currentHp}/{e.hp}
                  </p>
                </div>
                <HpBar hp={e.currentHp} max={e.hp} color="#ef4444" />
                {(e.poisonStacks > 0 || e.bleedStacks > 0 || e.burnStacks > 0 || e.curseStacks > 0) && (
                  <div
                    style={{
                      display: "flex",
                      gap: 5,
                      marginTop: 4,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 9, color: C.textDim, fontWeight: 600 }}>
                      {ko ? "다음 턴:" : ja ? "次ターン:" : "Next:"}
                    </span>
                    {e.poisonStacks > 0 && (
                      <span style={{ fontSize: 9, color: "#a855f7", fontWeight: 700 }}>
                        {ko ? "독" : ja ? "毒" : "Psn"} -{e.poisonStacks}
                      </span>
                    )}
                    {e.bleedStacks > 0 && (
                      <span style={{ fontSize: 9, color: "#f87171", fontWeight: 700 }}>
                        {ko ? "출혈" : ja ? "出血" : "Bld"} -{e.bleedStacks * 2}
                      </span>
                    )}
                    {e.burnStacks > 0 && (
                      <span style={{ fontSize: 9, color: "#fb923c", fontWeight: 700 }}>
                        {ko ? "화상" : ja ? "火傷" : "Brn"} -{e.burnStacks * 3}
                      </span>
                    )}
                    {e.curseStacks > 0 && (
                      <span style={{ fontSize: 9, color: "#facc15", fontWeight: 700 }}>
                        {ko ? "저주" : ja ? "呪い" : "Crs"} -{e.curseStacks * 4}
                      </span>
                    )}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {e.currentShield > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        background: "#1d4ed820",
                        border: "1px solid #1d4ed8",
                        borderRadius: 5,
                        padding: "2px 6px",
                      }}
                    >
                      <Shield size={10} color="#60a5fa" />
                      <span
                        style={{
                          fontSize: 11,
                          color: "#60a5fa",
                          fontWeight: 700,
                        }}
                      >
                        {e.currentShield}
                      </span>
                    </div>
                  )}
                  {e.currentStrength > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        background: "#b4530920",
                        border: "1px solid #b45309",
                        borderRadius: 5,
                        padding: "2px 6px",
                      }}
                    >
                      <span
                        style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}
                      >
                        {ko ? "힘" : ja ? "力" : "Str"}+{e.currentStrength}
                      </span>
                    </div>
                  )}
                  {e.poisonStacks > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        background: "#7e22ce20",
                        border: "1px solid #7e22ce",
                        borderRadius: 5,
                        padding: "2px 6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: "#a855f7",
                          fontWeight: 700,
                        }}
                      >
                        {ko ? "독" : ja ? "毒" : "Poison"} {e.poisonStacks}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>
                {ko ? "다음 행동:" : ja ? "次の行動:" : "Next Action:"}
              </span>
              <IntentBadge pattern={nextP} ko={ko} ja={ja} />
            </div>
          </div>
        </div>
        {/* /enemy wrapper */}

        {/* Battle log */}
        <div
          style={{
            background: C.panelDark,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "5px 10px" }}>
            {gs.log.slice(-2).map((l, i, arr) => (
              <p
                key={i}
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: i === arr.length - 1 ? C.text : C.textDim,
                  lineHeight: 1.45,
                }}
              >
                {l}
              </p>
            ))}
          </div>
          {gs.log.length > 0 && (
            <button
              onClick={() => setLogExpanded(true)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                borderTop: `1px solid ${C.border}22`,
                padding: "4px 12px",
                color: C.textDim,
                fontSize: 10,
                cursor: "pointer",
                fontFamily: FONT,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ChevronRight
                size={10}
                style={{ transform: "rotate(90deg)", flexShrink: 0 }}
              />
              {ko
                ? `전체 로그 (${gs.log.length}줄)`
                : ja
                  ? `全ログ(${gs.log.length}行)`
                  : `Full log (${gs.log.length} lines)`}
            </button>
          )}
        </div>

        {/* Log modal */}
        {logExpanded && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 999,
              background: "#000a",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
            onClick={() => setLogExpanded(false)}
          >
            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: "12px 12px 0 0",
                width: "100%",
                maxWidth: 640,
                maxHeight: "60vh",
                display: "flex",
                flexDirection: "column",
                fontFamily: FONT,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: C.textBright,
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {ko ? "전투 로그" : ja ? "戦闘ログ" : "Battle Log"}
                </p>
                <button
                  onClick={() => setLogExpanded(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.textDim,
                    padding: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div
                style={{
                  overflowY: "auto",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {gs.log.map((l, i) => (
                  <p
                    key={i}
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: i === gs.log.length - 1 ? C.text : C.textDim,
                      lineHeight: 1.8,
                    }}
                  >
                    {l}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Player status */}
        <div style={{ position: "relative" }}>
          {cardEffect &&
            cardEffect.effectType !== "attack" &&
            (() => {
              const cfg = {
                shield: {
                  bg: "rgba(96,165,250,0.20)",
                  icon: <Shield size={38} />,
                  glow: "rgba(96,165,250,0.95)",
                  color: "rgba(96,165,250,0.95)",
                },
                heal: {
                  bg: "rgba(74,222,128,0.22)",
                  icon: <Heart size={38} />,
                  glow: "rgba(74,222,128,0.95)",
                  color: "rgba(74,222,128,0.95)",
                },
                power: {
                  bg: "rgba(251,191,36,0.22)",
                  icon: <Star size={38} />,
                  glow: "rgba(251,191,36,0.95)",
                  color: "rgba(251,191,36,0.95)",
                },
              }[cardEffect.effectType] ?? {
                bg: "rgba(96,165,250,0.20)",
                icon: <Shield size={38} />,
                glow: "rgba(96,165,250,0.95)",
                color: "rgba(96,165,250,0.95)",
              };
              return (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 25,
                    borderRadius: 10,
                    overflow: "hidden",
                    pointerEvents: "none",
                    background: cfg.bg,
                    animation: "ut-card-panel-flash 0.55s ease-out forwards",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        animation: "ut-card-icon 0.55s ease-out forwards",
                        filter: `drop-shadow(0 0 10px ${cfg.glow})`,
                        color: cfg.color,
                        display: "flex",
                      }}
                    >
                      {cfg.icon}
                    </div>
                  </div>
                </div>
              );
            })()}
          <div
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "8px 10px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 5,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Energy */}
                <div style={{ display: "flex", gap: 3 }}>
                  {Array.from(
                    { length: Math.max(gs.maxEnergy, gs.energy) },
                    (_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: i < gs.energy ? "#f59e0b" : "#1c1500",
                          border: `2px solid ${i < gs.energy ? "#f59e0b" : "#374151"}`,
                        }}
                      />
                    ),
                  )}
                </div>
                {gs.shield > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      background: "#1d4ed820",
                      borderRadius: 5,
                      padding: "2px 6px",
                    }}
                  >
                    <Shield size={11} color="#60a5fa" />
                    <span
                      style={{
                        fontSize: 11,
                        color: "#60a5fa",
                        fontWeight: 700,
                      }}
                    >
                      {gs.shield}
                    </span>
                  </div>
                )}
                {gs.strength > 0 && (
                  <div
                    style={{
                      background: "#b4530920",
                      borderRadius: 5,
                      padding: "2px 6px",
                    }}
                  >
                    <span
                      style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}
                    >
                      {ko ? "힘" : ja ? "力" : "Str"}+{gs.strength}
                    </span>
                  </div>
                )}
                {gs.poison > 0 && (
                  <div
                    style={{
                      background: "#7e22ce20",
                      borderRadius: 5,
                      padding: "2px 6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "#a855f7",
                        fontWeight: 700,
                      }}
                    >
                      {ko ? "독" : ja ? "毒" : "Poison"} {gs.poison}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Heart size={12} color={C.red} />
                <span
                  style={{
                    fontSize: 13,
                    color:
                      pHpPct > 0.5
                        ? C.green
                        : pHpPct > 0.25
                          ? "#facc15"
                          : C.red,
                    fontWeight: 800,
                  }}
                >
                  {gs.playerHp}
                </span>
                <span style={{ fontSize: 11, color: C.textDim }}>
                  /{gs.playerMaxHp}
                </span>
              </div>
            </div>
            <HpBar hp={gs.playerHp} max={gs.playerMaxHp} />
          </div>
        </div>
        {/* /player status wrapper */}

        {/* How-to hint (모바일 절약: 한 줄) */}
        <p
          style={{
            margin: 0,
            padding: "0 2px",
            opacity: 0.4,
            fontSize: 10,
            color: C.textDim,
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ko
            ? "카드 클릭 → 사용 · 턴 종료 시 적 행동"
            : ja
              ? "カードタップ→使用 · ターン終了で敵行動"
              : "Tap card to play · End turn for enemy"}
        </p>

        {/* Potion slots */}
        {gs.potions.some((p) => p !== null) && (
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexShrink: 0 }}>
            {gs.potions.map((potionId, i) => {
              const def = potionId ? CONSUMABLE_DEFS[potionId] : null;
              const name = def ? (ko ? def.ko : ja ? def.ja : def.en) : null;
              const desc = def ? (ko ? def.desc : ja ? def.descJa : def.descEn) : null;
              const isHovered = hoveredPotionIdx === i;
              const iconColor = potionId === "antidote" ? "#4ade80" : potionId === "elixir_100" ? "#fbbf24" : potionId === "elixir_50" ? "#22d3ee" : "#60a5fa";
              return (
                <div key={i} style={{ position: "relative" }}>
                  {/* Tooltip */}
                  {isHovered && potionId && def && (
                    <div style={{
                      position: "absolute",
                      bottom: 46,
                      right: 0,
                      minWidth: 130,
                      maxWidth: 180,
                      background: "#0f172a",
                      border: `1px solid ${iconColor}`,
                      borderRadius: 8,
                      padding: "8px 10px",
                      pointerEvents: "none",
                      zIndex: 100,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    }}>
                      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: iconColor, marginBottom: 4, whiteSpace: "nowrap" }}>
                        {name}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 11, color: "#cbd5e1", lineHeight: 1.4 }}>
                        {desc}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: 10, color: "#475569", marginTop: 5 }}>
                        {ko ? "전투 중 클릭으로 사용" : ja ? "戦闘中クリックで使用" : "Click to use in battle"}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => potionId && usePotion(i)}
                    disabled={!potionId}
                    onMouseEnter={() => setHoveredPotionIdx(i)}
                    onMouseLeave={() => setHoveredPotionIdx(null)}
                    style={{
                      width: 40, height: 40,
                      background: potionId ? (isHovered ? "#1e4a7a" : "#1e3a5f") : "transparent",
                      border: `1px solid ${potionId ? (isHovered ? iconColor : "#3b82f6") : C.border}`,
                      borderRadius: 8,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      cursor: potionId ? "pointer" : "default",
                      gap: 2, padding: 0,
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                  >
                    {potionId
                      ? <FlaskConical size={18} color={iconColor} />
                      : <Circle size={14} style={{ opacity: 0.25, color: C.textDim }} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 중간 여백: 빈 공간 흡수해서 핸드+버튼을 바닥에 붙임 */}
        <div style={{ flex: 1, minHeight: 0 }} />

        {/* Hand */}
        <div
          style={{ flexShrink: 0, position: "relative", zIndex: 20, paddingTop: 14 }}
          onClickCapture={(e) => {
            if (handDragRef.current.justDragged) {
              e.stopPropagation();
              handDragRef.current.justDragged = false;
            }
          }}
        >
        <div
          ref={handScrollRef}
          className="rogue-hand"
          style={{
            overflowX: "auto",
            overflowY: "visible",
            display: "flex",
            gap: 8,
            padding: "12px 4px 4px",
            alignItems: "flex-end",
          }}
          onPointerDown={(e) => {
            if (!handScrollRef.current) return;
            handDragRef.current = { isDown: true, startX: e.clientX, scrollLeft: handScrollRef.current.scrollLeft, moved: false, justDragged: false };
            (e.currentTarget as HTMLDivElement).classList.add("dragging");
          }}
          onPointerMove={(e) => {
            if (!handDragRef.current.isDown || !handScrollRef.current) return;
            const dx = e.clientX - handDragRef.current.startX;
            if (Math.abs(dx) > 12) handDragRef.current.moved = true;
            handScrollRef.current.scrollLeft = handDragRef.current.scrollLeft - dx;
          }}
          onPointerUp={(e) => {
            handDragRef.current.justDragged = handDragRef.current.moved;
            handDragRef.current.moved = false;
            handDragRef.current.isDown = false;
            (e.currentTarget as HTMLDivElement).classList.remove("dragging");
          }}
          onPointerLeave={(e) => {
            handDragRef.current.isDown = false;
            (e.currentTarget as HTMLDivElement).classList.remove("dragging");
          }}
        >
          {gs.hand.length === 0 ? (
            <p style={{ color: C.textDim, fontSize: 13, margin: "auto" }}>
              {ko
                ? "패가 없습니다"
                : ja
                  ? "手札がありません"
                  : "No cards in hand"}
            </p>
          ) : (
            gs.hand.map((card, i) => (
              <div key={card.uid} className="rogue-card-hover" style={{ marginBottom: selIdx === i ? 10 : 0, transition: "margin-bottom 0.12s" }}>
                <CardView
                  card={card}
                  canPlay={gs.energy >= card.cost}
                  lang={lang}
                  onClick={() => {
                    if (selIdx === i) {
                      if (gs.energy >= card.cost) {
                        const effectType:
                          | "attack"
                          | "shield"
                          | "heal"
                          | "power" =
                          card.type === "power"
                            ? "power"
                            : card.heal
                              ? "heal"
                              : card.type === "skill"
                                ? "shield"
                                : "attack";
                        const id = Date.now();
                        setCardEffect({
                          effectType,
                          multiHit: card.multiHit,
                          id,
                        });
                        setTimeout(
                          () => setCardEffect((c) => (c?.id === id ? null : c)),
                          600,
                        );
                      }
                      playCard(i);
                      setSelIdx(null);
                    } else setSelIdx(i);
                  }}
                  selected={selIdx === i}
                />
              </div>
            ))
          )}
        </div>
        </div>

        {/* Bottom bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: C.textDim }}>
            {ko
              ? `덱:${gs.drawPile.length} / 버림:${gs.discardPile.length}`
              : ja
                ? `山:${gs.drawPile.length} / 捨:${gs.discardPile.length}`
                : `Draw:${gs.drawPile.length} / Discard:${gs.discardPile.length}`}
          </div>
          <div style={{ flex: 1 }} />
          {selIdx !== null && (
            <button
              onClick={() => setSelIdx(null)}
              style={{
                background: C.panelDark,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "8px 14px",
                color: C.textDim,
                cursor: "pointer",
                fontFamily: FONT,
                fontSize: 12,
              }}
            >
              {ko ? "취소" : ja ? "キャンセル" : "Cancel"}
            </button>
          )}
          <button
            onClick={endTurn}
            style={{
              background: "#1d3a1d",
              border: "2px solid #15803d",
              borderRadius: 10,
              padding: "10px 22px",
              color: "#4ade80",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {ko ? "턴 종료" : ja ? "ターン終了" : "End Turn"}
          </button>
        </div>

        {selIdx !== null && (
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: C.textDim,
              margin: 0,
              flexShrink: 0,
            }}
          >
            {ko
              ? "한 번 더 클릭해서 카드 사용"
              : ja
                ? "もう一度タップしてカード使用"
                : "Tap again to play the card"}
          </p>
        )}
        <DeckModal {...deckModalProps} />
        <GlobalModals {...globalModalsProps} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // REWARD
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "reward") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 16,
        }}
      >
        <style>{css}</style>
        <div
          style={{
            textAlign: "center",
            animation: "rogue-in 0.3s ease-out both",
          }}
        >
          <p
            style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.gold }}
          >
            {ko ? "카드 보상" : ja ? "カード報酬" : "Card Reward"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim }}>
            {ko
              ? "1장을 선택해 덱에 추가하세요"
              : ja
                ? "1枚選んでデッキに追加してください"
                : "Pick 1 card to add to your deck"}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            animation: "rogue-in 0.3s 0.05s ease-out both",
          }}
        >
          {gs.rewardCards.map((card, i) => {
            const maxCopies = card.archetype === "all" ? 3 : 2;
            const copies = gs.deck.filter((c) => c.id === card.id).length;
            const atMax = copies >= maxCopies;
            return (
              <div
                key={i}
                onClick={() => !atMax && pickReward(card)}
                style={{
                  cursor: atMax ? "not-allowed" : "pointer",
                  opacity: atMax ? 0.4 : 1,
                  animation: `rogue-in 0.3s ${0.05 + i * 0.05}s ease-out both`,
                  position: "relative",
                }}
              >
                <CardView card={card} canPlay={!atMax} lang={lang} />
                {atMax && (
                  <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontSize: 10, color: C.red, fontWeight: 700, fontFamily: FONT }}>
                    {ko ? `최대 ${maxCopies}장` : ja ? `最大${maxCopies}枚` : `Max ${maxCopies}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={skipReward}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 20px",
            color: C.textDim,
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 13,
          }}
        >
          {ko ? "건너뛰기" : ja ? "スキップ" : "Skip"}
        </button>
        <CardSwapModal {...cardSwapModalProps} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // SHOP
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "shop") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 16,
        }}
      >
        <style>{css}</style>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <ShoppingCart
              size={20}
              color={gs.shopInflated ? "#f59e0b" : "#22c55e"}
            />
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 900,
                color: gs.shopInflated ? "#f59e0b" : "#22c55e",
              }}
            >
              {gs.shopInflated ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {ko
                    ? "바가지 상점"
                    : ja
                      ? "ぼったくり商店"
                      : "Overpriced Shop"}
                  <AlertCircle size={16} />
                </span>
              ) : ko ? (
                "상점"
              ) : ja ? (
                "商店"
              ) : (
                "Shop"
              )}
            </p>
          </div>
          {gs.shopInflated && (
            <p
              style={{
                margin: "0 0 4px",
                fontSize: 12,
                color: "#fbbf24",
                fontWeight: 700,
              }}
            >
              {ko
                ? "상인이 가격을 올려놨다... 모든 가격 +50%"
                : ja
                  ? "商人が値段を上げた…全価格+50%"
                  : "The merchant jacked up prices... all items +50%"}
            </p>
          )}
          <p
            style={{ margin: 0, fontSize: 13, color: C.gold, fontWeight: 700 }}
          >
            {ko
              ? `보유 골드: ${gs.gold}G`
              : ja
                ? `所持ゴールド: ${gs.gold}G`
                : `Gold: ${gs.gold}G`}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {gs.shopItems.map((item, i) => {
            const isElixir = item.kind === "consumable" && item.consumableId?.startsWith("elixir");
            const isAntidote = item.kind === "consumable" && item.consumableId === "antidote";
            const potionsFull = (isElixir || isAntidote) && gs.potions.every((p) => p !== null);
            const relicsFull = item.kind === "relic" && gs.relics.length >= 5;
            const canAfford = !item.bought && gs.gold >= item.price && !potionsFull;
            const btnStyle: React.CSSProperties = {
              background: item.bought ? "#1a2030" : canAfford ? "#14532d" : "#1a2030",
              border: `1px solid ${item.bought ? "#334155" : canAfford ? "#15803d" : "#334155"}`,
              borderRadius: 6,
              padding: "6px 16px",
              color: item.bought ? "#334155" : canAfford ? "#4ade80" : "#64748b",
              cursor: item.bought || gs.gold < item.price || potionsFull ? "not-allowed" : "pointer",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 13,
            };
            const btnLabel = item.bought
              ? ko ? "구매완료" : ja ? "購入済" : "Purchased"
              : potionsFull
                ? ko ? "슬롯 가득" : ja ? "スロット満" : "Slots Full"
                : relicsFull
                  ? ko ? "교체" : ja ? "入替" : "Swap"
                  : ko ? `${item.price}G로 구매` : ja ? `${item.price}Gで購入` : `Buy ${item.price}G`;

            if (item.kind === "card" && item.card) {
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ opacity: item.bought ? 0.4 : 1 }}>
                    <CardView card={item.card} canPlay={canAfford} lang={lang} />
                  </div>
                  <button disabled={item.bought || gs.gold < item.price} onClick={() => buyItem(i)} style={btnStyle}>
                    {btnLabel}
                  </button>
                </div>
              );
            }

            if (item.kind === "consumable" && item.consumableId) {
              const def = CONSUMABLE_DEFS[item.consumableId];
              const name = ko ? def.ko : ja ? def.ja : def.en;
              const desc = ko ? def.desc : ja ? def.descJa : def.descEn;
              const potionVariant =
                item.consumableId === "elixir_30" ? "blue"
                : item.consumableId === "elixir_50" ? "cyan"
                : item.consumableId === "elixir_100" ? "gold"
                : item.consumableId === "antidote" ? "green"
                : undefined;
              const crystalVariant =
                item.consumableId === "stat_str" ? "red"
                : item.consumableId === "stat_def" ? "green"
                : item.consumableId === "stat_maxhp" ? "pink"
                : undefined;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    opacity: item.bought ? 0.4 : 1,
                    width: 90, height: 130,
                    background: "#1a2030", border: "1px solid #334155", borderRadius: 8,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 6, padding: "8px 6px",
                    overflow: "hidden",
                  }}>
                    {potionVariant
                      ? <PixelPotionIcon size={38} variant={potionVariant} />
                      : crystalVariant
                        ? <PixelCrystalIcon size={34} variant={crystalVariant} />
                        : null}
                    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "#e2e8f0", textAlign: "center", lineHeight: 1.2 }}>{name}</div>
                    <div style={{ fontFamily: FONT, fontSize: 10, color: "#94a3b8", textAlign: "center", lineHeight: 1.2 }}>{desc}</div>
                  </div>
                  <button disabled={item.bought || gs.gold < item.price} onClick={() => buyItem(i)} style={btnStyle}>
                    {btnLabel}
                  </button>
                </div>
              );
            }

            if (item.kind === "relic" && item.relic) {
              const relic = item.relic;
              const relicName = ko ? relic.name : ja ? (relic.nameJa ?? relic.name) : (relic.nameEn ?? relic.name);
              const relicDesc = ko ? relic.desc : ja ? (relic.descJa ?? relic.desc) : (relic.descEn ?? relic.desc);
              const relicBorder = relic.grade === "unique" ? "#f59e0b" : relic.grade === "rare" ? "#7c3aed" : "#475569";
              const relicBg = relic.grade === "unique" ? "#1c1500" : relic.grade === "rare" ? "#1a1a2e" : "#161e2e";
              const relicTextColor = relic.grade === "unique" ? "#fde68a" : relic.grade === "rare" ? "#c4b5fd" : "#94a3b8";
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    opacity: item.bought ? 0.4 : 1,
                    width: 90, height: 130,
                    background: relicBg, border: `1px solid ${relicBorder}`, borderRadius: 8,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 6, padding: "8px 6px",
                    overflow: "hidden",
                  }}>
                    <PixelRelicShopIcon size={34} grade={relic.grade} />
                    <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: relicTextColor, textAlign: "center", lineHeight: 1.2 }}>{relicName}</div>
                    <div style={{ fontFamily: FONT, fontSize: 10, color: "#94a3b8", textAlign: "center", lineHeight: 1.2 }}>{relicDesc}</div>
                  </div>
                  <button disabled={item.bought || gs.gold < item.price} onClick={() => buyItem(i)} style={btnStyle}>
                    {btnLabel}
                  </button>
                </div>
              );
            }

            return null;
          })}
        </div>
        <button
          onClick={leaveShop}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "8px 24px",
            color: C.textDim,
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 13,
          }}
        >
          {ko ? "상점 나가기" : ja ? "商店を出る" : "Leave Shop"}
        </button>
        <CardSwapModal {...cardSwapModalProps} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // REST
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "rest") {
    const healAmt = Math.floor(gs.playerMaxHp * (gs.cursedRest ? 0.1 : 0.3));
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 20,
        }}
      >
        <style>{css}</style>
        <Flame
          size={48}
          color={gs.cursedRest ? "#a855f7" : "#60a5fa"}
          style={{ animation: "rogue-float 2s ease-in-out infinite" }}
        />
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              color: gs.cursedRest ? "#a855f7" : "#60a5fa",
            }}
          >
            {gs.cursedRest
              ? ko
                ? "저주받은 모닥불"
                : ja
                  ? "呪われた焚き火"
                  : "Cursed Campfire"
              : ko
                ? "모닥불"
                : ja
                  ? "焚き火"
                  : "Campfire"}
          </p>
          {gs.cursedRest && (
            <p
              style={{
                margin: "4px 0",
                fontSize: 12,
                color: "#c084fc",
                fontWeight: 700,
              }}
            >
              {ko
                ? "불길한 기운... 회복량이 크게 감소했다"
                : ja
                  ? "不吉な気配…回復量が大幅に減少した"
                  : "An ominous aura... healing is greatly reduced"}
            </p>
          )}
          <p style={{ margin: "4px 0", fontSize: 13, color: C.textDim }}>
            {ko
              ? `현재 HP: ${gs.playerHp} / ${gs.playerMaxHp}`
              : ja
                ? `現在HP: ${gs.playerHp} / ${gs.playerMaxHp}`
                : `HP: ${gs.playerHp} / ${gs.playerMaxHp}`}
          </p>
        </div>
        <button
          onClick={doRest}
          style={{
            background: gs.cursedRest ? "#1a0830" : "#082030",
            border: `2px solid ${gs.cursedRest ? "#a855f7" : "#60a5fa"}`,
            borderRadius: 10,
            padding: "12px 28px",
            color: gs.cursedRest ? "#a855f7" : "#60a5fa",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          {ko
            ? `HP ${healAmt} 회복하기 (${gs.cursedRest ? 10 : 30}%)`
            : ja
              ? `HP ${healAmt} 回復する（${gs.cursedRest ? 10 : 30}%）`
              : `Rest — Heal ${healAmt} HP (${gs.cursedRest ? 10 : 30}%)`}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // GAME OVER
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "gameover") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 20,
        }}
      >
        <style>{css}</style>
        <Skull
          size={64}
          color={C.red}
          style={{ animation: "rogue-in 0.5s ease-out both" }}
        />
        <div
          style={{
            textAlign: "center",
            animation: "rogue-in 0.4s 0.1s ease-out both",
          }}
        >
          {gs.mode === "challenge" ? (
            <>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.red }}>
                {gs.infiniteMode
                  ? (ko ? "무한 모드 종료" : ja ? "無限モード終了" : "Infinite Mode Over")
                  : (ko ? "도전 종료" : ja ? "挑戦終了" : "Challenge Over")}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 900, color: gs.infiniteMode ? "#fca5a5" : "#c084fc" }}>
                {gs.infiniteMode
                  ? (ko
                      ? `무한 ${gs.floor - CHALLENGE_FLOORS + 1}스테이지 도달 (총 ${gs.floor}층)`
                      : ja
                        ? `無限${gs.floor - CHALLENGE_FLOORS + 1}ステージ到達（計${gs.floor}層）`
                        : `Reached Infinite Stage ${gs.floor - CHALLENGE_FLOORS + 1} (Floor ${gs.floor})`)
                  : (<>{ko ? `${gs.floor}스테이지 도달` : ja ? `${gs.floor}ステージ到達` : `Reached Stage ${gs.floor}`}{" "}<span style={{ color: C.textDim, fontWeight: 700 }}>/ {CHALLENGE_FLOORS}</span></>)
                }
              </p>
              {challengeResult?.isNewRecord && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    fontWeight: 800,
                    color: C.gold,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Award size={14} color={C.gold} />
                  {ko ? "신기록 달성!" : ja ? "新記録達成！" : "New Record!"}
                </p>
              )}
              <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim }}>
                {ko
                  ? `역대 최고: ${Math.max(sessionChallengeBest, challengeResult?.challengeBest ?? 0)}층`
                  : ja
                    ? `最高: ${Math.max(sessionChallengeBest, challengeResult?.challengeBest ?? 0)}層`
                    : `Best: Floor ${Math.max(sessionChallengeBest, challengeResult?.challengeBest ?? 0)}`}
              </p>
            </>
          ) : (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: 26,
                  fontWeight: 900,
                  color: C.red,
                }}
              >
                {ko ? "탐험 실패" : ja ? "探検失敗" : "Expedition Failed"}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textDim }}>
                {ko
                  ? `${gs.floor + 1}번째 방에서 쓰러졌습니다`
                  : ja
                    ? `${gs.floor + 1}部屋目で倒れました`
                    : `Fell on floor ${gs.floor + 1}`}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textDim }}>
                {ko
                  ? `덱: ${gs.deck.length}장`
                  : ja
                    ? `デッキ: ${gs.deck.length}枚`
                    : `Deck: ${gs.deck.length} cards`}
              </p>
            </>
          )}
        </div>
        {gs.mode === "challenge" &&
          (challengeResult?.milestones.length ?? 0) > 0 && (
            <MilestoneList
              milestones={challengeResult!.milestones}
              labelOf={(n) =>
                ko
                  ? `${n}스테이지 돌파 보상!`
                  : ja
                    ? `${n}ステージ突破報酬！`
                    : `Stage ${n} Reward!`
              }
              {...milestoneListExtraProps}
            />
          )}
        <div
          style={{
            display: "flex",
            gap: 10,
            animation: "rogue-in 0.4s 0.2s ease-out both",
          }}
        >
          <button
            onClick={() => startRun(gs.mode)}
            style={{
              background: "#1c0a0a",
              border: `2px solid ${C.red}`,
              borderRadius: 10,
              padding: "12px 24px",
              color: C.red,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={16} />
              {ko ? "다시 도전" : ja ? "再挑戦" : "Try Again"}
            </div>
          </button>
          <button
            onClick={() => setConfirmQuit(true)}
            style={{
              background: C.panelDark,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "12px 24px",
              color: C.textDim,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {ko ? "처음으로" : ja ? "トップへ" : "Home"}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // VICTORY
  // ════════════════════════════════════════════════════════════
  if (gs.phase === "victory") {
    const totalClears = parseInt(
      localStorage.getItem("kebo_rogue_clears") ?? "0",
      10,
    );
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          fontFamily: FONT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          gap: 16,
        }}
      >
        <style>{css}</style>
        <Trophy
          size={72}
          color={C.gold}
          style={{ animation: "rogue-float 2s ease-in-out infinite" }}
        />
        <div
          style={{
            textAlign: "center",
            animation: "rogue-in 0.4s ease-out both",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              color: C.gold,
              letterSpacing: "0.08em",
            }}
          >
            {gs.mode === "challenge"
              ? ko ? "100스테이지 완주!" : ja ? "100ステージ完走！" : "100 Stages Cleared!"
              : ko ? "탐험 성공!" : ja ? "探検成功！" : "Expedition Clear!"}
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8 }}>
            <Skull size={16} color="#4ade80" />
            <p style={{ margin: 0, fontSize: 14, color: "#4ade80" }}>
              {gs.mode === "challenge"
                ? ko ? "도전 모드를 완전 정복했습니다!" : ja ? "チャレンジを完全制覇！" : "You conquered the Challenge!"
                : ko ? "카오스 드래곤을 처치했습니다" : ja ? "カオスドラゴンを撃破しました" : "You defeated the Chaos Dragon"}
            </p>
          </div>
          {gs.mode === "challenge" && (
            <div
              style={{
                marginTop: 20,
                background: "#1a0a0a",
                border: "2px solid #ef4444",
                borderRadius: 14,
                padding: "18px 24px",
                animation: "rogue-in 0.5s 0.3s ease-out both",
                opacity: 0,
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 900, color: "#ef4444", textAlign: "center" }}>
                <><Trophy size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />{ko ? "무한 모드 도전" : ja ? "無限モードへ挑む" : "Enter Infinite Mode"}</>
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "#fca5a5", textAlign: "center" }}>
                {ko
                  ? "101스테이지부터 무한히 계속됩니다. 매 스테이지 보스만 등장하며 랭킹에 기록됩니다."
                  : ja
                    ? "101ステージから無限に続きます。毎ステージボスのみ登場し、ランキングに記録されます。"
                    : "From stage 101, boss only, endless. Your floor is recorded for ranking."}
              </p>
              <button
                onClick={enterInfiniteMode}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg,#7f1d1d,#ef4444cc)",
                  border: "2px solid #ef4444",
                  borderRadius: 10,
                  padding: "12px 0",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                {ko ? "무한 모드 입장" : ja ? "無限モードへ入場" : "Enter Infinite Mode"}
              </button>
            </div>
          )}
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textDim }}>
            {ko
              ? `HP ${gs.playerHp} / ${gs.playerMaxHp} · 덱 ${gs.deck.length}장`
              : ja
                ? `HP ${gs.playerHp} / ${gs.playerMaxHp} · デッキ${gs.deck.length}枚`
                : `HP ${gs.playerHp} / ${gs.playerMaxHp} · Deck ${gs.deck.length} cards`}
          </p>
          {gs.mode !== "challenge" && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.textDim }}>
              {ko
                ? `누적 클리어: ${totalClears}회`
                : ja
                  ? `累計クリア: ${totalClears}回`
                  : `Total Clears: ${totalClears}`}
            </p>
          )}
        </div>

        {/* 마일스톤 보상 */}
        {gs.mode === "challenge"
          ? (challengeResult?.milestones.length ?? 0) > 0 && (
              <MilestoneList
                milestones={challengeResult!.milestones}
                labelOf={(n) =>
                  ko
                    ? `${n}스테이지 돌파 보상!`
                    : ja
                      ? `${n}ステージ突破報酬！`
                      : `Stage ${n} Reward!`
                }
                {...milestoneListExtraProps}
              />
            )
          : rogueMilestones.length > 0 && (
              <MilestoneList
                milestones={rogueMilestones}
                labelOf={(n) =>
                  ko
                    ? `${n}회 달성 보상!`
                    : ja
                      ? `${n}回達成報酬！`
                      : `${n}-Clear Reward!`
                }
                {...milestoneListExtraProps}
              />
            )}

        <div
          style={{
            display: "flex",
            gap: 10,
            animation: "rogue-in 0.4s 0.2s ease-out both",
          }}
        >
          <button
            onClick={() => startRun(gs.mode)}
            style={{
              background: `linear-gradient(135deg,${C.gold}cc,${C.gold}88)`,
              border: `2px solid ${C.gold}`,
              borderRadius: 10,
              padding: "12px 28px",
              color: "#1c1500",
              fontWeight: 900,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={16} />
              {ko ? "다시 하기" : ja ? "もう一度" : "Play Again"}
            </div>
          </button>
          <button
            onClick={() => setConfirmQuit(true)}
            style={{
              background: C.panelDark,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "12px 24px",
              color: C.textDim,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {ko ? "메인으로" : ja ? "メインへ" : "Home"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
