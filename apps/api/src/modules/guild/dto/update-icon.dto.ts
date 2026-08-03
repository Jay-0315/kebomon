import { IsString } from "class-validator";

export class UpdateIconDto {
  @IsString()
  userId: string;

  @IsString()
  iconId: string;
}
