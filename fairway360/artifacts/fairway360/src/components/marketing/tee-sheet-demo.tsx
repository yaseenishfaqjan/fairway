import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flag, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Slot = { id: number; time: string; booked: boolean; name?: string; fee: number; flash?: boolean };

const NAMES = ["A. Carter", "M. Rivera", "J. Patel", "S. Nguyen", "R. Brooks", "T. Okafor", "L. Schmidt", "D. Park"];
const TIMES = ["7:00", "7:10", "7:20", "7:30", "7:40", "7:50", "8:00", "8:10", "8:20", "8:30", "8:40", "8:50"];
const FEE = (i: number) => 45 + ((i * 7) % 6) * 10; // 45–95, deterministic

function seed(): Slot[] {
  const pre = new Set([0, 3, 4, 8]);
  return TIMES.map((time, i) => ({
    id: i,
    time,
    booked: pre.has(i),
    name: pre.has(i) ? NAMES[i % NAMES.length] : undefined,
    fee: FEE(i),
  }));
}

/**
 * §9.1 — interactive Tee Sheet. Click an open slot to book it (gold→green flash),
 * KPIs update live; "Simulate demand" books several at once; "Reset" rebuilds.
 * Self-contained demo state — not wired to the API.
 */
export function TeeSheetDemo() {
  const reduce = useReducedMotion();
  const [slots, setSlots] = useState<Slot[]>(seed);
  const nameCursor = useRef(0);

  const booked = slots.filter((s) => s.booked);
  const fill = Math.round((booked.length / slots.length) * 100);
  const revenue = booked.reduce((sum, s) => sum + s.fee, 0);

  function book(id: number) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id || s.booked) return s;
        const name = NAMES[nameCursor.current++ % NAMES.length];
        return { ...s, booked: true, name, flash: !reduce };
      }),
    );
    if (!reduce) {
      setTimeout(() => setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, flash: false } : s))), 650);
    }
  }

  function simulate() {
    const open = slots.filter((s) => !s.booked).map((s) => s.id);
    open.slice(0, 5).forEach((id, k) => setTimeout(() => book(id), reduce ? 0 : k * 260));
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#06180f]/80 p-5 backdrop-blur-xl md:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <Flag className="h-5 w-5 text-accent" /> Tee Sheet · Saturday
        </div>
        <div className="flex gap-2">
          <button onClick={simulate} className="press inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90" data-testid="tee-simulate">
            <Zap className="h-4 w-4" /> Simulate demand
          </button>
          <button onClick={() => setSlots(seed())} className="press inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/75 hover:bg-white/10" data-testid="tee-reset">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Booked", value: `${booked.length}/${slots.length}` },
          { label: "Fill rate", value: `${fill}%` },
          { label: "Revenue", value: `$${revenue.toLocaleString()}` },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <motion.div key={k.value} initial={{ opacity: 0.4, y: reduce ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} className="font-display text-xl font-semibold text-white">
              {k.value}
            </motion.div>
            <div className="text-[11px] uppercase tracking-wide text-white/45">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((s) => (
          <button
            key={s.id}
            onClick={() => book(s.id)}
            disabled={s.booked}
            data-testid={`tee-slot-${s.id}`}
            className={cn(
              "relative flex flex-col items-start rounded-xl border p-3 text-left transition-colors",
              s.booked
                ? "cursor-default border-emerald-400/25 bg-emerald-500/10"
                : "border-white/12 bg-white/[0.03] hover:border-accent/50 hover:bg-accent/[0.06]",
              s.flash && "border-accent bg-accent/30",
            )}
          >
            <span className="text-sm font-semibold text-white">{s.time}</span>
            {s.booked ? (
              <span className="mt-1 truncate text-xs text-emerald-300">{s.name}</span>
            ) : (
              <span className="mt-1 text-xs text-white/45">Open · ${s.fee}</span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-white/40">Tap an open slot to book it — KPIs update live.</p>
    </div>
  );
}
