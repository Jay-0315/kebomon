import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

type Category = "bug" | "account" | "suggestion" | "etc";

const CATEGORY_KEYS: { value: Category; key: TranslationKey }[] = [
  { value: "bug", key: "inquiry.category_bug" },
  { value: "account", key: "inquiry.category_account" },
  { value: "suggestion", key: "inquiry.category_suggestion" },
  { value: "etc", key: "inquiry.category_etc" },
];

type InquiryRow = {
  id: string;
  category: Category;
  content: string;
  status: "PENDING" | "ANSWERED";
  adminReply: string | null;
  createdAt: string;
};

export default function InquiryModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang();
  const [category, setCategory] = useState<Category | "">("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<InquiryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  function loadHistory() {
    setLoadingHistory(true);
    api
      .get<InquiryRow[]>("/inquiries/mine")
      .then(setHistory)
      .catch(() => undefined)
      .finally(() => setLoadingHistory(false));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/inquiries", { category, content: content.trim() });
      setCategory("");
      setContent("");
      loadHistory();
    } catch {
      setError(t("inquiry.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("inquiry.title")}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent/30">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mb-3 w-full rounded-md border border-border bg-card text-foreground px-2 py-1.5 text-sm outline-none"
          >
            <option value="" disabled className="bg-card text-foreground">
              {t("inquiry.category_placeholder")}
            </option>
            {CATEGORY_KEYS.map((c) => (
              <option key={c.value} value={c.value} className="bg-card text-foreground">
                {t(c.key)}
              </option>
            ))}
          </select>

          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder={t("inquiry.content_placeholder")}
            className="mb-3 w-full resize-none rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
          />

          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !category || !content.trim()}
            className="mb-4 w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting ? "..." : t("inquiry.submit")}
          </button>
        </form>

        <div className="border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{t("inquiry.history_title")}</h3>
          {loadingHistory ? null : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("inquiry.empty")}</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {history.map((h) => (
                <li key={h.id} className="rounded-md border border-border p-2 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{t(CATEGORY_KEYS.find((c) => c.value === h.category)!.key)}</span>
                    <span className={h.status === "ANSWERED" ? "text-emerald-500" : "text-muted-foreground"}>
                      {h.status === "ANSWERED" ? t("inquiry.status_answered") : t("inquiry.status_pending")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-muted-foreground">{h.content}</p>
                  {h.adminReply && (
                    <p className="mt-1 rounded bg-primary/10 p-1.5 text-foreground whitespace-pre-wrap">
                      {t("inquiry.reply_label")}: {h.adminReply}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
