import { useState } from "react";
import {
  Plus, Minus, MapPin, Clock, UtensilsCrossed, CupSoda, Cookie,
  Check, ChefHat, Truck, StickyNote, LayoutGrid, ArrowRight, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGetMenu, type Order, type OrderStatus } from "@workspace/api-client-react";
import { useOrders } from "@/lib/orders-store";
import {
  menuItems,
  type MenuItem, type OrderLine, type MemberOnCourse,
} from "@/lib/portal-data";

const CATEGORIES: { key: MenuItem["category"]; label: string; icon: LucideIcon }[] = [
  { key: "Drinks", label: "Drinks", icon: CupSoda },
  { key: "Food", label: "Food", icon: UtensilsCrossed },
  { key: "Snacks", label: "Snacks", icon: Cookie },
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
  New: "Preparing", Preparing: "Ready", Ready: "Delivered", Delivered: "Delivered",
};

const STATUS_META: Record<OrderStatus, {
  label: string; accentBar: string; chip: string; btn: string; action: string; Icon: LucideIcon;
}> = {
  New: { label: "Incoming", accentBar: "bg-blue-400", chip: "bg-blue-500/15 text-blue-300", btn: "bg-accent text-accent-foreground hover:bg-accent/90", action: "Start Preparing", Icon: ChefHat },
  Preparing: { label: "Preparing", accentBar: "bg-accent", chip: "bg-accent/15 text-accent", btn: "bg-accent text-accent-foreground hover:bg-accent/90", action: "Mark Ready", Icon: Check },
  Ready: { label: "Ready", accentBar: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300", btn: "bg-emerald-500 text-white hover:bg-emerald-600", action: "Mark Delivered", Icon: Truck },
  Delivered: { label: "Delivered", accentBar: "bg-white/20", chip: "bg-white/10 text-white/60", btn: "", action: "", Icon: Check },
};

type Role = "all" | "kitchen" | "cart";

const ROLES: { key: Role; label: string; Icon: LucideIcon }[] = [
  { key: "all", label: "All Orders", Icon: LayoutGrid },
  { key: "kitchen", label: "Kitchen", Icon: ChefHat },
  { key: "cart", label: "Cart Service", Icon: Truck },
];

const ROLE_CAPTION: Record<Role, string> = {
  all: "Every order is routed to the kitchen and the cart service at the same time.",
  kitchen: "Upstairs kitchen — prepare each ticket, then mark it ready to hand off to cart service.",
  cart: "Cart service — deliver ready orders to the member's hole, no need to ride around asking.",
};

interface ColumnDef {
  key: string;
  title: string;
  statuses: OrderStatus[];
  dot: string;
  chip: string;
  action: boolean;
}

const BOARDS: Record<Role, ColumnDef[]> = {
  all: [
    { key: "new", title: "Incoming", statuses: ["New"], dot: "bg-blue-400", chip: "bg-blue-500/15 text-blue-300", action: true },
    { key: "prep", title: "Preparing", statuses: ["Preparing"], dot: "bg-accent", chip: "bg-accent/15 text-accent", action: true },
    { key: "ready", title: "Ready to Deliver", statuses: ["Ready"], dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300", action: true },
  ],
  kitchen: [
    { key: "new", title: "New Orders", statuses: ["New"], dot: "bg-blue-400", chip: "bg-blue-500/15 text-blue-300", action: true },
    { key: "prep", title: "In the Kitchen", statuses: ["Preparing"], dot: "bg-accent", chip: "bg-accent/15 text-accent", action: true },
  ],
  cart: [
    { key: "coming", title: "Coming Up", statuses: ["New", "Preparing"], dot: "bg-white/30", chip: "bg-white/10 text-white/60", action: false },
    { key: "ready", title: "Ready to Deliver", statuses: ["Ready"], dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300", action: true },
  ],
};

interface ServiceBoardProps {
  members: MemberOnCourse[];
}

export function ServiceBoard({ members }: ServiceBoardProps) {
  const { toast } = useToast();
  const { orders, placeOrder: submitOrder, advanceOrder } = useOrders();
  const menuQ = useGetMenu();
  const realIdByName = new Map((menuQ.data ?? []).map((m) => [m.name, m.id]));
  const [role, setRole] = useState<Role>("all");
  const [open, setOpen] = useState(false);

  const [groupId, setGroupId] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [cat, setCat] = useState<MenuItem["category"]>("Drinks");

  const lines: OrderLine[] = menuItems
    .filter((i) => cart[i.id])
    .map((i) => ({ itemId: i.id, name: i.name, price: i.price, qty: cart[i.id] }));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length;

  const counts = {
    New: orders.filter((o) => o.status === "New").length,
    Preparing: orders.filter((o) => o.status === "Preparing").length,
    Ready: orders.filter((o) => o.status === "Ready").length,
  };

  function addItem(id: string) {
    setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  }
  function decItem(id: string) {
    setCart((p) => {
      const n = (p[id] ?? 0) - 1;
      const next = { ...p };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }
  function resetForm() {
    setGroupId("");
    setCart({});
    setNote("");
    setCat("Drinks");
  }

  function placeOrder() {
    const m = members.find((x) => x.id === groupId);
    if (!m || lines.length === 0) return;
    const orderLines = lines
      .map((l) => ({ itemId: realIdByName.get(l.name), qty: l.qty }))
      .filter((l): l is { itemId: string; qty: number } => Boolean(l.itemId));
    if (orderLines.length === 0) return;
    submitOrder({ groupId: m.id, hole: m.hole, lines: orderLines, note: note.trim() });
    toast({ title: "Routed to kitchen & cart service", description: `${lines.reduce((s, l) => s + l.qty, 0)} items for ${m.name} — Hole ${m.hole}.` });
    setOpen(false);
    resetForm();
  }

  function advance(o: Order) {
    const next = NEXT_STATUS[o.status];
    advanceOrder(o.id);
    if (next === "Delivered") {
      toast({ title: "Delivered", description: `${o.member} on Hole ${o.hole} — order complete.` });
    } else if (next === "Ready") {
      toast({ title: "Ready — handed to cart service", description: `Deliver to ${o.member} — Hole ${o.hole}, ${o.cartNumber}.` });
    }
  }

  const columns = BOARDS[role];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatChip color="bg-blue-400" label="Incoming" value={counts.New} />
          <StatChip color="bg-accent" label="Preparing" value={counts.Preparing} />
          <StatChip color="bg-emerald-400" label="Ready" value={counts.Ready} />
          <span className="ml-1 text-xs text-white/45">{deliveredCount} delivered today</span>
        </div>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-new-order"><Plus className="mr-2 h-4 w-4" />New Order</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">New Food &amp; Beverage Order</DialogTitle>
              <DialogDescription>Take an order for a group — it goes to the kitchen and the cart service at the same time.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div>
                <label htmlFor="order-group" className="mb-1.5 block text-sm font-medium text-foreground">Group on the course</label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger id="order-group" data-testid="select-group"><SelectValue placeholder="Select a group…" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name} · Hole {m.hole} · {m.cartNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c.key} onClick={() => setCat(c.key)} aria-pressed={cat === c.key} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", cat === c.key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40")} data-testid={`cat-${c.key}`}>
                      <c.icon className="h-4 w-4" />{c.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {menuItems.filter((i) => i.category === cat).map((i) => (
                    <button key={i.id} onClick={() => addItem(i.id)} className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary/40" data-testid={`menu-${i.id}`}>
                      <div className="relative">
                        <img src={i.image} alt="" className="h-20 w-full object-cover" />
                        {cart[i.id] ? (
                          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow">{cart[i.id]}</span>
                        ) : (
                          <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-card/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100"><Plus className="h-4 w-4" /></span>
                        )}
                      </div>
                      <div className="flex flex-col px-2.5 py-2">
                        <span className="text-sm font-medium leading-tight text-foreground">{i.name}</span>
                        <span className="text-xs text-muted-foreground">${i.price.toFixed(2)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="mb-2 text-sm font-medium text-foreground">Order ticket</div>
                {lines.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">No items yet — tap the menu above.</p>
                ) : (
                  <div className="space-y-1.5">
                    {lines.map((l) => (
                      <div key={l.itemId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex-1 text-foreground">{l.name}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => decItem(l.itemId)} className="flex h-6 w-6 items-center justify-center rounded border border-border bg-card hover:bg-secondary" aria-label={`Remove one ${l.name}`}><Minus className="h-3 w-3" /></button>
                          <span className="w-5 text-center font-medium">{l.qty}</span>
                          <button onClick={() => addItem(l.itemId)} className="flex h-6 w-6 items-center justify-center rounded border border-border bg-card hover:bg-secondary" aria-label={`Add one ${l.name}`}><Plus className="h-3 w-3" /></button>
                          <span className="w-14 text-right text-muted-foreground">${(l.price * l.qty).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="order-note" className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</label>
                <Textarea id="order-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergies, extra ice, no onions…" rows={2} data-testid="input-note" />
              </div>
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-3 sm:justify-between">
              <div className="text-lg font-semibold text-foreground">Total <span className="ml-1 font-display">${total.toFixed(2)}</span></div>
              <Button onClick={placeOrder} disabled={!groupId || lines.length === 0} className="bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-place-order">
                Send Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1" role="radiogroup" aria-label="Worker view">
          {ROLES.map((r) => (
            <button key={r.key} role="radio" aria-checked={role === r.key} onClick={() => setRole(r.key)} className={cn("flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", role === r.key ? "bg-accent text-accent-foreground" : "text-white/60 hover:text-white")} data-testid={`role-${r.key}`}>
              <r.Icon className="h-4 w-4" />{r.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50">{ROLE_CAPTION[role]}</p>
      </div>

      <div className={cn("grid gap-4", columns.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
        {columns.map((col) => {
          const colOrders = orders.filter((o) => col.statuses.includes(o.status));
          return (
            <div key={col.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                  <h3 className="font-display text-sm font-semibold text-white">{col.title}</h3>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", col.chip)}>{colOrders.length}</span>
              </div>
              <div className="space-y-3">
                {colOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/15 py-8 text-center text-xs text-white/40">No orders</div>
                )}
                {colOrders.map((o) => (
                  <OrderCard key={o.id} order={o} showAction={col.action} onAdvance={() => advance(o)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order: o, showAction, onAdvance }: { order: Order; showAction: boolean; onAdvance: () => void }) {
  const meta = STATUS_META[o.status];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]" data-testid={`order-${o.id}`}>
      <div className={cn("h-1 w-full", meta.accentBar)} />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-white">{o.member}</div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-white/55">
              <MapPin className="h-3.5 w-3.5" />Hole {o.hole} · {o.cartNumber}
            </div>
          </div>
          <span className="flex items-center gap-1 whitespace-nowrap text-xs text-white/45"><Clock className="h-3 w-3" />{o.placedAt}</span>
        </div>
        <div className="mb-3 space-y-0.5">
          {o.lines.map((l) => (
            <div key={l.itemId} className="flex justify-between text-sm">
              <span className="text-white/85"><span className="font-medium text-accent">{l.qty}×</span> {l.name}</span>
              <span className="text-white/50">${(l.price * l.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        {o.note && (
          <div className="mb-3 flex items-start gap-1.5 rounded-md bg-accent/10 p-2 text-xs text-accent/90">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{o.note}</span>
          </div>
        )}
        <div className="mb-3 flex justify-between border-t border-white/10 pt-2 text-sm">
          <span className="text-white/55">Total</span>
          <span className="font-semibold text-white">${o.lines.reduce((s, l) => s + l.price * l.qty, 0).toFixed(2)}</span>
        </div>
        {showAction ? (
          <Button className={cn("w-full", meta.btn)} onClick={onAdvance} data-testid={`advance-${o.id}`}>
            <meta.Icon className="mr-2 h-4 w-4" />{meta.action}
          </Button>
        ) : (
          <div className={cn("flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium", meta.chip)} aria-label={o.status === "New" ? "Order sent to kitchen, awaiting preparation" : "Kitchen is preparing this order"}>
            {o.status === "New" ? <Clock className="h-3.5 w-3.5" /> : <ChefHat className="h-3.5 w-3.5" />}
            {o.status === "New" ? "Sent to kitchen" : "Kitchen is preparing"}
            <ArrowRight className="h-3.5 w-3.5 opacity-60" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span className="font-semibold text-white">{value}</span>
      <span className="text-white/55">{label}</span>
    </span>
  );
}
