import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';
import { MemberPicker, type PickedMember } from '@/components/MemberPicker';
import { useUiStore } from '@/stores/ui';
import { PAYMENT_METHODS, humanize } from '@/lib/constants';
import { formatCurrency, formatTime } from '@/lib/utils';
import type { TeeTime } from '@/lib/types';

interface PlayerRow {
  name: string;
  memberId: string | null;
  handicap: number | null;
  isGuest: boolean;
}

export function BookSlotModal({
  teeTime,
  onClose,
}: {
  teeTime: TeeTime | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const [lead, setLead] = useState<PickedMember | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const remaining = teeTime ? (teeTime.slotsTotal ?? 4) - (teeTime.slotsBooked ?? 0) : 0;

  // Reset form whenever a new slot is opened.
  useEffect(() => {
    if (teeTime) {
      setLead(null);
      setPlayers([{ name: '', memberId: null, handicap: null, isGuest: false }]);
      setPaymentMethod('');
      setNotes('');
    }
  }, [teeTime]);

  // Keep the lead member as the first player.
  useEffect(() => {
    if (lead) {
      setPlayers((prev) => {
        const rest = prev.filter((p) => p.memberId !== lead.id);
        return [{ name: lead.name, memberId: lead.id, handicap: lead.handicap, isGuest: false }, ...rest.slice(0, remaining - 1)];
      });
    }
  }, [lead]); // eslint-disable-line react-hooks/exhaustive-deps

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        teeTimeId: teeTime!.id,
        bookedByMemberId: lead?.id ?? null,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined,
        players: players
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            member_id: p.memberId,
            handicap: p.handicap,
            is_guest: p.isGuest,
          })),
      };
      return (await api.post('/bookings', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tee-sheet'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast('Booking confirmed', 'success');
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  function addPlayer() {
    if (players.length >= remaining) return;
    setPlayers((p) => [...p, { name: '', memberId: null, handicap: null, isGuest: true }]);
  }

  function updatePlayer(i: number, patch: Partial<PlayerRow>) {
    setPlayers((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function removePlayer(i: number) {
    setPlayers((p) => p.filter((_, idx) => idx !== i));
  }

  const validPlayers = players.filter((p) => p.name.trim());
  const price = Number(teeTime?.pricePerPlayer ?? 0);
  const cartFee = Number(teeTime?.cartFee ?? 0);
  const estimate = price * validPlayers.length + cartFee;

  return (
    <Modal
      open={!!teeTime}
      onClose={onClose}
      title="Book Tee Time"
      description={
        teeTime
          ? `${formatTime(teeTime.startTime)} · ${teeTime.courseName ?? 'Course'} · ${remaining} slot(s) open`
          : undefined
      }
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={mutation.isPending}
            disabled={validPlayers.length === 0}
            onClick={() => mutation.mutate()}
          >
            Book {validPlayers.length > 0 ? `(${formatCurrency(estimate)})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <MemberPicker value={lead} onChange={setLead} label="Booking member (optional)" />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="label mb-0">Players ({validPlayers.length}/{remaining})</label>
            <Button variant="ghost" size="sm" onClick={addPlayer} disabled={players.length >= remaining}>
              <Plus className="h-4 w-4" /> Add player
            </Button>
          </div>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-night-800 text-xs text-night-400">
                  {i + 1}
                </span>
                <input
                  className="input flex-1"
                  placeholder={`Player ${i + 1} name`}
                  value={p.name}
                  onChange={(e) => updatePlayer(i, { name: e.target.value })}
                />
                {p.isGuest && (
                  <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-night-800 px-2 py-1.5 text-xs text-night-400 sm:inline-flex">
                    <UserPlus className="h-3 w-3" /> Guest
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePlayer(i)}
                  className="shrink-0 rounded-lg p-2 text-night-400 hover:bg-night-800 hover:text-red-300"
                  aria-label="Remove player"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Payment method"
            placeholder="Select method"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: humanize(m) }))}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
          <Input label="Cart fee" value={formatCurrency(cartFee)} disabled />
        </div>

        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex items-center justify-between rounded-xl bg-night-900/60 px-4 py-3 text-sm">
          <span className="text-night-400">
            {validPlayers.length} × {formatCurrency(price)} + {formatCurrency(cartFee)} cart
          </span>
          <span className="font-display text-lg font-bold text-white">{formatCurrency(estimate)}</span>
        </div>
      </div>
    </Modal>
  );
}
