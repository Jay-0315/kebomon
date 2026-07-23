import { IsBoolean, IsInt, IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertBannerDto {
  @IsString()
  @MaxLength(60)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  titleJa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bodyJa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bodyEn?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
