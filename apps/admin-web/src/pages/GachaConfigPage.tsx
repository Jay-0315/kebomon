import { useEffect, useState } from "react";
import { api } from "../lib/api";

type RateMap = Record<string, number>;

type GachaConfig = {
  gachaRates: RateMap;
  normalEggRates: RateMap;
  bigEggRates: RateMap;
  goldenEggRates: RateMap;
  pityRareThreshold: number;
  pityLegendaryThreshold: number;
};

const RARITY_LABEL: Record<string, string> = {
  common: "커먼",
  uncommon: "언커먼",
  rare: "레어",
  epic: "에픽",
  legendary: "레전더리",
  mythic: "신화",
};

const GACHA_KEYS = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const NORMAL_EGG_KEYS = ["common", "uncommon", "rare"];
const BIG_EGG_KEYS = ["common", "uncommon", "rare", "epic"];
const GOLDEN_EGG_KEYS = ["common", "uncommon", "rare", "epic", "legendary"];

function RateTable({
  title,
  keys,
  values,
  onChange,
}: {
  title: string;
  keys: string[];
  values: RateMap;
  onChange: (key: string, value: number) => void;
}) {
  const sum = keys.reduce((s, k) => s + (values[k] ?? 0), 0);
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className={`text-xs ${Math.abs(sum - 100) < 0.01 ? "text-[var(--fg-faint)]" : "text-amber-400"}`}>
          합계 {sum.toFixed(2)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {keys.map((k) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{RARITY_LABEL[k] ?? k}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={values[k] ?? 0}
              onChange={(e) => onChange(k, Number(e.target.value))}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GachaConfigPage() {
  const [config, setConfig] = useState<GachaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<GachaConfig>("/admin/gacha-config");
      setConfig(res);
    } catch {
      setError("설정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function updateRate(group: keyof GachaConfig, key: string, value: number) {
    setConfig((prev) => {
      if (!prev) return prev;
      return { ...prev, [group]: { ...(prev[group] as RateMap), [key]: value } };
    });
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<GachaConfig>("/admin/gacha-config", config);
      setConfig(updated);
      setSavedAt(Date.now());
    } catch {
      setError("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-[var(--fg-faint)]">불러오는 중...</p>;
  if (!config) return <p className="text-red-400">{error ?? "설정이 없습니다."}</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-semibold">가챠 확률 / 천장 설정</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">
        캐릭터 뽑기 풀(등급별 배정)은 여기서 편집할 수 없습니다 — 등급별 확률과 천장(pity) 회차만 조정합니다.
      </p>

      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs text-[var(--fg-muted)]">레어+ 확정 천장 (연속 미당첨 횟수)</label>
          <input
            type="number"
            min={1}
            value={config.pityRareThreshold}
            onChange={(e) => setConfig({ ...config, pityRareThreshold: Number(e.target.value) })}
            className="w-40 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--fg-muted)]">레전더리+ 확정 천장 (누적 회차)</label>
          <input
            type="number"
            min={1}
            value={config.pityLegendaryThreshold}
            onChange={(e) => setConfig({ ...config, pityLegendaryThreshold: Number(e.target.value) })}
            className="w-40 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4">
        <RateTable
          title="KP 가챠 확률"
          keys={GACHA_KEYS}
          values={config.gachaRates}
          onChange={(k, v) => updateRate("gachaRates", k, v)}
        />
        <RateTable
          title="일반 알 확률"
          keys={NORMAL_EGG_KEYS}
          values={config.normalEggRates}
          onChange={(k, v) => updateRate("normalEggRates", k, v)}
        />
        <RateTable
          title="왕알 확률"
          keys={BIG_EGG_KEYS}
          values={config.bigEggRates}
          onChange={(k, v) => updateRate("bigEggRates", k, v)}
        />
        <RateTable
          title="황금 알 확률"
          keys={GOLDEN_EGG_KEYS}
          values={config.goldenEggRates}
          onChange={(k, v) => updateRate("goldenEggRates", k, v)}
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {savedAt && !error && <p className="mb-4 text-sm text-emerald-400">저장되었습니다.</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-[#b7607e] px-4 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
