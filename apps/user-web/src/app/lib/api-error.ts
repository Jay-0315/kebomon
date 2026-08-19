export const API_ERROR_TRANSLATION_KEYS = {
  AUTH_TOKEN_MISSING: "api_error.AUTH_TOKEN_MISSING",
  AUTH_INVALID_TOKEN: "api_error.AUTH_INVALID_TOKEN",
  AUTH_FORBIDDEN: "api_error.AUTH_FORBIDDEN",
  COMMON_NOT_FOUND: "api_error.COMMON_NOT_FOUND",
  COMMON_BAD_REQUEST: "api_error.COMMON_BAD_REQUEST",
  TD_RUN_LIMIT_EXCEEDED: "api_error.TD_RUN_LIMIT_EXCEEDED",
  TD_RUN_NOT_STARTED: "api_error.TD_RUN_NOT_STARTED",
  TD_RUN_TOO_FAST: "api_error.TD_RUN_TOO_FAST",
  QUEST_ALREADY_CLAIMED: "api_error.QUEST_ALREADY_CLAIMED",
  QUEST_NOT_COMPLETED: "api_error.QUEST_NOT_COMPLETED",
  REWARD_NOT_ENOUGH_POINTS: "api_error.REWARD_NOT_ENOUGH_POINTS",
  AUCTION_NOT_FOUND: "api_error.AUCTION_NOT_FOUND",
  AUCTION_NOT_ENOUGH_POINTS: "api_error.AUCTION_NOT_ENOUGH_POINTS",
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_TRANSLATION_KEYS;

export function getApiErrorCode(err: unknown): ApiErrorCode | undefined {
  const code = err instanceof Error ? (err as Error & { code?: string }).code : undefined;
  return code && code in API_ERROR_TRANSLATION_KEYS ? (code as ApiErrorCode) : undefined;
}

export function getApiErrorTranslationKey(err: unknown): string | undefined {
  const code = getApiErrorCode(err);
  return code ? API_ERROR_TRANSLATION_KEYS[code] : undefined;
}
