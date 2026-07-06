import {
  boolean,
  integer,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { userRole, users } from "./users";
import { pk, timestamps } from "./_helpers";

/**
 * Token-based invitation links for staff and members.
 * The raw token is emailed once; only its SHA-256 hash is stored
 * (same pattern as password reset tokens on `users`).
 */
export const inviteLinks = pgTable(
  "invite_links",
  {
    id: pk(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    role: userRole("role").notNull(),
    department: text("department"),
    email: text("email"),
    name: text("name"),
    tier: text("tier"), // pre-assigned membership tier (member invites)
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedBy: uuid("used_by").references(() => users.id, {
      onDelete: "set null",
    }),
    maxUses: integer("max_uses").notNull().default(1),
    useCount: integer("use_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("invite_links_club_idx").on(t.clubId)],
);

export const insertInviteLinkSchema = createInsertSchema(inviteLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInviteLink = z.infer<typeof insertInviteLinkSchema>;
export type InviteLink = typeof inviteLinks.$inferSelect;
