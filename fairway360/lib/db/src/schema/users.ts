import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { pk, timestamps } from "./_helpers";

export const userRole = pgEnum("user_role", [
  "supervisor",
  "employee",
  "member",
]);
export const userStatus = pgEnum("user_status", ["active", "invited", "disabled"]);

/** Auth principal. Email is unique per club (not globally). */
export const users = pgTable(
  "users",
  {
    id: pk(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    role: userRole("role").notNull(),
    name: text("name").notNull(),
    initials: text("initials"),
    phone: text("phone"),
    status: userStatus("status").notNull().default("active"),
    // Password reset: a SHA-256 hash of the emailed token + its expiry.
    passwordResetTokenHash: text("password_reset_token_hash"),
    passwordResetExpiresAt: timestamp("password_reset_expires_at"),
    ...timestamps,
  },
  (t) => [unique("users_club_email_unique").on(t.clubId, t.email)],
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/** Member profile — 1:1 with a users row whose role = member. */
export const members = pgTable("members", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  memberNumber: text("member_number").notNull(),
  tier: text("tier").notNull().default("Standard"),
  memberSince: integer("member_since"),
  handicap: numeric("handicap", { precision: 3, scale: 1 }),
  roundsThisYear: integer("rounds_this_year").notNull().default(0),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  ...timestamps,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export const staffStatus = pgEnum("staff_status", [
  "On Shift",
  "On Break",
  "Clocked Out",
  "Off Today",
]);

/** Staff profile — 1:1 with a users row whose role = employee | supervisor. */
export const staffProfiles = pgTable("staff_profiles", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  jobTitle: text("job_title").notNull(),
  employeeNo: text("employee_no").notNull(),
  defaultArea: text("default_area"),
  currentStatus: staffStatus("current_status").notNull().default("Clocked Out"),
  hoursTarget: integer("hours_target").notNull().default(40),
  ...timestamps,
});

export const insertStaffProfileSchema = createInsertSchema(staffProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStaffProfile = z.infer<typeof insertStaffProfileSchema>;
export type StaffProfile = typeof staffProfiles.$inferSelect;
