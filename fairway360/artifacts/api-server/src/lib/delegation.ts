// In-memory supervisor-delegation state per club (ephemeral, single-instance).
// When active, the Supervisor AI covers the Management channel within the
// configured autonomy level until the delegation expires.

export type Autonomy = "low" | "medium" | "high" | "full";

interface Delegation {
  active: boolean;
  autonomy: Autonomy;
  untilMs: number;
  byName: string;
  startedAtMs: number;
}

const registry = new Map<string, Delegation>();

export function setDelegation(
  clubId: string,
  autonomy: Autonomy,
  durationMinutes: number,
  byName: string,
): Delegation {
  const d: Delegation = {
    active: true,
    autonomy,
    untilMs: Date.now() + durationMinutes * 60_000,
    byName,
    startedAtMs: Date.now(),
  };
  registry.set(clubId, d);
  return d;
}

export function endDelegation(clubId: string): void {
  registry.delete(clubId);
}

export function getDelegation(clubId: string): Delegation | null {
  const d = registry.get(clubId);
  if (!d) return null;
  if (Date.now() > d.untilMs) {
    registry.delete(clubId);
    return null;
  }
  return d;
}

export function isDelegated(clubId: string): boolean {
  return getDelegation(clubId) !== null;
}
