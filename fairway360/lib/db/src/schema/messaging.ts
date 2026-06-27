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
import { clubs } from "./clubs";
import { members, users } from "./users";
import { pk, timestamps } from "./_helpers";

export const conversationChannel = pgEnum("conversation_channel", [
  "concierge_chat",
  "voice",
  "sms",
]);
export const conversationStatus = pgEnum("conversation_status", [
  "open",
  "closed",
]);

export const conversations = pgTable("conversations", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  channel: conversationChannel("channel").notNull().default("concierge_chat"),
  status: conversationStatus("status").notNull().default("open"),
  ...timestamps,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export const messageRole = pgEnum("message_role", ["user", "assistant", "tool"]);

export const messages = pgTable("messages", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

/** Internal staff message: supervisor -> a staff member, seen in their portal. */
export const staffMessages = pgTable("staff_messages", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  recipientUserId: uuid("recipient_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  ...timestamps,
});

export type StaffMessage = typeof staffMessages.$inferSelect;

/** WhatsApp-style department channels (per club): General/Kitchen/Pro Shop/etc. */
export const chatChannels = pgTable("chat_channels", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  key: text("key").notNull(), // general | kitchen | pro_shop | reception | management
  name: text("name").notNull(),
  description: text("description"),
  emoji: text("emoji"),
  color: text("color"),
  department: text("department"), // routes to the dept agent / staff
  displayOrder: integer("display_order").notNull().default(0),
  visibleToMembers: boolean("visible_to_members").notNull().default(true),
  ...timestamps,
});

export type ChatChannel = typeof chatChannels.$inferSelect;

/** A message posted in a department channel by a member, staffer, or AI agent. */
export const chatMessages = pgTable("chat_messages", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id")
    .notNull()
    .references(() => chatChannels.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  senderName: text("sender_name").notNull(),
  senderRole: text("sender_role"), // member | employee | supervisor | agent
  aiGenerated: boolean("ai_generated").notNull().default(false),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

/** An escalation raised from a channel conversation, for staff/supervisor. */
export const escalations = pgTable("escalations", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  channelId: uuid("channel_id").references(() => chatChannels.id, {
    onDelete: "set null",
  }),
  memberUserId: uuid("member_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  memberName: text("member_name").notNull(),
  level: integer("level").notNull(), // 1 | 2 | 3
  triggerType: text("trigger_type"),
  triggerKeywords: jsonb("trigger_keywords"),
  contextSummary: text("context_summary"),
  agentLastMessage: text("agent_last_message"),
  status: text("status").notNull().default("open"), // open | resolved
  resolvedBy: uuid("resolved_by").references(() => users.id, {
    onDelete: "set null",
  }),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});

export type Escalation = typeof escalations.$inferSelect;
