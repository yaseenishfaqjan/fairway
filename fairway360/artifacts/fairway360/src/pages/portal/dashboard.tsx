// Club Admin Dashboard — the club manager's home screen.
// Mobile-first (fixed bottom nav) and scales up to a desktop sidebar layout.
//
// Everything here is REAL, club-scoped data from the session's tenant:
//   Dashboard → GET /api/analytics/orders (+ /api/overview)
//   Orders    → the shared orders store (live via SSE) + status advance
//   Menu      → GET /api/menu-admin
//   Users     → GET /api/staff
//   Settings  → GET/PATCH /api/tenant/settings
// No sample data — an empty club correctly shows zeros and empty states.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid, ShoppingCart, UtensilsCrossed, Users, Settings as SettingsIcon,
  ShoppingBag, DollarSign, ClipboardList, CheckCircle2, TrendingUp, TrendingDown,
  ChevronRight, Calendar, Loader2, Bell, Settings2, Menu as MenuIcon, X, LogOut,
} from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useOrders } from "@/lib/orders-store";
import { PortalLogo } from "@/components/portal/portal-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const api = { get: <T,>(url: string) => customFetch<T>(url, { credentials: "include" }) };

// ── Types (mirror the API responses) ────────────────────────────────────────

type DayPoint = { day: string; label: string; orders: number; revenue: number };
type OrdersAnalytics = {
  timezone: string;
  orders7d: number;
  revenue7d: number;
  revenuePrev7d: number;
  byStatus: Record<string, number>;
  today: { orders: number; revenue: number; delivered: number; active: number };
  yesterday: { orders: number; revenue: number; delivered: number; active: number };
  series: DayPoint[];
};
type MenuItem = {
  id: string; name: string; description: string | null; price: number;
  category: string; imageUrl: string | null; available: boolean;
};
type TeamMember = {
  id: string; name: string; initials: string; role: string;
  status: string; shift: string; area: string; tasksOpen: number;
};
type ClubSettings = {
  name: string; slug: string; timezone: string; currency: string;
  phone: string | null; address: string | null; plan: string;
};

type SectionKey = "dashboard" | "orders" | "menu" | "users" | "settings";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "orders", label: "Orders", icon: ShoppingCart },
  { key: "menu", label: "Menu", icon: UtensilsCrossed },
  { key: "users", label: "Users", icon: Users },
  { key: "settings", label: "Settings", icon: SettingsIcon },
] as const;

// ── Formatting ──────────────────────────────────────────────────────────────

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
/** Compact axis/point label: 3500 → "$3.5K". */
const moneyShort = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${Math.round(n)}`;
/** Percent change vs a baseline; null when there's no baseline to compare to. */
function delta(now: number, before: number): number | null {
  if (before <= 0) return now > 0 ? 100 : null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

// ── Shared chrome ───────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-[10px] font-semibold uppercase tracking-[1.5px] text-accent", className)}>
      {children}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  Delivered: "bg-[#46c97e]/15 text-[#46c97e]",
  Ready: "bg-[#46c97e]/15 text-[#46c97e]",
  Preparing: "bg-[#e0b341]/15 text-[#e0b341]",
  New: "bg-accent/15 text-accent",
  "On Shift": "bg-[#46c97e]/15 text-[#46c97e]",
  "On Break": "bg-[#e0b341]/15 text-[#e0b341]",
  "Clocked Out": "bg-white/10 text-white/50",
  "Off Today": "bg-white/10 text-white/50",
};

function Pill({ status }: { status: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_TONE[status] ?? "bg-white/10 text-white/60")}>
      {status}
    </span>
  );
}

function Trend({ pct }: { pct: number | null }) {
  if (pct === null) return <div className="mt-1 text-[11px] text-white/35">No prior data</div>;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", up ? "text-[#46c97e]" : "text-[#e5727a]")}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}{pct}% vs yesterday
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-white/40">{children}</div>;
}

// ── Dashboard section ───────────────────────────────────────────────────────

function StatTile({
  icon: Icon, tone, label, value, sub, children, testId,
}: {
  icon: typeof ShoppingBag; tone: "green" | "gold"; label: string; value: string;
  sub: string; children?: React.ReactNode; testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl",
          tone === "green" ? "bg-[#46c97e]/15 text-[#46c97e]" : "bg-accent/15 text-accent")}>
          <Icon className="h-5 w-5" />
        </div>
        <Eyebrow className="text-right text-white/45">{label}</Eyebrow>
      </div>
      <div className="text-2xl font-bold tabular-nums" data-testid={`${testId}-value`}>{value}</div>
      <div className="text-xs text-white/45">{sub}</div>
      {children}
    </Card>
  );
}

/** 7-day revenue line chart. Pure SVG, no chart library. */
function RevenueChart({ series }: { series: DayPoint[] }) {
  const W = 320, H = 150, padL = 26, padR = 10, padT = 18, padB = 20;
  const max = Math.max(1, ...series.map((d) => d.revenue));
  // Round the axis up to a clean ceiling so the line never touches the top.
  const ceil = Math.max(100, Math.ceil((max * 1.15) / 100) * 100);
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const x = (i: number) => padL + (series.length <= 1 ? innerW / 2 : (i * innerW) / (series.length - 1));
  const y = (v: number) => padT + innerH - (v / ceil) * innerH;

  const line = series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.revenue)}`).join(" ");
  const area = `${line} L${x(series.length - 1)},${padT + innerH} L${x(0)},${padT + innerH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * ceil);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[150px] w-full" role="img" aria-label="Revenue over the last 7 days">
      <defs>
        <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#46c97e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#46c97e" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
          <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize="8" fill="#9bae9f">{moneyShort(t)}</text>
        </g>
      ))}
      <path d={area} fill="url(#revfill)" />
      <path d={line} fill="none" stroke="#46c97e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((d, i) => (
        <g key={d.day}>
          <circle cx={x(i)} cy={y(d.revenue)} r="3" fill="#04130c" stroke="#46c97e" strokeWidth="1.5" />
          {d.revenue > 0 && (
            <text x={x(i)} y={y(d.revenue) - 7} textAnchor="middle" fontSize="7.5" fill="#f4efe2">
              {moneyShort(d.revenue)}
            </text>
          )}
          <text x={x(i)} y={H - 5} textAnchor="middle" fontSize="8" fill="#9bae9f">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

/** Clock time ("9:30 AM") for an order, in the club's timezone. */
function clockTime(iso: string | undefined, tz: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(d);
}

function OrderRow({
  order, tz, onClick,
}: {
  order: { id: string; status: string; total: number; hole?: number | null; cartNumber?: string | null; member: string; placedAtIso?: string };
  tz?: string;
  onClick?: () => void;
}) {
  const where = [order.hole ? `Hole ${order.hole}` : null, order.cartNumber].filter(Boolean).join(" · ");
  const time = tz ? clockTime(order.placedAtIso, tz) : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-white/[0.03]"
      data-testid={`order-row-${order.id}`}
    >
      <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[#46c97e]/15 text-[#46c97e]">
        <ShoppingCart className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">Order #{order.id.slice(0, 4).toUpperCase()}</div>
        <div className="truncate text-xs text-white/45">{where || order.member}</div>
      </div>
      {time && <span className="hidden shrink-0 text-xs text-white/45 tabular-nums sm:block">{time}</span>}
      <div className="flex shrink-0 items-center gap-2">
        <Pill status={order.status} />
        <span className="text-sm font-bold tabular-nums">{money(order.total)}</span>
        <ChevronRight className="h-4 w-4 text-white/25" />
      </div>
    </button>
  );
}

function DashboardSection({ onJump }: { onJump: (s: SectionKey, filter?: string) => void }) {
  const { user } = useAuth();
  const { orders } = useOrders();
  const analyticsQ = useQuery({
    queryKey: ["/api/analytics/orders"],
    queryFn: () => api.get<OrdersAnalytics>("/api/analytics/orders"),
  });

  const a = analyticsQ.data;
  const series = a?.series ?? [];
  // Live counts come from the SSE-backed store so the tiles move the moment a
  // staff member advances an order, without waiting for an analytics refetch.
  const active = orders.filter((o) => o.status !== "Delivered").length;
  const deliveredToday = a?.today.delivered ?? 0;
  const tz = a?.timezone ?? "America/New_York";
  const todayLabel = new Date().toLocaleDateString("en-US", {
    timeZone: tz, month: "long", day: "numeric", year: "numeric",
  });
  const rev7d = a?.revenue7d ?? 0;
  const rev7dDelta = delta(rev7d, a?.revenuePrev7d ?? 0);
  const firstName = (user?.name ?? "there").split(" ")[0];

  if (analyticsQ.isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold" data-testid="text-welcome">Welcome back, {firstName}</h1>
          <p className="text-[13px] text-white/45">Here's what's happening at your club today.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5 text-accent" />
          <span className="whitespace-nowrap">{todayLabel}</span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          testId="tile-total-orders" icon={ShoppingBag} tone="green" label="Total Orders"
          value={String(a?.today.orders ?? 0)} sub="Orders Today"
        >
          <Trend pct={delta(a?.today.orders ?? 0, a?.yesterday.orders ?? 0)} />
        </StatTile>
        <StatTile
          testId="tile-total-revenue" icon={DollarSign} tone="green" label="Total Revenue"
          value={money(a?.today.revenue ?? 0)} sub="Revenue Today"
        >
          <Trend pct={delta(a?.today.revenue ?? 0, a?.yesterday.revenue ?? 0)} />
        </StatTile>
        <StatTile
          testId="tile-active-orders" icon={ClipboardList} tone="gold" label="Active Orders"
          value={String(active)} sub="In Progress"
        >
          <button onClick={() => onJump("orders")} className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-accent">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </StatTile>
        <StatTile
          testId="tile-delivered-orders" icon={CheckCircle2} tone="green" label="Delivered Orders"
          value={String(deliveredToday)} sub="Completed Today"
        >
          <button onClick={() => onJump("orders", "Delivered")} className="mt-1 flex items-center gap-0.5 text-[11px] font-medium text-accent">
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </StatTile>
      </div>

      {/* Revenue chart */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Eyebrow>Revenue Over Time</Eyebrow>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60">7 Days</span>
        </div>
        <div className="text-[26px] font-bold tabular-nums" data-testid="text-revenue-7d">{money(rev7d)}</div>
        <div className="text-xs text-white/45">Total Revenue · {a?.orders7d ?? 0} orders</div>
        {rev7dDelta !== null && (
          <div className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium",
            rev7dDelta >= 0 ? "text-[#46c97e]" : "text-[#e5727a]")}>
            {rev7dDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {rev7dDelta >= 0 ? "+" : ""}{rev7dDelta}% vs previous 7 days
          </div>
        )}
        <div className="mt-3">
          {series.some((d) => d.revenue > 0)
            ? <RevenueChart series={series} />
            : <Empty>No revenue yet this week. Orders will chart here automatically.</Empty>}
        </div>
      </Card>

      {/* Recent orders */}
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <Eyebrow>Recent Orders</Eyebrow>
          <button onClick={() => onJump("orders")} className="text-xs font-medium text-[#46c97e]">View all</button>
        </div>
        {orders.length === 0
          ? <Empty>No orders yet.</Empty>
          : <div>{orders.slice(0, 4).map((o) => <OrderRow key={o.id} order={o} tz={tz} onClick={() => onJump("orders")} />)}</div>}
      </Card>
    </div>
  );
}

// ── Orders section ──────────────────────────────────────────────────────────

const FILTERS = ["All", "New", "Preparing", "Ready", "Delivered"] as const;
const NEXT_LABEL: Record<string, string> = { New: "Start", Preparing: "Mark Ready", Ready: "Deliver" };

function OrdersSection({ initialFilter }: { initialFilter?: string }) {
  const { orders, advanceOrder } = useOrders();
  const [filter, setFilter] = useState<string>(initialFilter ?? "All");
  const shown = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`filter-${f.toLowerCase()}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              filter === f
                ? "border-accent bg-accent/15 text-accent"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <Card>
        {shown.length === 0 ? (
          <Empty>No orders in this state.</Empty>
        ) : (
          <div className="space-y-1">
            {shown.map((o) => (
              <div key={o.id} className="border-b border-white/5 pb-2 last:border-0">
                <OrderRow order={o} />
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="min-w-0 flex-1 truncate text-xs text-white/45">
                    {o.member} · {o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                  </div>
                  {NEXT_LABEL[o.status] && (
                    <Button
                      size="sm"
                      onClick={() => advanceOrder(o.id)}
                      data-testid={`button-advance-${o.id}`}
                      className="h-7 shrink-0 rounded-full bg-[#46c97e]/15 px-3 text-xs font-semibold text-[#46c97e] hover:bg-[#46c97e]/25"
                    >
                      {NEXT_LABEL[o.status]}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Menu section ────────────────────────────────────────────────────────────

function MenuSection() {
  const menuQ = useQuery({ queryKey: ["/api/menu-admin"], queryFn: () => api.get<MenuItem[]>("/api/menu-admin") });
  const items = menuQ.data ?? [];
  // Categories are free text (each club defines its own), so group by whatever
  // this club actually uses rather than a fixed list.
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Menu</h1>
        <Link href="/portal/supervisor?section=manage">
          <Button size="sm" variant="outline" className="h-8 border-white/15 text-xs" data-testid="link-manage-menu">
            Edit menu
          </Button>
        </Link>
      </div>
      {menuQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
      {!menuQ.isLoading && items.length === 0 && (
        <Card><Empty>No menu items yet. Add them under Manage Club → Menu.</Empty></Card>
      )}
      {Object.entries(grouped).map(([cat, list]) => (
        <Card key={cat}>
          <Eyebrow className="mb-2">{cat}</Eyebrow>
          <div className="space-y-2">
            {list.map((m) => (
              <div key={m.id} className="flex items-center gap-3" data-testid={`menu-row-${m.id}`}>
                {m.imageUrl ? (
                  <img src={m.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/30">
                    <UtensilsCrossed className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.name}</div>
                  {!m.available && <div className="text-[11px] text-[#e5727a]">Unavailable</div>}
                </div>
                <div className="shrink-0 text-sm font-bold text-accent tabular-nums">{money(m.price)}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Users section ───────────────────────────────────────────────────────────

function UsersSection() {
  const staffQ = useQuery({ queryKey: ["/api/staff"], queryFn: () => api.get<TeamMember[]>("/api/staff") });
  const staff = staffQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <Link href="/portal/supervisor?section=manage">
          <Button size="sm" variant="outline" className="h-8 border-white/15 text-xs" data-testid="link-manage-staff">
            Invite staff
          </Button>
        </Link>
      </div>
      <Card>
        <Eyebrow className="mb-2">Staff ({staff.length})</Eyebrow>
        {staffQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        {!staffQ.isLoading && staff.length === 0 && <Empty>No staff yet — invite your team to get started.</Empty>}
        <div className="space-y-2">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center gap-3" data-testid={`staff-row-${s.id}`}>
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#2a6f4d]/30 text-xs font-bold text-[#8fd6ab]">
                {s.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{s.name}</div>
                <div className="truncate text-xs text-white/45">
                  {s.role}{s.area && s.area !== "—" ? ` · ${s.area}` : ""}
                </div>
              </div>
              <Pill status={s.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Settings section ────────────────────────────────────────────────────────

function SettingsSection() {
  const settingsQ = useQuery({
    queryKey: ["/api/tenant/settings"],
    queryFn: () => api.get<ClubSettings>("/api/tenant/settings"),
  });
  const s = settingsQ.data;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <Card>
        <Eyebrow className="mb-3">Club</Eyebrow>
        {settingsQ.isLoading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        {s && (
          <dl className="space-y-2.5 text-sm">
            {([
              ["Club name", s.name],
              ["Club URL", s.slug],
              ["Timezone", s.timezone],
              ["Currency", s.currency],
              ["Plan", s.plan],
              ["Phone", s.phone || "—"],
              ["Address", s.address || "—"],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-2 last:border-0">
                <dt className="shrink-0 text-white/45">{k}</dt>
                <dd className="truncate text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <Link href="/portal/supervisor?section=manage">
          <Button className="mt-4 w-full" data-testid="link-manage-club">
            <Settings2 className="mr-2 h-4 w-4" /> Manage club
          </Button>
        </Link>
      </Card>
      <Card>
        <Eyebrow className="mb-2">About</Eyebrow>
        <p className="text-[13px] leading-relaxed text-white/50">
          Fairway360 — AI Club Operation System. Menu, tee sheet, staff, AI agents and
          broadcasts are all managed under Manage club. Everything on this dashboard is
          live data for {s?.name ?? "your club"} only.
        </p>
      </Card>
    </div>
  );
}

// ── Page shell ──────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const [section, setSection] = useState<SectionKey>("dashboard");
  const [orderFilter, setOrderFilter] = useState<string | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeCount = orders.filter((o) => o.status !== "Delivered").length;

  const jump = (s: SectionKey, filter?: string) => {
    setOrderFilter(filter);
    setSection(s);
    setMenuOpen(false);
  };

  const initials = useMemo(
    () => (user?.name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    [user?.name],
  );

  const body = {
    dashboard: <DashboardSection onJump={jump} />,
    // Remount on filter change so the section picks up the incoming filter.
    orders: <OrdersSection key={orderFilter ?? "all"} initialFilter={orderFilter} />,
    menu: <MenuSection />,
    users: <UsersSection />,
    settings: <SettingsSection />,
  }[section];

  return (
    <div className="relative min-h-dvh bg-[#04130c] text-[#f4efe2]">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#04130c] via-[#061a10] to-[#04130c]">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2a6f4d] opacity-[0.18] blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#d7ad42] opacity-[0.08] blur-3xl" />
      </div>

      {/* Mobile slide-in menu (the hamburger target) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/60" />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[80vw] flex-col border-r border-white/10 bg-[#071a10] p-4">
            <div className="mb-6 flex items-center justify-between">
              <PortalLogo size="sm" />
              <button onClick={() => setMenuOpen(false)} className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => jump(key)}
                  data-testid={`nav-drawer-${key}`}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    section === key ? "bg-accent/15 text-accent" : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {key === "orders" && activeCount > 0 && (
                    <span className="ml-auto rounded-full bg-accent px-1.5 text-[10px] font-bold text-[#04130c]">{activeCount}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
              <Link href="/portal/supervisor">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white">
                  <Settings2 className="h-4 w-4" /> Full supervisor portal
                </button>
              </Link>
              <button onClick={() => logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/5 hover:text-white" data-testid="button-logout-drawer">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative flex">
        {/* Desktop sidebar (mobile uses the bottom nav below) */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/10 bg-[rgba(4,15,9,0.6)] p-4 lg:flex">
          <div className="mb-6 px-2"><PortalLogo size="sm" /></div>
          <nav className="space-y-1">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => jump(key)}
                data-testid={`nav-desktop-${key}`}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  section === key ? "bg-accent/15 text-accent" : "text-white/50 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {key === "orders" && activeCount > 0 && (
                  <span className="ml-auto rounded-full bg-accent px-1.5 text-[10px] font-bold text-[#04130c]">{activeCount}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-2">
            <Link href="/portal/supervisor">
              <button className="w-full rounded-xl px-3 py-2 text-left text-xs text-white/40 hover:text-white">
                Full supervisor portal →
              </button>
            </Link>
            <button onClick={() => logout()} className="w-full rounded-xl px-3 py-2 text-left text-xs text-white/40 hover:text-white" data-testid="button-logout-desktop">
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Header — mobile: hamburger · centered logo · bell · avatar. */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[rgba(4,15,9,0.9)] px-4 py-3 backdrop-blur-xl">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open menu"
              data-testid="button-menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="flex flex-1 justify-center lg:hidden"><PortalLogo size="sm" /></div>
            <div className="hidden min-w-0 flex-1 lg:block">
              <div className="truncate text-sm font-semibold">{user?.clubName ?? "Your club"}</div>
            </div>
            <Link href="/portal/supervisor?section=escalations">
              <button className="relative rounded-full p-2 text-white/60 hover:text-white" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {activeCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-[#04130c]">
                    {activeCount}
                  </span>
                )}
              </button>
            </Link>
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/50 bg-accent/20 text-xs font-bold text-accent" data-testid="text-avatar">
                {initials}
              </div>
              <span className="text-[9px] capitalize text-white/40">{user?.role === "supervisor" ? "Admin" : user?.role}</span>
            </div>
          </header>

          <main className="px-4 pb-28 pt-4 lg:pb-8">
            <div className="mx-auto max-w-3xl lg:max-w-5xl">{body}</div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[rgba(4,15,9,0.92)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => jump(key)}
              data-testid={`nav-${key}`}
              aria-current={section === key ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              <span className={cn("relative rounded-full px-3 py-1", section === key && "bg-accent/15")}>
                <Icon className={cn("h-5 w-5", section === key ? "text-accent" : "text-white/40")} />
                {key === "orders" && activeCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-[#04130c]">
                    {activeCount}
                  </span>
                )}
              </span>
              <span className={cn("text-[10px] font-medium", section === key ? "text-accent" : "text-white/40")}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default AdminDashboard;
