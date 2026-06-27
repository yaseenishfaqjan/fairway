import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Bot } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListChannels,
  useGetChannelMessages,
  useSendChannelMessage,
  getGetChannelMessagesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * WhatsApp-style department channel chat. Self-contained: lists the club's
 * channels, shows the active thread, sends messages, and live-updates from the
 * /api/realtime/channels SSE stream. All data is real (no mock).
 */
export function ChannelChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const channelsQ = useListChannels();
  const channels = channelsQ.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeKey = activeId ?? channels[0]?.id ?? "";
  const active = channels.find((c) => c.id === activeKey);

  const messagesQ = useGetChannelMessages(activeKey, {
    query: { enabled: !!activeKey, queryKey: getGetChannelMessagesQueryKey(activeKey) },
  });
  const messages = messagesQ.data ?? [];
  const send = useSendChannelMessage();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Live updates: refetch the active channel when a new message arrives.
  useEffect(() => {
    if (!activeKey) return;
    const src = new EventSource("/api/realtime/channels");
    const onMsg = () =>
      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(activeKey) });
    src.addEventListener("channel.message", onMsg);
    return () => {
      src.removeEventListener("channel.message", onMsg);
      src.close();
    };
  }, [activeKey, queryClient]);

  // Auto-scroll to newest.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeKey]);

  async function submit() {
    const text = draft.trim();
    if (!text || !activeKey) return;
    setDraft("");
    try {
      await send.mutateAsync({ id: activeKey, data: { content: text } });
      queryClient.invalidateQueries({ queryKey: getGetChannelMessagesQueryKey(activeKey) });
    } catch {
      toast({ title: "Couldn't send", description: "Please try again.", variant: "destructive" });
      setDraft(text);
    }
  }

  return (
    <div className="flex h-[70vh] min-h-[460px] flex-col">
      {/* Channel chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {channels.map((c) => {
          const on = c.id === activeKey;
          return (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              data-testid={`channel-${c.key}`}
              className={cn(
                "press flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                on
                  ? "border-accent bg-accent/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white",
              )}
            >
              <span>{c.emoji}</span>
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Thread */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="font-display text-base font-semibold text-white">
            {active?.emoji} {active?.name ?? "Channels"}
          </div>
          {active?.description && <div className="text-xs text-white/50">{active.description}</div>}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-white/45">No messages yet — say hello 👋</p>
          )}
          {messages.map((m) => {
            const mine = !!m.senderUserId && m.senderUserId === user?.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={cn("flex flex-col", mine ? "items-end" : "items-start")}
                data-testid={`chatmsg-${m.id}`}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "bg-accent text-accent-foreground"
                      : m.aiGenerated
                        ? "border border-accent/30 bg-accent/10 text-white"
                        : "border border-white/10 bg-white/[0.06] text-white",
                  )}
                >
                  {!mine && (
                    <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-white/55">
                      {m.aiGenerated && <Bot className="h-3 w-3 text-accent" />}
                      {m.senderName}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </div>
                <div className="mt-0.5 px-1 text-[10px] text-white/35">{m.time}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={active ? `Message ${active.name}…` : "Select a channel"}
            disabled={!activeKey}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-accent/50"
            data-testid="channel-message-input"
          />
          <Button
            onClick={submit}
            disabled={!draft.trim() || send.isPending || !activeKey}
            className="press bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="channel-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
