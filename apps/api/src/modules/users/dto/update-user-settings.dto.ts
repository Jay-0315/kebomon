import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsBoolean()
  autoBackup?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  themeColor?: string;

  @IsOptional()
  @IsIn(["ko", "ja"])
  language?: string;
}
