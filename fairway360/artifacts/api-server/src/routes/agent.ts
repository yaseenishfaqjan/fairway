import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { AgentChatBody } from "@workspace/api-zod";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../lib/rate-limit";
import { conciergeReply } from "../lib/concierge";

const router: IRouter = Router();

// Per-user throttle so a member can't spam the concierge (which costs real
// Anthropic tokens once a key is configured). Keyed by user id, not IP, since
// members on mobile often share NAT addresses.
const conciergeLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 30,
  key: "agent-chat",
  by: (req) => req.auth?.userId,
});

// LLM-backed concierge grounded in the member's own club data. Gracefully
// degrades to a deterministic reply when ANTHROPIC_API_KEY isn't configured.
router.post(
  "/agent/chat",
  requireAuth,
  conciergeLimiter,
  asyncHandler(async (req, res) => {
    const { userId, clubId } = req.auth!;
    const { conversationId, message } = AgentChatBody.parse(req.body);
    const reply = await conciergeReply({ userId, clubId }, message);
    res.json({
      conversationId: conversationId ?? randomUUID(),
      reply,
    });
  }),
);

export default router;
