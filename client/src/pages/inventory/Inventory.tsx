import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Pencil, Trash2, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  Modal,
  ConfirmDialog,
  SkeletonRows,
  EmptyState,
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useDebounced } from '@/lib/hooks';
import { INVENTORY_CATEGORIES, humanize } from '@/lib/constants';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type { InventoryItem } from '@/lib/types';

interface InventoryResponse {
  data: InventoryItem[];
  summary: { retailValue: number; costValue: number };
}

const itemSchema = z.object({
  name: z.string().min(1, 'Required'),
  sku: z.string().optional(),
  category: z.enum(INVENTORY_CATEGORIES).optional().or(z.literal('')),
  description: z.string().optional(),
  price: z.string().optional(),
  cost: z.string().optional(),
  quantityOnHand: z.string().optional(),
  quantityMinimum: z.string().optional(),
  supplier: z.string().optional(),
});
type ItemValues = z.infer<typeof itemSchema>;

function ItemFormModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const isEdit = !!item;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    values: {
      name: item?.name ?? '',
      sku: item?.sku ?? '',
      category: (item?.category ?? '') as ItemValues['category'],
      description: item?.description ?? '',
      price: item?.price ?? '',
      cost: item?.cost ?? '',
      quantityOnHand: item?.quantityOnHand != null ? String(item.quantityOnHand) : '',
      quantityMinimum: item?.quantityMinimum != null ? String(item.quantityMinimum) : '',
      supplier: item?.supplier ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (v: ItemValues) => {
      const payload: Record<string, unknown> = { ...v };
      for (const k of Object.keys(payload)) {
        if (payload[k] === '') delete payload[k];
      }
      if (isEdit) return (await api.put(`/inventory/${item!.id}`, payload)).data;
      return (await api.post('/inventory', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast(isEdit ? 'Item updated' : 'Item created', 'success');
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Item' : 'New Item'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="item-form" type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" required {...register('name')} error={errors.name?.message} className="sm:col-span-2" />
        <Input label="SKU" {...register('sku')} />
        <Select
          label="Category"
          placeholder="Select category"
          options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))}
          {...register('category')}
        />
        <Input label="Price" type="number" step="0.01" {...register('price')} />
        <Input label="Cost" type="number" step="0.01" {...register('cost')} />
        <Input label="Quantity on hand" type="number" {...register('quantityOnHand')} />
        <Input label="Minimum quantity" type="number" {...register('quantityMinimum')} />
        <Input label="Supplier" {...register('supplier')} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Textarea label="Description" {...register('description')} />
        </div>
      </form>
    </Modal>
  );
}

function AdjustModal({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('restock');

  const mutation = useMutation({
    mutationFn: async () => api.post(`/inventory/${item!.id}/adjust`, { delta, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast('Stock adjusted', 'success');
      setDelta(0);
      onClose();
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const projected = Math.max(0, (item?.quantityOnHand ?? 0) + delta);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Adjust Stock"
      description={item ? `${item.name} — currently ${item.quantityOnHand ?? 0} on hand` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} disabled={delta === 0} onClick={() => mutation.mutate()}>
            Apply ({projected} on hand)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Reason"
          options={['restock', 'sale', 'damage', 'adjustment'].map((r) => ({ value: r, label: humanize(r) }))}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Input
          label="Change (use negative to remove)"
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
        <div className="flex gap-2">
          {[-10, -1, 1, 10].map((n) => (
            <Button key={n} variant="secondary" size="sm" onClick={() => setDelta((d) => d + n)}>
              {n > 0 ? `+${n}` : n}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function Inventory() {
  const qc = useQueryClient();
  const toast = useUiStore((s) => s.toast);
  const canManage = useAuthStore((s) => s.hasMinRole('manager'));
  const canAdjust = useAuthStore((s) => s.hasMinRole('staff'));
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [formItem, setFormItem] = useState<InventoryItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const debounced = useDebounced(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', { search: debounced, category, lowStock }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debounced) params.search = debounced;
      if (category) params.category = category;
      if (lowStock) params.lowStock = 'true';
      return (await api.get<InventoryResponse>('/inventory', { params })).data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast('Item removed', 'success');
    },
    onError: (err) => toast(apiError(err), 'error'),
  });

  const items = data?.data ?? [];

  function openNew() {
    setFormItem(null);
    setFormOpen(true);
  }
  function openEdit(item: InventoryItem) {
    setFormItem(item);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="card-pad">
          <p className="text-sm text-night-400">Retail Value</p>
          <p className="mt-1 font-display text-xl font-bold text-white">{formatCurrency(data?.summary.retailValue)}</p>
        </Card>
        <Card className="card-pad">
          <p className="text-sm text-night-400">Cost Value</p>
          <p className="mt-1 font-display text-xl font-bold text-white">{formatCurrency(data?.summary.costValue)}</p>
        </Card>
        <Card className="card-pad">
          <p className="text-sm text-night-400">SKUs</p>
          <p className="mt-1 font-display text-xl font-bold text-white">{formatNumber(items.length)}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-500" />
          <Input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select
          className="w-auto"
          placeholder="All categories"
          options={INVENTORY_CATEGORIES.map((c) => ({ value: c, label: humanize(c) }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Button variant={lowStock ? 'primary' : 'secondary'} onClick={() => setLowStock((v) => !v)}>
          <AlertTriangle className="h-4 w-4" /> Low stock
        </Button>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> New Item
          </Button>
        )}
      </div>

      <Card className="card-pad">
        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items"
            message={debounced || category || lowStock ? 'Try adjusting your filters.' : 'Add your first inventory item.'}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Item</TH>
                <TH>Category</TH>
                <TH className="text-right">Price</TH>
                <TH className="text-right">On Hand</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((it) => {
                const low = (it.quantityOnHand ?? 0) <= (it.quantityMinimum ?? 0);
                return (
                  <TR key={it.id}>
                    <TD>
                      <p className="font-medium text-night-100">{it.name}</p>
                      <p className="text-xs text-night-500">{it.sku ?? '—'}</p>
                    </TD>
                    <TD className="text-night-300">{humanize(it.category)}</TD>
                    <TD className="text-right tabular-nums">{formatCurrency(it.price)}</TD>
                    <TD className="text-right tabular-nums">{formatNumber(it.quantityOnHand)}</TD>
                    <TD>
                      {low ? (
                        <Badge tone="amber">Low stock</Badge>
                      ) : (
                        <Badge tone="green">In stock</Badge>
                      )}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        {canAdjust && (
                          <Button variant="ghost" size="sm" onClick={() => setAdjustItem(it)}>
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(it)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteItem(it)}>
                            <Trash2 className="h-4 w-4" />
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

      <ItemFormModal open={formOpen} onClose={() => setFormOpen(false)} item={formItem} />
      <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} />
      <ConfirmDialog
        open={!!deleteItem}
        title="Remove item?"
        message={deleteItem ? `This will deactivate "${deleteItem.name}".` : ''}
        confirmLabel="Remove"
        danger
        onConfirm={async () => {
          if (deleteItem) await deleteMutation.mutateAsync(deleteItem.id);
        }}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
}
