import { useState } from "react";
import { api } from "../lib/api";
import UserPickerModal, { type PickedUser } from "../components/UserPickerModal";
import { useLang } from "../context/LangContext";
import type { TranslationKey } from "../lib/i18n";

type SendResult = { sent: number; failed: number; total: number };

const LINK_OPTIONS: { labelKey: TranslationKey; value: string }[] = [
  { labelKey: "notifications.link_home", value: "/" },
  { labelKey: "notifications.link_community", value: "/community" },
  { labelKey: "notifications.link_attendance", value: "/attendance" },
  { labelKey: "notifications.link_mypage", value: "/mypage" },
  { labelKey: "notifications.link_kebomon", value: "/kebomon" },
  { labelKey: "notifications.link_gacha", value: "/gacha" },
  { labelKey: "notifications.link_live", value: "/live" },
  { labelKey: "notifications.link_mission", value: "/mission" },
  { labelKey: "notifications.link_raid", value: "/raid" },
  { labelKey: "notifications.link_colosseum", value: "/colosseum" },
  { labelKey: "notifications.link_rogue", value: "/rogue" },
  { labelKey: "notifications.link_duel", value: "/duel" },
  { labelKey: "notifications.link_expedition", value: "/expedition" },
  { labelKey: "notifications.link_guild", value: "/guild" },
  { labelKey: "notifications.link_shop", value: "/shop" },
  { labelKey: "notifications.link_settings", value: "/settings" },
];

export default function NotificationsPage() {
  const { t } = useLang();
  const [target, setTarget] = useState<"all" | "user">("user");
  const [selectedUsers, setSelectedUsers] = useState<PickedUser[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (target === "user" && selectedUsers.length === 0) {
      setError(t("notifications.error_no_user"));
      return;
    }
    if (target === "all" && !window.confirm(t("notifications.confirm_send_all"))) {
      return;
    }

    setSending(true);
    try {
      const res = await api.post<SendResult>("/admin/notifications", {
        target,
        userIds: target === "user" ? selectedUsers.map((u) => u.id) : undefined,
        title,
        body,
        link: link || undefined,
      });
      setResult(res);
      setTitle("");
      setBody("");
      setLink("");
    } catch {
      setError(t("notifications.error_send"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-lg font-semibold">{t("notifications.title")}</h1>

      <form onSubmit={handleSubmit} className="rounded-lg border border-[var(--border)] p-4">
        <div className="mb-4 flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={target === "user"}
              onChange={() => setTarget("user")}
            />
            {t("notifications.target_user")}
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={target === "all"}
              onChange={() => setTarget("all")}
            />
            {t("notifications.target_all")}
          </label>
        </div>

        {target === "user" && (
          <>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("notifications.recipient_label")}</label>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-left text-sm hover:bg-[var(--bg-hover)]"
            >
              {selectedUsers.length === 0 ? (
                <span className="text-[var(--fg-faint)]">{t("notifications.pick_placeholder")}</span>
              ) : selectedUsers.length <= 3 ? (
                selectedUsers.map((u) => u.name).join(", ")
              ) : (
                t("notifications.pick_more", {
                  names: selectedUsers.slice(0, 3).map((u) => u.name).join(", "),
                  count: selectedUsers.length - 3,
                })
              )}
            </button>
          </>
        )}

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("notifications.title_label")}</label>
        <input
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("notifications.body_label")}</label>
        <textarea
          required
          maxLength={255}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        />

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("notifications.link_label")}</label>
        <select
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[#b7607e]"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("notifications.link_none")}</option>
          {LINK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[var(--bg-elevated)] text-[var(--fg)]">
              {t(o.labelKey)}
            </option>
          ))}
        </select>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        {result && (
          <p className="mb-4 text-sm text-emerald-400">
            {t("notifications.result_success", { sent: result.sent })}
            {result.failed > 0 ? t("notifications.result_failed", { failed: result.failed }) : ""}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-[#b7607e] px-4 py-2 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
        >
          {sending ? t("notifications.sending") : t("notifications.send")}
        </button>
      </form>

      {pickerOpen && (
        <UserPickerModal
          initialSelected={selectedUsers}
          onClose={() => setPickerOpen(false)}
          onApply={(users) => {
            setSelectedUsers(users);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
