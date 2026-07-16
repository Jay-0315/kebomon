import { api } from "./api";
import { getStoredUser } from "./auth";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function registerPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!VAPID_PUBLIC_KEY) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  const user = getStoredUser();
  if (!user) return false;

  await api.post("/notifications/push/subscribe", {
    userId: user.id,
    subscription: sub.toJSON(),
  });

  return true;
}

export async function unregisterPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;

  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const user = getStoredUser();
  if (user) {
    await api.post("/notifications/push/unsubscribe", {
      userId: user.id,
      endpoint: sub.endpoint,
    }).catch(() => {});
  }

  await sub.unsubscribe();
}
