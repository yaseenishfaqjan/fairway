import {
  boolean,
  integer,
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
import { carts, rounds } from "./golf";
import { pk, timestamps } from "./_helpers";

export const menuCategory = pgEnum("menu_category", ["Drinks", "Food", "Snacks"]);

export const menuItems = pgTable("menu_items", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: menuCategory("category").notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  ...timestamps,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export const orderStatus = pgEnum("order_status", [
  "New",
  "Preparing",
  "Ready",
  "Delivered",
]);

export const orders = pgTable("orders", {
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
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
  status: orderStatus("status").notNull().default("New"),
  placedBy: uuid("placed_by"),
  placedAt: timestamp("placed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  ...timestamps,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const orderLines = pgTable("order_lines", {
  id: pk(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => clubs.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id, {
    onDelete: "set null",
  }),
  nameSnapshot: text("name_snapshot").notNull(),
  priceSnapshot: numeric("price_snapshot", { precision: 10, scale: 2 }).notNull(),
  qty: integer("qty").notNull().default(1),
  ...timestamps,
});

export const insertOrderLineSchema = createInsertSchema(orderLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrderLine = z.infer<typeof insertOrderLineSchema>;
export type OrderLine = typeof orderLines.$inferSelect;
