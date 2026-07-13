// Lets the Kitchen AI actually PLACE a real order (not just talk about it).
// Matches the member's requested items to the club's menu, creates the order +
// lines in the DB (placed by the agent), and returns a structured result the
// agent turns into a confirmation. Never invents items or prices.

import { and, desc, eq } from "drizzle-orm";
import {
  db,
  members,
  menuItems,
  orders,
  orderLines,
  rounds,
} from "@workspace/db";
import { publishOrderEvent } from "./realtime";
import { logger } from "./logger";

export type OrderRequestItem = { name: string; quantity: number };

export type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      location: string | null;
      items: { name: string; quantity: number; price: number }[];
      total: number;
      etaMinutes: number;
    }
  | { ok: false; reason: string; unmatched?: string[] };

/** Match a free-text item name to a real menu item (exact → contains → word overlap). */
function matchMenuItem<T extends { name: string }>(query: string, menu: T[]): T | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // exact
  let hit = menu.find((m) => m.name.toLowerCase() === q);
  if (hit) return hit;
  // query contained in item name or vice-versa
  hit = menu.find((m) => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase()));
  if (hit) return hit;
  // best word-overlap
  const qWords = new Set(q.split(/\s+/).filter((w) => w.length > 2));
  let best: T | null = null;
  let bestScore = 0;
  for (const m of menu) {
    const words = m.name.toLowerCase().split(/\s+/);
    const score = words.filter((w) => qWords.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return bestScore > 0 ? best : null;
}

export async function placeAgentOrder(opts: {
  clubId: string;
  memberUserId: string;
  items: OrderRequestItem[];
  location?: string | null;
}): Promise<PlaceOrderResult> {
  try {
    if (!opts.items?.length) return { ok: false, reason: "No items were provided." };

    const [member] = await db
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.clubId, opts.clubId), eq(members.userId, opts.memberUserId)));
    if (!member) return { ok: false, reason: "Member profile not found." };

    const menu = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.clubId, opts.clubId),
          eq(menuItems.available, true),
          eq(menuItems.archived, false),
        ),
      );

    const matched: { item: (typeof menu)[number]; qty: number }[] = [];
    const unmatched: string[] = [];
    for (const req of opts.items) {
      const qty = Math.max(1, Math.min(20, Math.floor(req.quantity || 1)));
      const item = matchMenuItem(req.name, menu);
      if (item) matched.push({ item, qty });
      else unmatched.push(req.name);
    }
    if (unmatched.length) {
      return {
        ok: false,
        reason: `These aren't on the menu: ${unmatched.join(", ")}.`,
        unmatched,
      };
    }

    // Attach the member's live round (cart/hole) if they have one.
    const [round] = await db
      .select()
      .from(rounds)
      .where(and(eq(rounds.clubId, opts.clubId), eq(rounds.memberId, member.id)))
      .orderBy(desc(rounds.startedAt))
      .limit(1);

    let total = 0;
    for (const m of matched) total += Number(m.item.price) * m.qty;
    const maxPrep = Math.max(...matched.map((m) => m.item.prepTimeMinutes ?? 15));

    const [order] = await db
      .insert(orders)
      .values({
        clubId: opts.clubId,
        memberId: member.id,
        roundId: round?.id ?? null,
        hole: round?.currentHole ?? null,
        cartId: round?.cartId ?? null,
        note: opts.location ? `Deliver to: ${opts.location}` : "",
        status: "New",
        placedBy: null, // null = placed by the AI agent
        total: total.toFixed(2),
      })
      .returning({ id: orders.id });

    await db.insert(orderLines).values(
      matched.map((m) => ({
        clubId: opts.clubId,
        orderId: order.id,
        menuItemId: m.item.id,
        nameSnapshot: m.item.name,
        priceSnapshot: m.item.price,
        qty: m.qty,
      })),
    );

    // Surface it on the F&B board in real time.
    publishOrderEvent(opts.clubId, { type: "order.created", orderId: order.id });

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      location: opts.location ?? null,
      items: matched.map((m) => ({ name: m.item.name, quantity: m.qty, price: Number(m.item.price) })),
      total: Math.round(total * 100) / 100,
      etaMinutes: maxPrep,
    };
  } catch (err) {
    logger.error({ err }, "agent-order: failed to place order");
    return { ok: false, reason: "Something went wrong placing the order." };
  }
}
