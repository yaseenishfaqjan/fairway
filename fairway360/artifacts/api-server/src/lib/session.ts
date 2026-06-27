import type { RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

const PgStore = connectPgSimple(session);

export function sessionMiddleware(): RequestHandler {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required but was not provided.",
    );
  }

  return session({
    name: "fairway.sid",
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    // "auto": the cookie is marked Secure only when the connection is actually
    // HTTPS (honoring `trust proxy` behind a TLS-terminating proxy in prod). Over
    // plain HTTP — e.g. testing the prod build locally — it stays non-secure so
    // the session cookie is still set and auth works.
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: "auto",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  });
}
