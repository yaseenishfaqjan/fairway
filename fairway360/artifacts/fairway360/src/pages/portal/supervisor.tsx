import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Map as MapIcon, UserPlus, CalendarCheck, ListChecks,
  Navigation, Phone, Check, MapPin, AlertTriangle, Coffee, Users,
  ChevronRight, BellRing, MessageSquare, UserCheck, Mail, Plus, Sparkles,
} from "lucide-react";
import { PortalShell, type PortalNavItem, type PortalNotification } from "@/components/portal/portal-shell";
import { CourseMap } from "@/components/portal/course-map";
import { ServiceBoard } from "@/components/portal/service-board";
import { ChannelChat } from "@/components/portal/channel-chat";
import { HandoffPanel } from "@/components/portal/handoff-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useOrders } from "@/lib/orders-store";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetOverview, useGetCourseRounds, useListRequests, useListLeads,
  useListBookings, useListStaff, useListTasks, useUpdateTask, useResolveRequest,
  useMessageStaff, useUpdateLead, useUpdateBooking, useCreateTask,
  useListEscalations, useResolveEscalation,
  useGetDelegation, useStartDelegation, useEndDelegation, useGetMessagingAnalytics,
  getListRequestsQueryKey, getListTasksQueryKey, getListLeadsQueryKey,
  getGetOverviewQueryKey, getListBookingsQueryKey, getListEscalationsQueryKey,
  getGetDelegationQueryKey,
} from "@workspace/api-client-react";
import {
  supervisorAccount,
  type MemberOnCourse, type CourseStatus,
} from "@/lib/portal-data";

type SectionKey = "overview" | "team" | "map" | "service" | "channels" | "escalations" | "leads" | "bookings" | "tasks";

const NAV: PortalNavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "team", label: "Team", icon: Users },
  { key: "map", label: "Course Map", icon: MapIcon },
  { key: "service", label: "F&B Oversight", icon: Coffee },
  { key: "channels", label: "Channels", icon: MessageSquare },
  { key: "escalations", label: "Escalations", icon: AlertTriangle },
  { key: "leads", label: "Leads", icon: UserPlus },
  { key: "bookings", label: "Tee Sheet", icon: CalendarCheck },
  { key: "tasks", label: "Tasks", icon: ListChecks },
];

const statusDark: Record<string, string> = {
  "Playing": "border-emerald-400/20 bg-emerald-500/15 text-emerald-300",
  "Needs Assistance": "border-red-400/25 bg-red-500/15 text-red-300",
  "Cart Request": "border-accent/30 bg-accent/15 text-accent",
  "Food Order": "border-blue-400/25 bg-blue-500/15 text-blue-300",
};

const statusDot: Record<string, string> = {
  "Playing": "bg-emerald-400",
  "Needs Assistance": "bg-red-500",
  "Cart Request": "bg-accent",
  "Food Order": "bg-blue-400",
};

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

const leadStatusDark: Record<string, string> = {
  New: "border-accent/40 bg-accent/10 text-accent",
  Contacted: "border-blue-400/30 bg-blue-500/15 text-blue-300",
  "Tour Booked": "border-violet-400/30 bg-violet-500/15 text-violet-300",
  Won: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  Lost: "border-white/15 bg-white/5 text-white/50",
};

const LEAD_STATUSES = ["New", "Contacted", "Tour Booked", "Won", "Lost"] as const;

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

export function SupervisorPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { orders } = useOrders();
  const [section, setSection] = useState<SectionKey>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const overviewQ = useGetOverview();
  const roundsQ = useGetCourseRounds();
  const requestsQ = useListRequests();
  const leadsQ = useListLeads();
  const bookingsQ = useListBookings();
  const staffQ = useListStaff();
  const tasksQ = useListTasks();
  const updateTask = useUpdateTask();
  const updateBooking = useUpdateBooking();
  const createTask = useCreateTask();
  const escalationsQ = useListEscalations();
  const resolveEscalationM = useResolveEscalation();
  const escalations = escalationsQ.data ?? [];
  const delegationQ = useGetDelegation();
  const startDeleg = useStartDelegation();
  const endDeleg = useEndDelegation();
  const delegation = delegationQ.data;
  const messagingAnalytics = useGetMessagingAnalytics().data;
  const resolveRequestM = useResolveRequest();
  const messageStaff = useMessageStaff();
  const updateLead = useUpdateLead();

  const [msgTarget, setMsgTarget] = useState<{ id: string; name: string } | null>(null);
  const [msgText, setMsgText] = useState("");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [taskLabel, setTaskLabel] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [delegOpen, setDelegOpen] = useState(false);
  const [delegAutonomy, setDelegAutonomy] = useState<"low" | "medium" | "high" | "full">("medium");
  const [delegDuration, setDelegDuration] = useState("120");

  const overview = overviewQ.data;
  const rounds = roundsQ.data ?? [];
  const openRequests = requestsQ.data ?? [];
  const leads = leadsQ.data ?? [];
  const bookings = bookingsQ.data ?? [];
  const team = staffQ.data ?? [];
  const tasks = tasksQ.data ?? [];

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

  const selected = courseMembers.find((m) => m.id === selectedId) ?? null;
  const attention = courseMembers.filter((m) => m.status !== "Playing");
  const newLeadsCount = overview?.newLeads ?? leads.filter((l) => l.status === "New").length;
  const fbActive = overview?.activeOrders ?? orders.filter((o) => o.status !== "Delivered").length;
  const onShift = overview?.staffOnShift ?? team.filter((t) => t.status === "On Shift" || t.status === "On Break").length;
  const groupsOut = overview?.membersOnCourse ?? courseMembers.length;
  const bookingsCount = overview?.bookingsToday ?? bookings.length;

  const fullName = user?.name ?? "Supervisor";
  const firstName = fullName.split(" ")[0];
  const initials =
    user?.initials ?? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const clubName = user?.clubName ?? "Augusta Pines";

  function go(s: SectionKey) {
    setSection(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleTask(id: string, done: boolean) {
    try {
      await updateTask.mutateAsync({ id, data: { done: !done } });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch {
      toast({ title: "Could not update task", description: "Please try again.", variant: "destructive" });
    }
  }

  async function updateBookingStatus(id: string, status: "checked_in" | "cancelled", member: string) {
    try {
      await updateBooking.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
      toast({
        title: status === "checked_in" ? "Checked in" : "Booking cancelled",
        description: `${member}'s tee time ${status === "checked_in" ? "is checked in" : "was cancelled"}.`,
      });
    } catch {
      toast({ title: "Could not update booking", description: "Please try again.", variant: "destructive" });
    }
  }

  async function submitNewTask() {
    if (!taskLabel.trim()) return;
    try {
      await createTask.mutateAsync({
        data: {
          label: taskLabel.trim(),
          priority: taskPriority,
          ...(taskAssignee ? { assignedTo: taskAssignee } : {}),
        },
      });
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
      setNewTaskOpen(false);
      setTaskLabel("");
      setTaskAssignee("");
      setTaskPriority("Medium");
      toast({ title: "Task created", description: "Added to the team task list." });
    } catch {
      toast({ title: "Could not create task", description: "Please try again.", variant: "destructive" });
    }
  }

  async function sendStaffMessage() {
    if (!msgTarget || !msgText.trim()) return;
    try {
      await messageStaff.mutateAsync({
        id: msgTarget.id,
        data: { message: msgText.trim() },
      });
      toast({
        title: "Message sent",
        description: `${msgTarget.name} will see it in their portal.`,
      });
      setMsgTarget(null);
      setMsgText("");
    } catch {
      toast({ title: "Could not send message", description: "Please try again.", variant: "destructive" });
    }
  }

  // Dispatch help to an on-course golfer: notify the best-fit on-duty staffer
  // (by role priority) with a real in-app message they see in their portal.
  async function dispatchTo(member: MemberOnCourse) {
    const onDuty = team.filter((t) => t.status === "On Shift" || t.status === "On Break");
    const priority = ["Marshal", "Cart Attendant", "F&B Server", "Grounds", "Pro Shop"];
    const target =
      priority.map((role) => onDuty.find((t) => t.role === role)).find(Boolean) ??
      onDuty[0];
    if (!target) {
      toast({ title: "No staff on duty", description: "Nobody is on shift to dispatch right now.", variant: "destructive" });
      return;
    }
    try {
      await messageStaff.mutateAsync({
        id: target.id,
        data: { message: `Dispatch: head to ${member.name}, Hole ${member.hole} — ${member.status}.` },
      });
      toast({ title: "Dispatched", description: `${target.name} notified to assist ${member.name} on Hole ${member.hole}.` });
    } catch {
      toast({ title: "Could not dispatch", description: "Please try again.", variant: "destructive" });
    }
  }

  async function beginDelegation() {
    try {
      await startDeleg.mutateAsync({ data: { autonomy: delegAutonomy, durationMinutes: Number(delegDuration) || 120 } });
      queryClient.invalidateQueries({ queryKey: getGetDelegationQueryKey() });
      setDelegOpen(false);
      toast({ title: "Shift delegated", description: `Supervisor AI is covering at ${delegAutonomy.toUpperCase()} autonomy.` });
    } catch {
      toast({ title: "Could not delegate", description: "Please try again.", variant: "destructive" });
    }
  }

  async function stopDelegation() {
    try {
      await endDeleg.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getGetDelegationQueryKey() });
      toast({ title: "Delegation ended", description: "You're back in control of the shift." });
    } catch {
      toast({ title: "Could not end delegation", description: "Please try again.", variant: "destructive" });
    }
  }

  async function resolveEscalation(id: string, member: string) {
    try {
      await resolveEscalationM.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListEscalationsQueryKey() });
      toast({ title: "Escalation resolved", description: `${member}'s issue marked handled.` });
    } catch {
      toast({ title: "Could not resolve", description: "Please try again.", variant: "destructive" });
    }
  }

  async function changeLeadStatus(id: string, status: (typeof LEAD_STATUSES)[number]) {
    try {
      await updateLead.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetOverviewQueryKey() });
      toast({ title: "Lead updated", description: `Moved to "${status}".` });
    } catch {
      toast({ title: "Could not update lead", description: "Please try again.", variant: "destructive" });
    }
  }

  async function resolveRequest(member: string, id: string) {
    try {
      await resolveRequestM.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListRequestsQueryKey() });
      toast({ title: "Request resolved", description: `${member} — request handled.` });
    } catch {
      toast({ title: "Could not resolve request", description: "Please try again.", variant: "destructive" });
    }
  }

  const notifications: PortalNotification[] = [
    ...escalations.map((e) => ({
      id: `esc-${e.id}`,
      title: `Level ${e.level} escalation · ${e.memberName}`,
      detail: e.contextSummary ?? e.triggerType ?? "Needs attention",
      tone: "red" as const,
      onClick: () => go("escalations"),
    })),
    ...openRequests
      .filter((r) => r.priority === "High")
      .map((r) => {
        const onCourse = courseMembers.find((cm) => cm.name === r.member);
        return {
          id: `req-${r.id}`,
          title: `${r.member} needs attention`,
          detail: `Hole ${r.hole} · ${r.request}`,
          tone: "red" as const,
          onClick: () => {
            // On-course golfer → map (to dispatch); otherwise the requests list
            // on Overview (to resolve), since not every request-member is out on
            // the course right now.
            if (onCourse) {
              setSelectedId(onCourse.id);
              go("map");
            } else {
              go("overview");
            }
          },
        };
      }),
    ...(newLeadsCount > 0
      ? [{
          id: "leads",
          title: `${newLeadsCount} new lead${newLeadsCount > 1 ? "s" : ""} today`,
          detail: "Review and follow up",
          tone: "gold" as const,
          onClick: () => go("leads"),
        }]
      : []),
    ...(fbActive > 0
      ? [{
          id: "fb",
          title: `${fbActive} F&B order${fbActive > 1 ? "s" : ""} in progress`,
          detail: "On-course service active",
          tone: "default" as const,
          onClick: () => go("service"),
        }]
      : []),
  ];

  return (
    <PortalShell
      consoleLabel="Supervisor Console"
      nav={NAV}
      active={section}
      onSelect={(k) => go(k as SectionKey)}
      user={{ name: fullName, role: supervisorAccount.role, initials }}
      notifications={notifications}
      showPresence
    >
        {/* Greeting */}
        <motion.div {...fade(0)} className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2 text-accent">Operations · {clubName}</p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">Today on the Course</h1>
            <p className="mt-1 text-base text-white/60">Welcome back, {firstName}. Here's the live picture.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />{onShift} staff on shift
          </span>
        </motion.div>

        {/* Status badges */}
        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { icon: Users, label: "Groups Out", value: `${groupsOut}`, tone: "green" as const },
            { icon: UserCheck, label: "Staff On Shift", value: `${onShift}`, tone: "green" as const },
            { icon: BellRing, label: "Open Requests", value: `${openRequests.length}`, tone: "gold" as const },
            { icon: Coffee, label: "F&B Active", value: `${fbActive}`, tone: "gold" as const },
          ].map((b, i) => (
            <Glass key={b.label} i={i} className="flex items-center gap-2.5 p-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", b.tone === "gold" ? "bg-accent/15 text-accent" : "bg-emerald-400/15 text-emerald-300")}>
                <b.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-white/45">{b.label}</div>
                <div className="truncate text-sm font-semibold text-white">{b.value}</div>
              </div>
            </Glass>
          ))}
        </div>

        {/* Section content */}
        <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
          {section === "overview" && (
            <div className="space-y-6">
              <HandoffPanel />

              <Glass className={cn("p-5", delegation?.active && "border-accent/40 bg-accent/[0.06]")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/20 text-accent">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-white">Supervisor AI Delegation</h2>
                      <p className="text-sm text-white/60">
                        {delegation?.active
                          ? `Active · ${delegation.autonomy?.toUpperCase()} autonomy · until ${delegation.until ? new Date(delegation.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}`
                          : "Hand your shift to the Supervisor AI to cover the Management channel."}
                      </p>
                    </div>
                  </div>
                  {delegation?.active ? (
                    <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={stopDelegation} disabled={endDeleg.isPending} data-testid="button-end-delegation">
                      End Delegation
                    </Button>
                  ) : (
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setDelegOpen(true)} data-testid="button-delegate">
                      <Sparkles className="mr-1.5 h-4 w-4" />Delegate Shift
                    </Button>
                  )}
                </div>
              </Glass>

              {messagingAnalytics && (
                <Glass className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <h2 className="font-display text-lg font-semibold text-white">Messaging &amp; AI · last 7 days</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Messages", value: messagingAnalytics.messages7d },
                      { label: "AI replies", value: messagingAnalytics.aiReplies7d },
                      { label: "AI share", value: `${messagingAnalytics.aiSharePct}%` },
                      { label: "Open escalations", value: messagingAnalytics.escalationsOpen },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="font-display text-2xl font-semibold text-white">{s.value}</div>
                        <div className="text-xs text-white/55">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-white/65">L1: {messagingAnalytics.l1}</span>
                    <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-1 text-accent">L2: {messagingAnalytics.l2}</span>
                    <span className="rounded-full border border-red-400/25 bg-red-500/15 px-2.5 py-1 text-red-300">L3: {messagingAnalytics.l3}</span>
                  </div>
                  {(messagingAnalytics.channels ?? []).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {(messagingAnalytics.channels ?? []).slice(0, 4).map((c, i) => {
                        const max = (messagingAnalytics.channels ?? [])[0]?.messages || 1;
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-32 shrink-0 truncate text-xs text-white/60">{c.name}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                              <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.round((c.messages / max) * 100)}%` }} />
                            </div>
                            <span className="w-8 shrink-0 text-right text-xs text-white/45">{c.messages}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Glass>
              )}

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "New Leads", sub: "today", value: newLeadsCount, icon: UserPlus },
                  { label: "Tee Times", sub: "booked", value: bookingsCount, icon: CalendarCheck },
                  { label: "Open Requests", sub: "on course", value: openRequests.length, icon: BellRing },
                  { label: "Tasks Due", sub: "remaining", value: tasks.filter((t) => !t.done).length, icon: ListChecks },
                ].map((s, i) => (
                  <Glass key={s.label} i={i} className="p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent"><s.icon className="h-5 w-5" /></div>
                    <div className="font-display text-2xl font-semibold text-white">{s.value}</div>
                    <div className="text-xs text-white/55">{s.label} · {s.sub}</div>
                  </Glass>
                ))}
              </div>

              {/* Team on shift */}
              <Glass className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold text-white">Team On Shift</h2>
                  <button onClick={() => go("team")} className="text-sm font-medium text-accent hover:underline" data-testid="link-open-team">Manage team</button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {team.filter((t) => t.status === "On Shift" || t.status === "On Break").map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{t.initials}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{t.name}</div>
                          <div className="text-xs text-white/50">{t.role} · {t.area}</div>
                        </div>
                      </div>
                      <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", shiftDark[t.status])}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", shiftDot[t.status])} />{t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </Glass>

              <div className="grid gap-6 lg:grid-cols-2">
                <Glass className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-white">Groups Needing Attention</h2>
                    <button onClick={() => go("map")} className="text-sm font-medium text-accent hover:underline" data-testid="link-open-map">Open map</button>
                  </div>
                  <div className="space-y-2">
                    {attention.length === 0 && <p className="text-sm text-white/55">All groups are playing smoothly.</p>}
                    {attention.map((m) => (
                      <button key={m.id} onClick={() => { setSelectedId(m.id); go("map"); }} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.06]" data-testid={`attention-${m.id}`}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{m.initials}</span>
                          <div>
                            <div className="font-medium text-white">{m.name}</div>
                            <div className="text-xs text-white/50">Hole {m.hole} · {m.cartNumber}</div>
                          </div>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statusDark[m.status])}>{m.status}</span>
                      </button>
                    ))}
                  </div>
                </Glass>

                <Glass className="p-5">
                  <h2 className="mb-4 font-display text-lg font-semibold text-white">Open Member Requests</h2>
                  <div className="space-y-2">
                    {openRequests.length === 0 && <p className="text-sm text-white/55">All requests handled. Nice work. 🏌️</p>}
                    {openRequests.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid={`request-${r.id}`}>
                        <div className="flex items-start gap-3">
                          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", r.priority === "High" ? "bg-red-500/15 text-red-300" : "bg-accent/15 text-accent")}>
                            {r.priority === "High" ? <AlertTriangle className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-white">{r.member}</span>
                              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">Hole {r.hole}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-white/60">{r.request}</p>
                          </div>
                        </div>
                        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => resolveRequest(r.member, r.id)} data-testid={`resolve-${r.id}`}>
                          <Check className="mr-1.5 h-4 w-4" />Resolve
                        </Button>
                      </div>
                    ))}
                  </div>
                </Glass>
              </div>
            </div>
          )}

          {section === "team" && (
            <Glass className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Team Roster</h2>
                <span className="text-sm text-white/45">{onShift} on shift · {team.length} total</span>
              </div>
              <div className="space-y-2">
                {team.map((t, i) => (
                  <Glass key={t.id} i={i} className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid={`team-${t.id}`}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">{t.initials}</span>
                      <div>
                        <div className="font-medium text-white">{t.name}</div>
                        <div className="text-xs text-white/50">{t.role}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">{t.area}</span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">{t.shift}</span>
                      {(t.tasksOpen ?? 0) > 0 && <span className="rounded-full border border-accent/30 bg-accent/15 px-2.5 py-1 text-accent">{t.tasksOpen} open task{(t.tasksOpen ?? 0) > 1 ? "s" : ""}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", shiftDark[t.status])}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", shiftDot[t.status])} />{t.status}
                      </span>
                      <Button size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => { setMsgTarget({ id: t.id, name: t.name }); setMsgText(""); }} data-testid={`message-${t.id}`}>
                        <MessageSquare className="mr-1.5 h-4 w-4" />Message
                      </Button>
                    </div>
                  </Glass>
                ))}
              </div>
            </Glass>
          )}

          {section === "map" && (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <Glass className="overflow-hidden p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white"><MapPin className="h-5 w-5 text-accent" />Live Course Map</h2>
                  <span className="text-xs text-white/45">Updated just now</span>
                </div>
                <CourseMap members={courseMembers} selectedId={selectedId} onSelect={setSelectedId} />
              </Glass>

              <div className="space-y-4">
                {selected && (
                  <Glass className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">{selected.initials}</span>
                      <div>
                        <div className="font-semibold text-white">{selected.name}</div>
                        <div className="text-xs text-white/50">{selected.cartNumber} · out {selected.since}</div>
                      </div>
                    </div>
                    <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                      <Stat label="Hole" value={`#${selected.hole}`} />
                      <Stat label="Pace" value={selected.pace} />
                      <div className="col-span-2">
                        <span className={cn("flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-sm font-medium", statusDark[selected.status])}>
                          {selected.status === "Needs Assistance" && <AlertTriangle className="h-3.5 w-3.5" />}{selected.status}
                        </span>
                      </div>
                    </div>
                    <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => dispatchTo(selected)} disabled={messageStaff.isPending} data-testid="button-dispatch">
                      <Navigation className="mr-2 h-4 w-4" />{messageStaff.isPending ? "Dispatching…" : "Dispatch Staff"}
                    </Button>
                  </Glass>
                )}

                <Glass className="p-5">
                  <h3 className="mb-3 font-display text-base font-semibold text-white">All Groups On Course</h3>
                  <div className="space-y-1">
                    {courseMembers.map((m) => (
                      <button key={m.id} onClick={() => setSelectedId(m.id)} aria-pressed={selectedId === m.id} className={cn("flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", selectedId === m.id ? "bg-accent/15" : "hover:bg-white/5")} data-testid={`group-${m.id}`}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">{m.initials}</span>
                          <div>
                            <div className="text-sm font-medium text-white">{m.name}</div>
                            <div className="text-xs text-white/50">Hole {m.hole}</div>
                          </div>
                        </div>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[m.status])} />
                          <ChevronRight className="h-4 w-4 text-white/30" />
                        </span>
                      </button>
                    ))}
                  </div>
                </Glass>
              </div>
            </div>
          )}

          {section === "service" && (
            <div className="space-y-4">
              <Glass className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Coffee className="h-5 w-5" /></div>
                <p className="text-sm text-white/65">Oversee every on-course order across the kitchen and cart service. Switch roles to see each team's live queue.</p>
              </Glass>
              <ServiceBoard members={courseMembers} />
            </div>
          )}

          {section === "channels" && <ChannelChat />}

          {section === "escalations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Escalations</h2>
                <span className="text-sm text-white/45">{escalations.length} open</span>
              </div>
              {escalations.length === 0 && (
                <Glass className="p-6 text-center text-sm text-white/55">
                  No open escalations. The AI agents are handling conversations smoothly. 🟢
                </Glass>
              )}
              <div className="space-y-3">
                {escalations.map((e, i) => (
                  <Glass key={e.id} i={i} className="hover-lift p-4" data-testid={`escalation-${e.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", e.level >= 3 ? "bg-red-500/15 text-red-300" : "bg-accent/15 text-accent")}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-white">{e.memberName}</span>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", e.level >= 3 ? "border-red-400/30 bg-red-500/15 text-red-300" : "border-accent/30 bg-accent/15 text-accent")}>
                              Level {e.level}
                            </span>
                            {e.triggerType && <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">{e.triggerType.replace(/_/g, " ")}</span>}
                          </div>
                          {e.contextSummary && <p className="mt-1 text-sm text-white/70">"{e.contextSummary}"</p>}
                          {e.agentLastMessage && <p className="mt-1 text-xs text-white/45">Agent said: {e.agentLastMessage}</p>}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-white/40">{e.time}</span>
                    </div>
                    <div className="mt-3 flex justify-end border-t border-white/10 pt-3">
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => resolveEscalation(e.id, e.memberName)} data-testid={`resolve-esc-${e.id}`}>
                        <Check className="mr-1.5 h-4 w-4" />Resolve
                      </Button>
                    </div>
                  </Glass>
                ))}
              </div>
            </div>
          )}

          {section === "leads" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-white">Sales Leads</h2>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {LEAD_STATUSES.map((s) => {
                    const n = leads.filter((l) => l.status === s).length;
                    return (
                      <span key={s} className={cn("rounded-full border px-2.5 py-1 font-medium", leadStatusDark[s])}>
                        {s} {n}
                      </span>
                    );
                  })}
                </div>
              </div>

              {leads.length === 0 && (
                <Glass className="p-6 text-center text-sm text-white/55">No leads yet. New demo requests land here.</Glass>
              )}

              <div className="grid gap-3 lg:grid-cols-2">
                {leads.map((l, i) => (
                  <Glass key={l.id} i={i} className="hover-lift p-4" data-testid={`lead-${l.id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display text-base font-semibold text-white">{l.name}</div>
                        {l.contactName && <div className="text-sm text-white/60">{l.contactName}</div>}
                      </div>
                      <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium", leadStatusDark[l.status] ?? "border-white/15 bg-white/5 text-white/70")}>{l.status}</span>
                    </div>

                    {(l.email || l.phone) && (
                      <div className="mt-3 space-y-1.5 text-sm">
                        {l.email && (
                          <a href={`mailto:${l.email}`} className="flex items-center gap-2 text-accent hover:underline" data-testid={`lead-email-${l.id}`}>
                            <Mail className="h-4 w-4 shrink-0" /><span className="truncate">{l.email}</span>
                          </a>
                        )}
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="flex items-center gap-2 text-accent hover:underline" data-testid={`lead-phone-${l.id}`}>
                            <Phone className="h-4 w-4 shrink-0" />{l.phone}
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {l.source && <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">{l.source}</span>}
                      {l.businessType && <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">{l.businessType}</span>}
                      {l.volume && <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">{l.volume} leads/mo</span>}
                    </div>

                    {l.problem && <p className="mt-2 text-xs text-white/55">Needs help with: <span className="text-white/75">{l.problem}</span></p>}

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <span className="text-xs text-white/40">{l.time}</span>
                      <Select value={l.status} onValueChange={(v) => changeLeadStatus(l.id, v as (typeof LEAD_STATUSES)[number])}>
                        <SelectTrigger className="h-8 w-36 border-white/15 bg-white/5 text-white" data-testid={`lead-status-${l.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Glass>
                ))}
              </div>
            </div>
          )}

          {section === "bookings" && (
            <Glass className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-white">Today's Tee Sheet</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-white/45">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Member</th>
                      <th className="py-2 pr-4 font-medium">Players</th>
                      <th className="py-2 pr-4 font-medium">Holes</th>
                      <th className="py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-white/5 last:border-0" data-testid={`booking-${b.id}`}>
                        <td className="py-3 pr-4 font-medium text-white">{b.time}</td>
                        <td className="py-3 pr-4 text-white/80">{b.member}</td>
                        <td className="py-3 pr-4 text-white/60">{b.players}</td>
                        <td className="py-3 pr-4 text-white/60">{b.holes}</td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn("rounded-full border px-2 py-0.5 text-xs", b.status === "Checked In" ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" : b.status === "Cancelled" ? "border-red-400/25 bg-red-500/15 text-red-300" : b.status === "Pending" ? "border-accent/40 bg-accent/10 text-accent" : "border-white/15 bg-white/5 text-white/70")}>{b.status}</span>
                            {b.status !== "Checked In" && b.status !== "Cancelled" && (
                              <Button size="sm" variant="outline" className="h-7 border-emerald-400/30 bg-emerald-500/10 px-2 text-xs text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200" onClick={() => updateBookingStatus(b.id, "checked_in", b.member)} data-testid={`checkin-${b.id}`}>Check In</Button>
                            )}
                            {b.status !== "Cancelled" && (
                              <Button size="sm" variant="outline" className="h-7 border-red-400/25 bg-red-500/10 px-2 text-xs text-red-300 hover:bg-red-500/20" onClick={() => updateBookingStatus(b.id, "cancelled", b.member)} data-testid={`cancel-${b.id}`}>Cancel</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Glass>
          )}

          {section === "tasks" && (
            <Glass className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">Team Tasks</h2>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setNewTaskOpen(true)} data-testid="button-new-task">
                  <Plus className="mr-1.5 h-4 w-4" />New Task
                </Button>
              </div>
              <div className="space-y-1">
                {tasks.length === 0 && <p className="text-sm text-white/55">No tasks yet. Create one to delegate to your team.</p>}
                {tasks.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/5" data-testid={`task-${t.id}`}>
                    <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t.id, t.done)} className="border-white/30 data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground" />
                    <span className={cn("flex-1 text-sm", t.done ? "text-white/40 line-through" : "text-white")}>{t.label}</span>
                    {t.assignee && <span className="hidden rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/60 sm:inline">{t.assignee}</span>}
                    {t.priority && <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">{t.priority}</span>}
                    {t.due && <span className="text-xs text-white/45">{t.due}</span>}
                  </label>
                ))}
              </div>
            </Glass>
          )}
        </motion.div>

      <Dialog open={!!msgTarget} onOpenChange={(o) => { if (!o) setMsgTarget(null); }}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {msgTarget?.name}</DialogTitle>
            <DialogDescription className="text-white/55">
              Sends a text to their phone. Delivers once Twilio is configured.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder={`Hi ${msgTarget?.name?.split(" ")[0] ?? ""}, can you head to…`}
            rows={4}
            className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
            data-testid="input-staff-message"
          />
          <DialogFooter>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setMsgTarget(null)}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={sendStaffMessage} disabled={!msgText.trim() || messageStaff.isPending} data-testid="button-send-message">
              {messageStaff.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription className="text-white/55">
              Create a task and optionally assign it to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              placeholder="e.g. Restock Beverage Cart 2 before the noon rush"
              rows={2}
              className="border-white/15 bg-white/5 text-white placeholder:text-white/35"
              data-testid="input-task-label"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={taskPriority} onValueChange={(v) => setTaskPriority(v as "High" | "Medium" | "Low")}>
                <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="select-task-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["High", "Medium", "Low"].map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={taskAssignee || "unassigned"} onValueChange={(v) => setTaskAssignee(v === "unassigned" ? "" : v)}>
                <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="select-task-assignee"><SelectValue placeholder="Assign to" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {team.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={submitNewTask} disabled={!taskLabel.trim() || createTask.isPending} data-testid="button-create-task">
              {createTask.isPending ? "Creating…" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={delegOpen} onOpenChange={setDelegOpen}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delegate your shift to the Supervisor AI</DialogTitle>
            <DialogDescription className="text-white/55">
              The AI covers the Management channel within the autonomy you set. Level 3 escalations always reach you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-xs font-medium text-white/70">Autonomy level</div>
              <Select value={delegAutonomy} onValueChange={(v) => setDelegAutonomy(v as "low" | "medium" | "high" | "full")}>
                <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="select-autonomy"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — answer questions only</SelectItem>
                  <SelectItem value="medium">Medium — orders, tasks, bookings</SelectItem>
                  <SelectItem value="high">High — + routine refunds</SelectItem>
                  <SelectItem value="full">Full — complete operational authority</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-white/70">Duration</div>
              <Select value={delegDuration} onValueChange={setDelegDuration}>
                <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="select-duration"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="480">Full shift (8 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white" onClick={() => setDelegOpen(false)}>Cancel</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={beginDelegation} disabled={startDeleg.isPending} data-testid="button-confirm-delegate">
              {startDeleg.isPending ? "Starting…" : "Start Delegation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
      <div className="text-xs text-white/50">{label}</div>
      <div className="font-semibold text-white">{value}</div>
    </div>
  );
}
