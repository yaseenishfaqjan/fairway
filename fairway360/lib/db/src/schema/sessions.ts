import { index, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Session store table for connect-pg-simple. Column shape must match the
 * library's expectations (sid / sess / expire), so it is owned by the schema
 * here rather than auto-created at runtime.
 */
export const sessions = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6, mode: "date" }).notNull(),
  },
  (t) => [index("IDX_session_expire").on(t.expire)],
);
