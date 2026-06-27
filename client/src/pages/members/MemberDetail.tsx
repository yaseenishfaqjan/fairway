import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  CreditCard,
  Mail,
  Phone,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Avatar,
  StatusBadge,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Modal,
  Input,
  Textarea,
  ConfirmDialog,
  PageLoader,
  EmptyState,
} from '@/components/ui';
import { MemberFormModal } from './MemberFormModal';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { humanize } from '@/lib/constants';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import type { Member, Booking, PosTransaction } from '@/lib/types';

interface MemberDetailResponse extends Member {
  bookings: Booking[];
  transactions: PosTransaction[];
  stats: { rounds: number; ytdSpend: number };
}

const chargeSchema = z.object({
  amount: z.coerce.number().positive('Must be greater than 0'),
  description: z.string().min(1, 'Required'),
});
type ChargeValues = z.infer<typeof chargeSchema>;

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-night-900/60 px-4 py-3">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-fairway-500/10 text-fairway-400">{icon}</span>
      <div>
        <p className="text-xs text-night-400">{label}</p>
        <p className="font-display text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function ChargeModal({
  open,
  onClose,
  memberId,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChargeValues>({ resolver: zodResolver(chargeSchema) });

  const mutation = useMutation({
    mutationFn: async (v: ChargeValues) => (await api.post(`/members/${memberId}/charge`, v)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', memberId] });
      toast('Charge posted to account', 'success');
      reset();
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Charge to Account"
      description="Post a charge to this member's house account"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="charge-form" type="submit" loading={mutation.isPending}>
            Post Charge
          </Button>
        </>
      }
    >
      <form id="charge-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          required
          {...register('amount')}
          error={errors.amount?.message}
        />
        <Textarea label="Description" required {...register('description')} error={errors.description?.message} />
      </form>
    </Modal>
  );
}

export function MemberDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const canCharge = useAuthStore((s) => s.hasMinRole('staff'));
  const [editOpen, setEditOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => (await api.get<MemberDetailResponse>(`/members/${id}`)).data,
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/members/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      toast('Member removed', 'success');
      navigate('/members');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return (
      <EmptyState
        title="Member not found"
        message="This member may have been removed."
        action={
          <Button variant="secondary" onClick={() => navigate('/members')}>
            Back to Members
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/members" className="inline-flex items-center gap-1 text-sm text-night-400 hover:text-night-200">
        <ArrowLeft className="h-4 w-4" /> Members
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar first={data.firstName} last={data.lastName} url={data.avatarUrl} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold text-white">
                  {data.firstName} {data.lastName}
                </h2>
                <StatusBadge status={data.membershipStatus} />
              </div>
              <p className="text-sm text-night-400">
                {data.memberNumber ? `#${data.memberNumber} · ` : ''}
                {humanize(data.membershipType)}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-night-400">
                {data.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {data.email}
                  </span>
                )}
                {data.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {data.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCharge && (
              <Button variant="secondary" onClick={() => setChargeOpen(true)}>
                <CreditCard className="h-4 w-4" /> Charge
              </Button>
            )}
            {canManage && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {canManage && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile icon={<CreditCard className="h-4 w-4" />} label="Account Balance" value={formatCurrency(data.balance)} />
        <StatTile icon={<CalendarDays className="h-4 w-4" />} label="Rounds Played" value={String(data.stats.rounds)} />
        <StatTile icon={<TrendingUp className="h-4 w-4" />} label="Total Spend" value={formatCurrency(data.stats.ytdSpend)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Booking History" subtitle={`${data.bookings.length} recent`} />
          <CardBody>
            {data.bookings.length === 0 ? (
              <EmptyState title="No bookings" message="This member hasn't booked any rounds yet." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Players</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Amount</TH>
                    <TH>Booked</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.bookings.map((b) => (
                    <TR key={b.id}>
                      <TD>{b.playerCount}</TD>
                      <TD>
                        <StatusBadge status={b.status} />
                      </TD>
                      <TD className="text-right tabular-nums">{formatCurrency(b.totalAmount)}</TD>
                      <TD className="text-night-400">{formatDate(b.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Transactions" subtitle={`${data.transactions.length} recent`} />
          <CardBody>
            {data.transactions.length === 0 ? (
              <EmptyState title="No transactions" message="No purchases on record." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Category</TH>
                    <TH>Method</TH>
                    <TH className="text-right">Total</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.transactions.map((t) => (
                    <TR key={t.id}>
                      <TD>{humanize(t.category)}</TD>
                      <TD>
                        <Badge tone="slate">{humanize(t.paymentMethod)}</Badge>
                      </TD>
                      <TD
                        className={`text-right tabular-nums ${t.status === 'voided' ? 'text-night-500 line-through' : ''}`}
                      >
                        {formatCurrency(t.total)}
                      </TD>
                      <TD className="text-night-400">{formatDateTime(t.createdAt)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>

      {data.notes && (
        <Card>
          <CardHeader title="Notes" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm text-night-300">{data.notes}</p>
          </CardBody>
        </Card>
      )}

      <MemberFormModal open={editOpen} onClose={() => setEditOpen(false)} member={data} />
      <ChargeModal open={chargeOpen} onClose={() => setChargeOpen(false)} memberId={id} />
      <ConfirmDialog
        open={deleteOpen}
        title="Remove member?"
        message={`This will deactivate ${data.firstName} ${data.lastName} and cancel their membership. This can be reversed by an admin.`}
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
