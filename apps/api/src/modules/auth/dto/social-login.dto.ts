import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export enum SocialProvider {
  GOOGLE = "GOOGLE",
}

export class SocialLoginDto {
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsOptional()
  @IsString()
  @MinLength(8)
  authorizationCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  identityToken?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  accessToken?: string;

  @IsOptional()
  @IsString()
  providerUserId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
