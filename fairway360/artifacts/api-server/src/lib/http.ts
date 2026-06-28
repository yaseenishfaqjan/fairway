import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { captureException } from "./monitoring";

/** Thrown anywhere in a route to produce a ProblemDetails JSON response. */
export class HttpError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, title: string, detail?: string) {
    super(title);
    this.name = "HttpError";
    this.status = status;
    this.detail = detail;
  }
}

export const badRequest = (title: string, detail?: string) =>
  new HttpError(400, title, detail);
export const unauthorized = (title = "Not authenticated") =>
  new HttpError(401, title);
export const forbidden = (title = "Not allowed") => new HttpError(403, title);
export const notFound = (title = "Not found") => new HttpError(404, title);

/** Wraps an async handler so rejected promises reach the error middleware. */
export const asyncHandler =
  <P = Record<string, string>>(
    fn: RequestHandler<P>,
  ): RequestHandler<P> =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Terminal error handler — serializes everything as ProblemDetails. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json({ title: err.message, detail: err.detail, status: err.status });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      title: "Invalid request",
      detail: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      status: 400,
    });
    return;
  }

  req.log?.error({ err }, "Unhandled error");
  captureException(err, { path: req.path, method: req.method });
  res.status(500).json({ title: "Internal server error", status: 500 });
};
