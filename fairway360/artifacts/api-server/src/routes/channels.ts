import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, chatChannels, chatMessages, escalations, users } from "@workspace/db";
import { SendChannelMessageBody } from "@workspace/api-zod";
import type { ChatChannel, ChatMessage as DbChatMessage } from "@workspace/db";
import { asyncHandler, badRequest, forbidden, notFound } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { publishChannelEvent } from "../lib/realtime";
import { fmtAgoShort } from "../lib/format";
import { channelAgentReply, channelAgentName } from "../lib/channel-agent";
import { detectEscalation, holdingMessage, type EscalationResult } from "../lib/escalation";
import { isAnyStaffAvailable } from "../lib/presence";
import { isDelegated } from "../lib/delegation";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function toChannel(c: ChatChannel) {
  return {
    id: c.id,
    key: c.key,
    name: c.name,
    description: c.description ?? undefined,
    emoji: c.emoji ?? undefined,
    color: c.color ?? undefined,
    department: c.department ?? undefined,
    visibleToMembers: c.visibleToMembers,
  };
}

function toChatMessage(m: DbChatMessage) {
  return {
    id: m.id,
    channelId: m.channelId,
    senderUserId: m.senderUserId ?? undefined,
    senderName: m.senderName,
    senderRole: m.senderRole ?? undefined,
    aiGenerated: m.aiGenerated,
    content: m.content,
    time: fmtAgoShort(m.createdAt),
    createdAt: m.createdAt.toISOString(),
  };
}

// List channels for the club. Members only see member-visible channels; staff
// (employee/supervisor) see all of them.
router.get(
  "/channels",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { clubId, role } = req.auth!;
    const rows = await db
      .select()
      .from(chatChannels)
      .where(eq(chatChannels.clubId, clubId))
      .orderBy(asc(chatChannels.displayOrder));
    const visible =
      role === "member" ? rows.filter((c) => c.visibleToMembers) : rows;
    res.json(visible.map(toChannel));
  }),
);

async function loadChannel(id: string, clubId: string): Promise<ChatChannel> {
  const [ch] = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.id, id), eq(chatChannels.clubId, clubId)));
  if (!ch) throw notFound("Channel not found.");
  return ch;
}

router.get(
  "/channels/:id/messages",
  requireAuth,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, role } = req.auth!;
    const ch = await loadChannel(req.params.id, clubId);
    if (role === "member" && !ch.visibleToMembers) throw forbidden("Channel not available.");

    const rows = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.clubId, clubId),
          eq(chatMessages.channelId, req.params.id),
        ),
      )
      .orderBy(asc(chatMessages.createdAt))
      .limit(200);
    res.json(rows.map(toChatMessage));
  }),
);

router.post(
  "/channels/:id/messages",
  requireAuth,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId, role } = req.auth!;
    const { content } = SendChannelMessageBody.parse(req.body);
    if (!content.trim()) throw badRequest("Message cannot be empty.");

    const ch = await loadChannel(req.params.id, clubId);
    if (role === "member" && !ch.visibleToMembers) throw forbidden("Channel not available.");

    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    const [msg] = await db
      .insert(chatMessages)
      .values({
        clubId,
        channelId: req.params.id,
        senderUserId: userId,
        senderName: sender?.name ?? "Member",
        senderRole: role,
        content: content.trim(),
      })
      .returning();

    publishChannelEvent(clubId, {
      type: "channel.message",
      channelId: req.params.id,
      messageId: msg.id,
    });

    // When a member posts in a member-facing channel, run escalation detection
    // first. L2/L3 → the agent pauses, posts a holding message, and an
    // escalation is raised for staff. L0/L1 → the department agent replies
    // normally (L1 also logged). All fire-and-forget.
    if (role === "member" && ch.visibleToMembers) {
      const memberName = sender?.name ?? "Member";
      const esc = detectEscalation(content.trim());
      // §7 Presence: the AI agent only takes over when no staff is "available".
      const agentActive = !isAnyStaffAvailable(clubId);
      if (esc.level >= 2) {
        // Always raise the escalation so staff see it; the agent posts a holding
        // message only when it's actually covering (no staff available).
        void escalateAndHold(clubId, ch, userId, memberName, content.trim(), esc as EscalationResult & { level: 2 | 3 }, agentActive);
      } else if (agentActive) {
        if (esc.level === 1) {
          void recordEscalation(clubId, ch, userId, memberName, content.trim(), esc, null);
        }
        void respondWithAgent(clubId, ch, memberName, content.trim());
      } else if (esc.level === 1) {
        void recordEscalation(clubId, ch, userId, memberName, content.trim(), esc, null);
      }
    }

    // §9 Delegation: when a shift is delegated, the Supervisor AI covers the
    // Management channel — replying to staff coordination messages there.
    if (
      (role === "employee" || role === "supervisor") &&
      ch.department === "management" &&
      isDelegated(clubId)
    ) {
      void respondWithAgent(clubId, ch, sender?.name ?? "Staff", content.trim());
    }

    res.status(201).json(toChatMessage(msg));
  }),
);

async function recordEscalation(
  clubId: string,
  ch: ChatChannel,
  memberUserId: string,
  memberName: string,
  message: string,
  esc: EscalationResult,
  agentLastMessage: string | null,
): Promise<void> {
  try {
    await db.insert(escalations).values({
      clubId,
      channelId: ch.id,
      memberUserId,
      memberName,
      level: esc.level,
      triggerType: esc.triggerType,
      triggerKeywords: esc.keywords,
      contextSummary: message.slice(0, 500),
      agentLastMessage,
      status: "open",
    });
  } catch (err) {
    logger.error({ err }, "escalation: failed to record");
  }
}

// L2/L3: escalation raised for staff. When the agent is covering (no staff
// available), it also posts a holding message and pauses.
async function escalateAndHold(
  clubId: string,
  ch: ChatChannel,
  memberUserId: string,
  memberName: string,
  message: string,
  esc: EscalationResult & { level: 2 | 3 },
  postHolding: boolean,
): Promise<void> {
  const hold = holdingMessage(esc.level, memberName.split(" ")[0] || "there");
  if (postHolding) {
    try {
      const [agentMsg] = await db
      .insert(chatMessages)
      .values({
        clubId,
        channelId: ch.id,
        senderUserId: null,
        senderName: channelAgentName(ch.department),
        senderRole: "agent",
        aiGenerated: true,
        content: hold,
      })
      .returning();
      publishChannelEvent(clubId, {
        type: "channel.message",
        channelId: ch.id,
        messageId: agentMsg.id,
      });
    } catch (err) {
      logger.error({ err }, "escalation: failed to post holding message");
    }
  }
  await recordEscalation(clubId, ch, memberUserId, memberName, message, esc, hold);
}

// Generate and post the department agent's reply to a channel.
async function respondWithAgent(
  clubId: string,
  ch: ChatChannel,
  memberName: string,
  message: string,
): Promise<void> {
  try {
    const recent = await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.clubId, clubId), eq(chatMessages.channelId, ch.id)))
      .orderBy(asc(chatMessages.createdAt))
      .limit(20);

    const reply = await channelAgentReply({
      clubId,
      department: ch.department,
      memberName,
      message,
      history: recent.map((m) => ({
        senderName: m.senderName,
        content: m.content,
        aiGenerated: m.aiGenerated,
      })),
    });

    const [agentMsg] = await db
      .insert(chatMessages)
      .values({
        clubId,
        channelId: ch.id,
        senderUserId: null,
        senderName: channelAgentName(ch.department),
        senderRole: "agent",
        aiGenerated: true,
        content: reply,
      })
      .returning();

    publishChannelEvent(clubId, {
      type: "channel.message",
      channelId: ch.id,
      messageId: agentMsg.id,
    });
  } catch (err) {
    logger.error({ err }, "channel-agent: failed to post reply");
  }
}

export default router;
