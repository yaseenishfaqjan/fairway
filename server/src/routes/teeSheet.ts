import { Router } from 'express';
import { z } from 'zod';
import { and, eq, gte, lte, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { teeTimes } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound, badRequest } from '../lib/http.js';
import { TEE_TIME_STATUSES } from '../lib/constants.js';
import { suggestPrice } from '../services/pricing.js';

const router = Router();
router.use(requireAuth);

// GET /tee-sheet?date=YYYY-MM-DD&course=Main Course
router.get(
  '/',
  validate({
    query: z.object({ date: z.string(), course: z.string().optional() }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ date: string; course?: string }>(req);
    const filters = [eq(teeTimes.clubId, clubId), eq(teeTimes.date, q.date)];
    if (q.course) filters.push(eq(teeTimes.courseName, q.course));
    const rows = await db
      .select()
      .from(teeTimes)
      .where(and(...filters))
      .orderBy(asc(teeTimes.startTime));
    res.json(rows);
  }),
);

// POST /tee-sheet/bulk-create
router.post(
  '/bulk-create',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    body: z.object({
      startDate: z.string(),
      endDate: z.string().optional(),
      courseName: z.string().default('Main Course'),
      intervalMinutes: z.coerce.number().min(5).max(30).default(10),
      openHour: z.coerce.number().min(0).max(23).default(7),
      closeHour: z.coerce.number().min(1).max(23).default(18),
      slotsTotal: z.coerce.number().min(1).max(5).default(4),
      pricePerPlayer: z.coerce.number().optional(),
      cartFee: z.coerce.number().default(20),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as {
      startDate: string; endDate?: string; courseName: string; intervalMinutes: number;
      openHour: number; closeHour: number; slotsTotal: number; pricePerPlayer?: number; cartFee: number;
    };
    const start = new Date(b.startDate + 'T00:00:00');
    const end = b.endDate ? new Date(b.endDate + 'T00:00:00') : start;
    if (end < start) throw badRequest('endDate must be on or after startDate');

    const values: (typeof teeTimes.$inferInsert)[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      for (let mins = b.openHour * 60; mins <= b.closeHour * 60; mins += b.intervalMinutes) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const price = b.pricePerPlayer ?? suggestPrice(d.getDay(), h);
        values.push({
          clubId,
          courseName: b.courseName,
          date: dateStr,
          startTime: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
          slotsTotal: b.slotsTotal,
          slotsBooked: 0,
          status: 'available',
          pricePerPlayer: price.toFixed(2),
          cartFee: b.cartFee.toFixed(2),
        });
      }
    }
    const created: { id: string }[] = [];
    for (let i = 0; i < values.length; i += 500) {
      const chunk = values.slice(i, i + 500);
      const inserted = await db.insert(teeTimes).values(chunk).returning({ id: teeTimes.id });
      created.push(...inserted);
    }
    res.status(201).json({ created: created.length });
  }),
);

// PUT /tee-sheet/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      status: z.enum(TEE_TIME_STATUSES).optional(),
      pricePerPlayer: z.coerce.number().optional(),
      cartFee: z.coerce.number().optional(),
      slotsTotal: z.coerce.number().min(1).max(5).optional(),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as { status?: string; pricePerPlayer?: number; cartFee?: number; slotsTotal?: number; notes?: string };
    const [row] = await db
      .update(teeTimes)
      .set({
        status: b.status,
        pricePerPlayer: b.pricePerPlayer !== undefined ? b.pricePerPlayer.toFixed(2) : undefined,
        cartFee: b.cartFee !== undefined ? b.cartFee.toFixed(2) : undefined,
        slotsTotal: b.slotsTotal,
        notes: b.notes,
      })
      .where(and(eq(teeTimes.id, req.params.id), eq(teeTimes.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Tee time not found');
    res.json(row);
  }),
);

// POST /tee-sheet/block-range  (bulk block a time window)
router.post(
  '/block-range',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    body: z.object({
      date: z.string(),
      fromTime: z.string(),
      toTime: z.string(),
      status: z.enum(TEE_TIME_STATUSES).default('blocked'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as { date: string; fromTime: string; toTime: string; status: string };
    const result = await db
      .update(teeTimes)
      .set({ status: b.status })
      .where(
        and(
          eq(teeTimes.clubId, clubId),
          eq(teeTimes.date, b.date),
          gte(teeTimes.startTime, b.fromTime),
          lte(teeTimes.startTime, b.toTime),
        ),
      )
      .returning({ id: teeTimes.id });
    res.json({ updated: result.length });
  }),
);

// DELETE /tee-sheet/:id
router.delete(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .delete(teeTimes)
      .where(and(eq(teeTimes.id, req.params.id), eq(teeTimes.clubId, clubId)))
      .returning({ id: teeTimes.id });
    if (!row) throw notFound('Tee time not found');
    res.json({ success: true });
  }),
);

export default router;
