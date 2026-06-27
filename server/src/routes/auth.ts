import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens } from '../db/schema.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, unauthorized, badRequest } from '../lib/http.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiry,
} from '../lib/jwt.js';
import type { Role } from '../lib/constants.js';

const router = Router();

const REFRESH_COOKIE = 'fairway_refresh';
function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    clubId: u.clubId,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    lastLoginAt: u.lastLoginAt,
  };
}

// POST /auth/login
router.post(
  '/login',
  validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!user || !user.isActive) throw unauthorized('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid credentials');

    const accessToken = signAccessToken({
      userId: user.id,
      clubId: user.clubId,
      role: user.role as Role,
      email: user.email,
    });
    const refreshToken = signRefreshToken(user.id);
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: refreshTokenExpiry(),
    });
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, refreshToken, user: publicUser(user) });
  }),
);

// POST /auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = (req.cookies?.[REFRESH_COOKIE] as string) || (req.body?.refreshToken as string);
    if (!token) throw unauthorized('Missing refresh token');
    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw unauthorized('Invalid refresh token');
    }
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date())));
    if (!stored) throw unauthorized('Refresh token revoked or expired');

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user || !user.isActive) throw unauthorized('User not found');

    const accessToken = signAccessToken({
      userId: user.id,
      clubId: user.clubId,
      role: user.role as Role,
      email: user.email,
    });
    res.json({ accessToken, user: publicUser(user) });
  }),
);

// POST /auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = (req.cookies?.[REFRESH_COOKIE] as string) || (req.body?.refreshToken as string);
    if (token) await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
    res.clearCookie(REFRESH_COOKIE);
    res.json({ success: true });
  }),
);

// GET /auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.auth!.userId));
    if (!user) throw unauthorized();
    res.json({ user: publicUser(user) });
  }),
);

// PUT /auth/change-password
router.put(
  '/change-password',
  requireAuth,
  validate({
    body: z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(8) }),
  }),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body as { oldPassword: string; newPassword: string };
    const [user] = await db.select().from(users).where(eq(users.id, req.auth!.userId));
    if (!user) throw unauthorized();
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw badRequest('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
    res.json({ success: true });
  }),
);

export default router;
