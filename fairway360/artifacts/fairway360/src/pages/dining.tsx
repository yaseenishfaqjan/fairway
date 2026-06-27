import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Check,
  ArrowRight,
  Play,
  Menu as MenuIcon,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Smartphone,
  ChefHat,
  UtensilsCrossed,
  Bell,
  Star,
  TrendingUp,
  Clock,
  ThumbsUp,
  DollarSign,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Seo } from "@/components/seo";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import liveKitchenImg from "@assets/image_1782003578564.png";
import burgerImg from "@assets/generated_images/menu_f2.png";
import wrapImg from "@assets/generated_images/menu_f3.png";
import clubImg from "@assets/generated_images/menu_f1.png";
import saladImg from "@assets/generated_images/menu_f4.png";

export function Dining() {
  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      <Seo
        title="Dining Automation — Order Food On the Course | Fairway360"
        description="Let members order food and drinks from their phone while they play. Orders flow to a live kitchen board and cart service — more F&B revenue, less wait."
        path="/dining"
      />
      <Navbar />
      <main className="flex-1">
        <DiningHero />
        <BenefitsSection />
        <HowItWorks />
        <KitchenDashboardSection />
        <LiveKitchenImage />
        <StatsBar />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function DiningHero() {
  const benefits = [
    "Increase food & beverage revenue",
    "Reduce phone calls & walk-ups",
    "Faster service, happier members",
    "Track orders and performance",
    "Real-time kitchen communication",
    "Integrated member billing",
  ];

  return (
    <section className="relative overflow-hidden bg-[#04130c] px-4 md:px-6 pt-24 pb-20 md:pt-28 md:pb-24 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_75%_-5%,_hsl(155_55%_18%/0.6),_transparent_60%)]" />
        <div className="absolute -top-24 right-10 h-[460px] w-[460px] rounded-full bg-[hsl(145_58%_45%)]/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="container mx-auto grid items-center gap-12 lg:grid-cols-2">
        <div className="max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="eyebrow mb-5 text-[hsl(145_58%_55%)]"
          >
            Dining Automation
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl"
          >
            Let Members Order Food{" "}
            <span className="text-[hsl(145_58%_52%)]">While They Play</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 max-w-lg text-lg leading-relaxed text-white/70 md:text-xl"
          >
            Fairway360 makes on-course and clubhouse dining effortless for
            members and more profitable for your club.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mb-9 grid gap-x-6 gap-y-3 sm:grid-cols-2"
          >
            {benefits.map((b) => (
              <span key={b} className="flex items-center gap-2 text-sm text-white/75">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15">
                  <Check className="h-3 w-3 text-[hsl(145_58%_55%)]" />
                </span>
                {b}
              </span>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button asChild size="lg" className="h-14 w-full bg-accent px-8 text-base text-accent-foreground hover:bg-accent/90 sm:w-auto">
              <a href="#kitchen">
                See Dining System <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-14 w-full border-white/20 bg-white/5 px-7 text-base text-white hover:bg-white/10 sm:w-auto">
              <a href="#how-it-works">
                <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/30">
                  <Play className="h-3 w-3 fill-current" />
                </span>
                How It Works
              </a>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex justify-center gap-4 overflow-x-auto pb-2 lg:justify-end lg:overflow-visible"
        >
          <OrderPhone />
          <YourOrderPhone />
          <ConfirmedPhone />
        </motion.div>
      </div>
    </section>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[208px] shrink-0 rounded-[2rem] border border-white/15 bg-[#06180f] p-2 shadow-2xl">
      <div className="overflow-hidden rounded-[1.6rem] bg-[#0a1f14]">
        <div className="flex items-center justify-between px-4 py-2 text-[9px] text-white/50">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-3 rounded-sm bg-white/40" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/40" />
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function OrderPhone() {
  const items = [
    { name: "Classic Burger", price: "$14.00", img: burgerImg },
    { name: "Buffalo Chicken Wrap", price: "$13.00", img: wrapImg },
    { name: "Chicken Tenders", price: "$12.00", img: clubImg },
    { name: "Fresh Fruit Cup", price: "$6.00", img: saladImg },
  ];
  return (
    <Phone>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between text-white">
          <MenuIcon className="h-4 w-4 text-white/60" />
          <span className="text-xs font-semibold">Order Food</span>
          <span className="w-4" />
        </div>
        <div>
          <div className="mb-1 text-[9px] text-white/45">Deliver To</div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white">
            Hole 7 <ChevronDown className="h-3 w-3 text-white/50" />
          </div>
        </div>
        <div className="text-[10px] font-medium text-white/55">Popular Items</div>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.name} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
              <img src={it.img} alt={it.name} className="h-9 w-9 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-medium text-white">{it.name}</div>
                <div className="text-[10px] text-[hsl(145_58%_55%)]">{it.price}</div>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/20 text-[hsl(145_58%_55%)]">
                <Plus className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
        <button className="w-full rounded-lg bg-[hsl(145_58%_42%)] py-2 text-[11px] font-semibold text-[#04130c]">
          View Full Menu
        </button>
      </div>
    </Phone>
  );
}

function YourOrderPhone() {
  const lines = [
    { qty: "1 ×", name: "Classic Burger", note: "No onions", price: "$14.00" },
    { qty: "1 ×", name: "Loaded Nachos", note: "Extra jalapeños", price: "$11.00" },
    { qty: "2 ×", name: "Bottled Water", note: "", price: "$6.00" },
  ];
  return (
    <Phone>
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between text-white">
          <ArrowLeft className="h-4 w-4 text-white/60" />
          <span className="text-xs font-semibold">Your Order</span>
          <span className="w-4" />
        </div>
        <div>
          <div className="mb-1 text-[9px] text-white/45">Deliver To</div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white">
            Hole 7 <ChevronDown className="h-3 w-3 text-white/50" />
          </div>
        </div>
        <div className="text-[10px] font-medium text-white/55">Order Items</div>
        <div className="space-y-2">
          {lines.map((l) => (
            <div key={l.name} className="flex items-start justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <div>
                <div className="text-[10px] font-medium text-white">
                  {l.qty} {l.name}
                </div>
                {l.note && <div className="text-[9px] text-white/45">{l.note}</div>}
              </div>
              <div className="text-[10px] font-medium text-white">{l.price}</div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-[9px] text-white/40">
          Add a note (optional)
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
          <span className="text-white/55">Estimated Total</span>
          <span className="font-semibold text-white">$31.00</span>
        </div>
        <button className="w-full rounded-lg bg-[hsl(145_58%_42%)] py-2 text-[11px] font-semibold text-[#04130c]">
          Place Order
        </button>
      </div>
    </Phone>
  );
}

function ConfirmedPhone() {
  return (
    <Phone>
      <div className="space-y-4 p-3">
        <div className="flex items-center justify-between text-white">
          <ArrowLeft className="h-4 w-4 text-white/60" />
          <span className="text-xs font-semibold">Order Confirmed</span>
          <span className="w-4" />
        </div>
        <div className="flex flex-col items-center px-2 py-3 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15">
            <CheckCircle2 className="h-10 w-10 text-[hsl(145_58%_55%)]" />
          </span>
          <div className="text-[11px] font-semibold text-white">
            Thanks! Your order has been received.
          </div>
          <div className="mt-4 w-full rounded-lg border border-white/10 bg-white/[0.03] py-3">
            <div className="text-[9px] text-white/45">Estimated Delivery</div>
            <div className="text-sm font-semibold text-[hsl(145_58%_55%)]">15–20 min</div>
          </div>
          <p className="mt-3 text-[9px] leading-relaxed text-white/50">
            We'll notify you when your order is on the way.
          </p>
        </div>
        <button className="w-full rounded-lg border border-white/15 bg-white/5 py-2 text-[11px] font-semibold text-white">
          View Order Status
        </button>
      </div>
    </Phone>
  );
}

function BenefitsSection() {
  const cards = [
    { icon: Smartphone, title: "Easy for Members", desc: "Order from anywhere on the course." },
    { icon: UtensilsCrossed, title: "Efficient for Staff", desc: "Real-time orders sent straight to the kitchen." },
    { icon: TrendingUp, title: "More Revenue", desc: "Increase order volume and order frequency." },
    { icon: Star, title: "Happier Members", desc: "Faster delivery and better service." },
  ];
  return (
    <section className="bg-[hsl(146_46%_9%)] px-4 py-20 text-white md:px-6 md:py-28">
      <div className="container mx-auto">
        <div className="mb-14 text-center">
          <p className="eyebrow mb-5 text-[hsl(145_58%_55%)]">Why It Works</p>
          <h2 className="text-3xl font-semibold md:text-4xl lg:text-5xl">
            A Better Dining Experience for Everyone
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center transition-colors hover:border-[hsl(145_58%_45%)]/40"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-white">{c.title}</h3>
              <p className="text-sm text-white/60">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Smartphone, n: "1", title: "Member Places Order", desc: "Member selects items and chooses their hole location." },
    { icon: ChefHat, n: "2", title: "Kitchen Receives Order", desc: "Order is sent to the kitchen in real-time." },
    { icon: UtensilsCrossed, n: "3", title: "Staff Delivers", desc: "Staff prepares and delivers the order to the member." },
  ];
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-[#04130c] px-4 py-20 text-white md:px-6 md:py-28">
      <div className="container mx-auto">
        <div className="mb-14 text-center">
          <p className="eyebrow mb-5 text-[hsl(145_58%_55%)]">How It Works</p>
          <h2 className="text-3xl font-semibold md:text-4xl lg:text-5xl">
            From Fairway to Fork in Three Steps
          </h2>
        </div>
        <div className="flex flex-col items-stretch justify-center gap-6 lg:flex-row lg:items-center">
          {steps.map((s, i) => (
            <div key={s.n} className="flex flex-col items-center gap-6 lg:flex-row">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
              >
                <span className="absolute right-4 top-4 font-display text-2xl font-semibold text-white/10">
                  {s.n}
                </span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm text-white/60">{s.desc}</p>
              </motion.div>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden h-6 w-6 shrink-0 text-[hsl(145_58%_55%)] lg:block" />
              )}
            </div>
          ))}
          <div className="hidden items-center gap-6 lg:flex">
            <ArrowRight className="h-6 w-6 shrink-0 text-[hsl(145_58%_55%)]" />
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Bell className="h-6 w-6" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

type KitchenOrder = {
  hole: string;
  cart: string;
  time: string;
  prep?: string;
  items: string[];
};

const newOrders: KitchenOrder[] = [
  { hole: "Hole 7", cart: "Cart #23", time: "11:41 AM", prep: "2 min", items: ["Classic Burger", "Loaded Nachos", "Bottled Water (2)"] },
  { hole: "Hole 12", cart: "Cart #45", time: "11:41 AM", prep: "3 min", items: ["Buffalo Chicken Wrap", "Fresh Fruit Cup"] },
  { hole: "Hole 15", cart: "Cart #7", time: "11:42 AM", prep: "1 min", items: ["Grilled Chicken Caesar", "Lemonade"] },
];

const inProgressOrders: KitchenOrder[] = [
  { hole: "Hole 4", cart: "Cart #11", time: "11:40 AM", prep: "5 min", items: ["Chicken Tenders", "Fries", "Extra Ranch"] },
  { hole: "Hole 9", cart: "Cart #18", time: "11:39 AM", prep: "6 min", items: ["Club Sandwich", "Bottled Water"] },
  { hole: "Hole 3", cart: "Cart #5", time: "11:38 AM", prep: "7 min", items: ["Turkey Wrap", "Side Salad"] },
  { hole: "Hole 16", cart: "Cart #32", time: "11:37 AM", prep: "8 min", items: ["Quesadilla", "Salsa, Sour Cream"] },
];

const readyOrders: KitchenOrder[] = [
  { hole: "Hole 2", cart: "Cart #2", time: "11:36 AM", items: ["Cheeseburger", "French Fries"] },
  { hole: "Hole 11", cart: "Cart #19", time: "11:35 AM", items: ["Chicken Caesar Wrap", "Bottled Water"] },
  { hole: "Hole 8", cart: "Cart #14", time: "11:34 AM", items: ["Cobb Salad", "Iced Tea"] },
];

const completedOrders = [
  { hole: "Hole 1", time: "11:33 AM" },
  { hole: "Hole 5", time: "11:30 AM" },
  { hole: "Hole 6", time: "11:28 AM" },
  { hole: "Hole 10", time: "11:27 AM" },
  { hole: "Hole 13", time: "11:25 AM" },
];

function OnTimeGauge({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(0 0% 100% / 0.08)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="hsl(145 58% 50%)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold text-white">{value}%</span>
        <span className="text-[8px] uppercase tracking-wider text-white/50">On-Time</span>
      </div>
    </div>
  );
}

function OrderCard({ order, accent }: { order: KitchenOrder; accent: "green" | "amber" | "ready" }) {
  const bar = accent === "amber" ? "bg-accent" : "bg-[hsl(145_58%_45%)]";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${bar}`} />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
              {accent === "ready" && <Check className="h-3.5 w-3.5 text-[hsl(145_58%_55%)]" />}
              {order.hole}
            </div>
            <div className="text-[10px] text-white/45">
              {order.cart} · {order.time}
            </div>
          </div>
        </div>
        {order.prep && (
          <span className={`shrink-0 text-[11px] font-medium ${accent === "amber" ? "text-accent" : "text-[hsl(145_58%_55%)]"}`}>
            {order.prep}
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-0.5 pl-3">
        {order.items.map((it) => (
          <li key={it} className="text-[12px] text-white/75">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KitchenColumn({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "green" | "amber";
  children: React.ReactNode;
}) {
  const header =
    tone === "amber"
      ? "bg-accent/20 text-accent border-accent/30"
      : "bg-[hsl(145_58%_45%)]/20 text-[hsl(145_58%_55%)] border-[hsl(145_58%_45%)]/30";
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
      <div className={`mb-2.5 rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wide ${header}`}>
        {title} ({count})
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function KitchenDashboardSection() {
  return (
    <section id="kitchen" className="scroll-mt-20 bg-[hsl(146_46%_9%)] px-4 py-20 text-white md:px-6 md:py-28">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <p className="eyebrow mb-5 text-[hsl(145_58%_55%)]">The Command Center</p>
          <h2 className="text-3xl font-semibold md:text-4xl lg:text-5xl">
            A Live Kitchen Dashboard
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/60">
            Every order flows across the board in real time — from the moment a member taps
            "Send Order" to delivery at their cart.
          </p>
        </div>

        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#04130c]/80 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <h3 className="font-display text-base font-semibold tracking-wide text-white">
              LIVE KITCHEN
            </h3>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[hsl(145_58%_55%)]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[hsl(145_58%_55%)]" />
              Live
            </span>
          </div>

          <div className="grid gap-3 p-3 md:p-4 lg:grid-cols-5">
            <KitchenColumn title="New Orders" count={5} tone="green">
              {newOrders.map((o) => (
                <OrderCard key={o.hole} order={o} accent="green" />
              ))}
              <div className="px-1 pt-0.5 text-[11px] text-[hsl(145_58%_55%)]">+2 more orders</div>
            </KitchenColumn>

            <KitchenColumn title="In Progress" count={4} tone="amber">
              {inProgressOrders.map((o) => (
                <OrderCard key={o.hole} order={o} accent="amber" />
              ))}
            </KitchenColumn>

            <KitchenColumn title="Ready" count={3} tone="green">
              {readyOrders.map((o) => (
                <OrderCard key={o.hole} order={o} accent="ready" />
              ))}
            </KitchenColumn>

            <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
              <div className="mb-2.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/70">
                Completed (12)
              </div>
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10 bg-white/[0.03]">
                {completedOrders.map((o) => (
                  <li key={o.hole} className="flex items-center justify-between px-3 py-2 text-[12px]">
                    <span className="text-white/75">{o.hole}</span>
                    <span className="text-white/40">{o.time}</span>
                  </li>
                ))}
                <li className="px-3 py-2 text-[11px] text-[hsl(145_58%_55%)]">+7 more orders</li>
              </ul>
            </div>

            <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/60">
                Kitchen Performance
              </div>
              <div className="mb-4 flex justify-center">
                <OnTimeGauge value={96} />
              </div>
              <div className="space-y-3 text-center">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/45">Orders Today</div>
                  <div className="font-display text-lg font-semibold text-white">68</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/45">Avg Prep Time</div>
                  <div className="font-display text-lg font-semibold text-white">11 min</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-white/45">Time Saved</div>
                  <div className="font-display text-lg font-semibold text-[hsl(145_58%_55%)]">2.4 hrs</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs">
            <span className="flex items-center gap-2 text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(145_58%_55%)]" />
              All orders synced in real-time
            </span>
            <span className="font-medium text-[hsl(145_58%_55%)]">Open Full Dashboard</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveKitchenImage() {
  return (
    <section className="bg-[#04130c] px-4 pb-20 md:px-6 md:pb-28">
      <div className="container mx-auto">
        <div className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
          <img
            src={liveKitchenImg}
            alt="Fairway360 Live Kitchen board displayed over the clubhouse kitchen line as staff prepare on-course orders"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { icon: TrendingUp, val: "23%", label: "Average Increase in F&B Revenue" },
    { icon: Clock, val: "15 min", label: "Average Time Saved per Order" },
    { icon: ThumbsUp, val: "98%", label: "Member Satisfaction" },
    { icon: DollarSign, val: "$18.60", label: "Average Order Value" },
  ];
  return (
    <section className="bg-[#04130c] px-4 pb-20 md:px-6 md:pb-28">
      <div className="container mx-auto">
        <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[hsl(145_58%_45%)]/15 text-[hsl(145_58%_55%)]">
                <s.icon className="h-6 w-6" />
              </span>
              <div>
                <div className="font-display text-2xl font-semibold text-white">{s.val}</div>
                <div className="text-xs text-white/55">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-[hsl(146_46%_9%)] px-4 py-20 text-center text-white md:px-6 md:py-28">
      <div className="container mx-auto max-w-3xl">
        <h2 className="mb-6 text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
          Turn Every Round Into a Dining Opportunity
        </h2>
        <p className="mb-10 text-lg text-white/70">
          See how Fairway360 dining automation drives revenue and delights your
          members.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild size="lg" className="h-14 bg-accent px-8 text-base text-accent-foreground hover:bg-accent/90">
            <Link href="/demo">Book a Demo</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 border-white/20 bg-white/5 px-8 text-base text-white hover:bg-white/10">
            <Link href="/pricing">See Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
