import { useEffect, useRef, useState } from "react";
import { useUpdatePresence } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "available", label: "Available", dot: "bg-emerald-400" },
  { value: "busy", label: "Busy", dot: "bg-accent" },
  { value: "away", label: "Away", dot: "bg-orange-400" },
  { value: "dnd", label: "Do Not Disturb", dot: "bg-red-500" },
  { value: "offline", label: "Appear Offline", dot: "bg-white/30" },
] as const;

const STORAGE_KEY = "fairway360.presence";
// Only "available" means a human is actively covering member chats; every other
// status hands member conversations to the AI agents.
const VALID = new Set(OPTIONS.map((o) => o.value));

function initialStatus(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID.has(saved as never)) return saved;
  } catch {
    /* localStorage unavailable */
  }
  return "available";
}

/**
 * Staff presence selector (sidebar). The chosen status PERSISTS across page
 * navigations and reloads (localStorage) — it is no longer forced back to
 * "available" on every mount. A heartbeat keeps the status fresh so it doesn't
 * go stale (the server treats presence older than a few minutes as offline).
 */
export function PresenceControl() {
  const update = useUpdatePresence();
  const [status, setStatus] = useState<string>(initialStatus);
  const set = useRef(update);
  set.current = update;
  const statusRef = useRef(status);
  statusRef.current = status;

  // Push the current (persisted) status on mount, then heartbeat every 60s so
  // an open portal keeps the staffer's real status live.
  useEffect(() => {
    set.current.mutate({ data: { status: statusRef.current as never } });
    const id = setInterval(() => {
      set.current.mutate({ data: { status: statusRef.current as never } });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  function change(v: string) {
    setStatus(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    update.mutate({ data: { status: v as never } });
  }

  const cur = OPTIONS.find((o) => o.value === status) ?? OPTIONS[0];

  return (
    <div className="px-3 pb-2">
      <div className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", cur.dot)} />
        <select
          value={status}
          onChange={(e) => change(e.target.value)}
          data-testid="presence-select"
          className="w-full cursor-pointer appearance-none bg-transparent text-xs font-medium text-white/80 outline-none"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#071a10] text-white">
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
