/* Receives data-only Firebase messages. No credentials or user information are bundled here. */
self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const data = payload.data;
  if (!data || typeof data.title !== "string" || typeof data.body !== "string")
    return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const visible = windows.filter(
        (client) => client.visibilityState === "visible",
      );
      if (visible.length) {
        for (const client of visible)
          client.postMessage({
            type: "RALLYYAR_PUSH",
            title: data.title,
            body: data.body,
          });
        return;
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.id || "rallyyar",
        data: { href: data.href },
        icon: "/icon",
      });
    })(),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href;
  const destination = new URL(
    typeof href === "string" && href.startsWith("/") && !href.startsWith("//")
      ? href
      : "/account/notifications",
    self.location.origin,
  );
  if (destination.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (new URL(client.url).origin === destination.origin) {
          await client.navigate(destination.href);
          return client.focus();
        }
      }
      return self.clients.openWindow(destination.href);
    })(),
  );
});
