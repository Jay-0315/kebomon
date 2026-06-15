import { translate, type Lang } from "./i18n";

export function formatRelativeTime(isoString: string, lang = "ko"): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const l = lang as Lang;
  if (minutes < 1) return translate(l, "notification.time.just_now");
  if (minutes < 60) return translate(l, "notification.time.min_suffix").replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return translate(l, "notification.time.hr_suffix").replace("{h}", String(hours));
  const days = Math.floor(hours / 24);
  return translate(l, "notification.time.day_suffix").replace("{d}", String(days));
}
