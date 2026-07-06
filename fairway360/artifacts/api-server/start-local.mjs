// Local launcher — sets dev env vars then boots the built server.
// Used by .claude/launch.json for browser-preview testing on this machine.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Load real secrets (Anthropic key, etc.) from .env.local if present.
// Lines are KEY=VALUE; blank lines and #comments are ignored. This file is
// gitignored — put your keys there, never in source.
try {
  const raw = readFileSync(join(here, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && val) process.env[key] = val; // .env.local wins over defaults below
  }
} catch {
  /* no .env.local — fine, integrations just stay in fallback mode */
}

process.env.DATABASE_URL ??= "postgres://fairway:fairway@localhost:5434/fairway360";
process.env.SESSION_SECRET ??= "dev-secret-for-local-testing-only-0123456789";
process.env.NODE_ENV ??= "production";
process.env.PORT ??= "5000";
process.env.APP_URL ??= "http://localhost:5000";

// The static SPA path is resolved from process.cwd() (lib/static.ts), so run
// from this directory regardless of where the launcher was invoked.
process.chdir(here);

await import("./dist/index.mjs");
