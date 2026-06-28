import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import { db, notifications } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/http";
import { fmtAgoShort } from "../lib/format";

const router: IRouter = Router();

// The current user's recent notifications + unread count (for the bell).
router.get(
  "/me/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, clubId } = req.auth!;
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.clubId, clubId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt))
      .limit(30);
    const [{ c }] = await db
      .select({ c: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.clubId, clubId),
          eq(notifications.userId, userId),
          eq(notifications.read, false),
        ),
      );
    res.json({
      unread: Number(c ?? 0),
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: n.read,
        time: fmtAgoShort(n.createdAt),
      })),
    });
  }),
);

router.patch(
  "/me/notifications/:id/read",
  requireAuth,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { userId, clubId } = req.auth!;
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, req.params.id),
          eq(notifications.clubId, clubId),
          eq(notifications.userId, userId),
        ),
      );
    res.json({ ok: true });
  }),
);

router.post(
  "/me/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, clubId } = req.auth!;
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.clubId, clubId),
          eq(notifications.userId, userId),
          eq(notifications.read, false),
        ),
      );
    res.json({ ok: true });
  }),
);

export default router;
