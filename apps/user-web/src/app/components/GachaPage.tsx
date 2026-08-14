import { useState } from "react";
import { History, Repeat2, ShoppingBag, Sparkles, Star } from "lucide-react";
import { useAppData, type GachaResult } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { CHARACTERS, GACHA_COST_SINGLE, GACHA_COST_TEN } from "../data/characters";
import { GachaTab, GachaCapsuleModal } from "./KebomonPage";

type PullHistoryItem = {
  id: string;
  count: number;
  createdAt: string;
  results: GachaResult["results"];
};

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
  const missingCount = CHARACTERS.filter((c) => !ownedSet.has(c.id)).length;
  const rareRemain = Math.max(0, gachaConfig.pityRareThreshold - gachaPityCount);
  const legendaryRemain = Math.max(0, gachaConfig.pityLegendaryThreshold - legendaryPityCount);
  const copy = {
    pickup: lang === "ja" ? "シーズンピックアップ" : lang === "en" ? "Season Pickup" : "시즌 픽업",
    pickupDesc:
      lang === "ja"
        ? "未所持の獲得目標と重複補償を同時に確認できます。"
        : lang === "en"
          ? "Track missing targets and duplicate value before pulling."
          : "미보유 목표와 중복 보상 가치를 뽑기 전 바로 확인합니다.",
    missing: lang === "ja" ? "未所持" : lang === "en" ? "Missing" : "미보유",
    rarePity: lang === "ja" ? "レア保証まで" : lang === "en" ? "Rare pity in" : "레어 보장까지",
    legendaryPity: lang === "ja" ? "伝説保証まで" : lang === "en" ? "Legendary pity in" : "전설 보장까지",
    history: lang === "ja" ? "ガチャ履歴" : lang === "en" ? "Pull History" : "뽑기 기록",
    noHistory: lang === "ja" ? "まだ記録がありません。" : lang === "en" ? "No pulls yet." : "아직 뽑기 기록이 없습니다.",
    duplicateValue:
      lang === "ja"
        ? "重複はKPと交配エッセンスに変換され、次の育成素材になります。"
        : lang === "en"
          ? "Duplicates convert into KP and breeding essence for progression."
          : "중복 케보몬은 KP와 교배 에센스로 전환되어 다음 성장 재료가 됩니다.",
    duplicates: lang === "ja" ? "重複" : lang === "en" ? "Duplicates" : "중복",
    newItems: lang === "ja" ? "新規" : lang === "en" ? "New" : "신규",
  };

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

  const pageTitle = t("kebomon.gacha_tab");

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">{pageTitle}</h2>
        </div>
        <div className="rounded-2xl border border-primary/25 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" />
                {copy.pickup}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {copy.pickupDesc}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{copy.missing}</p>
                <p className="text-sm font-black text-foreground">{missingCount}</p>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{copy.rarePity}</p>
                <p className="text-sm font-black text-sky-400">{rareRemain}</p>
              </div>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">{copy.legendaryPity}</p>
                <p className="text-sm font-black text-amber-400">{legendaryRemain}</p>
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            <Repeat2 className="h-3.5 w-3.5 text-primary" />
            {copy.duplicateValue}
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
            {copy.history}
          </p>
          {pullHistory.length === 0 ? (
            <p className="rounded-xl bg-muted py-6 text-center text-xs text-muted-foreground">{copy.noHistory}</p>
          ) : (
            <div className="space-y-2">
              {pullHistory.map((item) => {
                const duplicates = item.results.filter((r) => r.isDuplicate).length;
                const fresh = item.results.length - duplicates;
                const best = item.results
                  .map((r) => CHARACTERS.find((c) => c.id === r.characterId))
                  .filter(Boolean)
                  .sort((a, b) => {
                    const order = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
                    return order.indexOf(b!.rarity) - order.indexOf(a!.rarity);
                  })[0];
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-xs">
                    <div>
                      <p className="font-bold">{item.count}회 · {item.createdAt}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {copy.newItems} {fresh} / {copy.duplicates} {duplicates}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-card px-2 py-1 font-bold text-amber-400">
                      <Star className="h-3 w-3" />
                      {best ? best.rarity : "-"}
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
