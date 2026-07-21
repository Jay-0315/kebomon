const KST_OFFSET_MS = 9 * 3_600_000;

/** 한국시간(KST/UTC+9) 기준 오늘 날짜키 "YYYY-MM-DD" */
export function getTodayKTC(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국시간(KST/UTC+9) 기준 어제 날짜키 "YYYY-MM-DD" */
export function getYesterdayKTC(): string {
  return new Date(Date.now() + KST_OFFSET_MS - 86_400_000).toISOString().slice(0, 10);
}
