import { useState } from "react";
import { History, Repeat2, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useAppData, type GachaResult } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { CHARACTERS, GACHA_COST_SINGLE, GACHA_COST_TEN, getRarityLabel } from "../data/characters";
import { GachaCapsuleModal, GachaTab } from "./KebomonPage";

type PullHistoryItem = {
  id: string;
  count: number;
  createdAt: string;
  results: GachaResult["results"];
};

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export default function GachaPage() {
  const { rewardSummary, performGacha, gachaConfig } = useAppData();
  const { t, lang } = useLang();
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [pullHistory, setPullHistory] = useState<PullHistoryItem[]>([]);

  const { missionPoints, gachaPityCount, legendaryPityCount, ownedCharacterIds } = rewardSummary;
  const canAffordSingle = missionPoints >= GACHA_COST_SINGLE;
  const canAffordTen = missionPoints >= GACHA_COST_TEN;
  const ownedSet = new Set(ownedCharacterIds ?? []);
  const missingCount = CHARACTERS.filter((character) => !ownedSet.has(character.id)).length;
  const rareRemain = Math.max(0, gachaConfig.pityRareThreshold - gachaPityCount);
  const legendaryRemain = Math.max(0, gachaConfig.pityLegendaryThreshold - legendaryPityCount);

  const handlePull = async (count: 1 | 10) => {
    setPulling(true);
    try {
      const result = await performGacha(count);
      setGachaResult(result);
      setPullHistory((prev) => [
        {
          id: `${Date.now()}-${count}`,
          count,
          createdAt: new Date().toLocaleTimeString(),
          results: result.results,
        },
        ...prev,
      ].slice(0, 6));
    } finally {
      setPulling(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">{t("kebomon.gacha_tab")}</h2>
        </div>

        <div className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                {t("gacha.pickup")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("gacha.pickup_desc")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{t("gacha.missing")}</p>
                <p className="text-sm font-black text-foreground">{missingCount}</p>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{t("gacha.rare_pity")}</p>
                <p className="text-sm font-black text-sky-400">{rareRemain}</p>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{t("gacha.legendary_pity")}</p>
                <p className="text-sm font-black text-amber-400">{legendaryRemain}</p>
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Repeat2 className="h-3.5 w-3.5 text-primary" />
            {t("gacha.duplicate_value")}
          </p>
        </div>

        <GachaTab
          missionPoints={missionPoints}
          gachaPityCount={gachaPityCount}
          legendaryPityCount={legendaryPityCount}
          canAffordSingle={canAffordSingle}
          canAffordTen={canAffordTen}
          pulling={pulling}
          onPull={(count) => void handlePull(count)}
          gachaRates={gachaConfig.gachaRates}
          pityRareThreshold={gachaConfig.pityRareThreshold}
          pityLegendaryThreshold={gachaConfig.pityLegendaryThreshold}
          t={t}
        />

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold">
            <History className="h-4 w-4 text-primary" />
            {t("gacha.history")}
          </p>
          {pullHistory.length === 0 ? (
            <p className="rounded-xl bg-muted py-6 text-center text-xs text-muted-foreground">
              {t("gacha.no_history")}
            </p>
          ) : (
            <div className="space-y-2">
              {pullHistory.map((item) => {
                const duplicates = item.results.filter((result) => result.isDuplicate).length;
                const fresh = item.results.length - duplicates;
                const best = item.results
                  .map((result) => CHARACTERS.find((character) => character.id === result.characterId))
                  .filter(Boolean)
                  .sort((a, b) => RARITY_ORDER.indexOf(b!.rarity) - RARITY_ORDER.indexOf(a!.rarity))[0];

                return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
                    <div>
                      <p className="font-bold">
                        {t("gacha.pull_count").replace("{count}", String(item.count))} · {item.createdAt}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {t("gacha.new_items")} {fresh} / {t("gacha.duplicates")} {duplicates}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-card px-2 py-1 font-bold text-amber-400">
                      <Star className="h-3 w-3" />
                      {best ? getRarityLabel(best.rarity, lang) : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {gachaResult && (
        <GachaCapsuleModal
          result={gachaResult}
          onClose={() => setGachaResult(null)}
          t={t}
        />
      )}
    </>
  );
}
