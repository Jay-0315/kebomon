export type CurrencyCode = "KRW" | "JPY";

export interface CountryOption {
  code: string;
  name: string;
  currency: CurrencyCode;
  flag: string;
}

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  spentAmount: number;
  spentCurrency: CurrencyCode;
  baseAmount: number;
  baseCurrency: CurrencyCode;
  exchangeRate: number;
  countryCode: string;
  memo: string;
  group?: string;
  participants?: number;
  receipt?: string;
  sharedToCommunity: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDraft {
  date: string;
  category: string;
  spentAmount: number;
  spentCurrency: CurrencyCode;
  countryCode: string;
  memo: string;
  group?: string;
  groupId?: string;
  participants?: number;
  receipt?: string;
}

export type PostCategory = "brag" | "tip" | "chat";

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorEquippedTitleId?: number | null;
  authorEquippedBorderId?: string | null;
  parentId: string | null;
  content: string;
  imageUrl: string | null;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentDraft {
  content: string;
  imageUrl?: string;
  parentId?: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string | null;
  authorEquippedTitleId?: number | null;
  authorEquippedBorderId?: string | null;
  content: string;
  category: PostCategory;
  imageUrl: string | null;
  likes: number;
  isLiked: boolean;
  commentCount: number;
  recentComments: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPostDraft {
  content: string;
  category: PostCategory;
  imageUrl?: string;
}

export interface CommentsPage {
  comments: Comment[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PostsPage {
  posts: CommunityPost[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
}

export interface RewardSummary {
  attendanceDays: number;
  missionPoints: number;
  streakDays: number;
  equippedCharacterId: number | null;
  equippedTitleId: number | null;
  equippedBorderId: string | null;
  ownedBorderIds: string[];
  ownedCharacterIds: number[];
  ownedTitleIds: number[];
  gachaPityCount: number;
  legendaryPityCount: number;
  totalPointsUsed: number;
  normalEggs: number;
  bigEggs: number;
  goldenEggs: number;
  enhancementStones: number;
  characterEnhancements: Record<number, number>;
  raidCount: number;
  liveCount: number;
  expeditionCount: number;
  rogueClears: number;
  attendanceClaimedToday: boolean;
  monthDays: number;
  monthWeekRewards: number;
}

export interface RogueMilestone {
  clears: number;
  points: number;
  stones: number;
  normalEgg: number;
  bigEgg: number;
  goldEgg: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  baseCountryCode: string;
  baseCurrency: CurrencyCode;
  hasPassword?: boolean;
}

export interface AppSettings {
  notifications: boolean;
  darkMode: boolean;
themeColor: string;
  language?: "ko" | "ja";
}

export interface AppData {
  profile: UserProfile;
  settings: AppSettings;
  countries: CountryOption[];
  exchangeRates: ExchangeRate[];
  expenses: Expense[];
  posts: CommunityPost[];
}
