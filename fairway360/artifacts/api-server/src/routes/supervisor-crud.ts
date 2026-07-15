// Supervisor full-CRUD surface (build-doc Part 5):
//   employees (update/archive + invite management), members (profile,
//   preferences override, archive), menu (full CRUD + bulk import), tee sheet
//   (generate / block / block-range), knowledge base, channels, AI agent
//   config + stats, and broadcast messaging.
// Every query is scoped to req.auth.clubId (from the session, never input).

import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, asc, count, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  db,
  agentConfigs,
  agentSessions,
  announcements,
  chatChannels,
  chatMessages,
  clubs,
  escalations,
  inviteLinks,
  knowledgeBase,
  memberPreferences,
  members,
  menuItems,
  orders,
  staffProfiles,
  tasks,
  teeTimes,
  users,
} from "@workspace/db";
import { asyncHandler, badRequest, notFound } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { issueInvite } from "../lib/invite";
import { notifyMany } from "../lib/notify";
import { sendSms } from "../lib/sms";
import { DEFAULT_AGENTS } from "../lib/provision";
import { timezoneForClub } from "../lib/memory";
import { zonedTime, fmtTimeTz, fmtDateShortTz, dayKeyTz, dayKeyOffsetTz, hourTz } from "../lib/tz";

const router: IRouter = Router();
const supervisor = [requireAuth, requireRole("supervisor")];

// Category is free text so each club can define its own (e.g. "Halfway House").
const MenuCategoryField = z.string().trim().min(1).max(40);

// ── 5.1 Employee management ─────────────────────────────────────────────────

router.get(
  "/staff/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [row] = await db
      .select({ sp: staffProfiles, u: users })
      .from(staffProfiles)
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(and(eq(staffProfiles.id, req.params.id), eq(staffProfiles.clubId, clubId)));
    if (!row) throw notFound("Staff member not found.");
    res.json({
      id: row.sp.id,
      userId: row.u.id,
      name: row.u.name,
      email: row.u.email,
      phone: row.u.phone,
      role: row.u.role,
      status: row.u.status,
      jobTitle: row.sp.jobTitle,
      employeeNo: row.sp.employeeNo,
      department: row.sp.defaultArea,
      currentStatus: row.sp.currentStatus,
      pending: !row.u.passwordHash,
    });
  }),
);

const UpdateStaffBody = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  role: z.enum(["employee", "supervisor"]).optional(),
  jobTitle: z.string().min(2).max(120).optional(),
  department: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/staff/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = UpdateStaffBody.parse(req.body);
    const [sp] = await db
      .select()
      .from(staffProfiles)
      .where(and(eq(staffProfiles.id, req.params.id), eq(staffProfiles.clubId, clubId)));
    if (!sp) throw notFound("Staff member not found.");

    if (body.name || body.phone !== undefined || body.role || body.isActive !== undefined) {
      await db
        .update(users)
        .set({
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.role ? { role: body.role } : {}),
          ...(body.isActive !== undefined
            ? { status: body.isActive ? ("active" as const) : ("disabled" as const) }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, sp.userId), eq(users.clubId, clubId)));
    }
    if (body.jobTitle || body.department !== undefined) {
      await db
        .update(staffProfiles)
        .set({
          ...(body.jobTitle ? { jobTitle: body.jobTitle } : {}),
          ...(body.department !== undefined ? { defaultArea: body.department } : {}),
          updatedAt: new Date(),
        })
        .where(eq(staffProfiles.id, sp.id));
    }
    res.json({ ok: true });
  }),
);

// Archive (soft delete — audit trail preserved). Open tasks reassign to the
// archiving supervisor.
router.delete(
  "/staff/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const [sp] = await db
      .select()
      .from(staffProfiles)
      .where(and(eq(staffProfiles.id, req.params.id), eq(staffProfiles.clubId, clubId)));
    if (!sp) throw notFound("Staff member not found.");
    if (sp.userId === userId) throw badRequest("You cannot archive your own account.");

    await db
      .update(users)
      .set({ status: "disabled", updatedAt: new Date() })
      .where(and(eq(users.id, sp.userId), eq(users.clubId, clubId)));
    await db
      .update(tasks)
      .set({ assignedTo: userId })
      .where(
        and(eq(tasks.clubId, clubId), eq(tasks.assignedTo, sp.userId), eq(tasks.done, false)),
      );
    res.json({ ok: true });
  }),
);

// ── Invite link management ──────────────────────────────────────────────────

router.get(
  "/invites",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(inviteLinks)
      .where(eq(inviteLinks.clubId, clubId))
      .orderBy(desc(inviteLinks.createdAt))
      .limit(200);
    const now = Date.now();
    res.json(
      rows.map((i) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        role: i.role,
        department: i.department,
        expiresAt: i.expiresAt.toISOString(),
        status: i.usedAt
          ? "used"
          : !i.isActive
            ? "revoked"
            : i.expiresAt.getTime() < now
              ? "expired"
              : "pending",
      })),
    );
  }),
);

router.delete(
  "/invites/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [invite] = await db
      .select()
      .from(inviteLinks)
      .where(and(eq(inviteLinks.id, req.params.id), eq(inviteLinks.clubId, clubId)));
    if (!invite) throw notFound("Invite not found.");
    if (invite.usedAt) throw badRequest("Invite already used — archive the user instead.");

    await db
      .update(inviteLinks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(inviteLinks.id, invite.id));
    // Kill the underlying password-set token too.
    await db
      .update(users)
      .set({ passwordResetTokenHash: null, passwordResetExpiresAt: null })
      .where(
        and(eq(users.clubId, clubId), eq(users.passwordResetTokenHash, invite.tokenHash)),
      );
    res.json({ ok: true });
  }),
);

router.post(
  "/invites/:id/resend",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const [invite] = await db
      .select()
      .from(inviteLinks)
      .where(and(eq(inviteLinks.id, req.params.id), eq(inviteLinks.clubId, clubId)));
    if (!invite || !invite.email) throw notFound("Invite not found.");
    if (invite.usedAt) throw badRequest("Invite already used.");

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.clubId, clubId), eq(users.email, invite.email)));
    if (!user) throw notFound("Invited user no longer exists.");

    const [club] = await db.select({ name: clubs.name }).from(clubs).where(eq(clubs.id, clubId));
    // Supersede the old registry row, then issue a fresh 7-day token.
    await db
      .update(inviteLinks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(inviteLinks.id, invite.id));
    const fresh = await issueInvite(user.id, user.name, user.email, club?.name ?? "your club", {
      clubId,
      role: invite.role,
      department: invite.department,
      createdBy: userId,
    });
    res.json({ inviteLink: fresh.link, emailed: fresh.emailed });
  }),
);

// ── 5.2 Member management ───────────────────────────────────────────────────

router.get(
  "/members/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [row] = await db
      .select({ m: members, u: users, p: memberPreferences })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .leftJoin(memberPreferences, eq(memberPreferences.memberId, members.id))
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!row) throw notFound("Member not found.");

    const [orderRows, escalationRows, [sessionCount]] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(and(eq(orders.clubId, clubId), eq(orders.memberId, row.m.id)))
        .orderBy(desc(orders.placedAt))
        .limit(20),
      db
        .select()
        .from(escalations)
        .where(and(eq(escalations.clubId, clubId), eq(escalations.memberUserId, row.u.id)))
        .orderBy(desc(escalations.createdAt))
        .limit(20),
      db
        .select({ n: count() })
        .from(agentSessions)
        .where(and(eq(agentSessions.clubId, clubId), eq(agentSessions.memberUserId, row.u.id))),
    ]);

    res.json({
      id: row.m.id,
      userId: row.u.id,
      name: row.u.name,
      email: row.u.email,
      phone: row.u.phone,
      status: row.u.status,
      tier: row.m.tier,
      memberNumber: row.m.memberNumber,
      memberSince: row.m.memberSince,
      balance: row.m.balance,
      preferences: row.p ?? null,
      agentSessionCount: Number(sessionCount?.n ?? 0),
      recentOrders: orderRows.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        placedAt: o.placedAt.toISOString(),
      })),
      escalations: escalationRows.map((e) => ({
        id: e.id,
        level: e.level,
        triggerType: e.triggerType,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }),
);

const UpdateMemberBody = z.object({
  name: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  tier: z.string().min(2).max(60).optional(),
  memberNumber: z.string().max(30).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/members/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = UpdateMemberBody.parse(req.body);
    const [m] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!m) throw notFound("Member not found.");

    if (body.tier || body.memberNumber) {
      await db
        .update(members)
        .set({
          ...(body.tier ? { tier: body.tier } : {}),
          ...(body.memberNumber ? { memberNumber: body.memberNumber } : {}),
          updatedAt: new Date(),
        })
        .where(eq(members.id, m.id));
    }
    if (body.name || body.phone !== undefined || body.isActive !== undefined) {
      await db
        .update(users)
        .set({
          ...(body.name ? { name: body.name.trim() } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.isActive !== undefined
            ? { status: body.isActive ? ("active" as const) : ("disabled" as const) }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, m.userId), eq(users.clubId, clubId)));
    }
    res.json({ ok: true });
  }),
);

// Archive member (soft — data retained; archived members cannot log in).
router.delete(
  "/members/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [m] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!m) throw notFound("Member not found.");
    await db
      .update(users)
      .set({ status: "disabled", updatedAt: new Date() })
      .where(and(eq(users.id, m.userId), eq(users.clubId, clubId)));
    res.json({ ok: true });
  }),
);

// Preferences override (supervisor can edit anything, incl. removing allergens).
const PreferencesBody = z.object({
  allergens: z.array(z.string().max(40)).max(30).optional(),
  dietaryRestrictions: z.array(z.string().max(40)).max(30).optional(),
  usualTable: z.string().max(60).nullable().optional(),
  communicationStyle: z.enum(["formal", "friendly", "casual", "brief"]).nullable().optional(),
  vipNotes: z.string().max(1000).nullable().optional(),
});

router.get(
  "/members/:id/preferences",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [row] = await db
      .select({ p: memberPreferences })
      .from(members)
      .leftJoin(memberPreferences, eq(memberPreferences.memberId, members.id))
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!row) throw notFound("Member not found.");
    res.json(row.p ?? {});
  }),
);

router.patch(
  "/members/:id/preferences",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const patch = PreferencesBody.parse(req.body);
    const [m] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!m) throw notFound("Member not found.");

    const [existing] = await db
      .select()
      .from(memberPreferences)
      .where(eq(memberPreferences.memberId, m.id));
    if (existing) {
      await db
        .update(memberPreferences)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(memberPreferences.id, existing.id));
    } else {
      await db.insert(memberPreferences).values({
        clubId,
        memberId: m.id,
        allergens: patch.allergens ?? [],
        dietaryRestrictions: patch.dietaryRestrictions ?? [],
        usualTable: patch.usualTable ?? null,
        communicationStyle: patch.communicationStyle ?? null,
        vipNotes: patch.vipNotes ?? null,
      });
    }
    res.json({ ok: true });
  }),
);

// ── 5.3 Menu management ─────────────────────────────────────────────────────

const MenuItemBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0).max(100000),
  category: MenuCategoryField,
  imageUrl: z.string().url().max(500).nullable().optional(),
  allergens: z.array(z.string().max(40)).max(20).optional(),
  dietaryFlags: z.array(z.string().max(40)).max(20).optional(),
  prepTimeMinutes: z.number().int().min(1).max(240).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  available: z.boolean().optional(),
});

router.get(
  "/menu-admin",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.clubId, clubId), eq(menuItems.archived, false)))
      .orderBy(asc(menuItems.category), asc(menuItems.sortOrder), asc(menuItems.name));
    res.json(
      rows.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        price: Number(m.price),
        category: m.category,
        imageUrl: m.imageUrl,
        allergens: m.allergens,
        dietaryFlags: m.dietaryFlags,
        prepTimeMinutes: m.prepTimeMinutes,
        isFeatured: m.isFeatured,
        sortOrder: m.sortOrder,
        available: m.available,
      })),
    );
  }),
);

router.post(
  "/menu-admin",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = MenuItemBody.parse(req.body);
    const [row] = await db
      .insert(menuItems)
      .values({
        clubId,
        name: body.name.trim(),
        description: body.description ?? null,
        price: body.price.toFixed(2),
        category: body.category,
        imageUrl: body.imageUrl ?? null,
        allergens: body.allergens ?? [],
        dietaryFlags: body.dietaryFlags ?? [],
        prepTimeMinutes: body.prepTimeMinutes ?? 15,
        isFeatured: body.isFeatured ?? false,
        sortOrder: body.sortOrder ?? 0,
        available: body.available ?? true,
      })
      .returning();
    res.status(201).json({ id: row.id });
  }),
);

router.patch(
  "/menu-admin/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = MenuItemBody.partial().parse(req.body);
    const [row] = await db
      .update(menuItems)
      .set({
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.price !== undefined ? { price: body.price.toFixed(2) } : {}),
        ...(body.category ? { category: body.category } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
        ...(body.allergens ? { allergens: body.allergens } : {}),
        ...(body.dietaryFlags ? { dietaryFlags: body.dietaryFlags } : {}),
        ...(body.prepTimeMinutes ? { prepTimeMinutes: body.prepTimeMinutes } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.available !== undefined ? { available: body.available } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(menuItems.id, req.params.id), eq(menuItems.clubId, clubId)))
      .returning({ id: menuItems.id });
    if (!row) throw notFound("Menu item not found.");
    res.json({ ok: true });
  }),
);

// Soft delete: hidden from menus immediately, historical orders unaffected.
router.delete(
  "/menu-admin/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [row] = await db
      .update(menuItems)
      .set({ archived: true, available: false, updatedAt: new Date() })
      .where(and(eq(menuItems.id, req.params.id), eq(menuItems.clubId, clubId)))
      .returning({ id: menuItems.id });
    if (!row) throw notFound("Menu item not found.");
    res.json({ ok: true });
  }),
);

const BulkMenuBody = z.object({ items: z.array(MenuItemBody).min(1).max(500) });

router.post(
  "/menu-admin/bulk-import",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const { items } = BulkMenuBody.parse(req.body);
    const inserted = await db
      .insert(menuItems)
      .values(
        items.map((body) => ({
          clubId,
          name: body.name.trim(),
          description: body.description ?? null,
          price: body.price.toFixed(2),
          category: body.category,
          allergens: body.allergens ?? [],
          dietaryFlags: body.dietaryFlags ?? [],
          prepTimeMinutes: body.prepTimeMinutes ?? 15,
          available: body.available ?? true,
        })),
      )
      .returning({ id: menuItems.id });
    res.status(201).json({ imported: inserted.length });
  }),
);

// ── 5.4 Tee sheet management ────────────────────────────────────────────────

const GenerateTeeSheetBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  intervalMinutes: z.number().int().min(5).max(60),
  maxPlayers: z.number().int().min(1).max(8).optional(),
});

router.post(
  "/tee-sheet/generate",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = GenerateTeeSheetBody.parse(req.body);
    // Build the day + open/close instants in the CLUB's timezone so a club in
    // any US timezone gets slots at the right local wall-clock time.
    const tz = await timezoneForClub(clubId);
    const start = zonedTime(body.date, "00:00", tz)!;
    const open = zonedTime(body.date, body.openTime, tz)!;
    const close = zonedTime(body.date, body.closeTime, tz)!;
    if (close <= open) throw badRequest("closeTime must be after openTime.");

    // Skip times that already have a slot (idempotent regeneration).
    const dayEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ startsAt: teeTimes.startsAt })
      .from(teeTimes)
      .where(
        and(eq(teeTimes.clubId, clubId), gte(teeTimes.startsAt, start), lt(teeTimes.startsAt, dayEnd)),
      );
    const taken = new Set(existing.map((e) => e.startsAt.getTime()));

    const values = [];
    for (let t = open.getTime(); t < close.getTime(); t += body.intervalMinutes * 60_000) {
      if (taken.has(t)) continue;
      values.push({
        clubId,
        memberId: null,
        startsAt: new Date(t),
        players: 0,
        maxPlayers: body.maxPlayers ?? 4,
        status: "pending" as const,
      });
    }
    if (values.length) await db.insert(teeTimes).values(values);
    res.status(201).json({ created: values.length, skippedExisting: taken.size });
  }),
);

router.get(
  "/tee-sheet",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const date = typeof req.query.date === "string" ? req.query.date : null;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw badRequest("date=YYYY-MM-DD required.");
    const tz = await timezoneForClub(clubId);
    const start = zonedTime(date, "00:00", tz)!;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ tee: teeTimes, name: users.name })
      .from(teeTimes)
      .leftJoin(members, eq(teeTimes.memberId, members.id))
      .leftJoin(users, eq(members.userId, users.id))
      .where(and(eq(teeTimes.clubId, clubId), gte(teeTimes.startsAt, start), lt(teeTimes.startsAt, end)))
      .orderBy(asc(teeTimes.startsAt));
    res.json(
      rows.map((r) => ({
        id: r.tee.id,
        startsAt: r.tee.startsAt.toISOString(),
        // Server-formatted in the club's timezone so the grid shows local time.
        time: fmtTimeTz(r.tee.startsAt, tz),
        players: r.tee.players,
        maxPlayers: r.tee.maxPlayers,
        status: r.tee.status,
        notes: r.tee.notes,
        bookedBy: r.name ?? null,
      })),
    );
  }),
);

const UpdateSlotBody = z.object({
  status: z.enum(["pending", "confirmed", "checked_in", "cancelled", "blocked"]).optional(),
  notes: z.string().max(300).nullable().optional(),
});

router.patch(
  "/tee-sheet/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = UpdateSlotBody.parse(req.body);
    const [row] = await db
      .update(teeTimes)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(teeTimes.id, req.params.id), eq(teeTimes.clubId, clubId)))
      .returning({ id: teeTimes.id });
    if (!row) throw notFound("Tee slot not found.");
    res.json({ ok: true });
  }),
);

const BlockRangeBody = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().max(300).optional(),
});

router.post(
  "/tee-sheet/block-range",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = BlockRangeBody.parse(req.body);
    const tz = await timezoneForClub(clubId);
    const rangeStart = zonedTime(body.startDate, "00:00", tz)!;
    const rangeEnd = new Date((zonedTime(body.endDate, "00:00", tz)!).getTime() + 24 * 3600_000);
    if (rangeEnd < rangeStart) throw badRequest("endDate before startDate.");

    // Only open (unbooked) slots inside the daily time window are blocked.
    const slots = await db
      .select()
      .from(teeTimes)
      .where(
        and(
          eq(teeTimes.clubId, clubId),
          isNull(teeTimes.memberId),
          gte(teeTimes.startsAt, rangeStart),
          lt(teeTimes.startsAt, rangeEnd),
        ),
      );
    const [sh, sm] = body.startTime.split(":").map(Number);
    const [eh, em] = body.endTime.split(":").map(Number);
    const winStart = (sh ?? 0) * 60 + (sm ?? 0);
    const winEnd = (eh ?? 0) * 60 + (em ?? 0);
    // Compare each slot's wall-clock minute-of-day IN THE CLUB TZ.
    const hmFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
    const ids = slots
      .filter((s) => {
        const parts = hmFmt.formatToParts(s.startsAt);
        const hh = Number(parts.find((p) => p.type === "hour")?.value) % 24;
        const mm = Number(parts.find((p) => p.type === "minute")?.value);
        const mins = hh * 60 + mm;
        return mins >= winStart && mins < winEnd;
      })
      .map((s) => s.id);

    if (ids.length) {
      await db
        .update(teeTimes)
        .set({ status: "blocked", notes: body.reason ?? "Blocked", updatedAt: new Date() })
        .where(and(eq(teeTimes.clubId, clubId), inArray(teeTimes.id, ids)));
    }
    res.json({ blocked: ids.length });
  }),
);

router.delete(
  "/tee-sheet/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [slot] = await db
      .select()
      .from(teeTimes)
      .where(and(eq(teeTimes.id, req.params.id), eq(teeTimes.clubId, clubId)));
    if (!slot) throw notFound("Tee slot not found.");
    if (slot.memberId) throw badRequest("Slot is booked — cancel the booking first.");
    await db.delete(teeTimes).where(eq(teeTimes.id, slot.id));
    res.json({ ok: true });
  }),
);

// ── 5.7 Knowledge base ──────────────────────────────────────────────────────

const KNOWLEDGE_CATEGORIES = [
  "hours",
  "policies",
  "dress_code",
  "events",
  "facilities",
  "faq",
  "pricing",
] as const;

const KnowledgeBody = z.object({
  category: z.enum(KNOWLEDGE_CATEGORIES),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  isActive: z.boolean().optional(),
});

router.get(
  "/knowledge",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(knowledgeBase)
      .where(eq(knowledgeBase.clubId, clubId))
      .orderBy(asc(knowledgeBase.category), desc(knowledgeBase.updatedAt));
    res.json(
      rows.map((k) => ({
        id: k.id,
        category: k.category,
        title: k.title,
        content: k.content,
        isActive: k.isActive,
        updatedAt: k.updatedAt.toISOString(),
      })),
    );
  }),
);

router.post(
  "/knowledge",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const body = KnowledgeBody.parse(req.body);
    const [row] = await db
      .insert(knowledgeBase)
      .values({ clubId, ...body, createdBy: userId })
      .returning({ id: knowledgeBase.id });
    res.status(201).json({ id: row.id });
  }),
);

router.patch(
  "/knowledge/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = KnowledgeBody.partial().parse(req.body);
    const [row] = await db
      .update(knowledgeBase)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(knowledgeBase.id, req.params.id), eq(knowledgeBase.clubId, clubId)))
      .returning({ id: knowledgeBase.id });
    if (!row) throw notFound("Knowledge entry not found.");
    res.json({ ok: true });
  }),
);

router.delete(
  "/knowledge/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const deleted = await db
      .delete(knowledgeBase)
      .where(and(eq(knowledgeBase.id, req.params.id), eq(knowledgeBase.clubId, clubId)))
      .returning({ id: knowledgeBase.id });
    if (!deleted.length) throw notFound("Knowledge entry not found.");
    res.json({ ok: true });
  }),
);

// ── 5.5 Channel management ──────────────────────────────────────────────────

const ChannelBody = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).nullable().optional(),
  emoji: z.string().max(8).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  department: z.string().max(60).nullable().optional(),
  visibleToMembers: z.boolean().optional(),
});

router.post(
  "/channels",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = ChannelBody.parse(req.body);
    const key = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    const [{ n }] = await db
      .select({ n: count() })
      .from(chatChannels)
      .where(eq(chatChannels.clubId, clubId));
    const [row] = await db
      .insert(chatChannels)
      .values({
        clubId,
        key,
        name: body.name.trim(),
        description: body.description ?? null,
        emoji: body.emoji ?? null,
        color: body.color ?? null,
        department: body.department ?? null,
        displayOrder: Number(n ?? 0),
        visibleToMembers: body.visibleToMembers ?? true,
      })
      .returning({ id: chatChannels.id });
    res.status(201).json({ id: row.id });
  }),
);

router.patch(
  "/channels/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = ChannelBody.partial().parse(req.body);
    const [row] = await db
      .update(chatChannels)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(chatChannels.id, req.params.id), eq(chatChannels.clubId, clubId)))
      .returning({ id: chatChannels.id });
    if (!row) throw notFound("Channel not found.");
    res.json({ ok: true });
  }),
);

// Archive (soft) — message history preserved; Management can't be archived.
router.delete(
  "/channels/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const [ch] = await db
      .select()
      .from(chatChannels)
      .where(and(eq(chatChannels.id, req.params.id), eq(chatChannels.clubId, clubId)));
    if (!ch) throw notFound("Channel not found.");
    if (ch.department === "management") throw badRequest("The Management channel cannot be archived.");
    await db
      .update(chatChannels)
      .set({ archived: true, visibleToMembers: false, updatedAt: new Date() })
      .where(eq(chatChannels.id, ch.id));
    res.json({ ok: true });
  }),
);

// ── 5.6 AI agent configuration + stats ──────────────────────────────────────

router.get(
  "/agents",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const configs = await db.select().from(agentConfigs).where(eq(agentConfigs.clubId, clubId));
    const byKey = new Map(configs.map((c) => [c.agentKey, c]));
    res.json(
      DEFAULT_AGENTS.map((a) => {
        const cfg = byKey.get(a.key);
        return {
          agentKey: a.key,
          name: cfg?.name ?? a.name,
          greetingMessage: cfg?.greetingMessage ?? null,
          tone: cfg?.tone ?? "friendly",
          customSystemPrompt: cfg?.customSystemPrompt ?? null,
          escalationKeywords: cfg?.escalationKeywords ?? [],
          workingHoursStart: cfg?.workingHoursStart ?? null,
          workingHoursEnd: cfg?.workingHoursEnd ?? null,
          isActive: cfg?.isActive ?? true,
        };
      }),
    );
  }),
);

const AgentConfigBody = z.object({
  name: z.string().min(2).max(60).optional(),
  greetingMessage: z.string().max(500).nullable().optional(),
  tone: z.enum(["formal", "friendly", "casual"]).optional(),
  customSystemPrompt: z.string().max(2000).nullable().optional(),
  escalationKeywords: z.array(z.string().min(2).max(60)).max(50).optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/agents/:key",
  ...supervisor,
  asyncHandler<{ key: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const key = req.params.key;
    if (!DEFAULT_AGENTS.some((a) => a.key === key)) throw notFound("Unknown agent.");
    const body = AgentConfigBody.parse(req.body);

    const [existing] = await db
      .select()
      .from(agentConfigs)
      .where(and(eq(agentConfigs.clubId, clubId), eq(agentConfigs.agentKey, key)));
    if (existing) {
      await db
        .update(agentConfigs)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(agentConfigs.id, existing.id));
    } else {
      await db.insert(agentConfigs).values({
        clubId,
        agentKey: key,
        name: body.name ?? DEFAULT_AGENTS.find((a) => a.key === key)!.name,
        greetingMessage: body.greetingMessage ?? null,
        tone: body.tone ?? "friendly",
        customSystemPrompt: body.customSystemPrompt ?? null,
        escalationKeywords: body.escalationKeywords ?? [],
        workingHoursStart: body.workingHoursStart ?? null,
        workingHoursEnd: body.workingHoursEnd ?? null,
        isActive: body.isActive ?? true,
      });
    }
    res.json({ ok: true });
  }),
);

// Knowledge is loaded fresh from the DB on every agent call, so a "refresh" is
// instant — this endpoint exists for spec/UI parity.
router.post(
  "/agents/:key/refresh-knowledge",
  ...supervisor,
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, note: "Agents read menu & knowledge live — changes already apply." });
  }),
);

router.get(
  "/agents/:key/stats",
  ...supervisor,
  asyncHandler<{ key: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const key = req.params.key;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [sessions, [channel]] = await Promise.all([
      db
        .select()
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.clubId, clubId),
            eq(agentSessions.agentKey, key),
            gte(agentSessions.createdAt, since),
          ),
        ),
      db
        .select()
        .from(chatChannels)
        .where(and(eq(chatChannels.clubId, clubId), eq(chatChannels.department, key))),
    ]);

    let aiReplies7d = 0;
    if (channel) {
      const [n] = await db
        .select({ n: count() })
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.clubId, clubId),
            eq(chatMessages.channelId, channel.id),
            eq(chatMessages.aiGenerated, true),
            gte(chatMessages.createdAt, since),
          ),
        );
      aiReplies7d = Number(n?.n ?? 0);
    }

    const escalated = sessions.filter((s) => s.escalated).length;
    res.json({
      agentKey: key,
      sessions7d: sessions.length,
      aiReplies7d,
      ordersPlaced7d: sessions.reduce((a, s) => a + s.ordersPlaced, 0),
      bookingsMade7d: sessions.reduce((a, s) => a + s.bookingsMade, 0),
      escalationRatePct: sessions.length ? Math.round((escalated / sessions.length) * 100) : 0,
    });
  }),
);

// ── 5.2b Bulk member import (CSV parsed client-side → JSON rows) ────────────

const BulkMembersBody = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        email: z.string().email(),
        tier: z.string().max(60).optional(),
        phone: z.string().max(30).optional(),
      }),
    )
    .min(1)
    .max(500),
  sendInvites: z.boolean().optional(),
});

router.post(
  "/members/bulk-import",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const { rows, sendInvites = true } = BulkMembersBody.parse(req.body);
    const [club] = await db.select({ name: clubs.name }).from(clubs).where(eq(clubs.id, clubId));

    let imported = 0;
    const skipped: { email: string; reason: string }[] = [];
    for (const row of rows) {
      const email = row.email.toLowerCase().trim();
      const [dup] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.clubId, clubId), eq(users.email, email)));
      if (dup) {
        skipped.push({ email, reason: "email already exists" });
        continue;
      }
      const [user] = await db
        .insert(users)
        .values({
          clubId,
          email,
          role: "member",
          name: row.name.trim(),
          initials: row.name.split(" ").map((w) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase(),
          phone: row.phone?.trim() || null,
          status: "active",
          passwordHash: null,
        })
        .returning();
      const [{ c }] = await db.select({ c: count() }).from(members).where(eq(members.clubId, clubId));
      await db.insert(members).values({
        clubId,
        userId: user.id,
        memberNumber: `M-${String((c ?? 0) + 1).padStart(4, "0")}`,
        tier: row.tier?.trim() || "Standard",
        memberSince: new Date().getFullYear(),
        balance: "0",
      });
      if (sendInvites) {
        await issueInvite(user.id, row.name, email, club?.name ?? "your club", {
          clubId,
          role: "member",
          createdBy: userId,
        });
      }
      imported += 1;
    }
    res.status(201).json({ imported, skipped });
  }),
);

// ── Analytics: orders (last 7 days, spec Part 9) ────────────────────────────

router.get(
  "/analytics/orders",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    // Days and hours are bucketed in the CLUB's timezone, not the server's — a
    // 7pm Pacific order belongs to that club's today, not to UTC's tomorrow.
    const tz = await timezoneForClub(clubId);
    // Reach back 8 days so the oldest club-local day in the window is complete
    // regardless of the club's UTC offset.
    const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.clubId, clubId), gte(orders.placedAt, since)));

    // The 7 club-local days ending today (oldest → newest), zero-filled so the
    // dashboard chart always has 7 points even on a quiet week.
    const days = Array.from({ length: 7 }, (_, i) => dayKeyOffsetTz(tz, i - 6));
    const window = new Set(days);
    const todayKey = days[6];
    const yesterdayKey = days[5];

    const byStatus: Record<string, number> = {};
    const byDay: Record<string, { orders: number; revenue: number }> = {};
    const byHour: Record<number, number> = {};
    for (const day of days) byDay[day] = { orders: 0, revenue: 0 };

    const blank = () => ({ orders: 0, revenue: 0, delivered: 0, active: 0 });
    const today = blank();
    const yesterday = blank();
    let revenue = 0;

    for (const o of rows) {
      const day = dayKeyTz(o.placedAt, tz);
      if (!window.has(day)) continue; // outside the 7 club-local days
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      const total = Number(o.total);
      byDay[day].orders += 1;
      byDay[day].revenue += total;
      const hour = hourTz(o.placedAt, tz);
      byHour[hour] = (byHour[hour] ?? 0) + 1;
      revenue += total;

      const bucket = day === todayKey ? today : day === yesterdayKey ? yesterday : null;
      if (bucket) {
        bucket.orders += 1;
        bucket.revenue += total;
        if (o.status === "Delivered") bucket.delivered += 1;
        else bucket.active += 1;
      }
    }

    const round = (n: number) => Math.round(n * 100) / 100;
    for (const day of days) byDay[day].revenue = round(byDay[day].revenue);
    for (const b of [today, yesterday]) b.revenue = round(b.revenue);

    res.json({
      timezone: tz,
      orders7d: Object.values(byDay).reduce((s, d) => s + d.orders, 0),
      revenue7d: round(revenue),
      byStatus,
      byDay,
      today,
      yesterday,
      // Ready-to-plot series for the dashboard revenue chart.
      series: days.map((day) => ({
        day,
        label: fmtDateShortTz(zonedTime(day, "12:00", tz) ?? new Date(), tz),
        orders: byDay[day].orders,
        revenue: byDay[day].revenue,
      })),
      peakHours: Object.entries(byHour)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hour, n]) => ({ hour: Number(hour), orders: n })),
    });
  }),
);

// ── 5.8 Broadcast messaging ─────────────────────────────────────────────────

const BroadcastBody = z.object({
  content: z.string().min(1).max(1000),
  title: z.string().max(120).optional(),
  targetGroup: z.enum(["all_members", "all_staff", "all"]),
  channels: z.array(z.enum(["in_app", "sms"])).min(1),
});

router.post(
  "/broadcast",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = BroadcastBody.parse(req.body);

    const roleFilter =
      body.targetGroup === "all_members"
        ? eq(users.role, "member")
        : body.targetGroup === "all_staff"
          ? inArray(users.role, ["employee", "supervisor"])
          : sql`true`;
    const recipients = await db
      .select({ id: users.id, phone: users.phone })
      .from(users)
      .where(and(eq(users.clubId, clubId), eq(users.status, "active"), roleFilter));

    await db.insert(announcements).values({
      clubId,
      title: body.title ?? "Club announcement",
      body: body.content,
      audience:
        body.targetGroup === "all_members" ? "members" : body.targetGroup === "all_staff" ? "staff" : "all",
    });

    if (body.channels.includes("in_app")) {
      await notifyMany(
        clubId,
        recipients.map((r) => r.id),
        { type: "broadcast", title: body.title ?? "Club announcement", body: body.content },
      );
    }
    if (body.channels.includes("sms")) {
      for (const r of recipients) {
        if (r.phone) void sendSms(r.phone, `Fairway360 — ${body.content}`);
      }
    }
    res.status(201).json({ recipients: recipients.length });
  }),
);

export default router;
