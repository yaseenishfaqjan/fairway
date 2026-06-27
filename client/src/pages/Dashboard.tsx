import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  CalendarCheck,
  Users,
  Wrench,
  DollarSign,
  AlertTriangle,
  Info,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody, Skeleton, SkeletonCard, EmptyState, Avatar } from '@/components/ui';
import { formatCurrency, formatNumber, formatDate, formatDateTime, initials } from '@/lib/utils';
import { humanize } from '@/lib/constants';
import type {
  DashboardStats,
  RevenueResponse,
  OccupancyCell,
  TopMember,
  PosTransaction,
  InsightsResponse,
  Insight,
} from '@/lib/types';

const CATEGORY_COLORS = ['#22c55e', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'];

function StatCard({
  label,
  value,
  icon,
  trend,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: { pct: number };
  loading?: boolean;
}) {
  if (loading) return <SkeletonCard />;
  return (
    <Card>
      <CardBody className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-night-400">{label}</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p
              className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                trend.pct >= 0 ? 'text-fairway-400' : 'text-red-400'
              }`}
            >
              {trend.pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend.pct)}% vs yesterday
            </p>
          )}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fairway-500/10 text-fairway-400">
          {icon}
        </span>
      </CardBody>
    </Card>
  );
}

const INSIGHT_STYLES: Record<Insight['severity'], { icon: React.ReactNode; ring: string; text: string }> = {
  info: { icon: <Info className="h-4 w-4" />, ring: 'border-sky-500/30 bg-sky-500/5', text: 'text-sky-400' },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    ring: 'border-amber-500/30 bg-amber-500/5',
    text: 'text-amber-400',
  },
  critical: {
    icon: <AlertOctagon className="h-4 w-4" />,
    ring: 'border-red-500/30 bg-red-500/5',
    text: 'text-red-400',
  },
};

function InsightsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: async () => (await api.get<InsightsResponse>('/dashboard/insights')).data,
  });

  return (
    <Card>
      <CardHeader
        title="AI Insights"
        subtitle="Rule-based recommendations for your club"
      />
      <CardBody className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : !data || data.insights.length === 0 ? (
          <p className="py-6 text-center text-sm text-night-400">
            No alerts right now. Everything looks healthy.
          </p>
        ) : (
          data.insights.map((ins, i) => {
            const s = INSIGHT_STYLES[ins.severity];
            const body = (
              <div className={`flex gap-3 rounded-xl border p-3 ${s.ring}`}>
                <span className={`mt-0.5 shrink-0 ${s.text}`}>{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-night-100">{ins.title}</p>
                  <p className="text-xs text-night-400">{ins.message}</p>
                </div>
                {ins.actionUrl && <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-night-500" />}
              </div>
            );
            return ins.actionUrl ? (
              <Link key={i} to={ins.actionUrl} className="block transition hover:opacity-80">
                {body}
              </Link>
            ) : (
              <div key={i}>{body}</div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}

function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'revenue'],
    queryFn: async () => (await api.get<RevenueResponse>('/dashboard/revenue')).data,
  });

  const byDay = data?.byDay ?? [];
  const byCategory = (data?.byCategory ?? []).filter((c) => c.total > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Revenue" subtitle="Last 30 days" />
        <CardBody>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : byDay.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No revenue yet"
              message="Completed transactions will appear here."
            />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <AreaChart data={byDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d) => formatDate(d, 'MMM d')}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#1e293b"
                />
                <YAxis
                  tickFormatter={(v) => `$${formatNumber(v)}`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  stroke="#1e293b"
                  width={64}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    color: '#e2e8f0',
                  }}
                  labelFormatter={(d) => formatDate(d as string)}
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="By Category" subtitle="Revenue mix" />
        <CardBody>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : byCategory.length === 0 ? (
            <EmptyState title="No data" message="No category revenue in range." />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-xs text-night-300">{humanize(value as string)}</span>}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 12,
                    color: '#e2e8f0',
                  }}
                  formatter={(v: number, n) => [formatCurrency(v), humanize(n as string)]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function heatColor(pct: number): string {
  if (pct === 0) return 'bg-night-800';
  if (pct < 25) return 'bg-fairway-500/20';
  if (pct < 50) return 'bg-fairway-500/40';
  if (pct < 75) return 'bg-fairway-500/60';
  return 'bg-fairway-500/90';
}

function OccupancyHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'occupancy'],
    queryFn: async () => (await api.get<OccupancyCell[]>('/dashboard/occupancy')).data,
  });

  const cells = data ?? [];
  const dates = Array.from(new Set(cells.map((c) => c.date))).sort();
  const hours = Array.from(new Set(cells.map((c) => c.hour))).sort((a, b) => a - b);
  const lookup = new Map(cells.map((c) => [`${c.date}|${c.hour}`, c]));

  return (
    <Card>
      <CardHeader title="Tee Sheet Occupancy" subtitle="Next 7 days by hour" />
      <CardBody>
        {isLoading ? (
          <Skeleton className="h-48" />
        ) : cells.length === 0 ? (
          <EmptyState title="No tee times" message="Generate a tee sheet to see occupancy." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-16" />
                  {hours.map((h) => (
                    <th key={h} className="text-center text-[10px] font-medium text-night-500">
                      {h}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map((d) => (
                  <tr key={d}>
                    <td className="whitespace-nowrap pr-2 text-right text-[11px] text-night-400">
                      {formatDate(d, 'EEE d')}
                    </td>
                    {hours.map((h) => {
                      const cell = lookup.get(`${d}|${h}`);
                      const pct = cell?.pct ?? 0;
                      return (
                        <td key={h}>
                          <div
                            className={`h-7 rounded ${heatColor(pct)}`}
                            title={cell ? `${formatDate(d, 'EEE MMM d')} ${h}:00 — ${pct}% (${cell.booked}/${cell.total})` : 'No tee times'}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-night-500">
              <span>Less</span>
              {['bg-night-800', 'bg-fairway-500/20', 'bg-fairway-500/40', 'bg-fairway-500/60', 'bg-fairway-500/90'].map(
                (c) => (
                  <span key={c} className={`h-3 w-3 rounded ${c}`} />
                ),
              )}
              <span>More</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function TopMembers() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'top-members'],
    queryFn: async () => (await api.get<TopMember[]>('/dashboard/top-members')).data,
  });

  const members = data ?? [];

  return (
    <Card>
      <CardHeader title="Top Members" subtitle="By rounds booked" />
      <CardBody className="space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </>
        ) : members.length === 0 ? (
          <p className="py-6 text-center text-sm text-night-400">No members yet.</p>
        ) : (
          members.map((m) => (
            <Link
              key={m.id}
              to={`/members/${m.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-night-800"
            >
              <Avatar first={m.firstName} last={m.lastName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-night-100">
                  {m.firstName} {m.lastName}
                </p>
                <p className="text-xs text-night-500">{m.memberNumber ?? '—'}</p>
              </div>
              <span className="text-sm font-semibold text-fairway-400">{formatNumber(m.rounds)}</span>
            </Link>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function RecentTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'recent-transactions'],
    queryFn: async () => (await api.get<PosTransaction[]>('/dashboard/recent-transactions')).data,
  });

  const txns = data ?? [];

  return (
    <Card>
      <CardHeader title="Recent Transactions" subtitle="Latest activity" />
      <CardBody className="space-y-1">
        {isLoading ? (
          <>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </>
        ) : txns.length === 0 ? (
          <p className="py-6 text-center text-sm text-night-400">No transactions yet.</p>
        ) : (
          txns.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-night-800 text-night-300">
                {initials(humanize(t.category ?? '').charAt(0))}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-night-100">{humanize(t.category)}</p>
                <p className="text-xs text-night-500">{formatDateTime(t.createdAt)}</p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  t.status === 'voided' ? 'text-night-500 line-through' : 'text-night-100'
                }`}
              >
                {formatCurrency(t.total)}
              </span>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await api.get<DashboardStats>('/dashboard/stats')).data,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          loading={isLoading}
          label="Revenue Today"
          value={formatCurrency(stats?.revenueToday)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={stats ? { pct: stats.revenueChangePct } : undefined}
        />
        <StatCard
          loading={isLoading}
          label="Occupancy Today"
          value={`${stats?.occupancy.pct ?? 0}%`}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          loading={isLoading}
          label="Bookings Today"
          value={formatNumber(stats?.bookingsToday)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          loading={isLoading}
          label="Open Maintenance"
          value={formatNumber(stats?.openMaintenance)}
          icon={<Wrench className="h-5 w-5" />}
        />
      </div>

      <RevenueChart />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <OccupancyHeatmap />
          <RecentTransactions />
        </div>
        <div className="space-y-4">
          <InsightsPanel />
          <TopMembers />
        </div>
      </div>
    </div>
  );
}
