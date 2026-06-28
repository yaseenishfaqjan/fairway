import { useEffect } from "react";

// Production origin used for canonical URLs, og:url, and the sitemap.
// TODO: set this to the real domain before launch.
export const SITE_URL = "https://fairway360.io";

interface SeoProps {
  /** Page <title>. Keep under ~60 chars. */
  title: string;
  /** Meta description. Aim for 150–160 chars. */
  description: string;
  /** Route path, e.g. "/pricing". Used to build the canonical URL. */
  path: string;
  /** Optional JSON-LD structured data (object or array of objects). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set true on gated/private pages (login, portals) to keep them out of search. */
  noindex?: boolean;
  /** OG/Twitter image (absolute or root-relative). Defaults to /opengraph.jpg. */
  image?: string;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-route SEO head manager for the SPA. Sets the document title, description,
 * canonical, Open Graph + Twitter tags, and optional JSON-LD on mount. The base
 * tags live in index.html as crawl-safe defaults; this overrides them per page.
 */
export function Seo({ title, description, path, jsonLd, noindex, image }: SeoProps) {
  useEffect(() => {
    const url = `${SITE_URL}${path === "/" ? "" : path}`;
    const img = image
      ? image.startsWith("http") ? image : `${SITE_URL}${image}`
      : `${SITE_URL}/opengraph.jpg`;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertLink("canonical", url);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "Fairway360");
    upsertMeta("property", "og:image", img);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", img);

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset["seo"] = "jsonld";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      script?.remove();
    };
  }, [title, description, path, jsonLd]);

  return null;
}
