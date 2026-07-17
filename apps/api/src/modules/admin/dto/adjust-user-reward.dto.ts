import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class AdjustUserRewardDto {
  @IsOptional()
  @IsInt()
  missionPointsDelta?: number;

  @IsOptional()
  @IsInt()
  normalEggsDelta?: number;

  @IsOptional()
  @IsInt()
  bigEggsDelta?: number;

  @IsOptional()
  @IsInt()
  goldenEggsDelta?: number;

  @IsOptional()
  @IsInt()
  enhancementStonesDelta?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
