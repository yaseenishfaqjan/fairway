import { useState } from "react";
import {
  CupSoda, UtensilsCrossed, Cookie, Plus, Minus, ShoppingBag, MapPin, Send,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGetMenu } from "@workspace/api-client-react";
import { useOrders } from "@/lib/orders-store";
import { menuItems, membersOnCourse, type MenuItem, type OrderLine } from "@/lib/portal-data";

const CATEGORIES: { key: MenuItem["category"]; label: string; icon: LucideIcon }[] = [
  { key: "Food", label: "Food", icon: UtensilsCrossed },
  { key: "Drinks", label: "Drinks", icon: CupSoda },
  { key: "Snacks", label: "Snacks", icon: Cookie },
];

const ME = membersOnCourse.find((m) => m.id === "g1")!;

export function MemberOrder() {
  const { toast } = useToast();
  const { placeOrder } = useOrders();
  const menuQ = useGetMenu();
  const realIdByName = new Map((menuQ.data ?? []).map((m) => [m.name, m.id]));
  const [cat, setCat] = useState<MenuItem["category"]>("Food");
  const [cart, setCart] = useState<Record<string, number>>({});

  const lines: OrderLine[] = menuItems
    .filter((i) => cart[i.id])
    .map((i) => ({ itemId: i.id, name: i.name, price: i.price, qty: cart[i.id] }));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  function add(id: string) {
    setCart((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  }
  function dec(id: string) {
    setCart((p) => {
      const n = (p[id] ?? 0) - 1;
      const next = { ...p };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  function send() {
    if (lines.length === 0) return;
    const orderLines = lines
      .map((l) => ({ itemId: realIdByName.get(l.name), qty: l.qty }))
      .filter((l): l is { itemId: string; qty: number } => Boolean(l.itemId));
    if (orderLines.length === 0) return;
    placeOrder({ lines: orderLines, note: "" });
    toast({
      title: "Order on its way!",
      description: `${count} item${count > 1 ? "s" : ""} sent to the clubhouse — our kitchen and cart team will bring it to Hole ${ME.hole}.`,
    });
    setCart({});
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.7)]">
      <div className="relative flex flex-col gap-3 overflow-hidden border-b border-white/10 bg-[linear-gradient(120deg,hsl(150_55%_12%),hsl(155_60%_8%))] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <p className="eyebrow mb-1 text-accent">On-Course Service</p>
          <h2 className="font-display text-xl font-semibold text-white">Order Food &amp; Drink to the Course</h2>
        </div>
        <div className="relative flex items-center gap-2 rounded-full border border-accent/30 bg-accent/15 px-3 py-1.5 text-sm font-medium text-white">
          <MapPin className="h-4 w-4 text-accent" />
          Delivering to Hole {ME.hole} · {ME.cartNumber}
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCat(c.key)}
                  aria-pressed={cat === c.key}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    cat === c.key
                      ? "border-transparent bg-accent text-accent-foreground"
                      : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                  data-testid={`member-cat-${c.key}`}
                >
                  <c.icon className="h-4 w-4" />{c.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {menuItems.filter((i) => i.category === cat).map((i) => {
                const qty = cart[i.id] ?? 0;
                return (
                  <div key={i.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]" data-testid={`member-menu-${i.id}`}>
                    <div className="relative">
                      <img src={i.image} alt={i.name} className="h-28 w-full object-cover" />
                      {qty > 0 && (
                        <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground shadow">{qty}</span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-sm font-medium leading-tight text-white">{i.name}</span>
                        <span className="whitespace-nowrap text-sm font-semibold text-accent">${i.price.toFixed(2)}</span>
                      </div>
                      <div className="mt-2.5">
                        {qty > 0 ? (
                          <div className="flex items-center justify-between rounded-lg border border-white/15">
                            <button onClick={() => dec(i.id)} className="flex h-8 w-9 items-center justify-center text-white hover:bg-white/10" aria-label={`Remove one ${i.name}`} data-testid={`member-dec-${i.id}`}><Minus className="h-4 w-4" /></button>
                            <span className="text-sm font-semibold text-white">{qty}</span>
                            <button onClick={() => add(i.id)} className="flex h-8 w-9 items-center justify-center text-white hover:bg-white/10" aria-label={`Add one ${i.name}`} data-testid={`member-inc-${i.id}`}><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" className="w-full border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent" onClick={() => add(i.id)} data-testid={`member-add-${i.id}`}>
                            <Plus className="mr-1.5 h-4 w-4" />Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 lg:sticky lg:top-20">
              <div className="mb-3 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-accent" />
                <h3 className="font-display text-base font-semibold text-white">Your Order</h3>
              </div>

              {lines.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/50">Your cart is empty — add something from the menu.</p>
              ) : (
                <div className="space-y-2">
                  {lines.map((l) => (
                    <div key={l.itemId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1 text-white/90"><span className="font-semibold text-accent">{l.qty}×</span> {l.name}</span>
                      <span className="text-white/60">${(l.price * l.qty).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-sm text-white/60">Total</span>
                    <span className="font-display text-lg font-semibold text-white">${total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button
                className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={lines.length === 0}
                onClick={send}
                data-testid="button-member-order"
              >
                <Send className="mr-2 h-4 w-4" />Send Order
              </Button>
              <p className="mt-2 text-center text-xs text-white/45">Goes straight to the kitchen &amp; cart service.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
