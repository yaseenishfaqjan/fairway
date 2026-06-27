import { Router } from 'express';
import { z } from 'zod';
import { and, eq, or, isNull, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { requireAuth, clubScope } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, notFound } from '../lib/http.js';

const router = Router();
router.use(requireAuth);

// GET /notifications  (user's own + broadcast)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.clubId, clubId), or(eq(notifications.userId, req.auth!.userId), isNull(notifications.userId))))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json(rows);
  }),
);

// PUT /notifications/:id/read
router.put(
  '/:id/read',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    const [row] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.clubId, clubId)))
      .returning();
    if (!row) throw notFound('Notification not found');
    res.json(row);
  }),
);

// PUT /notifications/read-all
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    const clubId = clubScope(req);
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.clubId, clubId), or(eq(notifications.userId, req.auth!.userId), isNull(notifications.userId))));
    res.json({ success: true });
  }),
);

export default router;
