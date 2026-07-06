// Self-serve club onboarding (the 6-step wizard) + tenant settings.
//
//   Step 1+2  POST /onboarding/create-club   club profile + admin account
//             (creates the tenant atomically and logs the admin in)
//   Steps 3-6 use the authenticated supervisor CRUD routes (staff invites,
//             menu, tee-sheet generation, agent config) — the wizard calls them.
//   Finish    POST /onboarding/complete      marks onboarding done
//
// Also: GET/PATCH /tenant/settings for club branding & profile.

import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, clubs } from "@workspace/db";
import { asyncHandler, notFound } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { rateLimit } from "../lib/rate-limit";
import { provisionClub } from "../lib/provision";

const router: IRouter = Router();
const supervisor = [requireAuth, requireRole("supervisor")];

// Public endpoint — keep it un-spammable.
const createClubLimiter = rateLimit({ windowMs: 60 * 60_000, max: 5, key: "create-club" });

const CreateClubBody = z.object({
  clubName: z.string().min(2).max(120),
  slug: z.string().min(3).max(60),
  timezone: z.string().max(100).optional(),
  currency: z.string().length(3).optional(),
  countryCode: z.string().length(2).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(200),
});

router.post(
  "/onboarding/create-club",
  createClubLimiter,
  asyncHandler(async (req, res) => {
    const body = CreateClubBody.parse(req.body);
    const { clubId, adminUserId } = await provisionClub(body);

    // Log the new admin straight in so the wizard can continue authenticated.
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.userId = adminUserId;
    req.session.clubId = clubId;
    req.session.role = "supervisor";
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.status(201).json({ clubId, adminUserId });
  }),
);

router.get(
  "/onboarding/status",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, req.auth!.clubId));
    if (!club) throw notFound("Club not found.");
    res.json({
      completed: club.onboardingCompleted,
      step: club.onboardingStep ?? "2",
    });
  }),
);

const StepBody = z.object({ step: z.enum(["2", "3", "4", "5", "6"]) });

router.post(
  "/onboarding/step",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { step } = StepBody.parse(req.body);
    await db
      .update(clubs)
      .set({ onboardingStep: step, updatedAt: new Date() })
      .where(eq(clubs.id, req.auth!.clubId));
    res.json({ ok: true, step });
  }),
);

router.post(
  "/onboarding/complete",
  ...supervisor,
  asyncHandler(async (req, res) => {
    await db
      .update(clubs)
      .set({ onboardingCompleted: true, onboardingStep: "6", updatedAt: new Date() })
      .where(eq(clubs.id, req.auth!.clubId));
    res.json({ ok: true });
  }),
);

// ── Tenant settings (branding, locale, profile) ─────────────────────────────

router.get(
  "/tenant/settings",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, req.auth!.clubId));
    if (!club) throw notFound("Club not found.");
    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      timezone: club.timezone,
      currency: club.currency,
      countryCode: club.countryCode,
      logoUrl: club.logoUrl,
      primaryColor: club.primaryColor,
      accentColor: club.accentColor,
      phone: club.phone,
      address: club.address,
      plan: club.plan,
      onboardingCompleted: club.onboardingCompleted,
    });
  }),
);

const UpdateSettingsBody = z.object({
  name: z.string().min(2).max(120).optional(),
  timezone: z.string().max(100).optional(),
  currency: z.string().length(3).optional(),
  countryCode: z.string().length(2).optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
});

router.patch(
  "/tenant/settings",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const patch = UpdateSettingsBody.parse(req.body);
    const [row] = await db
      .update(clubs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(clubs.id, req.auth!.clubId))
      .returning();
    if (!row) throw notFound("Club not found.");
    res.json({ ok: true });
  }),
);

export default router;
