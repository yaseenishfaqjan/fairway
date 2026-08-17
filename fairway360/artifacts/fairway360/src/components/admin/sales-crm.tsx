// Sales CRM — the from-scratch outbound calling system inside the super-admin
// panel. Prospect database, 13-stage pipeline, call logging with automatic
// stage advancement, the 12-signal qualification scorecard, follow-up and demo
// scheduling, the live daily KPI scorecard, CSV import/export, and the closer
// hand-off summary. No external CRM involved.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock, ClipboardCopy, Download, Loader2, Phone, PhoneCall, Plus, Search, Trash2, Upload, X,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const api = {
  get: <T,>(url: string) => customFetch<T>(url, { credentials: "include" }),
  post: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "POST", credentials: "include", body: JSON.stringify(body) }),
  patch: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "PATCH", credentials: "include", body: JSON.stringify(body) }),
  del: <T,>(url: string) => customFetch<T>(url, { method: "DELETE", credentials: "include" }),
};

export const STAGES = [
  "New Lead", "Attempted", "Gatekeeper", "DM Identified", "Connected",
  "Qualified", "Demo Booked", "Follow-Up", "Demo Completed", "Proposal",
  "Closed Won", "Closed Lost", "Do Not Call",
] as const;

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
  dmName: string | null; dmTitle: string | null; dmPhone: string | null; dmEmail: string | null;
  currentTeeSoftware: string | null; currentClubSoftware: string | null;
  hasDining: boolean; hasEvents: boolean; hasMembershipProgram: boolean; hasTournaments: boolean;
  phoneProcess: string | null; stage: string; painPrimary: string | null; painSecondary: string | null;
  objections: string | null; otherStakeholders: string | null; notes: string | null;
  scoreSignals: string[]; score: number; classification: string;
  lastContactAt: string | null; nextFollowupAt: string | null; demoAt: string | null;
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
  "New Lead": "border-white/15 text-white/60",
  "Attempted": "border-white/15 text-white/60",
  "Gatekeeper": "border-sky-400/30 text-sky-300",
  "DM Identified": "border-sky-400/30 text-sky-300",
  "Connected": "border-accent/40 text-accent",
  "Qualified": "border-accent/40 text-accent",
  "Demo Booked": "border-[#46c97e]/40 text-[#46c97e]",
  "Follow-Up": "border-violet-400/30 text-violet-300",
  "Demo Completed": "border-[#46c97e]/40 text-[#46c97e]",
  "Proposal": "border-[#46c97e]/40 text-[#46c97e]",
  "Closed Won": "border-[#46c97e]/60 text-[#46c97e]",
  "Closed Lost": "border-red-400/30 text-red-300",
  "Do Not Call": "border-red-400/40 text-red-400",
};

const fmtDT = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string): string | null => (v ? new Date(v).toISOString() : null);

function Kpi({ label, value, tone }: { label: string; value: number | string; tone?: "gold" | "green" | "red" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className={cn("text-xl font-semibold tabular-nums",
        tone === "gold" ? "text-accent" : tone === "green" ? "text-[#46c97e]" : tone === "red" ? "text-red-300" : "text-white")}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}

const EMPTY: Partial<Prospect> = {
  clubName: "", segment: "A", stage: "New Lead", assignedCloser: "Brady",
  hasDining: false, hasEvents: false, hasMembershipProgram: false, hasTournaments: false,
  scoreSignals: [],
};

export function SalesCrm() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [stageFilter, setStageFilter] = useState("all");
  const [segFilter, setSegFilter] = useState("all");
  const [q, setQ] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  const [openId, setOpenId] = useState<string | "new" | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");

  const listUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (stageFilter !== "all") p.set("stage", stageFilter);
    if (segFilter !== "all") p.set("segment", segFilter);
    if (q.trim()) p.set("q", q.trim());
    if (dueOnly) p.set("due", "today");
    const s = p.toString();
    return `/api/admin/prospects${s ? `?${s}` : ""}`;
  }, [stageFilter, segFilter, q, dueOnly]);

  const summaryQ = useQuery({ queryKey: ["crm", "summary"], queryFn: () => api.get<Summary>("/api/admin/outreach/summary"), refetchInterval: 60_000 });
  const listQ = useQuery({ queryKey: ["crm", "list", listUrl], queryFn: () => api.get<Prospect[]>(listUrl) });
  const detailQ = useQuery({
    queryKey: ["crm", "detail", openId],
    queryFn: () => api.get<Prospect>(`/api/admin/prospects/${openId}`),
    enabled: !!openId && openId !== "new",
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["crm"] });
  };

  const importM = useMutation({
    mutationFn: () => api.post<{ imported: number; skipped: { line: string; reason: string }[] }>("/api/admin/prospects/bulk-import", { csv: importCsv }),
    onSuccess: (r) => {
      refresh(); setImportOpen(false); setImportCsv("");
      toast({ title: `${r.imported} prospects imported`, description: r.skipped.length ? `${r.skipped.length} skipped (duplicates/invalid)` : undefined });
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  const s = summaryQ.data;
  return (
    <div className="space-y-5">
      {/* ── Today's scorecard ─────────────────────────────────────────────── */}
      {s && (
        <>
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
                  {s.upcomingDemos.slice(0, 4).map((d) => (
                    <button key={d.id} onClick={() => setOpenId(d.id)} className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm hover:text-[#46c97e]">
                      <span className="truncate">{d.clubName}{d.dmName ? ` — ${d.dmName}` : ""}</span>
                      <span className="shrink-0 text-xs text-white/55">{fmtDT(d.demoAt)} · {d.assignedCloser}</span>
                    </button>
                  ))}
                </div>
              )}
              {s.bestOpportunity && (
                <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent">Best opportunity today</div>
                  <button onClick={() => setOpenId(s.bestOpportunity!.id)} className="text-left text-sm font-medium hover:text-accent">{s.bestOpportunity.clubName}</button>
                  <div className="text-xs text-white/55">Score {s.bestOpportunity.score} · {s.bestOpportunity.stage}{s.bestOpportunity.painPrimary ? ` · ${s.bestOpportunity.painPrimary}` : ""}</div>
                </div>
              )}
            </div>
          )}
          {/* Pipeline funnel chips */}
          <div className="flex flex-wrap gap-1.5">
            {s.funnel.filter((f) => f.count > 0 || ["New Lead", "Demo Booked"].includes(f.stage)).map((f) => (
              <button
                key={f.stage}
                onClick={() => setStageFilter(stageFilter === f.stage ? "all" : f.stage)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  stageFilter === f.stage ? "border-accent bg-accent/20 text-accent" : cn("bg-white/[0.03] hover:bg-white/[0.08]", stageTone[f.stage]),
                )}
              >
                {f.stage} · {f.count}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search club, contact, city, state…" className={cn(inputCls, "pl-8")} data-testid="input-crm-search" />
        </div>
        <Select value={segFilter} onValueChange={setSegFilter}>
          <SelectTrigger className="h-9 w-40 border-white/15 bg-white/5 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All segments</SelectItem>
            {SEGMENTS.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={dueOnly ? "default" : "outline"} className={dueOnly ? "" : "border-white/15"} onClick={() => setDueOnly(!dueOnly)}>
          <CalendarClock className="mr-1 h-4 w-4" /> Due today
        </Button>
        <Button size="sm" variant="outline" className="border-white/15" onClick={() => setImportOpen(true)} data-testid="button-crm-import">
          <Upload className="mr-1 h-4 w-4" /> Import
        </Button>
        <Button size="sm" variant="outline" className="border-white/15" asChild>
          <a href="/api/admin/prospects-export"><Download className="mr-1 h-4 w-4" /> Export</a>
        </Button>
        <Button size="sm" onClick={() => setOpenId("new")} data-testid="button-crm-add">
          <Plus className="mr-1 h-4 w-4" /> Add prospect
        </Button>
      </div>

      {/* ── Prospect list ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {listQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        {listQ.data?.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/55">
            No prospects match. Add one, or import your lead list (CSV).
          </div>
        )}
        {listQ.data?.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenId(p.id)}
            className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-accent/40 hover:bg-white/[0.06]"
            data-testid={`crm-prospect-${p.id}`}
          >
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

      {/* ── Detail / editor ───────────────────────────────────────────────── */}
      {openId && (
        <ProspectDialog
          key={openId}
          id={openId === "new" ? null : openId}
          initial={openId === "new" ? (EMPTY as Prospect) : detailQ.data ?? null}
          loading={openId !== "new" && detailQ.isLoading}
          onClose={(changed) => { setOpenId(null); if (changed) refresh(); }}
        />
      )}

      {/* ── Import dialog ─────────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="border-white/10 bg-[#07190f] text-white sm:max-w-xl">
          <DialogHeader><DialogTitle>Import lead list (CSV)</DialogTitle></DialogHeader>
          <p className="text-xs text-white/55">
            One club per line: <span className="text-accent">clubName, city, state, timezone(ET/CT/MT/PT), clubType, segment(A–E), website, mainPhone, dmName, dmTitle, dmPhone, dmEmail</span>.
            Only clubName is required; duplicates (same name + state) are skipped.
          </p>
          <Textarea value={importCsv} onChange={(e) => setImportCsv(e.target.value)} rows={8} className={inputCls}
            placeholder={"Pine Valley Country Club,Clementon,NJ,ET,private,A,pinevalley.example.com,(856) 555-0100,John Smith,General Manager,,\nEagle Ridge Golf Resort,Galena,IL,CT,resort,B,,,,,,"} />
          <Button disabled={!importCsv.trim() || importM.isPending} onClick={() => importM.mutate()}>
            {importM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Import
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Prospect editor dialog ───────────────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>;
}
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">{title}</div>
      {children}
    </div>
  );
}

function ProspectDialog({ id, initial, loading, onClose }: {
  id: string | null;
  initial: Prospect | null;
  loading: boolean;
  onClose: (changed: boolean) => void;
}) {
  const { toast } = useToast();
  const [p, setP] = useState<Prospect | null>(initial);
  const [changed, setChanged] = useState(false);
  const [callOutcome, setCallOutcome] = useState<string>("No Answer");
  const [callNotes, setCallNotes] = useState("");

  // Late-arriving fetch for existing prospects.
  if (!p && initial) setP(initial);

  const set = (patch: Partial<Prospect>) => setP((cur) => (cur ? { ...cur, ...patch } : cur));

  const saveM = useMutation({
    mutationFn: async () => {
      if (!p) throw new Error("nothing to save");
      const body = {
        clubName: p.clubName, website: p.website || null, mainPhone: p.mainPhone || null,
        city: p.city || null, state: p.state || null, timezone: (p.timezone as "ET") || null,
        clubType: p.clubType || null, coursesCount: p.coursesCount ?? null, membershipSize: p.membershipSize || null,
        segment: p.segment as "A", dmName: p.dmName || null, dmTitle: p.dmTitle || null,
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
    onSuccess: () => { setChanged(true); toast({ title: id ? "Prospect saved" : "Prospect added" }); if (!id) onClose(true); },
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

  const delM = useMutation({
    mutationFn: () => api.del(`/api/admin/prospects/${id}`),
    onSuccess: () => { toast({ title: "Prospect deleted" }); onClose(true); },
  });

  const score = (p?.scoreSignals?.length ?? 0) * 2;
  const cls = score >= 16 ? "HOT" : score >= 10 ? "WARM" : score >= 5 ? "DEVELOP" : "LOW";

  const handoff = p ? [
    `FAIRWAY360 DEMO HANDOFF`,
    `Club: ${p.clubName}${p.city || p.state ? ` (${[p.city, p.state].filter(Boolean).join(", ")})` : ""}`,
    `Decision Maker: ${p.dmName ?? "—"}${p.dmTitle ? ` — ${p.dmTitle}` : ""}`,
    `Phone: ${p.dmPhone ?? p.mainPhone ?? "—"}`,
    `Email: ${p.dmEmail ?? "—"}`,
    `Club Type: ${p.clubType ?? "—"} · Segment ${p.segment}`,
    `Current Software: ${[p.currentTeeSoftware, p.currentClubSoftware].filter(Boolean).join(" / ") || "—"}`,
    `Primary Pain: ${p.painPrimary ?? "—"}`,
    `Secondary Pain: ${p.painSecondary ?? "—"}`,
    `Objections: ${p.objections ?? "—"}`,
    `Other Stakeholders: ${p.otherStakeholders ?? "—"}`,
    `Qualification Score: ${score} (${cls})`,
    `Demo: ${fmtDT(p.demoAt)} · Closer: ${p.assignedCloser}`,
    `Notes: ${p.notes ?? "—"}`,
  ].join("\n") : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(changed)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto border-white/10 bg-[#07190f] text-white sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {id ? p?.clubName || "Prospect" : "New prospect"}
            {p && <Badge variant="outline" className={classTone[cls]}>{cls} · {score} pts</Badge>}
            {p && id && <Badge variant="outline" className={stageTone[p.stage]}>{p.stage}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading || !p ? (
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        ) : (
          <div className="space-y-5">
            {/* Quick call logging — the caller's main workflow */}
            {id && (
              <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  <PhoneCall className="h-3.5 w-3.5" /> Log a call
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={callOutcome} onValueChange={setCallOutcome}>
                    <SelectTrigger className="h-9 w-48 border-white/15 bg-white/5 text-white" data-testid="select-call-outcome"><SelectValue /></SelectTrigger>
                    <SelectContent>{OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={callNotes} onChange={(e) => setCallNotes(e.target.value)} placeholder="Call notes (their words, pain, next step)…" className={cn(inputCls, "min-w-[200px] flex-1")} data-testid="input-call-notes" />
                  <Button size="sm" disabled={callM.isPending} onClick={() => callM.mutate()} data-testid="button-log-call">
                    {callM.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Phone className="mr-1 h-4 w-4" />} Log
                  </Button>
                </div>
                {(callOutcome === "Callback Scheduled" || callOutcome === "Demo Booked") && (
                  <p className="mt-2 text-[11px] text-white/55">
                    Set the {callOutcome === "Demo Booked" ? "demo date" : "follow-up date"} in Scheduling below before logging — it saves with the call.
                  </p>
                )}
              </div>
            )}

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
                  <SelectContent>
                    <SelectItem value="unset">Time zone…</SelectItem>
                    {["ET", "CT", "MT", "PT", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
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
                <Input value={p.dmEmail ?? ""} onChange={(e) => set({ dmEmail: e.target.value })} placeholder="Email" className={inputCls} />
              </Row>
            </Sec>

            <Sec title="Operational intelligence">
              <Row>
                <Input value={p.currentTeeSoftware ?? ""} onChange={(e) => set({ currentTeeSoftware: e.target.value })} placeholder="Tee-sheet software" className={inputCls} />
                <Input value={p.currentClubSoftware ?? ""} onChange={(e) => set({ currentClubSoftware: e.target.value })} placeholder="Club-management software" className={inputCls} />
              </Row>
              <div className="flex flex-wrap gap-2">
                {([
                  ["hasDining", "Dining"], ["hasEvents", "Weddings/Events"],
                  ["hasMembershipProgram", "Membership program"], ["hasTournaments", "Tournaments"],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set({ [k]: !p[k] } as Partial<Prospect>)}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium transition",
                      p[k] ? "border-[#46c97e]/50 bg-[#46c97e]/15 text-[#46c97e]" : "border-white/15 bg-white/5 text-white/55 hover:bg-white/10")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Input value={p.phoneProcess ?? ""} onChange={(e) => set({ phoneProcess: e.target.value })} placeholder="How they handle calls today" className={inputCls} />
            </Sec>

            <Sec title="Qualification scorecard (+2 each)">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {SIGNALS.map((sig) => {
                  const on = p.scoreSignals?.includes(sig);
                  return (
                    <button
                      key={sig}
                      type="button"
                      onClick={() => set({ scoreSignals: on ? p.scoreSignals.filter((x) => x !== sig) : [...(p.scoreSignals ?? []), sig] })}
                      className={cn("rounded-lg border px-2.5 py-1.5 text-left text-xs transition",
                        on ? "border-accent/50 bg-accent/15 text-accent" : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.07]")}
                      data-testid={`signal-${sig}`}
                    >
                      {on ? "✓ " : ""}{sig}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-white/55">
                Score: <span className="font-semibold text-white">{score}</span> → <Badge variant="outline" className={classTone[cls]}>{cls}</Badge>
                <span className="ml-2 text-white/35">16+ HOT · 10–15 WARM · 5–9 DEVELOP · 0–4 LOW</span>
              </div>
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
                <div>
                  <div className="mb-1 text-[11px] text-white/55">Next follow-up</div>
                  <Input type="datetime-local" value={toLocalInput(p.nextFollowupAt)} onChange={(e) => set({ nextFollowupAt: fromLocalInput(e.target.value) })} className={inputCls} data-testid="input-followup" />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-white/55">Demo date &amp; time</div>
                  <Input type="datetime-local" value={toLocalInput(p.demoAt)} onChange={(e) => set({ demoAt: fromLocalInput(e.target.value) })} className={inputCls} data-testid="input-demo" />
                </div>
              </Row>
              <Input value={p.assignedCloser} onChange={(e) => set({ assignedCloser: e.target.value })} placeholder="Assigned closer" className={inputCls} />
            </Sec>

            {/* Closer hand-off — playbook §23 */}
            {id && (p.stage === "Demo Booked" || p.demoAt) && (
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
            {id && (p.calls?.length ?? 0) > 0 && (
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

            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4">
              {id ? (
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => { if (confirm("Delete this prospect and its call history?")) delM.mutate(); }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/15" onClick={() => onClose(changed)}><X className="mr-1 h-4 w-4" /> Close</Button>
                <Button disabled={!p.clubName.trim() || saveM.isPending} onClick={() => saveM.mutate()} data-testid="button-save-prospect">
                  {saveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {id ? "Save changes" : "Add prospect"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
