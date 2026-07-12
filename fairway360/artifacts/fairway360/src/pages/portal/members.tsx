import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home, CalendarDays, UtensilsCrossed, Trophy, CreditCard, Sparkles,
  Flag, FileText, ShieldCheck, Bell, Check, Send, Bot,
  ArrowRight, User, Users, Phone, HelpCircle, MessagesSquare,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMemberDashboard,
  useGetMemberPayments,
  useBookTeeTime,
  useRsvpEvent,
  useAgentChat,
  useCreateCheckout,
  getGetMemberDashboardQueryKey,
} from "@workspace/api-client-react";
import { PortalShell, type PortalNavItem, type PortalNotification } from "@/components/portal/portal-shell";
import { MemberOrder } from "@/components/portal/member-order";
import { ChannelChat } from "@/components/portal/channel-chat";
import { MemberPreferences } from "@/components/portal/member-preferences";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useOrders } from "@/lib/orders-store";
import { teeTimeSlots, diningSlots, conciergeSuggestions } from "@/lib/portal-data";

function slotToISO(slot: string): string {
  const [time, ampm] = slot.trim().split(" ");
  const [hRaw, mRaw] = time.split(":");
  let h = Number(hRaw);
  const m = Number(mRaw);
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
import clubhouseHero from "@assets/generated_images/portal_clubhouse_hero.jpg";

type SectionKey = "home" | "book" | "order" | "events" | "messages" | "account" | "concierge";

const NAV: PortalNavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "book", label: "Book Tee Time", icon: CalendarDays },
  { key: "order", label: "Order Food", icon: UtensilsCrossed },
  { key: "events", label: "Events", icon: Trophy },
  { key: "messages", label: "Messages", icon: MessagesSquare },
  { key: "account", label: "Account", icon: CreditCard },
  { key: "concierge", label: "Concierge", icon: Sparkles },
];

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
});

function Glass({
  className, children, i = 0, onClick,
}: { className?: string; children: React.ReactNode; i?: number; onClick?: () => void }) {
  return (
    <motion.div
      {...fade(i)}
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function MembersPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { orders } = useOrders();
  const dash = useGetMemberDashboard();
  const paymentsQ = useGetMemberPayments();
  const bookTee = useBookTeeTime();
  const rsvp = useRsvpEvent();
  const agentChat = useAgentChat();
  const checkout = useCreateCheckout();

  const account = dash.data?.account;
  const upcoming = dash.data?.upcoming ?? [];
  const events = dash.data?.events ?? [];
  const announcements = dash.data?.announcements ?? [];
  const payments = paymentsQ.data ?? [];
  const nextTee = upcoming[0];
  const fullName = account?.name ?? user?.name ?? "Member";
  const firstName = fullName.split(" ")[0];
  const clubName = user?.clubName ?? "your club";
  const initials = user?.initials ?? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2);
  const balance = account?.balance ?? 0;

  const [section, setSection] = useState<SectionKey>("home");
  const [selectedTee, setSelectedTee] = useState<string | null>(null);
  const [players, setPlayers] = useState(4);
  const [selectedDining, setSelectedDining] = useState<string | null>(null);
  const [rsvped, setRsvped] = useState<string[]>([]);
  const [chat, setChat] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: `Good morning, ${firstName}. I'm your Fairway360 concierge — ask me about tee times, food, events, or your account.` },
  ]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const conciergeBusy = agentChat.isPending;

  async function payBalance() {
    try {
      const { url } = await checkout.mutateAsync();
      window.location.href = url;
    } catch {
      toast({
        title: "Payments unavailable",
        description: "Online payments aren't set up yet. Please see the front desk.",
        variant: "destructive",
      });
    }
  }

  const myOrders = orders.filter((o) => o.member === fullName && o.status !== "Delivered");

  function go(s: SectionKey) {
    setSection(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleRsvp(id: string, title: string) {
    const has = rsvped.includes(id);
    if (!has) {
      try {
        await rsvp.mutateAsync({ id, data: { partySize: 1 } });
        queryClient.invalidateQueries({ queryKey: getGetMemberDashboardQueryKey() });
      } catch {
        toast({ title: "Couldn't RSVP", description: "Please try again.", variant: "destructive" });
        return;
      }
    }
    setRsvped((prev) => (has ? prev.filter((x) => x !== id) : [...prev, id]));
    toast({ title: has ? "RSVP cancelled" : "You're in!", description: has ? `Removed from ${title}.` : `Reserved your spot at ${title}.` });
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || conciergeBusy) return;
    setChat((c) => [...c, { role: "user", text: q }]);
    setDraft("");
    try {
      const res = await agentChat.mutateAsync({ data: { conversationId, message: q } });
      if (res.conversationId) setConversationId(res.conversationId);
      setChat((c) => [...c, { role: "ai", text: res.reply }]);
    } catch {
      setChat((c) => [...c, { role: "ai", text: "Sorry, I couldn't reach the concierge just now. Please try again in a moment." }]);
    }
  }

  const SERVICES = [
    { id: "tee", label: "Tee Times", icon: Flag, desc: "Book, manage, and view your upcoming tee times.", cta: "Book a Tee Time", on: () => go("book") },
    { id: "dining", label: "Dining", icon: UtensilsCrossed, desc: "View menus, place orders, and make reservations.", cta: "View Dining Options", on: () => go("order") },
    { id: "events", label: "Events", icon: CalendarDays, desc: "Explore upcoming events and club activities.", cta: "View Events", on: () => go("events") },
    { id: "account", label: "My Account", icon: User, desc: "Update your profile, preferences, and more.", cta: "Manage Account", on: () => go("account") },
    { id: "statements", label: "Statements", icon: FileText, desc: "View your statements and payment history.", cta: "View Statements", on: () => go("account") },
  ] as const;

  // Built from the member's real dashboard data (tee times + club events).
  const RESERVATIONS = [
    ...upcoming.slice(0, 2).map((u) => ({
      id: `tee-${u.id}`,
      icon: Flag,
      title: "Tee Time · Pines Course",
      date: `${u.date} · ${u.time}`,
      status: "Confirmed",
      tone: "green" as const,
      on: () => go("book"),
    })),
    ...events.slice(0, 2).map((e) => ({
      id: `ev-${e.id}`,
      icon: Trophy,
      title: e.title,
      date: `${e.date} · ${e.time}`,
      status: "Event",
      tone: "gold" as const,
      on: () => go("events"),
    })),
  ];

  const FOOTER_LINKS = [
    { id: "directory", label: "Club Directory", icon: Users, on: () => toast({ title: "Club Directory", description: "Member directory is available at the front desk." }) },
    { id: "contact", label: "Contact Us", icon: Phone, on: () => toast({ title: "Contact Us", description: "Call the clubhouse at (706) 555-0142." }) },
    { id: "policies", label: "Club Policies", icon: ShieldCheck, on: () => toast({ title: "Club Policies", description: "Dress code and course etiquette guidelines." }) },
    { id: "help", label: "Help Center", icon: HelpCircle, on: () => go("concierge") },
  ];

  const notifications: PortalNotification[] = [
    ...(nextTee
      ? [{
          id: "tee",
          title: "Upcoming tee time",
          detail: `${nextTee.date} · ${nextTee.time}`,
          tone: "gold" as const,
          onClick: () => go("book"),
        }]
      : []),
    ...(balance > 0
      ? [{
          id: "balance",
          title: `Balance due: $${balance.toFixed(2)}`,
          detail: "View your account",
          tone: "red" as const,
          onClick: () => go("account"),
        }]
      : []),
  ];

  return (
    <PortalShell
      consoleLabel="Member Portal"
      nav={NAV}
      active={section}
      onSelect={(k) => go(k as SectionKey)}
      user={{ name: fullName, role: account?.tier ? `${account.tier} Member` : "Member", initials }}
      notifications={notifications}
    >
        {/* Section content */}
        <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
          {section === "home" && (
            <div className="space-y-6">
              {/* Welcome hero with clubhouse photo */}
              <Glass className="overflow-hidden p-0">
                <div className="grid lg:grid-cols-2">
                  <div className="relative z-10 order-2 p-7 sm:p-9 lg:order-1">
                    <p className="text-lg font-medium text-white/65">Welcome to</p>
                    <h1 className="mt-0.5 font-display text-4xl font-semibold leading-[1.02] text-white sm:text-5xl">{clubName}</h1>
                    <div className="mt-4 h-1 w-16 rounded-full bg-accent" />
                    <p className="mt-4 text-base text-white/70">Your home for everything club.</p>

                    {/* Next tee time card */}
                    <div className="mt-7 rounded-2xl border border-accent/30 bg-[#04130c]/60 p-4 backdrop-blur">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><CalendarDays className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-white/45">Next Tee Time</div>
                          <div className="font-display text-lg font-semibold text-white">{nextTee ? `${nextTee.date} · ${nextTee.time}` : "No upcoming tee time"}</div>
                          <div className="text-sm text-white/55">Pines Course · Hole 1</div>
                          <button onClick={() => go("book")} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline" data-testid="link-view-tee-times">View Tee Times <ArrowRight className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="relative order-1 min-h-[220px] lg:order-2 lg:min-h-full">
                    <img src={clubhouseHero} alt="Clubhouse at sunset" decoding="async" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#04130c] via-[#04130c]/40 to-transparent lg:bg-gradient-to-l lg:via-[#04130c]/20" />
                  </div>
                </div>
              </Glass>

              {/* Club services */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {SERVICES.map((s, i) => (
                  <Glass key={s.id} i={i} className="hover-lift">
                    <button onClick={s.on} data-testid={`service-${s.id}`} className="press flex h-full w-full flex-col gap-2 rounded-2xl p-4 text-left transition-colors hover:bg-white/[0.05]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent"><s.icon className="h-5 w-5" /></div>
                      <div className="font-display text-base font-semibold text-white">{s.label}</div>
                      <p className="text-xs leading-relaxed text-white/55">{s.desc}</p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-accent">{s.cta} <ArrowRight className="h-3 w-3" /></span>
                    </button>
                  </Glass>
                ))}
              </div>

              {/* Reservations + announcements */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Glass className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">Upcoming Reservations &amp; Events</h2>
                    <button onClick={() => go("events")} className="text-xs font-semibold text-accent hover:underline" data-testid="link-reservations-all">View All</button>
                  </div>
                  <div className="space-y-2.5">
                    {RESERVATIONS.map((r) => (
                      <button key={r.id} onClick={r.on} data-testid={`reservation-${r.id}`} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><r.icon className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">{r.title}</div>
                          <div className="text-xs text-white/50">{r.date}</div>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", r.tone === "gold" ? "bg-accent/15 text-accent" : "bg-emerald-400/15 text-emerald-300")}>{r.status}</span>
                      </button>
                    ))}
                  </div>
                </Glass>

                <Glass className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">Club Announcements</h2>
                    <button onClick={() => go("events")} className="text-xs font-semibold text-accent hover:underline" data-testid="link-announcements-all">View All</button>
                  </div>
                  <div className="space-y-4">
                    {announcements.length === 0 && <p className="text-sm text-white/55">No announcements right now.</p>}
                    {announcements.slice(0, 4).map((a) => (
                      <div key={a.id} className="flex gap-3" data-testid={`announcement-${a.id}`}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Bell className="h-5 w-5" /></div>
                        <div className="min-w-0">
                          <div className="mb-0.5 flex items-center gap-2">
                            {a.tag && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">{a.tag}</span>}
                            <span className="text-xs text-white/40">{a.date}</span>
                          </div>
                          <div className="text-sm font-semibold text-white">{a.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Glass>
              </div>

              {/* Footer links */}
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm">
                {FOOTER_LINKS.map((f) => (
                  <button key={f.id} onClick={f.on} data-testid={`footerlink-${f.id}`} className="inline-flex items-center gap-2 text-white/55 transition-colors hover:text-accent">
                    <f.icon className="h-4 w-4" />{f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === "book" && (
            <Glass className="p-6">
              <h2 className="mb-5 font-display text-xl font-semibold text-white">Book a Tee Time</h2>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-sm font-medium text-white/80">Players</div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <button key={n} onClick={() => setPlayers(n)} className={cn("press h-11 w-11 rounded-xl border text-sm font-semibold transition-colors", players === n ? "border-accent bg-accent text-accent-foreground" : "border-white/15 bg-white/5 text-white hover:bg-white/10")} data-testid={`players-${n}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-white/80">Available times — Tomorrow</div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {teeTimeSlots.map((slot) => (
                      <button key={slot} onClick={() => setSelectedTee(slot)} className={cn("press rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors", selectedTee === slot ? "border-accent bg-accent text-accent-foreground" : "border-white/15 bg-white/5 text-white hover:bg-white/10")} data-testid={`tee-${slot}`}>{slot}</button>
                    ))}
                  </div>
                </div>
                <Button
                  disabled={!selectedTee || bookTee.isPending}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={async () => {
                    if (!selectedTee) return;
                    try {
                      await bookTee.mutateAsync({ data: { startsAt: slotToISO(selectedTee), players, holes: 18 } });
                      queryClient.invalidateQueries({ queryKey: getGetMemberDashboardQueryKey() });
                      toast({ title: "Tee time booked!", description: `${selectedTee} tomorrow for ${players} player${players > 1 ? "s" : ""}.` });
                      setSelectedTee(null);
                    } catch {
                      toast({ title: "Booking failed", description: "Please try again.", variant: "destructive" });
                    }
                  }}
                  data-testid="button-confirm-tee"
                >
                  {selectedTee ? `Confirm ${selectedTee} · ${players} players` : "Select a time"}
                </Button>
              </div>
            </Glass>
          )}

          {section === "order" && (
            <div className="space-y-6">
              <MemberOrder />
              <Glass className="p-6">
                <h2 className="mb-5 font-display text-xl font-semibold text-white">Reserve a Table — Sunset Grill</h2>
                <div className="space-y-6">
                  <div>
                    <div className="mb-2 text-sm font-medium text-white/80">Available this evening</div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {diningSlots.map((slot) => (
                        <button key={slot} onClick={() => setSelectedDining(slot)} className={cn("press rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors", selectedDining === slot ? "border-accent bg-accent text-accent-foreground" : "border-white/15 bg-white/5 text-white hover:bg-white/10")} data-testid={`dining-${slot}`}>{slot}</button>
                      ))}
                    </div>
                  </div>
                  <Button
                    disabled={!selectedDining}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={() => { toast({ title: "Reservation requested", description: `The clubhouse will confirm your table at Sunset Grill for ${selectedDining}.` }); setSelectedDining(null); }}
                    data-testid="button-confirm-dining"
                  >
                    {selectedDining ? `Request ${selectedDining}` : "Select a time"}
                  </Button>
                </div>
              </Glass>
            </div>
          )}

          {section === "events" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((e, i) => {
                const joined = rsvped.includes(e.id);
                return (
                  <Glass key={e.id} i={i} className="hover-lift p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">{e.tag}</span>
                      <span className="text-sm text-white/50">{e.spots}</span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white">{e.title}</h3>
                    <p className="mb-4 mt-1 text-sm text-white/55">{e.date} · {e.time}</p>
                    <Button
                      className={cn("w-full", joined ? "border border-white/20 bg-white/5 text-white hover:bg-white/10" : "bg-accent text-accent-foreground hover:bg-accent/90")}
                      onClick={() => toggleRsvp(e.id, e.title)}
                      data-testid={`rsvp-${e.id}`}
                    >
                      {joined ? <><Check className="mr-2 h-4 w-4" />Going</> : "RSVP"}
                    </Button>
                  </Glass>
                );
              })}
            </div>
          )}

          {section === "messages" && <ChannelChat />}

          {section === "account" && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Glass className="p-6 lg:col-span-1">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Membership</h2>
                <div className="space-y-3 text-sm">
                  <Row label="Member" value={fullName} />
                  <Row label="Member No." value={account?.number ?? "—"} />
                  <Row label="Tier" value={<span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">{account?.tier ?? "—"}</span>} />
                  <Row label="Member since" value={account?.memberSince ?? "—"} />
                  <Row label="Balance" value={`$${balance.toFixed(2)}`} />
                  <Button
                    className="mt-2 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={payBalance}
                    disabled={balance <= 0 || checkout.isPending}
                    data-testid="button-pay-balance"
                  >
                    {checkout.isPending ? "Starting checkout…" : "Pay Balance"}
                  </Button>
                </div>
              </Glass>
              <Glass className="p-6 lg:col-span-2">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Recent Charges</h2>
                <div>
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border-b border-white/10 py-3 last:border-0">
                      <div>
                        <div className="font-medium text-white">{p.label}</div>
                        <div className="text-xs text-white/45">{p.date}</div>
                      </div>
                      <div className="font-medium text-white">${p.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </Glass>
              <Glass className="p-6 lg:col-span-3">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Dining & AI Preferences</h2>
                <MemberPreferences />
              </Glass>
            </div>
          )}

          {section === "concierge" && (
            <Glass className="flex h-[60vh] min-h-[420px] flex-col p-0">
              <div className="flex items-center gap-3 border-b border-white/10 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent"><Bot className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">Fairway360 AI Concierge</h2>
                  <p className="text-xs text-emerald-300">Online · usually replies instantly</p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
                {chat.map((m, idx) => (
                  <div key={idx} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-accent text-accent-foreground" : "bg-white/5 text-white/90")}>{m.text}</div>
                  </div>
                ))}
                {conciergeBusy && (
                  <div className="flex justify-start" aria-label="Concierge is typing">
                    <div className="flex items-center gap-1 rounded-2xl bg-white/5 px-4 py-3">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/50" />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {conciergeSuggestions.map((s, i) => (
                    <button key={s} onClick={() => ask(s)} disabled={conciergeBusy} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50" data-testid={`suggest-${i}`}>{s}</button>
                  ))}
                </div>
                <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="Ask the AI concierge"
                    placeholder="Ask the concierge…"
                    className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 focus:border-accent/60 focus:outline-none"
                    data-testid="input-concierge"
                  />
                  <Button type="submit" size="icon" disabled={conciergeBusy} className="h-11 w-11 bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-concierge-send" aria-label="Send"><Send className="h-4 w-4" /></Button>
                </form>
              </div>
            </Glass>
          )}
        </motion.div>
    </PortalShell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

