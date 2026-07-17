import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  /** 기간 정지 종료 시각(ISO). 미지정 시 영구 정지. status가 SUSPENDED일 때만 의미 있음 */
  @IsOptional()
  @IsISO8601()
  suspendedUntil?: string;
}
