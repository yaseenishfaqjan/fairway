import {
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { members } from "./users";
import { pk, timestamps } from "./_helpers";

export const cartStatus = pgEnum("cart_status", [
  "available",
  "in_use",
  "charging",
  "low_battery",
]);

export const carts = pgTable("carts", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  cartNumber: text("cart_number").notNull(),
  status: cartStatus("status").notNull().default("available"),
  ...timestamps,
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof carts.$inferSelect;

export const teeTimeStatus = pgEnum("tee_time_status", [
  "pending",
  "confirmed",
  "checked_in",
  "cancelled",
  "blocked",
]);

export const teeTimes = pgTable("tee_times", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  // null = an open, bookable slot
  memberId: uuid("member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  players: smallint("players").notNull().default(1),
  maxPlayers: smallint("max_players").notNull().default(4),
  holes: smallint("holes").notNull().default(18),
  status: teeTimeStatus("status").notNull().default("pending"),
  notes: text("notes"), // block reason, starter notes
  ...timestamps,
});

export const insertTeeTimeSchema = createInsertSchema(teeTimes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTeeTime = z.infer<typeof insertTeeTimeSchema>;
export type TeeTime = typeof teeTimes.$inferSelect;

export const roundStatus = pgEnum("round_status", [
  "Playing",
  "Needs Assistance",
  "Cart Request",
  "Food Order",
]);
export const roundPace = pgEnum("round_pace", ["On pace", "Slow play", "Ahead"]);

/** A live, on-course round (drives the supervisor course map). */
export const rounds = pgTable("rounds", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  teeTimeId: uuid("tee_time_id").references(() => teeTimes.id, {
    onDelete: "set null",
  }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "set null" }),
  currentHole: smallint("current_hole").notNull().default(1),
  status: roundStatus("status").notNull().default("Playing"),
  pace: roundPace("pace").notNull().default("On pace"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  mapX: numeric("map_x", { precision: 5, scale: 2 }),
  mapY: numeric("map_y", { precision: 5, scale: 2 }),
  ...timestamps,
});

export const insertRoundSchema = createInsertSchema(rounds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRound = z.infer<typeof insertRoundSchema>;
export type Round = typeof rounds.$inferSelect;

export const requestType = pgEnum("request_type", [
  "Beverage",
  "Food",
  "Cart",
  "Assistance",
]);
export const requestPriority = pgEnum("request_priority", ["Normal", "High"]);
export const requestStatus = pgEnum("request_status", ["open", "resolved"]);

export const memberRequests = pgTable("member_requests", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  roundId: uuid("round_id").references(() => rounds.id, {
    onDelete: "set null",
  }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  hole: smallint("hole"),
  request: text("request").notNull(),
  type: requestType("type").notNull(),
  priority: requestPriority("priority").notNull().default("Normal"),
  status: requestStatus("status").notNull().default("open"),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});

export const insertMemberRequestSchema = createInsertSchema(memberRequests).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
  },
);
export type InsertMemberRequest = z.infer<typeof insertMemberRequestSchema>;
export type MemberRequest = typeof memberRequests.$inferSelect;
