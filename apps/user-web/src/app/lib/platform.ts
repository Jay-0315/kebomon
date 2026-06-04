export function isWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    ua.includes("KeboApp") ||
    ua.includes("ReactNative") ||
    // Android WebView
    (ua.includes("Android") && ua.includes("wv")) ||
    // iOS WebView: has Mobile but no Safari
    (ua.includes("iPhone") && !ua.includes("Safari")) ||
    (ua.includes("iPad") && !ua.includes("Safari"))
  );
}
