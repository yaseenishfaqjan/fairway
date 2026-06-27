import { Router } from 'express';
import { z } from 'zod';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { maintenanceLogs } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { MAINTENANCE_AREAS, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

// GET /maintenance
router.get(
  '/',
  validate({
    query: z.object({
      status: z.enum(MAINTENANCE_STATUSES).optional(),
      priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ status?: string; priority?: string }>(req);
    const filters = [eq(maintenanceLogs.clubId, clubId)];
    if (q.status) filters.push(eq(maintenanceLogs.status, q.status));
    if (q.priority) filters.push(eq(maintenanceLogs.priority, q.priority));
    const rows = await db
      .select()
      .from(maintenanceLogs)
      .where(and(...filters))
      .orderBy(desc(maintenanceLogs.createdAt));
    res.json(rows);
  }),
);

// POST /maintenance
router.post(
  '/',
  requireRole('superadmin', 'club_owner', 'manager', 'staff', 'ranger'),
  validate({
    body: z.object({
      area: z.enum(MAINTENANCE_AREAS),
      issueType: z.string().min(1),
      priority: z.enum(MAINTENANCE_PRIORITIES),
      description: z.string().min(1),
      assignedTo: z.string().uuid().nullable().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .insert(maintenanceLogs)
      .values({ clubId, ...req.body, reportedBy: req.auth!.userId, status: 'open' })
      .returning();
    res.status(201).json(row);
  }),
);

// PUT /maintenance/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager', 'staff'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      status: z.enum(MAINTENANCE_STATUSES).optional(),
      priority: z.enum(MAINTENANCE_PRIORITIES).optional(),
      assignedTo: z.string().uuid().nullable().optional(),
      description: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as { status?: string; priority?: string; assignedTo?: string | null; description?: string };
    const [row] = await db
      .update(maintenanceLogs)
      .set({ ...b, resolvedAt: b.status === 'resolved' ? new Date() : undefined })
      .where(and(eq(maintenanceLogs.id, req.params.id), eq(maintenanceLogs.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Maintenance log not found');
    res.json(row);
  }),
);

export default router;
