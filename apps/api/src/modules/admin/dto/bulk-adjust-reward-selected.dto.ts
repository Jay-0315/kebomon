import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, MaxLength } from "class-validator";

export class BulkAdjustRewardSelectedDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  userIds: string[];

  @IsInt()
  @Min(1)
  missionPointsDelta: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
