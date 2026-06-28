// Lightweight, dependency-free error monitoring. When SENTRY_DSN is set, events
// are POSTed to Sentry's store endpoint over REST (no SDK). No-ops otherwise, so
// the app runs fine without it. Best-effort: send failures are swallowed.

import { randomUUID } from "node:crypto";
import { logger } from "./logger";

interface Dsn {
  protocol: string;
  key: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): Dsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "").split("/").pop() ?? "";
    if (!u.username || !u.host || !projectId) return null;
    return { protocol: u.protocol, key: u.username, host: u.host, projectId };
  } catch {
    return null;
  }
}

export function monitoringEnabled(): boolean {
  return Boolean(process.env["SENTRY_DSN"]);
}

function framesFrom(stack: string | undefined) {
  return (stack ?? "")
    .split("\n")
    .slice(1, 30)
    .map((l) => l.trim())
    .filter(Boolean)
    .reverse()
    .map((fn) => ({ function: fn }));
}

/** Send an exception to Sentry (if configured). Accepts node or browser errors. */
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
  platform: "node" | "javascript" = "node",
): void {
  const dsn = process.env["SENTRY_DSN"];
  if (!dsn) return;
  const parsed = parseDsn(dsn);
  if (!parsed) return;

  const e =
    err instanceof Error
      ? err
      : typeof err === "object" && err
        ? Object.assign(new Error((err as { message?: string }).message ?? "Error"), err)
        : new Error(String(err));

  const event = {
    event_id: randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform,
    level: "error",
    environment: process.env["NODE_ENV"] ?? "production",
    release: "fairway360@1.0.0",
    exception: {
      values: [{ type: e.name || "Error", value: e.message, stacktrace: { frames: framesFrom(e.stack) } }],
    },
    extra: context,
  };

  const url = `${parsed.protocol}//${parsed.host}/api/${parsed.projectId}/store/`;
  const auth = `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=fairway360/1.0`;
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-sentry-auth": auth },
    body: JSON.stringify(event),
  }).catch((sendErr) => logger.debug({ sendErr }, "monitoring: send failed"));
}

/** Capture an error reported from the browser. */
export function captureClientError(payload: { message?: string; stack?: string; url?: string }): void {
  const e = new Error(payload.message || "Client error");
  if (payload.stack) e.stack = payload.stack;
  captureException(e, { url: payload.url }, "javascript");
}

/** Catch crashes that escape Express so they reach Sentry before exit. */
export function installProcessHandlers(): void {
  if (!monitoringEnabled()) return;
  process.on("unhandledRejection", (reason) => captureException(reason, { kind: "unhandledRejection" }));
  process.on("uncaughtException", (err) => captureException(err, { kind: "uncaughtException" }));
}
