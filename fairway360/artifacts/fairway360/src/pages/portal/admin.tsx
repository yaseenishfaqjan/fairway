// Super Admin Console (build-doc Part 8, Portal 1) — Fairway360 platform team.
// Lists all tenants with live counts, provisions new clubs (admin gets a
// set-password invite link), suspends/activates, and changes plans.
// Gated to role = super_admin in App.tsx.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Plus, ShieldBan, ShieldCheck } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PortalLogo } from "@/components/portal/portal-logo";
import { SalesCrm } from "@/components/admin/sales-crm";
import { SalesScripts } from "@/components/admin/sales-scripts";
import { cn } from "@/lib/utils";

const api = {
  get: <T,>(url: string) => customFetch<T>(url, { credentials: "include" }),
  post: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "POST", credentials: "include", body: JSON.stringify(body) }),
  patch: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "PATCH", credentials: "include", body: JSON.stringify(body) }),
};

type GrowthPoint = { month: string; label: string; clubs: number; members: number };
type Overview = {
  totalClubs: number; activeClubs: number; suspendedClubs: number; newClubs30d: number;
  totalMembers: number; newMembers30d: number; totalStaff: number;
  totalOrders: number; totalRevenue: number;
  byPlan: Record<string, number>; growth: GrowthPoint[];
};
type Tenant = {
  id: string; name: string; slug: string; plan: string; status: string;
  onboardingCompleted: boolean; memberCount: number; staffCount: number;
  orderCount: number; revenue: number;
  lastActivityAt: string | null; createdAt: string;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PLANS = ["trial", "core", "pro", "elite", "enterprise"];
const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "gold" | "green" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className={cn("text-2xl font-semibold tabular-nums", tone === "gold" ? "text-accent" : tone === "green" ? "text-[#46c97e]" : "text-white")}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      {sub && <div className="mt-1 text-[11px] font-medium text-[#46c97e]">{sub}</div>}
    </div>
  );
}

// Platform growth — new clubs (gold bars) and new members (green line) per month.
function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const W = 520, H = 150, padL = 28, padR = 10, padT = 16, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxMembers = Math.max(1, ...data.map((d) => d.members));
  const maxClubs = Math.max(1, ...data.map((d) => d.clubs));
  const n = data.length;
  const bandW = innerW / n;
  const x = (i: number) => padL + bandW * i + bandW / 2;
  const yMem = (v: number) => padT + innerH - (v / (maxMembers * 1.15)) * innerH;
  const yClub = (v: number) => padT + innerH - (v / (maxClubs * 1.3)) * innerH;
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${yMem(d.members)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[150px] w-full" role="img" aria-label="Platform growth over the last 6 months">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * (1 - f)} y2={padT + innerH * (1 - f)} stroke="rgba(255,255,255,0.06)" />
      ))}
      {data.map((d, i) => {
        const bh = (d.clubs / (maxClubs * 1.3)) * innerH;
        return (
          <g key={d.month}>
            <rect x={x(i) - bandW * 0.22} y={padT + innerH - bh} width={bandW * 0.44} height={bh} rx="2" fill="#d7ad42" opacity="0.55" />
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#9bae9f">{d.label}</text>
          </g>
        );
      })}
      <path d={line} fill="none" stroke="#46c97e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={d.month} cx={x(i)} cy={yMem(d.members)} r="2.5" fill="#04130c" stroke="#46c97e" strokeWidth="1.5" />)}
    </svg>
  );
}

export function AdminPortal() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const overviewQ = useQuery({ queryKey: ["admin", "overview"], queryFn: () => api.get<Overview>("/api/admin/overview") });
  const tenantsQ = useQuery({ queryKey: ["admin", "tenants"], queryFn: () => api.get<Tenant[]>("/api/admin/tenants") });
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ clubName: "", slug: "", plan: "trial", adminName: "", adminEmail: "" });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [section, setSection] = useState<"platform" | "crm" | "scripts">("platform");

  const createM = useMutation({
    mutationFn: () => api.post<{ clubId: string; inviteLink: string }>("/api/admin/tenants", form),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      setInviteLink(r.inviteLink);
      toast({ title: "Club provisioned", description: "Share the set-password link with the club admin." });
    },
    onError: (e: Error) => toast({ title: "Provisioning failed", description: e.message, variant: "destructive" }),
  });
  const updateM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { plan?: string; status?: string } }) =>
      api.patch(`/api/admin/tenants/${id}`, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      toast({ title: "Tenant updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const o = overviewQ.data;
  return (
    <div className="min-h-dvh bg-[#04130c] px-4 py-8 text-white">
      <div className={cn("mx-auto space-y-6", section === "platform" ? "max-w-5xl" : "max-w-7xl")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PortalLogo size="sm" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/90">Super Admin Console</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60">
            {user?.name}
            <Button size="sm" variant="outline" className="border-white/15" onClick={() => void logout()}>Sign out</Button>
          </div>
        </div>

        {/* Section switcher: platform management · outbound sales CRM · scripts */}
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {([["platform", "Platform"], ["crm", "Sales CRM"], ["scripts", "Call Scripts"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
                section === key ? "bg-accent/20 text-accent" : "text-white/55 hover:bg-white/[0.06] hover:text-white",
              )}
              data-testid={`tab-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        {section === "crm" && <SalesCrm />}
        {section === "scripts" && <SalesScripts />}

        {section === "platform" && o && (
          <>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Platform overview</div>
              <h1 className="font-display text-2xl font-bold">Fairway360 across every club</h1>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Stat label="Clubs" value={o.totalClubs} sub={o.newClubs30d ? `+${o.newClubs30d} this month` : undefined} tone="gold" />
              <Stat label="Active" value={o.activeClubs} />
              <Stat label="Members" value={o.totalMembers} sub={o.newMembers30d ? `+${o.newMembers30d} this month` : undefined} tone="green" />
              <Stat label="Staff" value={o.totalStaff} />
              <Stat label="Orders" value={o.totalOrders} />
              <Stat label="Revenue" value={money(o.totalRevenue)} tone="green" />
            </div>
            {o.growth?.some((g) => g.clubs || g.members) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-accent">Growth · last 6 months</span>
                  <span className="flex items-center gap-3 text-[11px] text-white/50">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-accent/60" /> Clubs</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#46c97e]" /> Members</span>
                  </span>
                </div>
                <GrowthChart data={o.growth} />
              </div>
            )}
          </>
        )}

        {section === "platform" && (
          <>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Tenants</h2>
          <Button size="sm" onClick={() => { setCreateOpen(true); setInviteLink(null); }} data-testid="button-create-tenant">
            <Plus className="mr-1 h-4 w-4" /> New club
          </Button>
        </div>

        <div className="space-y-2">
          {tenantsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
          {(tenantsQ.data ?? []).map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-testid={`tenant-${t.slug}`}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.name}</span>
                    <Badge variant="outline" className={cn(t.status === "active" ? "border-emerald-400/30 text-emerald-300" : "border-red-400/30 text-red-300")}>
                      {t.status}
                    </Badge>
                    {!t.onboardingCompleted && <Badge variant="outline" className="border-accent/30 text-accent">onboarding</Badge>}
                  </div>
                  <div className="text-xs text-white/50">
                    {t.slug} · {t.memberCount} members · {t.staffCount} staff · {t.orderCount} orders · {money(t.revenue)}
                    {t.lastActivityAt ? ` · active ${new Date(t.lastActivityAt).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={t.plan} onValueChange={(plan) => updateM.mutate({ id: t.id, patch: { plan } })}>
                  <SelectTrigger className={cn(inputCls, "h-8 w-28 text-xs")}><SelectValue /></SelectTrigger>
                  <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                {t.status === "active" ? (
                  <Button size="sm" variant="outline" className="border-red-400/30 text-red-300 hover:bg-red-500/10"
                    onClick={() => updateM.mutate({ id: t.id, patch: { status: "suspended" } })} data-testid={`button-suspend-${t.slug}`}>
                    <ShieldBan className="mr-1 h-3.5 w-3.5" /> Suspend
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => updateM.mutate({ id: t.id, patch: { status: "active" } })}>
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Activate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white">
          <DialogHeader><DialogTitle>Provision a new club</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input className={inputCls} placeholder="Club name" value={form.clubName}
              onChange={(e) => setForm({ ...form, clubName: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} />
            <Input className={inputCls} placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
            <div className="grid grid-cols-2 gap-3">
              <Input className={inputCls} placeholder="Admin name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
              <Input className={inputCls} placeholder="Admin email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
            </div>
            <Select value={form.plan} onValueChange={(plan) => setForm({ ...form, plan })}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>{PLANS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            {inviteLink && (
              <div className="break-all rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200" data-testid="text-admin-invite-link">
                Set-password link for the club admin (7 days):<br />{inviteLink}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Close</Button>
            <Button
              disabled={createM.isPending || form.clubName.length < 2 || form.slug.length < 3 || form.adminName.length < 2 || !form.adminEmail.includes("@")}
              onClick={() => createM.mutate()}
              data-testid="button-provision-tenant"
            >
              {createM.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Provision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
