import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Heart,
  Briefcase,
  Trophy,
  Users,
  Snowflake,
  Wine,
  PartyPopper,
  UtensilsCrossed,
  Megaphone,
  BarChart3,
  ClipboardCheck,
  Crown,
  CalendarDays,
  Flag,
  Clock,
  Layers,
  TrendingUp,
  Check,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Seo } from "@/components/seo";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { RevealText } from "@/components/anim/reveal";
import { breadcrumb } from "@/lib/seo-schema";

type EventType = {
  icon: LucideIcon;
  title: string;
  tagline: string;
  features: string[];
  href: string;
};

const eventTypes: EventType[] = [
  {
    icon: Heart,
    title: "Weddings",
    tagline: "Unforgettable weddings, effortlessly managed.",
    features: ["Inquiry capture", "Venue tour scheduling", "Custom proposals", "Vendor coordination", "Timeline management"],
    href: "/demo",
  },
  {
    icon: Briefcase,
    title: "Corporate Outings",
    tagline: "Impress clients. Build stronger teams.",
    features: ["Group bookings", "Custom packages", "Catering coordination", "Branded experiences", "Billing & invoicing"],
    href: "/demo",
  },
  {
    icon: Trophy,
    title: "Golf Tournaments",
    tagline: "Run flawless tournaments, start to finish.",
    features: ["Online registration", "Player & team management", "Live scoring", "Sponsor packages", "Prize tracking"],
    href: "/demo",
  },
  {
    icon: Users,
    title: "Member Events",
    tagline: "Bring your community together.",
    features: ["Event calendar", "RSVP management", "Member invitations", "Reminders & follow-ups", "Attendance tracking"],
    href: "/demo",
  },
  {
    icon: Snowflake,
    title: "Holiday & Seasonal",
    tagline: "Sell out every seasonal celebration.",
    features: ["Themed event setup", "Ticketing & deposits", "Capacity management", "Waitlists", "Automated promotions"],
    href: "/demo",
  },
  {
    icon: Wine,
    title: "Banquets & Galas",
    tagline: "Elevate every formal occasion.",
    features: ["Seating charts", "Menu selection", "AV coordination", "Guest management", "Run-of-show planning"],
    href: "/demo",
  },
  {
    icon: PartyPopper,
    title: "Private Parties",
    tagline: "Birthdays, anniversaries, and celebrations.",
    features: ["Quick booking", "Package selection", "Deposit collection", "Custom requests", "Confirmation automation"],
    href: "/demo",
  },
  {
    icon: UtensilsCrossed,
    title: "Catering & F&B",
    tagline: "Exceptional food for every gathering.",
    features: ["Menu customization", "Dietary tracking", "Headcount management", "Kitchen coordination", "Service scheduling"],
    href: "/dining",
  },
  {
    icon: Megaphone,
    title: "Event Marketing",
    tagline: "Fill your calendar automatically.",
    features: ["Email & SMS campaigns", "Event landing pages", "Lead nurturing", "Promotional offers", "Social integration"],
    href: "/automations",
  },
  {
    icon: ClipboardCheck,
    title: "Event Operations",
    tagline: "Coordinate every detail seamlessly.",
    features: ["Task assignment", "Staff scheduling", "Setup checklists", "Vendor management", "Day-of coordination"],
    href: "/automations",
  },
  {
    icon: BarChart3,
    title: "Event Analytics",
    tagline: "Know what drives event revenue.",
    features: ["Booking trends", "Revenue tracking", "Lead conversion", "Popular packages", "Executive reports"],
    href: "/platform",
  },
];

const enterpriseHighlights = [
  "Automated inquiry capture",
  "Proposals in minutes",
  "Every lead followed up",
  "More booked events",
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Events() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Golf Club Event Automation | Fairway360"
        description="Capture, follow up, and convert more weddings, corporate outings, and club events with AI automation."
        path="/events"
        jsonLd={[breadcrumb([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }])]}
      />
      <Navbar />
      <main className="flex-1 bg-[#04130c] text-white">
        <EventsHero />
        <EventsGrid />
        <TransformCTA />
      </main>
      <Footer />
    </div>
  );
}

function EventsHero() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-16 md:px-6 md:pt-28 md:pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_-5%,_hsl(155_55%_18%/0.6),_transparent_60%)]" />
        <div className="absolute -top-24 right-10 h-[460px] w-[460px] rounded-full bg-[hsl(145_58%_45%)]/10 blur-[120px]" />
      </div>
      <div className="container mx-auto grid items-center gap-12 lg:grid-cols-2">
        <div className="max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl"
          >
            Golf Club Event Management
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="mb-5 text-xl font-medium text-[hsl(145_58%_52%)] md:text-2xl"
          >
            Every Event. Every Detail. Effortlessly Managed.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="text-lg leading-relaxed text-white/70"
          >
            From weddings and tournaments to corporate outings and member
            galas, Fairway360 captures every inquiry, builds proposals, and
            automates follow-ups — so your team books more events with less work.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_120%_at_70%_10%,_hsl(150_45%_16%),_hsl(155_50%_7%))] p-6 shadow-2xl md:p-8"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[hsl(145_58%_45%)]/15 blur-3xl" />
          <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-[#04130c]/70 p-5 backdrop-blur-md">
            <div className="flex flex-col items-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                <CalendarDays className="h-8 w-8" />
              </span>
              <span className="mt-2 font-display text-lg font-semibold tracking-widest text-white/80">AI</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Intelligence Behind Every Event
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Our AI agents respond to every inquiry instantly, send custom
                proposals, and nurture leads through booking — so no opportunity
                slips through the cracks.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function EventsGrid() {
  return (
    <section className="px-4 pb-20 md:px-6 md:pb-28">
      <div className="container mx-auto">
        <div className="mb-12 flex items-center justify-center gap-4">
          <span className="hidden h-px max-w-[120px] flex-1 bg-gradient-to-r from-transparent to-accent/50 sm:block" />
          <RevealText as="h2" className="text-center font-display text-2xl font-semibold md:text-3xl lg:text-4xl">
            Every Event Your Club Hosts
          </RevealText>
          <span className="hidden h-px max-w-[120px] flex-1 bg-gradient-to-l from-transparent to-accent/50 sm:block" />
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {eventTypes.map((evt) => (
            <motion.div key={evt.title} variants={fadeUp}>
              <Link
                href={evt.href === "/demo" ? `/demo?problem=events&topic=${encodeURIComponent(evt.title)}` : evt.href}
                className="fw-glow group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[hsl(145_58%_45%)]/40"
                data-testid={`card-event-${evt.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                  <evt.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-lg font-semibold leading-snug text-white">{evt.title}</h3>
                <p className="mb-4 mt-1 text-sm text-white/55">{evt.tagline}</p>
                <ul className="mb-5 space-y-2">
                  {evt.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(145_58%_55%)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[hsl(145_58%_55%)]">
                  Learn More
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </motion.div>
          ))}

          <motion.div variants={fadeUp}>
            <div className="flex h-full flex-col rounded-2xl border border-accent/50 bg-accent/[0.07] p-6 shadow-[0_0_40px_-12px_hsl(43_65%_55%/0.5)]">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
                <Crown className="h-6 w-6" />
              </span>
              <h3 className="font-display text-lg font-semibold text-accent">All Events. One Platform.</h3>
              <p className="mb-4 mt-1 text-sm text-white/70">
                Fairway360 runs every event your club hosts from a single
                intelligent system.
              </p>
              <ul className="mb-5 space-y-2">
                {enterpriseHighlights.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-auto bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/demo?problem=events&topic=Events" data-testid="button-events-all-demo">Request Demo</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function TransformCTA() {
  const stats = [
    { icon: Clock, val: "24/7", label: "Inquiry Capture" },
    { icon: Layers, val: "Every Event", label: "One Platform" },
    { icon: TrendingUp, val: "More Bookings", label: "Less Work" },
  ];
  return (
    <section className="px-4 pb-24 md:px-6 md:pb-32">
      <div className="container mx-auto">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                <Flag className="h-8 w-8" />
              </span>
              <div>
                <RevealText as="h2" className="font-display text-2xl font-semibold md:text-3xl">
                  Ready to Book More Events?
                </RevealText>
                <p className="mt-2 max-w-md text-sm text-white/60">
                  See how Fairway360 helps your club capture every event lead,
                  send proposals faster, and grow event revenue.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <s.icon className="h-6 w-6 text-[hsl(145_58%_55%)]" />
                  <div>
                    <div className="font-display text-base font-semibold text-white">{s.val}</div>
                    <div className="text-xs text-white/55">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex justify-center border-t border-white/10 pt-8">
            <Button asChild size="lg" className="h-14 bg-accent px-10 text-base text-accent-foreground hover:bg-accent/90">
              <Link href="/demo?problem=events&topic=Events" data-testid="button-events-transform-demo">
                Request Your Personalized Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
