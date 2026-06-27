import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, AlertTriangle, X, Check } from "lucide-react";
import { useGetMyHandoff } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Agent handoff summary shown to staff: what the AI agents handled in the
 * channels while they were away (replies per channel + escalations raised).
 * Dismissible with "Mark Reviewed". Renders nothing when there's no activity.
 */
export function HandoffPanel() {
  const [dismissed, setDismissed] = useState(false);
  const { data: h } = useGetMyHandoff();

  if (
    dismissed ||
    !h ||
    (h.totalAgentReplies === 0 && h.openEscalations === 0)
  ) {
    return null;
  }

  const channels = h.channels ?? [];
  const escs = h.escalations ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-5"
      data-testid="handoff-panel"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">AI Coverage Summary</h3>
            <p className="text-xs text-white/55">
              While you were away, the agents handled {h.totalAgentReplies} message
              {h.totalAgentReplies === 1 ? "" : "s"} across {channels.length} channel
              {channels.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {channels.length > 0 && (
        <div className="space-y-2">
          {channels.map((c, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {c.emoji} {c.name}
                </span>
                <span className="text-xs text-accent">{c.replies} AI repl{c.replies === 1 ? "y" : "ies"}</span>
              </div>
              {c.lastReply && (
                <p className="mt-1 truncate text-xs text-white/55">Last: {c.lastReply}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {escs.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Escalations raised</div>
          {escs.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-white/75">
              <AlertTriangle className={cn("h-3.5 w-3.5", e.level >= 3 ? "text-red-300" : "text-accent")} />
              <span className="font-medium text-white">{e.member}</span>
              <span className="text-white/45">· {e.triggerType?.replace(/_/g, " ") ?? "issue"}</span>
              <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-[10px]", e.status === "resolved" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : "border-accent/30 bg-accent/15 text-accent")}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button size="sm" className="press bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDismissed(true)} data-testid="handoff-reviewed">
          <Check className="mr-1.5 h-4 w-4" />Mark Reviewed
        </Button>
      </div>
    </motion.div>
  );
}
