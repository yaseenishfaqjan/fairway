// Sales CRM — the from-scratch outbound calling system inside the super-admin
// panel. Left navigation rail + kanban pipeline board + rich prospect-intel
// panel (club facts, pain points, auto-derived Fairway360 opportunities),
// call logging with automatic stage advancement, the 12-signal qualification
// scorecard, follow-up / demo scheduling, the live daily KPI dashboard, CSV
// import/export, and the closer hand-off. No external CRM involved.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock, CalendarPlus, ClipboardCopy, Download, ExternalLink, Globe, KanbanSquare, LayoutDashboard,
  Loader2, Mail, Phone, PhoneCall, Plus, Search, Send, Target, Trash2, Upload, Users, X,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const api = {
  get: <T,>(url: string) => customFetch<T>(url, { credentials: "include" }),
  post: <T,>(url: string, body: unknown) => customFetch<T>(url, { method: "POST", credentials: "include", body: JSON.stringify(body) }),
  patch: <T,>(url: string, body: unknown) => customFetch<T>(url, { method: "PATCH", credentials: "include", body: JSON.stringify(body) }),
  del: <T,>(url: string) => customFetch<T>(url, { method: "DELETE", credentials: "include" }),
};

export const STAGES = [
  "New Lead", "Attempted", "Gatekeeper", "DM Identified", "Connected",
  "Qualified", "Demo Booked", "Follow-Up", "Demo Completed", "Proposal",
  "Closed Won", "Closed Lost", "Do Not Call",
] as const;
// Stage numbers shown on kanban column headers (like the reference board).
const STAGE_NO: Record<string, string> = Object.fromEntries(STAGES.map((s, i) => [s, String(i + 1).padStart(2, "0")]));

const OUTCOMES = [
  "No Answer", "Voicemail", "Gatekeeper", "DM Conversation", "Qualified",
  "Demo Booked", "Callback Scheduled", "Not Interested", "Do Not Call",
] as const;

const SIGNALS = [
  "Private club", "Large membership operation", "Restaurant / dining", "Weddings / events",
  "Significant tournament activity", "High inbound call volume", "Multiple departments",
  "Known missed-call problem", "Staffing problem", "Membership growth objective",
  "Decision-maker engaged", "Technology upgrade interest",
] as const;

// Brady's booking calendar — the caller books consultations/meetings here,
// prefilled with the prospect's details. Change this one line to swap calendars.
const CAL_BOOKING_URL = "https://cal.com/bradywalker9/15min";

const SEGMENTS: { key: string; label: string }[] = [
  { key: "A", label: "A · Private country clubs" },
  { key: "B", label: "B · Resort / destination" },
  { key: "C", label: "C · Multi-course operators" },
  { key: "D", label: "D · Premium public / semi-private" },
  { key: "E", label: "E · Municipal / small public" },
];

interface Call { id: string; calledAt: string; outcome: string; callerName: string | null; notes: string | null }
interface Prospect {
  id: string; clubName: string; website: string | null; mainPhone: string | null;
  city: string | null; state: string | null; timezone: string | null; clubType: string | null;
  coursesCount: number | null; membershipSize: string | null; segment: string;
  campaign: string | null;
  publicEmail: string | null;
  dmName: string | null; dmTitle: string | null; dmPhone: string | null; dmEmail: string | null;
  currentTeeSoftware: string | null; currentClubSoftware: string | null;
  hasDining: boolean; hasEvents: boolean; hasMembershipProgram: boolean; hasTournaments: boolean;
  phoneProcess: string | null; stage: string; painPrimary: string | null; painSecondary: string | null;
  objections: string | null; otherStakeholders: string | null; notes: string | null;
  scoreSignals: string[]; score: number; classification: string;
  lastContactAt: string | null; lastEmailAt: string | null; nextFollowupAt: string | null; demoAt: string | null;
  assignedCloser: string; calls?: Call[];
}
interface Summary {
  today: {
    callsAttempted: number; liveAnswers: number; gatekeepers: number; conversations: number;
    decisionMakers: number; qualified: number; demosBooked: number; callbacks: number;
    voicemails: number; notInterested: number; doNotCall: number;
  };
  funnel: { stage: string; count: number }[];
  totalProspects: number; followupsDueToday: number;
  campaigns: { name: string; count: number }[];
  upcomingDemos: { id: string; clubName: string; dmName: string | null; demoAt: string | null; assignedCloser: string; score: number }[];
  bestOpportunity: { id: string; clubName: string; score: number; stage: string; painPrimary: string | null } | null;
}

const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";
const classTone: Record<string, string> = {
  HOT: "border-red-400/40 bg-red-500/15 text-red-300",
  WARM: "border-accent/40 bg-accent/15 text-accent",
  DEVELOP: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  LOW: "border-white/15 bg-white/5 text-white/50",
};
const stageTone: Record<string, string> = {
  "New Lead": "border-white/15 text-white/60", "Attempted": "border-white/15 text-white/60",
  "Gatekeeper": "border-sky-400/30 text-sky-300", "DM Identified": "border-sky-400/30 text-sky-300",
  "Connected": "border-accent/40 text-accent", "Qualified": "border-accent/40 text-accent",
  "Demo Booked": "border-[#46c97e]/40 text-[#46c97e]", "Follow-Up": "border-violet-400/30 text-violet-300",
  "Demo Completed": "border-[#46c97e]/40 text-[#46c97e]", "Proposal": "border-[#46c97e]/40 text-[#46c97e]",
  "Closed Won": "border-[#46c97e]/60 text-[#46c97e]", "Closed Lost": "border-red-400/30 text-red-300",
  "Do Not Call": "border-red-400/40 text-red-400",
};

const fmtDT = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

/** Which Fairway360 capabilities are relevant to this club (mockup: "opportunities"). */
function opportunities(p: Prospect): { label: string; on: boolean }[] {
  return [
    { label: "AI phone concierge — never miss a call", on: true },
    { label: "Tee-time automation — 24/7 bookings", on: true },
    { label: "Membership lead capture & nurture", on: p.hasMembershipProgram },
    { label: "Dining orders — on & off course", on: p.hasDining },
    { label: "Event & wedding inquiry automation", on: p.hasEvents },
    { label: "Tournament registration automation", on: p.hasTournaments },
  ];
}

const EMPTY: Partial<Prospect> = {
  clubName: "", segment: "A", stage: "New Lead", assignedCloser: "Brady",
  hasDining: false, hasEvents: false, hasMembershipProgram: false, hasTournaments: false, scoreSignals: [],
};

type View = "dashboard" | "pipeline" | "contacts";

export function SalesCrm() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<View>("pipeline");
  const [segFilter, setSegFilter] = useState("all");
  const [campaign, setCampaign] = useState("all");
  const [q, setQ] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [openId, setOpenId] = useState<string | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");

  const listUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (segFilter !== "all") p.set("segment", segFilter);
    if (campaign !== "all") p.set("campaign", campaign);
    if (q.trim()) p.set("q", q.trim());
    if (dueOnly) p.set("due", "today");
    const s = p.toString();
    return `/api/admin/prospects${s ? `?${s}` : ""}`;
  }, [segFilter, campaign, q, dueOnly]);

  const summaryQ = useQuery({ queryKey: ["crm", "summary"], queryFn: () => api.get<Summary>("/api/admin/outreach/summary"), refetchInterval: 60_000 });
  const settingsQ = useQuery({ queryKey: ["crm", "settings"], queryFn: () => api.get<{ bookingUrl: string; demoUrl: string }>("/api/admin/settings") });
  const bookingUrl = settingsQ.data?.bookingUrl || CAL_BOOKING_URL;
  const demoUrl = settingsQ.data?.demoUrl || "https://fairway360.io/demo";
  const listQ = useQuery({ queryKey: ["crm", "list", listUrl], queryFn: () => api.get<Prospect[]>(listUrl) });
  const detailQ = useQuery({
    queryKey: ["crm", "detail", openId],
    queryFn: () => api.get<Prospect>(`/api/admin/prospects/${openId}`),
    enabled: !!openId && openId !== "new",
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["crm"] });
  const importM = useMutation({
    mutationFn: () => api.post<{ imported: number; skipped: { line: string; reason: string }[] }>("/api/admin/prospects/bulk-import", { csv: importCsv }),
    onSuccess: (r) => {
      refresh(); setImportOpen(false); setImportCsv("");
      toast({ title: `${r.imported} prospects imported`, description: r.skipped.length ? `${r.skipped.length} skipped (duplicates/invalid)` : undefined });
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const s = summaryQ.data;
  const prospects = listQ.data ?? [];
  const funnelCount = (stage: string) => s?.funnel.find((f) => f.stage === stage)?.count ?? 0;

  const NAV: { key: View; label: string; icon: typeof KanbanSquare; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "pipeline", label: "Pipeline", icon: KanbanSquare },
    { key: "contacts", label: "Contacts", icon: Users, badge: s?.totalProspects },
  ];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* ── Left navigation rail ──────────────────────────────────────────── */}
      <aside className="shrink-0 lg:w-52">
        {/* Campaign selector — each lead list (e.g. "Georgia Golf Clubs") is its own section */}
        {(s?.campaigns?.length ?? 0) > 0 && (
          <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Campaign</div>
            <button
              onClick={() => setCampaign("all")}
              className={cn("mb-0.5 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition",
                campaign === "all" ? "bg-accent/20 text-accent" : "text-white/60 hover:bg-white/[0.06] hover:text-white")}
              data-testid="campaign-all"
            >
              <span>All leads</span><span className="text-[11px] text-white/40">{s?.totalProspects ?? 0}</span>
            </button>
            {s!.campaigns.map((c) => (
              <button
                key={c.name}
                onClick={() => setCampaign(c.name)}
                className={cn("mb-0.5 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm transition",
                  campaign === c.name ? "bg-accent/20 text-accent" : "text-white/60 hover:bg-white/[0.06] hover:text-white")}
                data-testid={`campaign-${c.name}`}
              >
                <span className="truncate text-left">{c.name}</span><span className="shrink-0 text-[11px] text-white/40">{c.count}</span>
              </button>
            ))}
          </div>
        )}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Outbound sales</div>
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => { setView(n.key); if (n.key !== "contacts") setDueOnly(false); }}
              className={cn(
                "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                view === n.key ? "bg-accent/20 text-accent" : "text-white/60 hover:bg-white/[0.06] hover:text-white",
              )}
              data-testid={`crm-nav-${n.key}`}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge != null && <span className="text-[11px] text-white/40">{n.badge}</span>}
            </button>
          ))}
          <button
            onClick={() => { setView("contacts"); setDueOnly(true); }}
            className={cn(
              "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              dueOnly ? "bg-red-500/15 text-red-300" : "text-white/60 hover:bg-white/[0.06] hover:text-white",
            )}
            data-testid="crm-nav-followups"
          >
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Follow-ups due</span>
            {(s?.followupsDueToday ?? 0) > 0 && <span className="rounded-full bg-red-500/25 px-1.5 text-[11px] text-red-200">{s!.followupsDueToday}</span>}
          </button>

          <div className="my-2 h-px bg-white/10" />
          <Button size="sm" className="mb-1 w-full justify-start" onClick={() => setOpenId("new")} data-testid="button-crm-add">
            <Plus className="mr-2 h-4 w-4" /> Add prospect
          </Button>
          <Button size="sm" variant="outline" className="mb-1 w-full justify-start border-white/15" onClick={() => setImportOpen(true)} data-testid="button-crm-import">
            <Upload className="mr-2 h-4 w-4" /> Import leads
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start border-white/15" asChild>
            <a href="/api/admin/prospects-export"><Download className="mr-2 h-4 w-4" /> Export CSV</a>
          </Button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Toolbar (search + segment) — shown on pipeline & contacts */}
        {view !== "dashboard" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search club, contact, city, state…" className={cn(inputCls, "pl-8")} data-testid="input-crm-search" />
            </div>
            <Select value={segFilter} onValueChange={setSegFilter}>
              <SelectTrigger className="h-9 w-44 border-white/15 bg-white/5 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All segments</SelectItem>
                {SEGMENTS.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {dueOnly && (
              <Badge variant="outline" className="border-red-400/40 bg-red-500/10 text-red-300">
                Follow-ups due <button onClick={() => setDueOnly(false)} className="ml-1"><X className="inline h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}

        {view === "dashboard" && <Dashboard s={s} bookingUrl={bookingUrl} demoUrl={demoUrl} onOpen={setOpenId} onStage={() => setView("pipeline")} onSaved={() => void qc.invalidateQueries({ queryKey: ["crm", "settings"] })} />}
        {view === "pipeline" && (
          <PipelineBoard prospects={prospects} loading={listQ.isLoading} funnelCount={funnelCount}
            filtered={campaign !== "all" || segFilter !== "all" || !!q.trim()} today={s?.today} onOpen={setOpenId} />
        )}
        {view === "contacts" && (
          <ContactsList prospects={prospects} loading={listQ.isLoading} onOpen={setOpenId} />
        )}
      </div>

      {openId && (
        <ProspectDialog
          key={openId}
          id={openId === "new" ? null : openId}
          initial={openId === "new" ? (EMPTY as Prospect) : detailQ.data ?? null}
          loading={openId !== "new" && detailQ.isLoading}
          bookingBase={bookingUrl}
          onClose={(changed) => { setOpenId(null); if (changed) refresh(); }}
        />
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="border-white/10 bg-[#07190f] text-white sm:max-w-xl">
          <DialogHeader><DialogTitle>Import lead list (CSV)</DialogTitle></DialogHeader>
          <p className="text-xs text-white/55">
            One club per line: <span className="text-accent">clubName, city, state, timezone(ET/CT/MT/PT), clubType, segment(A–E), website, mainPhone, dmName, dmTitle, dmPhone, dmEmail</span>.
            Only clubName is required; duplicates (same name + state) are skipped.
          </p>
          <Textarea value={importCsv} onChange={(e) => setImportCsv(e.target.value)} rows={8} className={inputCls}
            placeholder={"Pine Valley Country Club,Clementon,NJ,ET,private,A,pinevalley.example.com,(856) 555-0100,John Smith,General Manager,,"} />
          <Button disabled={!importCsv.trim() || importM.isPending} onClick={() => importM.mutate()}>
            {importM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Dashboard view ───────────────────────────────────────────────────────────

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: "gold" | "green" | "red" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className={cn("text-xl font-semibold tabular-nums",
        tone === "gold" ? "text-accent" : tone === "green" ? "text-[#46c97e]" : tone === "red" ? "text-red-300" : "text-white")}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}

function LinkSetting({ label, help, field, current, testId, onSaved }: {
  label: string; help: string; field: "bookingUrl" | "demoUrl"; current: string; testId: string; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [url, setUrl] = useState(current);
  const save = useMutation({
    mutationFn: () => api.patch<Record<string, string>>("/api/admin/settings", { [field]: url.trim() }),
    onSuccess: () => { onSaved(); toast({ title: `${label} saved` }); },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });
  const dirty = url.trim() !== current;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-white/80">{label}</div>
      <p className="mb-1.5 text-[11px] text-white/45">{help}</p>
      <div className="flex flex-wrap gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={cn(inputCls, "min-w-[240px] flex-1")} data-testid={testId} />
        <Button size="sm" variant="outline" className="border-white/15" asChild>
          <a href={url} target="_blank" rel="noreferrer">Test</a>
        </Button>
        <Button size="sm" disabled={!dirty || save.isPending || !/^https?:\/\//.test(url.trim())} onClick={() => save.mutate()} data-testid={`${testId}-save`}>
          {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
        </Button>
      </div>
    </div>
  );
}

function SettingsCard({ bookingUrl, demoUrl, onSaved }: { bookingUrl: string; demoUrl: string; onSaved: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
        <CalendarPlus className="h-3.5 w-3.5" /> Outreach links
      </div>
      <LinkSetting label="Booking link (Brady's calendar)" field="bookingUrl" current={bookingUrl} testId="input-booking-url" onSaved={onSaved}
        help="The 'Book meeting' button opens this, prefilled. Paste the exact public link from Brady's Cal.com event." />
      <LinkSetting label="Demo link (sent in the info email)" field="demoUrl" current={demoUrl} testId="input-demo-url" onSaved={onSaved}
        help="The 'Watch the Fairway360 demo' button in the info email points here. Paste a demo video or page URL." />
    </div>
  );
}

function Dashboard({ s, bookingUrl, demoUrl, onOpen, onStage, onSaved }: { s: Summary | undefined; bookingUrl: string; demoUrl: string; onOpen: (id: string) => void; onStage: () => void; onSaved: () => void }) {
  if (!s) return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
  return (
    <div className="space-y-5">
      <SettingsCard bookingUrl={bookingUrl} demoUrl={demoUrl} onSaved={onSaved} />
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Today's calling scorecard</div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-8">
          <Kpi label="Calls" value={s.today.callsAttempted} tone="gold" />
          <Kpi label="Live answers" value={s.today.liveAnswers} />
          <Kpi label="Conversations" value={s.today.conversations} />
          <Kpi label="Decision makers" value={s.today.decisionMakers} />
          <Kpi label="Qualified" value={s.today.qualified} tone="green" />
          <Kpi label="Demos booked" value={s.today.demosBooked} tone="green" />
          <Kpi label="Follow-ups due" value={s.followupsDueToday} tone={s.followupsDueToday ? "red" : undefined} />
          <Kpi label="Total prospects" value={s.totalProspects} />
        </div>
      </div>
      {(s.upcomingDemos.length > 0 || s.bestOpportunity) && (
        <div className="grid gap-3 md:grid-cols-2">
          {s.upcomingDemos.length > 0 && (
            <div className="rounded-xl border border-[#46c97e]/25 bg-[#46c97e]/[0.06] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#46c97e]">Upcoming demos</div>
              {s.upcomingDemos.slice(0, 5).map((d) => (
                <button key={d.id} onClick={() => onOpen(d.id)} className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm hover:text-[#46c97e]">
                  <span className="truncate">{d.clubName}{d.dmName ? ` — ${d.dmName}` : ""}</span>
                  <span className="shrink-0 text-xs text-white/55">{fmtDT(d.demoAt)} · {d.assignedCloser}</span>
                </button>
              ))}
            </div>
          )}
          {s.bestOpportunity && (
            <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">Best opportunity today</div>
              <button onClick={() => onOpen(s.bestOpportunity!.id)} className="text-left text-sm font-medium hover:text-accent">{s.bestOpportunity.clubName}</button>
              <div className="text-xs text-white/55">Score {s.bestOpportunity.score} · {s.bestOpportunity.stage}{s.bestOpportunity.painPrimary ? ` · ${s.bestOpportunity.painPrimary}` : ""}</div>
            </div>
          )}
        </div>
      )}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Pipeline funnel</div>
        <div className="flex flex-wrap gap-1.5">
          {s.funnel.filter((f) => f.count > 0).map((f) => (
            <button key={f.stage} onClick={onStage} className={cn("rounded-full border bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium hover:bg-white/[0.08]", stageTone[f.stage])}>
              {f.stage} · {f.count}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pipeline (kanban) view ───────────────────────────────────────────────────

function ProspectCard({ p, onOpen }: { p: Prospect; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(p.id)}
      className="w-full rounded-lg border border-white/10 bg-[#0a1f14] p-2.5 text-left transition hover:border-accent/40 hover:bg-white/[0.04]"
      data-testid={`kanban-card-${p.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white">{p.clubName}</span>
        <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", classTone[p.classification])}>{p.score}</Badge>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-white/50">{[p.city, p.state].filter(Boolean).join(", ") || "—"}{p.timezone ? ` · ${p.timezone}` : ""}</div>
      {p.dmName && <div className="mt-1 truncate text-[11px] text-white/65">{p.dmName}{p.dmTitle ? ` · ${p.dmTitle}` : ""}</div>}
      <div className="mt-1.5 flex items-center justify-between">
        <Badge variant="outline" className="border-white/15 px-1.5 py-0 text-[10px] text-white/55">Seg {p.segment}</Badge>
        <span className="text-[10px] text-white/40">
          {p.demoAt ? `Demo ${fmtDT(p.demoAt)}` : p.nextFollowupAt ? `FU ${fmtDT(p.nextFollowupAt)}` : p.lastContactAt ? fmtDT(p.lastContactAt) : "New"}
        </span>
      </div>
    </button>
  );
}

const PER_COLUMN = 30;

function PipelineBoard({ prospects, loading, funnelCount, filtered, today, onOpen }: {
  prospects: Prospect[]; loading: boolean; funnelCount: (s: string) => number; filtered: boolean;
  today: Summary["today"] | undefined; onOpen: (id: string) => void;
}) {
  const byStage = useMemo(() => {
    const m = new Map<string, Prospect[]>();
    for (const st of STAGES) m.set(st, []);
    for (const p of prospects) m.get(p.stage)?.push(p);
    return m;
  }, [prospects]);

  // Only render columns that have cards, plus the always-present entry/goal stages.
  const columns = STAGES.filter((st) => (byStage.get(st)?.length ?? 0) > 0 || ["New Lead", "Attempted", "Connected", "Qualified", "Demo Booked"].includes(st));

  return (
    <div className="space-y-4">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-h-[300px] gap-3" style={{ width: "max-content" }}>
            {columns.map((st) => {
              const cards = byStage.get(st) ?? [];
              const total = filtered ? cards.length : (funnelCount(st) || cards.length);
              return (
                <div key={st} className="flex w-64 shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-white/35">{STAGE_NO[st]}</span>
                      <span className={cn("truncate", stageTone[st]?.split(" ").pop())}>{st}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white/10 px-1.5 text-[11px] text-white/60">{total}</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "58vh" }}>
                    {cards.slice(0, PER_COLUMN).map((p) => <ProspectCard key={p.id} p={p} onOpen={onOpen} />)}
                    {cards.length > PER_COLUMN && (
                      <div className="py-1 text-center text-[11px] text-white/40">+{cards.length - PER_COLUMN} more — use Contacts + search</div>
                    )}
                    {cards.length === 0 && <div className="py-6 text-center text-[11px] text-white/25">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Today's Activity strip (mockup bottom row) */}
      {today && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Today's activity</div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            <Kpi label="Calls made" value={today.callsAttempted} tone="gold" />
            <Kpi label="Conversations" value={today.conversations} />
            <Kpi label="Decision makers" value={today.decisionMakers} />
            <Kpi label="Demos booked" value={today.demosBooked} tone="green" />
            <Kpi label="Qualified" value={today.qualified} tone="green" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contacts (list) view ─────────────────────────────────────────────────────

function ContactsList({ prospects, loading, onOpen }: { prospects: Prospect[]; loading: boolean; onOpen: (id: string) => void }) {
  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
  if (prospects.length === 0)
    return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">No prospects match. Add one, or import your lead list (CSV).</div>;
  return (
    <div className="space-y-2">
      {prospects.map((p) => (
        <button key={p.id} onClick={() => onOpen(p.id)}
          className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white/[0.06]"
          data-testid={`crm-prospect-${p.id}`}>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{p.clubName}</span>
            <span className="block truncate text-xs text-white/55">
              {[p.city, p.state].filter(Boolean).join(", ")}{p.timezone ? ` · ${p.timezone}` : ""}{p.dmName ? ` · ${p.dmName}${p.dmTitle ? ` (${p.dmTitle})` : ""}` : ""}
            </span>
          </span>
          <Badge variant="outline" className="border-white/15 text-white/60">{p.segment}</Badge>
          <Badge variant="outline" className={classTone[p.classification]}>{p.classification} {p.score}</Badge>
          <Badge variant="outline" className={stageTone[p.stage]}>{p.stage}</Badge>
          <span className="w-28 text-right text-[11px] text-white/45">
            {p.nextFollowupAt ? `FU ${fmtDT(p.nextFollowupAt)}` : p.lastContactAt ? `Last ${fmtDT(p.lastContactAt)}` : "Never called"}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Prospect editor / intel dialog ───────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) { return <div className="grid gap-2 sm:grid-cols-2">{children}</div>; }
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">{title}</div>{children}</div>;
}
function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-0.5 text-[13px]"><span className="text-white/45">{k}</span><span className="text-right font-medium text-white/85">{v}</span></div>;
}

function ProspectDialog({ id, initial, loading, bookingBase, onClose }: {
  id: string | null; initial: Prospect | null; loading: boolean; bookingBase: string; onClose: (changed: boolean) => void;
}) {
  const { toast } = useToast();
  const [p, setP] = useState<Prospect | null>(initial);
  const [changed, setChanged] = useState(false);
  const [callOutcome, setCallOutcome] = useState<string>("No Answer");
  const [callNotes, setCallNotes] = useState("");
  const [edit, setEdit] = useState(id === null); // new prospects open straight into edit mode
  const [bookOpen, setBookOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailNote, setEmailNote] = useState("");

  if (!p && initial) setP(initial);
  const set = (patch: Partial<Prospect>) => setP((cur) => (cur ? { ...cur, ...patch } : cur));

  const saveM = useMutation({
    mutationFn: async () => {
      if (!p) throw new Error("nothing to save");
      const body = {
        clubName: p.clubName, website: p.website || null, mainPhone: p.mainPhone || null,
        city: p.city || null, state: p.state || null, timezone: (p.timezone as "ET") || null,
        clubType: p.clubType || null, coursesCount: p.coursesCount ?? null, membershipSize: p.membershipSize || null,
        segment: p.segment as "A", campaign: p.campaign || null, publicEmail: p.publicEmail || null, dmName: p.dmName || null, dmTitle: p.dmTitle || null,
        dmPhone: p.dmPhone || null, dmEmail: p.dmEmail || null,
        currentTeeSoftware: p.currentTeeSoftware || null, currentClubSoftware: p.currentClubSoftware || null,
        hasDining: p.hasDining, hasEvents: p.hasEvents, hasMembershipProgram: p.hasMembershipProgram, hasTournaments: p.hasTournaments,
        phoneProcess: p.phoneProcess || null, stage: p.stage as (typeof STAGES)[number],
        painPrimary: p.painPrimary || null, painSecondary: p.painSecondary || null,
        objections: p.objections || null, otherStakeholders: p.otherStakeholders || null, notes: p.notes || null,
        scoreSignals: p.scoreSignals as (typeof SIGNALS)[number][],
        nextFollowupAt: p.nextFollowupAt, demoAt: p.demoAt, assignedCloser: p.assignedCloser || "Brady",
      };
      return id ? api.patch<Prospect>(`/api/admin/prospects/${id}`, body) : api.post<Prospect>("/api/admin/prospects", body);
    },
    onSuccess: (r) => { setChanged(true); setP((cur) => (cur ? { ...cur, ...r } : cur)); setEdit(false); toast({ title: id ? "Prospect saved" : "Prospect added" }); if (!id) onClose(true); },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const callM = useMutation({
    mutationFn: () => api.post<{ prospect: Prospect }>(`/api/admin/prospects/${id}/calls`, {
      outcome: callOutcome, notes: callNotes.trim() || undefined,
      ...(callOutcome === "Callback Scheduled" && p?.nextFollowupAt ? { nextFollowupAt: p.nextFollowupAt } : {}),
      ...(callOutcome === "Demo Booked" && p?.demoAt ? { demoAt: p.demoAt } : {}),
    }),
    onSuccess: (r) => {
      setChanged(true); setCallNotes("");
      setP((cur) => (cur ? { ...cur, ...r.prospect, calls: [{ id: Math.random().toString(), calledAt: new Date().toISOString(), outcome: callOutcome, callerName: null, notes: callNotes || null }, ...(cur.calls ?? [])] } : cur));
      toast({ title: `Call logged: ${callOutcome}` });
    },
    onError: (e: Error) => toast({ title: "Couldn't log call", description: e.message, variant: "destructive" }),
  });

  const emailM = useMutation({
    mutationFn: () => api.post<{ ok: boolean }>(`/api/admin/prospects/${id}/send-email`, { to: emailTo.trim(), note: emailNote.trim() || undefined }),
    onSuccess: () => {
      setChanged(true); setEmailOpen(false); setEmailNote("");
      setP((cur) => (cur ? { ...cur, lastEmailAt: new Date().toISOString(), lastContactAt: new Date().toISOString() } : cur));
      toast({ title: "Email sent", description: `Intro email sent to ${emailTo.trim()}` });
    },
    onError: (e: Error) => toast({ title: "Couldn't send email", description: e.message, variant: "destructive" }),
  });

  const delM = useMutation({ mutationFn: () => api.del(`/api/admin/prospects/${id}`), onSuccess: () => { toast({ title: "Prospect deleted" }); onClose(true); } });

  // Prefilled Cal.com booking link — invitee = the prospect (name/email/notes).
  const bookUrl = (() => {
    if (!p) return bookingBase;
    const params = new URLSearchParams();
    if (p.dmName) params.set("name", p.dmName);
    if (p.dmEmail || p.publicEmail) params.set("email", (p.dmEmail ?? p.publicEmail)!);
    params.set("notes", `${p.clubName}${p.city || p.state ? ` — ${[p.city, p.state].filter(Boolean).join(", ")}` : ""}${p.mainPhone ? ` · ${p.mainPhone}` : ""}`);
    return `${bookingBase}${bookingBase.includes("?") ? "&" : "?"}${params.toString()}`;
  })();

  const score = (p?.scoreSignals?.length ?? 0) * 2;
  const cls = score >= 16 ? "HOT" : score >= 10 ? "WARM" : score >= 5 ? "DEVELOP" : "LOW";
  const handoff = p ? [
    `FAIRWAY360 DEMO HANDOFF`,
    `Club: ${p.clubName}${p.city || p.state ? ` (${[p.city, p.state].filter(Boolean).join(", ")})` : ""}`,
    `Decision Maker: ${p.dmName ?? "—"}${p.dmTitle ? ` — ${p.dmTitle}` : ""}`,
    `Phone: ${p.dmPhone ?? p.mainPhone ?? "—"}`, `Email: ${p.dmEmail ?? "—"}`,
    `Club Type: ${p.clubType ?? "—"} · Segment ${p.segment}`,
    `Current Software: ${[p.currentTeeSoftware, p.currentClubSoftware].filter(Boolean).join(" / ") || "—"}`,
    `Primary Pain: ${p.painPrimary ?? "—"}`, `Secondary Pain: ${p.painSecondary ?? "—"}`,
    `Objections: ${p.objections ?? "—"}`, `Other Stakeholders: ${p.otherStakeholders ?? "—"}`,
    `Qualification Score: ${score} (${cls})`, `Demo: ${fmtDT(p.demoAt)} · Closer: ${p.assignedCloser}`,
    `Notes: ${p.notes ?? "—"}`,
  ].join("\n") : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(changed)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#07190f] text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {id ? p?.clubName || "Prospect" : "New prospect"}
            {p && <Badge variant="outline" className={classTone[cls]}>{cls} · {score} pts</Badge>}
            {p && id && <Badge variant="outline" className={stageTone[p.stage]}>{p.stage}</Badge>}
            {p?.clubType && <Badge variant="outline" className="border-white/15 text-white/55">{p.clubType}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading || !p ? (
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        ) : (
          <div className="space-y-5">
            {/* Quick call logging — the caller's main action */}
            {id && (
              <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent"><PhoneCall className="h-3.5 w-3.5" /> Log a call</div>
                <div className="flex flex-wrap gap-2">
                  <Select value={callOutcome} onValueChange={setCallOutcome}>
                    <SelectTrigger className="h-9 w-48 border-white/15 bg-white/5 text-white" data-testid="select-call-outcome"><SelectValue /></SelectTrigger>
                    <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={callNotes} onChange={(e) => setCallNotes(e.target.value)} placeholder="Call notes (their words, pain, next step)…" className={cn(inputCls, "min-w-[200px] flex-1")} data-testid="input-call-notes" />
                  <Button size="sm" disabled={callM.isPending} onClick={() => callM.mutate()} data-testid="button-log-call">
                    {callM.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Phone className="mr-1 h-4 w-4" />} Log
                  </Button>
                  <Button size="sm" variant="outline" className="border-[#46c97e]/40 text-[#46c97e] hover:bg-[#46c97e]/10"
                    onClick={() => { window.open(bookUrl, "_blank", "noopener,noreferrer"); setBookOpen(true); }} data-testid="button-book-meeting">
                    <CalendarPlus className="mr-1 h-4 w-4" /> Book meeting
                  </Button>
                  <Button size="sm" variant="outline" className="border-accent/40 text-accent hover:bg-accent/10"
                    onClick={() => { setEmailTo(p.dmEmail || p.publicEmail || ""); setEmailOpen(true); }} data-testid="button-send-email">
                    <Send className="mr-1 h-4 w-4" /> Send email
                  </Button>
                </div>
                {p.lastEmailAt && (
                  <p className="mt-2 text-[11px] text-accent">✓ Info email sent {fmtDT(p.lastEmailAt)}</p>
                )}
                {(callOutcome === "Callback Scheduled" || callOutcome === "Demo Booked") && (
                  <p className="mt-2 text-[11px] text-white/55">Set the {callOutcome === "Demo Booked" ? "demo date" : "follow-up date"} in the Scheduling section (Edit) before logging — it saves with the call.</p>
                )}
              </div>
            )}

            {/* ── INTEL VIEW (read) — the Pine Valley-style card ─────────────── */}
            {id && !edit && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">Decision maker</div>
                    <div className="text-sm font-semibold text-white">{p.dmName ?? "Unknown — find during call"}</div>
                    {p.dmTitle && <div className="text-xs text-white/55">{p.dmTitle}</div>}
                    <div className="mt-2 space-y-0.5 text-[13px]">
                      {(p.dmPhone || p.mainPhone) && <a href={`tel:${p.dmPhone ?? p.mainPhone}`} className="flex items-center gap-2 text-accent hover:underline"><Phone className="h-3.5 w-3.5" />{p.dmPhone ?? p.mainPhone}</a>}
                      {(p.dmEmail || p.publicEmail) && <a href={`mailto:${p.dmEmail ?? p.publicEmail}`} className="block truncate text-accent hover:underline">{p.dmEmail ?? p.publicEmail}</a>}
                      {p.website && <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-white/60 hover:text-accent"><Globe className="h-3.5 w-3.5" />Website</a>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">Club facts</div>
                    <Fact k="Location" v={[p.city, p.state].filter(Boolean).join(", ") || "—"} />
                    <Fact k="Time zone" v={p.timezone ?? "—"} />
                    <Fact k="Members" v={p.membershipSize ?? "—"} />
                    <Fact k="Courses" v={p.coursesCount ?? "—"} />
                    <Fact k="Tee-sheet system" v={p.currentTeeSoftware ?? "—"} />
                    <Fact k="Dining" v={p.hasDining ? "Yes" : "—"} />
                    <Fact k="Events / weddings" v={p.hasEvents ? "Yes" : "—"} />
                    <Fact k="Membership program" v={p.hasMembershipProgram ? "Yes" : "—"} />
                    <Fact k="Tournaments" v={p.hasTournaments ? "Yes" : "—"} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-300"><Target className="h-3.5 w-3.5" /> Pain points</div>
                    <ul className="space-y-1 text-[13px] text-white/75">
                      {p.painPrimary && <li>• {p.painPrimary}</li>}
                      {p.painSecondary && <li>• {p.painSecondary}</li>}
                      {!p.painPrimary && !p.painSecondary && <li className="text-white/40">Discover on the call — log in notes.</li>}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-[#46c97e]/20 bg-[#46c97e]/[0.06] p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#46c97e]">Fairway360 opportunities</div>
                    <ul className="space-y-1 text-[13px]">
                      {opportunities(p).map((o) => (
                        <li key={o.label} className={o.on ? "text-white/80" : "text-white/30"}>{o.on ? "✓" : "○"} {o.label}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {p.notes && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[13px] text-white/70"><span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Notes</span><p className="mt-1 whitespace-pre-wrap">{p.notes}</p></div>}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="border-white/15" onClick={() => setEdit(true)} data-testid="button-edit-prospect">Edit details</Button>
                  <div className="flex-1" />
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => { if (confirm("Delete this prospect and its call history?")) delM.mutate(); }}>
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              </>
            )}

            {/* ── EDIT VIEW (form) ──────────────────────────────────────────── */}
            {edit && (
              <>
                <Sec title="Club information">
                  <Row>
                    <Input value={p.clubName} onChange={(e) => set({ clubName: e.target.value })} placeholder="Club name *" className={inputCls} data-testid="input-club-name" />
                    <Input value={p.website ?? ""} onChange={(e) => set({ website: e.target.value })} placeholder="Website" className={inputCls} />
                    <Input value={p.mainPhone ?? ""} onChange={(e) => set({ mainPhone: e.target.value })} placeholder="Main phone" className={inputCls} />
                    <Input value={p.clubType ?? ""} onChange={(e) => set({ clubType: e.target.value })} placeholder="Club type (private / resort / public…)" className={inputCls} />
                    <Input value={p.city ?? ""} onChange={(e) => set({ city: e.target.value })} placeholder="City" className={inputCls} />
                    <Input value={p.state ?? ""} onChange={(e) => set({ state: e.target.value })} placeholder="State (GA)" className={inputCls} />
                    <Select value={p.timezone ?? "unset"} onValueChange={(v) => set({ timezone: v === "unset" ? null : v })}>
                      <SelectTrigger className="border-white/15 bg-white/5 text-white"><SelectValue placeholder="Time zone" /></SelectTrigger>
                      <SelectContent><SelectItem value="unset">Time zone…</SelectItem>{["ET", "CT", "MT", "PT", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={p.segment} onValueChange={(v) => set({ segment: v })}>
                      <SelectTrigger className="border-white/15 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>{SEGMENTS.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input value={p.membershipSize ?? ""} onChange={(e) => set({ membershipSize: e.target.value })} placeholder="Membership size (~650)" className={inputCls} />
                    <Input type="number" value={p.coursesCount ?? ""} onChange={(e) => set({ coursesCount: e.target.value ? Number(e.target.value) : null })} placeholder="# courses" className={inputCls} />
                  </Row>
                </Sec>
                <Sec title="Decision maker">
                  <Row>
                    <Input value={p.dmName ?? ""} onChange={(e) => set({ dmName: e.target.value })} placeholder="Name" className={inputCls} data-testid="input-dm-name" />
                    <Input value={p.dmTitle ?? ""} onChange={(e) => set({ dmTitle: e.target.value })} placeholder="Title (GM, Director of Golf…)" className={inputCls} />
                    <Input value={p.dmPhone ?? ""} onChange={(e) => set({ dmPhone: e.target.value })} placeholder="Direct number" className={inputCls} />
                    <Input value={p.dmEmail ?? ""} onChange={(e) => set({ dmEmail: e.target.value })} placeholder="Decision-maker email" className={inputCls} />
                    <Input value={p.publicEmail ?? ""} onChange={(e) => set({ publicEmail: e.target.value })} placeholder="Club public email (info@…)" className={inputCls} />
                  </Row>
                </Sec>
                <Sec title="Operational intelligence">
                  <Row>
                    <Input value={p.currentTeeSoftware ?? ""} onChange={(e) => set({ currentTeeSoftware: e.target.value })} placeholder="Tee-sheet software" className={inputCls} />
                    <Input value={p.currentClubSoftware ?? ""} onChange={(e) => set({ currentClubSoftware: e.target.value })} placeholder="Club-management software" className={inputCls} />
                  </Row>
                  <div className="flex flex-wrap gap-2">
                    {([["hasDining", "Dining"], ["hasEvents", "Weddings/Events"], ["hasMembershipProgram", "Membership program"], ["hasTournaments", "Tournaments"]] as const).map(([k, label]) => (
                      <button key={k} type="button" onClick={() => set({ [k]: !p[k] } as Partial<Prospect>)}
                        className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", p[k] ? "border-[#46c97e]/50 bg-[#46c97e]/15 text-[#46c97e]" : "border-white/15 bg-white/5 text-white/55 hover:bg-white/10")}>{label}</button>
                    ))}
                  </div>
                  <Input value={p.phoneProcess ?? ""} onChange={(e) => set({ phoneProcess: e.target.value })} placeholder="How they handle calls today" className={inputCls} />
                </Sec>
                <Sec title="Qualification scorecard (+2 each)">
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {SIGNALS.map((sig) => {
                      const on = p.scoreSignals?.includes(sig);
                      return (
                        <button key={sig} type="button" onClick={() => set({ scoreSignals: on ? p.scoreSignals.filter((x) => x !== sig) : [...(p.scoreSignals ?? []), sig] })}
                          className={cn("rounded-lg border px-2.5 py-1.5 text-left text-xs transition", on ? "border-accent/50 bg-accent/15 text-accent" : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07]")}
                          data-testid={`signal-${sig}`}>{on ? "✓ " : ""}{sig}</button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-white/55">Score: <span className="font-semibold text-white">{score}</span> → <Badge variant="outline" className={classTone[cls]}>{cls}</Badge>
                    <span className="ml-2 text-white/35">16+ HOT · 10–15 WARM · 5–9 DEVELOP · 0–4 LOW</span></div>
                </Sec>
                <Sec title="Sales information">
                  <Select value={p.stage} onValueChange={(v) => set({ stage: v })}>
                    <SelectTrigger className="border-white/15 bg-white/5 text-white" data-testid="select-stage"><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                  </Select>
                  <Row>
                    <Input value={p.painPrimary ?? ""} onChange={(e) => set({ painPrimary: e.target.value })} placeholder="Primary pain (their words)" className={inputCls} data-testid="input-pain" />
                    <Input value={p.painSecondary ?? ""} onChange={(e) => set({ painSecondary: e.target.value })} placeholder="Secondary pain" className={inputCls} />
                  </Row>
                  <Input value={p.objections ?? ""} onChange={(e) => set({ objections: e.target.value })} placeholder="Objections raised" className={inputCls} />
                  <Input value={p.otherStakeholders ?? ""} onChange={(e) => set({ otherStakeholders: e.target.value })} placeholder="Other stakeholders (board, owner…)" className={inputCls} />
                  <Textarea value={p.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Notes" rows={3} className={inputCls} />
                </Sec>
                <Sec title="Scheduling">
                  <Row>
                    <div><div className="mb-1 text-[11px] text-white/55">Next follow-up</div>
                      <Input type="datetime-local" value={toLocalInput(p.nextFollowupAt)} onChange={(e) => set({ nextFollowupAt: fromLocalInput(e.target.value) })} className={inputCls} data-testid="input-followup" /></div>
                    <div><div className="mb-1 text-[11px] text-white/55">Demo date &amp; time</div>
                      <Input type="datetime-local" value={toLocalInput(p.demoAt)} onChange={(e) => set({ demoAt: fromLocalInput(e.target.value) })} className={inputCls} data-testid="input-demo" /></div>
                  </Row>
                  <Input value={p.assignedCloser} onChange={(e) => set({ assignedCloser: e.target.value })} placeholder="Assigned closer" className={inputCls} />
                </Sec>
              </>
            )}

            {/* Closer hand-off */}
            {id && !edit && (p.stage === "Demo Booked" || p.demoAt) && (
              <div className="rounded-xl border border-[#46c97e]/25 bg-[#46c97e]/[0.06] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#46c97e]">Closer hand-off summary</span>
                  <Button size="sm" variant="outline" className="border-white/15" onClick={() => { void navigator.clipboard.writeText(handoff); toast({ title: "Hand-off copied" }); }} data-testid="button-copy-handoff">
                    <ClipboardCopy className="mr-1 h-3.5 w-3.5" /> Copy for {p.assignedCloser}
                  </Button>
                </div>
                <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/70">{handoff}</pre>
              </div>
            )}

            {/* Call history */}
            {id && !edit && (p.calls?.length ?? 0) > 0 && (
              <Sec title={`Call history (${p.calls!.length})`}>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {p.calls!.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
                      <span className="shrink-0 text-white/45">{fmtDT(c.calledAt)}</span>
                      <Badge variant="outline" className="shrink-0 border-white/15 text-white/70">{c.outcome}</Badge>
                      <span className="min-w-0 flex-1 text-white/65">{c.notes}</span>
                    </div>
                  ))}
                </div>
              </Sec>
            )}

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              {edit ? (
                <>
                  {id && <Button variant="outline" className="border-white/15" onClick={() => setEdit(false)}>Cancel edit</Button>}
                  <Button disabled={!p.clubName.trim() || saveM.isPending} onClick={() => saveM.mutate()} data-testid="button-save-prospect">
                    {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {id ? "Save changes" : "Add prospect"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="border-white/15" onClick={() => onClose(changed)}><X className="mr-1 h-4 w-4" /> Close</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      {/* Cal.com booking — opens Brady's calendar (prefilled) in a new tab.
          Cal.com blocks iframe embedding, so we link out rather than embed. */}
      {p && (
        <Dialog open={bookOpen} onOpenChange={setBookOpen}>
          <DialogContent className="border-white/10 bg-[#07190f] text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <CalendarPlus className="h-4 w-4 text-[#46c97e]" /> Book a meeting — {p.clubName}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#46c97e]/15">
                <CalendarPlus className="h-7 w-7 text-[#46c97e]" />
              </div>
              <p className="text-sm text-white/70">
                Brady's booking calendar opened in a new tab, prefilled with {p.dmName ? `${p.dmName}'s` : "this club's"} details.
                If your browser blocked it, use the button below.
              </p>
              <Button
                className="w-full bg-[#46c97e] text-[#04130c] hover:bg-[#46c97e]/90"
                onClick={() => window.open(bookUrl, "_blank", "noopener,noreferrer")}
                data-testid="link-book-newtab"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open Brady's calendar
              </Button>
              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/55">
                After booking, log the call as <span className="font-semibold text-[#46c97e]">"Demo Booked"</span> and set the date — it then shows on the pipeline &amp; the closer hand-off.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* One-click intro email — sends a ready-made template to the address the caller enters */}
      {p && (
        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogContent className="border-white/10 bg-[#07190f] text-white sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-accent" /> Send info email — {p.clubName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-[11px] text-white/55">Send to</div>
                <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="email@club.com"
                  type="email" className={inputCls} data-testid="input-email-to" />
                <p className="mt-1 text-[11px] text-white/40">Prefilled from the record — change it to whatever address they give you on the call.</p>
              </div>
              <div>
                <div className="mb-1 text-[11px] text-white/55">Add a personal line (optional)</div>
                <Textarea value={emailNote} onChange={(e) => setEmailNote(e.target.value)} rows={2}
                  placeholder="e.g. Great talking with you about your missed calls during peak season…" className={inputCls} data-testid="input-email-note" />
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
                <div className="mb-1 font-semibold text-white/70">What gets sent:</div>
                A branded intro to Fairway360 with a <span className="text-accent">"Watch the demo"</span> link and a link to book a walkthrough with Brady. Replies go to your sales inbox. (Set the demo link on the Dashboard.)
              </div>
              <Button className="w-full" disabled={!/^\S+@\S+\.\S+$/.test(emailTo.trim()) || emailM.isPending}
                onClick={() => emailM.mutate()} data-testid="button-send-email-confirm">
                {emailM.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Send email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
