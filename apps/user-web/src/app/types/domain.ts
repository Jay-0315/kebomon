import type { BattleEvent, CharInfo } from "../components/BattleReplay";

export type CurrencyCode = "KRW" | "JPY";

export interface CountryOption {
  code: string;
  name: string;
  currency: CurrencyCode;
  flag: string;
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
  challengeBest: number;
  dexMilestoneBest: number;
  attendanceClaimedToday: boolean;
  monthDays: number;
  monthWeekRewards: number;
}

export interface ExpeditionState {
  regionId: string;
  partyIds: number[];
  startTime: number;
  durationHours: number;
  durationMs: number;
  eventTemplateId: string | null;
  eventBonusMult: number | null;
}

export interface ExpeditionRewardResult {
  points: number;
  stones: number;
  normalEgg: number;
  bigEgg: number;
  goldEgg: number;
  expeditionCount: number;
  dexBonusMult?: number;
}

export interface RogueMilestone {
  clears: number;
  points: number;
  stones: number;
  normalEgg: number;
  bigEgg: number;
  goldEgg: number;
}

export interface ChallengeRankRow {
  rank: number;
  userId: string;
  nickname: string;
  best: number;
  characterId: number | null;
}

export interface ChallengeResult {
  challengeBest: number;
  prevBest: number;
  stage: number;
  isNewRecord: boolean;
  milestones: RogueMilestone[];
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
  language?: "ko" | "ja" | "en";
}

// ─── 길드 ────────────────────────────────────────────────────────────────────
export type GuildRole = "owner" | "officer" | "member";

export interface GuildSummary {
  id: string;
  name: string;
  iconId: string;
  notice: string | null;
  level: number;
  memberCount: number;
  maxMembers: number;
}

export interface GuildMemberInfo {
  userId: string;
  nickname: string;
  role: GuildRole;
  totalContribution: number;
  joinedAt: number;
}

export interface GuildDetail {
  id: string;
  name: string;
  iconId: string;
  notice: string | null;
  level: number;
  exp: number;
  expToNext: number;
  maxMembers: number;
  myRole: GuildRole;
  members: GuildMemberInfo[];
}

export interface GuildApplicationInfo {
  id: string;
  guildId: string;
  userId: string;
  message: string | null;
  createdAt: string;
  guild?: { id: string; name: string; iconId: string; level: number };
  user?: { name: string };
}

export interface GuildBossContributor {
  rank: number;
  userId: string;
  nickname: string;
  damage: number;
}

export interface GuildBossState {
  weekKey: string;
  bossId: number;
  hpRemaining: number;
  maxHp: number;
  cleared: boolean;
  attacksRemaining: number;
  dailyAttacksMax: number;
  myContribution: number;
  topContributors: GuildBossContributor[];
}

export interface GuildAttackResult {
  won: boolean;
  log: BattleEvent[];
  attackerChars: CharInfo[];
  defenderChars: CharInfo[];
  hpRemaining: number;
  maxHp: number;
  damageDealt: number;
  cleared: boolean;
  attacksRemaining: number;
}
