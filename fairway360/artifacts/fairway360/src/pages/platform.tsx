import { Link } from "wouter";
import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";
import {
  PhoneCall, UserPlus, CalendarCheck, PartyPopper, Contact, Megaphone,
  Headset, UtensilsCrossed, ShoppingBag, BarChart3, Star, MessageSquare,
  ArrowRight, Check, Clock, Target, Users, TrendingUp, Flag, Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Seo } from "@/components/seo";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import infographic from "@assets/image_1781339694006.png";

type Feature = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  desc: string;
};

const features: Feature[] = [
  { icon: UserPlus, title: "Membership Sales", desc: "Capture, qualify & convert more memberships." },
  { icon: CalendarCheck, title: "Tee Times", desc: "AI books tee times, handles changes & maximizes course utilization." },
  { icon: PartyPopper, title: "Events", desc: "Promote, manage & fill events with AI automation." },
  { icon: Contact, title: "CRM", desc: "Centralize all member & prospect data in one intelligent CRM." },
  { icon: Megaphone, title: "Marketing", desc: "Targeted campaigns that fill your pipeline & keep members engaged." },
  { icon: Headset, title: "Member Support", desc: "Instant answers to member questions, anytime." },
  { icon: UtensilsCrossed, title: "Dining Reservations", desc: "AI handles dining reservations & member requests effortlessly." },
  { icon: ShoppingBag, title: "Pro Shop", desc: "Increase pro shop sales with AI recommendations & engagement." },
  { icon: BarChart3, title: "Analytics", desc: "Real-time dashboards & insights to track performance & drive growth." },
  { icon: Star, title: "Reviews", desc: "Automatically collect 5-star reviews & enhance your reputation." },
  { icon: MessageSquare, title: "Text Automation", desc: "Automated SMS conversations that nurture leads & drive engagement." },
  { icon: PhoneCall, title: "Voice AI", desc: "AI agents answer every call, 24/7, in your club's voice — never miss a lead." },
];

const stats = [
  { icon: Clock, value: "24/7", label: "Coverage" },
  { icon: Target, value: "More", label: "Leads" },
  { icon: Users, value: "More", label: "Members" },
  { icon: TrendingUp, value: "More", label: "Revenue" },
];

function FeatureNode({ f, className }: { f: Feature; className?: string }) {
  const Icon = f.icon;
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-2">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_0_22px_-8px_hsl(43_65%_55%/0.8)]">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="font-display text-base font-semibold leading-tight text-white">{f.title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-white/65">{f.desc}</p>
    </div>
  );
}

function HubCenter() {
  return (
    <div className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full border border-accent/50 bg-[radial-gradient(circle_at_30%_25%,_hsl(155_45%_18%),_hsl(155_55%_7%))] text-center shadow-[0_0_60px_-12px_hsl(43_65%_55%/0.6)] md:h-52 md:w-52">
      <span className="absolute -inset-1.5 rounded-full border border-accent/15" />
      <span className="absolute -inset-4 rounded-full border border-accent/10" />
      <Flag className="mb-2 h-7 w-7 text-accent" />
      <div className="font-semibold uppercase tracking-[0.18em] text-white">
        Fairway<span className="text-accent">360</span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-white/50">
        AI Club Operation System
      </div>
    </div>
  );
}

function RadialHub() {
  const R = 40;
  return (
    <div className="relative mx-auto hidden aspect-square w-full max-w-[1140px] lg:block">
      {/* connector lines */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="hub-line" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(43 65% 55%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(43 65% 55%)" stopOpacity="0.08" />
          </radialGradient>
        </defs>
        {features.map((_, i) => {
          const angle = (Math.PI * 2 * i) / features.length - Math.PI / 2;
          const x = 50 + R * Math.cos(angle);
          const y = 50 + R * Math.sin(angle);
          return (
            <g key={i}>
              <line x1="50" y1="50" x2={x} y2={y} stroke="url(#hub-line)" strokeWidth="0.35" />
              <circle cx={x} cy={y} r="0.8" fill="hsl(43 65% 55%)" fillOpacity="0.7" />
            </g>
          );
        })}
      </svg>

      {/* center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <HubCenter />
      </div>

      {/* nodes */}
      {features.map((f, i) => {
        const angle = (Math.PI * 2 * i) / features.length - Math.PI / 2;
        const x = 50 + R * Math.cos(angle);
        const y = 50 + R * Math.sin(angle);
        const alignRight = Math.cos(angle) < -0.25;
        const alignCenter = Math.abs(Math.cos(angle)) <= 0.25;
        return (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="absolute w-52 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            data-testid={`hub-node-${i}`}
          >
            <FeatureNode
              f={f}
              className={`rounded-xl border border-white/10 bg-[#04130c]/90 px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.9)] ${
                alignCenter ? "text-center [&_.flex]:justify-center" : alignRight ? "text-right [&_.flex]:flex-row-reverse" : "text-left"
              }`}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

type Section = {
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
  mock: ReactNode;
};

const sections: Section[] = [
  {
    eyebrow: "Lead Capture",
    title: "Never Miss Another Lead",
    text: "Fairway360 captures new membership inquiries, qualifies prospects, and routes every lead into your club pipeline.",
    bullets: ["Instant capture from calls & forms", "AI qualification & scoring", "Auto-routed into your pipeline"],
    mock: <LeadCaptureMock />,
  },
  {
    eyebrow: "Voice AI",
    title: "24/7 AI Voice Agent",
    text: "AI agents answer calls, respond to questions, book appointments, and keep your club available after hours.",
    bullets: ["Answers in your club's voice", "Books & reschedules appointments", "Round-the-clock coverage"],
    mock: <VoiceAgentMock />,
  },
  {
    eyebrow: "Analytics",
    title: "Executive Dashboard",
    text: "Track leads, calls answered, tee times booked, memberships sold, event registrations, and member satisfaction.",
    bullets: ["Real-time KPIs at a glance", "Calls, leads & tee times", "Member satisfaction tracking"],
    mock: <DashboardMock />,
  },
  {
    eyebrow: "Tee Times",
    title: "AI Tee Time Automation",
    text: "Let members and guests book tee times instantly while your team stays focused on the club experience.",
    bullets: ["Instant member & guest booking", "Smart change handling", "Maximized course utilization"],
    mock: <TeeTimeMock />,
  },
  {
    eyebrow: "CRM",
    title: "Intelligent CRM",
    text: "Centralize member and prospect data in one intelligent system built for golf clubs.",
    bullets: ["One source of truth", "Member & prospect profiles", "Purpose-built for golf clubs"],
    mock: <ProspectsMock />,
  },
  {
    eyebrow: "Member Support",
    title: "AI Concierge",
    text: "Give members instant help with tee times, dining reservations, events, tours, and club questions.",
    bullets: ["Tee times & dining", "Events & private tours", "Instant answers, anytime"],
    mock: <ConciergeMock />,
  },
];

function FeatureSection({ s, index }: { s: Section; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <motion.div
        initial={{ opacity: 0, x: reverse ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className={reverse ? "lg:order-2" : ""}
      >
        <p className="eyebrow mb-4 text-accent">{s.eyebrow}</p>
        <h3 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{s.title}</h3>
        <p className="mt-4 max-w-md text-white/65">{s.text}</p>
        <ul className="mt-6 space-y-3">
          {s.bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-white/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Check className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`relative ${reverse ? "lg:order-1" : ""}`}
      >
        <div className="absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(circle_at_center,_hsl(43_65%_55%/0.12),_transparent_70%)]" />
        <div className="mx-auto max-w-md">{s.mock}</div>
      </motion.div>
    </div>
  );
}

export function Platform() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Platform — One AI System for Every Club Operation | Fairway360"
        description="See the all-in-one Fairway360 platform: AI receptionist, tee-time automation, dining, membership, events, concierge, and analytics — unified in one system."
        path="/platform"
      />
      <Navbar />
      <main className="relative flex-1 overflow-hidden bg-[#04130c] text-white">
        {/* ambient backdrop */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_hsl(155_60%_18%/0.7),_transparent_70%)] blur-3xl" />
          <div className="absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        {/* hero */}
        <section className="px-4 pt-20 pb-12 text-center md:px-6 md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-4xl"
          >
            <div className="mb-6 flex items-center justify-center gap-3">
              <span className="h-px w-10 bg-accent" />
              <span className="eyebrow text-accent">AI Club Operation System</span>
              <span className="h-px w-10 bg-accent" />
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
              The All-in-One AI Platform
              <span className="mt-2 block text-accent">Built for Golf Clubs &amp; Country Clubs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/70">
              Capture every lead, answer every call, automate every follow-up, and keep your club
              operating at full capacity 24/7.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/demo" data-testid="link-hero-demo">
                  Book a Demo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <a href="#ecosystem" data-testid="link-hero-platform">See Platform</a>
              </Button>
            </div>
          </motion.div>

          {/* infographic hero image */}
          <motion.figure
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-14 max-w-5xl"
          >
            <div className="overflow-hidden rounded-2xl border border-accent/30 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-accent/10">
              <img
                src={infographic}
                alt="Fairway360 — the all-in-one AI platform ecosystem for golf clubs and country clubs"
                className="w-full"
                data-testid="img-infographic"
              />
            </div>
          </motion.figure>
        </section>

        {/* ecosystem / radial hub */}
        <section id="ecosystem" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-20">
          <div className="mb-12 text-center">
            <p className="eyebrow mb-4 text-accent">One Platform · Every Operation</p>
            <h2 className="text-3xl font-semibold md:text-4xl">Every operation, one connected system</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/65">
              Twelve AI-powered capabilities orbit a single intelligent core — working together to run
              your club around the clock.
            </p>
          </div>

          <RadialHub />

          {/* grid fallback (mobile / tablet) */}
          <div className="mx-auto max-w-3xl lg:hidden">
            <div className="mb-10 flex justify-center">
              <HubCenter />
            </div>
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: (i % 2) * 0.05 }}
                >
                  <FeatureNode f={f} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* six feature sections */}
        <section className="px-4 py-16 md:px-6 md:py-24">
          <div className="container mx-auto">
            <div className="mb-16 text-center">
              <p className="eyebrow mb-4 text-accent">See It In Action</p>
              <h2 className="text-3xl font-semibold md:text-4xl">A working system, not a slide deck</h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/65">
                Six AI-driven workflows that capture, qualify, and delight — from the first missed call
                to a confirmed tee time.
              </p>
            </div>

            <div className="mx-auto max-w-5xl space-y-20 md:space-y-28">
              {sections.map((s, i) => (
                <FeatureSection key={s.title} s={s} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* bottom CTA bar */}
        <section className="px-4 pb-24 md:px-6">
          <div className="container mx-auto">
            <div className="rounded-3xl border border-accent/25 bg-white/[0.03] p-8 backdrop-blur-xl md:p-12">
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <h2 className="mt-6 font-display text-3xl font-semibold leading-tight md:text-4xl">
                    Operate Your Club<br />
                    <span className="text-accent">Like The Top 1%.</span>
                  </h2>
                  <p className="mt-4 max-w-md text-white/65">
                    Fairway360 gives golf courses and country clubs the AI infrastructure to grow
                    memberships, increase engagement, and automate daily operations.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Link href="/demo" data-testid="link-platform-demo">
                        Book Your Fairway360 Demo <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                    >
                      <Link href="/solutions" data-testid="link-platform-solutions">Explore Solutions</Link>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div
                        key={s.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center"
                        data-testid={`stat-${s.label.toLowerCase()}`}
                      >
                        <Icon className="mx-auto mb-3 h-6 w-6 text-accent" />
                        <div className="font-display text-2xl font-bold">{s.value}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-white/55">{s.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ---------- product UI mockups (recreated from the infographic's six panels) ---------- */

function MockCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">{label}</div>
      {children}
    </div>
  );
}

function LeadCaptureMock() {
  return (
    <MockCard label="New Lead Captured">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-display font-semibold text-accent">JA</span>
        <div>
          <div className="font-medium text-white">John Anderson</div>
          <div className="text-xs text-white/55">(555) 723-4567</div>
        </div>
      </div>
      <div className="mt-4 text-sm text-white/65">Interested in Membership</div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent">
        <Check className="h-4 w-4" /> AI Qualified
      </div>
    </MockCard>
  );
}

function VoiceAgentMock() {
  return (
    <MockCard label="AI Voice Agent">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <PhoneCall className="h-5 w-5" />
        </span>
        <div className="text-sm text-white/70">Answering call…</div>
      </div>
      <div className="mt-6 flex h-14 items-end gap-1">
        {[6, 11, 8, 16, 22, 14, 9, 18, 24, 13, 7, 15, 10, 20, 12, 6, 14, 9].map((h, i) => (
          <span
            key={i}
            className="flex-1 rounded-full bg-accent/60"
            style={{ height: `${h * 2.2}px` }}
          />
        ))}
      </div>
      <div className="mt-4 text-xs text-white/55">
        "Thanks for calling Riverside Country Club — how can I help you today?"
      </div>
    </MockCard>
  );
}

function DashboardMock() {
  const cells = [
    { label: "Leads Today", val: "128", delta: "+28%" },
    { label: "Calls Answered", val: "247", delta: "+32%" },
    { label: "Memberships Sold", val: "18", delta: "+20%" },
    { label: "Tee Times Booked", val: "156", delta: "+18%" },
    { label: "Event Registrations", val: "73", delta: "+35%" },
    { label: "Member Satisfaction", val: "4.8", delta: "★★★★★" },
  ];
  return (
    <MockCard label="Executive Dashboard">
      <div className="grid grid-cols-2 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] text-white/55">{c.label}</div>
            <div className="font-display text-xl font-bold text-white">{c.val}</div>
            <div className="text-[10px] text-accent">{c.delta}</div>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function TeeTimeMock() {
  return (
    <MockCard label="Tee Time Confirmed">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
          <Check className="h-7 w-7" />
        </span>
        <div className="mt-4 font-display text-xl font-semibold text-white">Saturday, May 18</div>
        <div className="text-sm text-white/65">10:30 AM · Riverside Country Club</div>
        <div className="mt-4 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/70">
          Add to Calendar
        </div>
      </div>
    </MockCard>
  );
}

function ProspectsMock() {
  const rows = [
    { name: "John Anderson", stage: "New Lead" },
    { name: "Sarah Mitchell", stage: "Follow-Up" },
    { name: "Michael Brown", stage: "Tour Booked" },
    { name: "Emily Davis", stage: "Marketing" },
    { name: "David Wilson", stage: "Member" },
  ];
  return (
    <MockCard label="AI Prospects">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between text-sm">
            <span className="text-white/80">{r.name}</span>
            <span className="flex items-center gap-2 text-xs text-white/55">
              {r.stage}
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
          </div>
        ))}
      </div>
    </MockCard>
  );
}

function ConciergeMock() {
  const chips = ["Book a Tee Time", "Schedule a Tour", "Dining Reservation", "Event Information"];
  return (
    <MockCard label="AI Concierge">
      <div className="flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-3 py-2 text-sm text-white/80">
          Hello! How can I assist you today?
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {chips.map((c) => (
          <div
            key={c}
            className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5 text-sm text-white/80"
          >
            {c}
          </div>
        ))}
      </div>
    </MockCard>
  );
}
