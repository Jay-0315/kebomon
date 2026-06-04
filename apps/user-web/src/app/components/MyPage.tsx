import { useRef, useState } from "react";
import { Calendar, TrendingUp, Heart, Camera, X, Pencil, Check, Gamepad2, ChevronRight, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router";
import PixelCharacter from "./PixelCharacter";
import { useAppData } from "../context/AppDataContext";
import { useLang } from "../context/LangContext";
import { formatCurrency, getCountryByCode } from "../data/currency";
import { CHARACTERS, RARITY_COLOR, getCharName, getRarityLabel } from "../data/characters";
import TitleBadge, { TitleSelector } from "./TitleBadge";
import { THEME_PRESETS } from "../lib/theme-presets";

export default function MyPage() {
  const navigate = useNavigate();
  const { profile, settings, rewardSummary, monthlyTotals, expenses, posts, profilePhoto, updateProfilePhoto, updateProfileName, equipTitle, unequipTitle } = useAppData();
  const [titleLoading, setTitleLoading] = useState(false);
  const [showTitleSelector, setShowTitleSelector] = useState(false);

  const handleEquipTitle = async (id: number) => {
    setTitleLoading(true);
    try { await equipTitle(id); } finally { setTitleLoading(false); }
  };
  const handleUnequipTitle = async () => {
    setTitleLoading(true);
    try { await unequipTitle(); } finally { setTitleLoading(false); }
  };
  const { t, lang } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  const handleSaveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === profile.name) { setEditingName(false); return; }
    await updateProfileName(trimmed);
    setEditingName(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") updateProfilePhoto(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.baseAmount, 0);
  const averageSpend = expenses.length ? Math.round(totalSpent / expenses.length) : 0;
  const myPosts = posts.filter((post) => post.authorId === profile.id);
  const country = getCountryByCode(profile.baseCountryCode);

  const preset = THEME_PRESETS.find((p) => p.id === settings.themeColor) ?? THEME_PRESETS[0];
  const chartColor = settings.darkMode ? preset.dark.primary : preset.light.primary;

  const ownedSet = new Set(rewardSummary.ownedCharacterIds);
  const displayChar = rewardSummary.equippedCharacterId
    ? (CHARACTERS.find((c) => c.id === rewardSummary.equippedCharacterId) ?? CHARACTERS.find((c) => ownedSet.has(c.id)) ?? CHARACTERS[0])
    : (CHARACTERS.find((c) => ownedSet.has(c.id)) ?? CHARACTERS[0]);

return (
    <div className="space-y-6">
      {/* ── Profile header ── */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full border-2 border-primary/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-primary/10"
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{profile.name[0]}</span>
            )}
          </div>
          {profilePhoto && (
            <button
              onClick={() => updateProfilePhoto(null)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:bg-destructive/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
          >
            <Camera className="w-3 h-3" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        <div className="flex-1 min-w-0">
          <h2>{t("mypage.title")}</h2>
          {editingName ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                autoFocus
                maxLength={20}
                className="text-sm px-2 py-0.5 rounded border border-border bg-input-background focus:outline-none focus:ring-1 focus:ring-ring w-32"
              />
              <button onClick={() => void handleSaveName()} className="text-primary hover:text-primary/70 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-medium truncate">{profile.name}</span>
              <button
                onClick={() => { setDraftName(profile.name); setEditingName(true); }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {country.flag} {country.name} · {profile.baseCurrency} {t("mypage.currency_basis")}
          </p>
        </div>

      </div>

      {/* ── 캐보몬 shortcut card ── */}
      <button
        onClick={() => navigate("/kabemon")}
        className="w-full bg-card rounded-md border-2 border-primary/50 hover:border-primary p-4 transition-all hover:shadow-md group flex items-center gap-4 text-left"
      >
        {/* Character preview */}
        <div className="shrink-0">
          <PixelCharacter characterId={displayChar.id} size={64} float />
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("mypage.kabemon_link")}</span>
          </div>
          <p className={`text-sm font-medium ${RARITY_COLOR[displayChar.rarity]}`}>
            {getCharName(displayChar, lang)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getRarityLabel(displayChar.rarity, lang)} · {rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length} {t("kabemon.collection_count")} · {rewardSummary.missionPoints}P
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>

      {/* ── 칭호 ── */}
      <div className="bg-card rounded-md p-4 shadow-sm border border-border">
        <button
          onClick={() => setShowTitleSelector((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{t("mypage.title_section")}</span>
            {rewardSummary.equippedTitleId && (
              <TitleBadge titleId={rewardSummary.equippedTitleId} size="xs" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{rewardSummary.ownedTitleIds.length}{t("mypage.title_owned")}</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showTitleSelector ? "rotate-90" : ""}`} />
          </div>
        </button>
        {showTitleSelector && (
          <div className="mt-3 pt-3 border-t border-border">
            <TitleSelector
              ownedTitleIds={rewardSummary.ownedTitleIds}
              equippedTitleId={rewardSummary.equippedTitleId}
              onEquip={handleEquipTitle}
              onUnequip={handleUnequipTitle}
              loading={titleLoading}
            />
          </div>
        )}
      </div>

      {/* ── 월별 지출 합계 ── */}
      <div className="bg-card rounded-md p-5 shadow-sm border border-border">
        <h3 className="mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary/80" />
          {t("mypage.monthly_chart")}
        </h3>
        <ResponsiveContainer width="99%" height={220}>
          <BarChart data={monthlyTotals}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#A3A3A3" }} />
            <YAxis tick={{ fontSize: 12, fill: "#A3A3A3" }} />
            <Tooltip
              cursor={false}
              formatter={(value: number) => formatCurrency(value, profile.baseCurrency)}
              contentStyle={{
                backgroundColor: "#1A1A1A",
                border: "1px solid #2A2A2A",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="amount" fill={chartColor} fillOpacity={0.85} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── 이번 달 요약 ── */}
        <div className="bg-card rounded-md p-5 shadow-sm border border-border">
          <h3 className="mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            {t("mypage.monthly_summary")}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded p-3">
              <p className="text-sm text-muted-foreground mb-1">{t("mypage.total_spent")}</p>
              <p className="text-xl font-bold text-destructive">
                {formatCurrency(totalSpent, profile.baseCurrency)}
              </p>
            </div>
            <div className="bg-muted rounded p-3">
              <p className="text-sm text-muted-foreground mb-1">{t("mypage.avg_amount")}</p>
              <p className="text-xl font-bold text-accent">
                {formatCurrency(averageSpend, profile.baseCurrency)}
              </p>
            </div>
          </div>
          <div className="mt-4 bg-muted rounded p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{t("mypage.current_points")}</p>
              <p className="text-2xl font-bold text-primary mt-0.5">{rewardSummary.missionPoints}P</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t("kabemon.collection_count")}</p>
              <p className="text-lg font-bold">{rewardSummary.ownedCharacterIds.length}/{CHARACTERS.length}</p>
            </div>
          </div>
        </div>

        {/* ── 내가 작성한 게시글 ── */}
        <div className="bg-card rounded-md p-5 shadow-sm border border-border">
          <h3 className="mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary/80" />
            {t("mypage.my_posts")}
          </h3>
          <div className="space-y-2">
            {myPosts.length === 0 ? (
              <div className="p-4 rounded bg-muted text-sm text-muted-foreground">
                {t("mypage.no_posts")}
              </div>
            ) : (
              myPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3 rounded bg-muted hover:bg-accent/30 transition-colors"
                >
                  <p className="font-medium truncate">{post.content.replace(/<[^>]*>/g, "").trim() || "(내용 없음)"}</p>
                  <p className="text-sm text-muted-foreground">
                    💬 {post.commentCount} · {t("mypage.post_likes_prefix")}{post.likes}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
