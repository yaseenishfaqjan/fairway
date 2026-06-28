import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  PhoneMissed, MessageSquare, Phone, Users, PartyPopper, Calendar,
  Star, ShoppingBag, UtensilsCrossed, LayoutDashboard, ClipboardList,
  Wrench, Mail, BarChart3, ChevronDown, ChevronRight, Zap, ArrowRight,
  Check, Sparkles, Bell, Plus, Gift, CalendarCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Seo } from "@/components/seo";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { RevealText } from "@/components/anim/reveal";

const automations = [
  {
    icon: PhoneMissed,
    category: "Call Recovery",
    name: "Missed Call Text Back",
    trigger: "Inbound call goes unanswered",
    action: "AI sends personalized SMS within 60 seconds acknowledging the missed call and offering to help via text",
    outcome: "Lead stays warm — staff follows up with full context",
    steps: [
      "Call comes in to club main number",
      "Call goes unanswered or rings past timeout",
      "Fairway360 detects missed call event",
      "AI drafts personalized SMS with club name",
      "SMS sent to caller within 60 seconds",
      "Conversation logged to CRM as new lead",
      "Staff notified with caller details",
    ],
  },
  {
    icon: Phone,
    category: "AI Reception",
    name: "AI Phone Receptionist",
    trigger: "Inbound call at any hour",
    action: "AI answers, greets caller by club name, handles FAQs, captures lead info, and routes complex calls to staff",
    outcome: "No call goes unanswered — every caller gets an immediate, professional response",
    steps: [
      "Inbound call received at club number",
      "AI Receptionist answers with custom greeting",
      "AI identifies inquiry type (tee time, membership, event, etc.)",
      "AI answers common questions from knowledge base",
      "Caller details captured (name, phone, inquiry type)",
      "Complex inquiries transferred to correct staff member",
      "All call data synced to CRM automatically",
    ],
  },
  {
    icon: MessageSquare,
    category: "Lead Capture",
    name: "Website Chatbot Lead Capture",
    trigger: "Visitor lands on club website",
    action: "AI chatbot engages visitor, answers questions, qualifies interest, and captures contact info for all inquiry types",
    outcome: "Website becomes 24/7 lead generation engine — every visitor tracked",
    steps: [
      "Visitor lands on club website",
      "Chatbot widget appears after 8 seconds",
      "AI greets visitor with personalized opener",
      "Visitor selects or types their inquiry",
      "AI qualifies and answers questions",
      "AI collects name, email, phone number",
      "Lead added to CRM and team notified",
    ],
  },
  {
    icon: Calendar,
    category: "Tee Time",
    name: "Tee Time Lead Capture & Follow-Up",
    trigger: "Tee time inquiry via phone, web, or chatbot",
    action: "Confirmation sent immediately, reminder 24h before, post-round review request 2h after",
    outcome: "More booked rounds, fewer no-shows, more 5-star reviews",
    steps: [
      "Player submits tee time inquiry",
      "AI captures name, date, party size, contact info",
      "Instant booking confirmation sent via SMS + email",
      "Lead added to Tee Time CRM pipeline",
      "Reminder SMS sent 24 hours before tee time",
      "Post-round review request sent 2 hours after",
      "Re-engagement sequence triggered after 30 days",
    ],
  },
  {
    icon: Users,
    category: "Membership",
    name: "Membership Inquiry Nurture Sequence",
    trigger: "Membership inquiry via any channel",
    action: "Instant acknowledgment, 5-step nurture sequence over 14 days, sales team alerted with full lead profile",
    outcome: "More membership conversions from the same lead volume",
    steps: [
      "Prospect submits membership inquiry",
      "AI sends instant acknowledgment within 90 seconds",
      "Lead added to Membership CRM pipeline",
      "Sales coordinator notified with full lead details",
      "Day 1: Personalized follow-up SMS from AI",
      "Day 3: Membership benefits email sent",
      "Day 7: Tour scheduling prompt sent",
      "Day 14: Final outreach if no response",
    ],
  },
  {
    icon: PartyPopper,
    category: "Events",
    name: "Event & Wedding Lead Routing",
    trigger: "Event inquiry via missed call, web form, or chatbot",
    action: "Instant response, lead details sent to events coordinator, automated follow-up sequence with tour prompt",
    outcome: "No event lead sits unanswered — every inquiry gets a response within 2 minutes",
    steps: [
      "Event inquiry received (missed call, form, chatbot)",
      "AI sends instant acknowledgment to inquirer",
      "Full inquiry details captured (event type, date, size)",
      "Events coordinator notified via SMS + email",
      "Lead added to Events CRM pipeline",
      "Follow-up sequence begins (Day 1, 3, 7)",
      "Tour or call scheduling prompt included",
    ],
  },
  {
    icon: Star,
    category: "Reputation",
    name: "Post-Visit Review Generation",
    trigger: "Tee time completed, dining visit, or event hosted",
    action: "AI sends personalized review request with direct Google link 2 hours after visit",
    outcome: "Consistent flow of 5-star reviews — higher Google rankings, more inbound leads",
    steps: [
      "Visit, round, or event marked as completed",
      "Fairway360 waits 2-hour cooling period",
      "Personalized review request SMS sent",
      "Google Review direct link included",
      "Non-responders receive one follow-up after 3 days",
      "Review count tracked in Reporting Dashboard",
      "Negative feedback flagged for manager review",
    ],
  },
  {
    icon: ShoppingBag,
    category: "Pro Shop",
    name: "Pro Shop Promotion & Loyalty",
    trigger: "Purchase made, promotion date set, or re-engagement threshold reached",
    action: "Post-purchase follow-up, loyalty milestone alerts, seasonal promotional campaigns to segmented lists",
    outcome: "Higher pro shop revenue without additional staff effort",
    steps: [
      "Customer makes pro shop purchase",
      "Purchase logged and contact tagged in CRM",
      "Post-purchase thank you message sent",
      "Customer added to loyalty tracking segment",
      "Seasonal promotions sent to relevant segments",
      "Loyalty milestone rewards triggered automatically",
      "Re-engagement sequence for inactive customers",
    ],
  },
  {
    icon: UtensilsCrossed,
    category: "Dining",
    name: "Private Dining Inquiry Capture",
    trigger: "Dining inquiry via phone, web form, or chatbot",
    action: "Instant acknowledgment, date and party size collection, dining coordinator alert, 24h follow-up if no response",
    outcome: "No dining inquiry lost — every private event opportunity captured and tracked",
    steps: [
      "Dining inquiry received via any channel",
      "AI sends immediate acknowledgment",
      "AI collects date, party size, dietary needs",
      "Dining coordinator notified with full details",
      "Lead added to Dining CRM pipeline",
      "Follow-up sent if no coordinator response in 24h",
      "Post-dining review request sent automatically",
    ],
  },
  {
    icon: LayoutDashboard,
    category: "CRM",
    name: "CRM Pipeline Auto-Management",
    trigger: "Any new lead from any source",
    action: "Lead auto-created in correct pipeline, assigned to right team member, stage-based follow-up automation activated",
    outcome: "Zero leads fall through the cracks — every opportunity is tracked and actioned",
    steps: [
      "Lead enters system from any channel",
      "Lead type detected (Tee Time, Member, Event, etc.)",
      "Contact record created automatically",
      "Lead placed in correct pipeline at correct stage",
      "Assigned to designated team member",
      "Stage-based follow-up automation activated",
      "Pipeline value updated in Revenue Reporting",
    ],
  },
  {
    icon: ClipboardList,
    category: "Operations",
    name: "Staff Task Auto-Assignment",
    trigger: "Automation trigger fires (new lead, inquiry, maintenance, etc.)",
    action: "Task created with details, assigned to correct staff role, deadline set, escalation alert if overdue",
    outcome: "Staff always know their next action — no verbal handoffs, no missed tasks",
    steps: [
      "Automation trigger fires (new lead, request, etc.)",
      "Fairway360 identifies required staff action",
      "Task created with full details and context",
      "Assigned to correct team member by role",
      "Task deadline and priority set automatically",
      "Reminder sent as deadline approaches",
      "Escalation alert if task is overdue",
    ],
  },
  {
    icon: Wrench,
    category: "Facility",
    name: "Maintenance Request Routing",
    trigger: "Maintenance request submitted via text, web, or phone",
    action: "Request captured, priority classified, routed to correct maintenance staff, status updates sent to requester",
    outcome: "Members feel heard — facility issues resolved faster with full accountability trail",
    steps: [
      "Maintenance request submitted by staff or member",
      "Fairway360 captures location, issue type, urgency",
      "Priority level classified (Urgent, High, Normal)",
      "Routed to correct maintenance team member",
      "Requester receives confirmation and estimated response",
      "Status updates sent as request progresses",
      "Completed requests logged for facility reporting",
    ],
  },
  {
    icon: Mail,
    category: "Marketing",
    name: "SMS & Email Campaign Automation",
    trigger: "Campaign date, member behavior trigger, or scheduled sequence step",
    action: "Targeted campaign sent to segmented list — promotional, re-engagement, renewal, or seasonal content",
    outcome: "Consistent member communication without marketing staff overhead",
    steps: [
      "Campaign or trigger condition is met",
      "Target segment identified from CRM data",
      "Message personalized with member name and data",
      "SMS and/or email delivered to segment",
      "Delivery and open rates tracked automatically",
      "Replies routed to correct team member",
      "Campaign performance reported in dashboard",
    ],
  },
  {
    icon: BarChart3,
    category: "Reporting",
    name: "Revenue Opportunity Tracking",
    trigger: "Ongoing — all lead and automation activity",
    action: "Pipeline value, conversion rates, follow-up performance, and automation ROI calculated and displayed in live dashboard",
    outcome: "Leadership sees exactly where revenue is coming from — and where it's leaking",
    steps: [
      "All lead activity tracked across all pipelines",
      "Opportunity values assigned by lead type",
      "Conversion rates calculated automatically",
      "Weekly summary report generated and sent to leadership",
      "Monthly performance dashboard updated",
      "Top-performing automations highlighted",
      "Revenue gaps and opportunities surfaced for review",
    ],
  },
];

export function Automations() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Seo
        title="Automations — Automate More, Achieve More | Fairway360"
        description="Capture, qualify, nurture, and convert every lead automatically. Explore Fairway360's library of done-for-you automations for golf courses and clubs."
        path="/automations"
      />
      <Navbar />
      <main className="flex-1 bg-[#04130c] text-white">
        <AutomationsHero />
        <ProcessFlow />
        <AutomationLibrary />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}

function AutomationsHero() {
  const checklist = [
    "Save time and reduce manual tasks",
    "Improve member experience at every touchpoint",
    "Track performance and maximize revenue",
    "Connect every department in one system",
  ];
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-16 md:px-6 md:pt-24 md:pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_-5%,_hsl(155_55%_18%/0.55),_transparent_60%)]" />
        <div className="absolute -top-24 left-10 h-[440px] w-[440px] rounded-full bg-[hsl(145_58%_45%)]/10 blur-[120px]" />
      </div>
      <div className="container mx-auto grid items-center gap-12 lg:grid-cols-2">
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="eyebrow mb-5 text-[hsl(145_58%_55%)]"
          >
            Automations
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-6 text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl"
          >
            Automate More.
            <br />
            <span className="text-[hsl(145_58%_52%)]">Achieve More.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-7 max-w-lg text-lg leading-relaxed text-white/70"
          >
            Fairway360 automations handle the busywork so your team can focus on
            what matters most — your members.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mb-8 space-y-3"
          >
            {checklist.map((c) => (
              <span key={c} className="flex items-center gap-2.5 text-sm text-white/75">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15">
                  <Check className="h-3 w-3 text-[hsl(145_58%_55%)]" />
                </span>
                {c}
              </span>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
              <Sparkles className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-white">AI-Powered Automations</h2>
              <p className="text-sm text-white/55">Intelligent. Adaptive. Always working for your club.</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <AutomationBuilderMock />
        </motion.div>
      </div>
    </section>
  );
}

function AutomationBuilderMock() {
  const flow: { icon: LucideIcon; label: string; sub: string; meta: string }[] = [
    { icon: Users, label: "Trigger", sub: "Tee time booked", meta: "7 days in advance" },
    { icon: Mail, label: "Action", sub: "Send email reminder", meta: "7 days before" },
    { icon: MessageSquare, label: "Action", sub: "Send SMS reminder", meta: "1 day before" },
    { icon: Bell, label: "Action", sub: "Day-of notification", meta: "2 hours before" },
  ];
  const top: { icon: LucideIcon; name: string; pct: string }[] = [
    { icon: Calendar, name: "Tee Time Reminder", pct: "98%" },
    { icon: PartyPopper, name: "Event Follow-Up", pct: "96%" },
    { icon: UtensilsCrossed, name: "Dining Feedback", pct: "95%" },
    { icon: Users, name: "Membership Nurture", pct: "94%" },
    { icon: Gift, name: "Birthday Greeting", pct: "93%" },
  ];
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
            <Zap className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold text-white">Automation Builder</span>
          <span className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
            Tee Time Reminder <ChevronDown className="h-3 w-3" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-[hsl(145_58%_55%)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(145_58%_55%)]" /> Active
          </span>
          <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80">Edit Automation</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          {flow.map((step, i) => (
            <div key={step.sub}>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                  <step.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-white/45">{step.label}</div>
                  <div className="truncate text-xs font-medium text-white">{step.sub}</div>
                  <div className="text-[10px] text-white/45">{step.meta}</div>
                </div>
              </div>
              {i < flow.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/50">
                    <Plus className="h-3 w-3" />
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium text-white/70">Automation Performance</span>
            <span className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">
              Last 30 Days <ChevronDown className="h-2.5 w-2.5" />
            </span>
          </div>
          <div className="mb-4 flex items-center gap-4">
            <Gauge value={98} />
            <div className="space-y-2 text-xs">
              <div>
                <div className="text-white/45">Automations Run</div>
                <div className="font-display text-sm font-semibold text-white">1,248</div>
              </div>
              <div>
                <div className="text-white/45">Tasks Completed</div>
                <div className="font-display text-sm font-semibold text-white">12,643</div>
              </div>
              <div>
                <div className="text-white/45">Time Saved</div>
                <div className="font-display text-sm font-semibold text-[hsl(145_58%_55%)]">245+ Hours</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <div className="mb-2 text-[11px] font-medium text-white/55">Top Performing Automations</div>
            <ul className="space-y-2">
              {top.map((t) => (
                <li key={t.name} className="flex items-center gap-2 text-[11px]">
                  <t.icon className="h-3.5 w-3.5 text-[hsl(145_58%_55%)]" />
                  <span className="flex-1 truncate text-white/75">{t.name}</span>
                  <span className="font-medium text-[hsl(145_58%_55%)]">{t.pct}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(0 0% 100% / 0.08)" strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="hsl(145 58% 50%)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold text-white">{value}%</span>
        <span className="text-[9px] text-white/50">Success Rate</span>
      </div>
    </div>
  );
}

function ProcessFlow() {
  const steps: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Phone, title: "Capture", desc: "AI captures leads and member requests 24/7" },
    { icon: MessageSquare, title: "Qualify", desc: "AI qualifies and routes to the right department" },
    { icon: Mail, title: "Nurture", desc: "Automated follow-ups build stronger relationships" },
    { icon: CalendarCheck, title: "Convert", desc: "Bookings, reservations, and sign-ups increase" },
    { icon: BarChart3, title: "Analyze", desc: "Track results and optimize performance" },
  ];
  return (
    <section className="px-4 pb-20 md:px-6 md:pb-24">
      <div className="container mx-auto">
        <div className="flex flex-col items-stretch justify-center gap-4 lg:flex-row lg:items-stretch">
          {steps.map((s, i) => (
            <div key={s.title} className="flex flex-col items-center gap-4 lg:flex-1 lg:flex-row">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex w-full flex-1 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
              >
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mb-2 font-display text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/55">{s.desc}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden h-5 w-5 shrink-0 text-[hsl(145_58%_55%)] lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutomationLibrary() {
  return (
    <section className="bg-[hsl(146_46%_9%)] px-4 py-20 md:px-6 md:py-28">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-4 text-[hsl(145_58%_55%)]">Full Automation Library</p>
          <RevealText as="h2" className="text-3xl font-semibold md:text-4xl lg:text-5xl">
            Every Automation Your Club Needs
          </RevealText>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            {automations.length} pre-built automations covering every department.
            Click any automation to see the full step-by-step flow.
          </p>
        </div>
        <div className="space-y-4">
          {automations.map((auto, i) => (
            <AutomationCard key={auto.name} auto={auto} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AutomationCard({ auto, index }: { auto: typeof automations[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = auto.icon;
  const panelId = `automation-panel-${index}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      className="fw-glow overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-[hsl(145_58%_45%)]/40"
    >
      <button
        className="flex w-full items-start gap-4 p-5 text-left md:p-6"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        data-testid={`button-automation-${index}`}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="mb-1 inline-block rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/60">
            {auto.category}
          </span>
          <h3 className="font-display text-lg font-semibold text-white">{auto.name}</h3>
          <p className="mt-1 text-sm text-white/60">{auto.action}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-white/10 px-5 pb-6 pt-5 md:px-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                    <Zap className="h-3.5 w-3.5" /> Trigger
                  </div>
                  <p className="text-sm font-medium text-white/85">{auto.trigger}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                    <ArrowRight className="h-3.5 w-3.5" /> Action
                  </div>
                  <p className="text-sm font-medium text-white/85">{auto.action}</p>
                </div>
                <div className="rounded-lg border border-[hsl(145_58%_45%)]/30 bg-[hsl(145_58%_45%)]/10 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[hsl(145_58%_55%)]">Outcome</div>
                  <p className="text-sm font-medium text-white/85">{auto.outcome}</p>
                </div>
              </div>

              <div>
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">Step-by-Step Flow</div>
                <ol className="space-y-2.5">
                  {auto.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(145_58%_42%)] text-xs font-bold text-[#04130c]">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-white/70">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BottomCTA() {
  return (
    <section className="px-4 py-20 text-center md:px-6 md:py-28">
      <div className="container mx-auto max-w-3xl">
        <p className="eyebrow mb-5 text-[hsl(145_58%_55%)]">Fully Managed</p>
        <RevealText as="h2" className="mb-4 text-3xl font-semibold md:text-4xl lg:text-5xl">
          Every Automation. Fully Managed.
        </RevealText>
        <p className="mb-10 text-lg text-white/70">
          Fairway360 sets up, tests, and monitors every automation for you. Your
          team just watches the leads come in.
        </p>
        <Button asChild size="lg" className="h-14 bg-accent px-10 text-base text-accent-foreground hover:bg-accent/90">
          <Link href="/demo?topic=Automations" data-testid="button-automations-bottom-cta">
            Request Your Demo <ChevronRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
