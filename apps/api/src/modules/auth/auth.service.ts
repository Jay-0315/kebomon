import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthProvider } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { RewardsService } from "../rewards/rewards.service";
import { EmailService } from "./email.service";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SendVerificationDto } from "./dto/send-verification.dto";
import { SocialLoginDto, SocialProvider } from "./dto/social-login.dto";
import { SignupDto } from "./dto/signup.dto";
import { isSuspensionExpired, reactivateIfExpired } from "./suspension.util";

const CODE_TTL_MS = 10 * 60 * 1000; // 10분

// 신규 가입 축하 선물 — 프론트 welcome_gift.* i18n 문구와 값이 동일해야 함
const WELCOME_GIFT_POINTS = 2400;
const WELCOME_GIFT_NORMAL_EGGS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardsService: RewardsService,
    private readonly emailService: EmailService,
  ) {}

  async sendVerificationCode(
    dto: SendVerificationDto,
  ): Promise<{ message: string }> {
    if (dto.purpose === "SIGNUP") {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) throw new ConflictException("이미 가입된 이메일입니다.");
    }

    if (dto.purpose === "RESET_PASSWORD") {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      // 서버 로직으로 제약: 비밀번호 없는 소셜 전용 계정은 재설정 불가
      if (!existing)
        throw new BadRequestException("가입되지 않은 이메일입니다.");
      if (!existing.hasPassword) {
        throw new BadRequestException(
          "소셜 로그인으로만 가입된 계정입니다. 소셜 로그인을 이용해주세요.",
        );
      }
    }

    // 이전 미사용 코드 무효화
    await this.prisma.emailVerificationCode.updateMany({
      where: { email: dto.email, purpose: dto.purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await this.prisma.emailVerificationCode.create({
      data: { email: dto.email, code, purpose: dto.purpose, expiresAt },
    });

    if (dto.purpose === "SIGNUP") {
      await this.emailService.sendVerificationCode(dto.email, code, dto.lang);
    } else {
      await this.emailService.sendPasswordResetCode(dto.email, code, dto.lang);
    }

    return { message: "인증번호가 발송됐습니다." };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // 서버 로직으로 비밀번호 일치 검증
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("새 비밀번호가 일치하지 않습니다.");
    }

    await this.consumeVerificationCode(dto.email, dto.code, "RESET_PASSWORD");

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new BadRequestException("가입되지 않은 이메일입니다.");

    // 서버 로직으로 제약: 소셜 전용 계정은 비밀번호 재설정 불가
    if (!user.hasPassword) {
      throw new BadRequestException("소셜 로그인으로만 가입된 계정입니다.");
    }

    // 기존 비밀번호와 동일하면 변경 불가
    if (user.passwordHash) {
      const isSame = await compare(dto.newPassword, user.passwordHash);
      if (isSame) {
        throw new BadRequestException("이전 비밀번호와 일치합니다.");
      }
    }

    const passwordHash = await hash(dto.newPassword, 10);

    // 비밀번호 업데이트 (없으면 insert, 있으면 update → upsert로 처리)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, hasPassword: true },
      }),
      // 비밀번호 변경 이력: 없으면 insert, 있으면 changed_at update
      this.prisma.passwordChangeHistory.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: { changedAt: new Date() },
      }),
    ]);

    return { message: "비밀번호가 변경됐습니다." };
  }

  private async consumeVerificationCode(
    email: string,
    code: string,
    purpose: "SIGNUP" | "RESET_PASSWORD",
  ): Promise<void> {
    const record = await this.prisma.emailVerificationCode.findFirst({
      where: { email, purpose, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.code !== code) {
      throw new BadRequestException("인증번호가 올바르지 않습니다.");
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        "인증번호가 만료됐습니다. 다시 요청해주세요.",
      );
    }

    await this.prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
  }

  async signup(dto: SignupDto) {
    await this.consumeVerificationCode(
      dto.email,
      dto.verificationCode,
      "SIGNUP",
    );

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("이미 가입된 이메일입니다.");
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        hasPassword: true,
        baseCountryCode: "KR",
        baseCurrency: "KRW",
        settings: {
          create: { welcomeGiftSeen: false },
        },
        reward: {
          create: { missionPoints: WELCOME_GIFT_POINTS, normalEggs: WELCOME_GIFT_NORMAL_EGGS },
        },
      },
    });

    return this.buildAuthResponse(user, true);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException(
        "이메일 또는 비밀번호가 올바르지 않습니다.",
      );
    }

    const matched = await compare(dto.password, user.passwordHash);
    if (!matched) {
      throw new UnauthorizedException(
        "이메일 또는 비밀번호가 올바르지 않습니다.",
      );
    }

    return this.buildAuthResponse(user);
  }

  async socialLogin(dto: SocialLoginDto) {
    if (dto.provider !== SocialProvider.GOOGLE) {
      throw new NotImplementedException(
        `${dto.provider} 소셜 로그인 서버 검증은 아직 설정되지 않았습니다.`,
      );
    }

    if (!dto.identityToken) {
      throw new UnauthorizedException("Google identity token이 필요합니다.");
    }

    const profile = await this.verifyGoogleIdentityToken(dto.identityToken);

    if (!profile.email) {
      throw new UnauthorizedException(
        "Google 계정 이메일을 확인할 수 없습니다.",
      );
    }

    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GOOGLE,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (existingIdentity) {
      return this.buildAuthResponse(existingIdentity.user);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUser) {
      await this.prisma.userIdentity.create({
        data: {
          userId: existingUser.id,
          provider: AuthProvider.GOOGLE,
          providerUserId: profile.providerUserId,
          providerEmail: profile.email,
        },
      });

      return this.buildAuthResponse(existingUser);
    }

    const user = await this.prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        passwordHash: null,
        baseCountryCode: "KR",
        baseCurrency: "KRW",
        settings: {
          create: { welcomeGiftSeen: false },
        },
        reward: {
          create: { missionPoints: WELCOME_GIFT_POINTS, normalEggs: WELCOME_GIFT_NORMAL_EGGS },
        },
        identities: {
          create: {
            provider: AuthProvider.GOOGLE,
            providerUserId: profile.providerUserId,
            providerEmail: profile.email,
          },
        },
      },
    });

    return this.buildAuthResponse(user, true);
  }

  async getLinkedProviders(userId: string) {
    const identities = await this.prisma.userIdentity.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return {
      providers: [this.mapProviderStatus(SocialProvider.GOOGLE, identities)],
    };
  }

  async linkSocialIdentity(userId: string, dto: SocialLoginDto) {
    if (dto.provider !== SocialProvider.GOOGLE) {
      throw new NotImplementedException(
        `${dto.provider} 소셜 연동은 아직 설정되지 않았습니다.`,
      );
    }

    if (!dto.identityToken) {
      throw new BadRequestException("Google identity token이 필요합니다.");
    }

    const profile = await this.verifyGoogleIdentityToken(dto.identityToken);

    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GOOGLE,
          providerUserId: profile.providerUserId,
        },
      },
    });

    if (existingIdentity && existingIdentity.userId !== userId) {
      throw new ConflictException("이미 다른 계정에 연결된 Google 계정입니다.");
    }

    const currentIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: AuthProvider.GOOGLE,
        },
      },
    });

    if (
      currentIdentity &&
      currentIdentity.providerUserId !== profile.providerUserId
    ) {
      throw new ConflictException(
        "이 계정에는 이미 다른 Google 계정이 연결되어 있습니다.",
      );
    }

    if (!currentIdentity) {
      await this.prisma.userIdentity.create({
        data: {
          userId,
          provider: AuthProvider.GOOGLE,
          providerUserId: profile.providerUserId,
          providerEmail: profile.email,
        },
      });
    }

    return {
      linked: true,
      provider: SocialProvider.GOOGLE,
      providerEmail: profile.email,
    };
  }

  private async verifyGoogleIdentityToken(identityToken: string) {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(identityToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException(
        "Google identity token 검증에 실패했습니다.",
      );
    }

    const payload = (await response.json()) as {
      aud?: string;
      sub?: string;
      email?: string;
      email_verified?: string;
      name?: string;
    };

    const clientIds = (
      process.env.GOOGLE_CLIENT_IDS ||
      process.env.GOOGLE_CLIENT_ID ||
      ""
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (clientIds.length === 0) {
      throw new NotImplementedException(
        "GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_IDS가 설정되지 않았습니다.",
      );
    }

    if (!payload.aud || !clientIds.includes(payload.aud)) {
      throw new UnauthorizedException(
        "Google identity token의 aud가 일치하지 않습니다.",
      );
    }

    if (!payload.sub) {
      throw new UnauthorizedException(
        "Google 계정 식별자를 확인할 수 없습니다.",
      );
    }

    if (payload.email_verified !== "true") {
      throw new UnauthorizedException("Google 이메일 인증이 필요합니다.");
    }

    return {
      providerUserId: payload.sub,
      email: payload.email ?? null,
      name: payload.name?.trim() || "Google User",
    };
  }

  private async resolveNeedsStarter(userId: string) {
    const ownedCharacterCount = await this.prisma.userCharacter.count({
      where: { userId },
    });

    return ownedCharacterCount === 0;
  }

  private mapProviderStatus(
    provider: SocialProvider,
    identities: {
      provider: AuthProvider;
      providerEmail: string | null;
      createdAt: Date;
    }[],
  ) {
    const matched = identities.find(
      (identity) => identity.provider === provider,
    );

    return {
      provider,
      linked: Boolean(matched),
      providerEmail: matched?.providerEmail ?? null,
      linkedAt: matched?.createdAt.toISOString() ?? null,
    };
  }

  private async buildAuthResponse(
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status?: string;
      suspendedUntil?: Date | null;
      baseCountryCode: string;
      baseCurrency: string;
      hasPassword?: boolean;
    },
    needsStarterOverride?: boolean,
  ) {
    if (user.status === "SUSPENDED") {
      const suspendedUntil = user.suspendedUntil ?? null;
      if (isSuspensionExpired({ status: user.status, suspendedUntil })) {
        await reactivateIfExpired(this.prisma, { id: user.id, status: user.status, suspendedUntil });
      } else if (suspendedUntil) {
        throw new UnauthorizedException(
          `정지된 계정입니다. (${suspendedUntil.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}까지 정지)`,
        );
      } else {
        throw new UnauthorizedException("정지된 계정입니다. 고객센터로 문의해주세요.");
      }
    }

    const needsStarter =
      needsStarterOverride ?? (await this.resolveNeedsStarter(user.id));

    void this.rewardsService.recordAttendance(user.id).catch(() => undefined);

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "kebo-dev-secret",
      {
        expiresIn: "7d",
      },
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        baseCountryCode: user.baseCountryCode,
        baseCurrency: user.baseCurrency,
        hasPassword: user.hasPassword ?? false,
      },
      needsStarter,
    };
  }
}
