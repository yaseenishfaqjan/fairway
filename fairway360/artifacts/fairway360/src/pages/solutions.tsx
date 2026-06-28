import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Phone,
  Calendar,
  UtensilsCrossed,
  Users,
  PartyPopper,
  MessageSquare,
  ShoppingBag,
  Star,
  ClipboardCheck,
  BarChart3,
  Building2,
  Crown,
  Brain,
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

type Solution = {
  icon: LucideIcon;
  title: string;
  tagline: string;
  features: string[];
  href: string;
};

const solutions: Solution[] = [
  {
    icon: Phone,
    title: "AI Receptionist",
    tagline: "Never miss another call or opportunity.",
    features: ["24/7 call answering", "Missed call text back", "Lead capture & qualification", "Call routing", "Voicemail to email/text"],
    href: "/automations",
  },
  {
    icon: Calendar,
    title: "Tee Time Automation",
    tagline: "Fill more tee times. Spend less time.",
    features: ["Online booking", "Automated reminders", "Waitlist management", "No-show reduction", "Review requests"],
    href: "/automations",
  },
  {
    icon: UtensilsCrossed,
    title: "Dining Automation",
    tagline: "Let members order from anywhere on the course.",
    features: ["Mobile food ordering", "Cart delivery ordering", "Hole-specific delivery", "Kitchen dashboard", "Order notifications"],
    href: "/dining",
  },
  {
    icon: Users,
    title: "Membership Automation",
    tagline: "Convert more leads. Retain more members.",
    features: ["Lead capture & follow-up", "Tour scheduling", "Application tracking", "Renewal reminders", "New member onboarding"],
    href: "/automations",
  },
  {
    icon: PartyPopper,
    title: "Event & Wedding Automation",
    tagline: "Book more events. Increase revenue.",
    features: ["Wedding inquiries", "Corporate outings", "Tournament registration", "Automated proposals", "Event pipeline management"],
    href: "/automations",
  },
  {
    icon: MessageSquare,
    title: "AI Concierge",
    tagline: "Instant answers. Exceptional service.",
    features: ["Member support 24/7", "Club information", "Dining assistance", "Event information", "Personalized recommendations"],
    href: "/automations",
  },
  {
    icon: ShoppingBag,
    title: "Pro Shop Automation",
    tagline: "Drive more sales. Delight more members.",
    features: ["Product promotions", "Inventory notifications", "Club fitting requests", "Special offers", "Purchase tracking"],
    href: "/automations",
  },
  {
    icon: Star,
    title: "Reputation Management",
    tagline: "More 5-star reviews. Stronger reputation.",
    features: ["Review generation", "Google review requests", "Member feedback", "Reputation monitoring", "Service recovery workflows"],
    href: "/automations",
  },
  {
    icon: ClipboardCheck,
    title: "Staff Operations",
    tagline: "Streamline tasks. Improve accountability.",
    features: ["Task management", "Maintenance requests", "Internal workflows", "Team notifications", "Department routing"],
    href: "/automations",
  },
  {
    icon: BarChart3,
    title: "Club Analytics",
    tagline: "Real-time insights. Smarter decisions.",
    features: ["Membership trends", "Dining revenue", "Event revenue", "Tee time performance", "Executive dashboards"],
    href: "/platform",
  },
  {
    icon: Building2,
    title: "Fairway360 Enterprise",
    tagline: "Built for multi-location clubs and large operations.",
    features: ["Multi-location support", "White-label portals", "Custom AI agents", "Advanced reporting", "API integrations"],
    href: "/pricing",
  },
];

const enterpriseHighlights = [
  "Seamless integrations",
  "AI-powered automation",
  "Member-first experience",
  "Proven results",
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Solutions() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Solutions — One AI System, Every Department | Fairway360"
        description="From AI receptionist to dining, membership, events, pro shop, and analytics — explore every Fairway360 solution built for modern golf courses and clubs."
        path="/solutions"
      />
      <Navbar />
      <main className="flex-1 bg-[#04130c] text-white">
        <SolutionsHero />
        <SolutionsGrid />
        <TransformCTA />
      </main>
      <Footer />
    </div>
  );
}

function SolutionsHero() {
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
            Solutions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="mb-5 text-xl font-medium text-[hsl(145_58%_52%)] md:text-2xl"
          >
            One AI System. Every Department. Total Control.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="text-lg leading-relaxed text-white/70"
          >
            Fairway360 brings every part of your club together in one
            intelligent platform — automating tasks, improving member
            experiences, and driving more revenue.
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
                <Brain className="h-8 w-8" />
              </span>
              <span className="mt-2 font-display text-lg font-semibold tracking-widest text-white/80">AI</span>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Intelligence Behind Every Interaction
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Our AI agents work 24/7 to answer calls, respond to members,
                capture leads, and automate follow-ups — so your team can focus
                on what matters most.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SolutionsGrid() {
  return (
    <section className="px-4 pb-20 md:px-6 md:pb-28">
      <div className="container mx-auto">
        <div className="mb-12 flex items-center justify-center gap-4">
          <span className="hidden h-px max-w-[120px] flex-1 bg-gradient-to-r from-transparent to-accent/50 sm:block" />
          <RevealText as="h2" className="text-center font-display text-2xl font-semibold md:text-3xl lg:text-4xl">
            Complete Solutions for Modern Clubs
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
          {solutions.map((sol) => (
            <motion.div key={sol.title} variants={fadeUp}>
              <Link
                href={sol.href}
                className="fw-glow group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[hsl(145_58%_45%)]/40"
                data-testid={`card-solution-${sol.title.toLowerCase().replace(/[^a-z]+/g, "-")}`}
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                  <sol.icon className="h-6 w-6" />
                </span>
                <h3 className="font-display text-lg font-semibold leading-snug text-white">{sol.title}</h3>
                <p className="mb-4 mt-1 text-sm text-white/55">{sol.tagline}</p>
                <ul className="mb-5 space-y-2">
                  {sol.features.map((f) => (
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
              <h3 className="font-display text-lg font-semibold text-accent">All Solutions. One Platform.</h3>
              <p className="mb-4 mt-1 text-sm text-white/70">
                Fairway360 connects every department so your club runs smarter,
                not harder.
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
                <Link href="/demo" data-testid="button-solutions-all-demo">Request Demo</Link>
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
    { icon: Clock, val: "24/7", label: "AI Support" },
    { icon: Layers, val: "All-in-One", label: "Platform" },
    { icon: TrendingUp, val: "More Revenue", label: "Less Work" },
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
                  Ready to Transform Your Club?
                </RevealText>
                <p className="mt-2 max-w-md text-sm text-white/60">
                  See how Fairway360 can help your club save time, create better
                  member experiences, and grow revenue.
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
              <Link href="/demo" data-testid="button-solutions-transform-demo">
                Request Your Personalized Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
