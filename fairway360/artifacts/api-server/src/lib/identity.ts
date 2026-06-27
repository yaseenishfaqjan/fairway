// Resolve the member / staff profile row for the authenticated principal.
// club_id is always taken from the session (req.auth), never from request input.

import { and, eq } from "drizzle-orm";
import { db, members, staffProfiles } from "@workspace/db";
import { badRequest } from "./http";

export type Auth = { userId: string; clubId: string };

export async function memberIdFor(auth: Auth): Promise<string> {
  const [row] = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.userId, auth.userId), eq(members.clubId, auth.clubId)));
  if (!row) throw badRequest("No member profile for this user.");
  return row.id;
}

export async function staffIdFor(auth: Auth): Promise<string> {
  const [row] = await db
    .select({ id: staffProfiles.id })
    .from(staffProfiles)
    .where(
      and(
        eq(staffProfiles.userId, auth.userId),
        eq(staffProfiles.clubId, auth.clubId),
      ),
    );
  if (!row) throw badRequest("No staff profile for this user.");
  return row.id;
}
