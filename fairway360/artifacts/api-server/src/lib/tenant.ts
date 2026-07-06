// Tenant resolution (build-doc Part 3) — identifies the club for a request
// BEFORE authentication, for public per-club pages (branded login, member
// registration). Resolution order:
//   1. X-Tenant-Slug header      (API clients, mobile app)
//   2. Subdomain                 harrogate.fairway360.io → "harrogate"
//   3. ?slug= query parameter    (local dev / single-domain installs)
// Authenticated traffic keeps using req.auth.clubId from the session — this
// middleware never overrides it.

import type { Request, RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db, clubs, type Club } from "@workspace/db";

// Hosts whose subdomains map to club slugs. The bare/apex domains themselves
// (and www/admin) are the marketing site, not a tenant.
const PLATFORM_DOMAINS = ["fairway360.io", "fairway360.com"];
const RESERVED_SUBDOMAINS = new Set(["www", "admin", "api", "app"]);

export function slugFromHost(host: string | undefined): string | null {
  if (!host) return null;
  const bare = host.split(":")[0].toLowerCase();
  for (const domain of PLATFORM_DOMAINS) {
    if (bare.endsWith(`.${domain}`)) {
      const sub = bare.slice(0, -(domain.length + 1));
      if (sub && !sub.includes(".") && !RESERVED_SUBDOMAINS.has(sub)) return sub;
    }
  }
  return null;
}

export async function resolveTenantForRequest(req: Request): Promise<Club | null> {
  const header = req.headers["x-tenant-slug"];
  const slug =
    (typeof header === "string" && header.trim().toLowerCase()) ||
    slugFromHost(req.headers.host) ||
    (typeof req.query.slug === "string" && req.query.slug.trim().toLowerCase()) ||
    null;
  if (!slug || !/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const [club] = await db
    .select()
    .from(clubs)
    .where(and(eq(clubs.slug, slug), eq(clubs.status, "active")));
  return club ?? null;
}

/** Attaches req.tenant when the club can be identified; never rejects. */
export const resolveTenant: RequestHandler = (req, _res, next) => {
  resolveTenantForRequest(req)
    .then((club) => {
      if (club) (req as Request & { tenant?: Club }).tenant = club;
      next();
    })
    .catch(() => next());
};
