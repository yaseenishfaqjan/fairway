import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, DollarSign, TrendingUp, Receipt, Users } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody, Input, Button, Skeleton, EmptyState, Table, THead, TBody, TR, TH, TD } from '@/components/ui';
import { useUiStore } from '@/stores/ui';
import { humanize } from '@/lib/constants';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import type { RevenueResponse, MemberBreakdown } from '@/lib/types';

const CATEGORY_COLORS = ['#22c55e', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'];

export function Reports() {
  const toast = useUiStore((s) => s.toast);
  const [from, setFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ['reports', 'revenue', { from, to }],
    queryFn: async () => (await api.get<RevenueResponse>('/dashboard/revenue', { params: { from, to } })).data,
  });

  const { data: members, isLoading: memLoading } = useQuery({
    queryKey: ['reports', 'members'],
    queryFn: async () => (await api.get<MemberBreakdown>('/dashboard/members')).data,
  });

  const byDay = revenue?.byDay ?? [];
  const byCategory = (revenue?.byCategory ?? []).filter((c) => c.total > 0);
  const totalRevenue = byDay.reduce((s, d) => s + d.total, 0);
  const avgPerDay = byDay.length ? totalRevenue / byDay.length : 0;
  const topCategory = useMemo(
    () => [...byCategory].sort((a, b) => b.total - a.total)[0],
    [byCategory],
  );

  const memberTypes = (members?.byType ?? []).map((t) => ({ name: humanize(t.type), count: t.count }));
  const totalMembers = (members?.byStatus ?? []).reduce((s, m) => s + m.count, 0);

  function exportCsv() {
    if (byDay.length === 0) {
      toast('No data to export', 'error');
      return;
    }
    const header = 'Date,Revenue\n';
    const rows = byDay.map((d) => `${d.day},${d.total.toFixed(2)}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Report exported', 'success');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        <Button variant="secondary" className="ml-auto" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile loading={revLoading} icon={<DollarSign className="h-5 w-5" />} label="Total Revenue" value={formatCurrency(totalRevenue)} />
        <SummaryTile loading={revLoading} icon={<TrendingUp className="h-5 w-5" />} label="Avg / Day" value={formatCurrency(avgPerDay)} />
        <SummaryTile loading={revLoading} icon={<Receipt className="h-5 w-5" />} label="Top Category" value={topCategory ? humanize(topCategory.category) : '—'} />
        <SummaryTile loading={memLoading} icon={<Users className="h-5 w-5" />} label="Active Members" value={formatNumber(totalMembers)} />
      </div>

      <Card>
        <CardHeader title="Revenue Trend" subtitle={`${formatDate(from)} – ${formatDate(to)}`} />
        <CardBody>
          {revLoading ? (
            <Skeleton className="h-72" />
          ) : byDay.length === 0 ? (
            <EmptyState icon={DollarSign} title="No revenue in range" message="Try a different date range." />
          ) : (
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart data={byDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="rep-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(d) => formatDate(d, 'MMM d')} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#1e293b" />
                <YAxis tickFormatter={(v) => `$${formatNumber(v)}`} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#1e293b" width={64} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0' }}
                  labelFormatter={(d) => formatDate(d as string)}
                  formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="total" stroke="#22c55e" strokeWidth={2} fill="url(#rep-rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Revenue by Category" subtitle="Mix for selected range" />
          <CardBody>
            {revLoading ? (
              <Skeleton className="h-64" />
            ) : byCategory.length === 0 ? (
              <EmptyState title="No category data" message="No revenue recorded in this range." />
            ) : (
              <div className="grid items-center gap-4 sm:grid-cols-2">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byCategory} dataKey="total" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0' }}
                      formatter={(v: number, n) => [formatCurrency(v), humanize(n as string)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {byCategory.map((c, i) => (
                    <div key={c.category} className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-night-300">
                        <span className="h-3 w-3 rounded" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        {humanize(c.category)}
                      </span>
                      <span className="tabular-nums text-night-200">{formatCurrency(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Members by Type" subtitle="Active membership breakdown" />
          <CardBody>
            {memLoading ? (
              <Skeleton className="h-64" />
            ) : memberTypes.length === 0 ? (
              <EmptyState icon={Users} title="No members" message="Member breakdown will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={memberTypes} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#1e293b" />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} stroke="#1e293b" width={32} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, color: '#e2e8f0' }}
                    formatter={(v: number) => [formatNumber(v), 'Members']}
                    cursor={{ fill: '#1e293b55' }}
                  />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Membership Status" subtitle="Distribution across statuses" />
        <CardBody>
          {memLoading ? (
            <Skeleton className="h-32" />
          ) : (members?.byStatus ?? []).length === 0 ? (
            <EmptyState title="No members" message="Status breakdown will appear here." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Status</TH>
                  <TH className="text-right">Members</TH>
                  <TH className="text-right">Share</TH>
                </TR>
              </THead>
              <TBody>
                {(members?.byStatus ?? []).map((s) => (
                  <TR key={s.status}>
                    <TD className="text-night-200">{humanize(s.status)}</TD>
                    <TD className="text-right tabular-nums text-night-200">{formatNumber(s.count)}</TD>
                    <TD className="text-right tabular-nums text-night-400">
                      {totalMembers ? Math.round((s.count / totalMembers) * 100) : 0}%
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardBody className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-night-400">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-24" />
          ) : (
            <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
          )}
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fairway-500/10 text-fairway-400">{icon}</span>
      </CardBody>
    </Card>
  );
}
