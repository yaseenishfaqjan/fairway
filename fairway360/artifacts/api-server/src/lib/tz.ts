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
