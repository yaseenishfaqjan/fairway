import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight, Users, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Button, StatusBadge, SkeletonCard, EmptyState } from '@/components/ui';
import { GenerateSheetModal } from './GenerateSheetModal';
import { BookSlotModal } from './BookSlotModal';
import { useAuthStore } from '@/stores/auth';
import { todayISO, formatTime, formatCurrency, formatDate } from '@/lib/utils';
import type { TeeTime } from '@/lib/types';
import { addDays, parseISO, format } from 'date-fns';

export function TeeSheet() {
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const canBook = useAuthStore((s) => s.hasMinRole('staff'));
  const [date, setDate] = useState(todayISO());
  const [generateOpen, setGenerateOpen] = useState(false);
  const [bookSlot, setBookSlot] = useState<TeeTime | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tee-sheet', date],
    queryFn: async () => (await api.get<TeeTime[]>('/tee-sheet', { params: { date } })).data,
  });

  const slots = data ?? [];

  function shiftDay(delta: number) {
    setDate(format(addDays(parseISO(date + 'T00:00:00'), delta), 'yyyy-MM-dd'));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftDay(-1)} aria-label="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input w-auto"
          />
          <Button variant="secondary" size="sm" onClick={() => shiftDay(1)} aria-label="Next day">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
            Today
          </Button>
        </div>
        {canManage && (
          <Button onClick={() => setGenerateOpen(true)}>
            <CalendarPlus className="h-4 w-4" /> Generate
          </Button>
        )}
      </div>

      <p className="text-sm text-night-400">{formatDate(date, 'EEEE, MMMM d, yyyy')}</p>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <Card className="card-pad">
          <EmptyState
            icon={Flag}
            title="No tee times"
            message={canManage ? 'Generate a tee sheet for this day to start taking bookings.' : 'No tee times scheduled for this day.'}
            action={
              canManage ? (
                <Button onClick={() => setGenerateOpen(true)}>
                  <CalendarPlus className="h-4 w-4" /> Generate Tee Sheet
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {slots.map((slot) => {
            const total = slot.slotsTotal ?? 4;
            const booked = slot.slotsBooked ?? 0;
            const open = total - booked;
            const bookable = canBook && open > 0 && slot.status !== 'blocked' && slot.status !== 'maintenance';
            return (
              <Card key={slot.id} className="card-pad">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold text-white">{formatTime(slot.startTime)}</p>
                    <p className="text-xs text-night-500">{slot.courseName ?? 'Course'}</p>
                  </div>
                  <StatusBadge status={slot.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-night-300">
                    <Users className="h-4 w-4 text-night-500" />
                    {booked}/{total}
                  </span>
                  <span className="font-medium text-night-200">{formatCurrency(slot.pricePerPlayer)}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {Array.from({ length: total }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < booked ? 'bg-fairway-500' : 'bg-night-700'}`}
                    />
                  ))}
                </div>
                {bookable ? (
                  <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setBookSlot(slot)}>
                    Book ({open} open)
                  </Button>
                ) : (
                  <div className="mt-3 text-center text-xs text-night-500">
                    {slot.status === 'blocked' || slot.status === 'maintenance'
                      ? 'Unavailable'
                      : open === 0
                        ? 'Fully booked'
                        : ' '}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <GenerateSheetModal open={generateOpen} onClose={() => setGenerateOpen(false)} defaultDate={date} />
      <BookSlotModal teeTime={bookSlot} onClose={() => setBookSlot(null)} />
    </div>
  );
}
