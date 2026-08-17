// Outbound Sales CRM API (super-admin only) — the from-scratch replacement for
// an external CRM. Powers the "Sales CRM" section of the super-admin panel:
// prospect records, the 13-stage pipeline, call logging, the qualification
// scorecard, follow-up scheduling, the daily KPI dashboard, and CSV in/out.

import { Router, type IRouter, type Response } from "express";
import { z } from "zod";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import { db, prospects, prospectCalls } from "@workspace/db";
import { asyncHandler, badRequest, notFound } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")];

// ── Constants from the sales playbook ───────────────────────────────────────

export const STAGES = [
  "New Lead", "Attempted", "Gatekeeper", "DM Identified", "Connected",
  "Qualified", "Demo Booked", "Follow-Up", "Demo Completed", "Proposal",
  "Closed Won", "Closed Lost", "Do Not Call",
] as const;

const OUTCOMES = [
  "No Answer", "Voicemail", "Gatekeeper", "DM Conversation", "Qualified",
  "Demo Booked", "Callback Scheduled", "Not Interested", "Do Not Call",
] as const;

/** The 12 qualification signals — +2 points each (playbook §22). */
export const SCORE_SIGNALS = [
  "Private club",
  "Large membership operation",
  "Restaurant / dining",
  "Weddings / events",
  "Significant tournament activity",
  "High inbound call volume",
  "Multiple departments",
  "Known missed-call problem",
  "Staffing problem",
  "Membership growth objective",
  "Decision-maker engaged",
  "Technology upgrade interest",
] as const;

/** A call outcome can advance the pipeline automatically (never backwards). */
const OUTCOME_STAGE: Record<(typeof OUTCOMES)[number], (typeof STAGES)[number] | null> = {
  "No Answer": "Attempted",
  "Voicemail": "Attempted",
  "Gatekeeper": "Gatekeeper",
  "DM Conversation": "Connected",
  "Qualified": "Qualified",
  "Demo Booked": "Demo Booked",
  "Callback Scheduled": "Follow-Up",
  "Not Interested": "Closed Lost",
  "Do Not Call": "Do Not Call",
};
const stageRank = (s: string): number => STAGES.indexOf(s as (typeof STAGES)[number]);

// ── Validation ──────────────────────────────────────────────────────────────

const ProspectBody = z.object({
  clubName: z.string().trim().min(2).max(160),
  website: z.string().trim().max(300).nullable().optional(),
  mainPhone: z.string().trim().max(40).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(20).nullable().optional(),
  timezone: z.enum(["ET", "CT", "MT", "PT", "Other"]).nullable().optional(),
  clubType: z.string().trim().max(60).nullable().optional(),
  coursesCount: z.number().int().min(1).max(100).nullable().optional(),
  membershipSize: z.string().trim().max(60).nullable().optional(),
  segment: z.enum(["A", "B", "C", "D", "E"]).optional(),
  dmName: z.string().trim().max(120).nullable().optional(),
  dmTitle: z.string().trim().max(120).nullable().optional(),
  dmPhone: z.string().trim().max(40).nullable().optional(),
  dmEmail: z.string().trim().max(160).nullable().optional(),
  currentTeeSoftware: z.string().trim().max(120).nullable().optional(),
  currentClubSoftware: z.string().trim().max(120).nullable().optional(),
  hasDining: z.boolean().optional(),
  hasEvents: z.boolean().optional(),
  hasMembershipProgram: z.boolean().optional(),
  hasTournaments: z.boolean().optional(),
  phoneProcess: z.string().trim().max(300).nullable().optional(),
  stage: z.enum(STAGES).optional(),
  painPrimary: z.string().trim().max(500).nullable().optional(),
  painSecondary: z.string().trim().max(500).nullable().optional(),
  objections: z.string().trim().max(1000).nullable().optional(),
  otherStakeholders: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  scoreSignals: z.array(z.enum(SCORE_SIGNALS)).max(12).optional(),
  nextFollowupAt: z.string().datetime({ offset: true }).nullable().optional(),
  demoAt: z.string().datetime({ offset: true }).nullable().optional(),
  assignedCloser: z.string().trim().max(80).optional(),
});

const classify = (score: number): string =>
  score >= 16 ? "HOT" : score >= 10 ? "WARM" : score >= 5 ? "DEVELOP" : "LOW";

function serialize(p: typeof prospects.$inferSelect) {
  return {
    ...p,
    scoreSignals: (p.scoreSignals as string[]) ?? [],
    classification: classify(p.score),
    lastContactAt: p.lastContactAt?.toISOString() ?? null,
    nextFollowupAt: p.nextFollowupAt?.toISOString() ?? null,
    demoAt: p.demoAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ── Prospect CRUD ───────────────────────────────────────────────────────────

router.get(
  "/admin/prospects",
  ...superAdmin,
  asyncHandler(async (req, res) => {
    const stage = typeof req.query.stage === "string" ? req.query.stage : null;
    const segment = typeof req.query.segment === "string" ? req.query.segment : null;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const due = req.query.due === "today"; // follow-ups due now or earlier

    const wheres = [];
    if (stage && STAGES.includes(stage as (typeof STAGES)[number]))
      wheres.push(eq(prospects.stage, stage as (typeof STAGES)[number]));
    if (segment && ["A", "B", "C", "D", "E"].includes(segment))
      wheres.push(eq(prospects.segment, segment as "A" | "B" | "C" | "D" | "E"));
    if (q)
      wheres.push(
        or(
          ilike(prospects.clubName, `%${q}%`),
          ilike(prospects.dmName, `%${q}%`),
          ilike(prospects.city, `%${q}%`),
          ilike(prospects.state, `%${q}%`),
        ),
      );
    if (due) {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      wheres.push(and(isNotNull(prospects.nextFollowupAt), lte(prospects.nextFollowupAt, endOfDay)));
    }

    const rows = await db
      .select()
      .from(prospects)
      .where(wheres.length ? and(...wheres) : undefined)
      .orderBy(desc(prospects.score), desc(prospects.updatedAt))
      .limit(2000);
    res.json(rows.map(serialize));
  }),
);

router.post(
  "/admin/prospects",
  ...superAdmin,
  asyncHandler(async (req, res) => {
    const body = ProspectBody.parse(req.body);
    const signals = body.scoreSignals ?? [];
    const [row] = await db
      .insert(prospects)
      .values({
        ...body,
        scoreSignals: signals,
        score: signals.length * 2,
        nextFollowupAt: body.nextFollowupAt ? new Date(body.nextFollowupAt) : null,
        demoAt: body.demoAt ? new Date(body.demoAt) : null,
      })
      .returning();
    res.status(201).json(serialize(row));
  }),
);

router.get(
  "/admin/prospects/:id",
  ...superAdmin,
  asyncHandler<{ id: string }>(async (req, res) => {
    const [row] = await db.select().from(prospects).where(eq(prospects.id, req.params.id));
    if (!row) throw notFound("Prospect not found.");
    const calls = await db
      .select()
      .from(prospectCalls)
      .where(eq(prospectCalls.prospectId, row.id))
      .orderBy(desc(prospectCalls.calledAt))
      .limit(100);
    res.json({
      ...serialize(row),
      calls: calls.map((c) => ({
        id: c.id,
        calledAt: c.calledAt.toISOString(),
        outcome: c.outcome,
        callerName: c.callerName,
        notes: c.notes,
      })),
    });
  }),
);

router.patch(
  "/admin/prospects/:id",
  ...superAdmin,
  asyncHandler<{ id: string }>(async (req, res) => {
    const body = ProspectBody.partial().parse(req.body);
    const patch: Record<string, unknown> = { ...body, updatedAt: new Date() };
    if (body.scoreSignals) {
      patch.scoreSignals = body.scoreSignals;
      patch.score = body.scoreSignals.length * 2;
    }
    if ("nextFollowupAt" in body)
      patch.nextFollowupAt = body.nextFollowupAt ? new Date(body.nextFollowupAt) : null;
    if ("demoAt" in body) patch.demoAt = body.demoAt ? new Date(body.demoAt) : null;
    const [row] = await db
      .update(prospects)
      .set(patch)
      .where(eq(prospects.id, req.params.id))
      .returning();
    if (!row) throw notFound("Prospect not found.");
    res.json(serialize(row));
  }),
);

router.delete(
  "/admin/prospects/:id",
  ...superAdmin,
  asyncHandler<{ id: string }>(async (req, res) => {
    const rows = await db.delete(prospects).where(eq(prospects.id, req.params.id)).returning({ id: prospects.id });
    if (rows.length === 0) throw notFound("Prospect not found.");
    res.json({ ok: true });
  }),
);

// ── Call logging ────────────────────────────────────────────────────────────
// One entry per dial. The outcome advances the pipeline (never backwards),
// stamps lastContactAt, and can schedule the follow-up / demo in the same call.

const LogCallBody = z.object({
  outcome: z.enum(OUTCOMES),
  notes: z.string().trim().max(2000).optional(),
  callerName: z.string().trim().max(80).optional(),
  nextFollowupAt: z.string().datetime({ offset: true }).nullable().optional(),
  demoAt: z.string().datetime({ offset: true }).nullable().optional(),
});

router.post(
  "/admin/prospects/:id/calls",
  ...superAdmin,
  asyncHandler<{ id: string }>(async (req, res) => {
    const body = LogCallBody.parse(req.body);
    const [p] = await db.select().from(prospects).where(eq(prospects.id, req.params.id));
    if (!p) throw notFound("Prospect not found.");

    const [call] = await db
      .insert(prospectCalls)
      .values({
        prospectId: p.id,
        outcome: body.outcome,
        notes: body.notes ?? null,
        callerName: body.callerName ?? null,
      })
      .returning();

    // Advance the stage if the outcome ranks higher than where the prospect is.
    // Terminal stages (Closed Won/Lost, Do Not Call) always stick when chosen.
    const target = OUTCOME_STAGE[body.outcome];
    const patch: Record<string, unknown> = { lastContactAt: new Date(), updatedAt: new Date() };
    if (target) {
      const terminal = target === "Closed Lost" || target === "Do Not Call";
      if (terminal || stageRank(target) > stageRank(p.stage)) patch.stage = target;
    }
    if ("nextFollowupAt" in body)
      patch.nextFollowupAt = body.nextFollowupAt ? new Date(body.nextFollowupAt) : null;
    if (body.demoAt) patch.demoAt = new Date(body.demoAt);

    const [updated] = await db.update(prospects).set(patch).where(eq(prospects.id, p.id)).returning();
    res.status(201).json({
      call: { id: call.id, calledAt: call.calledAt.toISOString(), outcome: call.outcome },
      prospect: serialize(updated),
    });
  }),
);

// ── Daily KPI summary (the end-of-day scorecard, computed live) ─────────────

router.get(
  "/admin/outreach/summary",
  ...superAdmin,
  asyncHandler(async (_req, res) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCalls = await db
      .select({ outcome: prospectCalls.outcome, c: count() })
      .from(prospectCalls)
      .where(gte(prospectCalls.calledAt, dayStart))
      .groupBy(prospectCalls.outcome);
    const n = (o: (typeof OUTCOMES)[number]): number =>
      Number(todayCalls.find((r) => r.outcome === o)?.c ?? 0);
    const attempted = todayCalls.reduce((s, r) => s + Number(r.c), 0);
    const conversations = n("Gatekeeper") + n("DM Conversation") + n("Qualified") + n("Demo Booked");
    const dms = n("DM Conversation") + n("Qualified") + n("Demo Booked");

    const stageCounts = await db
      .select({ stage: prospects.stage, c: count() })
      .from(prospects)
      .groupBy(prospects.stage);

    const [followupsDue] = await db
      .select({ c: count() })
      .from(prospects)
      .where(and(isNotNull(prospects.nextFollowupAt), lte(prospects.nextFollowupAt, endOfDay)));

    const upcomingDemos = await db
      .select()
      .from(prospects)
      .where(and(isNotNull(prospects.demoAt), gte(prospects.demoAt, dayStart)))
      .orderBy(asc(prospects.demoAt))
      .limit(10);

    // Best opportunity today: highest score among prospects touched today.
    const [best] = await db
      .select()
      .from(prospects)
      .where(gte(prospects.updatedAt, dayStart))
      .orderBy(desc(prospects.score))
      .limit(1);

    const [total] = await db.select({ c: count() }).from(prospects);

    res.json({
      today: {
        callsAttempted: attempted,
        liveAnswers: attempted - n("No Answer") - n("Voicemail"),
        gatekeepers: n("Gatekeeper"),
        conversations,
        decisionMakers: dms,
        qualified: n("Qualified"),
        demosBooked: n("Demo Booked"),
        callbacks: n("Callback Scheduled"),
        voicemails: n("Voicemail"),
        notInterested: n("Not Interested"),
        doNotCall: n("Do Not Call"),
      },
      funnel: STAGES.map((s) => ({
        stage: s,
        count: Number(stageCounts.find((r) => r.stage === s)?.c ?? 0),
      })),
      totalProspects: Number(total?.c ?? 0),
      followupsDueToday: Number(followupsDue?.c ?? 0),
      upcomingDemos: upcomingDemos.map((p) => ({
        id: p.id,
        clubName: p.clubName,
        dmName: p.dmName,
        demoAt: p.demoAt?.toISOString() ?? null,
        assignedCloser: p.assignedCloser,
        score: p.score,
      })),
      bestOpportunity: best
        ? { id: best.id, clubName: best.clubName, score: best.score, stage: best.stage, painPrimary: best.painPrimary }
        : null,
    });
  }),
);

// ── Bulk import + CSV export ────────────────────────────────────────────────
// Import format (one per line, header optional):
// clubName,city,state,timezone,clubType,segment,website,mainPhone,dmName,dmTitle,dmPhone,dmEmail

const BulkImportBody = z.object({ csv: z.string().min(1).max(500_000) });

router.post(
  "/admin/prospects/bulk-import",
  ...superAdmin,
  asyncHandler(async (req, res) => {
    const { csv } = BulkImportBody.parse(req.body);
    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines[0]?.toLowerCase().startsWith("clubname")) lines.shift();
    if (lines.length === 0) throw badRequest("No rows to import.");
    if (lines.length > 2000) throw badRequest("Max 2,000 rows per import.");

    const seen = new Set(
      (await db.select({ n: prospects.clubName, s: prospects.state }).from(prospects)).map(
        (r) => `${r.n.toLowerCase()}|${(r.s ?? "").toLowerCase()}`,
      ),
    );

    let imported = 0;
    const skipped: { line: string; reason: string }[] = [];
    for (const line of lines) {
      const [clubName, city, state, timezone, clubType, segment, website, mainPhone, dmName, dmTitle, dmPhone, dmEmail] =
        line.split(",").map((s) => s?.trim() || null);
      if (!clubName || clubName.length < 2) {
        skipped.push({ line: line.slice(0, 60), reason: "missing club name" });
        continue;
      }
      const key = `${clubName.toLowerCase()}|${(state ?? "").toLowerCase()}`;
      if (seen.has(key)) {
        skipped.push({ line: clubName, reason: "duplicate (same name + state)" });
        continue;
      }
      seen.add(key);
      await db.insert(prospects).values({
        clubName,
        city,
        state,
        timezone: timezone && ["ET", "CT", "MT", "PT"].includes(timezone) ? timezone : null,
        clubType,
        segment: segment && ["A", "B", "C", "D", "E"].includes(segment) ? (segment as "A") : "D",
        website,
        mainPhone,
        dmName,
        dmTitle,
        dmPhone,
        dmEmail,
      });
      imported += 1;
    }
    res.status(201).json({ imported, skipped });
  }),
);

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get(
  "/admin/prospects-export",
  ...superAdmin,
  asyncHandler(async (_req, res: Response) => {
    const rows = await db.select().from(prospects).orderBy(asc(prospects.clubName));
    const header = [
      "club_name", "city", "state", "timezone", "club_type", "segment", "stage", "score", "classification",
      "dm_name", "dm_title", "dm_phone", "dm_email", "website", "main_phone",
      "current_tee_software", "pain_primary", "objections", "last_contact_at", "next_followup_at", "demo_at",
      "assigned_closer", "notes",
    ];
    const body = rows.map((p) =>
      [
        p.clubName, p.city, p.state, p.timezone, p.clubType, p.segment, p.stage, p.score, classify(p.score),
        p.dmName, p.dmTitle, p.dmPhone, p.dmEmail, p.website, p.mainPhone,
        p.currentTeeSoftware, p.painPrimary, p.objections, p.lastContactAt, p.nextFollowupAt, p.demoAt,
        p.assignedCloser, p.notes,
      ].map(csvCell).join(","),
    );
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", 'attachment; filename="prospects.csv"');
    res.send([header.join(","), ...body].join("\n"));
  }),
);

export default router;
