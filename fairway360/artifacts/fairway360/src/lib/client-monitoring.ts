// Forwards uncaught browser errors to the backend (which relays to Sentry when
// configured). No-ops on the server side if SENTRY_DSN isn't set. Best-effort.

let installed = false;

function report(message: string, stack?: string) {
  const body = JSON.stringify({ message, stack, url: location.href });
  try {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/monitoring/client-error", blob)) return;
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/monitoring/client-error", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function installClientMonitoring() {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) => report(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string; stack?: string } | undefined;
    report(String(r?.message ?? e.reason), r?.stack);
  });
}
