// Self-serve club onboarding wizard (build-doc Part 4) — six steps:
//   1 Club profile   2 Admin account   3 Invite employees   4 Menu
//   5 Tee sheet      6 AI agent config → done → Supervisor portal
// Steps 1+2 create the tenant (and log the admin in); steps 3-6 call the
// authenticated supervisor CRUD endpoints.

import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PortalLogo } from "@/components/portal/portal-logo";
import { Seo } from "@/components/seo";
import { CategoryPicker } from "@/components/portal/category-picker";
import { cn } from "@/lib/utils";

const api = {
  post: <T,>(url: string, body?: unknown) =>
    customFetch<T>(url, {
      method: "POST",
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "PATCH", credentials: "include", body: JSON.stringify(body) }),
};

const STEPS = ["Club", "Admin", "Team", "Menu", "Tee Sheet", "AI Agents"];
const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

// A club slug is its unique URL id. Force it into the allowed shape as the user
// types (lowercase, digits, single hyphens) so an invalid slug can never reach
// the server — the #1 cause of a confusing "create club" failure.
// Live input cleaner — keeps a trailing hyphen so the user can still type
// separators (e.g. "nick-" then "golf"). Leading hyphens and doubles are removed.
function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60);
}
// Final, submit-ready slug (also trims a trailing hyphen).
const finalizeSlug = (s: string) => s.replace(/-+$/, "");
// Valid once it would be a legal slug after finalizing.
const slugIsValid = (s: string) => /^[a-z0-9-]{3,60}$/.test(finalizeSlug(s)) && finalizeSlug(s).length >= 3;

type Employee = { name: string; email: string; role: "employee" | "supervisor"; jobTitle: string };
type MenuRow = { name: string; price: string; category: string };

export function Onboarding() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1 — club profile
  const [club, setClub] = useState({
    clubName: "", slug: "", timezone: "America/New_York", currency: "USD",
    primaryColor: "#1B3A2D", accentColor: "#C9A84C", phone: "", address: "",
  });
  // Once the user hand-edits the slug, stop auto-deriving it from the name.
  const [slugEdited, setSlugEdited] = useState(false);
  // Step 2 — admin account
  const [admin, setAdmin] = useState({ adminName: "", adminEmail: "", adminPassword: "" });
  // Step 3 — employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [inviteLinks, setInviteLinks] = useState<string[]>([]);
  // Step 4 — menu
  const [menu, setMenu] = useState<MenuRow[]>([
    { name: "", price: "", category: "Lunch" },
  ]);
  // Step 5 — tee sheet
  const [tee, setTee] = useState({
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    openTime: "07:00", closeTime: "17:00", intervalMinutes: 10, maxPlayers: 4,
  });
  // Step 6 — kitchen agent
  const [agent, setAgent] = useState({ name: "Kitchen Assistant", tone: "friendly", greetingMessage: "" });

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      // Surface the server's own message (e.g. "That club URL is already taken")
      // rather than a generic error, and strip the HTTP-status prefix.
      const raw = (e as Error).message || "Please try again.";
      const clean = raw.replace(/^HTTP \d+[^:]*:\s*/i, "");
      toast({ title: "Couldn't continue", description: clean, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  // Steps 1+2 → create the tenant and log in. On a validation error we send
  // the user back to the field that caused it (slug/name live in step 1).
  const createClub = () =>
    run(async () => {
      try {
        await api.post("/api/onboarding/create-club", {
          ...club,
          phone: club.phone || undefined,
          address: club.address || undefined,
          ...admin,
        });
      } catch (e) {
        const msg = (e as Error).message.toLowerCase();
        if (msg.includes("slug") || msg.includes("club url") || msg.includes("club name")) {
          setStep(0); // the offending field is on step 1
        }
        throw e;
      }
      toast({ title: `${club.clubName} created`, description: "You're logged in as the club admin." });
      setStep(2);
    });

  const inviteTeam = () =>
    run(async () => {
      const links: string[] = [];
      for (const e of employees.filter((x) => x.name && x.email)) {
        const r = await api.post<{ inviteLink: string }>("/api/staff", {
          name: e.name, email: e.email, role: e.role, jobTitle: e.jobTitle || "Staff",
        });
        links.push(r.inviteLink);
      }
      setInviteLinks(links);
      await api.post("/api/onboarding/step", { step: "3" });
      setStep(3);
      if (links.length) toast({ title: `${links.length} invitation(s) sent` });
    });

  const saveMenu = () =>
    run(async () => {
      const items = menu.filter((m) => m.name && m.price);
      if (items.length) {
        await api.post("/api/menu-admin/bulk-import", {
          items: items.map((m) => ({ name: m.name, price: Number(m.price), category: m.category })),
        });
      }
      await api.post("/api/onboarding/step", { step: "4" });
      setStep(4);
      if (items.length) toast({ title: `${items.length} menu items added` });
    });

  const generateTee = () =>
    run(async () => {
      const r = await api.post<{ created: number }>("/api/tee-sheet/generate", tee);
      await api.post("/api/onboarding/step", { step: "5" });
      setStep(5);
      toast({ title: `${r.created} tee slots created for ${tee.date}` });
    });

  const finish = () =>
    run(async () => {
      await api.patch("/api/agents/kitchen", {
        name: agent.name, tone: agent.tone, greetingMessage: agent.greetingMessage || null,
      });
      await api.post("/api/onboarding/complete");
      toast({ title: "Onboarding complete 🎉", description: "Welcome to Fairway360." });
      setLocation("/portal/supervisor");
    });

  return (
    <div className="min-h-dvh bg-[#04130c] px-4 py-10 text-white">
      {/* Signup wizard: useful to people, useless in search results. */}
      <Seo
        title="Set up your club — Fairway360"
        description="Create your club's Fairway360 account."
        path="/onboarding"
        noindex
      />
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-4">
          <PortalLogo size="sm" />
          <h1 className="font-display text-2xl font-semibold">Set up your club</h1>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    i < step
                      ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                      : i === step
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/15 text-white/40",
                  )}
                >
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="h-px w-4 bg-white/15" />}
              </div>
            ))}
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-accent/80">{STEPS[step]}</div>
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl"
        >
          {step === 0 && (
            <div className="space-y-3">
              <Input className={inputCls} placeholder="Club name" value={club.clubName}
                onChange={(e) => setClub({ ...club, clubName: e.target.value, slug: slugEdited ? club.slug : finalizeSlug(toSlug(e.target.value)) })}
                data-testid="input-onboarding-club-name" />
              <div>
                <Input className={inputCls} placeholder="club-url-slug" value={club.slug}
                  onChange={(e) => { setSlugEdited(true); setClub({ ...club, slug: toSlug(e.target.value) }); }}
                  data-testid="input-onboarding-slug" />
                {club.slug.length > 0 && !slugIsValid(club.slug) ? (
                  <p className="mt-1 text-xs text-amber-400">Use at least 3 characters — lowercase letters, numbers, and hyphens only.</p>
                ) : (
                  <p className="mt-1 text-xs text-white/45">
                    Your club's web address{club.slug ? `: fairway360.io/${club.slug}` : " (lowercase, hyphens)"}.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input className={inputCls} placeholder="Timezone" value={club.timezone} onChange={(e) => setClub({ ...club, timezone: e.target.value })} />
                <Input className={inputCls} placeholder="Currency" value={club.currency} onChange={(e) => setClub({ ...club, currency: e.target.value.toUpperCase().slice(0, 3) })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs text-white/60">Primary color</div>
                  <Input className={inputCls} type="color" value={club.primaryColor} onChange={(e) => setClub({ ...club, primaryColor: e.target.value })} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-white/60">Accent color</div>
                  <Input className={inputCls} type="color" value={club.accentColor} onChange={(e) => setClub({ ...club, accentColor: e.target.value })} />
                </div>
              </div>
              <Input className={inputCls} placeholder="Phone (optional)" value={club.phone} onChange={(e) => setClub({ ...club, phone: e.target.value })} />
              <Input className={inputCls} placeholder="Address (optional)" value={club.address} onChange={(e) => setClub({ ...club, address: e.target.value })} />
              <Button className="w-full" disabled={club.clubName.trim().length < 2 || !slugIsValid(club.slug)}
                onClick={() => { setClub((c) => ({ ...c, slug: finalizeSlug(c.slug) })); setStep(1); }}
                data-testid="button-onboarding-next-1">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <Input className={inputCls} placeholder="Your full name" value={admin.adminName} onChange={(e) => setAdmin({ ...admin, adminName: e.target.value })} data-testid="input-onboarding-admin-name" />
              <Input className={inputCls} type="email" placeholder="Email address" value={admin.adminEmail} onChange={(e) => setAdmin({ ...admin, adminEmail: e.target.value })} data-testid="input-onboarding-admin-email" />
              <Input className={inputCls} type="password" placeholder="Password (min 8 characters)" value={admin.adminPassword} onChange={(e) => setAdmin({ ...admin, adminPassword: e.target.value })} data-testid="input-onboarding-admin-password" />
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/15" onClick={() => setStep(0)}>Back</Button>
                <Button className="flex-1" disabled={busy || admin.adminName.length < 2 || !admin.adminEmail.includes("@") || admin.adminPassword.length < 8} onClick={createClub} data-testid="button-onboarding-create-club">
                  {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create club & continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-white/60">Invite your team — they'll get a link to set their own password (expires in 7 days). You can also skip and invite later.</p>
              {employees.map((e, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-white/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50">Employee {i + 1}</span>
                    <Button size="icon" variant="ghost" onClick={() => setEmployees(employees.filter((_, j) => j !== i))} aria-label="Remove">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input className={inputCls} placeholder="Name" value={e.name} onChange={(ev) => setEmployees(employees.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} />
                    <Input className={inputCls} placeholder="Email" value={e.email} onChange={(ev) => setEmployees(employees.map((x, j) => (j === i ? { ...x, email: ev.target.value } : x)))} />
                    <Input className={inputCls} placeholder="Job title" value={e.jobTitle} onChange={(ev) => setEmployees(employees.map((x, j) => (j === i ? { ...x, jobTitle: ev.target.value } : x)))} />
                    <Select value={e.role} onValueChange={(v) => setEmployees(employees.map((x, j) => (j === i ? { ...x, role: v as Employee["role"] } : x)))}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed border-white/20" onClick={() => setEmployees([...employees, { name: "", email: "", role: "employee", jobTitle: "" }])} data-testid="button-onboarding-add-employee">
                <Plus className="mr-1 h-4 w-4" /> Add employee
              </Button>
              {inviteLinks.length > 0 && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                  {inviteLinks.length} invite link(s) generated — also emailed when email is configured.
                </div>
              )}
              <Button className="w-full" disabled={busy} onClick={inviteTeam} data-testid="button-onboarding-next-3">
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {employees.some((e) => e.name && e.email) ? "Send invites & continue" : "Skip for now"}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-white/60">Add a few menu items so the Kitchen AI can take orders (you can bulk-import more later).</p>
              {menu.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_5.5rem_7rem_2.25rem] items-center gap-2">
                  <Input className={inputCls} placeholder="Item name" value={m.name} onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} data-testid={`input-onboarding-menu-name-${i}`} />
                  <Input className={inputCls} type="number" placeholder="$" value={m.price} onChange={(e) => setMenu(menu.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  <CategoryPicker
                    value={m.category}
                    existing={menu.map((x) => x.category)}
                    onChange={(v) => setMenu(menu.map((x, j) => (j === i ? { ...x, category: v } : x)))}
                    testId={`select-onboarding-menu-category-${i}`}
                  />
                  <Button size="icon" variant="ghost" onClick={() => setMenu(menu.filter((_, j) => j !== i))} aria-label="Remove row">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full border-dashed border-white/20" onClick={() => setMenu([...menu, { name: "", price: "", category: "Lunch" }])}>
                <Plus className="mr-1 h-4 w-4" /> Add row
              </Button>
              <Button className="w-full" disabled={busy} onClick={saveMenu} data-testid="button-onboarding-next-4">
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {menu.some((m) => m.name && m.price) ? "Save menu & continue" : "Skip for now"}
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-white/60">Generate your first tee sheet — the Reception AI books members into these slots.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs text-white/60">Date</div>
                  <Input className={inputCls} type="date" value={tee.date} onChange={(e) => setTee({ ...tee, date: e.target.value })} data-testid="input-onboarding-tee-date" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-white/60">Interval</div>
                  <Select value={String(tee.intervalMinutes)} onValueChange={(v) => setTee({ ...tee, intervalMinutes: Number(v) })}>
                    <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                    <SelectContent>{[8, 10, 12, 15].map((m) => <SelectItem key={m} value={String(m)}>{m} minutes</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-white/60">First tee</div>
                  <Input className={inputCls} type="time" value={tee.openTime} onChange={(e) => setTee({ ...tee, openTime: e.target.value })} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-white/60">Last tee</div>
                  <Input className={inputCls} type="time" value={tee.closeTime} onChange={(e) => setTee({ ...tee, closeTime: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" disabled={busy} onClick={generateTee} data-testid="button-onboarding-next-5">
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Generate tee sheet & continue
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <p className="text-sm text-white/60">Give your Kitchen AI its personality — you can configure all five agents later under Manage Club.</p>
              <Input className={inputCls} placeholder="Agent name (e.g. Caddy)" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} data-testid="input-onboarding-agent-name" />
              <Select value={agent.tone} onValueChange={(v) => setAgent({ ...agent, tone: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["formal", "friendly", "casual"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea className={inputCls} rows={2} placeholder="Greeting message (optional)" value={agent.greetingMessage} onChange={(e) => setAgent({ ...agent, greetingMessage: e.target.value })} />
              <Button className="w-full" disabled={busy || agent.name.length < 2} onClick={finish} data-testid="button-onboarding-finish">
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Finish setup 🎉
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
