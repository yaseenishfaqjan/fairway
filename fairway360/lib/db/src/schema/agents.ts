import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { chatChannels } from "./messaging";
import { users } from "./users";
import { pk, timestamps } from "./_helpers";

/**
 * Per-club configuration for each AI agent (kitchen, pro_shop, reception,
 * general, management, concierge). Supervisors can rename agents, set tone,
 * greeting, working hours, and extra escalation keywords.
 */
export const agentConfigs = pgTable(
  "agent_configs",
  {
    id: pk(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    agentKey: text("agent_key").notNull(), // kitchen | pro_shop | reception | general | management | concierge
    name: text("name").notNull(),
    greetingMessage: text("greeting_message"),
    tone: text("tone").notNull().default("friendly"), // formal | friendly | casual
    customSystemPrompt: text("custom_system_prompt"), // appended to the base prompt
    escalationKeywords: jsonb("escalation_keywords").notNull().default([]), // club-specific L2 triggers
    workingHoursStart: text("working_hours_start"), // "23:00" — null = always on
    workingHoursEnd: text("working_hours_end"), // "07:00"
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [unique("agent_configs_club_key_unique").on(t.clubId, t.agentKey)],
);

export const insertAgentConfigSchema = createInsertSchema(agentConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAgentConfig = z.infer<typeof insertAgentConfigSchema>;
export type AgentConfig = typeof agentConfigs.$inferSelect;

/**
 * One row per AI agent session (a burst of agent activity with one member in
 * one channel). Source data for learnFromSession() and agent stats.
 */
export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: pk(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    agentKey: text("agent_key").notNull(),
    channelId: uuid("channel_id").references(() => chatChannels.id, {
      onDelete: "set null",
    }),
    memberUserId: uuid("member_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    messageCount: integer("message_count").notNull().default(0),
    escalated: boolean("escalated").notNull().default(false),
    escalationLevel: integer("escalation_level"),
    ordersPlaced: integer("orders_placed").notNull().default(0),
    bookingsMade: integer("bookings_made").notNull().default(0),
    summary: text("summary"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("agent_sessions_club_agent_idx").on(t.clubId, t.agentKey)],
);

export type AgentSession = typeof agentSessions.$inferSelect;
