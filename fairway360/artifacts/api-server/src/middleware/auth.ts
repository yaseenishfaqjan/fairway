import type { RequestHandler } from "express";
import type { Role } from "@workspace/api-zod";
import { forbidden, unauthorized } from "../lib/http";

/**
 * Gate that requires a logged-in session. Populates req.auth from the session
 * so downstream handlers read club_id from here (never from request input).
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const { userId, clubId, role } = req.session;
  if (!userId || !clubId || !role) {
    next(unauthorized());
    return;
  }
  req.auth = { userId, clubId, role };
  next();
};

/** Restricts a route to one of the given roles. Must run after requireAuth. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(forbidden());
      return;
    }
    next();
  };

/** Staff = supervisor or employee. Convenience guard for back-of-house routes. */
export const requireStaff = requireRole("supervisor", "employee");
