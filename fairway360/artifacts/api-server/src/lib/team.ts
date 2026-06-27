// Team roster loader (staff profile + today's shift + open task count), shared
// by the employee /team view and the supervisor /staff view.

import { and, asc, count, eq } from "drizzle-orm";
import { db, staffProfiles, users, shifts, tasks } from "@workspace/db";
import type { TeamMember } from "@workspace/api-zod";
import { toShift, toTeamMember } from "./serializers";
import { dayLabel } from "./format";

export async function loadTeam(clubId: string): Promise<TeamMember[]> {
  const [staff, allShifts, openTaskCounts] = await Promise.all([
    db
      .select({ sp: staffProfiles, user: users })
      .from(staffProfiles)
      .innerJoin(users, eq(staffProfiles.userId, users.id))
      .where(eq(staffProfiles.clubId, clubId))
      .orderBy(asc(users.name)),
    db.select().from(shifts).where(eq(shifts.clubId, clubId)),
    db
      .select({ assignedTo: tasks.assignedTo, n: count() })
      .from(tasks)
      .where(and(eq(tasks.clubId, clubId), eq(tasks.done, false)))
      .groupBy(tasks.assignedTo),
  ]);

  const shiftByStaff = new Map<string, string>();
  for (const s of allShifts) {
    if (dayLabel(s.startsAt) === "Today") {
      shiftByStaff.set(s.staffId, toShift(s).time);
    }
  }
  const openByUser = new Map<string, number>();
  for (const r of openTaskCounts) {
    if (r.assignedTo) openByUser.set(r.assignedTo, Number(r.n));
  }

  return staff.map((s) =>
    toTeamMember(s.sp, s.user, {
      shift: shiftByStaff.get(s.sp.id),
      tasksOpen: openByUser.get(s.user.id) ?? 0,
    }),
  );
}
