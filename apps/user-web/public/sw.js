self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      data: { url: url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const match = list.find((c) => c.url.includes(self.location.origin) && "focus" in c);
      if (match) return match.focus().then((c) => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});
