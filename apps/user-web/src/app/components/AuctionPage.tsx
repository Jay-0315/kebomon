import { useEffect, useState } from "react";
import { Gavel } from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAppData } from "../context/AppDataContext";
import { api } from "../lib/api";
import PixelCharacter from "./PixelCharacter";
import {
  CHARACTERS,
  RARITY_COLOR,
  RARITY_BORDER,
  getCharName,
  getRarityLabel,
} from "../data/characters";

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

export default function AuctionPage() {
  const { t, lang } = useLang();
  const { rewardSummary, profile, refreshRewards } = useAppData();
  const { ownedCharacterIds, missionPoints } = rewardSummary;

  const [tab, setTab] = useState<"browse" | "sell" | "mine">("browse");
  const [listings, setListings] = useState<AuctionListing[]>([]);
  const [myListings, setMyListings] = useState<{ selling: AuctionListing[]; bidding: AuctionListing[] }>({
    selling: [],
    bidding: [],
  });
  const [now, setNow] = useState(Date.now());
  const [bidAmounts, setBidAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sellCharId, setSellCharId] = useState<number | null>(null);
  const [startPrice, setStartPrice] = useState("");
  const [buyoutPrice, setBuyoutPrice] = useState("");
  const [durationHours, setDurationHours] = useState<(typeof DURATION_OPTIONS)[number]>(24);
  const [sellError, setSellError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);

  const charById = (id: number) => CHARACTERS.find((c) => c.id === id);

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

  useEffect(() => {
    loadListings();
    loadMine();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sellableChars = CHARACTERS.filter(
    (c) => c.obtainMethod === "gacha" && ownedCharacterIds.includes(c.id),
  );

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
      setError(e instanceof Error ? e.message : String(e));
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
      setError(e instanceof Error ? e.message : String(e));
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
      setError(e instanceof Error ? e.message : String(e));
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
      setSellError(e instanceof Error ? e.message : String(e));
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
                className="shrink-0 rounded-lg bg-primary text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
              >
                {t("auction.bid_btn")}
              </button>
            </div>
            {listing.buyoutPrice !== null && (
              <button
                onClick={() => void handleBuyout(listing)}
                disabled={busyId === listing.id || missionPoints < listing.buyoutPrice}
                className="w-full rounded-lg bg-secondary text-foreground text-xs font-semibold py-1.5 disabled:opacity-50"
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
            className="w-full mt-2 rounded-lg bg-secondary text-foreground text-xs font-semibold py-1.5 disabled:opacity-50"
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
        {(["browse", "sell", "mine"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === tb ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {tb === "browse" ? t("auction.tab_browse") : tb === "sell" ? t("auction.tab_sell") : t("auction.tab_mine")}
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
          </div>

          {sellCharId !== null && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <label className="block text-xs text-muted-foreground">{t("auction.start_price")}</label>
              <input
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
                      durationHours === h ? "bg-primary text-white" : "bg-secondary text-foreground"
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
    </div>
  );
}
