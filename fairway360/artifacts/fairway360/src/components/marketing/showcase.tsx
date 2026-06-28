import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import {
  UtensilsCrossed, CalendarCheck, Phone, Star, CreditCard, Sparkles,
  TrendingUp, Bot, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── §8.6 Marquee strip ─────────────────────────────────────────────────── */
export function MarqueeStrip({ items, className }: { items: string[]; className?: string }) {
  const Row = (
    <div className="flex shrink-0 items-center gap-10 pr-10" aria-hidden>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-white/55">
          <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
          {it}
        </span>
      ))}
    </div>
  );
  return (
    <div className={cn("fw-marquee w-full", className)}>
      <div className="fw-marquee-track">
        {Row}
        {Row}
      </div>
    </div>
  );
}

/* ── §8.3 Live activity feed ────────────────────────────────────────────── */
const FEED_POOL = [
  { icon: UtensilsCrossed, color: "text-[hsl(145_58%_55%)]", text: "New food order — Hole 7" },
  { icon: CalendarCheck, color: "text-[hsl(145_58%_55%)]", text: "Tee time booked · Saturday 9:40" },
  { icon: Phone, color: "text-red-400", text: "Missed call recovered → text sent" },
  { icon: Star, color: "text-accent", text: "5-star review received ★★★★★" },
  { icon: CreditCard, color: "text-accent", text: "Member balance paid · $248" },
  { icon: Sparkles, color: "text-[hsl(145_58%_55%)]", text: "Wedding inquiry auto-replied" },
  { icon: CalendarCheck, color: "text-[hsl(145_58%_55%)]", text: "Cart service dispatched · Hole 3" },
];
type FeedItem = { id: number; icon: typeof Phone; color: string; text: string; t: string };
let feedUid = 0;

export function LiveActivityFeed() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const cursor = useRef(0);
  const [items, setItems] = useState<FeedItem[]>(() =>
    FEED_POOL.slice(0, 4).map((e, i) => ({ ...e, id: ++feedUid, t: i === 0 ? "now" : `${i * 2}m ago` })),
  );

  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => {
      cursor.current = (cursor.current + 1) % FEED_POOL.length;
      const e = FEED_POOL[cursor.current];
      setItems((prev) => {
        const aged = prev.map((p) => ({ ...p, t: p.t === "now" ? "1m ago" : p.t }));
        return [{ ...e, id: ++feedUid, t: "now" }, ...aged].slice(0, 6);
      });
    }, 2600);
    return () => clearInterval(id);
  }, [inView, reduce]);

  return (
    <div ref={ref} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm font-semibold text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live activity
        </span>
        <span className="text-[11px] text-white/40">real-time</span>
      </div>
      <div className="relative space-y-2 [mask-image:linear-gradient(to_bottom,#000_75%,transparent)]">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div
              key={it.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5", it.color)}>
                <it.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/80">{it.text}</span>
              <span className="shrink-0 text-[11px] text-white/40">{it.t}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── §8.4 AI cycling suggestions ────────────────────────────────────────── */
const AI_SUGGESTIONS = [
  { label: "Revenue opportunity", body: "3 members haven't booked in 30 days — send a win-back offer?" },
  { label: "Staffing", body: "Saturday tee sheet is 92% full — add a beverage cart shift?" },
  { label: "Reputation", body: "New 5-star review — auto-thank the member and share to Google?" },
  { label: "Events", body: "Wedding lead idle 2 days — send the venue brochure now?" },
];

export function AICyclingPanel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setI((p) => (p + 1) % AI_SUGGESTIONS.length), 3400);
    return () => clearInterval(id);
  }, [inView, reduce]);

  const s = AI_SUGGESTIONS[i];
  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
      <div className="mb-4 flex items-center gap-3">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
          <span className="absolute inset-0 animate-ping rounded-xl bg-accent/20" style={reduce ? { animation: "none" } : undefined} />
          <Bot className="relative h-5 w-5" />
        </span>
        <div>
          <div className="font-display text-sm font-semibold text-white">AI Co-Pilot</div>
          <div className="text-[11px] text-white/45">always watching your operation</div>
        </div>
      </div>
      <div className="relative min-h-[92px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-accent/20 bg-accent/[0.06] p-4"
          >
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-accent">{s.label}</div>
            <div className="text-sm text-white/85">{s.body}</div>
            <div className="mt-3 flex gap-2">
              <span className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">Approve</span>
              <span className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-white/60">Dismiss</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {AI_SUGGESTIONS.map((_, k) => (
          <span key={k} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-5 bg-accent" : "w-1.5 bg-white/20")} />
        ))}
      </div>
    </div>
  );
}

/* ── §8.5 Three portals — live mini-screens ─────────────────────────────── */
function Bars() {
  return (
    <div className="flex h-12 items-end gap-1.5">
      {[0.5, 0.8, 0.4, 0.95, 0.65, 0.85].map((h, i) => (
        <span
          key={i}
          className="flex-1 origin-bottom rounded-sm bg-[hsl(145_58%_45%)]/70"
          style={{ height: `${h * 100}%`, animation: `fw-bar 3s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

function MiniScreen({ title, accent, children, i }: { title: string; accent: string; children: React.ReactNode; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: i * 0.1 }}
      className="fw-glow relative overflow-hidden rounded-2xl border border-white/10 bg-[#06180f]/90 p-4"
    >
      <div className="fw-scanline pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/[0.06] to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-white">{title}</span>
        <span className="flex items-center gap-1.5 text-[10px] text-white/50">
          <span className={cn("h-1.5 w-1.5 rounded-full", accent)} style={{ animation: "fw-blink 1.6s ease-in-out infinite" }} />
          LIVE
        </span>
      </div>
      {children}
    </motion.div>
  );
}

export function PortalMiniScreens() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [rev, setRev] = useState(48230);
  const [tasks, setTasks] = useState([false, false, true]);

  useEffect(() => {
    if (!inView || reduce) return;
    const r = setInterval(() => setRev((v) => v + Math.round(40 + (v % 7) * 11)), 1800);
    const a = setInterval(() => setTasks((t) => [t[2], t[0], t[1]]), 2600);
    return () => {
      clearInterval(r);
      clearInterval(a);
    };
  }, [inView, reduce]);

  return (
    <div ref={ref} className="grid gap-5 md:grid-cols-3">
      <MiniScreen title="Supervisor" accent="bg-emerald-400" i={0}>
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[10px] text-white/50">Today's revenue</div>
          <div className="font-display text-xl font-semibold text-white">${rev.toLocaleString()}</div>
        </div>
        <Bars />
      </MiniScreen>

      <MiniScreen title="Employee" accent="bg-accent" i={1}>
        <div className="space-y-2">
          {["Prep Hole 7 order", "Restock halfway house", "Clear cart 12"].map((task, k) => (
            <div key={task} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/75">
              <span className={cn("flex h-4 w-4 items-center justify-center rounded border", tasks[k] ? "border-emerald-400 bg-emerald-400/20 text-emerald-300" : "border-white/25")}>
                {tasks[k] && <CheckCircle2 className="h-3 w-3" />}
              </span>
              <span className={cn(tasks[k] && "text-white/40 line-through")}>{task}</span>
            </div>
          ))}
        </div>
      </MiniScreen>

      <MiniScreen title="Member" accent="bg-[hsl(145_58%_55%)]" i={2}>
        <div className="mb-3 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <CalendarCheck className="h-4 w-4" /> Tee time confirmed
          </div>
          <div className="mt-1 text-[11px] text-white/55">Saturday · 9:40 AM · 4 players</div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
          <span className="flex items-center gap-2 text-xs text-white/75"><TrendingUp className="h-4 w-4 text-accent" /> Book another</span>
          <span className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground" style={{ animation: "fw-pulse-soft 2s ease-in-out infinite" }}>Book</span>
        </div>
      </MiniScreen>
    </div>
  );
}
