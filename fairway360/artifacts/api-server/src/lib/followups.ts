// Automated email follow-up engine ("lead nurture").
//
// Every club's open leads — demo requests, membership applications, tee-time
// and event inquiries — get up to two automated follow-up emails when nobody
// has moved the lead out of New/Contacted:
//
//   touch 1: lead is ≥ 2 days old, no follow-up sent yet
//   touch 2: ≥ 3 days after touch 1
//
// The engine stops the moment a lead's status changes (Tour Booked / Won /
// Lost) or the cap is reached, so staff action always wins over automation.
// Counters are stamped BEFORE sending: a crash can lose one email but can
// never spam a lead twice.
//
// Runs in-process on an interval (no external queue), and no-ops entirely when
// email isn't configured. Tunables via env for testing:
//   FOLLOWUP_INTERVAL_MS   how often to scan            (default 6h)
//   FOLLOWUP_FIRST_MS      lead age before touch 1      (default 2d)
//   FOLLOWUP_SECOND_MS     gap after touch 1 → touch 2  (default 3d)

import { and, eq, inArray, isNotNull, lt, or, isNull } from "drizzle-orm";
import { db, clubs, leads, users } from "@workspace/db";
import { sendEmail, emailEnabled } from "./email";
import { logger } from "./logger";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const envMs = (name: string, fallback: number): number => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

const MAX_TOUCHES = 2;

function followupHtml(opts: {
  firstName: string;
  clubName: string;
  interest: string | null;
  touch: number;
}): string {
  const { firstName, clubName, interest, touch } = opts;
  const about = interest ? ` about ${interest.toLowerCase()}` : "";
  const body =
    touch === 1
      ? `<p>Hi ${firstName},</p>
         <p>Thanks again for reaching out to ${clubName}${about}. We wanted to make sure your inquiry didn't slip through — the team is ready to help whenever you are.</p>
         <p>Just reply to this email and we'll pick it right up.</p>`
      : `<p>Hi ${firstName},</p>
         <p>One last note from ${clubName}${about} — if the timing isn't right, no problem at all. If you'd still like to talk, a quick reply is all it takes and we'll take care of the rest.</p>`;
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f1f17">
    <div style="background:linear-gradient(120deg,#0f3d28,#0a2b1c);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">${clubName}</div>
      <div style="font-size:20px;font-weight:600;margin-top:4px">Still here to help</div>
    </div>
    <div style="border:1px solid #e3e8e5;border-top:none;border-radius:0 0 12px 12px;padding:24px 26px">${body}
      <p style="color:#5b6b63;font-size:13px;margin-top:22px">You're receiving this because you contacted ${clubName}. Reply to stop further emails.</p>
    </div>
  </div>`;
}

/** One scan over all clubs' leads. Exported so tests can invoke it directly. */
export async function runFollowupScan(): Promise<number> {
  if (!emailEnabled()) return 0;

  const firstAfter = envMs("FOLLOWUP_FIRST_MS", 2 * DAY);
  const secondAfter = envMs("FOLLOWUP_SECOND_MS", 3 * DAY);
  const now = Date.now();

  // Candidates: open leads with an email that either never got a touch and are
  // old enough, or got touch 1 long enough ago. Cap guard included.
  const rows = await db
    .select({ lead: leads, clubName: clubs.name, clubId: clubs.id })
    .from(leads)
    .innerJoin(clubs, eq(leads.clubId, clubs.id))
    .where(
      and(
        inArray(leads.status, ["New", "Contacted"]),
        isNotNull(leads.email),
        lt(leads.followupCount, MAX_TOUCHES),
        or(
          and(eq(leads.followupCount, 0), lt(leads.createdAt, new Date(now - firstAfter))),
          and(isNotNull(leads.lastFollowupAt), lt(leads.lastFollowupAt, new Date(now - secondAfter))),
        ),
      ),
    )
    .limit(200);

  let sent = 0;
  for (const { lead, clubId, clubName } of rows) {
    if (!lead.email) continue;
    const touch = lead.followupCount + 1;

    // Stamp first (idempotency): a crash after this loses one email at worst.
    const updated = await db
      .update(leads)
      .set({ followupCount: touch, lastFollowupAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(leads.id, lead.id),
          eq(leads.clubId, clubId),
          eq(leads.followupCount, lead.followupCount), // optimistic guard
        ),
      )
      .returning({ id: leads.id });
    if (updated.length === 0) continue; // another scan got there first

    // Reply-to: the club's first supervisor, so replies reach a human.
    const [admin] = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.clubId, clubId), eq(users.role, "supervisor")))
      .limit(1);

    const firstName = (lead.contactName ?? lead.name).split(" ")[0] || "there";
    const ok = await sendEmail({
      to: lead.email,
      subject:
        touch === 1
          ? `Following up on your inquiry — ${clubName}`
          : `Anything we can help with? — ${clubName}`,
      html: followupHtml({ firstName, clubName, interest: lead.interest, touch }),
      ...(admin?.email ? { replyTo: admin.email } : {}),
    });
    if (ok) sent += 1;
  }

  if (sent) logger.info({ sent }, "followups: nurture emails sent");
  return sent;
}

let timer: NodeJS.Timeout | null = null;

/** Start the periodic scan. Safe to call once at boot; no-op without email. */
export function startFollowupEngine(): void {
  if (timer) return;
  if (!emailEnabled()) {
    logger.info("followups: disabled (email not configured)");
    return;
  }
  const interval = envMs("FOLLOWUP_INTERVAL_MS", 6 * HOUR);
  // First scan shortly after boot, then on the interval.
  setTimeout(() => void runFollowupScan().catch((err) => logger.error({ err }, "followups: scan failed")), 60_000);
  timer = setInterval(
    () => void runFollowupScan().catch((err) => logger.error({ err }, "followups: scan failed")),
    interval,
  );
  timer.unref?.();
  logger.info({ intervalMs: interval }, "followups: engine started");
}
