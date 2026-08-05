import { IsString } from "class-validator";

export class UnsubscribeDto {
  // subscribe.dto.ts와 동일한 이유로 유지 — 서버는 JWT sub만 사용
  @IsString()
  userId: string;

  @IsString()
  endpoint: string;
}
