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
import { cn } from "@/lib/utils";

const api = {
  get: <T,>(url: string) => customFetch<T>(url, { credentials: "include" }),
  post: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "POST", credentials: "include", body: JSON.stringify(body) }),
  patch: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "PATCH", credentials: "include", body: JSON.stringify(body) }),
};

type Overview = {
  totalClubs: number; activeClubs: number; suspendedClubs: number;
  totalMembers: number; totalStaff: number; byPlan: Record<string, number>;
};
type Tenant = {
  id: string; name: string; slug: string; plan: string; status: string;
  onboardingCompleted: boolean; memberCount: number; staffCount: number;
  lastActivityAt: string | null; createdAt: string;
};

const PLANS = ["trial", "starter", "pro", "enterprise"];
const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
    </div>
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
      <div className="mx-auto max-w-5xl space-y-6">
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

        {o && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Clubs" value={o.totalClubs} />
            <Stat label="Active" value={o.activeClubs} />
            <Stat label="Suspended" value={o.suspendedClubs} />
            <Stat label="Members" value={o.totalMembers} />
            <Stat label="Staff" value={o.totalStaff} />
          </div>
        )}

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
                    {t.slug} · {t.memberCount} members · {t.staffCount} staff
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
