import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db,
  members,
  users,
  memberPayments,
  menuItems,
  events,
  eventRsvps,
  teeTimes,
  rounds,
  orders,
  orderLines,
  announcements,
} from "@workspace/db";
import {
  RsvpEventBody,
  BookTeeTimeBody,
  CreateOrderBody,
  ListTeeTimesQueryParams,
} from "@workspace/api-zod";
import { asyncHandler, badRequest, forbidden, notFound } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";
import { memberIdFor } from "../lib/identity";
import { loadOrders } from "../lib/orders";
import { publishOrderEvent } from "../lib/realtime";
import { sendOrderConfirmation } from "../lib/email";
import { stripeEnabled, createCheckoutSession } from "../lib/stripe";
import {
  toMemberAccount,
  toPayment,
  toMenuItem,
  toClubEvent,
  toAnnouncement,
  toTeeTime,
  teeTimeUpcoming,
} from "../lib/serializers";

const router: IRouter = Router();
const member = [requireAuth, requireRole("member")];

async function memberAndUser(userId: string, clubId: string) {
  const [row] = await db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(members.userId, users.id))
    .where(and(eq(members.userId, userId), eq(members.clubId, clubId)));
  if (!row) throw badRequest("No member profile for this user.");
  return row;
}

router.get(
  "/me/dashboard",
  ...member,
  asyncHandler(async (req, res) => {
    const { userId, clubId } = req.auth!;
    const { member, user } = await memberAndUser(userId, clubId);

    const [myTeeTimes, anns, evts] = await Promise.all([
      db
        .select()
        .from(teeTimes)
        .where(and(eq(teeTimes.clubId, clubId), eq(teeTimes.memberId, member.id)))
        .orderBy(asc(teeTimes.startsAt))
        .limit(5),
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
        .limit(8),
      db
        .select()
        .from(events)
        .where(eq(events.clubId, clubId))
        .orderBy(asc(events.startsAt)),
    ]);

    res.json({
      account: toMemberAccount(member, user),
      upcoming: myTeeTimes.map(teeTimeUpcoming),
      announcements: anns.map(toAnnouncement),
      events: evts.map(toClubEvent),
    });
  }),
);

router.get(
  "/me/account",
  ...member,
  asyncHandler(async (req, res) => {
    const { userId, clubId } = req.auth!;
    const { member, user } = await memberAndUser(userId, clubId);
    res.json(toMemberAccount(member, user));
  }),
);

router.get(
  "/me/payments",
  ...member,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const memberId = await memberIdFor(req.auth!);
    const rows = await db
      .select()
      .from(memberPayments)
      .where(
        and(eq(memberPayments.clubId, clubId), eq(memberPayments.memberId, memberId)),
      )
      .orderBy(desc(memberPayments.chargedAt));
    res.json(rows.map(toPayment));
  }),
);

// Start a Stripe Checkout session to settle the member's outstanding balance.
// Returns the hosted checkout URL the client redirects to. The balance is
// reconciled by the webhook on checkout.session.completed, never here.
router.post(
  "/payments/checkout",
  ...member,
  asyncHandler(async (req, res) => {
    if (!stripeEnabled()) throw badRequest("Online payments are not available.");
    const { userId, clubId } = req.auth!;
    const { member, user } = await memberAndUser(userId, clubId);

    const balance = Number(member.balance);
    if (!(balance > 0)) throw badRequest("No outstanding balance to pay.");

    const origin = req.get("origin") ?? process.env["APP_URL"] ?? "";
    const session = await createCheckoutSession({
      amount: balance,
      description: "Account balance payment",
      customerEmail: user.email,
      clubId,
      memberId: member.id,
      successUrl: `${origin}/portal/member?payment=success`,
      cancelUrl: `${origin}/portal/member?payment=cancelled`,
    });

    res.json({ url: session.url });
  }),
);

router.get(
  "/menu",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.clubId, clubId), eq(menuItems.available, true)))
      .orderBy(asc(menuItems.category), asc(menuItems.name));
    res.json(rows.map(toMenuItem));
  }),
);

// Club events are visible to any authenticated club user (members + staff).
router.get(
  "/events",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(events)
      .where(eq(events.clubId, clubId))
      .orderBy(asc(events.startsAt));
    res.json(rows.map(toClubEvent));
  }),
);

router.post(
  "/events/:id/rsvp",
  ...member,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const memberId = await memberIdFor(req.auth!);
    const { partySize } = RsvpEventBody.parse(req.body);
    const eventId = req.params.id;

    const [evt] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.clubId, clubId)));
    if (!evt) throw notFound("Event not found.");

    await db.insert(eventRsvps).values({
      clubId,
      eventId,
      memberId,
      partySize,
      status: "registered",
    });
    await db
      .update(events)
      .set({ spotsTaken: sql`${events.spotsTaken} + ${partySize}` })
      .where(and(eq(events.id, eventId), eq(events.clubId, clubId)));

    res.json({ ok: true });
  }),
);

router.get(
  "/tee-times",
  ...member,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const { open } = ListTeeTimesQueryParams.parse(req.query);

    if (open) {
      const rows = await db
        .select()
        .from(teeTimes)
        .where(and(eq(teeTimes.clubId, clubId), isNull(teeTimes.memberId)))
        .orderBy(asc(teeTimes.startsAt));
      res.json(rows.map((t) => toTeeTime(t)));
      return;
    }

    const rows = await db
      .select({ tee: teeTimes, memberName: users.name })
      .from(teeTimes)
      .leftJoin(members, eq(teeTimes.memberId, members.id))
      .leftJoin(users, eq(members.userId, users.id))
      .where(eq(teeTimes.clubId, clubId))
      .orderBy(asc(teeTimes.startsAt));
    res.json(rows.map((r) => toTeeTime(r.tee, r.memberName)));
  }),
);

router.post(
  "/tee-times",
  ...member,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const memberId = await memberIdFor(req.auth!);
    const body = BookTeeTimeBody.parse(req.body);

    const [row] = await db
      .insert(teeTimes)
      .values({
        clubId,
        memberId,
        startsAt: new Date(body.startsAt),
        players: body.players,
        holes: body.holes,
        status: "confirmed",
      })
      .returning();

    const [me] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.auth!.userId));

    res.status(201).json(toTeeTime(row, me?.name));
  }),
);

router.get(
  "/me/tee-times",
  ...member,
  asyncHandler(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const memberId = await memberIdFor(req.auth!);
    const [me] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));
    const rows = await db
      .select()
      .from(teeTimes)
      .where(and(eq(teeTimes.clubId, clubId), eq(teeTimes.memberId, memberId)))
      .orderBy(asc(teeTimes.startsAt));
    res.json(rows.map((t) => toTeeTime(t, me?.name)));
  }),
);

router.delete(
  "/tee-times/:id",
  ...member,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const memberId = await memberIdFor(req.auth!);
    const result = await db
      .update(teeTimes)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(teeTimes.id, req.params.id),
          eq(teeTimes.clubId, clubId),
          eq(teeTimes.memberId, memberId),
        ),
      )
      .returning({ id: teeTimes.id });
    if (result.length === 0) throw notFound("Tee time not found.");
    res.json({ ok: true });
  }),
);

router.post(
  "/orders",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { clubId, role } = req.auth!;
    const body = CreateOrderBody.parse(req.body);
    if (body.lines.length === 0) throw badRequest("Order must have at least one line.");

    // Two paths share this endpoint:
    //  - A member ordering for themselves (no groupId) — identity from session.
    //  - Staff taking an order for a group on the course (groupId = round id).
    let memberId: string;
    let round:
      | { id: string; currentHole: number; cartId: string | null }
      | undefined;

    if (body.groupId) {
      if (role === "member") throw forbidden("Members can only order for themselves.");
      const [r] = await db
        .select()
        .from(rounds)
        .where(and(eq(rounds.clubId, clubId), eq(rounds.id, body.groupId)));
      if (!r) throw notFound("Group not found.");
      round = r;
      memberId = r.memberId;
    } else {
      if (role !== "member") throw badRequest("Staff orders require a group.");
      memberId = await memberIdFor(req.auth!);
      // A member's live round (if any) supplies the cart + hole context the F&B
      // board shows; an order can still be placed from the clubhouse without one.
      [round] = await db
        .select()
        .from(rounds)
        .where(and(eq(rounds.clubId, clubId), eq(rounds.memberId, memberId)))
        .orderBy(desc(rounds.startedAt))
        .limit(1);
    }

    const itemIds = body.lines.map((l) => l.itemId);
    const menu = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.clubId, clubId), inArray(menuItems.id, itemIds)));
    const menuById = new Map(menu.map((m) => [m.id, m]));

    let total = 0;
    const lineValues = body.lines.map((l) => {
      const item = menuById.get(l.itemId);
      if (!item) throw badRequest(`Unknown menu item: ${l.itemId}`);
      total += Number(item.price) * l.qty;
      return {
        clubId,
        menuItemId: item.id,
        nameSnapshot: item.name,
        priceSnapshot: item.price,
        qty: l.qty,
      };
    });

    const [order] = await db
      .insert(orders)
      .values({
        clubId,
        memberId,
        roundId: round?.id ?? null,
        hole: body.hole ?? round?.currentHole ?? null,
        cartId: round?.cartId ?? null,
        note: body.note ?? "",
        status: "New",
        placedBy: req.auth!.userId,
        total: total.toFixed(2),
      })
      .returning();

    await db
      .insert(orderLines)
      .values(lineValues.map((v) => ({ ...v, orderId: order.id })));

    publishOrderEvent(clubId, { type: "order.created", orderId: order.id });

    const list = await loadOrders(clubId, eq(orders.id, order.id));

    // Fire-and-forget order confirmation to the member (no-op without Resend).
    const [recipient] = await db
      .select({ email: users.email, name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(eq(members.id, memberId), eq(members.clubId, clubId)));
    if (recipient?.email) {
      void sendOrderConfirmation({
        to: recipient.email,
        memberName: recipient.name,
        total,
        hole: order.hole,
        lines: lineValues.map((v) => ({ qty: v.qty, name: v.nameSnapshot })),
      });
    }

    res.status(201).json(list[0]);
  }),
);

router.get(
  "/me/orders",
  ...member,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const memberId = await memberIdFor(req.auth!);
    const list = await loadOrders(clubId, eq(orders.memberId, memberId));
    res.json(list);
  }),
);

// Announcements are visible to any authenticated club user; the audience filter
// narrows by role (members see member/all; staff see staff/all).
router.get(
  "/announcements",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { clubId, role } = req.auth!;
    const audiences: ("members" | "staff" | "all")[] =
      role === "member" ? ["members", "all"] : ["staff", "all"];
    const rows = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.clubId, clubId),
          inArray(announcements.audience, audiences),
        ),
      )
      .orderBy(desc(announcements.publishedAt));
    res.json(rows.map(toAnnouncement));
  }),
);

export default router;
