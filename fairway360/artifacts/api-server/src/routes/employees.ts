import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gt, isNull, or } from "drizzle-orm";
import {
  db,
  shifts,
  tasks,
  timeOffRequests,
  staffMessages,
  chatMessages,
  chatChannels,
  escalations,
} from "@workspace/db";
import { UpdateTaskBody, RequestTimeOffBody, UpdatePresenceBody } from "@workspace/api-zod";
import { asyncHandler, notFound } from "../lib/http";
import { requireAuth, requireStaff } from "../middleware/auth";
import { setPresence, type PresenceStatus } from "../lib/presence";
import { staffIdFor } from "../lib/identity";
import { toShift, toTask, toTimeOff } from "../lib/serializers";
import { fmtAgoShort } from "../lib/format";
import { loadTeam } from "../lib/team";

const router: IRouter = Router();
const staff = [requireAuth, requireStaff];

// §7 Presence: staff set their live status. "available" makes the AI agents
// stand down (humans handle); anything else lets the agents cover.
router.patch(
  "/me/presence",
  ...staff,
  asyncHandler(async (req, res) => {
    const { userId, clubId, role } = req.auth!;
    const { status } = UpdatePresenceBody.parse(req.body);
    setPresence(userId, clubId, role, status as PresenceStatus);
    res.json({ ok: true });
  }),
);

// Agent handoff: what the AI agents handled in the channels over the last 12h
// (replies per channel + escalations raised), shown to staff when they return.
router.get(
  "/me/handoff",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const [agentMsgs, chans, escs] = await Promise.all([
      db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.clubId, clubId),
            eq(chatMessages.aiGenerated, true),
            gt(chatMessages.createdAt, since),
          ),
        )
        .orderBy(asc(chatMessages.createdAt)),
      db.select().from(chatChannels).where(eq(chatChannels.clubId, clubId)),
      db
        .select()
        .from(escalations)
        .where(and(eq(escalations.clubId, clubId), gt(escalations.createdAt, since)))
        .orderBy(desc(escalations.createdAt)),
    ]);

    const chanById = new Map(chans.map((c) => [c.id, c]));
    const byChannel = new Map<
      string,
      { name: string; emoji?: string; replies: number; lastReply: string }
    >();
    for (const m of agentMsgs) {
      const c = chanById.get(m.channelId);
      const entry =
        byChannel.get(m.channelId) ?? {
          name: c?.name ?? "Channel",
          emoji: c?.emoji ?? undefined,
          replies: 0,
          lastReply: "",
        };
      entry.replies += 1;
      entry.lastReply = m.content;
      byChannel.set(m.channelId, entry);
    }

    res.json({
      since: since.toISOString(),
      totalAgentReplies: agentMsgs.length,
      openEscalations: escs.filter((e) => e.status === "open").length,
      channels: [...byChannel.values()],
      escalations: escs.slice(0, 8).map((e) => ({
        level: e.level,
        member: e.memberName,
        triggerType: e.triggerType ?? undefined,
        status: e.status,
      })),
    });
  }),
);

// Internal messages sent to this staff member by a supervisor — shown in their
// portal (notification bell). Scoped to the session user + club.
router.get(
  "/me/messages",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const rows = await db
      .select()
      .from(staffMessages)
      .where(
        and(
          eq(staffMessages.clubId, clubId),
          eq(staffMessages.recipientUserId, userId),
        ),
      )
      .orderBy(desc(staffMessages.createdAt))
      .limit(30);
    res.json(
      rows.map((m) => ({
        id: m.id,
        from: m.senderName,
        body: m.body,
        read: m.readAt !== null,
        time: fmtAgoShort(m.createdAt),
      })),
    );
  }),
);

router.patch(
  "/me/messages/:id/read",
  ...staff,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const result = await db
      .update(staffMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(staffMessages.id, req.params.id),
          eq(staffMessages.clubId, clubId),
          eq(staffMessages.recipientUserId, userId),
        ),
      )
      .returning({ id: staffMessages.id });
    if (result.length === 0) throw notFound("Message not found.");
    res.json({ ok: true });
  }),
);

router.get(
  "/me/shifts",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const staffId = await staffIdFor(req.auth!);
    const rows = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.clubId, clubId), eq(shifts.staffId, staffId)))
      .orderBy(asc(shifts.startsAt));
    res.json(rows.map(toShift));
  }),
);

router.post(
  "/shifts/:id/clock-in",
  ...staff,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const staffId = await staffIdFor(req.auth!);
    const [row] = await db
      .update(shifts)
      .set({ clockInAt: new Date() })
      .where(
        and(
          eq(shifts.id, req.params.id),
          eq(shifts.clubId, clubId),
          eq(shifts.staffId, staffId),
        ),
      )
      .returning();
    if (!row) throw notFound("Shift not found.");
    res.json(toShift(row));
  }),
);

router.post(
  "/shifts/:id/clock-out",
  ...staff,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const staffId = await staffIdFor(req.auth!);
    const [row] = await db
      .update(shifts)
      .set({ clockOutAt: new Date() })
      .where(
        and(
          eq(shifts.id, req.params.id),
          eq(shifts.clubId, clubId),
          eq(shifts.staffId, staffId),
        ),
      )
      .returning();
    if (!row) throw notFound("Shift not found.");
    res.json(toShift(row));
  }),
);

router.get(
  "/me/tasks",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const rows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.clubId, clubId),
          or(eq(tasks.assignedTo, userId), isNull(tasks.assignedTo)),
        ),
      )
      .orderBy(asc(tasks.done), asc(tasks.dueAt));
    res.json(rows.map((t) => toTask(t)));
  }),
);

router.patch(
  "/tasks/:id",
  ...staff,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const body = UpdateTaskBody.parse(req.body);

    const patch: Partial<typeof tasks.$inferInsert> = {};
    if (body.label !== undefined) patch.label = body.label;
    if (body.priority !== undefined) {
      patch.priority = body.priority as "High" | "Medium" | "Low";
    }
    if (body.done !== undefined) {
      patch.done = body.done;
      patch.completedAt = body.done ? new Date() : null;
    }

    const [row] = await db
      .update(tasks)
      .set(patch)
      .where(and(eq(tasks.id, req.params.id), eq(tasks.clubId, clubId)))
      .returning();
    if (!row) throw notFound("Task not found.");
    res.json(toTask(row));
  }),
);

router.get(
  "/me/time-off",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const staffId = await staffIdFor(req.auth!);
    const rows = await db
      .select()
      .from(timeOffRequests)
      .where(
        and(
          eq(timeOffRequests.clubId, clubId),
          eq(timeOffRequests.staffId, staffId),
        ),
      )
      .orderBy(desc(timeOffRequests.submittedAt));
    res.json(rows.map(toTimeOff));
  }),
);

router.post(
  "/time-off",
  ...staff,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const staffId = await staffIdFor(req.auth!);
    const body = RequestTimeOffBody.parse(req.body);
    const [row] = await db
      .insert(timeOffRequests)
      .values({
        clubId,
        staffId,
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason ?? null,
        status: "Pending",
      })
      .returning();
    res.status(201).json(toTimeOff(row));
  }),
);

router.get(
  "/team",
  ...staff,
  asyncHandler(async (req, res) => {
    res.json(await loadTeam(req.auth!.clubId));
  }),
);

export default router;
