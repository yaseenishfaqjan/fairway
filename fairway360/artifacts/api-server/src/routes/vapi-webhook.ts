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

import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, clubs, leads } from "@workspace/db";
import { asyncHandler } from "../lib/http";
import { logger } from "../lib/logger";
import { sendEmail } from "../lib/email";

const router: IRouter = Router();

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
    const expected = process.env["VAPI_WEBHOOK_SECRET"];
    if (expected) {
      const got =
        req.get("x-vapi-secret") ??
        req.get("x-vapi-signature") ??
        req.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (got !== expected) {
        logger.warn("vapi: rejected webhook with bad/missing secret");
        res.status(401).json({ ok: false });
        return;
      }
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

export default router;
