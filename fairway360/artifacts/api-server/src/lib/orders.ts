// Shared order loader: assembles Order DTOs (member name, cart number, lines)
// for a club. Used by both the member portal (own orders) and the F&B board.

import { and, desc, eq, inArray, type SQL } from "drizzle-orm";
import {
  db,
  orders,
  orderLines,
  members,
  users,
  carts,
} from "@workspace/db";
import type { Order } from "@workspace/api-zod";
import { toOrder } from "./serializers";

type OrderLineRow = typeof orderLines.$inferSelect;

export async function loadOrders(clubId: string, extra?: SQL): Promise<Order[]> {
  const where = extra
    ? and(eq(orders.clubId, clubId), extra)
    : eq(orders.clubId, clubId);

  const rows = await db
    .select({ order: orders, memberName: users.name, cartNumber: carts.cartNumber })
    .from(orders)
    .innerJoin(members, eq(orders.memberId, members.id))
    .innerJoin(users, eq(members.userId, users.id))
    .leftJoin(carts, eq(orders.cartId, carts.id))
    .where(where)
    .orderBy(desc(orders.placedAt));

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.order.id);
  const lines = await db
    .select()
    .from(orderLines)
    .where(and(eq(orderLines.clubId, clubId), inArray(orderLines.orderId, ids)));

  const byOrder = new Map<string, OrderLineRow[]>();
  for (const l of lines) {
    const arr = byOrder.get(l.orderId) ?? [];
    arr.push(l);
    byOrder.set(l.orderId, arr);
  }

  return rows.map((r) =>
    toOrder(r.order, {
      member: r.memberName,
      cartNumber: r.cartNumber,
      lines: byOrder.get(r.order.id) ?? [],
    }),
  );
}

export async function loadOrder(
  clubId: string,
  orderId: string,
): Promise<Order | null> {
  const list = await loadOrders(clubId, eq(orders.id, orderId));
  return list[0] ?? null;
}
