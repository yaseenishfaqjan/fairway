import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, orders, members, users } from "@workspace/db";
import { ListOrdersQueryParams, AdvanceOrderStatusBody } from "@workspace/api-zod";
import { asyncHandler, notFound } from "../lib/http";
import { requireAuth, requireStaff } from "../middleware/auth";
import { loadOrders, loadOrder } from "../lib/orders";
import { publishOrderEvent } from "../lib/realtime";
import { sendSms } from "../lib/sms";
import { notify } from "../lib/notify";

const router: IRouter = Router();
const staff = [requireAuth, requireStaff];

router.get(
  "/orders",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const { status } = ListOrdersQueryParams.parse(req.query);
    const list = await loadOrders(
      clubId,
      status ? eq(orders.status, status) : undefined,
    );
    res.json(list);
  }),
);

router.patch(
  "/orders/:id/status",
  ...staff,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const { status } = AdvanceOrderStatusBody.parse(req.body);

    const updated = await db
      .update(orders)
      .set({ status })
      .where(and(eq(orders.id, req.params.id), eq(orders.clubId, clubId)))
      .returning({ id: orders.id, memberId: orders.memberId, hole: orders.hole });
    if (updated.length === 0) throw notFound("Order not found.");

    publishOrderEvent(clubId, { type: "order.updated", orderId: req.params.id });

    // Fire-and-forget SMS to the member when their order is on the way / arrived.
    if (status === "Ready" || status === "Delivered") {
      const [recipient] = await db
        .select({ userId: users.id, phone: users.phone, name: users.name })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(and(eq(members.id, updated[0].memberId), eq(members.clubId, clubId)));
      if (recipient) {
        const first = recipient.name.split(" ")[0];
        const hole = updated[0].hole;
        const body =
          status === "Ready"
            ? `Hi ${first}, your Fairway360 order is ready and the cart team is on the way${hole ? ` to Hole ${hole}` : ""}.`
            : `Hi ${first}, your Fairway360 order has been delivered. Enjoy your round!`;
        if (recipient.phone) void sendSms(recipient.phone, body);
        void notify({
          clubId,
          userId: recipient.userId,
          type: "order",
          title: status === "Ready" ? "Your order is ready" : "Order delivered",
          body,
          link: "/portal/members",
        });
      }
    }

    const order = await loadOrder(clubId, req.params.id);
    res.json(order);
  }),
);

export default router;
