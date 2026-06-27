import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { clubs } from '../db/schema.js';
import { requireAuth, requireRole, clubScope } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, notFound, forbidden } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

function assertOwnClub(req: import('express').Request, id: string) {
  if (req.auth!.role !== 'superadmin' && req.auth!.clubId !== id) {
    throw forbidden('You can only access your own club');
  }
}

// GET /clubs/:id
router.get(
  '/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    assertOwnClub(req, req.params.id);
    const [club] = await db.select().from(clubs).where(eq(clubs.id, req.params.id));
    if (!club) throw notFound('Club not found');
    res.json(club);
  }),
);

// PUT /clubs/:id
router.put(
  '/:id',
  requireRole('superadmin', 'club_owner'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      logoUrl: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      settings: z.record(z.unknown()).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    assertOwnClub(req, req.params.id);
    const [row] = await db
      .update(clubs)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(clubs.id, req.params.id))
      .returning();
    if (!row) throw notFound('Club not found');
    res.json(row);
  }),
);

// POST /clubs/:id/upload-logo  (accepts a base64 data URL)
router.post(
  '/:id/upload-logo',
  requireRole('superadmin', 'club_owner'),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ dataUrl: z.string().min(1) }),
  }),
  asyncHandler(async (req, res) => {
    assertOwnClub(req, req.params.id);
    const [row] = await db
      .update(clubs)
      .set({ logoUrl: (req.body as { dataUrl: string }).dataUrl, updatedAt: new Date() })
      .where(eq(clubs.id, req.params.id))
      .returning();
    if (!row) throw notFound('Club not found');
    res.json({ logoUrl: row.logoUrl });
  }),
);

export default router;
