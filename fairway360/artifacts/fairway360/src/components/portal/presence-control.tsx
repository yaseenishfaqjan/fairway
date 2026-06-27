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

/**
 * Staff presence selector (sidebar). Defaults to "available" on mount so an
 * open staff portal means humans are covering; switching to away/offline/DND
 * lets the AI agents take over member conversations.
 */
export function PresenceControl() {
  const update = useUpdatePresence();
  const [status, setStatus] = useState<string>("available");
  const set = useRef(update);
  set.current = update;

  useEffect(() => {
    set.current.mutate({ data: { status: "available" } });
  }, []);

  function change(v: string) {
    setStatus(v);
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
