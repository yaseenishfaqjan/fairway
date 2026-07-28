// Super Admin console (build-doc Part 8, Portal 1) — the Fairway360 platform
// team manages all tenants: list clubs, provision new ones, suspend/activate,
// change plans, and see a platform overview. Gated to role = super_admin
// (a platform-HQ user seeded by scripts/seed.ts; belongs to the HQ club).

import { Router, type IRouter } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { count, desc, eq, gte, max, sql, sum } from "drizzle-orm";
import { db, chatMessages, clubs, members, orders, staffProfiles, users, clubPlan, clubStatus } from "@workspace/db";
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
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      clubRows,
      [memberCount],
      [staffCount],
      [orderAgg],
      [newMembers30],
      memberMonths,
    ] = await Promise.all([
      db.select({ plan: clubs.plan, status: clubs.status, createdAt: clubs.createdAt }).from(clubs),
      db.select({ n: count() }).from(members),
      db.select({ n: count() }).from(staffProfiles),
      db.select({ n: count(), revenue: sum(orders.total) }).from(orders),
      db.select({ n: count() }).from(members).where(gte(members.createdAt, thirtyDaysAgo)),
      db.select({ createdAt: members.createdAt }).from(members),
    ]);

    const byPlan: Record<string, number> = {};
    for (const c of clubRows) byPlan[c.plan] = (byPlan[c.plan] ?? 0) + 1;

    // Growth: new clubs + new members per month for the last 6 calendar months.
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const clubsPerMonth: Record<string, number> = {};
    const membersPerMonth: Record<string, number> = {};
    for (const m of months) { clubsPerMonth[m] = 0; membersPerMonth[m] = 0; }
    for (const c of clubRows) { const k = monthKey(c.createdAt); if (k in clubsPerMonth) clubsPerMonth[k]++; }
    for (const m of memberMonths) { const k = monthKey(m.createdAt); if (k in membersPerMonth) membersPerMonth[k]++; }

    const monthLabel = (ym: string) => {
      const [y, mo] = ym.split("-").map(Number);
      return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" });
    };

    res.json({
      totalClubs: clubRows.length,
      activeClubs: clubRows.filter((c) => c.status === "active").length,
      suspendedClubs: clubRows.filter((c) => c.status === "suspended").length,
      newClubs30d: clubRows.filter((c) => c.createdAt >= thirtyDaysAgo).length,
      totalMembers: Number(memberCount?.n ?? 0),
      newMembers30d: Number(newMembers30?.n ?? 0),
      totalStaff: Number(staffCount?.n ?? 0),
      totalOrders: Number(orderAgg?.n ?? 0),
      totalRevenue: Math.round(Number(orderAgg?.revenue ?? 0) * 100) / 100,
      byPlan,
      growth: months.map((m) => ({
        month: m,
        label: monthLabel(m),
        clubs: clubsPerMonth[m],
        members: membersPerMonth[m],
      })),
    });
  }),
);

router.get(
  "/admin/tenants",
  ...superAdmin,
  asyncHandler(async (_req, res) => {
    // Fetch clubs plus per-club aggregates as separate grouped queries (no
    // correlated subqueries — those were silently returning 0), then merge.
    const [clubRows, memberCounts, staffCounts, lastMsgs, orderAggs] = await Promise.all([
      db.select().from(clubs).orderBy(desc(clubs.createdAt)),
      db.select({ clubId: members.clubId, n: count() }).from(members).groupBy(members.clubId),
      db
        .select({ clubId: staffProfiles.clubId, n: count() })
        .from(staffProfiles)
        .groupBy(staffProfiles.clubId),
      db
        .select({ clubId: chatMessages.clubId, at: max(chatMessages.createdAt) })
        .from(chatMessages)
        .groupBy(chatMessages.clubId),
      db
        .select({ clubId: orders.clubId, n: count(), revenue: sum(orders.total) })
        .from(orders)
        .groupBy(orders.clubId),
    ]);
    const memberBy = new Map(memberCounts.map((r) => [r.clubId, Number(r.n)]));
    const staffBy = new Map(staffCounts.map((r) => [r.clubId, Number(r.n)]));
    const lastBy = new Map(lastMsgs.map((r) => [r.clubId, r.at]));
    const ordersBy = new Map(orderAggs.map((r) => [r.clubId, Number(r.n)]));
    const revenueBy = new Map(orderAggs.map((r) => [r.clubId, Math.round(Number(r.revenue ?? 0) * 100) / 100]));
    res.json(
      clubRows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        plan: c.plan,
        status: c.status,
        onboardingCompleted: c.onboardingCompleted,
        memberCount: memberBy.get(c.id) ?? 0,
        staffCount: staffBy.get(c.id) ?? 0,
        orderCount: ordersBy.get(c.id) ?? 0,
        revenue: revenueBy.get(c.id) ?? 0,
        lastActivityAt: lastBy.get(c.id) ?? null,
        createdAt: c.createdAt.toISOString(),
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
