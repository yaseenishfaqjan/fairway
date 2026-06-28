// Firebase Cloud Messaging push — env-gated, no SDK. Signs a service-account
// JWT with Node crypto, exchanges it for an OAuth2 access token, and sends via
// the FCM HTTP v1 REST API. No-ops when Firebase env isn't configured.

import { createSign } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, deviceTokens } from "@workspace/db";
import { logger } from "./logger";

function projectId() { return process.env["FIREBASE_PROJECT_ID"]; }
function clientEmail() { return process.env["FIREBASE_CLIENT_EMAIL"]; }
function privateKey() { return process.env["FIREBASE_PRIVATE_KEY"]?.replace(/\\n/g, "\n"); }

export function pushEnabled(): boolean {
  return Boolean(projectId() && clientEmail() && privateKey());
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string | null> {
  if (cached && Date.now() < cached.exp - 60_000) return cached.token;
  const email = clientEmail();
  const key = privateKey();
  if (!email || !key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const signingInput = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(key, "base64url");
  const jwt = `${signingInput}.${signature}`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      logger.error({ status: res.status, body: await res.text() }, "push: token exchange failed");
      return null;
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
    return cached.token;
  } catch (err) {
    logger.error({ err }, "push: token request failed");
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}

/** Send to raw FCM tokens. Deletes tokens FCM reports as unregistered. */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<number> {
  if (!pushEnabled() || tokens.length === 0) return 0;
  const at = await accessToken();
  const pid = projectId();
  if (!at || !pid) return 0;

  const url = `https://fcm.googleapis.com/v1/projects/${pid}/messages:send`;
  let sent = 0;
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { authorization: `Bearer ${at}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: payload.title, body: payload.body },
              data: payload.data,
              webpush: payload.link ? { fcmOptions: { link: payload.link } } : undefined,
            },
          }),
        });
        if (res.ok) sent += 1;
        else if (res.status === 404) {
          await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
        }
      } catch (err) {
        logger.debug({ err }, "push: send failed for a token");
      }
    }),
  );
  return sent;
}

/** Send to all registered devices for the given users within a club. */
export async function sendToUsers(clubId: string, userIds: string[], payload: PushPayload): Promise<number> {
  if (!pushEnabled() || userIds.length === 0) return 0;
  const rows = await db
    .select({ token: deviceTokens.token })
    .from(deviceTokens)
    .where(and(eq(deviceTokens.clubId, clubId), inArray(deviceTokens.userId, userIds)));
  return sendPush(rows.map((r) => r.token), payload);
}
