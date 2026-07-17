import { IsInt, IsObject, IsOptional, Min } from "class-validator";

export class UpdateGachaConfigDto {
  @IsOptional()
  @IsObject()
  gachaRates?: Record<string, number>;

  @IsOptional()
  @IsObject()
  normalEggRates?: Record<string, number>;

  @IsOptional()
  @IsObject()
  bigEggRates?: Record<string, number>;

  @IsOptional()
  @IsObject()
  goldenEggRates?: Record<string, number>;

  @IsOptional()
  @IsInt()
  @Min(1)
  pityRareThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pityLegendaryThreshold?: number;
}
