// Stripe payments via the REST API + manual webhook signature verification.
// No SDK dependency: Checkout Sessions are created with a form-encoded POST and
// webhook signatures are verified with an HMAC-SHA256 over the raw body, exactly
// as the Stripe SDK does. Disabled (errors / no-ops) without STRIPE_SECRET_KEY.

import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "./logger";

const STRIPE_API = "https://api.stripe.com/v1";

export function stripeEnabled(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

interface CheckoutInput {
  amount: number; // dollars
  description: string;
  customerEmail?: string;
  clubId: string;
  memberId: string;
  successUrl: string;
  cancelUrl: string;
}

interface StripeCheckoutSession {
  id: string;
  url: string;
}

export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<StripeCheckoutSession> {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is not configured.");

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  if (input.customerEmail) params.set("customer_email", input.customerEmail);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set(
    "line_items[0][price_data][unit_amount]",
    String(Math.round(input.amount * 100)),
  );
  params.set("line_items[0][price_data][product_data][name]", input.description);
  params.set("metadata[clubId]", input.clubId);
  params.set("metadata[memberId]", input.memberId);

  const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "stripe: create session failed");
    throw new Error("Could not start checkout.");
  }
  return (await res.json()) as StripeCheckoutSession;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

// Verifies the `Stripe-Signature` header against the raw request body using the
// webhook signing secret. Returns the parsed event, or null if verification
// fails (bad signature, stale timestamp, or no secret configured).
export function verifyWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): StripeEvent | null {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret || !signatureHeader) return null;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i), kv.slice(i + 1)];
    }),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return null;

  // Reject signatures older than 5 minutes (replay protection).
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return null;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody.toString("utf8")}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(rawBody.toString("utf8")) as StripeEvent;
  } catch {
    return null;
  }
}
