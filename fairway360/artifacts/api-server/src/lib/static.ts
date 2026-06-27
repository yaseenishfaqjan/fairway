// In production the app is deployed as a single autoscale service, so the API
// server also serves the built frontend (Vite output) and SPA-falls back to
// index.html for client-side routes. In dev this is a no-op — Vite serves the
// client and proxies /api here.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express, { type Express, type RequestHandler } from "express";
import { logger } from "./logger";

function clientDir(): string | null {
  const override = process.env["CLIENT_DIST"];
  const candidates = [
    override,
    resolve(process.cwd(), "../fairway360/dist/public"),
    resolve(process.cwd(), "dist/public"),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (existsSync(resolve(dir, "index.html"))) return dir;
  }
  return null;
}

export function serveClient(app: Express): void {
  if (process.env["NODE_ENV"] !== "production") return;

  const dir = clientDir();
  if (!dir) {
    logger.warn("static: no client build found; serving API only");
    return;
  }

  const index = resolve(dir, "index.html");
  app.use(express.static(dir));

  // SPA fallback: any non-API GET that didn't match a static asset returns the
  // app shell so client-side routing can take over.
  const spa: RequestHandler = (req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(index);
  };
  app.use(spa);

  logger.info({ dir }, "static: serving client build");
}
