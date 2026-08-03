import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateGuildDto {
  @IsString()
  userId: string;

  // guilds.name은 VARCHAR(20)
  @IsString()
  @MaxLength(20)
  name: string;

  // guilds.notice는 VARCHAR(200)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  notice?: string;

  @IsOptional()
  @IsString()
  iconId?: string;
}
