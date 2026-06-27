import type { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

// Validates and *replaces* req parts with the parsed (typed, coerced) values.
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'validatedQuery', { value: parsed, writable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Helper to read validated query (kept separate so we don't fight Express's getter-only req.query).
export function vquery<T>(req: Request): T {
  return (req as unknown as { validatedQuery: T }).validatedQuery;
}
