import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface GachaResult {
  results: { characterId: number; rarity: string; isDuplicate: boolean; bonusPoints: number }[];
  pointsSpent: number;
  bonusPoints: number;
  remainingPoints: number;
  gachaPityCount: number;
  legendaryPityCount: number;
}

export type EggType = "normal" | "big" | "golden";
export interface EggOpenResult {
  eggType: EggType;
  characterId: number;
  rarity: string;
  isDuplicate: boolean;
  points: number;
}
import { countries, exchangeRates, getCountryByCode, getExchangeRate } from "../data/currency";
import { CHARACTERS as _CHARS } from "../data/characters";
const _VALID_CHAR_IDS = new Set(_CHARS.map((c) => c.id));
import { initialAppData } from "../data/seed";
import { applyThemePreset } from "../lib/theme-presets";
import { api } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import type {
  AppSettings,
  CommunityPost,
  CommunityPostDraft,
  CurrencyCode,
  ExchangeRate,
  Expense,
  ExpenseDraft,
  PostCategory,
  RewardSummary,
  UserProfile,
} from "../types/domain";

const SETTINGS_STORAGE_KEY = "kebo-local-settings";
const profilePhotoKey = (userId: string) => `kebo-profile-photo-${userId}`;

interface AppDataContextValue {
  hasInitialized: boolean;
  rewardsFailed: boolean;
  isLoading: boolean;
  profile: UserProfile;
  settings: AppSettings;
  countries: typeof countries;
  exchangeRates: ExchangeRate[];
  expenses: Expense[];
  posts: CommunityPost[];
  rewardSummary: RewardSummary;
  monthlyTotals: { month: string; amount: number }[];
  createExpense: (draft: ExpenseDraft) => Promise<void>;
  updateExpense: (expenseId: string, draft: ExpenseDraft) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  createPost: (draft: CommunityPostDraft) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  togglePostLike: (postId: string) => Promise<void>;
  updateProfileCurrency: (countryCode: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  equipCharacter: (characterId: number) => Promise<void>;
  selectStarter: (characterId: number) => Promise<void>;
  performGacha: (count: 1 | 10) => Promise<GachaResult>;
  openEgg: (eggType: EggType) => Promise<EggOpenResult>;
  refreshRewards: () => Promise<void>;
  checkAchievements: () => Promise<number[]>;
  equipTitle: (titleId: number) => Promise<void>;
  unequipTitle: () => Promise<void>;
  checkTitles: () => Promise<number[]>;
  getCountryName: (code: string) => string;
  refreshData: () => Promise<void>;
  profilePhoto: string | null;
  updateProfilePhoto: (photo: string | null) => void;
  updateProfileName: (name: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function normalizeRewardSummary(summary: Partial<RewardSummary> | null | undefined): RewardSummary {
  return {
    attendanceDays: summary?.attendanceDays ?? 0,
    missionPoints: summary?.missionPoints ?? 0,
    streakDays: summary?.streakDays ?? 0,
    equippedCharacterId: summary?.equippedCharacterId ?? null,
    equippedTitleId: summary?.equippedTitleId ?? null,
    ownedCharacterIds: (summary?.ownedCharacterIds ?? []).filter((id) => _VALID_CHAR_IDS.has(id)),
    ownedTitleIds: summary?.ownedTitleIds ?? [],
    gachaPityCount: summary?.gachaPityCount ?? 0,
    legendaryPityCount: summary?.legendaryPityCount ?? 0,
    totalPointsUsed: summary?.totalPointsUsed ?? 0,
    normalEggs: summary?.normalEggs ?? 0,
    bigEggs: summary?.bigEggs ?? 0,
    goldenEggs: summary?.goldenEggs ?? 0,
  };
}

function mapExpense(apiExpense: Record<string, unknown>): Expense {
  return {
    id: String(apiExpense.id),
    date: String(apiExpense.expenseDate).slice(0, 10),
    category: String(apiExpense.category),
    spentAmount: Number(apiExpense.spentAmount),
    spentCurrency: String(apiExpense.spentCurrency) as CurrencyCode,
    baseAmount: Number(apiExpense.baseAmount),
    baseCurrency: String(apiExpense.baseCurrency) as CurrencyCode,
    exchangeRate: Number(apiExpense.exchangeRate),
    countryCode: String(apiExpense.countryCode),
    memo: String(apiExpense.memo),
    group: (apiExpense.groupName as string | null) ?? undefined,
    participants: (apiExpense.participants as number | null) ?? undefined,
    receipt: (apiExpense.receiptUrl as string | null) ?? undefined,
    sharedToCommunity: Boolean(apiExpense.sharedToCommunity),
    createdAt: String(apiExpense.createdAt),
    updatedAt: String(apiExpense.updatedAt),
  };
}



function mapPost(apiPost: Record<string, unknown>): CommunityPost {
  const user = (apiPost.user as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(apiPost.id),
    authorId: String(apiPost.userId ?? apiPost.authorId),
    authorName: String(user.name ?? apiPost.authorName ?? "사용자"),
    authorPhotoUrl: (apiPost.authorPhotoUrl as string | null | undefined) ?? (user.profilePhoto as string | null | undefined) ?? null,
    authorEquippedTitleId: (apiPost.authorEquippedTitleId as number | null | undefined) ?? null,
    content: String(apiPost.content),
    category: (apiPost.category as PostCategory) ?? "chat",
    imageUrl: (apiPost.imageUrl as string | null) ?? null,
    likes: Number(apiPost.likes ?? apiPost.likesCount ?? 0),
    isLiked: Boolean(apiPost.isLiked),
    commentCount: Number(apiPost.commentCount ?? 0),
    recentComments: Array.isArray(apiPost.recentComments)
      ? (apiPost.recentComments as Record<string, unknown>[]).map(mapComment)
      : [],
    createdAt: String(apiPost.createdAt),
    updatedAt: String(apiPost.updatedAt),
  };
}

function mapComment(c: Record<string, unknown>): import("../types/domain").Comment {
  return {
    id: String(c.id),
    postId: String(c.postId),
    authorId: String(c.authorId),
    authorName: String(c.authorName ?? "사용자"),
    authorPhotoUrl: (c.authorPhotoUrl as string | null | undefined) ?? null,
    authorEquippedTitleId: (c.authorEquippedTitleId as number | null | undefined) ?? null,
    parentId: c.parentId != null ? String(c.parentId) : null,
    content: String(c.content),
    imageUrl: (c.imageUrl as string | null) ?? null,
    replies: Array.isArray(c.replies)
      ? (c.replies as Record<string, unknown>[]).map(mapComment)
      : [],
    createdAt: String(c.createdAt),
    updatedAt: String(c.updatedAt),
  };
}

function getMonthlyTotals(expenses: Expense[]) {
  const grouped = expenses.reduce<Record<string, number>>((acc, expense) => {
    const month = `${Number(expense.date.slice(5, 7))}월`;
    acc[month] = (acc[month] ?? 0) + expense.baseAmount;
    return acc;
  }, {});

  return Object.entries(grouped).map(([month, amount]) => ({ month, amount }));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const storedUser = getStoredUser();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(storedUser ?? initialAppData.profile);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const merged = raw
      ? { ...initialAppData.settings, ...(JSON.parse(raw) as Partial<AppSettings>) }
      : initialAppData.settings;
    // Apply synchronously before first render so login/signup pages also get the right color
    if (merged.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    applyThemePreset(merged.themeColor ?? initialAppData.settings.themeColor, merged.darkMode);
    return merged;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [rewardsFailed, setRewardsFailed] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>(
    normalizeRewardSummary(undefined),
  );
  const [remoteExchangeRates, setRemoteExchangeRates] = useState<ExchangeRate[]>(exchangeRates);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    const userId = getStoredUser()?.id;
    return userId ? localStorage.getItem(profilePhotoKey(userId)) : null;
  });

  const updateProfilePhoto = (photo: string | null) => {
    const userId = getStoredUser()?.id;
    if (!userId) return;
    if (photo === null) {
      localStorage.removeItem(profilePhotoKey(userId));
    } else {
      localStorage.setItem(profilePhotoKey(userId), photo);
    }
    setProfilePhoto(photo);
    api.patch(`/users/${userId}/photo`, { photo }).catch(console.error);
  };

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    applyThemePreset(settings.themeColor ?? "emerald", settings.darkMode);
  }, [settings]);

  const refreshData = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      setHasInitialized(true);
      return;
    }

    setIsLoading(true);
    const [profileResult, expensesResult, postsResult, rewardsResult, ratesResult] =
      await Promise.allSettled([
        api.get<{
          id: string;
          name: string;
          email: string;
          baseCountryCode: string;
          baseCurrency: CurrencyCode;
          profilePhoto?: string | null;
          hasPassword?: boolean;
          settings?: AppSettings;
        }>(`/users/${currentUser.id}/profile`),
        api.get<Record<string, unknown>[]>(`/expenses?userId=${currentUser.id}`),
        api.get<{ posts: Record<string, unknown>[] }>(`/community/posts?userId=${currentUser.id}`),
        api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`),
        api.get<ExchangeRate[]>("/exchange-rates"),
      ]);

    if (profileResult.status === "fulfilled") {
      const p = profileResult.value;
      setProfile({
        id: p.id,
        name: p.name,
        email: p.email,
        baseCountryCode: p.baseCountryCode,
        baseCurrency: p.baseCurrency,
        hasPassword: p.hasPassword ?? false,
      });
      if (p.settings) setSettings((prev) => ({ ...prev, ...(p.settings as AppSettings) }));
      if (p.profilePhoto !== undefined) {
        const key = profilePhotoKey(p.id);
        if (p.profilePhoto) {
          localStorage.setItem(key, p.profilePhoto);
          setProfilePhoto(p.profilePhoto);
        } else if (!localStorage.getItem(key)) {
          setProfilePhoto(null);
        }
      }
    }
    if (expensesResult.status === "fulfilled") {
      setExpenses(expensesResult.value.map(mapExpense));
    }
    if (postsResult.status === "fulfilled") {
      setPosts(postsResult.value.posts.map(mapPost));
    }
    if (rewardsResult.status === "fulfilled") {
      setRewardSummary(normalizeRewardSummary(rewardsResult.value));
      setRewardsFailed(false);
    } else {
      setRewardsFailed(true);
    }
    if (ratesResult.status === "fulfilled") {
      setRemoteExchangeRates(ratesResult.value);
    }
    setIsLoading(false);
    setHasInitialized(true);
  };

  useEffect(() => {
    if (storedUser) {
      refreshData().catch((error) => {
        console.error(error);
        setHasInitialized(true);
      });
    } else {
      setHasInitialized(true);
    }
  }, []);

  const createExpense = async (draft: ExpenseDraft) => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      return;
    }

    await api.post("/expenses", {
      userId: currentUser.id,
      expenseDate: draft.date,
      category: draft.category,
      spentAmount: draft.spentAmount,
      spentCurrency: draft.spentCurrency,
      baseAmount: Math.round(
        draft.spentAmount *
          getExchangeRate(draft.spentCurrency, profile.baseCurrency, remoteExchangeRates),
      ),
      baseCurrency: profile.baseCurrency,
      exchangeRate: getExchangeRate(draft.spentCurrency, profile.baseCurrency, remoteExchangeRates),
      countryCode: draft.countryCode,
      memo: draft.memo,
      groupName: draft.group || undefined,
      groupId: draft.groupId || undefined,
      participants: draft.participants,
      receiptUrl: draft.receipt,
      sharedToCommunity: false,
    });

    await refreshData();
  };

  const updateExpense = async (expenseId: string, draft: ExpenseDraft) => {
    await api.patch(`/expenses/${expenseId}`, {
      expenseDate: draft.date,
      category: draft.category,
      spentAmount: draft.spentAmount,
      spentCurrency: draft.spentCurrency,
      baseAmount: Math.round(
        draft.spentAmount *
          getExchangeRate(draft.spentCurrency, profile.baseCurrency, remoteExchangeRates),
      ),
      baseCurrency: profile.baseCurrency,
      exchangeRate: getExchangeRate(draft.spentCurrency, profile.baseCurrency, remoteExchangeRates),
      countryCode: draft.countryCode,
      memo: draft.memo,
      groupName: draft.group || undefined,
      participants: draft.participants,
      receiptUrl: draft.receipt,
    });

    await refreshData();
  };

  const deleteExpense = async (expenseId: string) => {
    await api.delete(`/expenses/${expenseId}`);
    await refreshData();
  };

  const createPost = async (draft: CommunityPostDraft) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;

    await api.post("/community/posts", {
      userId: currentUser.id,
      content: draft.content,
      category: draft.category,
      imageUrl: draft.imageUrl ?? null,
    });

    await refreshData();
  };

  const deletePost = async (postId: string) => {
    await api.delete(`/community/posts/${postId}`);
    await refreshData();
  };

  const togglePostLike = async (postId: string) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post(`/community/posts/${postId}/like`, { userId: currentUser.id });
    await refreshData();
  };

  const updateProfileCurrency = async (countryCode: string) => {
    const currentUser = getStoredUser();
    if (!currentUser) {
      return;
    }

    const country = getCountryByCode(countryCode);
    const updatedProfile = await api.patch<UserProfile>(`/users/${currentUser.id}/profile`, {
      baseCountryCode: country.code,
      baseCurrency: country.currency,
    });
    localStorage.setItem(
      "kebo-auth-user",
      JSON.stringify({
        ...currentUser,
        baseCountryCode: updatedProfile.baseCountryCode,
        baseCurrency: updatedProfile.baseCurrency,
      }),
    );
    await refreshData();
  };

  const updateProfileName = async (name: string) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    setProfile((prev) => ({ ...prev, name }));
    localStorage.setItem("kebo-auth-user", JSON.stringify({ ...currentUser, name }));
    try {
      await api.patch(`/users/${currentUser.id}/profile`, { name });
    } catch {
      // optimistic update already applied
    }
  };

  const equipCharacter = async (characterId: number) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.patch("/rewards/equip", { userId: currentUser.id, characterId });
    setRewardSummary((prev) => ({ ...prev, equippedCharacterId: characterId }));
  };

  const selectStarter = async (characterId: number) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post("/rewards/starter", { userId: currentUser.id, characterId });
    setRewardSummary((prev) => ({
      ...prev,
      equippedCharacterId: characterId,
      ownedCharacterIds: [...prev.ownedCharacterIds, characterId],
    }));
  };

  const performGacha = async (count: 1 | 10): Promise<GachaResult> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const result = await api.post<GachaResult>("/rewards/gacha", {
      userId: currentUser.id,
      count,
    });
    setRewardSummary((prev) => ({
      ...prev,
      missionPoints: result.remainingPoints,
      gachaPityCount: result.gachaPityCount,
      legendaryPityCount: result.legendaryPityCount,
      ownedCharacterIds: [
        ...prev.ownedCharacterIds,
        ...result.results.filter((r) => !r.isDuplicate).map((r) => r.characterId),
      ],
    }));
    return result;
  };

  const openEgg = async (eggType: EggType): Promise<EggOpenResult> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const result = await api.post<EggOpenResult>("/rewards/egg/open", {
      userId: currentUser.id,
      eggType,
    });
    setRewardSummary((prev) => ({
      ...prev,
      normalEggs: prev.normalEggs - (eggType === "normal" ? 1 : 0),
      bigEggs: prev.bigEggs - (eggType === "big" ? 1 : 0),
      goldenEggs: prev.goldenEggs - (eggType === "golden" ? 1 : 0),
      missionPoints: prev.missionPoints + (result.isDuplicate ? result.points : 0),
      ownedCharacterIds: result.isDuplicate
        ? prev.ownedCharacterIds
        : [...prev.ownedCharacterIds, result.characterId],
    }));
    return result;
  };

  const refreshRewards = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
    setRewardSummary(normalizeRewardSummary(summary));
  };

  const equipTitle = async (titleId: number) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post("/rewards/titles/equip", { userId: currentUser.id, titleId });
    setRewardSummary((prev) => ({ ...prev, equippedTitleId: titleId }));
  };

  const unequipTitle = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post("/rewards/titles/unequip", { userId: currentUser.id });
    setRewardSummary((prev) => ({ ...prev, equippedTitleId: null }));
  };

  const checkTitles = async (): Promise<number[]> => {
    const currentUser = getStoredUser();
    if (!currentUser) return [];
    const result = await api.post<{ newlyUnlocked: number[] }>("/rewards/titles/check", {
      userId: currentUser.id,
    });
    if (result.newlyUnlocked.length > 0) {
      setRewardSummary((prev) => ({
        ...prev,
        ownedTitleIds: [
          ...prev.ownedTitleIds,
          ...result.newlyUnlocked.filter((id) => !prev.ownedTitleIds.includes(id)),
        ],
      }));
    }
    return result.newlyUnlocked;
  };

  const checkAchievements = async (): Promise<number[]> => {
    const currentUser = getStoredUser();
    if (!currentUser) return [];
    const result = await api.post<{ newlyUnlocked: number[] }>("/rewards/achievements/check", {
      userId: currentUser.id,
    });
    if (result.newlyUnlocked.length > 0) {
      setRewardSummary((prev) => ({
        ...prev,
        ownedCharacterIds: [
          ...prev.ownedCharacterIds,
          ...result.newlyUnlocked.filter((id) => !prev.ownedCharacterIds.includes(id)),
        ],
      }));
    }
    return result.newlyUnlocked;
  };

  const updateSettings = async (nextSettings: Partial<AppSettings>) => {
    const currentUser = getStoredUser();
    setSettings((current) => ({ ...current, ...nextSettings }));

    if (!currentUser) {
      return;
    }

    await api.patch(`/users/${currentUser.id}/settings`, nextSettings);
    await refreshData();
  };

  const monthlyTotals = useMemo(() => getMonthlyTotals(expenses), [expenses]);

  const value: AppDataContextValue = {
    hasInitialized,
    rewardsFailed,
    isLoading,
    profile,
    settings,
    countries,
    exchangeRates: remoteExchangeRates,
    expenses,
    posts,
    rewardSummary,
    monthlyTotals,
    createExpense,
    updateExpense,
    deleteExpense,
    createPost,
    deletePost,
    togglePostLike,
    updateProfileCurrency,
    updateSettings,
    equipCharacter,
    selectStarter,
    performGacha,
    openEgg,
    refreshRewards,
    checkAchievements,
    equipTitle,
    unequipTitle,
    checkTitles,
    getCountryName: (code: string) => getCountryByCode(code).name,
    refreshData,
    profilePhoto,
    updateProfilePhoto,
    updateProfileName,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }

  return context;
}
