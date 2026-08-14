// Review automation. When a member's F&B order is delivered and the club has a
// public review link configured (Manage Club → Settings), send the member a
// short "how did we do?" email pointing at that link — throttled to at most
// one request per member per 30 days so regulars are never nagged.

import { and, eq } from "drizzle-orm";
import { db, clubs, members, users } from "@workspace/db";
import { sendEmail, emailEnabled } from "./email";
import { logger } from "./logger";

const THROTTLE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function reviewHtml(firstName: string, clubName: string, link: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f1f17">
    <div style="background:linear-gradient(120deg,#0f3d28,#0a2b1c);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">${clubName}</div>
      <div style="font-size:20px;font-weight:600;margin-top:4px">How was everything today?</div>
    </div>
    <div style="border:1px solid #e3e8e5;border-top:none;border-radius:0 0 12px 12px;padding:24px 26px">
      <p>Hi ${firstName},</p>
      <p>Hope you enjoyed your order at ${clubName}. If you have 30 seconds, a quick review helps the club more than you'd think.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#1a6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Leave a review</a></p>
      <p style="color:#5b6b63;font-size:13px">Thanks for being part of the club.</p>
    </div>
  </div>`;
}

/**
 * Fire-and-forget from the order-status handler. Never throws; all failure
 * modes just skip the email.
 */
export async function maybeSendReviewRequest(clubId: string, memberId: string): Promise<void> {
  try {
    if (!emailEnabled()) return;

    const [club] = await db
      .select({ name: clubs.name, reviewLink: clubs.reviewLink })
      .from(clubs)
      .where(eq(clubs.id, clubId));
    if (!club?.reviewLink) return; // feature off until the club sets a link

    const [row] = await db
      .select({ m: members, email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(eq(members.id, memberId), eq(members.clubId, clubId)));
    if (!row?.email) return;

    const last = row.m.lastReviewRequestAt?.getTime() ?? 0;
    if (Date.now() - last < THROTTLE_MS) return;

    // Stamp before sending so a redelivered status update can't double-send.
    await db
      .update(members)
      .set({ lastReviewRequestAt: new Date(), updatedAt: new Date() })
      .where(and(eq(members.id, memberId), eq(members.clubId, clubId)));

    const firstName = row.name.split(" ")[0] || "there";
    const ok = await sendEmail({
      to: row.email,
      subject: `How was your order? — ${club.name}`,
      html: reviewHtml(firstName, club.name, club.reviewLink),
    });
    if (ok) logger.info({ memberId }, "reviews: request sent");
  } catch (err) {
    logger.error({ err }, "reviews: failed to send request");
  }
}
