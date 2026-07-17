import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserStatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status!: "ACTIVE" | "SUSPENDED";

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
