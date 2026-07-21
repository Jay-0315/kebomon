import { IsEnum, IsString, MaxLength } from "class-validator";

export class CreateReportDto {
  @IsEnum(["POST", "COMMENT", "USER"])
  targetType: "POST" | "COMMENT" | "USER";

  @IsString()
  targetId: string;

  @IsString()
  @MaxLength(500)
  reason: string;
}
