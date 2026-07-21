import {
  createContext,
  useContext,
  useEffect,
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
import {
  CHARACTERS as _CHARS,
  ACHIEVEMENTS as _ACHIEVEMENTS,
  GACHA_RATES,
  DEFAULT_PITY_RARE_THRESHOLD,
  DEFAULT_PITY_LEGENDARY_THRESHOLD,
} from "../data/characters";
const _VALID_CHAR_IDS = new Set(_CHARS.map((c) => c.id));
const _ACHIEVEMENT_CHAR_IDS = new Set(_ACHIEVEMENTS.map((a) => a.characterId));
const initialAppData = {
  profile: { id: "", name: "", email: "", baseCountryCode: "KR", baseCurrency: "KRW" as const },
  settings: { notifications: true, darkMode: false, themeColor: "default", language: "ko" as const },
};
import { applyThemePreset } from "../lib/theme-presets";
import { api } from "../lib/api";
import { clearAuthSession, getStoredUser } from "../lib/auth";
import type {
  AppSettings,
  CommunityPost,
  CommunityPostDraft,
  PostCategory,
  RewardSummary,
  RogueMilestone,
  ChallengeResult,
  ChallengeRankRow,
  ExpeditionState,
  ExpeditionRewardResult,
  UserProfile,
} from "../types/domain";

const SETTINGS_STORAGE_KEY = "kebo-local-settings";
const LANG_OVERRIDE_KEY = "kebo-lang-pending";
const profilePhotoKey = (userId: string) => `kebo-profile-photo-${userId}`;

export interface GachaConfig {
  gachaRates: Record<string, number>;
  pityRareThreshold: number;
  pityLegendaryThreshold: number;
}

export interface DailyQuests {
  progress: Record<string, boolean>;
  allDone: boolean;
  bonusClaimed: boolean;
}

interface AppDataContextValue {
  hasInitialized: boolean;
  rewardsFailed: boolean;
  isLoading: boolean;
  profile: UserProfile;
  settings: AppSettings;
  posts: CommunityPost[];
  rewardSummary: RewardSummary;
  characterMasterMap: Record<number, { rarity: string; rogueArchetype: string }>;
  gachaConfig: GachaConfig;
  dailyQuests: DailyQuests | null;
  fetchDailyQuests: () => Promise<void>;
  claimDailyQuestBonus: () => Promise<{ points: number } | null>;
  createPost: (draft: CommunityPostDraft) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  togglePostLike: (postId: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  equipCharacter: (characterId: number) => Promise<void>;
  selectStarter: (characterId: number) => Promise<void>;
  performGacha: (count: 1 | 10) => Promise<GachaResult>;
  openEgg: (eggType: EggType) => Promise<EggOpenResult>;
  openEggs: (eggType: EggType, count: number) => Promise<EggOpenResult[]>;
  refreshRewards: () => Promise<void>;
  refreshRewardsWithCheck: () => Promise<void>;
  checkAchievements: () => Promise<{ newlyUnlocked: number[]; dexMilestones: number[] }>;
  pendingAchievements: number[];
  clearPendingAchievements: () => void;
  equipTitle: (titleId: number) => Promise<void>;
  unequipTitle: () => Promise<void>;
  checkTitles: () => Promise<number[]>;
  equipBorder: (borderId: string) => Promise<void>;
  unequipBorder: () => Promise<void>;
  claimAttendance: () => Promise<{ alreadyClaimed: boolean; points: number; eggReward?: "big" | "golden" | null }>;
  buyShopItem: (itemId: string, quantity?: number) => Promise<{ success: boolean; remainingPoints: number; enhancementStones: number }>;
  enhanceCharacter: (characterId: number) => Promise<{ success: boolean; newLevel: number; remainingStones: number }>;
  startExpedition: (regionId: string, partyIds: number[], durationHours: number) => Promise<ExpeditionState>;
  getExpeditionState: () => Promise<ExpeditionState | null>;
  resolveExpeditionEvent: (risky: boolean) => Promise<{ eventBonusMult: number }>;
  completeExpedition: () => Promise<ExpeditionRewardResult>;
  startGameRun: () => Promise<void>;
  completeRogue: (difficulty?: string) => Promise<{ rogueClears: number; milestones: RogueMilestone[] } | null>;
  submitChallenge: (stage: number) => Promise<ChallengeResult | null>;
  fetchChallengeRankings: () => Promise<ChallengeRankRow[]>;
  refreshData: () => Promise<void>;
  profilePhoto: string | null;
  updateProfilePhoto: (photo: string | null) => void;
  updateProfileName: (name: string) => Promise<void>;
  updateBio: (bio: string) => Promise<void>;
  updateFavoriteCharacters: (favoriteCharacterIds: number[]) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function normalizeRewardSummary(summary: Partial<RewardSummary> | null | undefined): RewardSummary {
  return {
    attendanceDays: summary?.attendanceDays ?? 0,
    missionPoints: summary?.missionPoints ?? 0,
    streakDays: summary?.streakDays ?? 0,
    equippedCharacterId: summary?.equippedCharacterId ?? null,
    equippedTitleId: summary?.equippedTitleId ?? null,
    equippedBorderId: summary?.equippedBorderId ?? null,
    ownedBorderIds: summary?.ownedBorderIds ?? [],
    ownedCharacterIds: (summary?.ownedCharacterIds ?? []).filter((id) => _VALID_CHAR_IDS.has(id)),
    ownedTitleIds: summary?.ownedTitleIds ?? [],
    gachaPityCount: summary?.gachaPityCount ?? 0,
    legendaryPityCount: summary?.legendaryPityCount ?? 0,
    totalPointsUsed: summary?.totalPointsUsed ?? 0,
    normalEggs: summary?.normalEggs ?? 0,
    bigEggs: summary?.bigEggs ?? 0,
    goldenEggs: summary?.goldenEggs ?? 0,
    enhancementStones: summary?.enhancementStones ?? 0,
    characterEnhancements: summary?.characterEnhancements ?? {},
    raidCount: summary?.raidCount ?? 0,
    liveCount: summary?.liveCount ?? 0,
    expeditionCount: summary?.expeditionCount ?? 0,
    rogueClears: summary?.rogueClears ?? 0,
    challengeBest: summary?.challengeBest ?? 0,
    dexMilestoneBest: summary?.dexMilestoneBest ?? 0,
    attendanceClaimedToday: summary?.attendanceClaimedToday ?? false,
    monthDays: summary?.monthDays ?? 0,
    monthWeekRewards: summary?.monthWeekRewards ?? 0,
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
  const [pendingAchievements, setPendingAchievements] = useState<number[]>([]);
  const clearPendingAchievements = () => setPendingAchievements([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>(
    normalizeRewardSummary(undefined),
  );
  const [characterMasterMap, setCharacterMasterMap] = useState<
    Record<number, { rarity: string; rogueArchetype: string }>
  >({});
  const [gachaConfig, setGachaConfig] = useState<GachaConfig>({
    gachaRates: GACHA_RATES,
    pityRareThreshold: DEFAULT_PITY_RARE_THRESHOLD,
    pityLegendaryThreshold: DEFAULT_PITY_LEGENDARY_THRESHOLD,
  });
  const [dailyQuests, setDailyQuests] = useState<DailyQuests | null>(null);
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

    const pendingLang = localStorage.getItem(LANG_OVERRIDE_KEY) as import("../lib/i18n").Lang | null;
    if (pendingLang) {
      localStorage.removeItem(LANG_OVERRIDE_KEY);
      api.patch(`/users/${currentUser.id}/settings`, { language: pendingLang }).catch(() => {});
    }

    setIsLoading(true);
    const [profileResult, postsResult, rewardsResult, characterMasterResult, gachaConfigResult, dailyQuestsResult] =
      await Promise.allSettled([
        api.get<{
          id: string;
          name: string;
          email: string;
          baseCountryCode: string;
          baseCurrency: string;
          profilePhoto?: string | null;
          hasPassword?: boolean;
          bio?: string | null;
          favoriteCharacterIds?: number[];
          settings?: AppSettings;
        }>(`/users/${currentUser.id}/profile`),
        api.get<{ posts: Record<string, unknown>[] }>(`/community/posts?userId=${currentUser.id}`),
        api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`),
        api.get<Record<number, { rarity: string; rogueArchetype: string }>>("/rewards/character-master"),
        api.get<GachaConfig>("/rewards/gacha-config"),
        api.get<DailyQuests>("/rewards/quests/today"),
      ]);

    if (profileResult.status === "rejected") {
      const err = profileResult.reason as { status?: number };
      if (err?.status === 404 || err?.status === 401 || err?.status === 403) {
        clearAuthSession();
        window.location.href = "/login";
        return;
      }
    }

    if (profileResult.status === "fulfilled") {
      const p = profileResult.value;
      setProfile({
        id: p.id,
        name: p.name,
        email: p.email,
        baseCountryCode: p.baseCountryCode,
        baseCurrency: p.baseCurrency as UserProfile["baseCurrency"],
        hasPassword: p.hasPassword ?? false,
        bio: p.bio ?? null,
        favoriteCharacterIds: p.favoriteCharacterIds ?? [],
      });
      if (p.settings) {
        const srv = p.settings as AppSettings;
        setSettings((prev) => ({
          ...prev,
          ...srv,
          language: pendingLang ?? srv.language ?? prev.language,
        }));
      } else if (pendingLang) {
        setSettings((prev) => ({ ...prev, language: pendingLang }));
      }
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
    if (postsResult.status === "fulfilled") {
      setPosts(postsResult.value.posts.map(mapPost));
    }
    if (rewardsResult.status === "fulfilled") {
      setRewardSummary(normalizeRewardSummary(rewardsResult.value));
      setRewardsFailed(false);
    } else {
      setRewardsFailed(true);
    }
    if (characterMasterResult.status === "fulfilled") {
      setCharacterMasterMap(characterMasterResult.value);
    }
    if (gachaConfigResult.status === "fulfilled") {
      setGachaConfig(gachaConfigResult.value);
    }
    if (dailyQuestsResult.status === "fulfilled") {
      setDailyQuests(dailyQuestsResult.value);
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

  const updateBio = async (bio: string) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    setProfile((prev) => ({ ...prev, bio }));
    try {
      await api.patch(`/users/${currentUser.id}/profile`, { bio });
    } catch {
      // optimistic update already applied
    }
  };

  const updateFavoriteCharacters = async (favoriteCharacterIds: number[]) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    setProfile((prev) => ({ ...prev, favoriteCharacterIds }));
    try {
      await api.patch(`/users/${currentUser.id}/profile`, { favoriteCharacterIds });
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
    void fetchDailyQuests();
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

  const openEggs = async (eggType: EggType, count: number): Promise<EggOpenResult[]> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const results = await api.post<EggOpenResult[]>("/rewards/egg/open-batch", {
      userId: currentUser.id,
      eggType,
      count,
    });
    const newCharIds = results.filter((r) => !r.isDuplicate).map((r) => r.characterId);
    const totalDupPoints = results.reduce((sum, r) => sum + (r.isDuplicate ? r.points : 0), 0);
    setRewardSummary((prev) => ({
      ...prev,
      normalEggs: prev.normalEggs - (eggType === "normal" ? count : 0),
      bigEggs: prev.bigEggs - (eggType === "big" ? count : 0),
      goldenEggs: prev.goldenEggs - (eggType === "golden" ? count : 0),
      missionPoints: prev.missionPoints + totalDupPoints,
      ownedCharacterIds: [...prev.ownedCharacterIds, ...newCharIds],
    }));
    return results;
  };

  const refreshRewards = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
    setRewardSummary(normalizeRewardSummary(summary));
  };

  const refreshRewardsWithCheck = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    const prevOwnedIds = new Set(rewardSummary.ownedCharacterIds);
    const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
    const newSummary = normalizeRewardSummary(summary);
    setRewardSummary(newSummary);
    const newAchievementChars = newSummary.ownedCharacterIds.filter(
      (id) => !prevOwnedIds.has(id) && _ACHIEVEMENT_CHAR_IDS.has(id),
    );
    if (newAchievementChars.length > 0) {
      setPendingAchievements((prev) => [...new Set([...prev, ...newAchievementChars])]);
    }
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

  const equipBorder = async (borderId: string) => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post("/rewards/borders/equip", { userId: currentUser.id, borderId });
    setRewardSummary((prev) => ({ ...prev, equippedBorderId: borderId }));
  };

  const unequipBorder = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post("/rewards/borders/unequip", { userId: currentUser.id });
    setRewardSummary((prev) => ({ ...prev, equippedBorderId: null }));
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

  const claimAttendance = async (): Promise<{ alreadyClaimed: boolean; points: number }> => {
    const currentUser = getStoredUser();
    if (!currentUser) return { alreadyClaimed: true, points: 0 };
    const result = await api.post<{
      alreadyClaimed: boolean;
      points: number;
      streakDays: number;
      attendanceDays: number;
      monthDays: number;
      monthWeekRewards: number;
      eggReward?: "big" | "golden" | null;
    }>(
      "/rewards/attendance/claim",
      { userId: currentUser.id },
    );
    if (!result.alreadyClaimed) {
      setRewardSummary((prev) => ({
        ...prev,
        missionPoints: prev.missionPoints + result.points,
        attendanceDays: result.attendanceDays,
        streakDays: result.streakDays,
        attendanceClaimedToday: true,
        monthDays: result.monthDays,
        monthWeekRewards: result.monthWeekRewards,
        bigEggs: result.eggReward === "big" ? prev.bigEggs + 1 : prev.bigEggs,
        goldenEggs: result.eggReward === "golden" ? prev.goldenEggs + 1 : prev.goldenEggs,
      }));
      void fetchDailyQuests();
    }
    return { alreadyClaimed: result.alreadyClaimed, points: result.points };
  };

  const fetchDailyQuests = async () => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    try {
      setDailyQuests(await api.get<DailyQuests>("/rewards/quests/today"));
    } catch {
      // 실패해도 위젯이 조용히 숨겨지므로 별도 처리 불필요
    }
  };

  const claimDailyQuestBonus = async (): Promise<{ points: number } | null> => {
    const currentUser = getStoredUser();
    if (!currentUser) return null;
    try {
      const result = await api.post<{ points: number }>("/rewards/quests/claim");
      setDailyQuests((prev) => (prev ? { ...prev, bonusClaimed: true } : prev));
      setRewardSummary((prev) => ({ ...prev, missionPoints: prev.missionPoints + result.points }));
      return result;
    } catch {
      return null;
    }
  };

  const checkAchievements = async (): Promise<{ newlyUnlocked: number[]; dexMilestones: number[] }> => {
    const currentUser = getStoredUser();
    if (!currentUser) return { newlyUnlocked: [], dexMilestones: [] };
    const result = await api.post<{ newlyUnlocked: number[]; dexMilestones?: number[] }>(
      "/rewards/achievements/check",
      { userId: currentUser.id },
    );
    const dexMilestones = result.dexMilestones ?? [];
    if (result.newlyUnlocked.length > 0 || dexMilestones.length > 0) {
      const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
      setRewardSummary(normalizeRewardSummary(summary));
      setPendingAchievements((prev) => [...new Set([...prev, ...result.newlyUnlocked])]);
    }
    return { newlyUnlocked: result.newlyUnlocked, dexMilestones };
  };

  const buyShopItem = async (itemId: string, quantity = 1): Promise<{ success: boolean; remainingPoints: number; enhancementStones: number }> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const result = await api.post<{ success: boolean; remainingPoints: number; enhancementStones: number }>("/rewards/shop/buy", {
      userId: currentUser.id,
      itemId,
      quantity,
    });
    setRewardSummary((prev) => ({
      ...prev,
      missionPoints: result.remainingPoints,
      enhancementStones: result.enhancementStones,
    }));
    return result;
  };

  const startExpedition = async (regionId: string, partyIds: number[], durationHours: number): Promise<ExpeditionState> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    return api.post<ExpeditionState>("/rewards/expedition/start", {
      userId: currentUser.id, regionId, partyIds, durationHours,
    });
  };

  const getExpeditionState = async (): Promise<ExpeditionState | null> => {
    const currentUser = getStoredUser();
    if (!currentUser) return null;
    return api.get<ExpeditionState | null>(`/rewards/expedition/state?userId=${currentUser.id}`);
  };

  const resolveExpeditionEvent = async (risky: boolean): Promise<{ eventBonusMult: number }> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    return api.post<{ eventBonusMult: number }>("/rewards/expedition/event", {
      userId: currentUser.id, risky,
    });
  };

  const completeExpedition = async (): Promise<ExpeditionRewardResult> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const prevOwnedIds = new Set(rewardSummary.ownedCharacterIds);
    const result = await api.post<ExpeditionRewardResult>("/rewards/expedition/complete", { userId: currentUser.id });
    const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
    const newSummary = normalizeRewardSummary(summary);
    setRewardSummary(newSummary);
    const newAchievementChars = newSummary.ownedCharacterIds.filter(
      (id) => !prevOwnedIds.has(id) && _ACHIEVEMENT_CHAR_IDS.has(id),
    );
    if (newAchievementChars.length > 0) {
      setPendingAchievements((prev) => [...new Set([...prev, ...newAchievementChars])]);
    }
    return result;
  };

  const startGameRun = async (): Promise<void> => {
    const currentUser = getStoredUser();
    if (!currentUser) return;
    await api.post("/rewards/run/start", { userId: currentUser.id }).catch(() => undefined);
  };

  const completeRogue = async (difficulty = "normal"): Promise<{ rogueClears: number; milestones: RogueMilestone[] } | null> => {
    const currentUser = getStoredUser();
    if (!currentUser) return null;
    const prevOwnedIds = new Set(rewardSummary.ownedCharacterIds);
    const result = await api.post<{ rogueClears: number; milestones: RogueMilestone[] }>(
      "/rewards/rogue/complete",
      { userId: currentUser.id, difficulty },
    );
    const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
    const newSummary = normalizeRewardSummary(summary);
    setRewardSummary(newSummary);
    const newAchievementChars = newSummary.ownedCharacterIds.filter(
      (id) => !prevOwnedIds.has(id) && _ACHIEVEMENT_CHAR_IDS.has(id),
    );
    if (newAchievementChars.length > 0) {
      setPendingAchievements((prev) => [...new Set([...prev, ...newAchievementChars])]);
    }
    return result;
  };

  const submitChallenge = async (stage: number): Promise<ChallengeResult | null> => {
    const currentUser = getStoredUser();
    if (!currentUser) return null;
    const result = await api.post<ChallengeResult>("/rewards/challenge/submit", {
      userId: currentUser.id,
      stage,
    });
    const summary = await api.get<RewardSummary>(`/rewards/summary?userId=${currentUser.id}`);
    setRewardSummary(normalizeRewardSummary(summary));
    return result;
  };

  const fetchChallengeRankings = async (): Promise<ChallengeRankRow[]> => {
    try {
      const res = await api.get<{ rankings: ChallengeRankRow[] }>("/rewards/challenge-rankings");
      return res.rankings ?? [];
    } catch {
      return [];
    }
  };

  const enhanceCharacter = async (characterId: number): Promise<{ success: boolean; newLevel: number; remainingStones: number }> => {
    const currentUser = getStoredUser();
    if (!currentUser) throw new Error("로그인이 필요합니다.");
    const result = await api.post<{ success: boolean; newLevel: number; remainingStones: number }>("/rewards/enhance", {
      userId: currentUser.id,
      characterId,
    });
    setRewardSummary((prev) => ({
      ...prev,
      enhancementStones: result.remainingStones,
      characterEnhancements: {
        ...prev.characterEnhancements,
        [characterId]: result.newLevel,
      },
    }));
    return result;
  };

  const updateSettings = async (nextSettings: Partial<AppSettings>) => {
    const currentUser = getStoredUser();
    setSettings((current) => ({ ...current, ...nextSettings }));

    if (!currentUser) {
      if (nextSettings.language) {
        localStorage.setItem(LANG_OVERRIDE_KEY, nextSettings.language);
      }
      return;
    }

    await api.patch(`/users/${currentUser.id}/settings`, nextSettings);
    await refreshData();
  };

  const value: AppDataContextValue = {
    hasInitialized,
    rewardsFailed,
    isLoading,
    profile,
    settings,
    posts,
    rewardSummary,
    characterMasterMap,
    gachaConfig,
    dailyQuests,
    fetchDailyQuests,
    claimDailyQuestBonus,
    createPost,
    deletePost,
    togglePostLike,
    updateSettings,
    equipCharacter,
    selectStarter,
    performGacha,
    openEgg,
    openEggs,
    refreshRewards,
    refreshRewardsWithCheck,
    checkAchievements,
    pendingAchievements,
    clearPendingAchievements,
    equipTitle,
    unequipTitle,
    checkTitles,
    equipBorder,
    unequipBorder,
    claimAttendance,
    buyShopItem,
    enhanceCharacter,
    startExpedition,
    getExpeditionState,
    resolveExpeditionEvent,
    completeExpedition,
    startGameRun,
    completeRogue,
    submitChallenge,
    fetchChallengeRankings,
    refreshData,
    profilePhoto,
    updateProfilePhoto,
    updateProfileName,
    updateBio,
    updateFavoriteCharacters,
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
