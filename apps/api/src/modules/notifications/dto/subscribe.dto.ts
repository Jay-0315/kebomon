import { Type } from "class-transformer";
import { IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

class PushSubscriptionKeysDto {
  @IsString()
  p256dh: string;

  @IsString()
  auth: string;
}

class PushSubscriptionDto {
  @IsString()
  endpoint: string;

  // 브라우저 PushSubscription.toJSON()이 항상 함께 보내는 필드 — 서버는 안 쓰지만
  // whitelist 검증에서 걸러지지 않도록 선언해둔다
  @IsOptional()
  expirationTime?: number | null;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}

export class SubscribeDto {
  // 서버는 JWT의 sub만 사용하지만, 프론트가 이미 body에 userId를 함께 보내고 있어서
  // whitelist 검증에서 걸러지지 않도록 필드로 남겨둔다 (다른 모듈들과 동일한 관례)
  @IsString()
  userId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription: PushSubscriptionDto;
}
