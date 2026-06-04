import { IsOptional, IsString } from "class-validator";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  baseCountryCode?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: "KRW" | "JPY";
}
