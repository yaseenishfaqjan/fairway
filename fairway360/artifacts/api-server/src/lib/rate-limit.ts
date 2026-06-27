// Lightweight in-memory rate limiter (no external dependency). Fixed-window per
// client IP. Suitable for a single-instance deployment; for multi-instance,
// swap the Map for a shared store (e.g. Redis). Used to slow brute-force login
// attempts and spam on public endpoints.

import type { RequestHandler } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Periodically drop expired buckets so the map can't grow unbounded.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
  }
}

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  key: string;
}): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    sweep(now);
    const id = `${opts.key}:${req.ip ?? "unknown"}`;
    const b = buckets.get(id);

    if (!b || now > b.resetAt) {
      buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
      next();
      return;
    }

    if (b.count >= opts.max) {
      const retry = Math.ceil((b.resetAt - now) / 1000);
      res.set("Retry-After", String(retry));
      res.status(429).json({
        title: "Too many requests",
        status: 429,
        detail: "Please slow down and try again shortly.",
      });
      return;
    }

    b.count += 1;
    next();
  };
}
