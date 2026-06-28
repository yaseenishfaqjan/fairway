import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, users, clubs } from "@workspace/db";
import { LoginBody, ForgotPasswordBody, ResetPasswordBody } from "@workspace/api-zod";
import type { AuthUser } from "@workspace/api-zod";
import { asyncHandler, badRequest, unauthorized } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../lib/rate-limit";
import { sendEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Brute-force protection: cap login attempts per IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, key: "login" });
// Cap reset requests per IP so the endpoint can't be used to spam inboxes.
const forgotLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5, key: "forgot" });

function resetEmailHtml(name: string, link: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0f1f17">
    <div style="background:linear-gradient(120deg,#0f3d28,#0a2b1c);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">Fairway360</div>
      <div style="font-size:20px;font-weight:600;margin-top:4px">Reset your password</div>
    </div>
    <div style="border:1px solid #e3e8e5;border-top:none;border-radius:0 0 12px 12px;padding:24px 26px">
      <p>Hi ${name.split(" ")[0] || "there"},</p>
      <p>We received a request to reset your Fairway360 password. This link expires in 1 hour.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#1a6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Reset password</a></p>
      <p style="font-size:13px;color:#5c6b63">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>`;
}

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
  "/auth/forgot-password",
  forgotLimiter,
  asyncHandler(async (req, res) => {
    const { email } = ForgotPasswordBody.parse(req.body);
    const normalized = email.toLowerCase().trim();
    const rows = await db.select().from(users).where(eq(users.email, normalized));
    for (const user of rows) {
      if (user.status !== "active") continue;
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db
        .update(users)
        .set({
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60_000),
        })
        .where(eq(users.id, user.id));
      const base = process.env["APP_URL"] ?? "";
      const link = `${base}/portal/reset?token=${token}`;
      const sent = await sendEmail({
        to: user.email,
        subject: "Reset your Fairway360 password",
        html: resetEmailHtml(user.name, link),
      });
      if (!sent) {
        // Email not configured — log the link so a self-hosting admin can deliver it.
        logger.warn({ email: user.email, link }, "password reset: email disabled, link logged");
      }
      break; // only the first matching account
    }
    // Always 200 — never reveal whether an account exists.
    res.json({ ok: true });
  }),
);

router.post(
  "/auth/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = ResetPasswordBody.parse(req.body);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetTokenHash, tokenHash));
    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw badRequest("This reset link is invalid or has expired.");
    }
    await db
      .update(users)
      .set({
        passwordHash: bcrypt.hashSync(password, 10),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id));
    res.json({ ok: true });
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
