import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type MaintenanceConfig = {
  enabled: boolean;
  message: string | null;
  endsAt: string | null;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MaintenancePage() {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MaintenanceConfig>("/admin/maintenance");
      setEnabled(res.enabled);
      setMessage(res.message ?? "");
      setEndsAt(toDatetimeLocal(res.endsAt));
    } catch {
      setError(t("maintenance.error_load"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { enabled };
      if (enabled) {
        if (message) body.message = message;
        if (endsAt) body.endsAt = new Date(endsAt).toISOString();
      }
      const res = await api.patch<MaintenanceConfig>("/admin/maintenance", body);
      setEnabled(res.enabled);
      setMessage(res.message ?? "");
      setEndsAt(toDatetimeLocal(res.endsAt));
      setSavedAt(Date.now());
    } catch {
      setError(t("maintenance.error_save"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-[var(--fg-faint)]">{t("common.loading")}</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-lg font-semibold">{t("maintenance.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("maintenance.subtitle")}</p>

      {enabled && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          {t("maintenance.banner")}
        </div>
      )}

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        {t("maintenance.toggle")}
      </label>

      <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("maintenance.message_label")}</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder={t("maintenance.message_placeholder")}
        className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
      />

      <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("maintenance.ends_at_label")}</label>
      <input
        type="datetime-local"
        value={endsAt}
        onChange={(e) => setEndsAt(e.target.value)}
        className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
      />

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {savedAt && !error && <p className="mb-4 text-sm text-emerald-400">{t("gacha.saved")}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-[#b7607e] px-4 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
      >
        {saving ? t("gacha.saving") : t("common.save")}
      </button>
    </div>
  );
}
