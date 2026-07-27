import { useState } from "react";
import { api } from "../lib/api";
import { compressImage } from "../lib/image";
import { useLang } from "../context/LangContext";

export type BannerRow = {
  id: string;
  title: string;
  titleJa: string | null;
  titleEn: string | null;
  body: string | null;
  bodyJa: string | null;
  bodyEn: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BannerFormModal({
  banner,
  onClose,
  onSaved,
}: {
  banner: BannerRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLang();
  const [title, setTitle] = useState(banner?.title ?? "");
  const [titleJa, setTitleJa] = useState(banner?.titleJa ?? "");
  const [titleEn, setTitleEn] = useState(banner?.titleEn ?? "");
  const [body, setBody] = useState(banner?.body ?? "");
  const [bodyJa, setBodyJa] = useState(banner?.bodyJa ?? "");
  const [bodyEn, setBodyEn] = useState(banner?.bodyEn ?? "");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [active, setActive] = useState(banner?.active ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(banner?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toDatetimeLocal(banner?.endsAt ?? null));
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageError(null);
    try {
      setImageUrl(await compressImage(file));
    } catch {
      setImageError(t("bannerModal.error_image"));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("bannerModal.error_title_required"));
      return;
    }
    setError(null);
    setSaving(true);
    const body_: Record<string, unknown> = {
      title: title.trim(),
      titleJa: titleJa.trim() || undefined,
      titleEn: titleEn.trim() || undefined,
      body: body.trim() || undefined,
      bodyJa: bodyJa.trim() || undefined,
      bodyEn: bodyEn.trim() || undefined,
      imageUrl: imageUrl || null,
      linkUrl: linkUrl.trim() || undefined,
      active,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      sortOrder: Number(sortOrder) || 0,
    };
    try {
      if (banner) {
        await api.patch(`/admin/banners/${banner.id}`, body_);
      } else {
        await api.post("/admin/banners", body_);
      }
      onSaved();
      onClose();
    } catch {
      setError(t("bannerModal.error_save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6"
      >
        <h2 className="mb-4 text-base font-semibold">{banner ? t("bannerModal.title_edit") : t("bannerModal.title_new")}</h2>

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">
          {t("bannerModal.image_label")}
        </label>
        {imageUrl ? (
          <div className="mb-1 overflow-hidden rounded-md border border-[var(--border)]">
            <img src={imageUrl} alt={t("bannerModal.image_preview_alt")} className="max-h-40 w-full object-cover" />
          </div>
        ) : (
          <div className="mb-1 flex h-24 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-xs text-[var(--fg-faint)]">
            {t("bannerModal.image_empty")}
          </div>
        )}
        <div className="mb-4 flex items-center gap-2">
          <label className="cursor-pointer rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--bg-hover)]">
            {t("bannerModal.image_select")}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
            >
              {t("bannerModal.image_remove")}
            </button>
          )}
          {imageError && <span className="text-xs text-red-400">{imageError}</span>}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.title_ko")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.title_ja")}</label>
            <input
              value={titleJa}
              onChange={(e) => setTitleJa(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.title_en_field")}</label>
            <input
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.body_ko")}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.body_ja")}</label>
            <textarea
              value={bodyJa}
              onChange={(e) => setBodyJa(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.body_en_field")}</label>
            <textarea
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
        </div>

        <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.link_label")}</label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder={t("bannerModal.link_placeholder")}
          className="mb-4 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
        />

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.starts_at")}</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--fg-muted)]">{t("bannerModal.ends_at")}</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            {t("bannerModal.active")}
          </label>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--fg-muted)]">{t("bannerModal.sort_order")}</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-20 rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
          </div>
        </div>

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
            {saving ? t("gacha.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
