import { useState } from "react";
import { Shield, ArrowLeft, Check } from "lucide-react";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { PixelSprite } from "./PixelCharacter";
import {
  CHARACTERS,
  RARITY_COLOR,
  RARITY_BORDER,
  getCharName,
  getRarityLabel,
} from "../data/characters";
import type { CharacterRarity } from "../data/characters";

const RARITY_BG: Record<CharacterRarity, string> = {
  common: "bg-gray-500/10",
  uncommon: "bg-green-500/10",
  rare: "bg-blue-500/10",
  epic: "bg-purple-500/10",
  legendary: "bg-amber-500/10",
  mythic: "bg-pink-500/10",
};

const RARITY_ORDER: Record<CharacterRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

type SortMode = "enhancement" | "rarity";

// ─── 강화 상수 ──────────────────────────────────────────────────────────────
const MAX_ENHANCE: Record<CharacterRarity, number> = {
  common: 3,
  uncommon: 3,
  rare: 4,
  epic: 4,
  legendary: 5,
  mythic: 6,
};
const ENHANCE_RATES = [1.0, 0.9, 0.8, 0.6, 0.4, 0.2];
const ENHANCE_EFFECTS: Record<number, string> = {
  1: "주사위 최솟값 2",
  2: "주사위 최솟값 3",
  3: "주사위 최솟값 4",
  4: "주사위 최솟값 5",
  5: "보너스 d6 주사위 추가",
  6: "보너스 주사위 → d8 업그레이드",
};
const ENHANCE_EFFECTS_JA: Record<number, string> = {
  1: "ダイス最小値2",
  2: "ダイス最小値3",
  3: "ダイス最小値4",
  4: "ダイス最小値5",
  5: "ボーナスd6ダイス追加",
  6: "ボーナスダイス→d8アップグレード",
};

// ─── 픽셀 강화석 SVG ─────────────────────────────────────────────────────────
function EnhancementStoneSVG({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      <rect x="6" y="1" width="8" height="1" fill="#1e3a8a" />
      <rect x="4" y="2" width="12" height="1" fill="#1e3a8a" />
      <rect x="3" y="3" width="14" height="1" fill="#1e3a8a" />
      <rect x="2" y="4" width="16" height="1" fill="#1e3a8a" />
      <rect x="1" y="5" width="18" height="8" fill="#1e3a8a" />
      <rect x="2" y="13" width="16" height="1" fill="#1e3a8a" />
      <rect x="3" y="14" width="14" height="1" fill="#1e3a8a" />
      <rect x="4" y="15" width="12" height="1" fill="#1e3a8a" />
      <rect x="6" y="16" width="8" height="1" fill="#1e3a8a" />
      <rect x="7" y="17" width="6" height="1" fill="#1e3a8a" />
      <rect x="6" y="2" width="8" height="1" fill="#3b82f6" />
      <rect x="4" y="3" width="12" height="1" fill="#3b82f6" />
      <rect x="3" y="4" width="14" height="1" fill="#3b82f6" />
      <rect x="2" y="5" width="16" height="7" fill="#3b82f6" />
      <rect x="3" y="12" width="14" height="1" fill="#3b82f6" />
      <rect x="4" y="13" width="12" height="1" fill="#2563eb" />
      <rect x="5" y="14" width="10" height="1" fill="#2563eb" />
      <rect x="6" y="15" width="8" height="1" fill="#2563eb" />
      <rect x="7" y="16" width="6" height="1" fill="#1d4ed8" />
      <rect x="5" y="3" width="5" height="1" fill="#93c5fd" />
      <rect x="4" y="4" width="4" height="1" fill="#93c5fd" />
      <rect x="3" y="5" width="3" height="3" fill="#93c5fd" />
      <rect x="4" y="8" width="2" height="1" fill="#bfdbfe" />
      <rect x="9" y="6" width="2" height="1" fill="#ffffff" />
      <rect x="10" y="7" width="1" height="1" fill="#ffffff" />
      <rect x="9" y="8" width="2" height="1" fill="#ffffff" />
      <rect x="8" y="7" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="7" width="1" height="1" fill="#dbeafe" />
      <rect x="7" y="17" width="6" height="1" fill="#1e3a8a" />
      <rect x="6" y="18" width="8" height="1" fill="#1e40af" />
      <rect x="7" y="19" width="6" height="1" fill="#1e3a8a" />
    </svg>
  );
}

export default function ShopPage() {
  const { rewardSummary, buyShopItem, enhanceCharacter } = useAppData();
  const { t, lang } = useLang();

  // 상점
  const [buying, setBuying] = useState(false);
  const [buyFeedback, setBuyFeedback] = useState<"success" | "fail" | null>(
    null,
  );
  const [buyQty, setBuyQty] = useState(1);

  // 강화
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhResult, setEnhResult] = useState<{
    success: boolean;
    newLevel: number;
  } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("enhancement");

  const {
    missionPoints,
    enhancementStones,
    characterEnhancements,
    ownedCharacterIds,
  } = rewardSummary;
  const ownedChars = CHARACTERS.filter((c) => ownedCharacterIds.includes(c.id));

  const sortedOwnedChars = [...ownedChars].sort((a, b) => {
    if (sortMode === "enhancement") {
      const lvlDiff =
        (characterEnhancements[b.id] ?? 0) - (characterEnhancements[a.id] ?? 0);
      if (lvlDiff !== 0) return lvlDiff;
      return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
    } else {
      const rarityDiff = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return (
        (characterEnhancements[b.id] ?? 0) - (characterEnhancements[a.id] ?? 0)
      );
    }
  });

  const selectedChar = selectedId
    ? CHARACTERS.find((c) => c.id === selectedId)
    : null;
  const currentLevel = selectedId
    ? (characterEnhancements[selectedId] ?? 0)
    : 0;
  const maxLevel = selectedChar ? MAX_ENHANCE[selectedChar.rarity] : 0;
  const isMax = currentLevel >= maxLevel;
  const nextLevel = currentLevel + 1;
  const stoneCost = nextLevel;
  const successRate = !isMax ? (ENHANCE_RATES[nextLevel - 1] ?? 0) : 0;
  const canEnhance = !isMax && enhancementStones >= stoneCost;

  const handleBuy = async () => {
    if (buying) return;
    setBuying(true);
    setBuyFeedback(null);
    try {
      await buyShopItem("enhancement_stone", buyQty);
      setBuyFeedback("success");
    } catch {
      setBuyFeedback("fail");
    } finally {
      setBuying(false);
      setTimeout(() => setBuyFeedback(null), 2000);
    }
  };

  const handleEnhance = async () => {
    if (!selectedId || enhancing || !canEnhance) return;
    setEnhancing(true);
    setEnhResult(null);
    try {
      const result = await enhanceCharacter(selectedId);
      setEnhResult({ success: result.success, newLevel: result.newLevel });
    } finally {
      setEnhancing(false);
      setTimeout(() => setEnhResult(null), 2500);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        {t("enhance.title")}
      </h1>

      {/* ── 현황 바 ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {t("shop.my_points")}
          </p>
          <p className="text-xl font-bold text-primary">
            {missionPoints.toLocaleString()} KP
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {t("shop.my_stones")}
          </p>
          <p className="text-xl font-bold text-blue-400 flex items-center justify-center gap-1">
            <span className="inline-block">
              <EnhancementStoneSVG size={20} />
            </span>
            {enhancementStones}
          </p>
        </div>
      </div>

      {/* ── 강화석 구매 ── */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("shop.title")}
          </h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
              <EnhancementStoneSVG size={44} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground">
                {t("shop.stone_name")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("shop.stone_desc")}
              </p>
              <p className="text-sm font-semibold text-amber-400 mt-1">
                {t("shop.stone_price")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0">
              {t("shop.qty_label")}
            </span>
            <div className="flex items-center gap-1">
              {[1, 5, 10, 20].map((q) => (
                <button
                  key={q}
                  onClick={() => setBuyQty(q)}
                  className={`w-10 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    buyQty === q
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {t("shop.total_cost")}{" "}
              <span className="text-amber-400 font-bold">
                {(600 * buyQty).toLocaleString()}KP
              </span>
            </span>
          </div>
          <button
            onClick={() => void handleBuy()}
            disabled={buying || missionPoints < 600 * buyQty}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold
                       disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {buying ? t("shop.buying") : t("shop.buy")}
          </button>
        </div>
        {buyFeedback && (
          <p
            className={`pb-3 text-sm text-center font-medium ${buyFeedback === "success" ? "text-green-400" : "text-red-400"}`}
          >
            {buyFeedback === "success"
              ? t("shop.buy_success")
              : t("shop.buy_fail")}
          </p>
        )}
      </section>

      {/* ── 케보몬 강화 ── */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("enhance.title")}
          </h2>
        </div>

        {/* 캐릭터 선택 그리드 */}
        {!selectedId && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("enhance.select_char")}
              </p>
              <div className="flex gap-1">
                {(["enhancement", "rarity"] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                      sortMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {mode === "enhancement"
                      ? t("enhance.sort_level")
                      : t("enhance.sort_rarity")}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {sortedOwnedChars.map((char) => {
                const lvl = characterEnhancements[char.id] ?? 0;
                const maxLvl = MAX_ENHANCE[char.rarity];
                const atMax = lvl >= maxLvl;
                return (
                  <button
                    key={char.id}
                    onClick={() => setSelectedId(char.id)}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                      ${
                        atMax
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                      }`}
                  >
                    <PixelSprite
                      type={char.type}
                      colors={char.colors}
                      characterId={char.id}
                      rarity={char.rarity}
                      size={34}
                    />
                    {lvl > 0 ? (
                      <span
                        className={`text-[10px] font-bold ${atMax ? "text-amber-400" : "text-blue-400"}`}
                      >
                        +{lvl}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40">
                        —
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 강화 패널 */}
        {selectedId && selectedChar && (
          <div className="p-4 space-y-4">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={() => {
                setSelectedId(null);
                setEnhResult(null);
              }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={15} />
              {t("common.back")}
            </button>
            {/* 캐릭터 정보 */}
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-xl ${RARITY_BG[selectedChar.rarity]} border ${RARITY_BORDER[selectedChar.rarity]} flex items-center justify-center shrink-0`}
              >
                <PixelSprite
                  type={selectedChar.type}
                  colors={selectedChar.colors}
                  characterId={selectedChar.id}
                  rarity={selectedChar.rarity}
                  size={52}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-base font-bold truncate ${RARITY_COLOR[selectedChar.rarity]}`}
                >
                  {getCharName(selectedChar, lang)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${RARITY_BG[selectedChar.rarity]} ${RARITY_COLOR[selectedChar.rarity]}`}
                  >
                    {getRarityLabel(selectedChar.rarity, lang)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    +{currentLevel} / +{maxLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* 레벨 바 */}
            <div className="flex gap-1">
              {Array.from({ length: maxLevel }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-colors ${i < currentLevel ? "bg-blue-400" : "bg-muted"}`}
                />
              ))}
            </div>

            {isMax ? (
              <p className="text-center text-amber-400 font-bold py-2">
                {t("enhance.max")}
              </p>
            ) : (
              <>
                {/* 효과 테이블 */}
                <div className="rounded-xl bg-muted/50 divide-y divide-border overflow-hidden text-xs">
                  {Array.from({ length: maxLevel }).map((_, i) => {
                    const lvl = i + 1;
                    const fx =
                      lang === "ja"
                        ? ENHANCE_EFFECTS_JA[lvl]
                        : ENHANCE_EFFECTS[lvl];
                    const done = lvl <= currentLevel;
                    const isNext = lvl === nextLevel;
                    return (
                      <div
                        key={lvl}
                        className={`flex items-center gap-2 px-3 py-2 ${done ? "opacity-40" : ""} ${isNext ? "bg-blue-500/10" : ""}`}
                      >
                        <span
                          className={`font-bold w-6 shrink-0 ${isNext ? "text-blue-400" : "text-muted-foreground"}`}
                        >
                          +{lvl}
                        </span>
                        <span
                          className={`flex-1 ${isNext ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {fx}
                        </span>
                        {done && (
                          <Check className="h-4 w-4 text-green-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 비용 + 확률 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted text-center py-3">
                    <p className="text-xs text-muted-foreground">
                      {t("enhance.cost")}
                    </p>
                    <p className="font-bold text-blue-400 text-lg mt-0.5 flex items-center justify-center gap-1">
                      <EnhancementStoneSVG size={16} />
                      {stoneCost}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted text-center py-3">
                    <p className="text-xs text-muted-foreground">
                      {t("enhance.rate")}
                    </p>
                    <p className="font-bold text-foreground text-lg mt-0.5">
                      {Math.round(successRate * 100)}%
                    </p>
                  </div>
                </div>

                {enhResult && (
                  <p
                    className={`text-center font-bold text-sm ${enhResult.success ? "text-green-400" : "text-red-400"}`}
                  >
                    {enhResult.success
                      ? t("enhance.success")
                      : t("enhance.fail")}
                  </p>
                )}

                <button
                  onClick={() => void handleEnhance()}
                  disabled={enhancing || !canEnhance}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all
                    bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enhancing
                    ? t("enhance.enhancing")
                    : enhancementStones < stoneCost
                      ? t("enhance.no_stones")
                      : t("enhance.btn")}
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
