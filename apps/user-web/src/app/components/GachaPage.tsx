import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useAppData, type GachaResult } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { GACHA_COST_SINGLE, GACHA_COST_TEN } from "../data/characters";
import { GachaTab, GachaCapsuleModal } from "./KebomonPage";

export default function GachaPage() {
  const { rewardSummary, performGacha } = useAppData();
  const { t } = useLang();
  const [pulling, setPulling] = useState(false);
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);

  const { missionPoints, gachaPityCount, legendaryPityCount } = rewardSummary;
  const canAffordSingle = missionPoints >= GACHA_COST_SINGLE;
  const canAffordTen = missionPoints >= GACHA_COST_TEN;

  const handlePull = async (count: 1 | 10) => {
    setPulling(true);
    try {
      const result = await performGacha(count);
      setGachaResult(result);
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
        <GachaTab
          missionPoints={missionPoints}
          gachaPityCount={gachaPityCount}
          legendaryPityCount={legendaryPityCount}
          canAffordSingle={canAffordSingle}
          canAffordTen={canAffordTen}
          pulling={pulling}
          onPull={(count) => void handlePull(count)}
          t={t}
        />
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
