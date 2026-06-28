import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneMissed, Clock, CalendarX, Users, StarOff, Network, Check, ArrowRight, MessageSquare, Briefcase, Wrench, ChevronRight, BarChart, Phone, Utensils, CalendarClock, Play, Bell, User, Bot, Star, TrendingUp, LayoutDashboard, CalendarDays, UtensilsCrossed, PartyPopper, FileText, ListChecks, Settings } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BrandLogo } from "@/components/brand-logo";
import { Seo, SITE_URL } from "@/components/seo";
import { Reveal, RevealText } from "@/components/anim/reveal";
import { CountUp } from "@/components/anim/count-up";
import { Magnetic } from "@/components/anim/magnetic";
import { MeshHero } from "@/components/marketing/mesh-hero";
import { MarqueeStrip, LiveActivityFeed, AICyclingPanel, PortalMiniScreens } from "@/components/marketing/showcase";

const HOME_JSONLD: Record<string, unknown>[] = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Fairway360",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description:
      "AI operating system for golf courses and country clubs. Powered by Scalaro.",
    sameAs: [] as string[],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fairway360",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Run your entire club from one AI system — tee times, dining, member communication, events, missed calls, reviews, and staff workflows.",
    offers: {
      "@type": "Offer",
      price: "497",
      priceCurrency: "USD",
    },
  },
];

export function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-hidden">
      <Seo
        title="Fairway360 — AI Operating System for Golf Courses & Country Clubs"
        description="Run your entire club from one AI system. Fairway360 automates tee times, dining orders, member communication, events, missed calls, and reviews — 24/7."
        path="/"
        jsonLd={HOME_JSONLD}
      />
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <section className="border-y border-white/10 bg-[#04130c] py-6">
          <div className="container mx-auto px-4 md:px-6">
            <MarqueeStrip
              items={[
                "Tee Sheet Automation", "AI Concierge", "On-Course F&B Ordering",
                "Missed-Call Text-Back", "Event Lead Capture", "Member CRM",
                "Review Generation", "Staff Workflows", "Live Course Map", "Payments",
              ]}
            />
          </div>
        </section>
        <FeaturesGrid />
        <ProblemsSection />
        <SolutionsSection />
        <WorkflowDemo />
        <DashboardSection />

        <section className="bg-[hsl(146_46%_9%)] px-4 md:px-6 py-20 md:py-28 text-white">
          <div className="container mx-auto">
            <div className="mb-12 text-center">
              <p className="eyebrow text-accent mb-5">One Platform, Three Views</p>
              <RevealText as="h2" className="text-3xl md:text-4xl lg:text-5xl font-semibold">
                Built for everyone at your club
              </RevealText>
            </div>
            <div className="mx-auto max-w-6xl">
              <PortalMiniScreens />
            </div>
          </div>
        </section>

        <section className="bg-[#04130c] px-4 md:px-6 py-20 md:py-28 text-white">
          <div className="container mx-auto">
            <div className="mb-12 text-center">
              <p className="eyebrow text-[hsl(145_58%_55%)] mb-5">Watch It Run</p>
              <RevealText as="h2" className="text-3xl md:text-4xl lg:text-5xl font-semibold">
                Your club, running itself in real time
              </RevealText>
            </div>
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
              <LiveActivityFeed />
              <AICyclingPanel />
            </div>
          </div>
        </section>

        <AIScriptsSection />
        <PricingSection />
        <ROISection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
}

function HeroSection() {
  const pills = ["24/7 AI Support", "Increase Revenue", "Save Staff Time", "Delight Members"];
  return (
    <section className="relative overflow-hidden bg-[#04130c] text-white px-4 md:px-6 pt-24 pb-16 md:pt-28 md:pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_72%_-5%,_hsl(155_55%_18%/0.6),_transparent_60%)]" />
        <MeshHero className="absolute inset-0 opacity-50" />
        <div className="animate-float-a absolute -top-24 right-0 h-[480px] w-[480px] rounded-full bg-[hsl(145_58%_45%)]/15 blur-[120px]" />
        <div className="animate-float-b absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-accent/15 blur-[120px]" />
      </div>

      <div className="container mx-auto grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
        <div className="max-w-xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.05] mb-6"
          >
            Run Your Entire Club From One{" "}
            <span className="text-[hsl(145_58%_52%)]">AI System</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-lg md:text-xl text-white/70 leading-relaxed mb-9 max-w-lg"
          >
            Fairway360 helps golf courses and country clubs automate tee times,
            dining orders, member communication, events, missed calls, reviews,
            and staff workflows.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Magnetic className="w-full sm:w-auto">
              <Button asChild size="lg" className="fw-sheen w-full bg-accent text-accent-foreground hover:bg-accent/90 text-base h-14 px-8">
                <Link href="/demo">
                  Request Demo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Magnetic>
            <Button asChild size="lg" variant="outline" className="fw-sheen w-full sm:w-auto border-white/20 bg-white/5 text-white hover:bg-white/10 text-base h-14 px-7">
              <a href="#how-it-works">
                <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/30">
                  <Play className="h-3 w-3 fill-current" />
                </span>
                See How It Works
              </a>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75"
          >
            {pills.map((p) => (
              <span key={p} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[hsl(145_58%_52%)]" /> {p}
              </span>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
        >
          <HeroDashboardMock />
        </motion.div>
      </div>
    </section>
  );
}

function HeroDashboardMock() {
  const stats = [
    { label: "New Orders", val: "24", delta: "+18%" },
    { label: "Tee Times Booked", val: "32", delta: "+12%" },
    { label: "Missed Calls Recovered", val: "14", delta: "+27%" },
    { label: "Event Inquiries", val: "7", delta: "+16%" },
  ];
  const nav = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: CalendarDays, label: "Tee Times" },
    { icon: UtensilsCrossed, label: "Dining Orders" },
    { icon: PartyPopper, label: "Events" },
    { icon: Users, label: "Members" },
    { icon: MessageSquare, label: "Communications" },
    { icon: Star, label: "Reviews" },
    { icon: Bot, label: "AI Concierge" },
    { icon: FileText, label: "Reports" },
    { icon: ListChecks, label: "Staff Tasks" },
    { icon: Settings, label: "Settings" },
  ];
  const activity = [
    { color: "bg-[hsl(145_58%_52%)]", text: "New food order — Hole 7", time: "2 min ago" },
    { color: "bg-[hsl(145_58%_52%)]", text: "Tee time booked for 4/25", time: "6 min ago" },
    { color: "bg-red-400", text: "Missed call recovered", time: "12 min ago" },
    { color: "bg-accent", text: "Wedding inquiry received", time: "18 min ago" },
    { color: "bg-accent", text: "Review received ★★★★★", time: "25 min ago" },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#06180f]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <BrandLogo size="sm" tone="dark" />
        <div className="flex items-center gap-3 text-white/55">
          <span className="text-xs hidden sm:inline">Tuesday, May 7</span>
          <Bell className="h-4 w-4" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
            <User className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="flex">
        <div className="hidden sm:flex w-36 shrink-0 flex-col gap-0.5 border-r border-white/10 p-2">
          {nav.map((n) => (
            <div
              key={n.label}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                n.active
                  ? "bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_60%)] font-medium"
                  : "text-white/55"
              }`}
            >
              <n.icon className="h-3.5 w-3.5 shrink-0" /> {n.label}
            </div>
          ))}
        </div>

        <div className="flex-1 p-4 space-y-4 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[10px] text-white/55 truncate">{s.label}</div>
                <div className="mt-1 text-xl font-semibold text-white font-display"><CountUp to={Number(s.val)} /></div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[hsl(145_58%_55%)]">
                  <TrendingUp className="h-3 w-3" /> {s.delta}
                  <span className="text-white/35">vs yesterday</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[10px] text-white/55">Revenue Opportunities</div>
            <div className="text-xl font-semibold text-white font-display"><CountUp to={8420} prefix="$" /></div>
            <div className="text-[10px] text-white/40 mb-2">Potential Revenue</div>
            <svg viewBox="0 0 300 60" className="h-14 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(145 58% 48%)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="hsl(145 58% 48%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,46 C40,42 60,36 90,32 C120,27 140,30 170,21 C200,12 232,18 262,9 L300,5 L300,60 L0,60 Z"
                fill="url(#rev-grad)"
              />
              <path
                d="M0,46 C40,42 60,36 90,32 C120,27 140,30 170,21 C200,12 232,18 262,9 L300,5"
                fill="none"
                stroke="hsl(145 58% 52%)"
                strokeWidth="2"
              />
            </svg>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-[hsl(145_58%_55%)]">
              <TrendingUp className="h-3 w-3" /> 21% vs last 7 days
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="text-[11px] font-medium text-white mb-3">Recent Activity</div>
            <div className="space-y-2.5">
              {activity.map((a) => (
                <div key={a.text} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-2 text-white/75 truncate">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.color}`} />
                    <span className="truncate">{a.text}</span>
                  </span>
                  <span className="shrink-0 text-white/40">{a.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] font-medium text-[hsl(145_58%_55%)]">View all activity</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesGrid() {
  const features = [
    { icon: Phone, title: "AI Receptionist", desc: "Never miss a call. AI answers 24/7 and captures every opportunity." },
    { icon: Utensils, title: "Order Food on the Course", desc: "Members order from their phone. Staff delivers. More revenue." },
    { icon: CalendarClock, title: "Tee Time Automation", desc: "Online booking, reminders, follow-up and no-show reduction." },
    { icon: Users, title: "Event Revenue Engine", desc: "Capture, follow up, and convert more weddings, outings, and events." },
    { icon: MessageSquare, title: "AI Concierge", desc: "Instant answers for members. Better experience, less work." },
    { icon: BarChart, title: "Powerful Insights", desc: "Real-time analytics that help you make smarter decisions." },
  ];

  return (
    <section className="bg-[#04130c] px-4 md:px-6 pb-20 md:pb-28">
      <div className="container mx-auto grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="hover-lift fw-glow rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center hover:border-[hsl(145_58%_45%)]/40 hover:bg-white/[0.05]"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-base font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-xs text-white/60 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ProblemsSection() {
  const problems = [
    { icon: PhoneMissed, title: "Missed Calls", desc: "Every unanswered call is a lost booking or inquiry" },
    { icon: Clock, title: "Slow Membership Follow-Up", desc: "Leads go cold while staff handles other tasks" },
    { icon: CalendarX, title: "Manual Tee Time Follow-Up", desc: "Players don't return because nobody reached back out" },
    { icon: Briefcase, title: "Event Leads Slipping Away", desc: "Wedding and corporate inquiries sit unanswered for days" },
    { icon: Users, title: "Overwhelmed Staff", desc: "Your team juggles too many tasks to follow up consistently" },
    { icon: StarOff, title: "Poor Review Follow-Up", desc: "You're not asking for reviews, so you're losing Google ranking" },
    { icon: Network, title: "Disconnected Systems", desc: "Data lives in spreadsheets, voicemails, and sticky notes" },
  ];

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-[hsl(146_46%_17%)] text-white">
      <div className="container mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="eyebrow text-accent mb-5">The Cost of Manual Operations</p>
          <RevealText as="h2" className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">Your Club Is Losing Revenue Every Day</RevealText>
          <p className="text-xl text-white/60">Manual processes are costing you members, events, and repeat players.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {problems.map((prob, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/[0.04] border border-white/10 rounded-xl p-6 hover:border-accent/40 transition-colors"
            >
              <prob.icon className="h-10 w-10 text-accent mb-4" />
              <h3 className="text-lg font-semibold mb-2">{prob.title}</h3>
              <p className="text-sm text-white/65">{prob.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionsSection() {
  const solutions = [
    "AI Receptionist", "AI Chatbot", "Tee Time Automation", "Membership Automation",
    "Event & Wedding Automation", "Missed Call Text Back", "Review Generation", "Pro Shop Automation",
    "Dining Automation", "CRM Pipeline", "Staff Task Automation", "Maintenance Requests",
    "SMS/Email Campaigns", "Revenue Reporting"
  ];

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">The Platform</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">The Complete Automation Platform for Golf & Country Clubs</h2>
          <p className="text-xl text-muted-foreground">Everything you need to run a modern, profitable club.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {solutions.map((sol, i) => (
            <Card key={i} className="group hover:border-primary/50 transition-colors">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">{sol}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowDemo() {
  const [activeScenario, setActiveScenario] = useState("Tee Time");
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const scenarios = ["Tee Time", "Membership", "Event/Wedding", "Golf Lesson", "Dining Inquiry", "Pro Shop", "Maintenance Request"];

  const getSteps = (scenario: string) => {
    const baseSteps = [
      { title: "Visitor/Contact Enters", desc: "" },
      { title: "AI Captures Details", desc: "Name, date, party size, preferences, contact info" },
      { title: "Confirmation Sent", desc: "Instant automated SMS/Email response" },
      { title: "CRM Pipeline Updated", desc: "Lead added to correct pipeline stage" },
      { title: "Staff Alerted", desc: "Right person notified instantly" },
      { title: "Follow-Up Sequence", desc: "Automated multi-touch follow-up begins" },
      { title: "Next Action Triggered", desc: "Post-visit review request or upsell" },
      { title: "Revenue Tracked", desc: "Opportunity value logged to dashboard" }
    ];

    if (scenario === "Tee Time") baseSteps[0].desc = "Player requests tee time via website chatbot";
    else if (scenario === "Membership") baseSteps[0].desc = "Prospective member fills out inquiry form";
    else if (scenario === "Event/Wedding") baseSteps[0].desc = "Couple calls about wedding venue (missed call)";
    else baseSteps[0].desc = "Contact interacts via phone, web, or text";

    return baseSteps;
  };

  const steps = getSteps(activeScenario);

  useEffect(() => {
    if (!isPlaying) return;
    
    setCurrentStep(0);
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) return prev + 1;
        clearInterval(interval);
        setIsPlaying(false);
        return prev;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [activeScenario, isPlaying]);

  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 md:py-32 px-4 md:px-6 bg-secondary/60">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">Live Demonstration</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">See How Fairway360 Works</h2>
          <p className="text-xl text-muted-foreground">Choose a scenario and watch the automation flow</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {scenarios.map(sc => (
            <Button 
              key={sc} 
              variant={activeScenario === sc ? "default" : "outline"}
              onClick={() => { setActiveScenario(sc); setIsPlaying(true); }}
              className="rounded-full"
            >
              {sc}
            </Button>
          ))}
        </div>

        <Card className="max-w-4xl mx-auto overflow-hidden">
          <CardContent className="p-8">
            <div className="relative">
              <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-border hidden md:block" />
              <div className="space-y-6">
                {steps.map((step, i) => (
                  <motion.div 
                    key={`${activeScenario}-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: i <= currentStep ? 1 : 0, x: i <= currentStep ? 0 : -20 }}
                    className="relative flex items-start gap-6"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-card transition-colors duration-500 ${i <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <div className="pt-3">
                      <h4 className="text-lg font-bold text-foreground">{step.title}</h4>
                      <p className="text-muted-foreground">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {!isPlaying && currentStep === steps.length - 1 && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={() => setIsPlaying(true)}>
                  Play Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function DashboardSection() {
  return (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-background">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">One Dashboard</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">The Club's Command Center</h2>
          <p className="text-xl text-muted-foreground">Everything your team needs, in one place</p>
        </div>

        <div className="max-w-6xl mx-auto rounded-xl border border-white/10 bg-[hsl(146_44%_15%)] p-6 shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="text-white/50 text-sm font-mono ml-4">Fairway360 Dashboard</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "New Tee Time Leads", val: "12" },
              { label: "Missed Calls Recovered", val: "8" },
              { label: "Membership Inquiries", val: "5" },
              { label: "Event Leads", val: "3" },
              { label: "Reviews Generated", val: "24" },
              { label: "Pipeline Value", val: "$47,200" },
              { label: "Follow-Ups Due", val: "6" },
              { label: "Active Tasks", val: "11" },
            ].map((metric, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/10 p-4 rounded-lg">
                <div className="text-white/65 text-sm mb-1">{metric.label}</div>
                <div className="text-2xl font-bold text-white font-display">{metric.val}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white/[0.04] border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-medium mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { name: "Olivia Carter", type: "Membership", status: "Follow-up Sent", time: "2m ago" },
                  { name: "Westlake Realty", type: "Corporate Event", status: "New Lead", time: "12m ago" },
                  { name: "Mike Wilson", type: "Review", status: "5 Stars", time: "38m ago" },
                  { name: "Sophie Tran", type: "Wedding", status: "Tour Scheduled", time: "1h ago" },
                  { name: "James Whitmore", type: "Tee Time", status: "Confirmed", time: "2h ago" },
                  { name: "Northgate Rotary", type: "Charity Scramble", status: "Tour Booked", time: "3h ago" },
                  { name: "Ethan Wallace", type: "Membership", status: "Won", time: "5h ago" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-white/10 last:border-0">
                    <div className="text-white font-medium">{row.name}</div>
                    <div className="text-white/65 w-1/4">{row.type}</div>
                    <div className="w-1/4">
                      <span className="bg-white/10 text-white/70 px-2 py-1 rounded text-xs">{row.status}</span>
                    </div>
                    <div className="text-white/60 text-right">{row.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
              <h3 className="text-white font-medium mb-4">Membership Pipeline</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-white/65 mb-1">
                    <span>New Lead</span><span>100%</span>
                  </div>
                  <Progress value={100} className="h-2 bg-white/10" indicatorClassName="bg-blue-400" />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/65 mb-1">
                    <span>Contacted</span><span>65%</span>
                  </div>
                  <Progress value={65} className="h-2 bg-white/10" indicatorClassName="bg-accent" />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/65 mb-1">
                    <span>Proposal Sent</span><span>32%</span>
                  </div>
                  <Progress value={32} className="h-2 bg-white/10" indicatorClassName="bg-purple-400" />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-white/65 mb-1">
                    <span>Won</span><span>12%</span>
                  </div>
                  <Progress value={12} className="h-2 bg-white/10" indicatorClassName="bg-green-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIScriptsSection() {
  const scripts = [
    { tag: "Missed Call Text Back", msg: "Hi! This is Fairway360 AI for [Club Name]. Sorry we missed your call! How can we help? We'd love to answer any questions about tee times, memberships, or events." },
    { tag: "Membership Follow-Up", msg: "Hi [Name], thanks for your interest in membership at [Club Name]! We'd love to share more about our membership options. When's a good time for a quick 10-minute call?" },
    { tag: "Event Lead Follow-Up", msg: "Hi [Name]! Thank you for inquiring about hosting your event at [Club Name]. We'd love to discuss your vision — could we schedule a quick call or tour this week?" },
    { tag: "Review Request", msg: "Hi [Name], thanks for playing at [Club Name] today! We hope you had a great time. Would you mind leaving us a quick Google review? It really helps: [link]" },
    { tag: "Dining Inquiry", msg: "Hi [Name], thanks for your interest in private dining at [Club Name]! Our dining team will reach out shortly. In the meantime, feel free to reply with your preferred date and party size." },
    { tag: "Maintenance Alert", msg: "Maintenance alert: A new request has been submitted for [Location/Issue]. Assigned to: [Staff Name]. Priority: [High/Normal]. Please confirm receipt by replying 'Got it'." }
  ];

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-secondary/60">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">The Voice of Your Club</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">AI That Sounds Human. Responds Instantly.</h2>
          <p className="text-xl text-muted-foreground">Authentic conversations that drive conversions.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {scripts.map((s, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Badge variant="outline" className="w-fit mb-1">{s.tag}</Badge>
              <div className="bg-card border rounded-2xl rounded-tl-none p-4 shadow-sm relative">
                <p className="text-sm text-foreground leading-relaxed">{s.msg}</p>
                <div className="absolute top-0 -left-2 w-4 h-4 bg-card border-l border-t rounded-br-lg -z-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-background">
      <div className="container mx-auto text-center max-w-3xl mb-16">
        <p className="eyebrow text-[hsl(38_55%_40%)] mb-5">Membership Plans</p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">Simple, Transparent Pricing</h2>
        <p className="text-xl text-muted-foreground">Choose the plan that fits your operation</p>
      </div>

      <div className="container mx-auto grid gap-8 md:grid-cols-3 max-w-6xl items-start">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Starter Automation</CardTitle>
            <CardDescription>For small public golf courses</CardDescription>
            <div className="mt-4"><span className="text-4xl font-bold">$497</span><span className="text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mb-6" asChild><Link href="/demo">Start with Starter</Link></Button>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> AI Missed Call Text Back</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> AI Website Chatbot</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Tee Time Lead Capture</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Basic CRM Pipeline</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> SMS/Email Follow-Up</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Review Generation</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Monthly Reporting</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-accent shadow-lg md:-mt-4 md:mb-4 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
          </div>
          <CardHeader>
            <CardTitle>Growth Automation</CardTitle>
            <CardDescription>For active golf courses & clubs</CardDescription>
            <div className="mt-4"><span className="text-4xl font-bold">$997</span><span className="text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent>
            <Button className="w-full mb-6 bg-accent text-accent-foreground hover:bg-accent/90" asChild><Link href="/demo">Get Growth Plan</Link></Button>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="font-semibold text-foreground">Everything in Starter, plus:</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> AI Phone Receptionist</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Membership Automation</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Event & Wedding Automation</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Pro Shop Automation</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Staff Task Automation</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Advanced Reporting</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Elite Club Automation</CardTitle>
            <CardDescription>For private country clubs</CardDescription>
            <div className="mt-4"><span className="text-4xl font-bold">$1,997</span><span className="text-muted-foreground">/mo</span></div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full mb-6" asChild><Link href="/demo">Go Elite</Link></Button>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="font-semibold text-foreground">Everything in Growth, plus:</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Full Multi-Dept Automation</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Dining & Restaurant Auto</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Maintenance Request Routing</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Custom AI Scripts</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Dedicated Success Manager</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0"/> Custom Reporting</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ROISection() {
  const stats = [
    { title: "Missed Wedding Inquiry", desc: "Avg. wedding venue: $15,000–$30,000 per event. One recovered inquiry = 15–30x ROI." },
    { title: "Missed Corporate Outing", desc: "Avg. corporate outing: $5,000–$15,000. Your AI never misses a call." },
    { title: "Tee Time Pattern Loss", desc: "Players who don't get a follow-up are 3x less likely to return. Multiply by 100 players/month." },
    { title: "Membership Lead", desc: "Average club membership value: $3,000–$12,000/year. One recovered lead = full annual plan paid for." }
  ];

  return (
    <section className="py-20 md:py-32 px-4 md:px-6 bg-[hsl(146_46%_17%)] text-white">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <p className="eyebrow text-accent mb-5">Return on Investment</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">One Missed Lead Costs More Than You Think</h2>
          <p className="text-xl text-white/60">Fairway360 pays for itself with the first recovered opportunity.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="bg-white/[0.04] border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-xl text-accent font-display">{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70">{stat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-6 bg-primary text-primary-foreground text-center">
      <div className="container mx-auto max-w-4xl">
        <p className="eyebrow text-accent mb-6">Start Today</p>
        <h2 className="text-3xl md:text-5xl font-semibold mb-6 leading-[1.1] text-white">
          Your Club Shouldn't Run on Voicemails, Sticky Notes, and Manual Follow-Up
        </h2>
        <p className="text-xl md:text-2xl text-primary-foreground/80 mb-12">
          Fairway360 puts your entire operation on autopilot — so your staff focuses on exceptional member experiences, not chasing down leads.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 text-lg h-14 px-8">
            <Link href="/demo">Request Your Automation Demo</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-white/40 text-white hover:bg-white/10 text-lg h-14 px-8">
            <Link href="/pricing">See Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
