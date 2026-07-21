import { useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";

type TargetType = "POST" | "COMMENT" | "USER";

const REASON_KEYS = [
  "report.reason_spam",
  "report.reason_abuse",
  "report.reason_sexual",
  "report.reason_scam",
  "report.reason_etc",
] as const;

export default function ReportModal({
  targetType,
  targetId,
  onClose,
}: {
  targetType: TargetType;
  targetId: string;
  onClose: () => void;
}) {
  const { t } = useLang();
  const [reasonKey, setReasonKey] = useState("");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonKey) return;
    setSubmitting(true);
    setError(null);
    const reasonLabel = t(reasonKey as Parameters<typeof t>[0]);
    const reason = detail.trim() ? `[${reasonLabel}] ${detail.trim()}` : reasonLabel;
    try {
      await api.post("/reports", { targetType, targetId, reason });
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      const status = (err as { status?: number } | undefined)?.status;
      setError(status === 400 ? t("report.already") : t("report.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("report.title")}</h2>
          {!done && (
            <button onClick={onClose} className="rounded p-1 hover:bg-accent/30">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {done ? (
          <div className="py-4 text-center text-sm">{t("report.success")}</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1 block text-xs text-muted-foreground">
              {t("report.reason_label")}
            </label>
            <select
              required
              value={reasonKey}
              onChange={(e) => setReasonKey(e.target.value)}
              className="mb-3 w-full rounded-md border border-border bg-card text-foreground px-2 py-1.5 text-sm outline-none"
            >
              <option value="" disabled className="bg-card text-foreground">
                {t("report.reason_placeholder")}
              </option>
              {REASON_KEYS.map((k) => (
                <option key={k} value={k} className="bg-card text-foreground">
                  {t(k)}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs text-muted-foreground">
              {t("report.detail_label")}
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder={t("report.detail_placeholder")}
              className="mb-3 w-full resize-none rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
            />

            {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-3 py-1.5 text-sm"
              >
                {t("report.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || !reasonKey}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {t("report.submit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
