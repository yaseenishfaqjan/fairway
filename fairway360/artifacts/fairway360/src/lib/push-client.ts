// Browser push enablement via Firebase Cloud Messaging. Loads the FCM compat
// SDK from Google's CDN at runtime (no bundled dependency). Everything is gated
// on the server reporting a web config, so it stays dormant until Firebase is
// set up.

const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";

interface WebConfig {
  configured: boolean;
  apiKey?: string;
  appId?: string;
  messagingSenderId?: string;
  projectId?: string;
  authDomain?: string;
  vapidKey?: string;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
}

export async function pushConfigured(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const cfg = (await (await fetch("/api/push/web-config")).json()) as WebConfig;
    return Boolean(cfg.configured);
  } catch {
    return false;
  }
}

/** Request permission, register the SW, get an FCM token, and store it. */
export async function enablePush(): Promise<string> {
  if (!pushSupported()) throw new Error("Push isn't supported in this browser.");
  const cfg = (await (await fetch("/api/push/web-config")).json()) as WebConfig;
  if (!cfg.configured) throw new Error("Push notifications aren't configured yet.");

  await loadScript(`${CDN}firebase-app-compat.js`);
  await loadScript(`${CDN}firebase-messaging-compat.js`);
  const firebase = (window as unknown as { firebase: any }).firebase;
  if (!firebase.apps?.length) {
    firebase.initializeApp({
      apiKey: cfg.apiKey,
      projectId: cfg.projectId,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
      authDomain: cfg.authDomain,
    });
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was denied.");

  const params = new URLSearchParams({
    apiKey: cfg.apiKey ?? "",
    projectId: cfg.projectId ?? "",
    messagingSenderId: cfg.messagingSenderId ?? "",
    appId: cfg.appId ?? "",
    authDomain: cfg.authDomain ?? "",
  });
  const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
  const messaging = firebase.messaging();
  const token: string = await messaging.getToken({ vapidKey: cfg.vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Could not obtain a push token.");

  await fetch("/api/me/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, platform: "web" }),
  });
  return token;
}
