import { boolean, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pk, timestamps } from "./_helpers";

// Sales tiers: Fairway Core / Pro / Elite / Enterprise (+ legacy "starter").
export const clubPlan = pgEnum("club_plan", ["trial", "starter", "core", "pro", "elite", "enterprise"]);
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
  // Branding + locale (set during onboarding, editable in club settings)
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#1B3A2D"),
  accentColor: text("accent_color").notNull().default("#C9A84C"),
  currency: text("currency").notNull().default("USD"),
  countryCode: text("country_code").notNull().default("US"),
  phone: text("phone"),
  address: text("address"),
  // Public review destination (e.g. the club's Google review URL). When set,
  // delivered F&B orders trigger a throttled review-request email (lib/reviews.ts).
  reviewLink: text("review_link"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingStep: text("onboarding_step"), // last completed wizard step (1-6)
  ...timestamps,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubs.$inferSelect;
