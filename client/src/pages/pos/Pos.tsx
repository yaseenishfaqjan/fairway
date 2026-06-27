import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ShoppingCart, Receipt, Ban } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  Card,
  CardHeader,
  CardBody,
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
  Modal,
  Textarea,
} from '@/components/ui';
import { MemberPicker, type PickedMember } from '@/components/MemberPicker';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { POS_CATEGORIES, PAYMENT_METHODS, humanize } from '@/lib/constants';
import { formatCurrency, formatDateTime, todayISO } from '@/lib/utils';
import type { PosTransaction } from '@/lib/types';

interface CartLine {
  name: string;
  qty: number;
  unitPrice: number;
}

const TAX_RATE = 0.07;

function Register() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const [lines, setLines] = useState<CartLine[]>([{ name: '', qty: 1, unitPrice: 0 }]);
  const [category, setCategory] = useState('pro_shop');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [member, setMember] = useState<PickedMember | null>(null);
  const [discount, setDiscount] = useState(0);

  const validLines = lines.filter((l) => l.name.trim() && l.qty > 0);
  const subtotal = useMemo(() => validLines.reduce((s, l) => s + l.qty * l.unitPrice, 0), [validLines]);
  const discounted = Math.max(0, subtotal - discount);
  const tax = +(discounted * TAX_RATE).toFixed(2);
  const total = +(discounted + tax).toFixed(2);

  const checkout = useMutation({
    mutationFn: async () => {
      const payload = {
        items: validLines.map((l) => ({ name: l.name.trim(), qty: l.qty, unit_price: l.unitPrice })),
        category,
        paymentMethod,
        memberId: member?.id ?? null,
        discount,
        taxRate: TAX_RATE,
      };
      return (await api.post<PosTransaction>('/pos/transactions', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos'] });
      toast(`Sale complete — ${formatCurrency(total)}`, 'success');
      setLines([{ name: '', qty: 1, unitPrice: 0 }]);
      setMember(null);
      setDiscount(0);
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  function updateLine(i: number, patch: Partial<CartLine>) {
    setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  const memberRequired = paymentMethod === 'member_account';
  const canSubmit = validLines.length > 0 && (!memberRequired || !!member);

  return (
    <Card>
      <CardHeader title="New Sale" subtitle="Build a transaction" />
      <CardBody className="space-y-4">
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="Item name"
                value={line.name}
                onChange={(e) => updateLine(i, { name: e.target.value })}
              />
              <input
                className="input w-16"
                type="number"
                min={1}
                value={line.qty}
                onChange={(e) => updateLine(i, { qty: Number(e.target.value) })}
                aria-label="Quantity"
              />
              <input
                className="input w-24"
                type="number"
                min={0}
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                aria-label="Unit price"
              />
              <span className="w-20 shrink-0 text-right text-sm tabular-nums text-night-300">
                {formatCurrency(line.qty * line.unitPrice)}
              </span>
              <button
                type="button"
                onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-lg p-2 text-night-400 hover:bg-night-800 hover:text-red-300"
                aria-label="Remove line"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setLines((p) => [...p, { name: '', qty: 1, unitPrice: 0 }])}>
            <Plus className="h-4 w-4" /> Add item
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            options={POS_CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label="Payment method"
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: humanize(m) }))}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
        </div>

        {memberRequired && (
          <MemberPicker value={member} onChange={setMember} label="Member (required for account charge)" />
        )}

        <Input
          label="Discount"
          type="number"
          min={0}
          step="0.01"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
        />

        <div className="space-y-1 rounded-xl bg-night-900/60 px-4 py-3 text-sm">
          <div className="flex justify-between text-night-400">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-night-400">
              <span>Discount</span>
              <span className="tabular-nums">−{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-night-400">
            <span>Tax (7%)</span>
            <span className="tabular-nums">{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-night-800 pt-1 font-display text-lg font-bold text-white">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button className="w-full" loading={checkout.isPending} disabled={!canSubmit} onClick={() => checkout.mutate()}>
          <ShoppingCart className="h-4 w-4" /> Complete Sale
        </Button>
      </CardBody>
    </Card>
  );
}

function VoidModal({
  txn,
  onClose,
}: {
  txn: PosTransaction | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => api.put(`/pos/transactions/${txn!.id}/void`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos'] });
      toast('Transaction voided', 'success');
      setReason('');
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={!!txn}
      onClose={onClose}
      title="Void Transaction"
      description={txn ? `Void sale of ${formatCurrency(txn.total)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={mutation.isPending} disabled={!reason.trim()} onClick={() => mutation.mutate()}>
            Void
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why is this being voided?"
      />
    </Modal>
  );
}

function Transactions() {
  const canVoid = useAuthStore((s) => s.hasMinRole('manager'));
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState(todayISO());
  const [voidTarget, setVoidTarget] = useState<PosTransaction | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pos', 'transactions', { category, from }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (category) params.category = category;
      if (from) params.from = from;
      return (await api.get<PosTransaction[]>('/pos/transactions', { params })).data;
    },
  });

  const txns = data ?? [];

  return (
    <Card>
      <CardHeader
        title="Transactions"
        subtitle="Sales history"
        action={
          <div className="flex gap-2">
            <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Select
              className="w-auto"
              placeholder="All"
              options={POS_CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
        }
      />
      <CardBody>
        {isLoading ? (
          <SkeletonRows rows={6} cols={5} />
        ) : txns.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions" message="Completed sales will appear here." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH>Method</TH>
                <TH>Status</TH>
                <TH className="text-right">Total</TH>
                <TH>Time</TH>
                {canVoid && <TH />}
              </TR>
            </THead>
            <TBody>
              {txns.map((t) => (
                <TR key={t.id}>
                  <TD>{humanize(t.category)}</TD>
                  <TD>
                    <Badge tone="slate">{humanize(t.paymentMethod)}</Badge>
                  </TD>
                  <TD>
                    <StatusBadge status={t.status} />
                  </TD>
                  <TD className={`text-right tabular-nums ${t.status === 'voided' ? 'text-night-500 line-through' : ''}`}>
                    {formatCurrency(t.total)}
                  </TD>
                  <TD className="text-night-400">{formatDateTime(t.createdAt)}</TD>
                  {canVoid && (
                    <TD className="text-right">
                      {t.status !== 'voided' && (
                        <Button variant="ghost" size="sm" onClick={() => setVoidTarget(t)}>
                          <Ban className="h-4 w-4" /> Void
                        </Button>
                      )}
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
      <VoidModal txn={voidTarget} onClose={() => setVoidTarget(null)} />
    </Card>
  );
}

export function Pos() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Register />
      <Transactions />
    </div>
  );
}
