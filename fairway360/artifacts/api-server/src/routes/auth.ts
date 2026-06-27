import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, users, clubs } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import type { AuthUser } from "@workspace/api-zod";
import { asyncHandler, badRequest, unauthorized } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../lib/rate-limit";

const router: IRouter = Router();

// Brute-force protection: cap login attempts per IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, key: "login" });

function toAuthUser(
  user: typeof users.$inferSelect,
  club: typeof clubs.$inferSelect,
): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    initials: user.initials ?? undefined,
    role: user.role,
    clubName: club.name,
    clubSlug: club.slug,
  };
}

router.post(
  "/auth/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = LoginBody.parse(req.body);

    // Email is unique per club, not globally — there may be more than one user
    // with this email across tenants. Verify the password against each match;
    // the row whose hash validates identifies the tenant (no club selector
    // needed in the request).
    const rows = await db
      .select({ user: users, club: clubs })
      .from(users)
      .innerJoin(clubs, eq(users.clubId, clubs.id))
      .where(eq(users.email, email.toLowerCase().trim()));

    for (const { user, club } of rows) {
      if (user.status !== "active" || !user.passwordHash) continue;
      if (!bcrypt.compareSync(password, user.passwordHash)) continue;
      if (club.status !== "active") {
        throw unauthorized("This club account is not active.");
      }

      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });
      req.session.userId = user.id;
      req.session.clubId = club.id;
      req.session.role = user.role;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      res.json(toAuthUser(user, club));
      return;
    }

    throw unauthorized("Invalid email or password.");
  }),
);

router.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => (err ? reject(err) : resolve()));
    });
    res.clearCookie("fairway.sid");
    res.json({ ok: true });
  }),
);

router.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const [row] = await db
      .select({ user: users, club: clubs })
      .from(users)
      .innerJoin(clubs, eq(users.clubId, clubs.id))
      .where(and(eq(users.id, auth.userId), eq(users.clubId, auth.clubId)));

    if (!row) throw badRequest("User no longer exists.");
    res.json(toAuthUser(row.user, row.club));
  }),
);

export default router;
