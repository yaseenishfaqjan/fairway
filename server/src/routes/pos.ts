import { Router } from 'express';
import { z } from 'zod';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { posTransactions, members } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound, badRequest } from '../lib/http.js';
import { POS_CATEGORIES, PAYMENT_METHODS } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

const itemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  qty: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  total: z.coerce.number().min(0).optional(),
});

// GET /pos/transactions
router.get(
  '/transactions',
  validate({
    query: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      category: z.enum(POS_CATEGORIES).optional(),
      cashierId: z.string().uuid().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ from?: string; to?: string; category?: string; cashierId?: string }>(req);
    const filters = [eq(posTransactions.clubId, clubId)];
    if (q.category) filters.push(eq(posTransactions.category, q.category));
    if (q.cashierId) filters.push(eq(posTransactions.cashierId, q.cashierId));
    if (q.from) filters.push(gte(posTransactions.createdAt, new Date(q.from + 'T00:00:00')));
    if (q.to) filters.push(lte(posTransactions.createdAt, new Date(q.to + 'T23:59:59')));

    const rows = await db
      .select()
      .from(posTransactions)
      .where(and(...filters))
      .orderBy(desc(posTransactions.createdAt))
      .limit(500);
    res.json(rows);
  }),
);

// POST /pos/transactions
router.post(
  '/transactions',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    body: z.object({
      items: z.array(itemSchema).min(1),
      memberId: z.string().uuid().nullable().optional(),
      bookingId: z.string().uuid().nullable().optional(),
      category: z.enum(POS_CATEGORIES),
      paymentMethod: z.enum(PAYMENT_METHODS),
      paymentReference: z.string().optional(),
      discount: z.coerce.number().min(0).default(0),
      taxRate: z.coerce.number().min(0).max(1).default(0.07),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as {
      items: z.infer<typeof itemSchema>[]; memberId?: string | null; bookingId?: string | null;
      category: string; paymentMethod: string; paymentReference?: string; discount: number; taxRate: number;
    };
    const items = b.items.map((it) => ({ ...it, total: +(it.unit_price * it.qty).toFixed(2) }));
    const subtotal = +items.reduce((s, it) => s + it.total, 0).toFixed(2);
    const discounted = Math.max(0, subtotal - b.discount);
    const tax = +(discounted * b.taxRate).toFixed(2);
    const total = +(discounted + tax).toFixed(2);

    if (b.paymentMethod === 'member_account' && !b.memberId) {
      throw badRequest('Member account payment requires a member');
    }

    const [tx] = await db
      .insert(posTransactions)
      .values({
        clubId,
        memberId: b.memberId ?? null,
        bookingId: b.bookingId ?? null,
        cashierId: req.auth!.userId,
        items,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        discount: b.discount.toFixed(2),
        total: total.toFixed(2),
        paymentMethod: b.paymentMethod,
        paymentReference: b.paymentReference,
        category: b.category,
        status: 'completed',
      })
      .returning();

    if (b.paymentMethod === 'member_account' && b.memberId) {
      await db
        .update(members)
        .set({ balance: sql`${members.balance} + ${total}`, updatedAt: new Date() })
        .where(eq(members.id, b.memberId));
    }

    res.status(201).json(tx);
  }),
);

// GET /pos/transactions/:id
router.get(
  '/transactions/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .select()
      .from(posTransactions)
      .where(and(eq(posTransactions.id, req.params.id), eq(posTransactions.clubId, clubId)));
    if (!row) throw notFound('Transaction not found');
    res.json(row);
  }),
);

// PUT /pos/transactions/:id/void
router.put(
  '/transactions/:id/void',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ reason: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [existing] = await db
      .select()
      .from(posTransactions)
      .where(and(eq(posTransactions.id, req.params.id), eq(posTransactions.clubId, clubId)));
    if (!existing) throw notFound('Transaction not found');
    if (existing.status === 'voided') throw badRequest('Transaction already voided');

    const [row] = await db
      .update(posTransactions)
      .set({ status: 'voided', voidedAt: new Date(), voidReason: (req.body as { reason: string }).reason })
      .where(eq(posTransactions.id, existing.id))
      .returning();

    if (existing.paymentMethod === 'member_account' && existing.memberId) {
      await db
        .update(members)
        .set({ balance: sql`${members.balance} - ${existing.total}`, updatedAt: new Date() })
        .where(eq(members.id, existing.memberId));
    }
    res.json(row);
  }),
);

// GET /pos/summary
router.get(
  '/summary',
  validate({ query: z.object({ from: z.string().optional(), to: z.string().optional() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ from?: string; to?: string }>(req);
    const filters = [eq(posTransactions.clubId, clubId), eq(posTransactions.status, 'completed')];
    if (q.from) filters.push(gte(posTransactions.createdAt, new Date(q.from + 'T00:00:00')));
    if (q.to) filters.push(lte(posTransactions.createdAt, new Date(q.to + 'T23:59:59')));

    const byCategory = await db
      .select({
        category: posTransactions.category,
        total: sql<string>`coalesce(sum(${posTransactions.total}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(posTransactions)
      .where(and(...filters))
      .groupBy(posTransactions.category);

    const grandTotal = byCategory.reduce((s, c) => s + Number(c.total), 0);
    res.json({
      total: +grandTotal.toFixed(2),
      byCategory: byCategory.map((c) => ({ category: c.category, total: Number(c.total), count: Number(c.count) })),
    });
  }),
);

export default router;
