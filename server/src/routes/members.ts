import { Router } from 'express';
import { z } from 'zod';
import { and, eq, ilike, or, desc, sql, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { members, bookings, posTransactions } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound, parsePagination } from '../lib/http.js';
import { MEMBERSHIP_TYPES, MEMBERSHIP_STATUSES } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

const memberBody = z.object({
  memberNumber: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  handicapIndex: z.coerce.number().optional(),
  membershipType: z.enum(MEMBERSHIP_TYPES).optional(),
  membershipStatus: z.enum(MEMBERSHIP_STATUSES).optional(),
  joinDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

function toRow(clubId: string, b: z.infer<typeof memberBody>) {
  return {
    clubId,
    memberNumber: b.memberNumber,
    firstName: b.firstName,
    lastName: b.lastName,
    email: b.email || null,
    phone: b.phone,
    handicapIndex: b.handicapIndex !== undefined ? String(b.handicapIndex) : undefined,
    membershipType: b.membershipType,
    membershipStatus: b.membershipStatus,
    joinDate: b.joinDate,
    expiryDate: b.expiryDate,
    notes: b.notes,
    emergencyContactName: b.emergencyContactName,
    emergencyContactPhone: b.emergencyContactPhone,
  };
}

// GET /members
router.get(
  '/',
  validate({
    query: z.object({
      page: z.coerce.number().optional(),
      pageSize: z.coerce.number().optional(),
      search: z.string().optional(),
      status: z.enum(MEMBERSHIP_STATUSES).optional(),
      type: z.enum(MEMBERSHIP_TYPES).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ search?: string; status?: string; type?: string }>(req);
    const { page, pageSize, offset } = parsePagination(req.query);

    const filters = [eq(members.clubId, clubId), eq(members.isActive, true)];
    if (q.status) filters.push(eq(members.membershipStatus, q.status));
    if (q.type) filters.push(eq(members.membershipType, q.type));
    if (q.search) {
      const term = `%${q.search}%`;
      filters.push(
        or(
          ilike(members.firstName, term),
          ilike(members.lastName, term),
          ilike(members.email, term),
          ilike(members.memberNumber, term),
        )!,
      );
    }
    const where = and(...filters);

    const [rows, [{ total }]] = await Promise.all([
      db.select().from(members).where(where).orderBy(desc(members.createdAt)).limit(pageSize).offset(offset),
      db.select({ total: count() }).from(members).where(where),
    ]);

    res.json({
      data: rows,
      pagination: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) },
    });
  }),
);

// POST /members
router.post(
  '/',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ body: memberBody }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db.insert(members).values(toRow(clubId, req.body)).returning();
    res.status(201).json(row);
  }),
);

// GET /members/:id  (with history)
router.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!member) throw notFound('Member not found');

    const [memberBookings, memberTx, [stats]] = await Promise.all([
      db.select().from(bookings).where(eq(bookings.bookedByMemberId, member.id)).orderBy(desc(bookings.createdAt)).limit(50),
      db.select().from(posTransactions).where(eq(posTransactions.memberId, member.id)).orderBy(desc(posTransactions.createdAt)).limit(50),
      db
        .select({
          rounds: count(bookings.id),
          ytdSpend: sql<string>`coalesce(sum(${posTransactions.total}), 0)`,
        })
        .from(bookings)
        .leftJoin(posTransactions, eq(posTransactions.memberId, member.id))
        .where(eq(bookings.bookedByMemberId, member.id)),
    ]);

    res.json({
      ...member,
      bookings: memberBookings,
      transactions: memberTx,
      stats: { rounds: Number(stats?.rounds ?? 0), ytdSpend: Number(stats?.ytdSpend ?? 0) },
    });
  }),
);

// PUT /members/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ params: z.object({ id: z.string().uuid() }), body: memberBody.partial() }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const updates = toRow(clubId, req.body as z.infer<typeof memberBody>);
    const [row] = await db
      .update(members)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Member not found');
    res.json(row);
  }),
);

// DELETE /members/:id  (soft delete)
router.delete(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .update(members)
      .set({ isActive: false, membershipStatus: 'cancelled', updatedAt: new Date() })
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Member not found');
    res.json({ success: true });
  }),
);

// GET /members/:id/bookings
router.get(
  '/:id/bookings',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const rows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.bookedByMemberId, req.params.id), eq(bookings.clubId, clubId)))
      .orderBy(desc(bookings.createdAt));
    res.json(rows);
  }),
);

// GET /members/:id/transactions
router.get(
  '/:id/transactions',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const rows = await db
      .select()
      .from(posTransactions)
      .where(and(eq(posTransactions.memberId, req.params.id), eq(posTransactions.clubId, clubId)))
      .orderBy(desc(posTransactions.createdAt));
    res.json(rows);
  }),
);

// POST /members/:id/charge
router.post(
  '/:id/charge',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ amount: z.coerce.number(), description: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const { amount, description } = req.body as { amount: number; description: string };
    const [member] = await db
      .select()
      .from(members)
      .where(and(eq(members.id, req.params.id), eq(members.clubId, clubId)));
    if (!member) throw notFound('Member not found');

    const newBalance = (Number(member.balance ?? 0) + amount).toFixed(2);
    await db.update(members).set({ balance: newBalance, updatedAt: new Date() }).where(eq(members.id, member.id));
    const [tx] = await db
      .insert(posTransactions)
      .values({
        clubId,
        memberId: member.id,
        cashierId: req.auth!.userId,
        items: [{ name: description, sku: 'CHARGE', qty: 1, unit_price: amount, total: amount }],
        subtotal: amount.toFixed(2),
        tax: '0',
        total: amount.toFixed(2),
        paymentMethod: 'member_account',
        category: 'pro_shop',
        status: 'completed',
      })
      .returning();
    res.status(201).json({ balance: newBalance, transaction: tx });
  }),
);

export default router;
