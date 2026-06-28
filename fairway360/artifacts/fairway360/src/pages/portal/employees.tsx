import { useState, type ComponentType } from "react";
import { motion } from "framer-motion";
import {
  Home, Coffee, ListChecks, CalendarDays, CalendarX, Users,
  Clock, MapPin, Megaphone,
  Play, Pause, MessageSquare, Sun, ArrowRight,
} from "lucide-react";
import { PortalShell, type PortalNavItem, type PortalNotification } from "@/components/portal/portal-shell";
import { ServiceBoard } from "@/components/portal/service-board";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useOrders } from "@/lib/orders-store";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyShifts, useGetMyTasks, useGetMyTimeOff, useGetTeam, useGetCourseRounds,
  useUpdateTask, useRequestTimeOff, useClockIn, useClockOut,
  useGetMyMessages, useMarkMessageRead, useListAnnouncements, useListEvents,
  getGetMyShiftsQueryKey, getGetMyTasksQueryKey, getGetMyTimeOffQueryKey,
  getGetMyMessagesQueryKey,
} from "@workspace/api-client-react";
import {
  employeeAccount,
  type MemberOnCourse, type CourseStatus,
} from "@/lib/portal-data";
import { ChannelChat } from "@/components/portal/channel-chat";
import { HandoffPanel } from "@/components/portal/handoff-panel";
import clubhouseHero from "@assets/generated_images/portal_clubhouse_hero.jpg";

type SectionKey = "home" | "service" | "channels" | "tasks" | "schedule" | "timeoff" | "team";
type Icon = ComponentType<{ className?: string }>;

const NAV: PortalNavItem[] = [
  { key: "home", label: "My Shift", icon: Home },
  { key: "service", label: "F&B Service", icon: Coffee },
  { key: "channels", label: "Channels", icon: MessageSquare },
  { key: "tasks", label: "My Tasks", icon: ListChecks },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "timeoff", label: "Time Off", icon: CalendarX },
  { key: "team", label: "Team", icon: Users },
];

const shiftDark: Record<string, string> = {
  "On Shift": "border-emerald-400/25 bg-emerald-500/15 text-emerald-300",
  "On Break": "border-accent/30 bg-accent/15 text-accent",
  "Clocked Out": "border-white/15 bg-white/5 text-white/55",
  "Off Today": "border-white/15 bg-white/5 text-white/55",
};

const shiftDot: Record<string, string> = {
  "On Shift": "bg-emerald-400",
  "On Break": "bg-accent",
  "Clocked Out": "bg-white/30",
  "Off Today": "bg-white/30",
};

const timeOffDark: Record<string, string> = {
  Approved: "border-emerald-400/25 bg-emerald-500/15 text-emerald-300",
  Pending: "border-accent/30 bg-accent/15 text-accent",
  Denied: "border-red-400/25 bg-red-500/15 text-red-300",
};

const priorityDark: Record<string, string> = {
  High: "border-red-400/25 bg-red-500/15 text-red-300",
  Medium: "border-accent/30 bg-accent/15 text-accent",
  Low: "border-sky-400/25 bg-sky-500/15 text-sky-300",
};

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as const },
});

function Glass({
  className, children, i = 0,
}: { className?: string; children: React.ReactNode; i?: number }) {
  return (
    <motion.div
      {...fade(i)}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function EmployeesPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { orders } = useOrders();
  const [section, setSection] = useState<SectionKey>("home");
  const [onBreak, setOnBreak] = useState(false);

  const shiftsQ = useGetMyShifts();
  const tasksQ = useGetMyTasks();
  const timeOffQ = useGetMyTimeOff();
  const teamQ = useGetTeam();
  const roundsQ = useGetCourseRounds();
  const updateTask = useUpdateTask();
  const requestTimeOff = useRequestTimeOff();
  const clockInM = useClockIn();
  const clockOutM = useClockOut();
  const messagesQ = useGetMyMessages();
  const markRead = useMarkMessageRead();
  const announcementsQ = useListAnnouncements();
  const eventsQ = useListEvents();

  const shifts = shiftsQ.data ?? [];
  const tasks = tasksQ.data ?? [];
  const timeOff = timeOffQ.data ?? [];
  const team = teamQ.data ?? [];
  const rounds = roundsQ.data ?? [];
  const messages = messagesQ.data ?? [];
  const announcements = announcementsQ.data ?? [];
  const events = eventsQ.data ?? [];
  const unreadMessages = messages.filter((m) => !m.read).length;

  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [toStart, setToStart] = useState("");
  const [toEnd, setToEnd] = useState("");
  const [toReason, setToReason] = useState("");

  const courseMembers: MemberOnCourse[] = rounds.map((r) => ({
    id: r.id,
    name: r.name,
    initials: r.initials,
    hole: r.hole,
    cartNumber: r.cartNumber ?? "",
    status: r.status as CourseStatus,
    pace: r.pace as MemberOnCourse["pace"],
    since: r.since ?? "",
    x: r.x,
    y: r.y,
  }));

  const todayShift = shifts.find((s) => s.status === "Today") ?? shifts[0];
  const clockedIn = todayShift?.clockedIn ?? false;

  const fullName = user?.name ?? "Team Member";
  const firstName = fullName.split(" ")[0];
  const initials =
    user?.initials ?? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const clubName = user?.clubName ?? "Augusta Pines";

  const openTasks = tasks.filter((t) => !t.done).length;
  const activeOrders = orders.filter((o) => o.status !== "Delivered").length;
  const onShiftCount = team.filter((t) => t.status === "On Shift" || t.status === "On Break").length;
  const myStatus = !clockedIn ? "Clocked Out" : onBreak ? "On Break" : "On Shift";

  function go(s: SectionKey) {
    setSection(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleTask(id: string, done: boolean) {
    try {
      await updateTask.mutateAsync({ id, data: { done: !done } });
      queryClient.invalidateQueries({ queryKey: getGetMyTasksQueryKey() });
    } catch {
      toast({ title: "Could not update task", description: "Please try again.", variant: "destructive" });
    }
  }

  async function toggleClock() {
    if (!todayShift) return;
    try {
      if (clockedIn) {
        await clockOutM.mutateAsync({ id: todayShift.id });
        setOnBreak(false);
        toast({ title: "Clocked out", description: "Shift ended. See you next time." });
      } else {
        await clockInM.mutateAsync({ id: todayShift.id });
        toast({ title: "Clocked in", description: `Have a great shift, ${firstName}.` });
      }
      queryClient.invalidateQueries({ queryKey: getGetMyShiftsQueryKey() });
    } catch {
      toast({ title: "Could not update clock status", description: "Please try again.", variant: "destructive" });
    }
  }

  async function submitTimeOff() {
    if (!toStart || !toEnd || !toReason.trim()) return;
    if (toEnd < toStart) {
      toast({ title: "Check your dates", description: "End date can't be before the start date.", variant: "destructive" });
      return;
    }
    try {
      await requestTimeOff.mutateAsync({
        data: { startDate: toStart, endDate: toEnd, reason: toReason.trim() },
      });
      queryClient.invalidateQueries({ queryKey: getGetMyTimeOffQueryKey() });
      setTimeOffOpen(false);
      setToStart("");
      setToEnd("");
      setToReason("");
      toast({ title: "Request submitted", description: "Your supervisor will review your time-off request." });
    } catch {
      toast({ title: "Could not submit request", description: "Please try again.", variant: "destructive" });
    }
  }

  function toggleBreak() {
    setOnBreak((b) => {
      const next = !b;
      toast({ title: next ? "On break" : "Back on shift", description: next ? "Enjoy your break." : "Welcome back." });
      return next;
    });
  }

  const QUICK_LINKS: { label: string; icon: Icon; action: () => void }[] = [
    { label: "Team Directory", icon: Users, action: () => go("team") },
    { label: "Club Calendar", icon: CalendarDays, action: () => go("schedule") },
    { label: "F&B Service", icon: Coffee, action: () => go("service") },
    { label: "Request Time Off", icon: CalendarX, action: () => { go("timeoff"); setTimeOffOpen(true); } },
  ];

  const notifications: PortalNotification[] = [
    ...messages
      .filter((m) => !m.read)
      .map((m) => ({
        id: `msg-${m.id}`,
        title: `Message from ${m.from}`,
        detail: m.body,
        tone: "gold" as const,
        onClick: async () => {
          try {
            await markRead.mutateAsync({ id: m.id });
            queryClient.invalidateQueries({ queryKey: getGetMyMessagesQueryKey() });
          } catch {
            /* non-blocking */
          }
        },
      })),
    ...(openTasks > 0
      ? [{
          id: "tasks",
          title: `${openTasks} task${openTasks > 1 ? "s" : ""} due`,
          detail: "Check your task list",
          tone: "gold" as const,
          onClick: () => go("tasks"),
        }]
      : []),
    ...(activeOrders > 0
      ? [{
          id: "orders",
          title: `${activeOrders} order${activeOrders > 1 ? "s" : ""} in progress`,
          detail: "Open the F&B board",
          tone: "default" as const,
          onClick: () => go("service"),
        }]
      : []),
  ];

  return (
    <PortalShell
      consoleLabel="Team Workspace"
      nav={NAV}
      active={section}
      onSelect={(k) => go(k as SectionKey)}
      user={{ name: fullName, role: employeeAccount.role, initials }}
      notifications={notifications}
      showPresence
    >
        {/* Greeting */}
        <motion.div {...fade(0)} className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 text-accent">{employeeAccount.role} · {clubName}</p>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">Good morning, {firstName}</h1>
              <Sun className="h-6 w-6 text-accent" />
            </div>
            <p className="mt-1 text-base text-white/60">Here's what's happening today.</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium", shiftDark[myStatus])}>
            <span className={cn("h-2 w-2 rounded-full", shiftDot[myStatus])} />{myStatus}
          </span>
        </motion.div>

        {/* Section content */}
        <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
          {section === "home" && (
            <div className="space-y-6">
              <HandoffPanel />
              {/* Welcome banner with photo + clock controls */}
              <Glass className="relative overflow-hidden p-0">
                <div className="absolute inset-0">
                  <img src={clubhouseHero} alt="Augusta Pines clubhouse at sunset" decoding="async" fetchPriority="high" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#04130c] via-[#04130c]/85 to-[#04130c]/40" />
                </div>
                <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                  <div>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium", shiftDark[myStatus])}>
                      <span className={cn("h-2 w-2 rounded-full", shiftDot[myStatus])} />{myStatus}
                    </span>
                    <h2 className="mt-3 font-display text-2xl font-semibold text-white">Today's Shift</h2>
                    <p className="mt-1 text-white/70">{todayShift?.time ?? employeeAccount.shift} · {todayShift?.role ?? employeeAccount.station}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button className={cn(clockedIn ? "bg-white/10 text-white hover:bg-white/20" : "bg-accent text-accent-foreground hover:bg-accent/90")} onClick={toggleClock} data-testid="button-clock">
                      {clockedIn ? <><Pause className="mr-2 h-4 w-4" />Clock Out</> : <><Play className="mr-2 h-4 w-4" />Clock In</>}
                    </Button>
                    {clockedIn && (
                      <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={toggleBreak} data-testid="button-break">
                        {onBreak ? <><Play className="mr-2 h-4 w-4" />End Break</> : <><Pause className="mr-2 h-4 w-4" />Take Break</>}
                      </Button>
                    )}
                  </div>
                </div>
              </Glass>

              {/* Stat tiles */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Glass i={0} className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-accent"><Clock className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">My Shift</span></div>
                  <div className="text-sm font-bold text-white">{todayShift?.time ?? employeeAccount.shift}</div>
                  <div className="mt-0.5 text-xs text-white/50">{employeeAccount.role} · {todayShift?.role ?? employeeAccount.station}</div>
                </Glass>
                <Glass i={1} className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-emerald-300"><CalendarDays className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Shifts Scheduled</span></div>
                  <div className="text-2xl font-bold text-white">{shifts.length}</div>
                  <div className="mt-0.5 text-xs text-white/50">Upcoming on your roster</div>
                </Glass>
                <Glass i={2} className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-accent"><ListChecks className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Tasks Due</span></div>
                  <div className="text-2xl font-bold text-white">{openTasks}</div>
                  <div className="mt-0.5 text-xs text-white/50">Tasks remaining</div>
                </Glass>
                <Glass i={3} className="p-4">
                  <div className="mb-2 flex items-center gap-2 text-accent"><MessageSquare className="h-4 w-4" /><span className="text-[11px] font-semibold uppercase tracking-wide text-white/55">Unread Messages</span></div>
                  <div className="text-2xl font-bold text-white">{unreadMessages}</div>
                  <div className="mt-0.5 text-xs text-white/50">{unreadMessages === 0 ? "You're all caught up" : "From your supervisor"}</div>
                </Glass>
              </div>

              {/* F&B service CTA */}
              <Glass className="relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent"><Coffee className="h-6 w-6" /></div>
                    <div>
                      <h2 className="font-display text-xl font-semibold text-white">F&B Service Board</h2>
                      <p className="mt-1 max-w-md text-sm text-white/70">Take and fulfill on-course member orders. Member orders land here in real time — prep them and deliver to their hole.</p>
                      {activeOrders > 0 && (
                        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-300">
                          <Clock className="h-4 w-4" />{activeOrders} order{activeOrders > 1 ? "s" : ""} in progress
                        </p>
                      )}
                    </div>
                  </div>
                  <Button className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => go("service")} data-testid="button-open-service">
                    Open Board
                  </Button>
                </div>
              </Glass>

              {/* Today's Schedule + My Tasks */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Glass className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">Upcoming Shifts</h2>
                    <button onClick={() => go("schedule")} className="text-sm font-medium text-accent hover:underline" data-testid="link-full-schedule">View Full Schedule</button>
                  </div>
                  <div className="relative space-y-4 pl-5">
                    <span aria-hidden className="absolute left-[5px] top-1 h-[calc(100%-0.5rem)] w-px bg-white/10" />
                    {shifts.length === 0 && <p className="text-sm text-white/55">No shifts scheduled.</p>}
                    {shifts.slice(0, 4).map((s) => (
                      <div key={s.id} className="relative" data-testid={`today-${s.id}`}>
                        <span className={cn("absolute -left-5 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-[#04130c]", s.status === "Today" ? "bg-emerald-400" : "bg-white/30")} />
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-white">{s.day} <span className="text-xs font-normal text-white/45">{s.date}</span></div>
                          {s.status === "Today" && <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Today</span>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50"><Clock className="h-3.5 w-3.5" />{s.time}<span className="text-white/30">·</span><MapPin className="h-3.5 w-3.5" />{s.role}</div>
                      </div>
                    ))}
                  </div>
                </Glass>
                <Glass className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">My Tasks</h2>
                    <button onClick={() => go("tasks")} className="text-sm font-medium text-accent hover:underline" data-testid="link-see-tasks">View All ({openTasks})</button>
                  </div>
                  <div className="space-y-1">
                    {tasks.filter((t) => !t.done).slice(0, 5).map((t) => (
                      <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/5" data-testid={`hometask-${t.id}`}>
                        <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id, t.done)} className="border-white/30 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
                        <span className={cn("flex-1 text-sm", t.done ? "text-white/40 line-through" : "text-white")}>{t.label}</span>
                        {t.priority && <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", priorityDark[t.priority])}>{t.priority}</span>}
                        <span className="hidden text-xs text-white/45 sm:inline">{t.due}</span>
                      </label>
                    ))}
                  </div>
                </Glass>
              </div>

              {/* Announcements + Time Off */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Glass className="p-5">
                  <div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-accent" /><h2 className="font-display text-lg font-semibold text-white">Announcements</h2></div>
                  <div className="space-y-3">
                    {announcements.length === 0 && <p className="text-sm text-white/55">No announcements right now.</p>}
                    {announcements.slice(0, 5).map((a) => (
                      <div key={a.id} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                        <div className="mb-1 flex items-center gap-2">
                          {a.tag && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">{a.tag}</span>}
                          <span className="text-xs text-white/40">{a.date}</span>
                        </div>
                        <div className="text-sm text-white/85">{a.title}</div>
                      </div>
                    ))}
                  </div>
                </Glass>
                <Glass className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">Time Off Requests</h2>
                    <button onClick={() => go("timeoff")} className="text-sm font-medium text-accent hover:underline" data-testid="link-see-timeoff">View All</button>
                  </div>
                  <div className="space-y-2">
                    {timeOff.slice(0, 4).map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`hometimeoff-${r.id}`}>
                        <div>
                          <div className="text-sm font-medium text-white">{r.dates}</div>
                          <div className="text-xs text-white/50">{r.reason} · submitted {r.submitted}</div>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", timeOffDark[r.status])}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </Glass>
              </div>

              {/* Upcoming Events */}
              <Glass className="p-5">
                <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-accent" /><h2 className="font-display text-lg font-semibold text-white">Upcoming Events</h2></div>
                {events.length === 0 && <p className="text-sm text-white/55">No upcoming events.</p>}
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {events.slice(0, 6).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`homeevent-${e.id}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><CalendarDays className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{e.title}</div>
                        <div className="text-xs text-white/50">{e.date} · {e.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Glass>

              {/* Quick Links */}
              <Glass className="p-5">
                <h2 className="mb-4 font-display text-lg font-semibold text-white">Quick Links</h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {QUICK_LINKS.map((q) => (
                    <button key={q.label} onClick={q.action} data-testid={`quicklink-${q.label.toLowerCase().replace(/\s+/g, "-")}`} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/10">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent"><q.icon className="h-4 w-4" /></div>
                      <span className="flex-1 text-sm font-medium text-white">{q.label}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-accent" />
                    </button>
                  ))}
                </div>
              </Glass>
            </div>
          )}

          {section === "service" && (
            <div className="space-y-4">
              <Glass className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Coffee className="h-5 w-5" /></div>
                <p className="text-sm text-white/65">Take new orders, prep in the kitchen, and deliver to the member's hole. Switch your role with the tabs below.</p>
              </Glass>
              <ServiceBoard members={courseMembers} />
            </div>
          )}

          {section === "channels" && <ChannelChat />}

          {section === "tasks" && (
            <Glass className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">My Tasks</h2>
              <div className="space-y-1">
                {tasks.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5" data-testid={`task-${t.id}`}>
                    <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id, t.done)} className="border-white/30 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
                    <span className={cn("flex-1 text-sm", t.done ? "text-white/40 line-through" : "text-white")}>{t.label}</span>
                    <span className="text-xs text-white/45">{t.due}</span>
                  </label>
                ))}
              </div>
            </Glass>
          )}

          {section === "schedule" && (
            <Glass className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">My Schedule</h2>
              <div className="space-y-2">
                {shifts.map((s, i) => (
                  <Glass key={s.id} i={i} className="flex items-center justify-between gap-3 p-4" data-testid={`shift-${s.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-center", s.status === "Today" ? "bg-accent/20 text-accent" : "bg-white/5 text-white/70")}>
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{s.day}</span>
                          <span className="text-xs text-white/45">{s.date}</span>
                          {s.status === "Today" && <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Today</span>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55"><MapPin className="h-3.5 w-3.5" />{s.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-white/80"><Clock className="h-4 w-4 text-white/40" />{s.time}</div>
                  </Glass>
                ))}
              </div>
            </Glass>
          )}

          {section === "timeoff" && (
            <div className="space-y-4">
              <Glass className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">Time Off</h2>
                  <p className="mt-1 text-sm text-white/60">Request days off and track approvals from your supervisor.</p>
                </div>
                <Button className="shrink-0 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setTimeOffOpen(true)} data-testid="button-request-timeoff">
                  <CalendarX className="mr-2 h-4 w-4" />Request Time Off
                </Button>
              </Glass>
              <Glass className="p-5">
                <h3 className="mb-3 font-display text-base font-semibold text-white">My Requests</h3>
                <div className="space-y-2">
                  {timeOff.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`timeoff-${r.id}`}>
                      <div>
                        <div className="font-medium text-white">{r.dates}</div>
                        <div className="text-xs text-white/50">{r.reason} · submitted {r.submitted}</div>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", timeOffDark[r.status])}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </Glass>
            </div>
          )}

          {section === "team" && (
            <Glass className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Who's On Today</h2>
                <span className="text-sm text-white/45">{onShiftCount} on shift</span>
              </div>
              <div className="space-y-2">
                {team.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`teammate-${t.id}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{t.initials}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{t.name}</div>
                        <div className="text-xs text-white/50">{t.role}{t.area && t.area !== "—" ? ` · ${t.area}` : ""}</div>
                      </div>
                    </div>
                    <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", shiftDark[t.status])}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", shiftDot[t.status])} />{t.status}
                    </span>
                  </div>
                ))}
              </div>
            </Glass>
          )}
        </motion.div>

      <Dialog open={timeOffOpen} onOpenChange={setTimeOffOpen}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Time Off</DialogTitle>
            <DialogDescription className="text-white/55">
              Pick your dates and a reason. Your supervisor will review it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-white/60">Start date</span>
                <Input type="date" value={toStart} onChange={(e) => setToStart(e.target.value)} className="border-white/15 bg-white/5 text-white [color-scheme:dark]" data-testid="input-timeoff-start" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-white/60">End date</span>
                <Input type="date" value={toEnd} onChange={(e) => setToEnd(e.target.value)} className="border-white/15 bg-white/5 text-white [color-scheme:dark]" data-testid="input-timeoff-end" />
              </label>
            </div>
            <label className="space-y-1.5 block">
              <span className="text-xs font-medium text-white/60">Reason</span>
              <Input value={toReason} onChange={(e) => setToReason(e.target.value)} placeholder="e.g. Personal day, family event…" className="border-white/15 bg-white/5 text-white placeholder:text-white/35" data-testid="input-timeoff-reason" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setTimeOffOpen(false)}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submitTimeOff} disabled={!toStart || !toEnd || !toReason.trim() || requestTimeOff.isPending} data-testid="button-submit-timeoff">
              {requestTimeOff.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
