import { BadRequestException, HttpException, HttpStatus } from "@nestjs/common";

export type ApiErrorCode =
  | "AUTH_TOKEN_MISSING"
  | "AUTH_INVALID_TOKEN"
  | "AUTH_FORBIDDEN"
  | "COMMON_NOT_FOUND"
  | "COMMON_BAD_REQUEST"
  | "TD_RUN_LIMIT_EXCEEDED"
  | "TD_RUN_NOT_STARTED"
  | "TD_RUN_TOO_FAST"
  | "QUEST_ALREADY_CLAIMED"
  | "QUEST_NOT_COMPLETED"
  | "REWARD_NOT_ENOUGH_POINTS"
  | "AUCTION_NOT_FOUND"
  | "AUCTION_INVALID_CHARACTER"
  | "AUCTION_INVALID_START_PRICE"
  | "AUCTION_INVALID_BUYOUT_PRICE"
  | "AUCTION_INVALID_DURATION"
  | "AUCTION_CHARACTER_NOT_OWNED"
  | "AUCTION_TOO_MANY_ACTIVE_LISTINGS"
  | "AUCTION_CANNOT_BID_OWN_LISTING"
  | "AUCTION_CHARACTER_ALREADY_OWNED"
  | "AUCTION_BID_TOO_LOW"
  | "AUCTION_NOT_ENOUGH_POINTS"
  | "AUCTION_BID_OUTDATED"
  | "AUCTION_BUYOUT_NOT_AVAILABLE"
  | "AUCTION_LISTING_ALREADY_ENDED"
  | "AUCTION_LISTING_HAS_BID"
  | "AUCTION_LISTING_ALREADY_SETTLED";

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  params?: Record<string, string | number | boolean>;
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = HttpStatus.BAD_REQUEST,
  params?: Record<string, string | number | boolean>,
) {
  return new HttpException({ code, message, params } satisfies ApiErrorBody, status);
}

export function badRequest(code: ApiErrorCode, message: string, params?: Record<string, string | number | boolean>) {
  return new BadRequestException({ code, message, params } satisfies ApiErrorBody);
}
