import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UpdateUserSettingsDto } from "./dto/update-user-settings.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePhoto: user.profilePhoto ?? null,
      hasPassword: user.hasPassword,
      bio: user.bio ?? null,
      favoriteCharacterIds: (user.favoriteCharacterIds as number[] | null) ?? [],
      settings: user.settings
        ? {
            notifications: user.settings.notifications,
            darkMode: user.settings.darkMode,
            themeColor: user.settings.themeColor,
            language: user.settings.language,
            hasSeenTutorial: user.settings.hasSeenTutorial,
            welcomeGiftSeen: user.settings.welcomeGiftSeen,
          }
        : {
            notifications: true,
            darkMode: true,
            themeColor: "emerald",
            language: "ko",
            hasSeenTutorial: false,
            welcomeGiftSeen: false,
          },
    };
  }

  /** 다른 유저에게 공개해도 되는 필드만 반환 (랭킹 → 프로필 딥링크용) */
  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        bio: true,
        favoriteCharacterIds: true,
        reward: {
          select: { equippedCharacterId: true, equippedTitleId: true, equippedBorderId: true },
        },
        battleStats: {
          select: { tierPoints: true, wins: true, losses: true, bestStreak: true },
        },
        duelStats: {
          select: { wins: true, losses: true, bestStreak: true },
        },
      },
    });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");

    return {
      id: user.id,
      name: user.name,
      profilePhoto: user.profilePhoto ?? null,
      bio: user.bio ?? null,
      favoriteCharacterIds: (user.favoriteCharacterIds as number[] | null) ?? [],
      equippedCharacterId: user.reward?.equippedCharacterId ?? null,
      equippedTitleId: user.reward?.equippedTitleId ?? null,
      equippedBorderId: user.reward?.equippedBorderId ?? null,
      arena: {
        tierPoints: user.battleStats?.tierPoints ?? 0,
        wins: user.battleStats?.wins ?? 0,
        losses: user.battleStats?.losses ?? 0,
        bestStreak: user.battleStats?.bestStreak ?? 0,
      },
      duel: {
        wins: user.duelStats?.wins ?? 0,
        losses: user.duelStats?.losses ?? 0,
        bestStreak: user.duelStats?.bestStreak ?? 0,
      },
    };
  }

  /** 유저 이름 검색 (공개 프로필 진입용) — 이메일 등 비공개 필드는 제외 */
  async searchUsers(q: string) {
    const query = q.trim();
    if (!query) return [];

    const users = await this.prisma.user.findMany({
      where: { name: { contains: query } },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        reward: { select: { equippedTitleId: true, equippedBorderId: true } },
      },
      take: 20,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      profilePhoto: u.profilePhoto ?? null,
      equippedTitleId: u.reward?.equippedTitleId ?? null,
      equippedBorderId: u.reward?.equippedBorderId ?? null,
    }));
  }

  async updateProfilePhoto(userId: string, photo: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    await this.prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: photo },
    });
    return { success: true };
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!current) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    let favoriteCharacterIds: number[] | undefined;
    if (dto.favoriteCharacterIds !== undefined) {
      // 실제 보유한 캐릭터만 진열 가능하도록 서버측 검증
      const owned = await this.prisma.userCharacter.findMany({
        where: { userId, characterId: { in: dto.favoriteCharacterIds } },
        select: { characterId: true },
      });
      const ownedSet = new Set(owned.map((c) => c.characterId));
      favoriteCharacterIds = dto.favoriteCharacterIds.filter((id) => ownedSet.has(id));
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(favoriteCharacterIds !== undefined ? { favoriteCharacterIds } : {}),
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio ?? null,
      favoriteCharacterIds: (user.favoriteCharacterIds as number[] | null) ?? [],
    };
  }

  async deleteUser(requesterId: string, targetId: string) {
    if (requesterId !== targetId) {
      throw new ForbiddenException("본인 계정만 삭제할 수 있습니다.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다.");
    await this.prisma.user.delete({ where: { id: targetId } });
    return { success: true };
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    return this.prisma.appSetting.upsert({
      where: { userId },
      create: {
        userId,
        notifications: dto.notifications ?? true,
        darkMode: dto.darkMode ?? true,
        themeColor: dto.themeColor ?? "emerald",
        language: dto.language ?? "ko",
        hasSeenTutorial: dto.hasSeenTutorial ?? false,
        welcomeGiftSeen: dto.welcomeGiftSeen ?? false,
      },
      update: {
        ...(dto.notifications !== undefined ? { notifications: dto.notifications } : {}),
        ...(dto.darkMode !== undefined ? { darkMode: dto.darkMode } : {}),
        ...(dto.themeColor !== undefined ? { themeColor: dto.themeColor } : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
        ...(dto.hasSeenTutorial !== undefined ? { hasSeenTutorial: dto.hasSeenTutorial } : {}),
        ...(dto.welcomeGiftSeen !== undefined ? { welcomeGiftSeen: dto.welcomeGiftSeen } : {}),
      },
    });
  }
}
