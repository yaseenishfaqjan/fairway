// Outbound sales CRM (platform-level, super-admin only) — Fairway360's own
// prospecting database for the nationwide golf-club calling campaign. These
// tables have NO club_id: prospects are clubs we are SELLING to, not tenants.
//
// Pipeline (13 stages), qualification scorecard, call log, and follow-up /
// demo scheduling all come from the sales playbook.

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pk, timestamps } from "./_helpers";

/** The 13-stage outbound pipeline, in funnel order. */
export const prospectStage = pgEnum("prospect_stage", [
  "New Lead",
  "Attempted",
  "Gatekeeper",
  "DM Identified",
  "Connected",
  "Qualified",
  "Demo Booked",
  "Follow-Up",
  "Demo Completed",
  "Proposal",
  "Closed Won",
  "Closed Lost",
  "Do Not Call",
]);

/** Priority segments: A private · B resort · C multi-course · D premium public · E municipal/small. */
export const prospectSegment = pgEnum("prospect_segment", ["A", "B", "C", "D", "E"]);

export const prospects = pgTable("prospects", {
  id: pk(),
  // ── Club information ──────────────────────────────────────────────────────
  clubName: text("club_name").notNull(),
  website: text("website"),
  mainPhone: text("main_phone"),
  city: text("city"),
  state: text("state"), // 2-letter US state
  timezone: text("timezone"), // ET | CT | MT | PT (calling windows)
  clubType: text("club_type"), // private / resort / multi-course / semi-private / public / municipal
  coursesCount: integer("courses_count"),
  membershipSize: text("membership_size"), // free text: "~650", "unknown"
  segment: prospectSegment("segment").notNull().default("D"),
  // ── Decision maker ────────────────────────────────────────────────────────
  publicEmail: text("public_email"), // the club's general/public email (info@, proshop@)
  dmName: text("dm_name"),
  dmTitle: text("dm_title"),
  dmPhone: text("dm_phone"),
  dmEmail: text("dm_email"),
  // ── Operational intelligence ──────────────────────────────────────────────
  currentTeeSoftware: text("current_tee_software"),
  currentClubSoftware: text("current_club_software"),
  hasDining: boolean("has_dining").notNull().default(false),
  hasEvents: boolean("has_events").notNull().default(false),
  hasMembershipProgram: boolean("has_membership_program").notNull().default(false),
  hasTournaments: boolean("has_tournaments").notNull().default(false),
  phoneProcess: text("phone_process"), // how calls are handled today
  // ── Sales information ─────────────────────────────────────────────────────
  stage: prospectStage("stage").notNull().default("New Lead"),
  painPrimary: text("pain_primary"),
  painSecondary: text("pain_secondary"),
  objections: text("objections"),
  otherStakeholders: text("other_stakeholders"),
  notes: text("notes"),
  // Qualification scorecard: which of the 12 playbook signals apply (+2 each).
  scoreSignals: jsonb("score_signals").notNull().default([]), // string[]
  score: integer("score").notNull().default(0),
  // Scheduling
  lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
  nextFollowupAt: timestamp("next_followup_at", { withTimezone: true }),
  demoAt: timestamp("demo_at", { withTimezone: true }),
  assignedCloser: text("assigned_closer").notNull().default("Brady"),
  ...timestamps,
});

export const insertProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;

/** Outcome of a single dial — feeds the daily KPI scorecard. */
export const callOutcome = pgEnum("call_outcome", [
  "No Answer",
  "Voicemail",
  "Gatekeeper",
  "DM Conversation",
  "Qualified",
  "Demo Booked",
  "Callback Scheduled",
  "Not Interested",
  "Do Not Call",
]);

export const prospectCalls = pgTable("prospect_calls", {
  id: pk(),
  prospectId: uuid("prospect_id")
    .notNull()
    .references(() => prospects.id, { onDelete: "cascade" }),
  calledAt: timestamp("called_at", { withTimezone: true }).defaultNow().notNull(),
  outcome: callOutcome("outcome").notNull(),
  callerName: text("caller_name"),
  notes: text("notes"),
  ...timestamps,
});

export const insertProspectCallSchema = createInsertSchema(prospectCalls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProspectCall = z.infer<typeof insertProspectCallSchema>;
export type ProspectCall = typeof prospectCalls.$inferSelect;
