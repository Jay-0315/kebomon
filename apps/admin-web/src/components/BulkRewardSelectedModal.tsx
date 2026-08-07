import { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import Modal from "./Modal";

export default function BulkRewardSelectedModal({
  userIds,
  onClose,
  onSaved,
}: {
  userIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) {
      setError(t("bulkRewardModal.error_amount"));
      return;
    }

    setSaving(true);
    try {
      await api.post("/admin/users/bulk-reward-selected", {
        userIds,
        missionPointsDelta: n,
        reason: reason || undefined,
      });
      onSaved();
      onClose();
    } catch {
      setError(t("bulkRewardModal.error_save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} onSubmit={handleSubmit} maxWidth="sm">
      <h2 className="mb-1 text-base font-semibold">{t("bulkRewardModal.title")}</h2>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("bulkRewardModal.target_count", { count: userIds.length })}</p>

      <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bulkRewardModal.amount_label")}</label>
      <input
        type="number"
        min={1}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
      />

      <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("rewardModal.reason_optional")}</label>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t("rewardModal.reason_placeholder")}
        className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
      />

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
    </Modal>
  );
}
