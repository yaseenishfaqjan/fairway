import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, clubs, leads, users } from "@workspace/db";
import { CreateDemoRequestBody } from "@workspace/api-zod";
import { asyncHandler, badRequest, notFound } from "../lib/http";
import { sendDemoConfirmation, notifySalesOfDemo, sendEmail } from "../lib/email";
import { rateLimit } from "../lib/rate-limit";
import { captureClientError } from "../lib/monitoring";
import { resolveTenantForRequest } from "../lib/tenant";

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

export default router;
