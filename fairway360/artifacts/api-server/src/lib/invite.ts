// Invite a newly-created user to set their password. Reuses the password-reset
// token columns (7-day expiry for invites). Returns a link the admin can share;
// also emails it when Resend is configured.

import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, inviteLinks, users } from "@workspace/db";
import type { Role } from "@workspace/api-zod";
import { sendEmail } from "./email";
import { logger } from "./logger";

function inviteHtml(name: string, link: string, clubName: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0f1f17">
    <div style="background:linear-gradient(120deg,#0f3d28,#0a2b1c);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">Fairway360</div>
      <div style="font-size:20px;font-weight:600;margin-top:4px">You're invited to ${clubName}</div>
    </div>
    <div style="border:1px solid #e3e8e5;border-top:none;border-radius:0 0 12px 12px;padding:24px 26px">
      <p>Hi ${name.split(" ")[0] || "there"},</p>
      <p>An account has been created for you on the ${clubName} Fairway360 portal. Set your password to get started — this link expires in 7 days.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#1a6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Set your password</a></p>
    </div>
  </div>`;
}

export async function issueInvite(
  userId: string,
  name: string,
  email: string,
  clubName: string,
  meta?: { clubId: string; role: Role; department?: string | null; createdBy?: string },
): Promise<{ link: string; emailed: boolean }> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db
    .update(users)
    .set({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));

  // Registry row so supervisors can list / revoke / resend pending invites.
  if (meta) {
    await db.insert(inviteLinks).values({
      clubId: meta.clubId,
      tokenHash,
      role: meta.role,
      department: meta.department ?? null,
      email,
      name,
      createdBy: meta.createdBy ?? null,
      expiresAt,
    });
  }

  const base = process.env["APP_URL"] ?? "";
  const link = `${base}/portal/reset?token=${token}`;
  const emailed = await sendEmail({
    to: email,
    subject: `You're invited to ${clubName} on Fairway360`,
    html: inviteHtml(name, link, clubName),
  });
  if (!emailed) {
    logger.warn({ email, link }, "invite: email disabled, link logged for admin");
  }
  return { link, emailed };
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
