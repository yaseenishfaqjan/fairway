import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { AgentChatBody } from "@workspace/api-zod";
import { asyncHandler } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { conciergeReply } from "../lib/concierge";

const router: IRouter = Router();

// LLM-backed concierge grounded in the member's own club data. Gracefully
// degrades to a deterministic reply when ANTHROPIC_API_KEY isn't configured.
router.post(
  "/agent/chat",
  requireAuth,
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
