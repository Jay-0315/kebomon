import { useEffect, useState } from "react";
import { api } from "../lib/api";
import BannerFormModal, { type BannerRow } from "../components/BannerFormModal";
import { useLang } from "../context/LangContext";

export default function BannersPage() {
  const { t } = useLang();
  const [banners, setBanners] = useState<BannerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<BannerRow | "new" | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.get<BannerRow[]>("/admin/banners");
      setBanners(res);
    } catch {
      setError(t("banners.error_load"));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(banner: BannerRow) {
    if (!window.confirm(t("banners.confirm_delete", { title: banner.title }))) return;
    try {
      await api.delete(`/admin/banners/${banner.id}`);
      load();
    } catch {
      window.alert(t("banners.error_delete"));
    }
  }

  function statusOf(b: BannerRow): "inactive" | "expired" | "pending" | "running" {
    if (!b.active) return "inactive";
    const now = Date.now();
    if (b.endsAt && new Date(b.endsAt).getTime() < now) return "expired";
    if (b.startsAt && new Date(b.startsAt).getTime() > now) return "pending";
    return "running";
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("banners.title")}</h1>
        <button
          onClick={() => setFormTarget("new")}
          className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e]"
        >
          {t("banners.new")}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("banners.col_image")}</th>
              <th className="px-3 py-2">{t("banners.col_title")}</th>
              <th className="px-3 py-2">{t("common.status")}</th>
              <th className="px-3 py-2">{t("banners.col_period")}</th>
              <th className="px-3 py-2">{t("banners.col_sort_order")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {banners?.map((b) => (
              <tr key={b.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  {b.imageUrl ? (
                    <img src={b.imageUrl} alt="" className="h-10 w-20 rounded object-cover" />
                  ) : (
                    <span className="text-[var(--fg-faint)]">-</span>
                  )}
                </td>
                <td className="px-3 py-2">{b.title}</td>
                <td className="px-3 py-2">
                  {statusOf(b) === "inactive" && <span className="text-[var(--fg-faint)]">{t("banners.status_inactive")}</span>}
                  {statusOf(b) === "expired" && <span className="text-red-400">{t("banners.status_expired")}</span>}
                  {statusOf(b) === "pending" && <span className="text-amber-400">{t("banners.status_pending")}</span>}
                  {statusOf(b) === "running" && <span className="text-emerald-400">{t("banners.status_running")}</span>}
                </td>
                <td className="px-3 py-2 text-[var(--fg-muted)]">
                  {b.startsAt ? new Date(b.startsAt).toLocaleString() : t("banners.no_limit")} ~{" "}
                  {b.endsAt ? new Date(b.endsAt).toLocaleString() : t("banners.no_limit")}
                </td>
                <td className="px-3 py-2">{b.sortOrder}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormTarget(b)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {t("banners.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(b)}
                      className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {banners?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("banners.no_banners")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formTarget && (
        <BannerFormModal
          banner={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
