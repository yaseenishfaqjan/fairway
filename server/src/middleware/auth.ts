import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';
import { unauthorized, forbidden } from '../lib/http.js';
import { ROLE_RANK, type Role } from '../lib/constants.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Missing access token'));
  }
  const token = header.slice('Bearer '.length);
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

// Require the user's role to be one of the allowed roles (exact match list).
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!allowed.includes(req.auth.role)) {
      return next(forbidden('Your role does not have permission for this action'));
    }
    next();
  };
}

// Require at least a minimum role rank (hierarchical).
export function requireMinRole(min: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (ROLE_RANK[req.auth.role] < ROLE_RANK[min]) {
      return next(forbidden('Insufficient permissions'));
    }
    next();
  };
}

// The club_id that all queries must scope to. superadmin may pass ?clubId / x-club-id
// to operate on a specific club; everyone else is locked to their own club.
export function clubScope(req: Request): string {
  if (!req.auth) throw unauthorized();
  if (req.auth.role === 'superadmin') {
    const override = (req.headers['x-club-id'] as string) || (req.query.clubId as string);
    if (override) return override;
  }
  if (!req.auth.clubId) throw forbidden('No club associated with this account');
  return req.auth.clubId;
}
