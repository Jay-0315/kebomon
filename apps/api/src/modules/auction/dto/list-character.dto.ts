import { IsIn, IsInt, IsOptional, Min } from "class-validator";

export class ListCharacterDto {
  @IsInt()
  characterId: number;

  @IsInt()
  @Min(1)
  startPrice: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  buyoutPrice?: number;

  // auction.service.ts의 ALLOWED_DURATIONS_HOURS와 동일한 목록 — 값이 바뀌면 같이 맞춰줘야 함
  @IsIn([6, 12, 24, 48])
  durationHours: number;
}
