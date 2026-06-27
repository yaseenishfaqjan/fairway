import { Router } from 'express';
import { z } from 'zod';
import { and, eq, ilike, or, desc, sql, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { inventoryItems } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { INVENTORY_CATEGORIES } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

const itemBody = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.enum(INVENTORY_CATEGORIES).optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  cost: z.coerce.number().min(0).optional(),
  quantityOnHand: z.coerce.number().int().min(0).optional(),
  quantityMinimum: z.coerce.number().int().min(0).optional(),
  supplier: z.string().optional(),
});

function toRow(b: Partial<z.infer<typeof itemBody>>) {
  return {
    name: b.name,
    sku: b.sku,
    category: b.category,
    description: b.description,
    price: b.price !== undefined ? b.price.toFixed(2) : undefined,
    cost: b.cost !== undefined ? b.cost.toFixed(2) : undefined,
    quantityOnHand: b.quantityOnHand,
    quantityMinimum: b.quantityMinimum,
    supplier: b.supplier,
  };
}

// GET /inventory
router.get(
  '/',
  validate({
    query: z.object({
      search: z.string().optional(),
      category: z.enum(INVENTORY_CATEGORIES).optional(),
      lowStock: z.enum(['true', 'false']).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ search?: string; category?: string; lowStock?: string }>(req);
    const filters = [eq(inventoryItems.clubId, clubId), eq(inventoryItems.isActive, true)];
    if (q.category) filters.push(eq(inventoryItems.category, q.category));
    if (q.lowStock === 'true') filters.push(lte(inventoryItems.quantityOnHand, inventoryItems.quantityMinimum));
    if (q.search) {
      const term = `%${q.search}%`;
      filters.push(or(ilike(inventoryItems.name, term), ilike(inventoryItems.sku, term))!);
    }
    const rows = await db
      .select()
      .from(inventoryItems)
      .where(and(...filters))
      .orderBy(desc(inventoryItems.createdAt));

    const [valueRow] = await db
      .select({
        retail: sql<string>`coalesce(sum(${inventoryItems.price} * ${inventoryItems.quantityOnHand}), 0)`,
        cost: sql<string>`coalesce(sum(${inventoryItems.cost} * ${inventoryItems.quantityOnHand}), 0)`,
      })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.clubId, clubId), eq(inventoryItems.isActive, true)));

    res.json({
      data: rows,
      summary: { retailValue: Number(valueRow?.retail ?? 0), costValue: Number(valueRow?.cost ?? 0) },
    });
  }),
);

// POST /inventory
router.post(
  '/',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ body: itemBody }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as z.infer<typeof itemBody>;
    const [row] = await db
      .insert(inventoryItems)
      .values({ clubId, ...toRow(b), name: b.name })
      .returning();
    res.status(201).json(row);
  }),
);

// GET /inventory/:id
router.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, req.params.id), eq(inventoryItems.clubId, clubId)));
    if (!row) throw notFound('Item not found');
    res.json(row);
  }),
);

// PUT /inventory/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ params: z.object({ id: z.string().uuid() }), body: itemBody.partial() }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .update(inventoryItems)
      .set({ ...toRow(req.body), updatedAt: new Date() })
      .where(and(eq(inventoryItems.id, req.params.id), eq(inventoryItems.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Item not found');
    res.json(row);
  }),
);

// DELETE /inventory/:id (deactivate)
router.delete(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .update(inventoryItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(inventoryItems.id, req.params.id), eq(inventoryItems.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Item not found');
    res.json({ success: true });
  }),
);

// POST /inventory/:id/adjust
router.post(
  '/:id/adjust',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      delta: z.coerce.number().int(),
      reason: z.enum(['restock', 'sale', 'damage', 'adjustment']),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as { delta: number; reason: string };
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.id, req.params.id), eq(inventoryItems.clubId, clubId)));
    if (!item) throw notFound('Item not found');
    const newQty = Math.max(0, (item.quantityOnHand ?? 0) + b.delta);
    const [row] = await db
      .update(inventoryItems)
      .set({ quantityOnHand: newQty, updatedAt: new Date() })
      .where(eq(inventoryItems.id, item.id))
      .returning();
    res.json(row);
  }),
);

export default router;
