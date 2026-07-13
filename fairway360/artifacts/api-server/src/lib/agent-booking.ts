// Lets the Reception AI actually BOOK a tee time (not just talk about it).
// Claims an open slot on the tee sheet near the requested time, or creates the
// booking if the club hasn't generated a sheet. Never fabricates a booking.

import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import { db, members, teeTimes } from "@workspace/db";
import { logger } from "./logger";

export type BookingResult =
  | {
      ok: true;
      bookingId: string;
      reference: string;
      startsAt: string;
      whenLabel: string; // human label echoing the member's requested date/time
      players: number;
    }
  | { ok: false; reason: string };

// Build a friendly "Tuesday, Jul 14 at 8:00 AM" label from the raw date/time
// the member gave — timezone-safe (no Date conversion that could shift it).
function whenLabel(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  // Noon UTC avoids any date rollover; format the weekday/month in UTC.
  const dt = new Date(Date.UTC(y, mo - 1, d, 12));
  const day = dt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  let [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${day} at ${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parseRequested(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return null;
  const d = new Date(`${date}T00:00:00`);
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  d.setHours(h, m, 0, 0);
  return d;
}

export async function bookAgentTeeTime(opts: {
  clubId: string;
  memberUserId: string;
  date: string;
  time: string;
  players: number;
}): Promise<BookingResult> {
  try {
    const want = parseRequested(opts.date, opts.time);
    if (!want) return { ok: false, reason: "I couldn't understand that date/time." };
    if (want.getTime() < Date.now() - 60 * 60 * 1000) {
      return { ok: false, reason: "That time is in the past — please pick an upcoming time." };
    }
    const players = Math.max(1, Math.min(8, Math.floor(opts.players || 1)));

    const [member] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.clubId, opts.clubId), eq(members.userId, opts.memberUserId)));
    if (!member) return { ok: false, reason: "Member profile not found." };

    // Look for an OPEN slot (unbooked, pending) on the requested day, and pick
    // the one closest to the requested time with room for the group.
    const dayStart = new Date(want);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const open = await db
      .select()
      .from(teeTimes)
      .where(
        and(
          eq(teeTimes.clubId, opts.clubId),
          isNull(teeTimes.memberId),
          eq(teeTimes.status, "pending"),
          gte(teeTimes.startsAt, dayStart),
          lt(teeTimes.startsAt, dayEnd),
        ),
      )
      .orderBy(asc(teeTimes.startsAt));

    const fits = open.filter((s) => s.maxPlayers - s.players >= players);
    let chosen = fits.sort(
      (a, b) =>
        Math.abs(a.startsAt.getTime() - want.getTime()) -
        Math.abs(b.startsAt.getTime() - want.getTime()),
    )[0];

    if (chosen) {
      // Claim the open slot for this member.
      const [row] = await db
        .update(teeTimes)
        .set({ memberId: member.id, players, status: "confirmed", updatedAt: new Date() })
        .where(and(eq(teeTimes.id, chosen.id), eq(teeTimes.clubId, opts.clubId), isNull(teeTimes.memberId)))
        .returning({ id: teeTimes.id, startsAt: teeTimes.startsAt });
      if (!row) return { ok: false, reason: "That slot was just taken — try another time." };
      return {
        ok: true,
        bookingId: row.id,
        reference: row.id.slice(0, 8).toUpperCase(),
        startsAt: row.startsAt.toISOString(),
        whenLabel: whenLabel(opts.date, opts.time),
        players,
      };
    }

    // No generated sheet for that day → create the booking directly.
    const [row] = await db
      .insert(teeTimes)
      .values({
        clubId: opts.clubId,
        memberId: member.id,
        startsAt: want,
        players,
        maxPlayers: 4,
        holes: 18,
        status: "confirmed",
      })
      .returning({ id: teeTimes.id, startsAt: teeTimes.startsAt });

    return {
      ok: true,
      bookingId: row.id,
      reference: row.id.slice(0, 8).toUpperCase(),
      startsAt: row.startsAt.toISOString(),
      whenLabel: whenLabel(opts.date, opts.time),
      players,
    };
  } catch (err) {
    logger.error({ err }, "agent-booking: failed to book tee time");
    return { ok: false, reason: "Something went wrong booking that tee time." };
  }
}
