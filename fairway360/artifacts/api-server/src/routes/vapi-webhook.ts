// Vapi voice-agent webhook — turns inbound phone calls into real leads.
//
// The AI receptionist ("Elliot") runs on Vapi; Vapi POSTs call events to this
// endpoint (set as the phone number's Server URL). We care about
// `end-of-call-report`, which arrives once per finished call carrying the
// transcript, a summary, and — when a structured-data schema is configured on
// the assistant — the fields Elliot collected (club name, role, need…).
//
// Every finished call becomes a row in `leads` plus an email to the sales
// inbox, so a call that never books a consultation is still captured rather
// than lost. Verified with a shared secret because this endpoint is public.

import { Router, type IRouter, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { db, clubs, leads } from "@workspace/db";
import { asyncHandler } from "../lib/http";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/email";

const router: IRouter = Router();

/**
 * Shared secret gate for the public Vapi endpoints. Returns true when the
 * request is authorised (or when no secret is configured — dev only). Vapi can
 * send the secret as a custom header or a bearer token depending on setup.
 */
function vapiAuthorized(req: Request): boolean {
  const expected = process.env["VAPI_WEBHOOK_SECRET"];
  if (!expected) return true; // no secret set (dev); must be set in production
  const got =
    req.get("x-vapi-secret") ??
    req.get("x-vapi-signature") ??
    req.get("authorization")?.replace(/^Bearer\s+/i, "");
  return got === expected;
}

// Sales leads land on the platform's demo tenant, same as the website form.
const DEMO_CLUB_SLUG = "augusta-pines";

type AnyRecord = Record<string, unknown>;

const str = (v: unknown): string | null => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
};

/** First non-empty string found at any of the given dot-paths. */
function pick(obj: AnyRecord, paths: string[]): string | null {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path.split(".")) {
      if (cur && typeof cur === "object") cur = (cur as AnyRecord)[key];
      else { cur = undefined; break; }
    }
    const s = str(cur);
    if (s) return s;
  }
  return null;
}

/**
 * Vapi has moved fields between payload shapes across versions (and the
 * structured-data keys are whatever the assistant was configured with), so
 * read defensively from every location a value is known to appear.
 */
function extractLead(message: AnyRecord) {
  return {
    callId: pick(message, ["call.id", "callId", "call.orgId"]),
    phone: pick(message, [
      "call.customer.number",
      "customer.number",
      "call.from",
      "analysis.structuredData.phone",
      "analysis.structuredData.phoneNumber",
    ]),
    clubName: pick(message, [
      "analysis.structuredData.clubName",
      "analysis.structuredData.courseName",
      "analysis.structuredData.club",
      "analysis.structuredData.company",
    ]),
    contactName: pick(message, [
      "analysis.structuredData.callerName",
      "analysis.structuredData.name",
      "analysis.structuredData.fullName",
    ]),
    email: pick(message, [
      "analysis.structuredData.email",
      "analysis.structuredData.emailAddress",
    ]),
    role: pick(message, [
      "analysis.structuredData.role",
      "analysis.structuredData.title",
    ]),
    need: pick(message, [
      "analysis.structuredData.primaryNeed",
      "analysis.structuredData.interest",
      "analysis.structuredData.need",
    ]),
    currentSoftware: pick(message, [
      "analysis.structuredData.currentSoftware",
      "analysis.structuredData.currentSetup",
    ]),
    booked: pick(message, [
      "analysis.structuredData.booked",
      "analysis.structuredData.consultationBooked",
    ]),
    summary: pick(message, ["analysis.summary", "summary"]),
    transcript: pick(message, ["artifact.transcript", "transcript"]),
    endedReason: pick(message, ["endedReason", "call.endedReason"]),
  };
}

function leadEmailHtml(l: ReturnType<typeof extractLead>): string {
  const rows: [string, string | null][] = [
    ["Caller", l.contactName],
    ["Club / course", l.clubName],
    ["Phone", l.phone],
    ["Email", l.email],
    ["Role", l.role],
    ["Looking for", l.need],
    ["Current software", l.currentSoftware],
    ["Consultation booked", l.booked],
    ["Call ended", l.endedReason],
  ];
  const table = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">${k}</td>` +
        `<td style="padding:4px 0;font-weight:500">${escapeHtml(v!)}</td></tr>`,
    )
    .join("");

  const summary = l.summary
    ? `<h3 style="margin:20px 0 6px;font-size:14px">Summary</h3><p>${escapeHtml(l.summary)}</p>`
    : "";
  const transcript = l.transcript
    ? `<h3 style="margin:20px 0 6px;font-size:14px">Transcript</h3>` +
      `<pre style="white-space:pre-wrap;font-family:inherit;background:#f6f7f5;padding:12px;border-radius:8px">${escapeHtml(l.transcript)}</pre>`
    : "";

  return `<table>${table}</table>${summary}${transcript}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

router.post(
  "/vapi/webhook",
  asyncHandler(async (req, res) => {
    // Shared-secret check. Vapi sends whatever custom headers the phone
    // number / assistant is configured with; we look for the usual ones.
    if (!vapiAuthorized(req)) {
      logger.warn("vapi: rejected webhook with bad/missing secret");
      res.status(401).json({ ok: false });
      return;
    }

    const body = (req.body ?? {}) as AnyRecord;
    const message = (body["message"] ?? body) as AnyRecord;
    const type = str(message["type"]) ?? "";

    // Vapi retries on non-2xx, so acknowledge everything and only act on the
    // end-of-call report. (status-update / transcript / speech events are noisy.)
    if (type !== "end-of-call-report") {
      res.json({ ok: true, ignored: type || "unknown" });
      return;
    }

    const lead = extractLead(message);
    logger.info(
      { callId: lead.callId, club: lead.clubName, booked: lead.booked },
      "vapi: end-of-call report",
    );

    try {
      const [club] = await db
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.slug, DEMO_CLUB_SLUG));

      if (club) {
        // Vapi can redeliver a report; don't create the same lead twice.
        const marker = lead.callId ? `vapi:${lead.callId}` : null;
        const existing = marker
          ? await db
              .select({ id: leads.id })
              .from(leads)
              .where(and(eq(leads.clubId, club.id), eq(leads.volume, marker)))
          : [];

        if (existing.length === 0) {
          await db.insert(leads).values({
            clubId: club.id,
            name: lead.clubName ?? lead.contactName ?? "Phone caller",
            contactName: lead.contactName,
            email: lead.email,
            phone: lead.phone,
            source: "Phone (AI)",
            interest: lead.need ?? "Inbound call",
            status: "New",
            businessType: lead.role,
            problem: lead.summary,
            // Doubles as the idempotency marker for redelivered reports.
            volume: marker,
          });
        }
      }
    } catch (err) {
      // Never fail the webhook on a storage error — Vapi would retry forever
      // and the notification below is still worth sending.
      logger.error({ err }, "vapi: failed to store lead");
    }

    const inbox = process.env["SALES_NOTIFY_EMAIL"];
    if (inbox) {
      void sendEmail({
        to: inbox,
        subject: `Call lead: ${lead.clubName ?? lead.contactName ?? lead.phone ?? "unknown caller"}`,
        html: leadEmailHtml(lead),
      });
    }

    res.json({ ok: true });
  }),
);

// ── Booking proxy ───────────────────────────────────────────────────────────
// The Vapi book_consultation tool POSTs a FLAT body here; we assemble the exact
// nested shape Cal.com's v2 booking API requires and forward it. Doing it here
// (not Vapi → Cal.com directly) keeps the Cal.com key on the server, guarantees
// the attendee nesting/types are right, and lets us log the booking.

const CAL_BOOKINGS_URL = "https://api.cal.com/v2/bookings";
const CAL_API_VERSION = "2024-08-13";

router.post(
  "/vapi/book",
  asyncHandler(async (req, res) => {
    if (!vapiAuthorized(req)) {
      res.status(401).json({ ok: false, message: "Unauthorized." });
      return;
    }

    const apiKey = process.env["CAL_API_KEY"];
    if (!apiKey) {
      logger.error("vapi/book: CAL_API_KEY not configured");
      // Tell the agent to fall back to "the team will confirm by email".
      res.json({ ok: false, message: "Booking system unavailable — take the caller's preferred time and tell them the team will confirm by email." });
      return;
    }

    const body = (req.body ?? {}) as AnyRecord;
    const start = str(body["start"]);
    const name = str(body["name"]);
    const email = str(body["email"]);
    const timeZone = str(body["timeZone"]);
    // eventTypeId may arrive as a static body field (string) or from env.
    const eventTypeId =
      Number(str(body["eventTypeId"])) || Number(process.env["CAL_EVENT_TYPE_ID"]) || 0;

    const missing = [
      !start && "start time",
      !name && "name",
      !email && "email",
      !timeZone && "timezone",
      !eventTypeId && "event type",
    ].filter(Boolean);
    if (missing.length) {
      res.json({ ok: false, message: `Can't book yet — still missing: ${missing.join(", ")}.` });
      return;
    }

    try {
      const calRes = await fetch(CAL_BOOKINGS_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "cal-api-version": CAL_API_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          start,
          eventTypeId,
          attendee: { name, email, timeZone, language: "en" },
        }),
      });

      const data = (await calRes.json().catch(() => ({}))) as AnyRecord;

      if (!calRes.ok) {
        // Cal.com rejected it (slot taken, bad time, etc). Surface a short
        // reason so the agent can offer another slot instead of claiming success.
        const reason =
          str(data["message"]) ??
          str((data["error"] as AnyRecord | undefined)?.["message"]) ??
          `status ${calRes.status}`;
        logger.warn({ status: calRes.status, reason }, "vapi/book: cal.com rejected booking");
        res.json({ ok: false, message: `Couldn't book that slot: ${reason}. Offer the caller another time from check_availability.` });
        return;
      }

      const dataObj = (data["data"] ?? data) as AnyRecord;
      const bookingUid = str(dataObj["uid"]) ?? str(dataObj["id"]) ?? null;
      logger.info({ bookingUid, email }, "vapi/book: booking created");

      res.json({
        ok: true,
        message: "Booked. A confirmation email is on the way to the caller.",
        bookingUid,
        start,
      });
    } catch (err) {
      logger.error({ err }, "vapi/book: request to cal.com failed");
      res.json({ ok: false, message: "Booking system had a hiccup — take the caller's preferred time and tell them the team will confirm by email." });
    }
  }),
);

export default router;
