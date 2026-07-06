import { boolean, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubs } from "./clubs";
import { users } from "./users";
import { pk, timestamps } from "./_helpers";

/**
 * Club knowledge base — hours, policies, dress code, facilities, FAQs, events.
 * Injected into every AI agent prompt (semantic memory); changes take effect
 * on the next agent reply with no restart.
 */
export const knowledgeBase = pgTable(
  "knowledge_base",
  {
    id: pk(),
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // hours | policies | dress_code | events | facilities | faq | pricing
    title: text("title").notNull(),
    content: text("content").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("knowledge_base_club_idx").on(t.clubId, t.category)],
);

export const insertKnowledgeSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKnowledge = z.infer<typeof insertKnowledgeSchema>;
export type KnowledgeEntry = typeof knowledgeBase.$inferSelect;
