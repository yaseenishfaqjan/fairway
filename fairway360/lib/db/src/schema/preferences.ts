import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { members } from "./users";
import { pk, timestamps } from "./_helpers";

/**
 * Episodic AI memory — everything the agents have learned about a member.
 * One row per member; updated by learnFromSession() after every agent session
 * and editable by supervisors (preference override).
 *
 * SAFETY: `allergens` is append-only from agent sessions (never removed by AI);
 * only a supervisor may remove an allergen.
 */
export const memberPreferences = pgTable("member_preferences", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" })
    .unique(),

  // Critical safety data
  allergens: jsonb("allergens").notNull().default([]), // ["nuts", "shellfish"]
  dietaryRestrictions: jsonb("dietary_restrictions").notNull().default([]),

  // Order patterns
  favoriteItems: jsonb("favorite_items").notNull().default([]), // [{ name, orderedCount, lastOrdered }]
  usualTable: text("usual_table"),
  averageOrderValue: numeric("average_order_value", { precision: 10, scale: 2 }),

  // Communication style
  communicationStyle: text("communication_style"), // formal | friendly | casual | brief

  // Booking patterns
  usualTeeTime: jsonb("usual_tee_time"), // { saturday: "08:30", ... }
  usualPlayers: integer("usual_players"),
  prefersCart: jsonb("prefers_cart"),

  // Relationship history
  complaintCount: integer("complaint_count").notNull().default(0),
  lastComplaintSummary: text("last_complaint_summary"),
  complimentCount: integer("compliment_count").notNull().default(0),
  vipNotes: text("vip_notes"), // supervisor-added

  // AI session tracking
  totalSessions: integer("total_sessions").notNull().default(0),
  lastSessionSummary: text("last_session_summary"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  updatedBySession: text("updated_by_session"),
  ...timestamps,
});

export const insertMemberPreferencesSchema = createInsertSchema(
  memberPreferences,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMemberPreferences = z.infer<
  typeof insertMemberPreferencesSchema
>;
export type MemberPreferences = typeof memberPreferences.$inferSelect;
