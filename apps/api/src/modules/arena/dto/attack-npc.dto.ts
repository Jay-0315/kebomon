import { IsString } from "class-validator";

export class AttackNpcDto {
  @IsString()
  userId: string;

  @IsString()
  npcId: string;
}
