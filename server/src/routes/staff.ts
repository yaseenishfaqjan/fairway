import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { and, eq, gte, lte, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, staffSchedules } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate, vquery } from '../middleware/validate.js';
import { asyncHandler, notFound, conflict } from '../lib/http.js';
import { ROLES } from '../lib/constants.js';

const router = Router();
router.use(requireAuth);

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName,
    role: u.role, phone: u.phone, isActive: u.isActive, lastLoginAt: u.lastLoginAt, avatarUrl: u.avatarUrl,
  };
}

// GET /staff
router.get(
  '/',
  requireRole('superadmin', 'club_owner', 'manager'),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const rows = await db.select().from(users).where(eq(users.clubId, clubId)).orderBy(asc(users.firstName));
    res.json(rows.map(publicUser));
  }),
);

// POST /staff
router.post(
  '/',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    body: z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      role: z.enum(ROLES),
      phone: z.string().optional(),
      password: z.string().min(8).default('Welcome123!'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const b = req.body as { email: string; firstName: string; lastName: string; role: string; phone?: string; password: string };
    const [existing] = await db.select().from(users).where(eq(users.email, b.email.toLowerCase()));
    if (existing) throw conflict('A user with this email already exists');
    const [row] = await db
      .insert(users)
      .values({
        clubId, email: b.email.toLowerCase(), firstName: b.firstName, lastName: b.lastName,
        role: b.role, phone: b.phone, passwordHash: await bcrypt.hash(b.password, 10),
      })
      .returning();
    res.status(201).json(publicUser(row));
  }),
);

// PUT /staff/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.enum(ROLES).optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .update(users)
      .set(req.body)
      .where(and(eq(users.id, req.params.id), eq(users.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Staff member not found');
    res.json(publicUser(row));
  }),
);

// GET /staff/schedule
router.get(
  '/schedule',
  validate({ query: z.object({ from: z.string(), to: z.string() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const q = vquery<{ from: string; to: string }>(req);
    const rows = await db
      .select()
      .from(staffSchedules)
      .where(and(eq(staffSchedules.clubId, clubId), gte(staffSchedules.date, q.from), lte(staffSchedules.date, q.to)))
      .orderBy(asc(staffSchedules.date));
    res.json(rows);
  }),
);

// POST /staff/schedule
router.post(
  '/schedule',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({
    body: z.object({
      userId: z.string().uuid(),
      date: z.string(),
      shiftStart: z.string(),
      shiftEnd: z.string(),
      roleThatDay: z.string().optional(),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db.insert(staffSchedules).values({ clubId, ...req.body }).returning();
    res.status(201).json(row);
  }),
);

// DELETE /staff/schedule/:id
router.delete(
  '/schedule/:id',
  requireRole('superadmin', 'club_owner', 'manager'),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    await db.delete(staffSchedules).where(and(eq(staffSchedules.id, req.params.id), eq(staffSchedules.clubId, clubId)));
    res.json({ success: true });
  }),
);

export default router;
