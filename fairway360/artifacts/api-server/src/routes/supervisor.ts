import { Router, type IRouter } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  isNotNull,
  ne,
  sum,
} from "drizzle-orm";
import {
  db,
  clubs,
  events,
  tasks,
  timeOffRequests,
  rounds,
  members,
  users,
  carts,
  memberRequests,
  leads,
  teeTimes,
  orders,
  staffProfiles,
  staffMessages,
  escalations,
  chatChannels,
  chatMessages,
  announcements,
} from "@workspace/db";
import {
  CreateEventBody,
  CreateTaskBody,
  DecideTimeOffBody,
  UpdateLeadBody,
  CreateAnnouncementBody,
  MessageStaffBody,
  UpdateBookingBody,
  StartDelegationBody,
  CreateStaffBody,
  CreateMemberBody,
} from "@workspace/api-zod";
import { asyncHandler, notFound, badRequest } from "../lib/http";
import { requireAuth, requireRole, requireStaff } from "../middleware/auth";
import { loadTeam } from "../lib/team";
import { sendSms } from "../lib/sms";
import { fmtAgoShort } from "../lib/format";
import { setDelegation, endDelegation, getDelegation, type Autonomy } from "../lib/delegation";
import { publishChannelEvent } from "../lib/realtime";
import { issueInvite, initialsOf } from "../lib/invite";
import {
  toClubEvent,
  toTask,
  toTimeOff,
  toCourseRound,
  toMemberRequest,
  toLead,
  toBooking,
  toAnnouncement,
} from "../lib/serializers";

const router: IRouter = Router();
const supervisor = [requireAuth, requireRole("supervisor")];

type EventTag = "Tournament" | "Dining" | "Clinic" | "Social" | "League";
type TaskPriority = "High" | "Medium" | "Low";
type Audience = "members" | "staff" | "all";

router.post(
  "/events",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = CreateEventBody.parse(req.body);
    const [row] = await db
      .insert(events)
      .values({
        clubId,
        title: body.title,
        startsAt: new Date(body.startsAt),
        tag: body.tag as EventTag,
        capacity: body.capacity ?? null,
      })
      .returning();
    res.status(201).json(toClubEvent(row));
  }),
);

// All team tasks (supervisor view) with assignee names.
router.get(
  "/tasks",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select({ task: tasks, assignee: users.name })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(eq(tasks.clubId, clubId))
      .orderBy(asc(tasks.done), asc(tasks.dueAt));
    res.json(rows.map((r) => toTask(r.task, r.assignee)));
  }),
);

router.post(
  "/tasks",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = CreateTaskBody.parse(req.body);

    // The client sends a staff-profile id for the assignee; resolve it to the
    // underlying user id that tasks.assigned_to references (club-scoped).
    let assignedUserId: string | null = null;
    let assigneeName: string | null = null;
    if (body.assignedTo) {
      const [sp] = await db
        .select({ userId: staffProfiles.userId, name: users.name })
        .from(staffProfiles)
        .innerJoin(users, eq(staffProfiles.userId, users.id))
        .where(
          and(eq(staffProfiles.id, body.assignedTo), eq(staffProfiles.clubId, clubId)),
        );
      if (sp) {
        assignedUserId = sp.userId;
        assigneeName = sp.name;
      }
    }

    const [row] = await db
      .insert(tasks)
      .values({
        clubId,
        label: body.label,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        priority: (body.priority as TaskPriority) ?? "Medium",
        assignedTo: assignedUserId,
      })
      .returning();
    res.status(201).json(toTask(row, assigneeName));
  }),
);

router.patch(
  "/time-off/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const { status } = DecideTimeOffBody.parse(req.body);
    const [row] = await db
      .update(timeOffRequests)
      .set({ status, decidedBy: userId })
      .where(
        and(
          eq(timeOffRequests.id, req.params.id),
          eq(timeOffRequests.clubId, clubId),
        ),
      )
      .returning();
    if (!row) throw notFound("Time-off request not found.");
    res.json(toTimeOff(row));
  }),
);

router.get(
  "/overview",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const [
      [onCourse],
      [openReqs],
      [activeOrders],
      [onShift],
      [newLeads],
      [bookingsToday],
      [revenue],
    ] = await Promise.all([
      db.select({ n: count() }).from(rounds).where(eq(rounds.clubId, clubId)),
      db
        .select({ n: count() })
        .from(memberRequests)
        .where(
          and(eq(memberRequests.clubId, clubId), eq(memberRequests.status, "open")),
        ),
      db
        .select({ n: count() })
        .from(orders)
        .where(and(eq(orders.clubId, clubId), ne(orders.status, "Delivered"))),
      db
        .select({ n: count() })
        .from(staffProfiles)
        .where(
          and(
            eq(staffProfiles.clubId, clubId),
            eq(staffProfiles.currentStatus, "On Shift"),
          ),
        ),
      db
        .select({ n: count() })
        .from(leads)
        .where(and(eq(leads.clubId, clubId), eq(leads.status, "New"))),
      db
        .select({ n: count() })
        .from(teeTimes)
        .where(and(eq(teeTimes.clubId, clubId), isNotNull(teeTimes.memberId))),
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(eq(orders.clubId, clubId)),
    ]);

    res.json({
      membersOnCourse: Number(onCourse?.n ?? 0),
      openRequests: Number(openReqs?.n ?? 0),
      activeOrders: Number(activeOrders?.n ?? 0),
      staffOnShift: Number(onShift?.n ?? 0),
      newLeads: Number(newLeads?.n ?? 0),
      bookingsToday: Number(bookingsToday?.n ?? 0),
      revenueToday: Math.round(Number(revenue?.total ?? 0)),
    });
  }),
);

router.get(
  "/course/rounds",
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select({
        round: rounds,
        name: users.name,
        initials: users.initials,
        cartNumber: carts.cartNumber,
      })
      .from(rounds)
      .innerJoin(members, eq(rounds.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .leftJoin(carts, eq(rounds.cartId, carts.id))
      .where(eq(rounds.clubId, clubId))
      .orderBy(asc(rounds.currentHole));
    res.json(
      rows.map((r) =>
        toCourseRound(r.round, {
          name: r.name,
          initials: r.initials ?? "",
          cartNumber: r.cartNumber,
        }),
      ),
    );
  }),
);

router.get(
  "/requests",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select({ req: memberRequests, name: users.name })
      .from(memberRequests)
      .innerJoin(members, eq(memberRequests.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .where(
        and(eq(memberRequests.clubId, clubId), eq(memberRequests.status, "open")),
      )
      .orderBy(asc(memberRequests.createdAt));
    res.json(rows.map((r) => toMemberRequest(r.req, r.name)));
  }),
);

router.patch(
  "/requests/:id/resolve",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const result = await db
      .update(memberRequests)
      .set({ status: "resolved", resolvedBy: userId, resolvedAt: new Date() })
      .where(
        and(
          eq(memberRequests.id, req.params.id),
          eq(memberRequests.clubId, clubId),
        ),
      )
      .returning({ id: memberRequests.id });
    if (result.length === 0) throw notFound("Request not found.");
    res.json({ ok: true });
  }),
);

router.get(
  "/staff",
  ...supervisor,
  asyncHandler(async (req, res) => {
    res.json(await loadTeam(req.auth!.clubId));
  }),
);

// Message a staff member. Sends an SMS to their phone via Twilio (env-gated:
// no-op returning sent=false when Twilio isn't configured). club_id from session.
router.post(
  "/staff/:id/message",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const { message } = MessageStaffBody.parse(req.body);

    const [recipient] = await db
      .select({ userId: staffProfiles.userId, phone: users.phone })
      .from(staffProfiles)
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(
        and(eq(staffProfiles.id, req.params.id), eq(staffProfiles.clubId, clubId)),
      );
    if (!recipient) throw notFound("Staff member not found.");

    const [sender] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));
    const senderName = sender?.name ?? "Your supervisor";

    // In-app delivery (always): the staff member sees this in their portal.
    await db.insert(staffMessages).values({
      clubId,
      recipientUserId: recipient.userId,
      senderUserId: userId,
      senderName,
      body: message,
    });

    // Optional second channel: SMS, when Twilio is configured (no-op otherwise).
    if (recipient.phone) {
      void sendSms(recipient.phone, `Fairway360 — ${senderName}: ${message}`);
    }

    res.json({ sent: true });
  }),
);

router.get(
  "/leads",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(leads)
      .where(eq(leads.clubId, clubId))
      .orderBy(desc(leads.createdAt));
    res.json(rows.map(toLead));
  }),
);

router.patch(
  "/leads/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const { status } = UpdateLeadBody.parse(req.body);
    const [row] = await db
      .update(leads)
      .set({ status })
      .where(and(eq(leads.id, req.params.id), eq(leads.clubId, clubId)))
      .returning();
    if (!row) throw notFound("Lead not found.");
    res.json(toLead(row));
  }),
);

router.get(
  "/bookings",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select({ tee: teeTimes, name: users.name })
      .from(teeTimes)
      .innerJoin(members, eq(teeTimes.memberId, members.id))
      .innerJoin(users, eq(members.userId, users.id))
      .where(and(eq(teeTimes.clubId, clubId), isNotNull(teeTimes.memberId)))
      .orderBy(asc(teeTimes.startsAt));
    res.json(rows.map((r) => toBooking(r.tee, r.name)));
  }),
);

// Starter desk actions on a booking: check a group in or cancel the tee time.
router.patch(
  "/bookings/:id",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId } = req.auth!;
    const { status } = UpdateBookingBody.parse(req.body);
    const [row] = await db
      .update(teeTimes)
      .set({ status })
      .where(and(eq(teeTimes.id, req.params.id), eq(teeTimes.clubId, clubId)))
      .returning();
    if (!row) throw notFound("Booking not found.");
    const [m] = await db
      .select({ name: users.name })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.id, row.memberId!));
    res.json(toBooking(row, m?.name ?? "Member"));
  }),
);

router.post(
  "/announcements",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const body = CreateAnnouncementBody.parse(req.body);
    const [row] = await db
      .insert(announcements)
      .values({
        clubId,
        tag: body.tag ?? null,
        title: body.title,
        body: body.body ?? null,
        audience: (body.audience as Audience) ?? "all",
      })
      .returning();
    res.status(201).json(toAnnouncement(row));
  }),
);

// Open escalations raised from channel conversations.
router.get(
  "/escalations",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select()
      .from(escalations)
      .where(and(eq(escalations.clubId, clubId), eq(escalations.status, "open")))
      .orderBy(desc(escalations.level), desc(escalations.createdAt));
    res.json(
      rows.map((e) => ({
        id: e.id,
        channelId: e.channelId ?? undefined,
        memberName: e.memberName,
        level: e.level,
        triggerType: e.triggerType ?? undefined,
        contextSummary: e.contextSummary ?? undefined,
        agentLastMessage: e.agentLastMessage ?? undefined,
        status: e.status,
        time: fmtAgoShort(e.createdAt),
      })),
    );
  }),
);

router.patch(
  "/escalations/:id/resolve",
  ...supervisor,
  asyncHandler<{ id: string }>(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const result = await db
      .update(escalations)
      .set({ status: "resolved", resolvedBy: userId, resolvedAt: new Date() })
      .where(and(eq(escalations.id, req.params.id), eq(escalations.clubId, clubId)))
      .returning({ id: escalations.id });
    if (result.length === 0) throw notFound("Escalation not found.");
    res.json({ ok: true });
  }),
);

// ── §9 Supervisor delegation ────────────────────────────────────────────────
function delegationDto(clubId: string) {
  const d = getDelegation(clubId);
  if (!d) return { active: false };
  return {
    active: true,
    autonomy: d.autonomy,
    by: d.byName,
    until: new Date(d.untilMs).toISOString(),
    startedAt: new Date(d.startedAtMs).toISOString(),
  };
}

// Post a Supervisor AI message into the Management channel.
async function postToManagement(clubId: string, content: string): Promise<void> {
  const [mgmt] = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.clubId, clubId), eq(chatChannels.department, "management")));
  if (!mgmt) return;
  const [msg] = await db
    .insert(chatMessages)
    .values({
      clubId,
      channelId: mgmt.id,
      senderUserId: null,
      senderName: "Supervisor AI",
      senderRole: "agent",
      aiGenerated: true,
      content,
    })
    .returning();
  publishChannelEvent(clubId, { type: "channel.message", channelId: mgmt.id, messageId: msg.id });
}

router.get(
  "/agents/delegation",
  ...supervisor,
  asyncHandler(async (req, res) => {
    res.json(delegationDto(req.auth!.clubId));
  }),
);

router.post(
  "/agents/delegate",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId, userId } = req.auth!;
    const { autonomy, durationMinutes } = StartDelegationBody.parse(req.body);
    const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    const d = setDelegation(clubId, autonomy as Autonomy, durationMinutes, me?.name ?? "Supervisor");
    void postToManagement(
      clubId,
      `Shift delegation active at ${autonomy.toUpperCase()} autonomy until ${new Date(d.untilMs).toLocaleTimeString()}. I'm monitoring operations — ${me?.name ?? "the supervisor"} will be reached only for critical (Level 3) issues.`,
    );
    res.json(delegationDto(clubId));
  }),
);

router.post(
  "/agents/delegation/end",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    if (getDelegation(clubId)) {
      void postToManagement(clubId, "Shift delegation ended — the supervisor is back in control. Handoff summary is ready for review.");
    }
    endDelegation(clubId);
    res.json({ ok: true });
  }),
);

// ── §13 Messaging analytics (last 7 days) ───────────────────────────────────
router.get(
  "/analytics/messaging",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [msgs, escs, chans] = await Promise.all([
      db
        .select()
        .from(chatMessages)
        .where(and(eq(chatMessages.clubId, clubId), gt(chatMessages.createdAt, since))),
      db.select().from(escalations).where(eq(escalations.clubId, clubId)),
      db.select().from(chatChannels).where(eq(chatChannels.clubId, clubId)),
    ]);

    const total = msgs.length;
    const ai = msgs.filter((m) => m.aiGenerated).length;
    const byChannel = new Map<string, { name: string; messages: number }>();
    for (const c of chans) byChannel.set(c.id, { name: c.name, messages: 0 });
    for (const m of msgs) {
      const e = byChannel.get(m.channelId);
      if (e) e.messages += 1;
    }

    res.json({
      messages7d: total,
      aiReplies7d: ai,
      aiSharePct: total ? Math.round((ai / total) * 100) : 0,
      escalationsOpen: escs.filter((e) => e.status === "open").length,
      escalationsTotal: escs.length,
      l1: escs.filter((e) => e.level === 1).length,
      l2: escs.filter((e) => e.level === 2).length,
      l3: escs.filter((e) => e.level === 3).length,
      channels: [...byChannel.values()]
        .filter((c) => c.messages > 0)
        .sort((a, b) => b.messages - a.messages),
    });
  }),
);

// ── Onboarding: club admin adds staff & members (invite-link to set password) ──
router.post(
  "/staff",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const { name, email, role, jobTitle, phone } = CreateStaffBody.parse(req.body);
    const normEmail = email.toLowerCase().trim();
    const [dup] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.clubId, clubId), eq(users.email, normEmail)));
    if (dup) throw badRequest("A user with that email already exists at this club.");
    const [club] = await db.select({ name: clubs.name }).from(clubs).where(eq(clubs.id, clubId));
    const [user] = await db
      .insert(users)
      .values({
        clubId,
        email: normEmail,
        role,
        name: name.trim(),
        initials: initialsOf(name),
        phone: phone?.trim() || null,
        status: "active",
        passwordHash: null,
      })
      .returning();
    const [{ c }] = await db
      .select({ c: count() })
      .from(staffProfiles)
      .where(eq(staffProfiles.clubId, clubId));
    await db.insert(staffProfiles).values({
      clubId,
      userId: user.id,
      jobTitle: jobTitle.trim(),
      employeeNo: `EMP-${String((c ?? 0) + 1).padStart(3, "0")}`,
      currentStatus: "Clocked Out",
    });
    const invite = await issueInvite(user.id, name, normEmail, club?.name ?? "your club");
    res.status(201).json({ id: user.id, inviteLink: invite.link, emailed: invite.emailed });
  }),
);

router.get(
  "/members",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const rows = await db
      .select({ m: members, u: users })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.clubId, clubId))
      .orderBy(desc(members.createdAt));
    res.json(
      rows.map(({ m, u }) => ({
        id: m.id,
        userId: u.id,
        name: u.name,
        email: u.email,
        tier: m.tier,
        memberNumber: m.memberNumber,
        status: u.status,
        pending: !u.passwordHash,
      })),
    );
  }),
);

router.post(
  "/members",
  ...supervisor,
  asyncHandler(async (req, res) => {
    const { clubId } = req.auth!;
    const { name, email, tier, phone } = CreateMemberBody.parse(req.body);
    const normEmail = email.toLowerCase().trim();
    const [dup] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.clubId, clubId), eq(users.email, normEmail)));
    if (dup) throw badRequest("A user with that email already exists at this club.");
    const [club] = await db.select({ name: clubs.name }).from(clubs).where(eq(clubs.id, clubId));
    const [user] = await db
      .insert(users)
      .values({
        clubId,
        email: normEmail,
        role: "member",
        name: name.trim(),
        initials: initialsOf(name),
        phone: phone?.trim() || null,
        status: "active",
        passwordHash: null,
      })
      .returning();
    const [{ c }] = await db
      .select({ c: count() })
      .from(members)
      .where(eq(members.clubId, clubId));
    await db.insert(members).values({
      clubId,
      userId: user.id,
      memberNumber: `M-${String((c ?? 0) + 1).padStart(4, "0")}`,
      tier: tier?.trim() || "Standard",
      memberSince: new Date().getFullYear(),
      balance: "0",
    });
    const invite = await issueInvite(user.id, name, normEmail, club?.name ?? "your club");
    res.status(201).json({ id: user.id, inviteLink: invite.link, emailed: invite.emailed });
  }),
);

export default router;
