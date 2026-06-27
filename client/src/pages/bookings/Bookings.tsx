import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheck, Check, X, ClipboardList } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  Card,
  Button,
  Input,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  StatusBadge,
  Badge,
  SkeletonRows,
  EmptyState,
  ConfirmDialog,
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { BOOKING_STATUSES, humanize } from '@/lib/constants';
import { formatCurrency, formatDate, formatTime, todayISO } from '@/lib/utils';
import type { Booking } from '@/lib/types';
import { addDays, parseISO, format } from 'date-fns';

interface BookingRow extends Booking {
  teeTime?: { date: string | null; startTime: string | null; courseName: string | null } | null;
}

export function Bookings() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const canCheckIn = useAuthStore((s) => s.hasMinRole('ranger'));
  const canCancel = useAuthStore((s) => s.hasMinRole('staff'));

  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(format(addDays(parseISO(todayISO() + 'T00:00:00'), 7), 'yyyy-MM-dd'));
  const [status, setStatus] = useState('');
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', { from, to, status }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (status) params.status = status;
      return (await api.get<BookingRow[]>('/bookings', { params })).data;
    },
  });

  const checkIn = useMutation({
    mutationFn: async (id: string) => api.post(`/bookings/${id}/checkin`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast('Checked in', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => api.delete(`/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['tee-sheet'] });
      toast('Booking cancelled', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const bookings = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" />
        <Select
          label="Status"
          className="w-auto"
          placeholder="All statuses"
          options={BOOKING_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
        <Link to="/tee-sheet" className="ml-auto">
          <Button>
            <CalendarCheck className="h-4 w-4" /> New Booking
          </Button>
        </Link>
      </div>

      <Card className="card-pad">
        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No bookings"
            message="No bookings match the selected range. Create one from the tee sheet."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Time</TH>
                <TH>Course</TH>
                <TH>Players</TH>
                <TH>Status</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {bookings.map((b) => {
                const checkedIn = !!b.checkInAt;
                const cancelled = b.status === 'cancelled';
                return (
                  <TR key={b.id}>
                    <TD className="text-night-300">{formatDate(b.teeTime?.date)}</TD>
                    <TD className="text-night-300">{formatTime(b.teeTime?.startTime)}</TD>
                    <TD className="text-night-400">{b.teeTime?.courseName ?? '—'}</TD>
                    <TD>
                      <Badge tone="slate">{b.playerCount}</Badge>
                    </TD>
                    <TD>
                      <StatusBadge status={b.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{formatCurrency(b.totalAmount)}</TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {canCheckIn && !checkedIn && !cancelled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={checkIn.isPending && checkIn.variables === b.id}
                            onClick={() => checkIn.mutate(b.id)}
                          >
                            <Check className="h-4 w-4" /> Check in
                          </Button>
                        )}
                        {checkedIn && (
                          <span className="inline-flex items-center gap-1 px-2 text-xs text-fairway-400">
                            <Check className="h-3 w-3" /> In
                          </span>
                        )}
                        {canCancel && !cancelled && (
                          <Button variant="ghost" size="sm" onClick={() => setCancelTarget(b)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel booking?"
        message="This will cancel the booking and free up the tee time slots."
        confirmLabel="Cancel booking"
        danger
        onConfirm={async () => {
          if (cancelTarget) await cancel.mutateAsync(cancelTarget.id);
        }}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
