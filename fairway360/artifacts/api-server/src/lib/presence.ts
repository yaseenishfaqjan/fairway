// In-memory staff presence registry. Presence is ephemeral (lost on restart),
// matching the plan's Redis role — single-instance only. Controls whether the
// department AI agents activate: agents stand down only when a staff member is
// actively "available".

export type PresenceStatus = "available" | "busy" | "away" | "offline" | "dnd";

interface Entry {
  clubId: string;
  role: string;
  status: PresenceStatus;
  at: number;
}

const STALE_MS = 5 * 60 * 1000; // treat presence older than 5 min as offline
const registry = new Map<string, Entry>();

export function setPresence(
  userId: string,
  clubId: string,
  role: string,
  status: PresenceStatus,
): void {
  registry.set(userId, { clubId, role, status, at: Date.now() });
}

export function getPresence(userId: string): PresenceStatus {
  const e = registry.get(userId);
  if (!e) return "offline";
  if (Date.now() - e.at > STALE_MS) return "offline";
  return e.status;
}

/** True if any employee/supervisor in the club is actively available. When this
 *  is false, the AI agents take over member conversations. */
export function isAnyStaffAvailable(clubId: string): boolean {
  const now = Date.now();
  for (const e of registry.values()) {
    if (
      e.clubId === clubId &&
      (e.role === "employee" || e.role === "supervisor") &&
      e.status === "available" &&
      now - e.at <= STALE_MS
    ) {
      return true;
    }
  }
  return false;
}
