import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, clubs, leads } from "@workspace/db";
import { CreateDemoRequestBody } from "@workspace/api-zod";
import { asyncHandler } from "../lib/http";
import { sendDemoConfirmation, notifySalesOfDemo } from "../lib/email";
import { rateLimit } from "../lib/rate-limit";
import { captureClientError } from "../lib/monitoring";

const router: IRouter = Router();

// Browser error reporter → forwards to Sentry (if configured). Fire-and-forget.
const clientErrorLimiter = rateLimit({ windowMs: 60_000, max: 30, key: "client-error" });
router.post("/monitoring/client-error", clientErrorLimiter, (req, res) => {
  const { message, stack, url } = (req.body ?? {}) as { message?: string; stack?: string; url?: string };
  captureClientError({ message, stack, url });
  res.status(204).end();
});

// Demo / sales request from the marketing site. There is no session here, so it
// can't be tenant-scoped from auth; we route it to the Augusta Pines demo tenant
// as a new sales lead (the platform's default inbox for now).
const DEMO_CLUB_SLUG = "augusta-pines";

// Spam protection on the public marketing form.
const demoLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, key: "demo" });

router.post(
  "/leads/demo-request",
  demoLimiter,
  asyncHandler(async (req, res) => {
    const body = CreateDemoRequestBody.parse(req.body);

    const [club] = await db
      .select({ id: clubs.id })
      .from(clubs)
      .where(eq(clubs.slug, DEMO_CLUB_SLUG));

    if (club) {
      await db.insert(leads).values({
        clubId: club.id,
        name: body.clubName ?? body.name,
        contactName: body.name,
        email: body.email,
        phone: body.phone ?? null,
        source: "Demo Request",
        interest: body.businessType ?? "Demo Request",
        status: "New",
        businessType: body.businessType ?? null,
        problem: body.problem ?? null,
        volume: body.volume ?? null,
      });
    }

    // Fire-and-forget: email failures must not break lead capture. Both helpers
    // catch internally and no-op when Resend isn't configured.
    void sendDemoConfirmation(body);
    void notifySalesOfDemo(body);

    res.json({ ok: true });
  }),
);

export default router;
