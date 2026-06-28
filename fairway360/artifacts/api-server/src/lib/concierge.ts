// AI concierge for members. Grounds an LLM answer in the member's own club data
// (account, tee times, events, recent orders, announcements). Falls back to a
// deterministic reply when ANTHROPIC_API_KEY is not configured so the chat UI
// stays functional in the demo without a key.

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  members,
  users,
  teeTimes,
  events,
  orders,
  orderLines,
  announcements,
  menuItems,
} from "@workspace/db";
import { logger } from "./logger";
import { llmEnabled, llmComplete } from "./llm";

const num = (v: string | null | undefined): number => (v == null ? 0 : Number(v));

interface ConciergeAuth {
  userId: string;
  clubId: string;
}

const SYSTEM_PROMPT = `You are the Fairway360 AI concierge for a golf & country club member.
You help with tee times, on-course food & drink orders, club events, dining
reservations, and account questions. Be warm, concise, and specific — two or
three sentences at most. Use the member context provided to give grounded,
personal answers (refer to their real upcoming tee times, balance, events,
etc.). Never invent bookings, charges, or menu items that are not in the
context. If something requires an action you cannot take, tell the member which
section of the app to use (Book, Order, Events, Account). Prices are in USD.`;

async function buildMemberContext(auth: ConciergeAuth): Promise<string> {
  const { userId, clubId } = auth;

  const [row] = await db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.userId, userId), eq(members.clubId, clubId)));

  if (!row) return "The member profile could not be found.";
  const memberId = row.member.id;

  const [tees, evts, anns, menu, myOrders] = await Promise.all([
    db
      .select()
      .from(teeTimes)
      .where(and(eq(teeTimes.clubId, clubId), eq(teeTimes.memberId, memberId)))
      .orderBy(asc(teeTimes.startsAt))
      .limit(5),
    db
      .select()
      .from(events)
      .where(eq(events.clubId, clubId))
      .orderBy(asc(events.startsAt))
      .limit(6),
    db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.clubId, clubId),
          inArray(announcements.audience, ["members", "all"]),
        ),
      )
      .orderBy(desc(announcements.publishedAt))
      .limit(5),
    db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.clubId, clubId), eq(menuItems.available, true)))
      .orderBy(asc(menuItems.category), asc(menuItems.name)),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.clubId, clubId), eq(orders.memberId, memberId)))
      .orderBy(desc(orders.placedAt))
      .limit(5),
  ]);

  const orderIds = myOrders.map((o) => o.id);
  const lines = orderIds.length
    ? await db
        .select()
        .from(orderLines)
        .where(inArray(orderLines.orderId, orderIds))
    : [];
  const linesByOrder = new Map<string, typeof lines>();
  for (const l of lines) {
    const arr = linesByOrder.get(l.orderId) ?? [];
    arr.push(l);
    linesByOrder.set(l.orderId, arr);
  }

  const acct = row.member;
  const parts: string[] = [];

  parts.push(
    `MEMBER: ${row.user.name} · #${acct.memberNumber} · ${acct.tier} tier · ` +
      `account balance $${num(acct.balance).toFixed(2)} · ` +
      `handicap ${acct.handicap ?? "N/A"} · rounds this year ${acct.roundsThisYear}`,
  );

  parts.push(
    tees.length
      ? "UPCOMING TEE TIMES:\n" +
          tees
            .map(
              (t) =>
                `- ${t.startsAt.toISOString()} · ${t.players} players · ${t.holes} holes · ${t.status}`,
            )
            .join("\n")
      : "UPCOMING TEE TIMES: none booked.",
  );

  parts.push(
    evts.length
      ? "CLUB EVENTS:\n" +
          evts
            .map((e) => {
              const left =
                e.capacity == null
                  ? "open"
                  : Math.max(e.capacity - e.spotsTaken, 0) + " spots left";
              return `- ${e.title} (${e.tag}) · ${e.startsAt.toISOString()} · ${left}`;
            })
            .join("\n")
      : "CLUB EVENTS: none scheduled.",
  );

  parts.push(
    "MENU (name · $price · category):\n" +
      menu
        .map((m) => `- ${m.name} · $${num(m.price).toFixed(2)} · ${m.category}`)
        .join("\n"),
  );

  parts.push(
    myOrders.length
      ? "RECENT ORDERS:\n" +
          myOrders
            .map((o) => {
              const items = (linesByOrder.get(o.id) ?? [])
                .map((l) => `${l.qty}× ${l.nameSnapshot}`)
                .join(", ");
              return `- ${o.status} · $${num(o.total).toFixed(2)} · ${items || "no items"}`;
            })
            .join("\n")
      : "RECENT ORDERS: none.",
  );

  parts.push(
    anns.length
      ? "ANNOUNCEMENTS:\n" + anns.map((a) => `- ${a.title}`).join("\n")
      : "ANNOUNCEMENTS: none.",
  );

  return parts.join("\n\n");
}

function fallbackReply(message: string): string {
  const t = message.toLowerCase();
  if (t.includes("tee"))
    return "I can help with tee times — head to Book to reserve a slot, and I'll have it on the sheet right away.";
  if (
    t.includes("balance") ||
    t.includes("account") ||
    t.includes("statement") ||
    t.includes("owe")
  )
    return "You can review your balance and statements anytime under Account.";
  if (
    t.includes("menu") ||
    t.includes("food") ||
    t.includes("eat") ||
    t.includes("drink")
  )
    return "Tap Order Food and I'll have your selection delivered to your hole on the course.";
  if (t.includes("event") || t.includes("tournament"))
    return "Check Events to see what's coming up and RSVP — I'll save your spot.";
  return "I can help with tee times, on-course food orders, events, dining reservations, and your account. What would you like to do?";
}

export async function conciergeReply(
  auth: ConciergeAuth,
  message: string,
): Promise<string> {
  if (!llmEnabled()) return fallbackReply(message);

  let context: string;
  try {
    context = await buildMemberContext(auth);
  } catch (err) {
    logger.error({ err }, "concierge: failed to build member context");
    return fallbackReply(message);
  }

  const text = await llmComplete({
    system: `${SYSTEM_PROMPT}\n\n--- MEMBER CONTEXT ---\n${context}`,
    user: message,
    maxTokens: 400,
  });
  return text || fallbackReply(message);
}
