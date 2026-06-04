import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateExpenseDto {
  @IsString()
  userId: string;

  @IsDateString()
  expenseDate: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  spentAmount: number;

  @IsString()
  spentCurrency: "KRW" | "JPY";

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsString()
  baseCurrency: "KRW" | "JPY";

  @IsNumber()
  @Min(0)
  exchangeRate: number;

  @IsString()
  countryCode: string;

  @IsString()
  memo: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  participants?: number;

  @IsOptional()
  @IsString()
  receiptUrl?: string;

  @IsOptional()
  @IsBoolean()
  sharedToCommunity?: boolean;
}
