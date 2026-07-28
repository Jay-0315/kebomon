import { IsInt, IsOptional, IsString, Min, MaxLength } from "class-validator";

export class BulkAdjustRewardDto {
  @IsInt()
  @Min(1)
  missionPointsDelta: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
