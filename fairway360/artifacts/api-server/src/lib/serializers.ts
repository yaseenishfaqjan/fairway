// DB row → API DTO mappers. Absolute calendar fields are formatted with the
// UTC-based helpers in ./format (the seed stores them on a UTC clock); relative
// fields ("3 min ago", "1h 12m") are computed against real now().

import type {
  Member,
  User,
  MemberPayment as DbMemberPayment,
  Event as DbEvent,
  Announcement as DbAnnouncement,
  Lead as DbLead,
  TeeTime as DbTeeTime,
  Order as DbOrder,
  OrderLine as DbOrderLine,
  MenuItem as DbMenuItem,
  Round as DbRound,
  Shift as DbShift,
  Task as DbTask,
  TimeOffRequest as DbTimeOff,
  StaffProfile,
  MemberRequest as DbMemberRequest,
} from "@workspace/db";
import type {
  MemberAccount,
  Payment,
  ClubEvent,
  Announcement,
  Lead,
  TeeTime,
  Order,
  OrderLine,
  MenuItem,
  CourseRound,
  Shift,
  Task,
  TimeOff,
  TeamMember,
  Booking,
  UpcomingItem,
  MemberRequest,
} from "@workspace/api-zod";
import {
  dayLabel,
  fmtAgoLong,
  fmtAgoShort,
  fmtDateRange,
  fmtDateShort,
  fmtSince,
  fmtTime,
  teeTimeStatusLabel,
} from "./format";

const num = (v: string | null | undefined): number => (v == null ? 0 : Number(v));

export function toMenuItem(m: DbMenuItem): MenuItem {
  return {
    id: m.id,
    name: m.name,
    price: num(m.price),
    category: m.category,
    image: m.imageUrl ?? "",
  };
}

export function toPayment(p: DbMemberPayment): Payment {
  return {
    id: p.id,
    label: p.label,
    date: fmtDateShort(p.chargedAt),
    amount: num(p.amount),
  };
}

export function toMemberAccount(member: Member, user: User): MemberAccount {
  return {
    name: user.name,
    memberSince: member.memberSince != null ? String(member.memberSince) : undefined,
    tier: member.tier,
    number: member.memberNumber,
    balance: num(member.balance),
    handicap: member.handicap != null ? num(member.handicap) : undefined,
    roundsThisYear: member.roundsThisYear,
  };
}

export function toClubEvent(e: DbEvent): ClubEvent {
  let spots: string;
  if (e.capacity == null) {
    spots = "Open";
  } else {
    const left = e.capacity - e.spotsTaken;
    spots = left <= 0 ? "Field set" : `${left} spots left`;
  }
  return {
    id: e.id,
    title: e.title,
    date: fmtDateShort(e.startsAt),
    time: fmtTime(e.startsAt),
    spots,
    tag: e.tag,
  };
}

export function toAnnouncement(a: DbAnnouncement): Announcement {
  return {
    id: a.id,
    tag: a.tag ?? undefined,
    title: a.title,
    date: fmtDateShort(a.publishedAt),
  };
}

export function toLead(l: DbLead): Lead {
  return {
    id: l.id,
    name: l.name,
    contactName: l.contactName ?? undefined,
    email: l.email ?? undefined,
    phone: l.phone ?? undefined,
    source: l.source ?? undefined,
    interest: l.interest ?? undefined,
    status: l.status,
    businessType: l.businessType ?? undefined,
    problem: l.problem ?? undefined,
    volume: l.volume ?? undefined,
    time: fmtAgoShort(l.createdAt),
  };
}

export function toTeeTime(t: DbTeeTime, memberName?: string | null): TeeTime {
  return {
    id: t.id,
    member: memberName ?? undefined,
    time: fmtTime(t.startsAt),
    date: fmtDateShort(t.startsAt),
    players: t.players,
    holes: t.holes,
    status: teeTimeStatusLabel(t.status),
  };
}

export function toBooking(t: DbTeeTime, memberName: string): Booking {
  return {
    id: t.id,
    member: memberName,
    time: fmtTime(t.startsAt),
    players: t.players,
    holes: t.holes,
    status: teeTimeStatusLabel(t.status),
  };
}

export function toOrderLine(l: DbOrderLine): OrderLine {
  return {
    itemId: l.menuItemId ?? "",
    name: l.nameSnapshot,
    price: num(l.priceSnapshot),
    qty: l.qty,
  };
}

export function toOrder(
  o: DbOrder,
  opts: { member: string; cartNumber?: string | null; lines: DbOrderLine[] },
): Order {
  return {
    id: o.id,
    groupId: o.roundId ?? undefined,
    member: opts.member,
    hole: o.hole ?? undefined,
    cartNumber: opts.cartNumber ?? undefined,
    lines: opts.lines.map(toOrderLine),
    note: o.note,
    status: o.status,
    placedAt: fmtAgoLong(o.placedAt),
    total: num(o.total),
  };
}

export function toCourseRound(
  r: DbRound,
  opts: { name: string; initials: string; cartNumber?: string | null },
): CourseRound {
  return {
    id: r.id,
    name: opts.name,
    initials: opts.initials,
    hole: r.currentHole,
    cartNumber: opts.cartNumber ?? undefined,
    status: r.status,
    pace: r.pace,
    since: fmtSince(r.startedAt),
    x: num(r.mapX),
    y: num(r.mapY),
  };
}

export function toShift(s: DbShift): Shift {
  return {
    id: s.id,
    day: dayLabel(s.startsAt),
    date: fmtDateShort(s.startsAt),
    time: `${fmtTime(s.startsAt)} – ${fmtTime(s.endsAt)}`,
    role: s.assignment ?? "",
    status: dayLabel(s.startsAt) === "Today" ? "Today" : "Upcoming",
    clockedIn: s.clockInAt != null && s.clockOutAt == null,
  };
}

export function toTask(t: DbTask, assignee?: string | null): Task {
  return {
    id: t.id,
    label: t.label,
    due: t.dueAt ? fmtTime(t.dueAt) : "",
    done: t.done,
    priority: t.priority,
    assignee: assignee ?? undefined,
  };
}

export function toTimeOff(t: DbTimeOff): TimeOff {
  return {
    id: t.id,
    dates: fmtDateRange(t.startDate, t.endDate),
    reason: t.reason ?? undefined,
    status: t.status,
    submitted: fmtDateShort(t.submittedAt),
  };
}

export function toTeamMember(
  sp: StaffProfile,
  user: User,
  opts: { shift?: string | null; tasksOpen: number },
): TeamMember {
  return {
    id: sp.id,
    name: user.name,
    initials: user.initials ?? "",
    role: sp.jobTitle,
    status: sp.currentStatus,
    shift: opts.shift ?? "—",
    area: sp.defaultArea ?? "—",
    tasksOpen: opts.tasksOpen,
  };
}

export function toMemberRequest(
  r: DbMemberRequest,
  memberName: string,
): MemberRequest {
  return {
    id: r.id,
    member: memberName,
    hole: r.hole ?? undefined,
    request: r.request,
    type: r.type,
    priority: r.priority,
  };
}

export function teeTimeUpcoming(t: DbTeeTime): UpcomingItem {
  const party =
    t.players >= 4
      ? "Foursome"
      : t.players === 3
        ? "Threesome"
        : t.players === 2
          ? "Twosome"
          : "Tee Time";
  return {
    id: t.id,
    label: `Tee Time — ${party}`,
    date: dayLabel(t.startsAt),
    time: fmtTime(t.startsAt),
  };
}
