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
      baseCountryCode: user.baseCountryCode,
      baseCurrency: user.baseCurrency,
      profilePhoto: user.profilePhoto ?? null,
      hasPassword: user.hasPassword,
      settings: user.settings
        ? {
            notifications: user.settings.notifications,
            darkMode: user.settings.darkMode,
            themeColor: user.settings.themeColor,
            language: user.settings.language,
          }
        : {
            notifications: true,
            darkMode: true,
            themeColor: "emerald",
            language: "ko",
          },
    };
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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.baseCountryCode ? { baseCountryCode: dto.baseCountryCode } : {}),
        ...(dto.baseCurrency ? { baseCurrency: dto.baseCurrency } : {}),
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      baseCountryCode: user.baseCountryCode,
      baseCurrency: user.baseCurrency,
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
      },
      update: {
        ...(dto.notifications !== undefined ? { notifications: dto.notifications } : {}),
        ...(dto.darkMode !== undefined ? { darkMode: dto.darkMode } : {}),
        ...(dto.themeColor !== undefined ? { themeColor: dto.themeColor } : {}),
        ...(dto.language !== undefined ? { language: dto.language } : {}),
      },
    });
  }
}
