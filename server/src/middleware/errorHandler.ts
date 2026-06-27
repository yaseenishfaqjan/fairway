import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/http.js';
import { config } from '../config.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name: string }).name;
    if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
  if (config.NODE_ENV !== 'production') {
    console.error('[error]', err);
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: 'Internal server error', ...(config.NODE_ENV !== 'production' ? { message } : {}) });
}
