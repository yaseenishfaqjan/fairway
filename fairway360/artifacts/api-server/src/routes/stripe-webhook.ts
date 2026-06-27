// Stripe webhook. Mounted BEFORE express.json() so the raw body is available
// for signature verification (Stripe signs the exact bytes it sent). On a
// completed checkout we record the payment and reduce the member's balance.

import { Router, type IRouter, raw } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, memberPayments, members } from "@workspace/db";
import { verifyWebhook } from "../lib/stripe";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post(
  "/api/stripe/webhook",
  raw({ type: "application/json" }),
  async (req, res) => {
    const event = verifyWebhook(
      req.body as Buffer,
      req.get("stripe-signature"),
    );
    if (!event) {
      res.status(400).json({ error: "Invalid signature." });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        payment_intent?: string;
        amount_total?: number;
        metadata?: { clubId?: string; memberId?: string };
      };
      const clubId = session.metadata?.clubId;
      const memberId = session.metadata?.memberId;
      const amount = (session.amount_total ?? 0) / 100;

      if (clubId && memberId && amount > 0) {
        try {
          await db.transaction(async (tx) => {
            // Idempotency: skip if we've already recorded this payment intent.
            if (session.payment_intent) {
              const [existing] = await tx
                .select({ id: memberPayments.id })
                .from(memberPayments)
                .where(
                  eq(
                    memberPayments.stripePaymentIntentId,
                    session.payment_intent,
                  ),
                );
              if (existing) return;
            }

            await tx.insert(memberPayments).values({
              clubId,
              memberId,
              label: "Account balance payment",
              amount: amount.toFixed(2),
              category: "Payment",
              stripePaymentIntentId: session.payment_intent ?? null,
            });

            await tx
              .update(members)
              .set({
                balance: sql`GREATEST(${members.balance} - ${amount.toFixed(2)}, 0)`,
              })
              .where(
                and(eq(members.id, memberId), eq(members.clubId, clubId)),
              );
          });
        } catch (err) {
          logger.error({ err }, "stripe: webhook processing failed");
          res.status(500).json({ error: "Processing failed." });
          return;
        }
      }
    }

    res.json({ received: true });
  },
);

export default router;
