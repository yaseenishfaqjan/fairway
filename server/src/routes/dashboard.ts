import { Router } from 'express';
import { z } from 'zod';
import { and, eq, gte, lte, sql, count, desc, lt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, posTransactions, members, teeTimes, maintenanceLogs, inventoryItems } from '../db/schema.js';
import { requireAuth, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// GET /dashboard/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const today = todayStr();
    const yesterday = daysAgoStr(1);

    const [todayTee, todayBookings, checkedIn, todayRev, yestRev, openCritical] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(${teeTimes.slotsTotal}),0)`, booked: sql<number>`coalesce(sum(${teeTimes.slotsBooked}),0)` })
        .from(teeTimes).where(and(eq(teeTimes.clubId, clubId), eq(teeTimes.date, today))),
      db.select({ c: count() }).from(bookings).leftJoin(teeTimes, eq(bookings.teeTimeId, teeTimes.id))
        .where(and(eq(bookings.clubId, clubId), eq(teeTimes.date, today))),
      db.select({ c: count() }).from(bookings).where(and(eq(bookings.clubId, clubId), gte(bookings.checkInAt, new Date(today + 'T00:00:00')))),
      db.select({ s: sql<string>`coalesce(sum(${posTransactions.total}),0)` }).from(posTransactions)
        .where(and(eq(posTransactions.clubId, clubId), eq(posTransactions.status, 'completed'), gte(posTransactions.createdAt, new Date(today + 'T00:00:00')))),
      db.select({ s: sql<string>`coalesce(sum(${posTransactions.total}),0)` }).from(posTransactions)
        .where(and(eq(posTransactions.clubId, clubId), eq(posTransactions.status, 'completed'), gte(posTransactions.createdAt, new Date(yesterday + 'T00:00:00')), lt(posTransactions.createdAt, new Date(today + 'T00:00:00')))),
      db.select({ c: count() }).from(maintenanceLogs).where(and(eq(maintenanceLogs.clubId, clubId), eq(maintenanceLogs.status, 'open'))),
    ]);

    const totalSlots = Number(todayTee[0]?.total ?? 0);
    const bookedSlots = Number(todayTee[0]?.booked ?? 0);
    const revToday = Number(todayRev[0]?.s ?? 0);
    const revYest = Number(yestRev[0]?.s ?? 0);

    res.json({
      occupancy: { booked: bookedSlots, total: totalSlots, pct: totalSlots ? Math.round((bookedSlots / totalSlots) * 100) : 0 },
      revenueToday: revToday,
      revenueYesterday: revYest,
      revenueChangePct: revYest ? Math.round(((revToday - revYest) / revYest) * 100) : 0,
      bookingsToday: Number(todayBookings[0]?.c ?? 0),
      checkedInToday: Number(checkedIn[0]?.c ?? 0),
      openMaintenance: Number(openCritical[0]?.c ?? 0),
    });
  }),
);

// GET /dashboard/revenue
router.get(
  '/revenue',
  validate({ query: z.object({ from: z.string().optional(), to: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ from?: string; to?: string }>(req);
    const from = q.from ?? daysAgoStr(30);
    const to = q.to ?? todayStr();

    const byCategory = await db
      .select({ category: posTransactions.category, total: sql<string>`coalesce(sum(${posTransactions.total}),0)` })
      .from(posTransactions)
      .where(and(eq(posTransactions.clubId, clubId), eq(posTransactions.status, 'completed'), gte(posTransactions.createdAt, new Date(from + 'T00:00:00')), lte(posTransactions.createdAt, new Date(to + 'T23:59:59'))))
      .groupBy(posTransactions.category);

    const byDay = await db
      .select({ day: sql<string>`to_char(${posTransactions.createdAt}, 'YYYY-MM-DD')`, total: sql<string>`coalesce(sum(${posTransactions.total}),0)` })
      .from(posTransactions)
      .where(and(eq(posTransactions.clubId, clubId), eq(posTransactions.status, 'completed'), gte(posTransactions.createdAt, new Date(from + 'T00:00:00')), lte(posTransactions.createdAt, new Date(to + 'T23:59:59'))))
      .groupBy(sql`to_char(${posTransactions.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${posTransactions.createdAt}, 'YYYY-MM-DD')`);

    res.json({
      byCategory: byCategory.map((c) => ({ category: c.category, total: Number(c.total) })),
      byDay: byDay.map((d) => ({ day: d.day, total: Number(d.total) })),
    });
  }),
);

// GET /dashboard/occupancy  (weekly heatmap)
router.get(
  '/occupancy',
  validate({ query: z.object({ from: z.string().optional(), to: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ from?: string; to?: string }>(req);
    const from = q.from ?? todayStr();
    const to = q.to ?? daysAgoStr(-6);

    const rows = await db
      .select({
        date: teeTimes.date,
        hour: sql<number>`extract(hour from ${teeTimes.startTime})`,
        total: sql<number>`coalesce(sum(${teeTimes.slotsTotal}),0)`,
        booked: sql<number>`coalesce(sum(${teeTimes.slotsBooked}),0)`,
      })
      .from(teeTimes)
      .where(and(eq(teeTimes.clubId, clubId), gte(teeTimes.date, from), lte(teeTimes.date, to)))
      .groupBy(teeTimes.date, sql`extract(hour from ${teeTimes.startTime})`);

    res.json(rows.map((r) => ({
      date: r.date, hour: Number(r.hour), total: Number(r.total), booked: Number(r.booked),
      pct: Number(r.total) ? Math.round((Number(r.booked) / Number(r.total)) * 100) : 0,
    })));
  }),
);

// GET /dashboard/members
router.get(
  '/members',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [byStatus, byType] = await Promise.all([
      db.select({ status: members.membershipStatus, c: count() }).from(members)
        .where(and(eq(members.clubId, clubId), eq(members.isActive, true))).groupBy(members.membershipStatus),
      db.select({ type: members.membershipType, c: count() }).from(members)
        .where(and(eq(members.clubId, clubId), eq(members.isActive, true))).groupBy(members.membershipType),
    ]);
    res.json({
      byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.c) })),
      byType: byType.map((t) => ({ type: t.type, count: Number(t.c) })),
    });
  }),
);

// GET /dashboard/top-members
router.get(
  '/top-members',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const rows = await db
      .select({
        id: members.id, firstName: members.firstName, lastName: members.lastName,
        memberNumber: members.memberNumber, rounds: count(bookings.id),
      })
      .from(members)
      .leftJoin(bookings, eq(bookings.bookedByMemberId, members.id))
      .where(and(eq(members.clubId, clubId), eq(members.isActive, true)))
      .groupBy(members.id)
      .orderBy(desc(count(bookings.id)))
      .limit(5);
    res.json(rows.map((r) => ({ ...r, rounds: Number(r.rounds) })));
  }),
);

// GET /dashboard/recent-transactions
router.get(
  '/recent-transactions',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const rows = await db
      .select()
      .from(posTransactions)
      .where(eq(posTransactions.clubId, clubId))
      .orderBy(desc(posTransactions.createdAt))
      .limit(10);
    res.json(rows);
  }),
);

// GET /dashboard/insights  (rule-based AI insights)
router.get(
  '/insights',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const insights: { type: string; severity: 'info' | 'warning' | 'critical'; title: string; message: string; actionUrl?: string }[] = [];

    // Reorder alerts
    const lowStock = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.clubId, clubId), eq(inventoryItems.isActive, true), lte(inventoryItems.quantityOnHand, inventoryItems.quantityMinimum)));
    for (const item of lowStock.slice(0, 5)) {
      insights.push({
        type: 'inventory', severity: 'warning',
        title: 'Reorder recommended',
        message: `${item.name} is low (${item.quantityOnHand} left, min ${item.quantityMinimum}).`,
        actionUrl: '/inventory',
      });
    }

    // Churn risk: active members with no booking in 45+ days
    const cutoff = daysAgoStr(45);
    const atRisk = await db
      .select({ id: members.id, firstName: members.firstName, lastName: members.lastName, last: sql<string>`max(${bookings.createdAt})` })
      .from(members)
      .leftJoin(bookings, eq(bookings.bookedByMemberId, members.id))
      .where(and(eq(members.clubId, clubId), eq(members.isActive, true), eq(members.membershipStatus, 'active')))
      .groupBy(members.id)
      .having(sql`max(${bookings.createdAt}) is null or max(${bookings.createdAt}) < ${cutoff + 'T00:00:00'}`)
      .limit(100);
    if (atRisk.length) {
      insights.push({
        type: 'members', severity: 'info',
        title: 'Member churn risk',
        message: `${atRisk.length} active member(s) haven't booked in 45+ days. Consider a win-back offer.`,
        actionUrl: '/members',
      });
    }

    res.json({ insights, atRiskMemberIds: atRisk.map((m) => m.id) });
  }),
);

export default router;
