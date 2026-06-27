import {
  integer,
  pgEnum,
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

export const leadStatus = pgEnum("lead_status", [
  "New",
  "Contacted",
  "Tour Booked",
  "Won",
  "Lost",
]);

export const leads = pgTable("leads", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  source: text("source"),
  interest: text("interest"),
  status: leadStatus("status").notNull().default("New"),
  businessType: text("business_type"),
  problem: text("problem"),
  volume: text("volume"),
  ...timestamps,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

/** Public demo-request form payload (no club_id — routed by the platform). */
export const demoRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  businessType: z.string().optional(),
  problem: z.string().optional(),
  volume: z.string().optional(),
});
export type DemoRequest = z.infer<typeof demoRequestSchema>;

export const eventTag = pgEnum("event_tag", [
  "Tournament",
  "Dining",
  "Clinic",
  "Social",
  "League",
]);

export const events = pgTable("events", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  tag: eventTag("tag").notNull().default("Social"),
  capacity: integer("capacity"),
  spotsTaken: integer("spots_taken").notNull().default(0),
  ...timestamps,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const rsvpStatus = pgEnum("rsvp_status", [
  "registered",
  "waitlist",
  "cancelled",
]);

export const eventRsvps = pgTable("event_rsvps", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  status: rsvpStatus("status").notNull().default("registered"),
  partySize: integer("party_size").notNull().default(1),
  ...timestamps,
});

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;

export const announcementAudience = pgEnum("announcement_audience", [
  "members",
  "staff",
  "all",
]);

export const announcements = pgTable("announcements", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  tag: text("tag"),
  title: text("title").notNull(),
  body: text("body"),
  audience: announcementAudience("audience").notNull().default("all"),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  ...timestamps,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
