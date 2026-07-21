import { IsBoolean, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateMaintenanceConfigDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;
}
