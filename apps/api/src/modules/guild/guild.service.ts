import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CommunityService } from "../community/community.service";
import { ArenaService } from "../arena/arena.service";
import { RewardsService } from "../rewards/rewards.service";
import { cronWindowKey, runSingletonCron } from "../common/cron-lock.util";
import { logPointsChange } from "../rewards/points-ledger.util";
import { randomBoss } from "../gateway/raid.gateway";
import {
  APPLICATION_MESSAGE_MAX_LEN,
  BOSS_CLEAR_GUILD_EXP,
  DAILY_BOSS_ATTACKS,
  GUILD_NAME_MAX_LEN,
  GUILD_NOTICE_MAX_LEN,
  applyGuildExp,
  calcBossMaxHp,
  calcEncounterHp,
  getBossEnhLevel,
  getBossRankReward,
  getGuildLevelInfo,
  getIsoWeekKey,
  isValidGuildIconId,
  type GuildBossRankReward,
} from "./guild.constants";

function kstDateStr(d: Date): string {
  return new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
}

@Injectable()
export class GuildService {
  private readonly logger = new Logger(GuildService.name);
  // 정산이 다음 주 월요일 tick 전에 안 끝났을 경우의 재진입 방지 (매우 오래 걸릴 때 대비)
  private settlingBossRuns = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly community: CommunityService,
    private readonly arena: ArenaService,
    private readonly rewards: RewardsService,
  ) {}

  private async requireMembership(userId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member) throw new BadRequestException("소속된 길드가 없습니다.");
    return member;
  }

  // ─── 조회 ──────────────────────────────────────────────────────────────────
  async listGuilds(search?: string) {
    const guilds = await this.prisma.guild.findMany({
      where: search ? { name: { contains: search } } : undefined,
      orderBy: [{ level: "desc" }, { exp: "desc" }],
      take: 30,
      include: { _count: { select: { members: true } } },
    });
    return guilds.map((g) => ({
      id: g.id,
      name: g.name,
      iconId: g.iconId,
      notice: g.notice,
      level: g.level,
      memberCount: g._count.members,
      maxMembers: getGuildLevelInfo(g.level).maxMembers,
    }));
  }

  async getMyGuild(userId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member) return null;

    const guild = await this.prisma.guild.findUniqueOrThrow({
      where: { id: member.guildId },
      include: {
        members: {
          include: { user: { select: { name: true } } },
          orderBy: { totalContribution: "desc" },
        },
      },
    });
    const levelInfo = getGuildLevelInfo(guild.level);

    return {
      id: guild.id,
      name: guild.name,
      iconId: guild.iconId,
      notice: guild.notice,
      level: guild.level,
      exp: guild.exp,
      expToNext: levelInfo.expToNext,
      maxMembers: levelInfo.maxMembers,
      myRole: member.role,
      members: guild.members.map((m) => ({
        userId: m.userId,
        nickname: m.user.name,
        role: m.role,
        totalContribution: m.totalContribution,
        joinedAt: m.joinedAt.getTime(),
      })),
    };
  }

  // ─── 생성/가입/탈퇴 ──────────────────────────────────────────────────────────
  async createGuild(userId: string, name: string, notice?: string, iconId?: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > GUILD_NAME_MAX_LEN) {
      throw new BadRequestException(`길드명은 1~${GUILD_NAME_MAX_LEN}자여야 합니다.`);
    }
    if (iconId && !isValidGuildIconId(iconId)) {
      throw new BadRequestException("유효하지 않은 아이콘입니다.");
    }

    const existingMembership = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (existingMembership) throw new BadRequestException("이미 소속된 길드가 있습니다.");

    const nameTaken = await this.prisma.guild.findUnique({ where: { name: trimmed } });
    if (nameTaken) throw new BadRequestException("이미 사용 중인 길드명입니다.");

    const guild = await this.prisma.guild.create({
      data: {
        name: trimmed,
        notice: notice?.trim().slice(0, GUILD_NOTICE_MAX_LEN) || null,
        iconId: iconId ?? "default",
        ownerId: userId,
        members: { create: { userId, role: "owner" } },
      },
    });
    return guild;
  }

  async applyToGuild(userId: string, guildId: string, message?: string) {
    const existingMembership = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (existingMembership) throw new BadRequestException("이미 소속된 길드가 있습니다.");

    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: { _count: { select: { members: true } } },
    });
    if (!guild) throw new NotFoundException("존재하지 않는 길드입니다.");
    if (guild._count.members >= getGuildLevelInfo(guild.level).maxMembers) {
      throw new BadRequestException("길드 정원이 가득 찼습니다.");
    }

    const existingApp = await this.prisma.guildApplication.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });
    if (existingApp) throw new BadRequestException("이미 신청한 길드입니다.");

    const app = await this.prisma.guildApplication.create({
      data: { guildId, userId, message: message?.trim().slice(0, APPLICATION_MESSAGE_MAX_LEN) || null },
    });

    const officers = await this.prisma.guildMember.findMany({
      where: { guildId, role: { in: ["owner", "officer"] } },
      select: { userId: true },
    });
    for (const o of officers) {
      void this.notifications
        .create({
          userId: o.userId,
          type: "achievement",
          title: "길드 가입 신청",
          body: "새로운 가입 신청이 도착했습니다.",
          titleKey: "notification.guild_application_title",
          bodyKey: "notification.guild_application_body",
          titleJa: "新しい加入申請",
          bodyJa: "新しい加入申請が届きました。",
          titleEn: "New Guild Application",
          bodyEn: "A new guild join application has arrived.",
          link: "/guild?tab=applications",
        })
        .catch(() => undefined);
    }
    return this.serializeApplication(app);
  }

  private serializeApplication<T extends { id: bigint }>(app: T) {
    return { ...app, id: app.id.toString() };
  }

  async listMyApplications(userId: string) {
    const apps = await this.prisma.guildApplication.findMany({
      where: { userId },
      include: { guild: { select: { id: true, name: true, iconId: true, level: true } } },
    });
    return apps.map((a) => this.serializeApplication(a));
  }

  async cancelApplication(userId: string, applicationId: string) {
    const app = await this.prisma.guildApplication.findUnique({ where: { id: BigInt(applicationId) } });
    if (!app || app.userId !== userId) throw new NotFoundException("존재하지 않는 신청입니다.");
    await this.prisma.guildApplication.delete({ where: { id: app.id } });
    return { ok: true };
  }

  async listApplications(userId: string, guildId: string) {
    await this.requireOfficer(userId, guildId);
    const apps = await this.prisma.guildApplication.findMany({
      where: { guildId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true } } },
    });
    return apps.map((a) => this.serializeApplication(a));
  }

  async approveApplication(userId: string, applicationId: string) {
    const app = await this.prisma.guildApplication.findUnique({ where: { id: BigInt(applicationId) } });
    if (!app) throw new NotFoundException("존재하지 않는 신청입니다.");
    await this.requireOfficer(userId, app.guildId);

    const existingMembership = await this.prisma.guildMember.findUnique({ where: { userId: app.userId } });
    if (existingMembership) {
      await this.prisma.guildApplication.delete({ where: { id: app.id } });
      throw new BadRequestException("신청자가 이미 다른 길드에 가입되어 있습니다.");
    }

    const guild = await this.prisma.guild.findUniqueOrThrow({
      where: { id: app.guildId },
      include: { _count: { select: { members: true } } },
    });
    if (guild._count.members >= getGuildLevelInfo(guild.level).maxMembers) {
      throw new BadRequestException("길드 정원이 가득 찼습니다.");
    }

    await this.prisma.$transaction([
      this.prisma.guildMember.create({ data: { guildId: app.guildId, userId: app.userId, role: "member" } }),
      this.prisma.guildApplication.delete({ where: { id: app.id } }),
      this.prisma.guildApplication.deleteMany({ where: { userId: app.userId, guildId: { not: app.guildId } } }),
    ]);

    void this.notifications
      .create({
        userId: app.userId,
        type: "achievement",
        title: "길드 가입 승인!",
        body: `'${guild.name}' 길드에 가입되었습니다.`,
        titleKey: "notification.guild_approved_title",
        bodyKey: "notification.guild_approved_body",
        titleJa: "ギルド加入承認！",
        bodyJa: `『${guild.name}』ギルドに加入しました。`,
        titleEn: "Guild Application Approved!",
        bodyEn: `You have joined the '${guild.name}' guild.`,
        link: "/guild",
      })
      .catch(() => undefined);
    return { ok: true };
  }

  async rejectApplication(userId: string, applicationId: string) {
    const app = await this.prisma.guildApplication.findUnique({ where: { id: BigInt(applicationId) } });
    if (!app) throw new NotFoundException("존재하지 않는 신청입니다.");
    await this.requireOfficer(userId, app.guildId);
    await this.prisma.guildApplication.delete({ where: { id: app.id } });
    return { ok: true };
  }

  async leaveGuild(userId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member) throw new BadRequestException("소속된 길드가 없습니다.");

    if (member.role === "owner") {
      const memberCount = await this.prisma.guildMember.count({ where: { guildId: member.guildId } });
      if (memberCount > 1) {
        throw new BadRequestException("길드장은 위임 후 탈퇴하거나, 길드를 해체해야 합니다.");
      }
      await this.prisma.guild.delete({ where: { id: member.guildId } });
      return { ok: true, disbanded: true };
    }

    await this.prisma.guildMember.delete({ where: { userId } });
    return { ok: true, disbanded: false };
  }

  async transferOwnership(userId: string, targetUserId: string) {
    const owner = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!owner || owner.role !== "owner") throw new ForbiddenException("길드장만 가능합니다.");

    const target = await this.prisma.guildMember.findUnique({ where: { userId: targetUserId } });
    if (!target || target.guildId !== owner.guildId) {
      throw new BadRequestException("같은 길드원에게만 위임할 수 있습니다.");
    }

    await this.prisma.$transaction([
      this.prisma.guildMember.update({ where: { userId }, data: { role: "officer" } }),
      this.prisma.guildMember.update({ where: { userId: targetUserId }, data: { role: "owner" } }),
      this.prisma.guild.update({ where: { id: owner.guildId }, data: { ownerId: targetUserId } }),
    ]);
    return { ok: true };
  }

  async kickMember(userId: string, targetUserId: string) {
    const requester = await this.requireOfficerBySelf(userId);
    const target = await this.prisma.guildMember.findUnique({ where: { userId: targetUserId } });
    if (!target || target.guildId !== requester.guildId) {
      throw new BadRequestException("같은 길드원이 아닙니다.");
    }
    if (target.role === "owner") throw new BadRequestException("길드장은 추방할 수 없습니다.");
    if (requester.role === "officer" && target.role === "officer") {
      throw new ForbiddenException("부길드장은 다른 부길드장을 추방할 수 없습니다.");
    }
    await this.prisma.guildMember.delete({ where: { userId: targetUserId } });
    return { ok: true };
  }

  async setMemberRole(userId: string, targetUserId: string, role: "officer" | "member") {
    const owner = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!owner || owner.role !== "owner") throw new ForbiddenException("길드장만 가능합니다.");

    const target = await this.prisma.guildMember.findUnique({ where: { userId: targetUserId } });
    if (!target || target.guildId !== owner.guildId) {
      throw new BadRequestException("같은 길드원이 아닙니다.");
    }
    if (target.role === "owner") throw new BadRequestException("길드장의 직책은 변경할 수 없습니다.");

    await this.prisma.guildMember.update({ where: { userId: targetUserId }, data: { role } });
    return { ok: true };
  }

  async updateNotice(userId: string, notice: string) {
    const member = await this.requireOfficerBySelf(userId);
    await this.prisma.guild.update({
      where: { id: member.guildId },
      data: { notice: notice.trim().slice(0, GUILD_NOTICE_MAX_LEN) || null },
    });
    return { ok: true };
  }

  async updateIcon(userId: string, iconId: string) {
    if (!isValidGuildIconId(iconId)) throw new BadRequestException("유효하지 않은 아이콘입니다.");
    const member = await this.requireOfficerBySelf(userId);
    await this.prisma.guild.update({ where: { id: member.guildId }, data: { iconId } });
    return { ok: true };
  }

  // ─── 길드 게시판 ────────────────────────────────────────────────────────────
  // guildId는 여기서 멤버십으로 확인한 값만 CommunityService로 넘긴다 — 클라이언트가
  // 임의의 guildId를 지정해 다른 길드 게시판을 보거나 쓸 수 없다.
  async listBoardPosts(userId: string, page = 1) {
    const member = await this.requireMembership(userId);
    return this.community.findAll(userId, page, undefined, undefined, member.guildId);
  }

  async createBoardPost(userId: string, content: string, imageUrl?: string) {
    const member = await this.requireMembership(userId);
    return this.community.create({ userId, content, imageUrl }, member.guildId);
  }

  async disbandGuild(userId: string) {
    const owner = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!owner || owner.role !== "owner") throw new ForbiddenException("길드장만 가능합니다.");
    await this.prisma.guild.delete({ where: { id: owner.guildId } });
    return { ok: true };
  }

  private async requireOfficer(userId: string, guildId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member || member.guildId !== guildId || !["owner", "officer"].includes(member.role)) {
      throw new ForbiddenException("권한이 없습니다.");
    }
    return member;
  }

  private async requireOfficerBySelf(userId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member || !["owner", "officer"].includes(member.role)) {
      throw new ForbiddenException("권한이 없습니다.");
    }
    return member;
  }

  // ─── 길드 주간 보스전 ────────────────────────────────────────────────────────
  private async getOrCreateWeeklyRun(guildId: string) {
    const weekKey = getIsoWeekKey(new Date());
    const existing = await this.prisma.guildBossRun.findUnique({
      where: { guildId_weekKey: { guildId, weekKey } },
    });
    if (existing) return existing;

    const guild = await this.prisma.guild.findUniqueOrThrow({ where: { id: guildId } });
    const memberCount = await this.prisma.guildMember.count({ where: { guildId } });
    const maxHp = calcBossMaxHp(guild.level, memberCount);

    // 동시에 여러 요청이 최초 생성을 시도할 수 있으므로 unique 충돌 시 기존 row를 다시 읽는다
    try {
      return await this.prisma.guildBossRun.create({
        data: { guildId, weekKey, bossId: randomBoss(), maxHp, hpRemaining: maxHp },
      });
    } catch {
      return this.prisma.guildBossRun.findUniqueOrThrow({ where: { guildId_weekKey: { guildId, weekKey } } });
    }
  }

  async getBossState(userId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member) throw new BadRequestException("소속된 길드가 없습니다.");

    const run = await this.getOrCreateWeeklyRun(member.guildId);
    const contributions = await this.prisma.guildBossContribution.findMany({
      where: { runId: run.id },
      orderBy: { damage: "desc" },
      take: 20,
      include: { user: { select: { name: true } } },
    });
    const myContribution =
      contributions.find((c) => c.userId === userId)?.damage ??
      (await this.prisma.guildBossContribution.findUnique({
        where: { runId_userId: { runId: run.id, userId } },
      }))?.damage ??
      0;

    const todayKTC = kstDateStr(new Date());
    const attacksUsed = member.dailyBossAttacksDate === todayKTC ? member.dailyBossAttacks : 0;

    return {
      weekKey: run.weekKey,
      bossId: run.bossId,
      hpRemaining: run.hpRemaining,
      maxHp: run.maxHp,
      cleared: run.hpRemaining <= 0,
      attacksRemaining: Math.max(0, DAILY_BOSS_ATTACKS - attacksUsed),
      dailyAttacksMax: DAILY_BOSS_ATTACKS,
      myContribution,
      topContributors: contributions.map((c, i) => ({
        rank: i + 1,
        userId: c.userId,
        nickname: c.user.name,
        damage: c.damage,
      })),
    };
  }

  /** 콜로세움 공격덱과 별개인 길드 레이드 전용덱 조회 — 길드 소속 여부와 무관하게 조회 가능 */
  async getRaidDeck(userId: string) {
    return this.arena.getRaidDeck(userId);
  }

  async saveRaidDeck(userId: string, slots: number[]) {
    return this.arena.saveDeck(userId, "guild", slots);
  }

  async attackBoss(userId: string) {
    const member = await this.prisma.guildMember.findUnique({ where: { userId } });
    if (!member) throw new BadRequestException("소속된 길드가 없습니다.");

    const todayKTC = kstDateStr(new Date());
    const attacksUsed = member.dailyBossAttacksDate === todayKTC ? member.dailyBossAttacks : 0;
    if (attacksUsed >= DAILY_BOSS_ATTACKS) {
      throw new BadRequestException("오늘의 공격 횟수를 모두 사용했습니다.");
    }

    const run = await this.getOrCreateWeeklyRun(member.guildId);
    if (run.hpRemaining <= 0) {
      throw new BadRequestException("이번 주 보스는 이미 처치되었습니다.");
    }

    const guild = await this.prisma.guild.findUniqueOrThrow({ where: { id: member.guildId } });
    const memberCount = await this.prisma.guildMember.count({ where: { guildId: member.guildId } });
    const encounterHp = calcEncounterHp(guild.level, memberCount, run.hpRemaining);
    const bossEnhLevel = getBossEnhLevel(guild.level);

    const battle = await this.arena.simulateAgainstBoss(userId, {
      charId: run.bossId,
      enhLevel: bossEnhLevel,
      hp: encounterHp,
    });
    const dmg = Math.min(battle.damageDealt, run.hpRemaining);
    const newHp = Math.max(0, run.hpRemaining - dmg);
    const justCleared = run.hpRemaining > 0 && newHp === 0;

    await this.prisma.$transaction([
      this.prisma.guildBossRun.update({
        where: { id: run.id },
        data: { hpRemaining: newHp, clearedAt: justCleared ? new Date() : run.clearedAt },
      }),
      this.prisma.guildBossContribution.upsert({
        where: { runId_userId: { runId: run.id, userId } },
        create: { runId: run.id, userId, damage: dmg },
        update: { damage: { increment: dmg } },
      }),
      this.prisma.guildMember.update({
        where: { userId },
        data: {
          totalContribution: { increment: dmg },
          dailyBossAttacks: member.dailyBossAttacksDate === todayKTC ? { increment: 1 } : 1,
          dailyBossAttacksDate: todayKTC,
        },
      }),
    ]);
    void this.rewards.markQuestDone(userId, "battle").catch(() => undefined);
    void this.rewards.incrementWeeklyQuestProgress(userId, "battle").catch(() => undefined);

    if (justCleared) {
      await this.addGuildExp(member.guildId, BOSS_CLEAR_GUILD_EXP);
      await this.notifyGuild(member.guildId, "길드 보스 처치!", "길드원들이 힘을 합쳐 이번 주 보스를 물리쳤습니다!", "/guild", {
        titleKey: "notification.guild_boss_cleared_title",
        bodyKey: "notification.guild_boss_cleared_body",
        titleJa: "ギルドボス討伐！",
        bodyJa: "ギルドメンバーが力を合わせて今週のボスを倒しました！",
        titleEn: "Guild Boss Defeated!",
        bodyEn: "Guild members united to defeat this week's boss!",
      });
    }

    return {
      won: battle.won,
      log: battle.log,
      attackerChars: battle.attackerChars,
      defenderChars: battle.defenderChars,
      hpRemaining: newHp,
      maxHp: run.maxHp,
      damageDealt: dmg,
      cleared: justCleared,
      attacksRemaining: DAILY_BOSS_ATTACKS - (attacksUsed + 1),
    };
  }

  private async addGuildExp(guildId: string, amount: number) {
    const guild = await this.prisma.guild.findUniqueOrThrow({ where: { id: guildId } });
    const { level, exp } = applyGuildExp(guild.level, guild.exp, amount);
    if (level !== guild.level || exp !== guild.exp) {
      await this.prisma.guild.update({ where: { id: guildId }, data: { level, exp } });
    }
  }

  private async notifyGuild(
    guildId: string,
    title: string,
    body: string,
    link = "/guild",
    extra?: { titleKey?: string; bodyKey?: string; titleJa?: string; bodyJa?: string; titleEn?: string; bodyEn?: string },
  ) {
    const members = await this.prisma.guildMember.findMany({ where: { guildId }, select: { userId: true } });
    for (const m of members) {
      void this.notifications
        .create({ userId: m.userId, type: "achievement", title, body, link, ...extra })
        .catch(() => undefined);
    }
  }

  private async grantBossRankReward(userId: string, reward: GuildBossRankReward) {
    await this.prisma.userReward.upsert({
      where: { userId },
      create: {
        userId,
        missionPoints: reward.points,
        enhancementStones: reward.stones,
        bigEggs: reward.bigEgg ?? 0,
        goldenEggs: reward.goldEgg ?? 0,
      },
      update: {
        missionPoints: { increment: reward.points },
        enhancementStones: { increment: reward.stones },
        bigEggs: { increment: reward.bigEgg ?? 0 },
        goldenEggs: { increment: reward.goldEgg ?? 0 },
      },
    });
    void logPointsChange(this.prisma, userId, reward.points, "길드 보스 랭킹 보상");
  }

  /** 지난 주 보스전 중 아직 정산 안 된 것들을 랭킹 보상 지급 후 정산 완료 처리 */
  private async settleRun(runId: string) {
    const contributions = await this.prisma.guildBossContribution.findMany({
      where: { runId, damage: { gt: 0 } },
      orderBy: { damage: "desc" },
    });
    for (let i = 0; i < contributions.length; i++) {
      const reward = getBossRankReward(i + 1);
      await this.grantBossRankReward(contributions[i].userId, reward).catch((err) =>
        this.logger.error(`길드 보스 보상 지급 실패 userId=${contributions[i].userId}`, err),
      );
    }
    await this.prisma.guildBossRun.update({ where: { id: runId }, data: { rewardsGranted: true } });
  }

  // 매주 월요일 00:00 KST — 직전 주 보스전 랭킹 보상 정산
  // 주의: settleRun이 도중에 크래시하면(보상 지급 루프 중간) rewardsGranted가 아직 false라
  // 다음 재시도 때 이미 받은 유저에게 중복 지급될 수 있음 — 드문 케이스라 지금은 로그로만
  // 감지하고 수동 확인하는 걸로 두되, 재발하면 컨트리뷰션 단위 지급 여부 컬럼을 추가할 것.
  @Cron("0 0 * * 1", { timeZone: "Asia/Seoul" })
  async settleWeeklyBossRuns() {
    return runSingletonCron(this.prisma, this.logger, "guild.settleWeeklyBossRuns", cronWindowKey(new Date(), "week"), async () => {
      if (this.settlingBossRuns) {
        this.logger.warn("이전 길드 보스 정산이 아직 진행 중 — 이번 tick은 건너뜀");
        return;
      }
      this.settlingBossRuns = true;
      try {
        const currentWeekKey = getIsoWeekKey(new Date());
        const pending = await this.prisma.guildBossRun.findMany({
          where: { rewardsGranted: false, weekKey: { not: currentWeekKey } },
        });
        for (const run of pending) {
          await this.settleRun(run.id).catch((err) => this.logger.error(`길드 보스 정산 실패 runId=${run.id}`, err));
        }
      } catch (err) {
        this.logger.error("길드 보스 주간 정산 배치 실패", err);
      } finally {
        this.settlingBossRuns = false;
      }
    });
  }
}
