import { useEffect, useRef, useState } from "react";
import { Gavel } from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { getApiErrorTranslationKey } from "../lib/api-error";
import { api } from "../lib/api";
import PixelCharacter from "./PixelCharacter";
import {
  CHARACTERS,
  RARITY_COLOR,
  RARITY_BORDER,
  getCharName,
  getRarityLabel,
  type CharacterRarity,
} from "../data/characters";

const RARITY_ORDER: Record<CharacterRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};
const SELL_RARITIES: CharacterRarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

interface AuctionListing {
  id: string;
  sellerId: string;
  characterId: number;
  enhancementLevel: number;
  startPrice: number;
  buyoutPrice: number | null;
  currentBid: number | null;
  currentBidderId: string | null;
  status: string;
  endsAt: string;
  createdAt: string;
}

interface PriceHistoryEntry {
  id: string;
  characterId: number;
  enhancementLevel: number;
  currentBid: number | null;
  settledAt: string | null;
}

const DURATION_OPTIONS = [6, 12, 24, 48] as const;

function minNextBid(listing: AuctionListing): number {
  if (listing.currentBid === null) return listing.startPrice;
  return listing.currentBid + Math.max(Math.ceil(listing.currentBid * 0.05), 10);
}

function formatRemaining(endsAt: string, now: number): string {
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function agoParts(dateStr: string | null, now: number): { unit: "now" | "min" | "hour" | "day"; n: number } {
  if (!dateStr) return { unit: "now", n: 0 };
  const ms = Math.max(0, now - new Date(dateStr).getTime());
  const min = Math.floor(ms / 60000);
  if (min < 1) return { unit: "now", n: 0 };
  if (min < 60) return { unit: "min", n: min };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { unit: "hour", n: hr };
  return { unit: "day", n: Math.floor(hr / 24) };
}

export default function AuctionPage() {
  const { t, lang } = useLang();
  const { rewardSummary, profile, refreshRewards } = useAppData();
  const { ownedCharacterIds, missionPoints } = rewardSummary;

  const [tab, setTab] = useState<"browse" | "sell" | "mine" | "history">("browse");
  const [listings, setListings] = useState<AuctionListing[]>([]);
  const [myListings, setMyListings] = useState<{ selling: AuctionListing[]; bidding: AuctionListing[] }>({
    selling: [],
    bidding: [],
  });
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [now, setNow] = useState(Date.now());
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sellCharId, setSellCharId] = useState<number | null>(null);
  const [sellFilter, setSellFilter] = useState<"all" | CharacterRarity>("all");
  const [startPrice, setStartPrice] = useState("");
  const [buyoutPrice, setBuyoutPrice] = useState("");
  const [durationHours, setDurationHours] = useState<(typeof DURATION_OPTIONS)[number]>(24);
  const [sellError, setSellError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);

  const priceFormRef = useRef<HTMLDivElement>(null);
  const startPriceInputRef = useRef<HTMLInputElement>(null);

  const switchTab = (tb: "browse" | "sell" | "mine" | "history") => {
    setTab(tb);
    setError(null);
    setSellError(null);
  };

  const charById = (id: number) => CHARACTERS.find((c) => c.id === id);

  const formatAgo = (dateStr: string | null): string => {
    const { unit, n } = agoParts(dateStr, now);
    if (unit === "now") return t("auction.just_now");
    if (unit === "min") return t("auction.min_ago").replace("{n}", String(n));
    if (unit === "hour") return t("auction.hour_ago").replace("{n}", String(n));
    return t("auction.day_ago").replace("{n}", String(n));
  };

  const formatApiError = (err: unknown) => {
    const translationKey = getApiErrorTranslationKey(err);
    if (translationKey) return t(translationKey);
    return err instanceof Error ? err.message : String(err);
  };

  const statusLabel = (status: string): string => {
    switch (status) {
      case "sold":
        return t("auction.status_sold");
      case "expired":
        return t("auction.status_expired");
      case "cancelled":
        return t("auction.status_cancelled");
      case "cancelled_by_admin":
        return t("auction.status_cancelled");
      default:
        return status;
    }
  };

  const loadListings = () => {
    api
      .get<AuctionListing[]>("/auction/listings")
      .then(setListings)
      .catch(() => undefined);
  };

  const loadMine = () => {
    api
      .get<{ selling: AuctionListing[]; bidding: AuctionListing[] }>("/auction/mine")
      .then(setMyListings)
      .catch(() => undefined);
  };

  const loadHistory = () => {
    api
      .get<PriceHistoryEntry[]>("/auction/history")
      .then(setHistory)
      .catch(() => undefined);
  };

  useEffect(() => {
    loadListings();
    loadMine();
    loadHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sellCharId === null) return;
    priceFormRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    startPriceInputRef.current?.focus();
  }, [sellCharId]);

  const sellableChars = CHARACTERS.filter(
    (c) => c.obtainMethod === "gacha" && ownedCharacterIds.includes(c.id),
  )
    .filter((c) => sellFilter === "all" || c.rarity === sellFilter)
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]);

  const filteredHistory = history.filter((h) => {
    if (!historySearch.trim()) return true;
    const def = charById(h.characterId);
    if (!def) return false;
    return getCharName(def, lang).toLowerCase().includes(historySearch.trim().toLowerCase());
  });
  const historyPrices = filteredHistory
    .map((h) => h.currentBid)
    .filter((p): p is number => p !== null);
  const historyStats =
    historyPrices.length > 0
      ? {
          avg: Math.round(historyPrices.reduce((s, p) => s + p, 0) / historyPrices.length),
          min: Math.min(...historyPrices),
          max: Math.max(...historyPrices),
        }
      : null;

  const handleBid = async (listing: AuctionListing) => {
    const raw = bidAmounts[listing.id];
    const amount = Number(raw ?? minNextBid(listing));
    if (!Number.isInteger(amount) || amount < minNextBid(listing)) {
      setError(t("auction.error_min_bid").replace("{min}", String(minNextBid(listing))));
      return;
    }
    setError(null);
    setBusyId(listing.id);
    try {
      await api.post(`/auction/${listing.id}/bid`, { amount });
      await refreshRewards();
      loadListings();
      loadMine();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleBuyout = async (listing: AuctionListing) => {
    if (!window.confirm(t("auction.confirm_buyout"))) return;
    setError(null);
    setBusyId(listing.id);
    try {
      await api.post(`/auction/${listing.id}/buyout`);
      await refreshRewards();
      loadListings();
      loadMine();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (listing: AuctionListing) => {
    setBusyId(listing.id);
    try {
      await api.post(`/auction/${listing.id}/cancel`);
      await refreshRewards();
      loadMine();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleList = async () => {
    if (sellCharId === null) return;
    const start = Number(startPrice);
    const buyout = buyoutPrice ? Number(buyoutPrice) : undefined;
    setSellError(null);
    setSelling(true);
    try {
      await api.post("/auction/list", {
        characterId: sellCharId,
        startPrice: start,
        buyoutPrice: buyout,
        durationHours,
      });
      setSellCharId(null);
      setStartPrice("");
      setBuyoutPrice("");
      await refreshRewards();
      loadMine();
      setTab("mine");
    } catch (e) {
      setSellError(formatApiError(e));
    } finally {
      setSelling(false);
    }
  };

  const renderListingCard = (listing: AuctionListing, mode: "browse" | "mine-sell" | "mine-bid") => {
    const def = charById(listing.characterId);
    if (!def) return null;
    const isSeller = listing.sellerId === profile.id;
    const isBidder = listing.currentBidderId === profile.id;
    const price = listing.currentBid ?? listing.startPrice;
    const min = minNextBid(listing);

    return (
      <div
        key={listing.id}
        className={`rounded-2xl border-2 ${RARITY_BORDER[def.rarity]} bg-card p-4 flex flex-col items-center gap-2`}
      >
        <div className="flex items-center justify-center py-2">
          <PixelCharacter characterId={def.id} size={80} />
        </div>
        <p className={`text-sm font-bold ${RARITY_COLOR[def.rarity]}`}>
          {getCharName(def, lang)}
          {listing.enhancementLevel > 0 && (
            <span className="text-amber-400 ml-1">+{listing.enhancementLevel}</span>
          )}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${RARITY_COLOR[def.rarity]}`}>
          {getRarityLabel(def.rarity, lang)}
        </span>

        <div className="w-full text-center text-xs text-muted-foreground mt-1">
          {listing.currentBid !== null ? t("auction.current_bid") : t("auction.start_price")}
          <span className="block text-lg font-bold text-foreground">{price}KP</span>
        </div>
        {listing.buyoutPrice !== null && (
          <p className="text-[11px] text-muted-foreground">
            {t("auction.buyout_price")} {listing.buyoutPrice}KP
          </p>
        )}
        {listing.status === "active" && (
          <p className="text-[11px] text-muted-foreground">
            {t("auction.time_left")} {formatRemaining(listing.endsAt, now)}
          </p>
        )}
        {listing.status !== "active" && (
          <p className="text-[11px] font-semibold text-primary">{statusLabel(listing.status)}</p>
        )}

        {mode === "browse" && listing.status === "active" && !isSeller && (
          <div className="w-full flex flex-col gap-2 mt-2">
            <div className="flex gap-2">
              <input
                type="number"
                min={min}
                placeholder={String(min)}
                value={bidAmounts[listing.id] ?? ""}
                onChange={(e) => setBidAmounts((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                className="w-full rounded-lg border border-border bg-input-background px-2 py-1.5 text-sm"
              />
              <button
                onClick={() => void handleBid(listing)}
                disabled={busyId === listing.id || missionPoints < min}
                className={`shrink-0 rounded-lg text-xs font-semibold px-3 py-1.5 transition ${
                  busyId !== listing.id && missionPoints >= min
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground cursor-not-allowed opacity-60"
                }`}
              >
                {t("auction.bid_btn")}
              </button>
            </div>
            {listing.buyoutPrice !== null && (
              <button
                onClick={() => void handleBuyout(listing)}
                disabled={busyId === listing.id || missionPoints < listing.buyoutPrice}
                className={`w-full rounded-lg text-xs font-semibold py-1.5 transition ${
                  busyId !== listing.id && missionPoints >= listing.buyoutPrice
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-secondary text-secondary-foreground cursor-not-allowed opacity-40"
                }`}
              >
                {t("auction.buyout_btn")} ({listing.buyoutPrice}KP)
              </button>
            )}
          </div>
        )}
        {mode === "browse" && isBidder && (
          <p className="text-[10px] text-emerald-400">{t("auction.you_are_winning")}</p>
        )}

        {mode === "mine-sell" && listing.status === "active" && listing.currentBidderId === null && (
          <button
            onClick={() => void handleCancel(listing)}
            disabled={busyId === listing.id}
            className={`w-full mt-2 rounded-lg text-xs font-semibold py-1.5 ${
              busyId === listing.id
                ? "bg-secondary text-muted-foreground cursor-not-allowed"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {t("auction.cancel_btn")}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">{t("nav.auction")}</h2>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {(["browse", "sell", "mine", "history"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => switchTab(tb)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === tb ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {tb === "browse"
              ? t("auction.tab_browse")
              : tb === "sell"
                ? t("auction.tab_sell")
                : tb === "mine"
                  ? t("auction.tab_mine")
                  : t("auction.tab_history")}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {tab === "browse" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {listings.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">
              {t("auction.no_listings")}
            </p>
          )}
          {listings.map((l) => renderListingCard(l, "browse"))}
        </div>
      )}

      {tab === "sell" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{t("auction.sell_pick_hint")}</p>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSellFilter("all")}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
                sellFilter === "all" ? "bg-primary text-white" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t("auction.filter_all")}
            </button>
            {SELL_RARITIES.map((r) => (
              <button
                key={r}
                onClick={() => setSellFilter(r)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition ${
                  sellFilter === r ? `${RARITY_BORDER[r]} border bg-card ${RARITY_COLOR[r]}` : "bg-secondary text-secondary-foreground"
                }`}
              >
                {getRarityLabel(r, lang)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {sellableChars.map((c) => (
              <button
                key={c.id}
                onClick={() => setSellCharId(c.id)}
                className={`rounded-xl border-2 p-2 flex flex-col items-center gap-1 ${
                  sellCharId === c.id ? RARITY_BORDER[c.rarity] : "border-border"
                }`}
              >
                <PixelCharacter characterId={c.id} size={40} />
                <span className={`text-[10px] font-medium ${RARITY_COLOR[c.rarity]}`}>
                  {getCharName(c, lang)}
                </span>
              </button>
            ))}
            {sellableChars.length === 0 && (
              <p className="col-span-full text-xs text-muted-foreground text-center py-6">
                {t("auction.no_sellable")}
              </p>
            )}
          </div>

          {sellCharId !== null && (
            <div ref={priceFormRef} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <label className="block text-xs text-muted-foreground">{t("auction.start_price")}</label>
              <input
                ref={startPriceInputRef}
                type="number"
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
              />
              <label className="block text-xs text-muted-foreground">
                {t("auction.buyout_price")} ({t("auction.optional")})
              </label>
              <input
                type="number"
                value={buyoutPrice}
                onChange={(e) => setBuyoutPrice(e.target.value)}
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
              />
              <label className="block text-xs text-muted-foreground">{t("auction.duration")}</label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setDurationHours(h)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                      durationHours === h ? "bg-primary text-white" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              {sellError && <p className="text-sm text-rose-400">{sellError}</p>}
              <button
                onClick={() => void handleList()}
                disabled={selling || !startPrice}
                className="w-full rounded-2xl py-3 text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {selling ? t("auction.listing") : t("auction.list_btn")}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "mine" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">{t("auction.my_selling")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myListings.selling.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">{t("auction.no_listings")}</p>
              )}
              {myListings.selling.map((l) => renderListingCard(l, "mine-sell"))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">{t("auction.my_bidding")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myListings.bidding.length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground">{t("auction.no_listings")}</p>
              )}
              {myListings.bidding.map((l) => renderListingCard(l, "mine-bid"))}
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          <input
            type="text"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder={t("auction.history_search_placeholder")}
            className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
          />

          {historyStats && (
            <div className="flex gap-2">
              <div className="flex-1 bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("auction.stat_avg")}</p>
                <p className="text-sm font-bold">{historyStats.avg}KP</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("auction.stat_min")}</p>
                <p className="text-sm font-bold">{historyStats.min}KP</p>
              </div>
              <div className="flex-1 bg-card rounded-xl border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{t("auction.stat_max")}</p>
                <p className="text-sm font-bold">{historyStats.max}KP</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {filteredHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{t("auction.no_history")}</p>
            )}
            {filteredHistory.map((h) => {
              const def = charById(h.characterId);
              if (!def) return null;
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-3 rounded-xl border ${RARITY_BORDER[def.rarity]} bg-card px-3 py-2`}
                >
                  <PixelCharacter characterId={def.id} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${RARITY_COLOR[def.rarity]}`}>
                      {getCharName(def, lang)}
                      {h.enhancementLevel > 0 && (
                        <span className="text-amber-400 ml-1">+{h.enhancementLevel}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{getRarityLabel(def.rarity, lang)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{h.currentBid}KP</p>
                    <p className="text-[10px] text-muted-foreground">{formatAgo(h.settledAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
