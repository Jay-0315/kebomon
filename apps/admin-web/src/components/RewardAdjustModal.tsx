import { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

export type RewardSummary = {
  missionPoints: number;
  normalEggs: number;
  bigEggs: number;
  goldenEggs: number;
  enhancementStones: number;
} | null;

const FIELDS: { key: keyof NonNullable<RewardSummary>; labelKey: TranslationKey | null; fallback: string }[] = [
  { key: "missionPoints", labelKey: null, fallback: "KP" },
  { key: "normalEggs", labelKey: "rewardModal.field_normal_eggs", fallback: "" },
  { key: "bigEggs", labelKey: "rewardModal.field_big_eggs", fallback: "" },
  { key: "goldenEggs", labelKey: "rewardModal.field_golden_eggs", fallback: "" },
  { key: "enhancementStones", labelKey: "rewardModal.field_enhancement_stones", fallback: "" },
];

export default function RewardAdjustModal({
  userId,
  userLabel,
  current,
  onClose,
  onSaved,
}: {
  userId: string;
  userLabel: string;
  current: RewardSummary;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const body: Record<string, number | string> = {};
    for (const f of FIELDS) {
      const raw = deltas[f.key];
      const n = raw ? Number(raw) : 0;
      if (n) body[`${f.key}Delta`] = n;
    }
    if (Object.keys(body).length === 0) {
      setError(t("rewardModal.error_empty"));
      return;
    }
    if (reason) body.reason = reason;

    setSaving(true);
    try {
      await api.patch(`/admin/users/${userId}/reward`, body);
      onSaved();
      onClose();
    } catch {
      setError(t("rewardModal.error_save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
      >
        <h2 className="mb-1 text-base font-semibold">{t("users.adjust_reward")}</h2>
        <p className="mb-4 text-sm text-[var(--fg-faint)]">{userLabel}</p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs text-[var(--fg-muted)]">
                {f.labelKey ? t(f.labelKey) : f.fallback}{" "}
                <span className="text-[var(--fg-faint)]">
                  ({t("rewardModal.current_value", { value: current?.[f.key] ?? 0 })})
                </span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={deltas[f.key] ?? ""}
                onChange={(e) => setDeltas((d) => ({ ...d, [f.key]: e.target.value }))}
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
              />
            </div>
          ))}
        </div>

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("rewardModal.reason_optional")}</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("rewardModal.reason_placeholder")}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />

        <p className="mb-4 text-xs text-[var(--fg-faint)]">{t("rewardModal.hint")}</p>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
          >
            {saving ? t("rewardModal.saving") : t("rewardModal.apply")}
          </button>
        </div>
      </form>
    </div>
  );
}
