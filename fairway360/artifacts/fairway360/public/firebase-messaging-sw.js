/* Firebase Cloud Messaging service worker. Loads the compat SDK from Google's
   CDN (no bundler dep) and reads its config from this script's URL query, which
   the app passes at registration time. Shows background push notifications. */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const p = new URL(self.location).searchParams;
if (p.get("apiKey")) {
  firebase.initializeApp({
    apiKey: p.get("apiKey"),
    projectId: p.get("projectId"),
    messagingSenderId: p.get("messagingSenderId"),
    appId: p.get("appId"),
    authDomain: p.get("authDomain"),
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || "Fairway360", {
      body: n.body || "",
      icon: "/favicon.png",
      data: payload.data || {},
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(self.clients.openWindow(link));
});
