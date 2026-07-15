// Timezone helpers so every club sees tee times in ITS OWN local time
// (Fairway360 serves clubs across all US timezones). We store the correct UTC
// instant and format for display in the club's IANA timezone via Intl.

/**
 * The absolute instant for a wall-clock date+time in a given IANA timezone.
 * e.g. zonedTime("2026-07-14", "08:00", "America/Chicago") → the Date whose
 * instant reads 8:00 AM in Chicago. Uses the standard Intl offset trick.
 */
export function zonedTime(dateStr: string, timeStr: string, tz: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{1,2}:\d{2}$/.test(timeStr)) return null;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  if ([y, mo, d, h, mi].some(Number.isNaN)) return null;

  // Naive: pretend the wall-clock is UTC.
  const asUTC = Date.UTC(y, mo - 1, d, h, mi);
  // What wall-clock does that instant actually show in `tz`?
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(asUTC));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shownUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  // The gap between shown and naive is the tz offset; remove it.
  const offset = shownUTC - asUTC;
  return new Date(asUTC - offset);
}

/**
 * "YYYY-MM-DD" for an instant as seen in the club's timezone. Analytics must
 * bucket by the CLUB's day, not UTC's — a 7pm Pacific order is still "today".
 */
export function dayKeyTz(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour of day (0-23) for an instant as seen in the club's timezone. */
export function hourTz(d: Date, tz: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", hour12: false }).format(d),
  ) % 24;
}

/** Today's "YYYY-MM-DD" in the club's timezone, offset by `deltaDays`. */
export function dayKeyOffsetTz(tz: string, deltaDays = 0): string {
  return dayKeyTz(new Date(Date.now() + deltaDays * 86_400_000), tz);
}

/** "8:00 AM" in the club's timezone. */
export function fmtTimeTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** "Jul 14" in the club's timezone. */
export function fmtDateShortTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(d);
}

/** "Tuesday, Jul 14" in the club's timezone. */
export function fmtDayTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);
}
