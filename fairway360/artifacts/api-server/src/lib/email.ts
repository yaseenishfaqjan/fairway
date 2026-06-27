// Transactional email via Resend's REST API. No-ops (returning false) when
// RESEND_API_KEY / EMAIL_FROM aren't configured, so the rest of the app keeps
// working in the demo without an email provider.

import { logger } from "./logger";

const RESEND_URL = "https://api.resend.com/emails";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export function emailEnabled(): boolean {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["EMAIL_FROM"]);
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (!apiKey || !from) {
    logger.debug("email: skipped (RESEND_API_KEY/EMAIL_FROM not configured)");
    return false;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "email: resend error");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "email: resend request failed");
    return false;
  }
}

function layout(title: string, body: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f1f17">
    <div style="background:linear-gradient(120deg,#0f3d28,#0a2b1c);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.7">Fairway360</div>
      <div style="font-size:22px;font-weight:600;margin-top:4px">${title}</div>
    </div>
    <div style="border:1px solid #e4e9e6;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;font-size:15px;line-height:1.55">
      ${body}
    </div>
  </div>`;
}

interface DemoRequestEmail {
  name: string;
  clubName?: string | null;
  email: string;
  phone?: string | null;
  businessType?: string | null;
  problem?: string | null;
  volume?: string | null;
}

// Confirmation to the prospect who submitted a demo request.
export async function sendDemoConfirmation(req: DemoRequestEmail): Promise<boolean> {
  return sendEmail({
    to: req.email,
    subject: "Your Fairway360 demo request",
    html: layout(
      "Thanks for reaching out!",
      `<p>Hi ${req.name},</p>
       <p>We received your request for a Fairway360 demo${
         req.clubName ? ` for <strong>${req.clubName}</strong>` : ""
       }. Our team will be in touch within one business day to schedule your personalized walkthrough.</p>
       <p>Talk soon,<br/>The Fairway360 Team</p>`,
    ),
  });
}

// Internal notification to the sales inbox for a new demo request.
export async function notifySalesOfDemo(req: DemoRequestEmail): Promise<boolean> {
  const inbox = process.env["SALES_NOTIFY_EMAIL"];
  if (!inbox) return false;
  const rows = [
    ["Contact", req.name],
    ["Club", req.clubName],
    ["Email", req.email],
    ["Phone", req.phone],
    ["Business type", req.businessType],
    ["Biggest problem", req.problem],
    ["Lead volume", req.volume],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#5b6b63">${k}</td><td style="padding:4px 0;font-weight:500">${v}</td></tr>`,
    )
    .join("");
  return sendEmail({
    to: inbox,
    replyTo: req.email,
    subject: `New demo request: ${req.clubName ?? req.name}`,
    html: layout("New demo request", `<table>${rows}</table>`),
  });
}

interface OrderConfirmationEmail {
  to: string;
  memberName: string;
  total: number;
  hole?: number | null;
  lines: { qty: number; name: string }[];
}

// Confirmation to a member after they place an on-course order.
export async function sendOrderConfirmation(
  o: OrderConfirmationEmail,
): Promise<boolean> {
  const items = o.lines
    .map((l) => `<li>${l.qty}× ${l.name}</li>`)
    .join("");
  return sendEmail({
    to: o.to,
    subject: "Your Fairway360 order is in",
    html: layout(
      "Order received",
      `<p>Hi ${o.memberName},</p>
       <p>We've sent your order to the kitchen and cart team${
         o.hole ? ` — it'll be brought out to Hole ${o.hole}` : ""
       }.</p>
       <ul>${items}</ul>
       <p><strong>Total: $${o.total.toFixed(2)}</strong></p>`,
    ),
  });
}
