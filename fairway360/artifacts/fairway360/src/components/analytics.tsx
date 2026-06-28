import { useEffect } from "react";

// Google Analytics 4 — loads gtag.js only when VITE_GA_ID is set at build time,
// so it's a no-op in dev/demo and adds no third-party request unless configured.
const GA_ID = (import.meta.env.VITE_GA_ID as string | undefined) ?? "";

export function Analytics() {
  useEffect(() => {
    if (!GA_ID || document.getElementById("ga4-src")) return;
    const src = document.createElement("script");
    src.id = "ga4-src";
    src.async = true;
    src.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(src);

    const init = document.createElement("script");
    init.id = "ga4-init";
    init.text =
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());gtag('config','${GA_ID}');`;
    document.head.appendChild(init);
  }, []);

  return null;
}

/** Fire a GA4 event (no-op if GA isn't configured). */
export function track(event: string, params?: Record<string, unknown>) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  if (GA_ID && typeof w.gtag === "function") w.gtag("event", event, params ?? {});
}
