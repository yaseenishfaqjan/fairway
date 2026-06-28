import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, deviceTokens } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, badRequest } from "../lib/http";
import { pushEnabled } from "../lib/push";

const router: IRouter = Router();

// Whether push is configured server-side (frontend uses this to decide whether
// to show the "Enable notifications" affordance).
router.get(
  "/push/config",
  requireAuth,
  (_req, res) => {
    res.json({ enabled: pushEnabled() });
  },
);

// Register a device's FCM token for the current user (idempotent upsert).
router.post(
  "/me/push/subscribe",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, clubId } = req.auth!;
    const { token, platform } = (req.body ?? {}) as { token?: string; platform?: string };
    if (!token || typeof token !== "string") throw badRequest("A push token is required.");
    await db
      .insert(deviceTokens)
      .values({ clubId, userId, token, platform: platform === "ios" || platform === "android" ? platform : "web" })
      .onConflictDoUpdate({ target: deviceTokens.token, set: { userId, clubId } });
    res.json({ ok: true });
  }),
);

router.post(
  "/me/push/unsubscribe",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { token } = (req.body ?? {}) as { token?: string };
    if (token) await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
    res.json({ ok: true });
  }),
);

export default router;
