import { useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

const PRESET_DAYS = [1, 3, 7, 30];

export default function SuspendUserModal({
  userId,
  userLabel,
  onClose,
  onSaved,
}: {
  userId: string;
  userLabel: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [suspendType, setSuspendType] = useState<"TEMP" | "PERMANENT">("TEMP");
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayCount = Number(days);
  const validDays = suspendType === "PERMANENT" || (dayCount > 0 && Number.isFinite(dayCount));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError(t("suspendModal.error_reason_required"));
      return;
    }
    if (!validDays) {
      setError(t("suspendModal.error_days_required"));
      return;
    }

    const body: Record<string, unknown> = { status: "SUSPENDED", reason: reason.trim() };
    if (suspendType === "TEMP") {
      body.suspendedUntil = new Date(Date.now() + dayCount * 24 * 60 * 60 * 1000).toISOString();
    }

    setSaving(true);
    try {
      await api.patch(`/admin/users/${userId}/status`, body);
      onSaved();
      onClose();
    } catch {
      setError(t("suspendModal.error_save"));
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
        <h2 className="mb-1 text-base font-semibold">{t("suspendModal.title")}</h2>
        <p className="mb-4 text-sm text-[var(--fg-faint)]">{userLabel}</p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setSuspendType("TEMP")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${
              suspendType === "TEMP"
                ? "border-[#b7607e] bg-[#b7607e]/10 text-[#b7607e]"
                : "border-[var(--border)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {t("suspendModal.temp")}
          </button>
          <button
            type="button"
            onClick={() => setSuspendType("PERMANENT")}
            className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${
              suspendType === "PERMANENT"
                ? "border-[#b7607e] bg-[#b7607e]/10 text-[#b7607e]"
                : "border-[var(--border)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            {t("userDetail.permanent")}
          </button>
        </div>

        {suspendType === "TEMP" && (
          <div className="mb-4">
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("suspendModal.days_label")}</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-24 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
              />
              <div className="flex flex-1 gap-1">
                {PRESET_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(String(d))}
                    className="flex-1 rounded border border-[var(--border)] px-1.5 py-1 text-xs hover:bg-[var(--bg-hover)]"
                  >
                    {t("suspendModal.days_suffix", { d })}
                  </button>
                ))}
              </div>
            </div>
            {validDays && (
              <p className="mt-1.5 text-xs text-[var(--fg-faint)]">
                {t("suspendModal.ends_at", {
                  date: new Date(Date.now() + dayCount * 86400000).toLocaleString("ko-KR"),
                })}
              </p>
            )}
          </div>
        )}

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("suspendModal.reason_label")}</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("suspendModal.reason_placeholder")}
          rows={3}
          className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />

        <p className="mb-4 text-xs text-[var(--fg-faint)]">
          {suspendType === "PERMANENT" ? t("suspendModal.hint_permanent") : t("suspendModal.hint_temp")}
          {t("suspendModal.hint_suffix")}
        </p>

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
            {saving ? t("suspendModal.saving") : t("users.suspend")}
          </button>
        </div>
      </form>
    </div>
  );
}
