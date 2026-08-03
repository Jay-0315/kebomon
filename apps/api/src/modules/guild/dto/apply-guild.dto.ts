import { IsOptional, IsString } from "class-validator";

export class ApplyGuildDto {
  @IsString()
  userId: string;

  @IsString()
  guildId: string;

  @IsOptional()
  @IsString()
  message?: string;
}
