// Supervisor "Manage Club" console — full CRUD for menu, tee sheet, knowledge
// base, AI agent config, invite links, broadcast, and club settings.
// Talks to the /api/supervisor-crud endpoints via customFetch (same-origin
// session cookie).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UtensilsCrossed, CalendarRange, BookOpen, Bot, Link2, Megaphone, Settings2,
  Plus, Trash2, Pencil, RefreshCw, Ban, Loader2, Users, Upload,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const api = {
  get: <T,>(url: string) => customFetch<T>(url, { credentials: "include" }),
  post: <T,>(url: string, body?: unknown) =>
    customFetch<T>(url, {
      method: "POST",
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T,>(url: string, body: unknown) =>
    customFetch<T>(url, { method: "PATCH", credentials: "include", body: JSON.stringify(body) }),
  del: <T,>(url: string) => customFetch<T>(url, { method: "DELETE", credentials: "include" }),
};

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Beverages", "Drinks", "Food", "Snacks", "Specials"];
const ALLERGENS = ["nuts", "peanuts", "shellfish", "dairy", "gluten", "eggs", "soy", "fish", "sesame"];
const KB_CATEGORIES = ["hours", "policies", "dress_code", "events", "facilities", "faq", "pricing"];

type MenuItem = {
  id: string; name: string; description: string | null; price: number; category: string;
  allergens: string[]; dietaryFlags: string[]; prepTimeMinutes: number; available: boolean;
};
type TeeSlot = {
  id: string; startsAt: string; time: string; players: number; maxPlayers: number;
  status: string; notes: string | null; bookedBy: string | null;
};
type KbEntry = { id: string; category: string; title: string; content: string; isActive: boolean };
type Agent = {
  agentKey: string; name: string; greetingMessage: string | null; tone: string;
  customSystemPrompt: string | null; escalationKeywords: string[];
  workingHoursStart: string | null; workingHoursEnd: string | null; isActive: boolean;
};
type Invite = { id: string; email: string | null; name: string | null; role: string; expiresAt: string; status: string };
type ClubSettings = {
  name: string; slug: string; timezone: string; currency: string;
  primaryColor: string; accentColor: string; phone: string | null; address: string | null;
};

const TABS = [
  { key: "people", label: "People", icon: Users },
  { key: "menu", label: "Menu", icon: UtensilsCrossed },
  { key: "tee", label: "Tee Sheet", icon: CalendarRange },
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "agents", label: "AI Agents", icon: Bot },
  { key: "invites", label: "Invites", icon: Link2 },
  { key: "broadcast", label: "Broadcast", icon: Megaphone },
  { key: "settings", label: "Settings", icon: Settings2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

const inputCls = "border-white/15 bg-white/5 text-white placeholder:text-white/35";

// ── Menu tab ────────────────────────────────────────────────────────────────

function MenuTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const itemsQ = useQuery({ queryKey: ["manage", "menu"], queryFn: () => api.get<MenuItem[]>("/api/menu-admin") });
  const [editing, setEditing] = useState<Partial<MenuItem> | null>(null);

  const save = useMutation({
    mutationFn: async (item: Partial<MenuItem>) => {
      const body = {
        name: item.name, description: item.description || null, price: Number(item.price),
        category: item.category, allergens: item.allergens ?? [], dietaryFlags: item.dietaryFlags ?? [],
        prepTimeMinutes: item.prepTimeMinutes || 15, available: item.available ?? true,
      };
      return item.id ? api.patch(`/api/menu-admin/${item.id}`, body) : api.post("/api/menu-admin", body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manage", "menu"] });
      setEditing(null);
      toast({ title: "Menu saved", description: "AI agents see the change immediately." });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/menu-admin/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manage", "menu"] });
      toast({ title: "Item archived" });
    },
  });

  const items = itemsQ.data ?? [];
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Menu ({items.length} items)</h3>
        <Button size="sm" onClick={() => setEditing({ category: "Lunch", prepTimeMinutes: 15, available: true, allergens: [] })} data-testid="button-add-menu-item">
          <Plus className="mr-1 h-4 w-4" /> Add item
        </Button>
      </div>
      {itemsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
      {Object.entries(grouped).map(([cat, list]) => (
        <Card key={cat}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">{cat}</div>
          <div className="space-y-2">
            {list.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2" data-testid={`menu-item-${m.id}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{m.name}</span>
                    <span className="text-sm text-accent">${m.price.toFixed(2)}</span>
                    {!m.available && <Badge variant="outline" className="border-red-400/30 text-red-300">86'd</Badge>}
                  </div>
                  {m.allergens.length > 0 && (
                    <div className="text-xs text-white/45">contains: {m.allergens.join(", ")}</div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(m.id)} aria-label={`Archive ${m.name}`}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit item" : "New menu item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input className={inputCls} placeholder="Name" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="input-menu-name" />
              <Textarea className={inputCls} placeholder="Description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input className={inputCls} type="number" step="0.5" placeholder="Price" value={editing.price ?? ""} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} data-testid="input-menu-price" />
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger className={inputCls}><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs text-white/60">Allergens</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGENS.map((a) => {
                    const on = editing.allergens?.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            allergens: on ? editing.allergens?.filter((x) => x !== a) : [...(editing.allergens ?? []), a],
                          })
                        }
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          on ? "border-accent bg-accent/20 text-accent" : "border-white/15 text-white/60 hover:bg-white/10",
                        )}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <Switch checked={editing.available ?? true} onCheckedChange={(v) => setEditing({ ...editing, available: v })} />
                  Available
                </label>
                <Input className={cn(inputCls, "w-28")} type="number" placeholder="Prep min" value={editing.prepTimeMinutes ?? 15} onChange={(e) => setEditing({ ...editing, prepTimeMinutes: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!editing?.name || editing.price === undefined || save.isPending} onClick={() => editing && save.mutate(editing)} data-testid="button-save-menu-item">
              {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tee sheet tab ───────────────────────────────────────────────────────────

function TeeTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const slotsQ = useQuery({
    queryKey: ["manage", "tee", date],
    queryFn: () => api.get<TeeSlot[]>(`/api/tee-sheet?date=${date}`),
  });
  const [gen, setGen] = useState({ openTime: "07:00", closeTime: "17:00", intervalMinutes: 10, maxPlayers: 4 });

  const generate = useMutation({
    mutationFn: () => api.post<{ created: number }>("/api/tee-sheet/generate", { date, ...gen }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["manage", "tee", date] });
      toast({ title: `${r.created} slots created` });
    },
    onError: (e: Error) => toast({ title: "Generate failed", description: e.message, variant: "destructive" }),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.patch(`/api/tee-sheet/${id}`, { status, notes }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["manage", "tee", date] }),
  });

  const slots = slotsQ.data ?? [];
  const tone: Record<string, string> = {
    pending: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
    confirmed: "border-blue-400/25 bg-blue-500/10 text-blue-300",
    checked_in: "border-accent/30 bg-accent/10 text-accent",
    blocked: "border-white/15 bg-white/5 text-white/45",
    cancelled: "border-red-400/25 bg-red-500/10 text-red-300",
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-1 text-xs text-white/60">Date</div>
          <Input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-tee-date" />
        </div>
        <div>
          <div className="mb-1 text-xs text-white/60">Open</div>
          <Input className={inputCls} type="time" value={gen.openTime} onChange={(e) => setGen({ ...gen, openTime: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 text-xs text-white/60">Close</div>
          <Input className={inputCls} type="time" value={gen.closeTime} onChange={(e) => setGen({ ...gen, closeTime: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 text-xs text-white/60">Interval</div>
          <Select value={String(gen.intervalMinutes)} onValueChange={(v) => setGen({ ...gen, intervalMinutes: Number(v) })}>
            <SelectTrigger className={cn(inputCls, "w-24")}><SelectValue /></SelectTrigger>
            <SelectContent>{[8, 10, 12, 15].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={() => generate.mutate()} disabled={generate.isPending} data-testid="button-generate-tee-sheet">
          {generate.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
          Generate slots
        </Button>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {slots.map((s) => (
          <div key={s.id} className={cn("rounded-xl border p-3", tone[s.status] ?? tone.pending)} data-testid={`tee-slot-${s.id}`}>
            <div className="text-sm font-semibold">
              {s.time ?? new Date(s.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </div>
            <div className="text-xs opacity-80">
              {s.bookedBy ? `${s.bookedBy} · ${s.players}p` : s.status === "blocked" ? (s.notes ?? "Blocked") : `open · ${s.maxPlayers - s.players} spots`}
            </div>
            {!s.bookedBy && (
              <button
                onClick={() => setStatus.mutate({ id: s.id, status: s.status === "blocked" ? "pending" : "blocked", notes: s.status === "blocked" ? undefined : "Blocked by supervisor" })}
                className="mt-1 flex items-center gap-1 text-xs underline-offset-2 hover:underline"
              >
                <Ban className="h-3 w-3" /> {s.status === "blocked" ? "Unblock" : "Block"}
              </button>
            )}
          </div>
        ))}
        {!slotsQ.isLoading && slots.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-white/50">No slots for this date — generate the sheet above.</div>
        )}
      </div>
    </div>
  );
}

// ── Knowledge tab ───────────────────────────────────────────────────────────

function KnowledgeTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const kbQ = useQuery({ queryKey: ["manage", "kb"], queryFn: () => api.get<KbEntry[]>("/api/knowledge") });
  const [editing, setEditing] = useState<Partial<KbEntry> | null>(null);

  const save = useMutation({
    mutationFn: (e: Partial<KbEntry>) =>
      e.id
        ? api.patch(`/api/knowledge/${e.id}`, { category: e.category, title: e.title, content: e.content })
        : api.post("/api/knowledge", { category: e.category, title: e.title, content: e.content }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manage", "kb"] });
      setEditing(null);
      toast({ title: "Saved", description: "Agents answer with the new info immediately." });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/knowledge/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["manage", "kb"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Knowledge base</h3>
        <Button size="sm" onClick={() => setEditing({ category: "faq" })} data-testid="button-add-knowledge">
          <Plus className="mr-1 h-4 w-4" /> Add entry
        </Button>
      </div>
      <div className="space-y-2">
        {(kbQ.data ?? []).map((k) => (
          <Card key={k.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-accent/30 text-accent">{k.category}</Badge>
                <span className="text-sm font-medium">{k.title}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-white/60">{k.content}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="icon" variant="ghost" onClick={() => setEditing(k)} aria-label={`Edit ${k.title}`}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(k.id)} aria-label={`Delete ${k.title}`}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          </Card>
        ))}
        {!kbQ.isLoading && (kbQ.data ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-white/50">No entries yet. Add club hours, dress code, and FAQs so the AI can answer members.</p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#071a10] text-white">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit entry" : "New knowledge entry"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{KB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input className={inputCls} placeholder="Title" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} data-testid="input-kb-title" />
              <Textarea className={inputCls} rows={5} placeholder="Content the AI should know…" value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} data-testid="input-kb-content" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={!editing?.title || !editing?.content || save.isPending} onClick={() => editing && save.mutate(editing)} data-testid="button-save-knowledge">
              {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Agents tab ──────────────────────────────────────────────────────────────

function AgentsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const agentsQ = useQuery({ queryKey: ["manage", "agents"], queryFn: () => api.get<Agent[]>("/api/agents") });
  const [editing, setEditing] = useState<Agent | null>(null);

  const save = useMutation({
    mutationFn: (a: Agent) =>
      api.patch(`/api/agents/${a.agentKey}`, {
        name: a.name,
        greetingMessage: a.greetingMessage || null,
        tone: a.tone,
        customSystemPrompt: a.customSystemPrompt || null,
        escalationKeywords: a.escalationKeywords,
        workingHoursStart: a.workingHoursStart || null,
        workingHoursEnd: a.workingHoursEnd || null,
        isActive: a.isActive,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manage", "agents"] });
      setEditing(null);
      toast({ title: "Agent updated" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">AI agents</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {(agentsQ.data ?? []).map((a) => (
          <Card key={a.agentKey} className="space-y-2" >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" />
                <span className="font-medium">{a.name}</span>
              </div>
              <Badge variant="outline" className={a.isActive ? "border-emerald-400/30 text-emerald-300" : "border-white/15 text-white/45"}>
                {a.isActive ? "active" : "off"}
              </Badge>
            </div>
            <div className="text-xs text-white/55">
              {a.agentKey} · tone: {a.tone}
              {a.workingHoursStart ? ` · hours ${a.workingHoursStart}–${a.workingHoursEnd}` : " · always on"}
            </div>
            <Button size="sm" variant="outline" className="border-white/15" onClick={() => setEditing(a)} data-testid={`button-edit-agent-${a.agentKey}`}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Configure
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-[#071a10] text-white">
          <DialogHeader><DialogTitle>Configure {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input className={inputCls} placeholder="Agent name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="input-agent-name" />
              <Textarea className={inputCls} rows={2} placeholder="Greeting message (first reply of a session)" value={editing.greetingMessage ?? ""} onChange={(e) => setEditing({ ...editing, greetingMessage: e.target.value })} />
              <Select value={editing.tone} onValueChange={(v) => setEditing({ ...editing, tone: v })}>
                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["formal", "friendly", "casual"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea className={inputCls} rows={3} placeholder="Custom instructions (appended to the base prompt)" value={editing.customSystemPrompt ?? ""} onChange={(e) => setEditing({ ...editing, customSystemPrompt: e.target.value })} />
              <div>
                <div className="mb-1 text-xs text-white/60">Extra escalation keywords (comma-separated → Level 2)</div>
                <Input
                  className={inputCls}
                  placeholder="e.g. disgusting, cold food"
                  value={editing.escalationKeywords.join(", ")}
                  onChange={(e) =>
                    setEditing({ ...editing, escalationKeywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                  }
                  data-testid="input-agent-keywords"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs text-white/60">Covers from (blank = always)</div>
                  <Input className={inputCls} type="time" value={editing.workingHoursStart ?? ""} onChange={(e) => setEditing({ ...editing, workingHoursStart: e.target.value || null })} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-white/60">Until</div>
                  <Input className={inputCls} type="time" value={editing.workingHoursEnd ?? ""} onChange={(e) => setEditing({ ...editing, workingHoursEnd: e.target.value || null })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <Switch checked={editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} data-testid="switch-agent-active" />
                Agent enabled
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => editing && save.mutate(editing)} data-testid="button-save-agent">
              {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Invites tab ─────────────────────────────────────────────────────────────

function InvitesTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const invitesQ = useQuery({ queryKey: ["manage", "invites"], queryFn: () => api.get<Invite[]>("/api/invites") });

  const revoke = useMutation({
    mutationFn: (id: string) => api.del(`/api/invites/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manage", "invites"] });
      toast({ title: "Invite revoked" });
    },
  });
  const resend = useMutation({
    mutationFn: (id: string) => api.post<{ inviteLink: string; emailed: boolean }>(`/api/invites/${id}/resend`),
    onSuccess: async (r) => {
      void qc.invalidateQueries({ queryKey: ["manage", "invites"] });
      try { await navigator.clipboard.writeText(r.inviteLink); } catch { /* ignore */ }
      toast({ title: r.emailed ? "Invite re-sent by email" : "New link copied to clipboard" });
    },
  });

  const tone: Record<string, string> = {
    pending: "border-accent/30 text-accent",
    used: "border-emerald-400/30 text-emerald-300",
    expired: "border-red-400/30 text-red-300",
    revoked: "border-white/15 text-white/45",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Invite links</h3>
      <p className="text-sm text-white/55">Created when you add staff or members. Links expire after 7 days and are single-use.</p>
      {(invitesQ.data ?? []).map((i) => (
        <Card key={i.id} className="flex items-center justify-between gap-3" >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{i.name ?? i.email ?? "—"}</div>
            <div className="text-xs text-white/55">{i.email} · {i.role} · expires {new Date(i.expiresAt).toLocaleDateString()}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={tone[i.status]}>{i.status}</Badge>
            {i.status === "pending" && (
              <>
                <Button size="sm" variant="outline" className="border-white/15" onClick={() => resend.mutate(i.id)}>Resend</Button>
                <Button size="icon" variant="ghost" onClick={() => revoke.mutate(i.id)} aria-label="Revoke invite">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </>
            )}
            {(i.status === "expired") && (
              <Button size="sm" variant="outline" className="border-white/15" onClick={() => resend.mutate(i.id)}>Resend</Button>
            )}
          </div>
        </Card>
      ))}
      {!invitesQ.isLoading && (invitesQ.data ?? []).length === 0 && (
        <p className="py-6 text-center text-sm text-white/50">No invites yet — add staff or members from the Team / Members tabs.</p>
      )}
    </div>
  );
}

// ── Broadcast tab ───────────────────────────────────────────────────────────

function BroadcastTab() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [target, setTarget] = useState("all_members");
  const [sms, setSms] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      api.post<{ recipients: number }>("/api/broadcast", {
        title: title || undefined,
        content,
        targetGroup: target,
        channels: sms ? ["in_app", "sms"] : ["in_app"],
      }),
    onSuccess: (r) => {
      toast({ title: `Broadcast sent to ${r.recipients} people` });
      setTitle(""); setContent("");
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="max-w-xl space-y-3">
      <h3 className="text-lg font-semibold">Broadcast</h3>
      <Input className={inputCls} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea className={inputCls} rows={4} placeholder="Message to send…" value={content} onChange={(e) => setContent(e.target.value)} data-testid="input-broadcast-content" />
      <div className="flex flex-wrap items-center gap-4">
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger className={cn(inputCls, "w-44")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all_members">All members</SelectItem>
            <SelectItem value="all_staff">All staff</SelectItem>
            <SelectItem value="all">Everyone</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <Switch checked={sms} onCheckedChange={setSms} /> Also send SMS
        </label>
      </div>
      <Button disabled={!content.trim() || send.isPending} onClick={() => send.mutate()} data-testid="button-send-broadcast">
        {send.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Megaphone className="mr-1 h-4 w-4" />}
        Send broadcast
      </Button>
    </Card>
  );
}

// ── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const settingsQ = useQuery({ queryKey: ["manage", "settings"], queryFn: () => api.get<ClubSettings>("/api/tenant/settings") });
  const [form, setForm] = useState<Partial<ClubSettings> | null>(null);
  const s = form ?? settingsQ.data ?? null;

  const save = useMutation({
    mutationFn: () =>
      api.patch("/api/tenant/settings", {
        name: s?.name, timezone: s?.timezone, currency: s?.currency,
        primaryColor: s?.primaryColor, accentColor: s?.accentColor,
        phone: s?.phone || null, address: s?.address || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["manage", "settings"] });
      toast({ title: "Club settings saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (!s) return <Loader2 className="h-5 w-5 animate-spin text-accent" />;
  const set = (patch: Partial<ClubSettings>) => setForm({ ...s, ...patch });

  return (
    <Card className="max-w-xl space-y-3">
      <h3 className="text-lg font-semibold">Club settings</h3>
      <div className="text-xs text-white/55">Club URL slug: <span className="text-accent">{s.slug}</span></div>
      <Input className={inputCls} placeholder="Club name" value={s.name ?? ""} onChange={(e) => set({ name: e.target.value })} data-testid="input-club-name" />
      <div className="grid grid-cols-2 gap-3">
        <Input className={inputCls} placeholder="Timezone" value={s.timezone ?? ""} onChange={(e) => set({ timezone: e.target.value })} />
        <Input className={inputCls} placeholder="Currency (USD)" value={s.currency ?? ""} onChange={(e) => set({ currency: e.target.value.toUpperCase() })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 text-xs text-white/60">Primary color</div>
          <Input className={inputCls} type="color" value={s.primaryColor ?? "#1B3A2D"} onChange={(e) => set({ primaryColor: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 text-xs text-white/60">Accent color</div>
          <Input className={inputCls} type="color" value={s.accentColor ?? "#C9A84C"} onChange={(e) => set({ accentColor: e.target.value })} />
        </div>
      </div>
      <Input className={inputCls} placeholder="Phone" value={s.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
      <Input className={inputCls} placeholder="Address" value={s.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
      <Button disabled={save.isPending} onClick={() => save.mutate()} data-testid="button-save-settings">
        {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save settings
      </Button>
    </Card>
  );
}

// ── People tab (bulk member import) ─────────────────────────────────────────

function PeopleTab() {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: { email: string; reason: string }[] } | null>(null);

  const rows = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, email, tier, phone] = l.split(",").map((s) => s?.trim());
      return { name, email, tier: tier || undefined, phone: phone || undefined };
    })
    .filter((r) => r.name && r.email?.includes("@"));

  const importM = useMutation({
    mutationFn: () =>
      api.post<{ imported: number; skipped: { email: string; reason: string }[] }>(
        "/api/members/bulk-import",
        { rows, sendInvites: true },
      ),
    onSuccess: (r) => {
      setResult(r);
      setCsv("");
      toast({ title: `${r.imported} members imported`, description: `${r.skipped.length} skipped. Invites sent.` });
    },
    onError: (e: Error) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold">Bulk member import</h3>
      <p className="text-sm text-white/55">
        One member per line: <span className="text-accent">name, email, tier, phone</span> (tier & phone optional).
        Each member gets a set-password invitation.
      </p>
      <Textarea
        className={cn(inputCls, "font-mono text-xs")}
        rows={8}
        placeholder={"James Smith, james@club.com, Gold, +1 555 0100\nMary Jones, mary@club.com"}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        data-testid="input-bulk-members"
      />
      <div className="flex items-center gap-3">
        <Button disabled={rows.length === 0 || importM.isPending} onClick={() => importM.mutate()} data-testid="button-bulk-import-members">
          {importM.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          Import {rows.length || ""} member{rows.length === 1 ? "" : "s"}
        </Button>
        <span className="text-xs text-white/45">{rows.length} valid row(s) parsed</span>
      </div>
      {result && result.skipped.length > 0 && (
        <div className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
          Skipped: {result.skipped.map((s) => `${s.email} (${s.reason})`).join("; ")}
        </div>
      )}
    </Card>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────

export function ManageClub() {
  const [tab, setTab] = useState<TabKey>("menu");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`manage-tab-${t.key}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              tab === t.key
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === "people" && <PeopleTab />}
      {tab === "menu" && <MenuTab />}
      {tab === "tee" && <TeeTab />}
      {tab === "knowledge" && <KnowledgeTab />}
      {tab === "agents" && <AgentsTab />}
      {tab === "invites" && <InvitesTab />}
      {tab === "broadcast" && <BroadcastTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}
