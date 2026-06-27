import { Router } from 'express';
import { z } from 'zod';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings, teeTimes } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound, badRequest, conflict } from '../lib/http.js';
import { BOOKING_STATUSES, PAYMENT_METHODS } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

const playerSchema = z.object({
  member_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  handicap: z.number().nullable().optional(),
  is_guest: z.boolean().optional(),
});

// GET /bookings
router.get(
  '/',
  validate({
    query: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.enum(BOOKING_STATUSES).optional(),
      memberId: z.string().uuid().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ from?: string; to?: string; status?: string; memberId?: string }>(req);
    const filters = [eq(bookings.clubId, clubId)];
    if (q.status) filters.push(eq(bookings.status, q.status));
    if (q.memberId) filters.push(eq(bookings.bookedByMemberId, q.memberId));

    const rows = await db
      .select({
        booking: bookings,
        teeTime: { date: teeTimes.date, startTime: teeTimes.startTime, courseName: teeTimes.courseName },
      })
      .from(bookings)
      .leftJoin(teeTimes, eq(bookings.teeTimeId, teeTimes.id))
      .where(
        and(
          ...filters,
          q.from ? gte(teeTimes.date, q.from) : undefined,
          q.to ? lte(teeTimes.date, q.to) : undefined,
        ),
      )
      .orderBy(desc(bookings.createdAt))
      .limit(500);
    res.json(rows.map((r) => ({ ...r.booking, teeTime: r.teeTime })));
  }),
);

// POST /bookings
router.post(
  '/',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    body: z.object({
      teeTimeId: z.string().uuid(),
      bookedByMemberId: z.string().uuid().nullable().optional(),
      players: z.array(playerSchema).min(1),
      paymentMethod: z.enum(PAYMENT_METHODS).optional(),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as {
      teeTimeId: string; bookedByMemberId?: string | null;
      players: z.infer<typeof playerSchema>[]; paymentMethod?: string; notes?: string;
    };

    const [tt] = await db
      .select()
      .from(teeTimes)
      .where(and(eq(teeTimes.id, b.teeTimeId), eq(teeTimes.clubId, clubId)));
    if (!tt) throw notFound('Tee time not found');
    if (tt.status === 'blocked' || tt.status === 'maintenance') {
      throw conflict('This tee time is not available for booking');
    }
    const playerCount = b.players.length;
    const remaining = (tt.slotsTotal ?? 4) - (tt.slotsBooked ?? 0);
    if (playerCount > remaining) throw conflict(`Only ${remaining} slot(s) remaining`);

    const price = Number(tt.pricePerPlayer ?? 0);
    const total = price * playerCount + Number(tt.cartFee ?? 0);

    const [booking] = await db
      .insert(bookings)
      .values({
        clubId,
        teeTimeId: tt.id,
        bookedByMemberId: b.bookedByMemberId ?? null,
        bookedByUserId: req.auth!.userId,
        playerCount,
        players: b.players,
        status: 'confirmed',
        totalAmount: total.toFixed(2),
        paidAmount: '0',
        paymentMethod: b.paymentMethod,
        notes: b.notes,
      })
      .returning();

    const newBooked = (tt.slotsBooked ?? 0) + playerCount;
    await db
      .update(teeTimes)
      .set({ slotsBooked: newBooked, status: newBooked >= (tt.slotsTotal ?? 4) ? 'booked' : 'available' })
      .where(eq(teeTimes.id, tt.id));

    res.status(201).json(booking);
  }),
);

// GET /bookings/:id
router.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .select({
        booking: bookings,
        teeTime: { id: teeTimes.id, date: teeTimes.date, startTime: teeTimes.startTime, courseName: teeTimes.courseName },
      })
      .from(bookings)
      .leftJoin(teeTimes, eq(bookings.teeTimeId, teeTimes.id))
      .where(and(eq(bookings.id, req.params.id), eq(bookings.clubId, clubId)));
    if (!row) throw notFound('Booking not found');
    res.json({ ...row.booking, teeTime: row.teeTime });
  }),
);

// PUT /bookings/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      status: z.enum(BOOKING_STATUSES).optional(),
      players: z.array(playerSchema).optional(),
      paymentMethod: z.enum(PAYMENT_METHODS).optional(),
      paidAmount: z.coerce.number().optional(),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as { status?: string; players?: unknown[]; paymentMethod?: string; paidAmount?: number; notes?: string };
    const [row] = await db
      .update(bookings)
      .set({
        status: b.status,
        players: b.players,
        playerCount: b.players ? b.players.length : undefined,
        paymentMethod: b.paymentMethod,
        paidAmount: b.paidAmount !== undefined ? b.paidAmount.toFixed(2) : undefined,
        notes: b.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, req.params.id), eq(bookings.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Booking not found');
    res.json(row);
  }),
);

// DELETE /bookings/:id  (cancel + restore slots)
router.delete(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [booking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, req.params.id), eq(bookings.clubId, clubId)));
    if (!booking) throw notFound('Booking not found');
    if (booking.status === 'cancelled') throw badRequest('Booking already cancelled');

    await db.update(bookings).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    if (booking.teeTimeId) {
      await db
        .update(teeTimes)
        .set({
          slotsBooked: sql`greatest(0, ${teeTimes.slotsBooked} - ${booking.playerCount})`,
          status: 'available',
        })
        .where(eq(teeTimes.id, booking.teeTimeId));
    }
    res.json({ success: true });
  }),
);

// POST /bookings/:id/checkin
router.post(
  '/:id/checkin',
  requireRole('superadmin', 'club_owner', 'manager', 'staff', 'ranger'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .update(bookings)
      .set({ checkInAt: new Date(), status: 'completed', updatedAt: new Date() })
      .where(and(eq(bookings.id, req.params.id), eq(bookings.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Booking not found');
    res.json(row);
  }),
);

export default router;
