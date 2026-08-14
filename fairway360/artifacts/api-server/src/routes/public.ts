import { Router, type IRouter } from "express";
import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, clubs, leads, users, teeTimes, menuItems } from "@workspace/db";
import { CreateDemoRequestBody } from "@workspace/api-zod";
import { asyncHandler, badRequest, notFound } from "../lib/http";
import { sendDemoConfirmation, notifySalesOfDemo, sendEmail } from "../lib/email";
import { rateLimit } from "../lib/rate-limit";
import { captureClientError } from "../lib/monitoring";
import { resolveTenantForRequest } from "../lib/tenant";
import { llmEnabled, llmComplete } from "../lib/llm";
import { loadSemanticMemory } from "../lib/memory";

const router: IRouter = Router();

// Public tenant branding — resolved from X-Tenant-Slug header, subdomain, or
// ?slug=. Lets a club's login/registration page show its own name and colors
// before any authentication.
router.get(
  "/public/club-info",
  asyncHandler(async (req, res) => {
    const club = await resolveTenantForRequest(req);
    if (!club) throw notFound("Club not identified.");
    res.json({
      name: club.name,
      slug: club.slug,
      logoUrl: club.logoUrl,
      primaryColor: club.primaryColor,
      accentColor: club.accentColor,
      timezone: club.timezone,
      currency: club.currency,
    });
  }),
);

// Browser error reporter → forwards to Sentry (if configured). Fire-and-forget.
const clientErrorLimiter = rateLimit({ windowMs: 60_000, max: 30, key: "client-error" });
router.post("/monitoring/client-error", clientErrorLimiter, (req, res) => {
  const { message, stack, url } = (req.body ?? {}) as { message?: string; stack?: string; url?: string };
  captureClientError({ message, stack, url });
  res.status(204).end();
});

// Demo / sales request from the marketing site. There is no session here, so it
// can't be tenant-scoped from auth; we route it to the Augusta Pines demo tenant
// as a new sales lead (the platform's default inbox for now).
const DEMO_CLUB_SLUG = "augusta-pines";

// Spam protection on the public marketing form.
const demoLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, key: "demo" });

router.post(
  "/leads/demo-request",
  demoLimiter,
  asyncHandler(async (req, res) => {
    const body = CreateDemoRequestBody.parse(req.body);

    const [club] = await db
      .select({ id: clubs.id })
      .from(clubs)
      .where(eq(clubs.slug, DEMO_CLUB_SLUG));

    if (club) {
      await db.insert(leads).values({
        clubId: club.id,
        name: body.clubName ?? body.name,
        contactName: body.name,
        email: body.email,
        phone: body.phone ?? null,
        source: "Demo Request",
        interest: body.businessType ?? "Demo Request",
        status: "New",
        businessType: body.businessType ?? null,
        problem: body.problem ?? null,
        volume: body.volume ?? null,
      });
    }

    // Fire-and-forget: email failures must not break lead capture. Both helpers
    // catch internally and no-op when Resend isn't configured.
    void sendDemoConfirmation(body);
    void notifySalesOfDemo(body);

    res.json({ ok: true });
  }),
);

// Member self-signup — a prospective member applies to a specific club. We
// capture it as a "Membership" lead on that club's tenant (the club approves it
// from the Leads tab, which then creates the member + invite). Members are never
// created directly here: the club always controls its own roster.
const joinLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, key: "join" });
const JoinBody = z.object({
  slug: z.string().trim().min(1).max(60),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(600).optional(),
});

router.post(
  "/public/join",
  joinLimiter,
  asyncHandler(async (req, res) => {
    const body = JoinBody.parse(req.body);
    const slug = body.slug.toLowerCase();

    const [club] = await db
      .select({ id: clubs.id, name: clubs.name })
      .from(clubs)
      .where(eq(clubs.slug, slug));
    if (!club) throw notFound("We couldn't find that club.");

    const email = body.email.toLowerCase();

    // If they already have any account at this club, don't create a duplicate
    // lead — tell them to sign in instead. (Same email can exist at other clubs.)
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.clubId, club.id), eq(users.email, email)));
    if (existing) {
      throw badRequest("You already have an account at this club — please sign in or reset your password.");
    }

    await db.insert(leads).values({
      clubId: club.id,
      name: body.name,
      contactName: body.name,
      email,
      phone: body.phone ?? null,
      source: "Membership Application",
      interest: "Membership",
      status: "New",
      problem: body.message ?? null,
    });

    // Notify the club's admin(s) that someone applied. Best-effort; never blocks.
    const admins = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.clubId, club.id), eq(users.role, "supervisor")));
    for (const a of admins) {
      void sendEmail({
        to: a.email,
        replyTo: email,
        subject: `New membership application: ${body.name}`,
        html:
          `<p>${body.name} applied to join ${club.name}.</p>` +
          `<table>` +
          `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">Email</td><td>${email}</td></tr>` +
          (body.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">Phone</td><td>${body.phone}</td></tr>` : "") +
          (body.message ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63;vertical-align:top">Message</td><td>${body.message}</td></tr>` : "") +
          `</table>` +
          `<p style="margin-top:16px">Approve them from your Leads tab to create their member account and send an invite.</p>`,
      });
    }

    // Acknowledge to the applicant.
    void sendEmail({
      to: email,
      subject: `Your application to ${club.name}`,
      html: `<p>Thanks, ${body.name} — ${club.name} has received your membership application. They'll be in touch, and once approved you'll get an email to set up your member account.</p>`,
    });

    res.json({ ok: true, clubName: club.name });
  }),
);

// ── Public website concierge (per club, no login) ───────────────────────────
// A visitor on the club's public page chats with the club's AI: hours, dress
// code, policies, dining, membership. Grounded ONLY in the club's own data; a
// deterministic reply keeps the widget working when no LLM key is configured.

const clubChatLimiter = rateLimit({ windowMs: 5 * 60_000, max: 20, key: "club-chat" });
const ClubChatBody = z.object({
  slug: z.string().trim().min(1).max(60),
  message: z.string().trim().min(1).max(600),
});

const PUBLIC_CONCIERGE_PROMPT = `You are the public website concierge for a golf club.
The visitor is NOT logged in — they may be a prospective member, a golfer
looking for a tee time, or someone planning a private event. Be warm and
concise (two or three sentences). Answer only from the CLUB CONTEXT provided;
never invent hours, prices, or policies. When the visitor wants to book a tee
time, join the club, or plan an event, tell them to use the inquiry form right
on this page and the club team will follow up the same day.`;

router.post(
  "/public/club-chat",
  clubChatLimiter,
  asyncHandler(async (req, res) => {
    const body = ClubChatBody.parse(req.body);
    const slug = body.slug.toLowerCase();

    const [club] = await db.select().from(clubs).where(eq(clubs.slug, slug));
    if (!club) throw notFound("We couldn't find that club.");

    // Deterministic fallback when no LLM is configured/reachable.
    const fallback =
      `Thanks for reaching out to ${club.name}! For tee times, membership, or ` +
      `private events, use the inquiry form on this page and our team will get ` +
      `back to you the same day.`;

    if (!llmEnabled()) {
      res.json({ reply: fallback });
      return;
    }

    // Club context: knowledge base + a menu taste + today's open tee slots.
    const parts: string[] = [`CLUB: ${club.name}`];
    if (club.phone) parts.push(`Phone: ${club.phone}`);
    if (club.address) parts.push(`Address: ${club.address}`);
    try {
      const semantic = await loadSemanticMemory(club.id);
      if (semantic.hours) parts.push(`Hours: ${semantic.hours}`);
      if (semantic.dressCode) parts.push(`Dress code: ${semantic.dressCode}`);
      for (const f of semantic.faqs.slice(0, 6)) parts.push(`${f.title}: ${f.content}`);
      for (const p of semantic.policies.slice(0, 6)) parts.push(`${p.title}: ${p.content}`);
    } catch {
      /* knowledge unavailable — chat still works */
    }
    const [openSlots, featured] = await Promise.all([
      db
        .select({ id: teeTimes.id })
        .from(teeTimes)
        .where(
          and(
            eq(teeTimes.clubId, club.id),
            isNull(teeTimes.memberId),
            gte(teeTimes.startsAt, new Date()),
          ),
        )
        .limit(50),
      db
        .select({ name: menuItems.name, category: menuItems.category })
        .from(menuItems)
        .where(and(eq(menuItems.clubId, club.id), eq(menuItems.available, true)))
        .orderBy(asc(menuItems.category))
        .limit(10),
    ]);
    parts.push(`Open tee-time slots coming up: ${openSlots.length >= 50 ? "50+" : openSlots.length}`);
    if (featured.length)
      parts.push(`Dining highlights: ${featured.map((m) => m.name).join(", ")}`);

    const reply = await llmComplete({
      system: `${PUBLIC_CONCIERGE_PROMPT}\n\n--- CLUB CONTEXT ---\n${parts.join("\n")}`,
      user: body.message,
      maxTokens: 300,
    });
    res.json({ reply: reply || fallback });
  }),
);

// ── Public inquiries: tee times, membership, private events ─────────────────
// Every inquiry becomes a lead on the club's tenant + an instant email ack to
// the visitor and a notification to club admins. The follow-up engine
// (lib/followups.ts) nurtures any lead that staff leave untouched.

const inquiryLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, key: "inquiry" });
const InquiryBody = z.object({
  slug: z.string().trim().min(1).max(60),
  type: z.enum(["tee_time", "membership", "event"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional(),
  preferredDate: z.string().trim().max(60).optional(),
  message: z.string().trim().max(600).optional(),
});

const INQUIRY_META: Record<
  z.infer<typeof InquiryBody>["type"],
  { source: string; interest: string; ackSubject: (club: string) => string }
> = {
  tee_time: {
    source: "Website — Tee Time Inquiry",
    interest: "Tee Time",
    ackSubject: (c) => `Your tee-time request at ${c}`,
  },
  membership: {
    source: "Website — Membership Inquiry",
    interest: "Membership",
    ackSubject: (c) => `Your membership inquiry at ${c}`,
  },
  event: {
    source: "Website — Event Inquiry",
    interest: "Private Event",
    ackSubject: (c) => `Your event inquiry at ${c}`,
  },
};

router.post(
  "/public/inquiry",
  inquiryLimiter,
  asyncHandler(async (req, res) => {
    const body = InquiryBody.parse(req.body);
    const slug = body.slug.toLowerCase();

    const [club] = await db
      .select({ id: clubs.id, name: clubs.name })
      .from(clubs)
      .where(eq(clubs.slug, slug));
    if (!club) throw notFound("We couldn't find that club.");

    const meta = INQUIRY_META[body.type];
    const email = body.email.toLowerCase();
    const detail = [
      body.preferredDate ? `Preferred date: ${body.preferredDate}` : null,
      body.message ?? null,
    ]
      .filter(Boolean)
      .join(" — ");

    await db.insert(leads).values({
      clubId: club.id,
      name: body.name,
      contactName: body.name,
      email,
      phone: body.phone ?? null,
      source: meta.source,
      interest: meta.interest,
      status: "New",
      problem: detail || null,
    });

    // Notify club admins; best-effort.
    const admins = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.clubId, club.id), eq(users.role, "supervisor")));
    for (const a of admins) {
      void sendEmail({
        to: a.email,
        replyTo: email,
        subject: `${meta.interest} inquiry: ${body.name}`,
        html:
          `<p>${body.name} sent a ${meta.interest.toLowerCase()} inquiry via your club page.</p>` +
          `<table>` +
          `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">Email</td><td>${email}</td></tr>` +
          (body.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">Phone</td><td>${body.phone}</td></tr>` : "") +
          (body.preferredDate ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">Preferred date</td><td>${body.preferredDate}</td></tr>` : "") +
          (body.message ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63;vertical-align:top">Message</td><td>${body.message}</td></tr>` : "") +
          `</table>` +
          `<p style="margin-top:16px">Reply to reach them directly, or work the lead from your Leads tab.</p>`,
      });
    }

    // Instant acknowledgement to the visitor (touch zero of the follow-up flow).
    void sendEmail({
      to: email,
      subject: meta.ackSubject(club.name),
      html:
        `<p>Hi ${body.name.split(" ")[0]},</p>` +
        `<p>${club.name} has received your ${meta.interest.toLowerCase()} inquiry` +
        (body.preferredDate ? ` for ${body.preferredDate}` : "") +
        `. The team will get back to you shortly — usually the same day.</p>`,
    });

    res.json({ ok: true, clubName: club.name });
  }),
);

export default router;
