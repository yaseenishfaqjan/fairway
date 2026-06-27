import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MemberOnCourse, CourseStatus } from "@/lib/portal-data";

const statusColor: Record<CourseStatus, string> = {
  "Playing": "bg-white text-[hsl(146_46%_17%)]",
  "Needs Assistance": "bg-red-500 text-white",
  "Cart Request": "bg-accent text-accent-foreground",
  "Food Order": "bg-blue-500 text-white",
};

const statusRing: Record<CourseStatus, string> = {
  "Playing": "ring-white/70",
  "Needs Assistance": "ring-red-400",
  "Cart Request": "ring-accent",
  "Food Order": "ring-blue-400",
};

interface CourseMapProps {
  members: MemberOnCourse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CourseMap({ members, selectedId, onSelect }: CourseMapProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/10 shadow-inner" style={{ aspectRatio: "16 / 10" }}>
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="rough" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(110 32% 42%)" />
            <stop offset="100%" stopColor="hsl(120 30% 36%)" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#rough)" />

        {/* fairways */}
        <g fill="hsl(105 45% 55%)" opacity="0.95">
          <path d="M70 90 Q160 60 240 130 Q300 185 230 230 Q150 260 110 200 Q70 150 70 90 Z" />
          <path d="M420 70 Q540 80 560 160 Q565 220 480 230 Q420 235 410 170 Q405 110 420 70 Z" />
          <path d="M610 280 Q720 250 740 350 Q745 420 650 430 Q580 430 580 360 Q580 305 610 280 Z" />
          <path d="M300 330 Q400 300 420 380 Q425 450 330 460 Q260 460 260 400 Q260 350 300 330 Z" />
          <path d="M120 360 Q220 350 230 430 Q230 480 150 480 Q90 480 90 430 Q90 385 120 360 Z" />
        </g>

        {/* greens */}
        <g fill="hsl(95 55% 62%)">
          <circle cx="120" cy="110" r="26" />
          <circle cx="500" cy="100" r="24" />
          <circle cx="700" cy="320" r="26" />
          <circle cx="360" cy="360" r="24" />
          <circle cx="150" cy="410" r="22" />
        </g>

        {/* water hazards */}
        <g fill="hsl(200 60% 55%)" opacity="0.9">
          <ellipse cx="330" cy="240" rx="55" ry="28" />
          <ellipse cx="660" cy="180" rx="40" ry="24" />
        </g>

        {/* sand bunkers */}
        <g fill="hsl(45 60% 80%)">
          <ellipse cx="225" cy="150" rx="20" ry="12" />
          <ellipse cx="470" cy="180" rx="18" ry="11" />
          <ellipse cx="640" cy="380" rx="20" ry="12" />
          <ellipse cx="300" cy="420" rx="16" ry="10" />
        </g>

        {/* cart paths */}
        <g stroke="hsl(40 30% 88%)" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round">
          <path d="M120 110 Q260 200 330 240 Q450 280 500 100" />
          <path d="M500 200 Q560 280 700 320 Q600 400 360 360 Q220 420 150 410" />
        </g>
      </svg>

      {/* hole flags */}
      {[
        { n: 1, x: 15, y: 22 }, { n: 4, x: 62, y: 20 }, { n: 9, x: 87, y: 64 },
        { n: 12, x: 45, y: 72 }, { n: 15, x: 19, y: 82 },
      ].map((f) => (
        <div key={f.n} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${f.x}%`, top: `${f.y}%` }}>
          <div className="flex flex-col items-center">
            <div className="rounded-sm bg-red-600 px-1 text-[9px] font-bold leading-tight text-white shadow">{f.n}</div>
            <div className="h-3 w-px bg-white/80" />
          </div>
        </div>
      ))}

      {/* member markers */}
      {members.map((m) => {
        const selected = m.id === selectedId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            aria-pressed={selected}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(115_32%_42%)]"
            style={{ left: `${m.x}%`, top: `${m.y}%`, zIndex: selected ? 30 : 20 }}
            data-testid={`marker-${m.id}`}
            aria-label={`${m.name} on hole ${m.hole}, ${m.status}`}
          >
            <span className="relative flex items-center justify-center">
              {(m.status === "Needs Assistance" || selected) && (
                <motion.span
                  className={cn("absolute inline-flex h-full w-full rounded-full", m.status === "Needs Assistance" ? "bg-red-500/40" : "bg-white/40")}
                  animate={{ scale: [1, 2.1], opacity: [0.7, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <span
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold shadow-lg ring-2 transition-transform",
                  statusColor[m.status],
                  selected ? "scale-125 ring-4" : statusRing[m.status],
                )}
              >
                {m.initials}
              </span>
            </span>
          </button>
        );
      })}

      {/* legend */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-black/45 px-2.5 py-1.5 text-[10px] font-medium text-white backdrop-blur-sm">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white" />Playing</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Assistance</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Cart</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Food</span>
      </div>
    </div>
  );
}
