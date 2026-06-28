// Per-club cost guard for AI channel-agent replies. Fixed window, in-memory
// (single-instance, like the presence/delegation guards). Prevents a burst of
// member messages from running up unbounded Anthropic spend; throttled replies
// are simply skipped (the member's message still posts and staff can answer).

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 5 * 60_000;
const MAX_REPLIES = 60; // AI channel replies per club per 5-minute window

const windows = new Map<string, Window>();

export function allowAgentReply(clubId: string): boolean {
  const now = Date.now();
  const w = windows.get(clubId);
  if (!w || now > w.resetAt) {
    windows.set(clubId, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (w.count >= MAX_REPLIES) return false;
  w.count += 1;
  return true;
}
