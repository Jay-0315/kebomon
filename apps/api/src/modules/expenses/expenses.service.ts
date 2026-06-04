import { Injectable } from "@nestjs/common";
import { CurrencyCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RewardsService } from "../rewards/rewards.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rewards: RewardsService,
  ) {}

  findAll(userId?: string) {
    return this.prisma.expense.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { expenseDate: "desc" },
    });
  }

  async create(dto: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        userId: dto.userId,
        expenseDate: new Date(dto.expenseDate),
        category: dto.category,
        spentAmount: dto.spentAmount,
        spentCurrency: dto.spentCurrency as CurrencyCode,
        baseAmount: dto.baseAmount,
        baseCurrency: dto.baseCurrency as CurrencyCode,
        exchangeRate: dto.exchangeRate,
        countryCode: dto.countryCode,
        memo: dto.memo,
        groupName: dto.groupName,
        groupId: dto.groupId,
        participants: dto.participants,
        receiptUrl: dto.receiptUrl,
        sharedToCommunity: dto.sharedToCommunity ?? false,
      },
    });

    await this.rewards.onExpenseCreated(
      dto.userId,
      dto.expenseDate,
      !!dto.groupId,
    );
    await Promise.all([
      this.rewards.checkAndGrantAchievements(dto.userId),
      this.rewards.checkAndGrantTitles(dto.userId),
    ]);

    return expense;
  }

  update(id: string, dto: UpdateExpenseDto) {
    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.expenseDate ? { expenseDate: new Date(dto.expenseDate) } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.spentAmount !== undefined ? { spentAmount: dto.spentAmount } : {}),
        ...(dto.spentCurrency ? { spentCurrency: dto.spentCurrency as CurrencyCode } : {}),
        ...(dto.baseAmount !== undefined ? { baseAmount: dto.baseAmount } : {}),
        ...(dto.baseCurrency ? { baseCurrency: dto.baseCurrency as CurrencyCode } : {}),
        ...(dto.exchangeRate !== undefined ? { exchangeRate: dto.exchangeRate } : {}),
        ...(dto.countryCode ? { countryCode: dto.countryCode } : {}),
        ...(dto.memo ? { memo: dto.memo } : {}),
        ...(dto.groupName !== undefined ? { groupName: dto.groupName } : {}),
        ...(dto.groupId !== undefined ? { groupId: dto.groupId } : {}),
        ...(dto.participants !== undefined ? { participants: dto.participants } : {}),
        ...(dto.receiptUrl !== undefined ? { receiptUrl: dto.receiptUrl } : {}),
        ...(dto.sharedToCommunity !== undefined ? { sharedToCommunity: dto.sharedToCommunity } : {}),
      },
    });
  }

  remove(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
