import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../lib/api";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import type { TranslationKey } from "../lib/i18n";

type AuctionListing = {
  id: string;
  characterId: number;
  characterName: string;
  enhancementLevel: number;
  startPrice: number;
  buyoutPrice: number | null;
  currentBid: number | null;
  status: string;
  endsAt: string;
  settledAt: string | null;
  createdAt: string;
  seller: { id: string; name: string; email: string };
  bidder: { id: string; name: string; email: string } | null;
};

type AuctionResponse = {
  listings: AuctionListing[];
  total: number;
  page: number;
  totalPages: number;
};

const STATUS_LABEL_KEY: Record<string, TranslationKey> = {
  active: "auction.status_active",
  sold: "auction.status_sold",
  expired: "auction.status_expired",
  cancelled: "auction.status_cancelled",
  cancelled_by_admin: "auction.status_cancelled_by_admin",
};

export default function AuctionPage() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuctionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      const res = await api.get<AuctionResponse>(`/admin/auction/listings?${params.toString()}`);
      setData(res);
    } catch {
      setError(t("common.error_load"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const [cancelTarget, setCancelTarget] = useState<AuctionListing | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/auction/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim() || undefined,
      });
      setCancelTarget(null);
      setCancelReason("");
      load();
    } catch {
      showToast(t("auction.error_cancel"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold">{t("auction.title")}</h1>
      <p className="mb-4 text-sm text-[var(--fg-faint)]">{t("auction.subtitle")}</p>

      <div className="mb-4 flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
        >
          <option value="" className="bg-[var(--bg-elevated)] text-[var(--fg)]">{t("common.all")}</option>
          {Object.entries(STATUS_LABEL_KEY).map(([value, key]) => (
            <option key={value} value={value} className="bg-[var(--bg-elevated)] text-[var(--fg)]">
              {t(key)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-soft)] text-[var(--fg-muted)]">
            <tr>
              <th className="px-3 py-2">{t("auction.col_character")}</th>
              <th className="px-3 py-2">{t("auction.col_seller")}</th>
              <th className="px-3 py-2">{t("auction.col_price")}</th>
              <th className="px-3 py-2">{t("auction.col_bidder")}</th>
              <th className="px-3 py-2">{t("common.status")}</th>
              <th className="px-3 py-2">{t("auction.col_ends_at")}</th>
              <th className="px-3 py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.listings.map((l) => (
              <tr key={l.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 whitespace-nowrap">
                  {l.characterName}
                  {l.enhancementLevel > 0 && (
                    <span className="ml-1 text-xs text-[var(--fg-faint)]">+{l.enhancementLevel}</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link to={`/users/${l.seller.id}`} className="text-[#b7607e] hover:underline">
                    {l.seller.name}
                  </Link>
                  <div className="text-xs text-[var(--fg-faint)]">{l.seller.email}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div>{(l.currentBid ?? l.startPrice).toLocaleString()} KP</div>
                  {l.buyoutPrice && (
                    <div className="text-xs text-[var(--fg-faint)]">
                      {t("auction.buyout_price")} {l.buyoutPrice.toLocaleString()} KP
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {l.bidder ? (
                    <>
                      <Link to={`/users/${l.bidder.id}`} className="text-[#b7607e] hover:underline">
                        {l.bidder.name}
                      </Link>
                      <div className="text-xs text-[var(--fg-faint)]">{l.bidder.email}</div>
                    </>
                  ) : (
                    <span className="text-[var(--fg-faint)]">-</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {STATUS_LABEL_KEY[l.status] ? t(STATUS_LABEL_KEY[l.status]) : l.status}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-[var(--fg-muted)]">
                  {new Date(l.endsAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  {l.status === "active" ? (
                    <button
                      onClick={() => setCancelTarget(l)}
                      className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--bg-hover)]"
                    >
                      {t("auction.force_cancel")}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--fg-faint)]">-</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && data?.listings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-faint)]">
                  {t("common.no_results")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.prev")}
          </button>
          <span className="text-[var(--fg-muted)]">
            {data.page} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-30"
          >
            {t("common.next")}
          </button>
        </div>
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] p-4"
          onClick={() => !submitting && setCancelTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold">{t("auction.modal_title")}</h2>
            <p className="mb-3 text-xs text-[var(--fg-faint)]">
              {cancelTarget.characterName} · {cancelTarget.seller.name} ({cancelTarget.seller.email})
            </p>
            <p className="mb-3 text-xs text-[var(--fg-faint)]">{t("auction.modal_desc")}</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={255}
              placeholder={t("common.reason")}
              className="mb-4 w-full resize-none rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#b7607e]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={submitting}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={submitting}
                className="rounded-md bg-[#b7607e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#a2536e] disabled:opacity-50"
              >
                {submitting ? t("common.loading") : t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
