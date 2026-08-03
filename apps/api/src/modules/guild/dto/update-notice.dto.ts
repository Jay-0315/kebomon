import { IsString, MaxLength } from "class-validator";

export class UpdateNoticeDto {
  @IsString()
  userId: string;

  // guilds.notice는 VARCHAR(200)
  @IsString()
  @MaxLength(200)
  notice: string;
}
