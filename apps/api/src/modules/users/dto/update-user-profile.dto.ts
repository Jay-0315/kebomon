import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  favoriteCharacterIds?: number[];
}
