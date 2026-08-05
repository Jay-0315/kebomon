import * as Joi from "joi";

/**
 * 부팅 시점에 필수 환경변수를 검증한다. JWT_SECRET처럼 없으면 안 되는 값이 빠진 채로
 * 배포되면(예: 컨테이너 환경변수 설정 누락) 이전엔 코드에 박힌 기본값으로 조용히
 * 폴백되어 계속 떠 있었다 — 이제는 앱이 아예 뜨지 않고 즉시 실패한다.
 */
export const envValidationSchema = Joi.object({
  JWT_SECRET: Joi.string().min(32).required(),
  DATABASE_URL: Joi.string().uri({ scheme: [/mysql/] }).required(),
  API_PORT: Joi.number().port().default(4000),
  CORS_ORIGINS: Joi.string().optional(),
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_IDS: Joi.string().optional(),
  RESEND_API_KEY: Joi.string().optional(),
  VAPID_PUBLIC_KEY: Joi.string().optional(),
  VAPID_PRIVATE_KEY: Joi.string().optional(),
  VAPID_EMAIL: Joi.string().optional(),
  ADMIN_API_SECRET: Joi.string().optional(),
})
  // 여기 나열 안 된 값(NODE_ENV, npm/도커가 주입하는 잡다한 변수 등)까지 전부 막으면
  // 너무 깨지기 쉬워지므로, 알려진 키만 검증하고 나머지는 그대로 통과시킨다
  .unknown(true);
