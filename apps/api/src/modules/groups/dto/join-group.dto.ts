import { IsString, Length } from "class-validator";

export class JoinByCodeDto {
  @IsString()
  @Length(8, 8)
  code: string;
}
