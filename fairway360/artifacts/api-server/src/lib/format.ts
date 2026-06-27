// Display formatters. The seed stores absolute calendar values using a UTC
// clock (e.g. Date.UTC(2026, 5, 13, 7, 10) for "7:10 AM"), so absolute fields
// are formatted with UTC getters to round-trip exactly. Relative fields
// ("3 min ago", "1h 12m") are computed against real now.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

export function fmtTime(d: Date): string {
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

export function fmtDateShort(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function weekday(d: Date): string {
  return WEEKDAYS[d.getUTCDay()]!;
}

/** "Today" when the date is the current UTC day, else the weekday name. */
export function dayLabel(d: Date, now = new Date()): string {
  if (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  ) {
    return "Today";
  }
  return weekday(d);
}

/** Order-style elapsed label: "just now", "3 min ago", "2h ago", "Yesterday". */
export function fmtAgoLong(d: Date, now = new Date()): string {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/** Lead-style compact label: "8m ago", "1h ago", "Yesterday", "2d ago". */
export function fmtAgoShort(d: Date, now = new Date()): string {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/** Elapsed since a start time, "1h 12m". */
export function fmtSince(d: Date, now = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** A "YYYY-MM-DD" date column → "Jun 20". */
export function fmtDateColumn(iso: string): string {
  const [y, mo, da] = iso.split("-").map(Number);
  void y;
  return `${MONTHS[(mo ?? 1) - 1]} ${da}`;
}

/** Time-off range: "Jun 20 – Jun 22" or single "Jul 4". */
export function fmtDateRange(startIso: string, endIso: string): string {
  if (startIso === endIso) return fmtDateColumn(startIso);
  return `${fmtDateColumn(startIso)} – ${fmtDateColumn(endIso)}`;
}

/** Tee-time status enum → frontend display caps. */
export function teeTimeStatusLabel(s: string): string {
  switch (s) {
    case "checked_in":
      return "Checked In";
    case "confirmed":
      return "Confirmed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    default:
      return s;
  }
}
