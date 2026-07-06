// Super Admin console (build-doc Part 8, Portal 1) — the Fairway360 platform
// team manages all tenants: list clubs, provision new ones, suspend/activate,
// change plans, and see a platform overview. Gated to role = super_admin
// (a platform-HQ user seeded by scripts/seed.ts; belongs to the HQ club).

import { Router, type IRouter } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { count, desc, eq, max, sql } from "drizzle-orm";
import { db, chatMessages, clubs, members, staffProfiles, users, clubPlan, clubStatus } from "@workspace/db";
import { asyncHandler, badRequest, notFound } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { provisionClub } from "../lib/provision";
import { issueInvite } from "../lib/invite";

const router: IRouter = Router();
const superAdmin = [requireAuth, requireRole("super_admin")];

router.get(
  "/admin/overview",
  ...superAdmin,
  asyncHandler(async (_req, res) => {
    const [clubRows, [memberCount], [staffCount]] = await Promise.all([
      db.select({ plan: clubs.plan, status: clubs.status }).from(clubs),
      db.select({ n: count() }).from(members),
      db.select({ n: count() }).from(staffProfiles),
    ]);
    const byPlan: Record<string, number> = {};
    for (const c of clubRows) byPlan[c.plan] = (byPlan[c.plan] ?? 0) + 1;
    res.json({
      totalClubs: clubRows.length,
      activeClubs: clubRows.filter((c) => c.status === "active").length,
      suspendedClubs: clubRows.filter((c) => c.status === "suspended").length,
      totalMembers: Number(memberCount?.n ?? 0),
      totalStaff: Number(staffCount?.n ?? 0),
      byPlan,
    });
  }),
);

router.get(
  "/admin/tenants",
  ...superAdmin,
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        club: clubs,
        memberCount: sql<number>`(select count(*) from ${members} where ${members.clubId} = ${clubs.id})`,
        staffCount: sql<number>`(select count(*) from ${staffProfiles} where ${staffProfiles.clubId} = ${clubs.id})`,
        lastMessageAt: sql<string | null>`(select max(${chatMessages.createdAt}) from ${chatMessages} where ${chatMessages.clubId} = ${clubs.id})`,
      })
      .from(clubs)
      .orderBy(desc(clubs.createdAt));
    res.json(
      rows.map((r) => ({
        id: r.club.id,
        name: r.club.name,
        slug: r.club.slug,
        plan: r.club.plan,
        status: r.club.status,
        onboardingCompleted: r.club.onboardingCompleted,
        memberCount: Number(r.memberCount ?? 0),
        staffCount: Number(r.staffCount ?? 0),
        lastActivityAt: r.lastMessageAt,
        createdAt: r.club.createdAt.toISOString(),
      })),
    );
  }),
);

const CreateTenantBody = z.object({
  clubName: z.string().min(2).max(120),
  slug: z.string().min(3).max(60),
  plan: z.enum(clubPlan.enumValues).optional(),
  timezone: z.string().max(100).optional(),
  currency: z.string().length(3).optional(),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
});

// Provision a club on a customer's behalf — the admin gets a set-password
// invite link (emailed when Resend is configured) instead of a password.
router.post(
  "/admin/tenants",
  ...superAdmin,
  asyncHandler(async (req, res) => {
    const body = CreateTenantBody.parse(req.body);
    const { clubId, adminUserId } = await provisionClub({
      ...body,
      adminPassword: randomBytes(24).toString("hex"), // unusable until invite sets it
    });
    if (body.plan) {
      await db.update(clubs).set({ plan: body.plan }).where(eq(clubs.id, clubId));
    }
    const invite = await issueInvite(
      adminUserId,
      body.adminName,
      body.adminEmail.toLowerCase().trim(),
      body.clubName,
      { clubId, role: "supervisor", createdBy: req.auth!.userId },
    );
    res.status(201).json({ clubId, inviteLink: invite.link, emailed: invite.emailed });
  }),
);

const UpdateTenantBody = z.object({
  plan: z.enum(clubPlan.enumValues).optional(),
  status: z.enum(clubStatus.enumValues).optional(),
  maxMembersNote: z.string().max(300).optional(),
});

router.patch(
  "/admin/tenants/:id",
  ...superAdmin,
  asyncHandler<{ id: string }>(async (req, res) => {
    const body = UpdateTenantBody.parse(req.body);
    if (!body.plan && !body.status) throw badRequest("Nothing to update.");
    const [row] = await db
      .update(clubs)
      .set({
        ...(body.plan ? { plan: body.plan } : {}),
        ...(body.status ? { status: body.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(clubs.id, req.params.id))
      .returning({ id: clubs.id, status: clubs.status, plan: clubs.plan });
    if (!row) throw notFound("Tenant not found.");
    res.json(row);
  }),
);

// Read-only peek at a tenant (spec: view any tenant's data, read-only).
router.get(
  "/admin/tenants/:id",
  ...superAdmin,
  asyncHandler<{ id: string }>(async (req, res) => {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, req.params.id));
    if (!club) throw notFound("Tenant not found.");
    const [staff, memberRows, [lastMsg]] = await Promise.all([
      db
        .select({ name: users.name, email: users.email, role: users.role, status: users.status })
        .from(users)
        .where(eq(users.clubId, club.id))
        .limit(100),
      db.select({ n: count() }).from(members).where(eq(members.clubId, club.id)),
      db
        .select({ at: max(chatMessages.createdAt) })
        .from(chatMessages)
        .where(eq(chatMessages.clubId, club.id)),
    ]);
    res.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      plan: club.plan,
      status: club.status,
      timezone: club.timezone,
      currency: club.currency,
      onboardingCompleted: club.onboardingCompleted,
      memberCount: Number(memberRows[0]?.n ?? 0),
      users: staff,
      lastActivityAt: lastMsg?.at?.toISOString() ?? null,
    });
  }),
);

export default router;
