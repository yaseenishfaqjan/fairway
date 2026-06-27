import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { members } from "./users";
import { pk, timestamps } from "./_helpers";

export const memberPayments = pgTable("member_payments", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  chargedAt: timestamp("charged_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  category: text("category"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  ...timestamps,
});

export const insertMemberPaymentSchema = createInsertSchema(
  memberPayments,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMemberPayment = z.infer<typeof insertMemberPaymentSchema>;
export type MemberPayment = typeof memberPayments.$inferSelect;
