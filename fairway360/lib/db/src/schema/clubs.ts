import { pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pk, timestamps } from "./_helpers";

export const clubPlan = pgEnum("club_plan", ["trial", "starter", "pro", "enterprise"]);
export const clubStatus = pgEnum("club_status", ["active", "suspended", "cancelled"]);

/** Tenant root. Every business table carries a club_id referencing this table. */
export const clubs = pgTable("clubs", {
  id: pk(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  businessType: text("business_type").notNull().default("golf_course"),
  timezone: text("timezone").notNull().default("America/New_York"),
  stripeCustomerId: text("stripe_customer_id"),
  plan: clubPlan("plan").notNull().default("trial"),
  status: clubStatus("status").notNull().default("active"),
  ...timestamps,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;
